// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

/**
 * @title IERC4337
 * @notice Interface definitions for ERC-4337 Account Abstraction
 */

struct UserOperation {
    address sender;
    uint256 nonce;
    bytes initCode;
    bytes callData;
    uint256 callGasLimit;
    uint256 verificationGasLimit;
    uint256 preVerificationGas;
    uint256 maxFeePerGas;
    uint256 maxPriorityFeePerGas;
    bytes paymasterAndData;
    bytes signature;
}

enum PostOpMode {
    opSucceeded,
    opReverted,
    postOpReverted
}

interface IPaymaster {
    function validatePaymasterUserOp(
        UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 maxCost
    ) external returns (bytes memory context, uint256 validationData);

    function postOp(
        PostOpMode mode,
        bytes calldata context,
        uint256 actualGasCost
    ) external;
}

interface IEntryPoint {
    function handleOps(
        UserOperation[] calldata ops,
        address payable beneficiary
    ) external;

    function handleAggregatedOps(
        UserOperation[] calldata opsPerAggregator,
        address payable beneficiary
    ) external;

    function simulateValidation(UserOperation calldata userOp)
        external
        returns (
            uint256 preOpGas,
            uint256 prefund,
            bool sigFailed,
            uint48 validAfter,
            uint48 validUntil,
            bytes memory paymasterContext
        );

    function getUserOpHash(UserOperation calldata userOp)
        external
        view
        returns (bytes32);
}

