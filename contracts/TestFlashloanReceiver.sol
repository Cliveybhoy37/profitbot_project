// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;

import "@aave/core-v3/contracts/flashloan/interfaces/IFlashLoanSimpleReceiver.sol";
import "@aave/core-v3/contracts/interfaces/IPoolAddressesProvider.sol";
import "@aave/core-v3/contracts/interfaces/IPool.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";

contract TestFlashloanReceiver is IFlashLoanSimpleReceiver {
    IPoolAddressesProvider public immutable ADDRESSES_PROVIDER;
    IPool public immutable POOL;

    event ReceivedFlashloan(address asset, uint256 amount, uint256 premium);
    event Swapped(address tokenIn, address tokenOut, uint256 amountIn, uint256 amountOut);
    event RepaidLoan(uint256 totalRepayment);
    event Profit(uint256 balance);

    constructor(address _addressProvider) {
        ADDRESSES_PROVIDER = IPoolAddressesProvider(_addressProvider);
        POOL = IPool(IPoolAddressesProvider(_addressProvider).getPool());
    }

    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address initiator,
        bytes calldata params
    ) external override returns (bool) {
        require(msg.sender == address(POOL), "Not Aave pool");
        require(initiator == address(this), "Not contract");

        emit ReceivedFlashloan(asset, amount, premium);

        (
            address routerAddress,
            address[] memory path1,
            address[] memory path2,
            uint256 minOut1,
            uint256 minOut2
        ) = abi.decode(params, (address, address[], address[], uint256, uint256));

        IERC20(asset).approve(routerAddress, amount);
        uint256[] memory out1 = IUniswapV2Router02(routerAddress).swapExactTokensForTokens(
            amount,
            minOut1,
            path1,
            address(this),
            block.timestamp
        );
        emit Swapped(path1[0], path1[1], amount, out1[1]);

        IERC20(path1[1]).approve(routerAddress, out1[1]);
        uint256[] memory out2 = IUniswapV2Router02(routerAddress).swapExactTokensForTokens(
            out1[1],
            minOut2,
            path2,
            address(this),
            block.timestamp
        );
        emit Swapped(path2[0], path2[1], out1[1], out2[1]);

        uint256 total = amount + premium;
        IERC20(asset).approve(address(POOL), total);
        emit RepaidLoan(total);

        uint256 finalBalance = IERC20(asset).balanceOf(address(this));
        emit Profit(finalBalance);

        return true;
    }
}

