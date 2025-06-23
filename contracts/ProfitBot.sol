// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "hardhat/console.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@aave/core-v3/contracts/flashloan/interfaces/IFlashLoanSimpleReceiver.sol";
import "@aave/core-v3/contracts/interfaces/IPoolAddressesProvider.sol";
import "@aave/core-v3/contracts/interfaces/IPool.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import { IVault } from "../lib/balancer-v2/pkg/interfaces/contracts/vault/IVault.sol";
import { IAsset } from "../lib/balancer-v2/pkg/interfaces/contracts/vault/IAsset.sol";

contract ProfitBot is Ownable, IFlashLoanSimpleReceiver {
    IPool public immutable POOL;
    IPoolAddressesProvider public immutable override ADDRESSES_PROVIDER;

    IUniswapV2Router02 public immutable uniswapRouter;
    IUniswapV2Router02 public immutable sushiSwapRouter;
    IVault public immutable balancerVault;

    event DebugText(string msg);
    event ProfitEvaluated(uint256 finalAmount, uint256 totalDebt);
    event SwapResult(uint256 out);

    constructor(
        address _provider,
        address _uniswapRouter,
        address _sushiSwapRouter,
        address _balancerVault
    ) {
        require(_provider != address(0), "Invalid Aave provider");
        require(_uniswapRouter != address(0), "Invalid Uniswap router");
        require(_sushiSwapRouter != address(0), "Invalid Sushi router");
        require(_balancerVault != address(0), "Invalid Balancer vault");

        ADDRESSES_PROVIDER = IPoolAddressesProvider(_provider);
        POOL = IPool(ADDRESSES_PROVIDER.getPool());
        uniswapRouter = IUniswapV2Router02(_uniswapRouter);
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

        emit DebugText(string(abi.encodePacked("POOL address: ", Strings.toHexString(uint160(address(POOL)), 20))));
        emit DebugText(string(abi.encodePacked("msg.sender: ", Strings.toHexString(uint160(msg.sender), 20))));
        emit DebugText(string(abi.encodePacked("initiator: ", Strings.toHexString(uint160(initiator), 20))));

        require(msg.sender == address(POOL), "Only callable by Aave pool");
        require(initiator == address(this), "Only initiated internally");

        try this.decodeBalancerParams(params) returns (
            string memory route,
            address tokenIn,
            address tokenOut,
            bytes32 poolId,
            uint256 minOut1,
            uint256 minOut2
        ) {
            if (keccak256(bytes(route)) == keccak256("balancer")) {
                emit DebugText("Balancer route detected");
                uint256 amountOut = _balancerSwapSingle(poolId, tokenIn, tokenOut, amount, minOut1);
                emit SwapResult(amountOut);

                uint256 totalDebt = amount + premium;
                uint256 finalAmount = IERC20(asset).balanceOf(address(this));
                emit ProfitEvaluated(finalAmount, totalDebt);
                IERC20(asset).approve(address(POOL), totalDebt);
                return true;
            }
        } catch {
            emit DebugText("Fallback to Uniswap/Sushi path");

            (
                address token,
                uint256 loanAmount,
                address[] memory path1,
                address[] memory path2,
                uint256 minOut1,
                uint256 minOut2
            ) = abi.decode(params, (address, uint256, address[], address[], uint256, uint256));

            emit DebugText("Swapping via Uniswap...");
            IERC20(token).approve(address(uniswapRouter), loanAmount);
            uint256 beforeIntermediate = IERC20(path1[path1.length - 1]).balanceOf(address(this));

            uniswapRouter.swapExactTokensForTokensSupportingFeeOnTransferTokens(
                loanAmount, minOut1, path1, address(this), block.timestamp
            );

            uint256 afterIntermediate = IERC20(path1[path1.length - 1]).balanceOf(address(this));
            uint256 interAmount = afterIntermediate - beforeIntermediate;

            // ✅ NEW: Slippage check logs
            emit DebugText(string(abi.encodePacked("Expected minOut1: ", Strings.toString(minOut1))));
            emit DebugText(string(abi.encodePacked("Actual out: ", Strings.toString(interAmount))));

            emit DebugText("Swapping via Sushi...");
            IERC20(path1[path1.length - 1]).approve(address(sushiSwapRouter), interAmount);

            sushiSwapRouter.swapExactTokensForTokensSupportingFeeOnTransferTokens(
                interAmount, minOut2, path2, address(this), block.timestamp
            );

            uint256 totalDebt = amount + premium;
            uint256 finalAmount = IERC20(asset).balanceOf(address(this));
            emit ProfitEvaluated(finalAmount, totalDebt);
            IERC20(asset).approve(address(POOL), totalDebt);
            return true;
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
        IERC20(tokenIn).approve(address(balancerVault), amountIn);

        emit DebugText("Calling balancerVault.swap()");
        amountOut = balancerVault.swap(singleSwap, funds, minAmountOut, block.timestamp);
    }

    function decodeBalancerParams(bytes calldata params) external pure returns (
        string memory route,
        address tokenIn,
        address tokenOut,
        bytes32 poolId,
        uint256 minOut1,
        uint256 minOut2
    ) {
        return abi.decode(params, (string, address, address, bytes32, uint256, uint256));
    }

    function withdrawToken(address token) public onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        require(balance > 0, "No balance to withdraw");
        IERC20(token).transfer(owner(), balance);
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

