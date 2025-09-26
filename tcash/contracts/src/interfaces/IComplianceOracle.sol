// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IComplianceOracle {
    function isExitAllowed(address token, uint256 amount) external view returns (bool);
}


