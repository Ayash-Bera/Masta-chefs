// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title MockOneInchAdapter
 * @notice Mock adapter for testing on Sepolia testnet where 1inch LOP is not available
 * @dev This simulates 1inch LOP functionality for testing purposes
 */
contract MockOneInchAdapter {
    using SafeERC20 for IERC20;

    // Mock exchange rate (1:1 for testing)
    uint256 public constant MOCK_EXCHANGE_RATE = 1e18; // 1:1 ratio
    
    // Events
    event MockSwapExecuted(
        address indexed tokenIn, 
        address indexed tokenOut, 
        uint256 amountIn, 
        uint256 amountOut
    );

    // Errors
    error TokenNotSupported();
    error AmountInZero();
    error InsufficientBalance();
    error SwapFailed();

    /**
     * @notice Mock swap function that simulates 1inch LOP behavior
     * @param tokenIn Input token address
     * @param tokenOut Output token address  
     * @param amountIn Amount of input tokens
     * @param minAmountOut Minimum expected output (for slippage protection)
     * @param data Mock calldata (ignored in mock)
     * @return amountOut Actual amount of output tokens received
     */
    function swapViaLOP(
        address tokenIn,
        address tokenOut,
        uint256 amountIn,
        uint256 minAmountOut,
        bytes calldata data
    ) external returns (uint256 amountOut) {
        if (tokenIn == address(0) || tokenOut == address(0)) revert TokenNotSupported();
        if (amountIn == 0) revert AmountInZero();

        // Check if this contract has enough output tokens
        IERC20 outputToken = IERC20(tokenOut);
        uint256 outputBalance = outputToken.balanceOf(address(this));
        
        // Calculate mock output amount (1:1 ratio for simplicity)
        amountOut = (amountIn * MOCK_EXCHANGE_RATE) / 1e18;
        
        if (amountOut < minAmountOut) revert SwapFailed();
        if (amountOut > outputBalance) revert InsufficientBalance();

        // Transfer input tokens from caller to this contract
        IERC20(tokenIn).safeTransferFrom(msg.sender, address(this), amountIn);
        
        // Transfer output tokens from this contract to caller
        outputToken.safeTransfer(msg.sender, amountOut);

        emit MockSwapExecuted(tokenIn, tokenOut, amountIn, amountOut);
    }

    /**
     * @notice Deposit tokens to this mock adapter for testing
     * @param token Token address to deposit
     * @param amount Amount to deposit
     */
    function depositTokens(address token, uint256 amount) external {
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
    }

    /**
     * @notice Get the mock exchange rate
     * @return rate The current mock exchange rate
     */
    function getMockExchangeRate() external pure returns (uint256 rate) {
        return MOCK_EXCHANGE_RATE;
    }

    /**
     * @notice Check if this is a mock adapter
     * @return isMock Always returns true
     */
    function isMockAdapter() external pure returns (bool isMock) {
        return true;
    }
}
