// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IPrivacyRouter {
    error ProofVerificationFailed();
    error SlippageExceeded();

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
    ) external returns (uint256 amountOut);
}


