// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IERC20Metadata {
    function symbol() external view returns (string memory);
    function decimals() external view returns (uint8);
}

