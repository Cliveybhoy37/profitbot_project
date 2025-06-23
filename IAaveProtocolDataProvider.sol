// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IAaveProtocolDataProvider {
    struct ReserveConfigurationMap {
        uint256 data;
    }

    struct ReserveData {
        uint256 availableLiquidity;
        uint256 totalStableDebt;
        uint256 totalVariableDebt;
        uint256 liquidityRate;
        uint256 variableBorrowRate;
        uint256 stableBorrowRate;
        uint256 averageStableBorrowRate;
        uint256 liquidityIndex;
        uint256 variableBorrowIndex;
        uint40 lastUpdateTimestamp;
    }

    function getReserveData(address asset) external view returns (ReserveData memory);

    function getReserveConfigurationData(address asset)
        external
        view
        returns (ReserveConfigurationMap memory);
}

