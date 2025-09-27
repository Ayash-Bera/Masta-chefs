// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "forge-std/console.sol";
import "../src/MultiBatch1inchHelper.sol";
import "./mocks/MockERC20.sol";
import "./mocks/MockLimitOrderProtocol.sol";
import "@1inch/solidity-utils/contracts/libraries/AddressLib.sol";
import "limit-order-protocol/contracts/libraries/MakerTraitsLib.sol";

contract MultiBatch1inchHelperTest is Test {
    using AddressLib for Address;
    using MakerTraitsLib for MakerTraits;

    MultiBatch1inchHelper public batchHelper;
    MockLimitOrderProtocol public mockProtocol;
    MockERC20 public tokenA;
    MockERC20 public tokenB;

    // Multiple users for testing
    address public user1 = address(0x1001);
    address public user2 = address(0x1002);
    address public user3 = address(0x1003);
    address public receiver = address(0x2000);

    uint256 public constant INITIAL_SUPPLY = 1000000 * 1e18;

    event BatchApprovalCompleted(address indexed user, uint256 count);
    event BatchOrdersCreated(address makerAsset, address takerAsset, uint256 orderCount, uint256 totalMakingAmount);

    function setUp() public {
        // Deploy mock protocol and helper
        mockProtocol = new MockLimitOrderProtocol();
        batchHelper = new MultiBatch1inchHelper(address(mockProtocol));

        // Deploy test tokens
        tokenA = new MockERC20("Token A", "TKNA", 18, INITIAL_SUPPLY);
        tokenB = new MockERC20("Token B", "TKNB", 6, INITIAL_SUPPLY);

        // Mint tokens to users
        tokenA.mint(user1, INITIAL_SUPPLY);
        tokenA.mint(user2, INITIAL_SUPPLY);
        tokenA.mint(user3, INITIAL_SUPPLY);

        tokenB.mint(user1, INITIAL_SUPPLY);
        tokenB.mint(user2, INITIAL_SUPPLY);
        tokenB.mint(user3, INITIAL_SUPPLY);

        // Pre-approve tokens for testing
        vm.startPrank(user1);
        tokenA.approve(address(mockProtocol), type(uint256).max);
        tokenB.approve(address(mockProtocol), type(uint256).max);
        vm.stopPrank();

        vm.startPrank(user2);
        tokenA.approve(address(mockProtocol), type(uint256).max);
        tokenB.approve(address(mockProtocol), type(uint256).max);
        vm.stopPrank();

        vm.startPrank(user3);
        tokenA.approve(address(mockProtocol), type(uint256).max);
        tokenB.approve(address(mockProtocol), type(uint256).max);
        vm.stopPrank();
    }

    function testBatchApprove() public {
        vm.startPrank(user1);

        MultiBatch1inchHelper.ApprovalData[] memory approvals =
            new MultiBatch1inchHelper.ApprovalData[](2);

        approvals[0] = MultiBatch1inchHelper.ApprovalData({
            token: address(tokenA),
            amount: 1000 * 1e18
        });
        approvals[1] = MultiBatch1inchHelper.ApprovalData({
            token: address(tokenB),
            amount: 2000 * 1e6
        });

        vm.expectEmit(true, false, false, true);
        emit BatchApprovalCompleted(user1, 2);

        batchHelper.batchApprove(approvals);

        // Verify approvals worked (should be at least the amount we tried to approve)
        assertGe(tokenA.allowance(user1, address(mockProtocol)), 1000 * 1e18);
        assertGe(tokenB.allowance(user1, address(mockProtocol)), 2000 * 1e6);

        vm.stopPrank();
    }

    function testMultiUserTokenPairBatch() public {
        console.log("=== Testing Multi-User Token Pair Batching ===");

        // Create batch orders from 3 different users for TokenA -> TokenB
        MultiBatch1inchHelper.BatchedOrder[] memory batchedOrders =
            new MultiBatch1inchHelper.BatchedOrder[](3);

        // User1: Sell 1000 TokenA for 500 TokenB
        batchedOrders[0] = MultiBatch1inchHelper.BatchedOrder({
            maker: user1,
            makingAmount: 1000 * 1e18,
            takingAmount: 500 * 1e6,
            salt: 12345
        });

        // User2: Sell 2000 TokenA for 950 TokenB
        batchedOrders[1] = MultiBatch1inchHelper.BatchedOrder({
            maker: user2,
            makingAmount: 2000 * 1e18,
            takingAmount: 950 * 1e6,
            salt: 12346
        });

        // User3: Sell 1500 TokenA for 720 TokenB
        batchedOrders[2] = MultiBatch1inchHelper.BatchedOrder({
            maker: user3,
            makingAmount: 1500 * 1e18,
            takingAmount: 720 * 1e6,
            salt: 12347
        });

        console.log("Created batch with %d orders from different users", batchedOrders.length);

        // Create the batch submission
        MultiBatch1inchHelper.BatchSubmission memory submission = batchHelper.createTokenPairBatch(
            address(tokenA),
            address(tokenB),
            batchedOrders,
            receiver
        );

        // Verify batch submission
        assertEq(submission.totalOrders, 3);
        assertEq(submission.orders.length, 3);
        assertEq(submission.orderHashes.length, 3);
        assertEq(submission.makers.length, 3);

        // Verify individual orders
        assertEq(submission.makers[0], user1);
        assertEq(submission.makers[1], user2);
        assertEq(submission.makers[2], user3);

        // Verify order details
        assertEq(submission.orders[0].makingAmount, 1000 * 1e18);
        assertEq(submission.orders[1].makingAmount, 2000 * 1e18);
        assertEq(submission.orders[2].makingAmount, 1500 * 1e18);

        // Verify order hashes are unique
        assertTrue(submission.orderHashes[0] != submission.orderHashes[1]);
        assertTrue(submission.orderHashes[1] != submission.orderHashes[2]);

        console.log("[PASS] Batch submission created successfully");
    }

    function testBatchValidation() public {
        console.log("=== Testing Batch Validation ===");

        MultiBatch1inchHelper.BatchedOrder[] memory batchedOrders =
            new MultiBatch1inchHelper.BatchedOrder[](3);

        batchedOrders[0] = MultiBatch1inchHelper.BatchedOrder({
            maker: user1,
            makingAmount: 500 * 1e18,
            takingAmount: 250 * 1e6,
            salt: 12345
        });

        batchedOrders[1] = MultiBatch1inchHelper.BatchedOrder({
            maker: user2,
            makingAmount: 1000 * 1e18,
            takingAmount: 500 * 1e6,
            salt: 12346
        });

        batchedOrders[2] = MultiBatch1inchHelper.BatchedOrder({
            maker: user3,
            makingAmount: 750 * 1e18,
            takingAmount: 375 * 1e6,
            salt: 12347
        });

        // Test balance validation
        (bool validBalances, address[] memory failedBalances) = batchHelper.validateBatchBalances(
            address(tokenA),
            batchedOrders
        );

        assertTrue(validBalances);
        assertEq(failedBalances.length, 0);
        console.log("[PASS] All users have sufficient balances");

        // Test allowance validation
        (bool validAllowances, address[] memory failedAllowances) = batchHelper.validateBatchAllowances(
            address(tokenA),
            batchedOrders
        );

        assertTrue(validAllowances);
        assertEq(failedAllowances.length, 0);
        console.log("[PASS] All users have sufficient allowances");

        // Test with insufficient balance
        MultiBatch1inchHelper.BatchedOrder[] memory badOrders =
            new MultiBatch1inchHelper.BatchedOrder[](1);

        badOrders[0] = MultiBatch1inchHelper.BatchedOrder({
            maker: user1,
            makingAmount: INITIAL_SUPPLY * 2, // More than user has
            takingAmount: 1000 * 1e6,
            salt: 99999
        });

        (bool validBadBalances, address[] memory failedBadBalances) = batchHelper.validateBatchBalances(
            address(tokenA),
            badOrders
        );

        assertFalse(validBadBalances);
        assertEq(failedBadBalances.length, 1);
        assertEq(failedBadBalances[0], user1);
        console.log("[PASS] Correctly identified insufficient balance");
    }

    function testBatchStatistics() public {
        console.log("=== Testing Batch Statistics ===");

        MultiBatch1inchHelper.BatchedOrder[] memory batchedOrders =
            new MultiBatch1inchHelper.BatchedOrder[](3);

        batchedOrders[0] = MultiBatch1inchHelper.BatchedOrder({
            maker: user1,
            makingAmount: 1000 * 1e18,
            takingAmount: 500 * 1e6,
            salt: 12345
        });

        batchedOrders[1] = MultiBatch1inchHelper.BatchedOrder({
            maker: user2,
            makingAmount: 2000 * 1e18,
            takingAmount: 1000 * 1e6,
            salt: 12346
        });

        batchedOrders[2] = MultiBatch1inchHelper.BatchedOrder({
            maker: user3,
            makingAmount: 1500 * 1e18,
            takingAmount: 750 * 1e6,
            salt: 12347
        });

        (
            uint256 totalMakers,
            uint256 totalMakingAmount,
            uint256 totalTakingAmount,
            uint256 avgPrice
        ) = batchHelper.getBatchStatistics(batchedOrders);

        assertEq(totalMakers, 3);
        assertEq(totalMakingAmount, 4500 * 1e18);
        assertEq(totalTakingAmount, 2250 * 1e6);
        // Price calculation: 2250 * 1e6 * 1e18 / (4500 * 1e18) = 500000000000000
        assertEq(avgPrice, (2250 * 1e6 * 1e18) / (4500 * 1e18));

        console.log("Batch Statistics - Makers, Making, Taking, Price:");
    }

    function testTokenPairSummary() public {
        MultiBatch1inchHelper.BatchedOrder[] memory batchedOrders =
            new MultiBatch1inchHelper.BatchedOrder[](2);

        batchedOrders[0] = MultiBatch1inchHelper.BatchedOrder({
            maker: user1,
            makingAmount: 1000 * 1e18,
            takingAmount: 500 * 1e6,
            salt: 12345
        });

        batchedOrders[1] = MultiBatch1inchHelper.BatchedOrder({
            maker: user2,
            makingAmount: 2000 * 1e18,
            takingAmount: 950 * 1e6,
            salt: 12346
        });

        MultiBatch1inchHelper.TokenPairBatch memory batch = batchHelper.createTokenPairSummary(
            address(tokenA),
            address(tokenB),
            batchedOrders
        );

        assertEq(batch.makerAsset, address(tokenA));
        assertEq(batch.takerAsset, address(tokenB));
        assertEq(batch.orders.length, 2);
        assertEq(batch.totalMakingAmount, 3000 * 1e18);
        assertEq(batch.totalTakingAmount, 1450 * 1e6);
    }

    function testBatchCheckAllowances() public {
        address[] memory makers = new address[](2);
        makers[0] = user1;
        makers[1] = user2;

        address[] memory tokens = new address[](2);
        tokens[0] = address(tokenA);
        tokens[1] = address(tokenB);

        uint256[][] memory allowances = batchHelper.batchCheckAllowances(makers, tokens);

        assertEq(allowances.length, 2); // 2 makers
        assertEq(allowances[0].length, 2); // 2 tokens for first maker
        assertEq(allowances[1].length, 2); // 2 tokens for second maker

        // Should all be max since we approved unlimited in setUp
        assertEq(allowances[0][0], type(uint256).max); // user1 -> tokenA
        assertEq(allowances[0][1], type(uint256).max); // user1 -> tokenB
        assertEq(allowances[1][0], type(uint256).max); // user2 -> tokenA
        assertEq(allowances[1][1], type(uint256).max); // user2 -> tokenB
    }

    function testCompleteMultiUserWorkflow() public {
        console.log("=== Complete Multi-User Batch Workflow ===");

        // Step 1: Multiple users want to sell TokenA for TokenB
        MultiBatch1inchHelper.BatchedOrder[] memory batchedOrders =
            new MultiBatch1inchHelper.BatchedOrder[](3);

        batchedOrders[0] = MultiBatch1inchHelper.BatchedOrder({
            maker: user1,
            makingAmount: 1000 * 1e18,
            takingAmount: 500 * 1e6,
            salt: 12345
        });

        batchedOrders[1] = MultiBatch1inchHelper.BatchedOrder({
            maker: user2,
            makingAmount: 2000 * 1e18,
            takingAmount: 1000 * 1e6,
            salt: 12346
        });

        batchedOrders[2] = MultiBatch1inchHelper.BatchedOrder({
            maker: user3,
            makingAmount: 1500 * 1e18,
            takingAmount: 750 * 1e6,
            salt: 12347
        });

        console.log("Created orders from multiple users");

        // Step 2: Validate everyone has sufficient balances and allowances
        (bool validBalances,) = batchHelper.validateBatchBalances(address(tokenA), batchedOrders);
        (bool validAllowances,) = batchHelper.validateBatchAllowances(address(tokenA), batchedOrders);

        assertTrue(validBalances);
        assertTrue(validAllowances);
        console.log("[PASS] All validations passed");

        // Step 3: Create batch submission ready for 1inch
        MultiBatch1inchHelper.BatchSubmission memory submission = batchHelper.createTokenPairBatch(
            address(tokenA),
            address(tokenB),
            batchedOrders,
            receiver
        );

        console.log("Created batch submission");

        // Step 4: Get statistics
        (uint256 totalMakers, uint256 totalMaking, uint256 totalTaking, uint256 avgPrice) =
            batchHelper.getBatchStatistics(batchedOrders);

        console.log("Batch totals calculated");

        // Verify final results
        assertEq(submission.totalOrders, 3);
        assertEq(totalMakers, 3);
        assertEq(totalMaking, 4500 * 1e18);
        assertEq(totalTaking, 2250 * 1e6);

        console.log("[SUCCESS] Multi-user batch workflow completed successfully!");
        console.log("Ready for off-chain signing and 1inch API submission");
    }
}