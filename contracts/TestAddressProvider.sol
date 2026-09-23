// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.20;
contract TestAddressProvider {
    address public pool;
    constructor() { pool = msg.sender; }
    function getPool() external view returns (address) { return pool; }
}
