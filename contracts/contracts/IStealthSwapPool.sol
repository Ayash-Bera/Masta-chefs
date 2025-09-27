// SPDX-License-Identifier: MIT
pragma solidity 0.8.30;

interface IStealthSwapPool {
    struct SwapIntent {
        address tokenIn;
        address tokenOut;
        uint256 minOut;
        uint256 deadline;
        bytes32 policy; // hash of policy rules (router allowlist, slippage bounds, etc.)
        uint256 total;
    }

    event IntentCreated(bytes32 indexed intentId, address indexed creator, address tokenIn, address tokenOut, uint256 minOut, uint256 deadline, bytes32 policy);
    event Contributed(bytes32 indexed intentId, address indexed user, uint256 amount);
    event Executed(bytes32 indexed intentId, uint256 amountIn, uint256 amountOut);

    function createIntent(
        address tokenIn,
        address tokenOut,
        uint256 minOut,
        uint256 deadline,
        bytes32 policy
    ) external returns (bytes32 intentId);

    function contribute(bytes32 intentId, uint256 amount) external;

    function execute(
        bytes32 intentId,
        address adapter,
        bytes calldata routerCalldata,
        uint256 expectedMinOut
    ) external returns (uint256 amountOut);

    function getIntent(bytes32 intentId) external view returns (SwapIntent memory intent);
    function contributedOf(bytes32 intentId, address user) external view returns (uint256);
}


