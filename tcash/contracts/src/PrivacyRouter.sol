// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IPrivacyRouter} from "./interfaces/IPrivacyRouter.sol";
import {IShieldedVault} from "./interfaces/IShieldedVault.sol";

contract PrivacyRouter is IPrivacyRouter {
    IShieldedVault public immutable vault;

    constructor(address vault_) {
        vault = IShieldedVault(vault_);
    }

    function spendAndSwap(
        bytes calldata proof,
        bytes32 root,
        bytes32 nullifier,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        bytes calldata recipientStealthData,
        uint256 deadline
    ) external returns (uint256 amountOut) {
        if (block.timestamp > deadline) revert SlippageExceeded();

        // Delegate spend to vault which moves funds and records nullifier
        amountOut = vault.executeSpend(
            proof,
            root,
            nullifier,
            tokenIn,
            tokenOut,
            amountIn,
            minAmountOut,
            recipientStealthData
        );
    }
}


