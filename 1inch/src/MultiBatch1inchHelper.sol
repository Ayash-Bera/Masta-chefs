// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import "limit-order-protocol/contracts/interfaces/IOrderMixin.sol";
import "@1inch/solidity-utils/contracts/libraries/AddressLib.sol";

/**
 * @title MultiBatch1inchHelper
 * @notice Multi-user batch operations for 1inch Limit Order Protocol v4
 * @dev Allows multiple users to batch orders for the same token pairs
 */
contract MultiBatch1inchHelper {
    using AddressLib for Address;

    address public immutable limitOrderProtocol;

    struct ApprovalData {
        address token;
        uint256 amount;
    }

    struct BatchedOrder {
        address maker;
        uint256 makingAmount;
        uint256 takingAmount;
        uint256 salt;
    }

    struct TokenPairBatch {
        address makerAsset;
        address takerAsset;
        BatchedOrder[] orders;
        uint256 totalMakingAmount;
        uint256 totalTakingAmount;
    }

    struct BatchSubmission {
        IOrderMixin.Order[] orders;
        bytes32[] orderHashes;
        address[] makers;
        uint256 totalOrders;
    }

    event BatchApprovalCompleted(address indexed user, uint256 count);
    event BatchOrdersCreated(address makerAsset, address takerAsset, uint256 orderCount, uint256 totalMakingAmount);
    event UserAddedToBatch(address indexed user, address makerAsset, address takerAsset, uint256 makingAmount);

    constructor(address _limitOrderProtocol) {
        limitOrderProtocol = _limitOrderProtocol;
    }

    /**
     * @notice Batch approve multiple tokens for limit orders
     * @param approvals Array of tokens and amounts to approve
     */
    function batchApprove(ApprovalData[] calldata approvals) external {
        for (uint256 i = 0; i < approvals.length; i++) {
            IERC20(approvals[i].token).approve(
                limitOrderProtocol,
                approvals[i].amount
            );
        }
        emit BatchApprovalCompleted(msg.sender, approvals.length);
    }

    /**
     * @notice Approve unlimited amounts for multiple tokens
     * @param tokens Array of token addresses to approve
     */
    function batchApproveUnlimited(address[] calldata tokens) external {
        for (uint256 i = 0; i < tokens.length; i++) {
            IERC20(tokens[i]).approve(limitOrderProtocol, type(uint256).max);
        }
        emit BatchApprovalCompleted(msg.sender, tokens.length);
    }

    /**
     * @notice Create batch of orders from multiple users for same token pair
     * @param makerAsset Token being sold
     * @param takerAsset Token being bought
     * @param batchedOrders Array of orders from different users
     * @param receiver Address to receive tokens (can be zero for maker)
     * @return submission Complete batch ready for submission
     */
    function createTokenPairBatch(
        address makerAsset,
        address takerAsset,
        BatchedOrder[] calldata batchedOrders,
        address receiver
    ) external view returns (BatchSubmission memory submission) {
        submission.orders = new IOrderMixin.Order[](batchedOrders.length);
        submission.orderHashes = new bytes32[](batchedOrders.length);
        submission.makers = new address[](batchedOrders.length);
        submission.totalOrders = batchedOrders.length;

        for (uint256 i = 0; i < batchedOrders.length; i++) {
            BatchedOrder memory batchOrder = batchedOrders[i];

            submission.orders[i] = IOrderMixin.Order({
                salt: batchOrder.salt,
                maker: Address.wrap(uint256(uint160(batchOrder.maker))),
                receiver: Address.wrap(uint256(uint160(receiver))),
                makerAsset: Address.wrap(uint256(uint160(makerAsset))),
                takerAsset: Address.wrap(uint256(uint160(takerAsset))),
                makingAmount: batchOrder.makingAmount,
                takingAmount: batchOrder.takingAmount,
                makerTraits: MakerTraits.wrap(0)
            });

            submission.orderHashes[i] = IOrderMixin(limitOrderProtocol).hashOrder(submission.orders[i]);
            submission.makers[i] = batchOrder.maker;
        }
    }

    /**
     * @notice Create batch summary for a token pair
     * @param makerAsset Token being sold
     * @param takerAsset Token being bought
     * @param batchedOrders Array of orders from different users
     * @return batch Token pair batch information
     */
    function createTokenPairSummary(
        address makerAsset,
        address takerAsset,
        BatchedOrder[] calldata batchedOrders
    ) external pure returns (TokenPairBatch memory batch) {
        batch.makerAsset = makerAsset;
        batch.takerAsset = takerAsset;
        batch.orders = batchedOrders;

        for (uint256 i = 0; i < batchedOrders.length; i++) {
            batch.totalMakingAmount += batchedOrders[i].makingAmount;
            batch.totalTakingAmount += batchedOrders[i].takingAmount;
        }
    }

    /**
     * @notice Validate that all makers in batch have sufficient balances
     * @param makerAsset Token being sold
     * @param batchedOrders Array of orders to validate
     * @return valid True if all makers have sufficient balance
     * @return failedMakers Array of makers with insufficient balance
     */
    function validateBatchBalances(
        address makerAsset,
        BatchedOrder[] calldata batchedOrders
    ) external view returns (bool valid, address[] memory failedMakers) {
        uint256 failedCount = 0;
        address[] memory tempFailed = new address[](batchedOrders.length);

        for (uint256 i = 0; i < batchedOrders.length; i++) {
            uint256 balance = IERC20(makerAsset).balanceOf(batchedOrders[i].maker);
            if (balance < batchedOrders[i].makingAmount) {
                tempFailed[failedCount] = batchedOrders[i].maker;
                failedCount++;
            }
        }

        valid = (failedCount == 0);
        failedMakers = new address[](failedCount);
        for (uint256 i = 0; i < failedCount; i++) {
            failedMakers[i] = tempFailed[i];
        }
    }

    /**
     * @notice Validate that all makers in batch have sufficient allowances
     * @param makerAsset Token being sold
     * @param batchedOrders Array of orders to validate
     * @return valid True if all makers have sufficient allowance
     * @return failedMakers Array of makers with insufficient allowance
     */
    function validateBatchAllowances(
        address makerAsset,
        BatchedOrder[] calldata batchedOrders
    ) external view returns (bool valid, address[] memory failedMakers) {
        uint256 failedCount = 0;
        address[] memory tempFailed = new address[](batchedOrders.length);

        for (uint256 i = 0; i < batchedOrders.length; i++) {
            uint256 allowance = IERC20(makerAsset).allowance(batchedOrders[i].maker, limitOrderProtocol);
            if (allowance < batchedOrders[i].makingAmount) {
                tempFailed[failedCount] = batchedOrders[i].maker;
                failedCount++;
            }
        }

        valid = (failedCount == 0);
        failedMakers = new address[](failedCount);
        for (uint256 i = 0; i < failedCount; i++) {
            failedMakers[i] = tempFailed[i];
        }
    }

    /**
     * @notice Check allowances for multiple makers and tokens
     * @param makers Array of maker addresses
     * @param tokens Array of token addresses
     * @return allowances 2D array of allowances [maker][token]
     */
    function batchCheckAllowances(
        address[] calldata makers,
        address[] calldata tokens
    ) external view returns (uint256[][] memory allowances) {
        allowances = new uint256[][](makers.length);

        for (uint256 i = 0; i < makers.length; i++) {
            allowances[i] = new uint256[](tokens.length);
            for (uint256 j = 0; j < tokens.length; j++) {
                allowances[i][j] = IERC20(tokens[j]).allowance(makers[i], limitOrderProtocol);
            }
        }
    }

    /**
     * @notice Get aggregated statistics for a token pair batch
     * @param batchedOrders Array of orders for the same token pair
     * @return totalMakers Number of unique makers
     * @return totalMakingAmount Total amount being sold
     * @return totalTakingAmount Total amount being bought
     * @return avgPrice Average price (takingAmount/makingAmount)
     */
    function getBatchStatistics(
        BatchedOrder[] calldata batchedOrders
    ) external pure returns (
        uint256 totalMakers,
        uint256 totalMakingAmount,
        uint256 totalTakingAmount,
        uint256 avgPrice
    ) {
        totalMakers = batchedOrders.length; // Note: assumes all unique makers

        for (uint256 i = 0; i < batchedOrders.length; i++) {
            totalMakingAmount += batchedOrders[i].makingAmount;
            totalTakingAmount += batchedOrders[i].takingAmount;
        }

        if (totalMakingAmount > 0) {
            avgPrice = (totalTakingAmount * 1e18) / totalMakingAmount;
        }
    }

    /**
     * @notice Emergency function to recover stuck tokens
     * @param token Token address to recover
     * @param amount Amount to recover
     */
    function emergencyWithdrawToken(address token, uint256 amount) external {
        IERC20(token).transfer(msg.sender, amount);
    }
}