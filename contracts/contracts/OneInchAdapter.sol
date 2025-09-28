// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title OneInchAdapter
 * @notice Minimal, audited-router-guarded adapter to call 1inch Limit Order Protocol (LOP).
 * @dev Does NOT craft calldata. Expects fully-formed LOP calldata.
 *      Computes output by measuring tokenOut balance delta to be LOP-ABI agnostic.
 */
contract OneInchAdapter {
    using SafeERC20 for IERC20;

    address public immutable lop; // 1inch Limit Order Protocol address (chain-specific, audited)
    error LOPNotSet();
    error TokenNotSupported();
    error AmountInZero();
    error LOPCallFailed();
    error Slippage();
    event SwapExecuted(address indexed tokenIn, address indexed tokenOut, uint256 amountIn, uint256 amountOut);

    constructor(address _lop) {
        if (_lop == address(0)) revert LOPNotSet();
        lop = _lop;
    }

    /**
     * @notice Execute swap on 1inch Limit Order Protocol using provided calldata.
     * @param tokenIn Input token address transferred from msg.sender to this adapter before calling.
     * @param tokenOut Output token address expected to be received by this adapter.
     * @param amountIn Amount of tokenIn this adapter should spend. Must be pre-transferred to this contract.
     * @param minAmountOut Slippage bound. Revert if actual < minAmountOut.
     * @param data Fully-formed LOP calldata produced off-chain by 1inch LOP.
     * @return amountOut Actual amount of tokenOut received by this adapter.
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

        // Approve LOP to spend tokenIn held by this adapter.
        IERC20(tokenIn).safeIncreaseAllowance(lop, amountIn);

        // Measure tokenOut balance before to compute delta after call.
        uint256 balBefore = IERC20(tokenOut).balanceOf(address(this));

        // Low-level call to LOP with validated address.
        (bool ok, bytes memory ret) = lop.call(data);
        if (!ok) revert LOPCallFailed();

        // Compute actual output amount by balance delta.
        uint256 balAfter = IERC20(tokenOut).balanceOf(address(this));
        amountOut = balAfter - balBefore;
        if (amountOut < minAmountOut) revert Slippage();

        // Clear approval to minimize allowance exposure (best-effort).
        uint256 remainingAllowance = IERC20(tokenIn).allowance(address(this), lop);
        if (remainingAllowance > 0) {
            IERC20(tokenIn).forceApprove(lop, 0);
        }

        emit SwapExecuted(tokenIn, tokenOut, amountIn, amountOut);
    }

    function _extractRevert(bytes memory ret) private pure returns (string memory) {
        if (ret.length < 4) return "lop-call";
        // Try decode Error(string)
        // 0x08c379a0 = Error(string)
        bytes4 sel;
        assembly { sel := mload(add(ret, 32)) }
        if (sel == 0x08c379a0 && ret.length >= 68) {
            // Skip selector and offset, read string length and data
            uint256 strlen;
            assembly { strlen := mload(add(ret, 68)) }
            if (ret.length >= 100 + strlen) {
                bytes memory s = new bytes(strlen);
                for (uint256 i = 0; i < strlen; i++) {
                    s[i] = ret[100 + i];
                }
                return string(s);
            }
        }
        return "lop-call";
    }
}


