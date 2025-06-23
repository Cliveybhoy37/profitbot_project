// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IAaveOracle {
    function getAssetPrice(address asset) external view returns (uint256);
}

