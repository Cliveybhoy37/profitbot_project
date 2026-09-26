// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "hardhat/console.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@aave/core-v3/contracts/flashloan/interfaces/IFlashLoanSimpleReceiver.sol";
import "@aave/core-v3/contracts/interfaces/IPoolAddressesProvider.sol";
import "@aave/core-v3/contracts/interfaces/IPool.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import { IVault } from "../lib/balancer-v2/pkg/interfaces/contracts/vault/IVault.sol";
import { IAsset } from "../lib/balancer-v2/pkg/interfaces/contracts/vault/IAsset.sol";

contract ProfitBot is Ownable, IFlashLoanSimpleReceiver {
    using SafeERC20 for IERC20;

    enum Venue {
        QUICKSWAP_V2,
        SUSHISWAP_V2,
        UNISWAP_V3,
        BALANCER_V2
    }

    struct SwapLeg {
        Venue venue;
        address tokenIn;
        address tokenOut;
        uint256 minAmountOut;
        bytes32 venueData;
    }

    IPool public immutable POOL;
    IPoolAddressesProvider public immutable override ADDRESSES_PROVIDER;

    IUniswapV2Router02 public immutable quickSwapRouter;
    ISwapRouter public immutable uniswapV3Router;
    IUniswapV2Router02 public immutable sushiSwapRouter;
    IVault public immutable balancerVault;

    event DebugText(string msg);
    event ProfitEvaluated(uint256 finalAmount, uint256 totalDebt);
    event SwapResult(uint256 out);

    constructor(
        address _provider,
        address _quickSwapRouter,
        address _sushiSwapRouter,
        address _uniswapV3Router,
        address _balancerVault
    ) {
        require(_provider != address(0), "Invalid Aave provider");
        require(_quickSwapRouter != address(0), "Invalid QuickSwap router");
        require(_uniswapV3Router != address(0), "Invalid Uniswap V3 router");
        require(_sushiSwapRouter != address(0), "Invalid Sushi router");
        require(_balancerVault != address(0), "Invalid Balancer vault");

        ADDRESSES_PROVIDER = IPoolAddressesProvider(_provider);
        address pool = ADDRESSES_PROVIDER.getPool();
        require(pool != address(0), "Invalid Aave pool");
        POOL = IPool(pool);
        quickSwapRouter = IUniswapV2Router02(_quickSwapRouter);
        uniswapV3Router = ISwapRouter(_uniswapV3Router);
        sushiSwapRouter = IUniswapV2Router02(_sushiSwapRouter);
        balancerVault = IVault(_balancerVault);
    }

    function initiateFlashloan(
        address token,
        uint256 amount,
        bytes calldata params
    ) external onlyOwner {
        POOL.flashLoanSimple(address(this), token, amount, params, 0);
    }

    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external override returns (bool) {
        emit DebugText("executeOperation() entered");

        require(msg.sender == address(POOL), "Only callable by Aave pool");
        require(initiator == address(this), "Only initiated internally");

        SwapLeg[] memory legs = abi.decode(params, (SwapLeg[]));
        require(legs.length == 3, "Exactly three legs required");
        require(legs[0].tokenIn == asset, "Route must start with loan asset");
        require(legs[2].tokenOut == asset, "Route not closed");

        for (uint256 i = 0; i < legs.length; i++) {
            require(
                legs[i].tokenIn != address(0) &&
                legs[i].tokenOut != address(0),
                "Invalid leg token"
            );
            require(legs[i].tokenIn != legs[i].tokenOut, "Invalid self swap");
            require(legs[i].minAmountOut > 0, "Zero minimum output");

            if (i > 0) {
                require(
                    legs[i - 1].tokenOut == legs[i].tokenIn,
                    "Route not contiguous"
                );
            }

            if (
                legs[i].venue == Venue.QUICKSWAP_V2 ||
                legs[i].venue == Venue.SUSHISWAP_V2
            ) {
                require(legs[i].venueData == bytes32(0), "Unexpected V2 data");
            } else if (legs[i].venue == Venue.UNISWAP_V3) {
                uint256 feeData = uint256(legs[i].venueData);
                require(
                    feeData > 0 && feeData <= type(uint24).max,
                    "Invalid V3 fee"
                );
            } else if (legs[i].venue == Venue.BALANCER_V2) {
                require(legs[i].venueData != bytes32(0), "Invalid Balancer pool");
            } else {
                revert("Unsupported venue");
            }
        }

        uint256 startingAsset = IERC20(asset).balanceOf(address(this)) - amount;
        uint256 currentAmount = amount;

        for (uint256 i = 0; i < legs.length; i++) {
            currentAmount = _executeLeg(legs[i], currentAmount);
            require(
                currentAmount >= legs[i].minAmountOut,
                "Output below minimum"
            );
        }

        uint256 totalDebt = amount + premium;
        uint256 finalAmount = IERC20(asset).balanceOf(address(this));
        require(
            finalAmount > startingAsset + totalDebt,
            "No incremental token profit"
        );

        emit ProfitEvaluated(finalAmount, totalDebt);
        IERC20(asset).forceApprove(address(POOL), totalDebt);
        return true;
    }

    function _executeLeg(
        SwapLeg memory leg,
        uint256 amountIn
    ) internal returns (uint256 amountOut) {
        if (
            leg.venue == Venue.QUICKSWAP_V2 ||
            leg.venue == Venue.SUSHISWAP_V2
        ) {
            IUniswapV2Router02 router = leg.venue == Venue.QUICKSWAP_V2
                ? quickSwapRouter
                : sushiSwapRouter;

            IERC20(leg.tokenIn).forceApprove(address(router), amountIn);

            address[] memory path = new address[](2);
            path[0] = leg.tokenIn;
            path[1] = leg.tokenOut;

            uint256 beforeOut = IERC20(leg.tokenOut).balanceOf(address(this));

            router.swapExactTokensForTokensSupportingFeeOnTransferTokens(
                amountIn,
                leg.minAmountOut,
                path,
                address(this),
                block.timestamp
            );

            amountOut =
                IERC20(leg.tokenOut).balanceOf(address(this)) - beforeOut;
        } else if (leg.venue == Venue.UNISWAP_V3) {
            IERC20(leg.tokenIn).forceApprove(address(uniswapV3Router), amountIn);

            amountOut = uniswapV3Router.exactInputSingle(
                ISwapRouter.ExactInputSingleParams({
                    tokenIn: leg.tokenIn,
                    tokenOut: leg.tokenOut,
                    fee: uint24(uint256(leg.venueData)),
                    recipient: address(this),
                    deadline: block.timestamp,
                    amountIn: amountIn,
                    amountOutMinimum: leg.minAmountOut,
                    sqrtPriceLimitX96: 0
                })
            );
        } else if (leg.venue == Venue.BALANCER_V2) {
            amountOut = _balancerSwapSingle(
                leg.venueData,
                leg.tokenIn,
                leg.tokenOut,
                amountIn,
                leg.minAmountOut
            );
        } else {
            revert("Unsupported venue");
        }
    }

    function _balancerSwapSingle(
        bytes32 poolId,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut
    ) internal returns (uint256 amountOut) {
        emit DebugText("Inside _balancerSwapSingle()");

        IVault.SingleSwap memory singleSwap = IVault.SingleSwap({
            poolId: poolId,
            kind: IVault.SwapKind.GIVEN_IN,
            assetIn: IAsset(tokenIn),
            assetOut: IAsset(tokenOut),
            amount: amountIn,
            userData: ""
        });

        IVault.FundManagement memory funds = IVault.FundManagement({
            sender: address(this),
            fromInternalBalance: false,
            recipient: payable(address(this)),
            toInternalBalance: false
        });

        emit DebugText("Approving tokenIn for Balancer Vault");
        IERC20(tokenIn).forceApprove(address(balancerVault), amountIn);

        emit DebugText("Calling balancerVault.swap()");
        amountOut = balancerVault.swap(singleSwap, funds, minAmountOut, block.timestamp);
    }

    function withdrawToken(address token) public onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance > 0, "No balance to withdraw");
        IERC20(token).safeTransfer(owner(), balance);
    }

    function withdrawEther() public onlyOwner {
        payable(owner()).transfer(address(this).balance);
    }

    function withdrawAll(address[] calldata tokens) external onlyOwner {
        for (uint256 i = 0; i < tokens.length; i++) {
            withdrawToken(tokens[i]);
        }
    }

    receive() external payable {}
}

