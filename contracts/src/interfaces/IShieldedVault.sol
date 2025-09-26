// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IShieldedVault {
    event CommitmentInserted(bytes32 indexed commitment, uint32 index, bytes32 newRoot);
    event NullifierUsed(bytes32 indexed nullifier);
    event RootUpdated(bytes32 indexed newRoot);

    error InvalidDenomination();
    error InvalidRoot();
    error NullifierAlreadyUsed();
    error Unauthorized();

    function deposit(
        address token,
        uint256 amount,
        bytes32 commitment,
        uint256 denominationId
    ) external;

    function withdraw(
        bytes calldata proof,
        bytes32 root,
        bytes32 nullifier,
        address token,
        uint256 amount,
        address recipient
    ) external;

    function executeSpend(
        bytes calldata proof,
        bytes32 root,
        bytes32 nullifier,
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        bytes calldata recipientStealthData
    ) external returns (uint256 amountOut);

    function latestRoot() external view returns (bytes32);
}


