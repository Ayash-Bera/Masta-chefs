// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IComplianceOracle} from "../interfaces/IComplianceOracle.sol";

contract ComplianceOracleStub is IComplianceOracle {
    address public owner;
    mapping(address => uint256) public tokenUsdThreshold; // per-token USD threshold (scaled 1e18)

    error NotOwner();

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    function setThreshold(address token, uint256 usdThreshold1e18) external onlyOwner {
        tokenUsdThreshold[token] = usdThreshold1e18;
    }

    function isExitAllowed(address token, uint256 amountUsd1e18) external view returns (bool) {
        uint256 th = tokenUsdThreshold[token];
        if (th == 0) return true; // default allow if unset
        return amountUsd1e18 <= th;
    }
}


