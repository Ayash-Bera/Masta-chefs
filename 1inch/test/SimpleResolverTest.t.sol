// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "forge-std/Test.sol";
import "forge-std/console.sol";
import "../src/MultiBatch1inchHelper.sol";
import "./mocks/MockERC20.sol";
import "./mocks/MockLimitOrderProtocol.sol";
import "@1inch/solidity-utils/contracts/libraries/AddressLib.sol";
import "limit-order-protocol/contracts/libraries/MakerTraitsLib.sol";

contract SimpleResolverTest is Test {
    using AddressLib for Address;
    using MakerTraitsLib for MakerTraits;

    MultiBatch1inchHelper public batchHelper;
    MockLimitOrderProtocol public mockProtocol;
    MockERC20 public tokenA;
    MockERC20 public tokenB;

    // Test participants
    address public user1 = address(0x1001);
    address public user2 = address(0x1002);
    address public resolver = address(0x2000);

    uint256 public constant INITIAL_SUPPLY = 1000000 * 1e18;

    function setUp() public {
        mockProtocol = new MockLimitOrderProtocol();
        batchHelper = new MultiBatch1inchHelper(address(mockProtocol));

        tokenA = new MockERC20("Token A", "TKNA", 18, INITIAL_SUPPLY);
        tokenB = new MockERC20("Token B", "TKNB", 6, INITIAL_SUPPLY);

        // Give tokens to users
        tokenA.mint(user1, 2000 * 1e18);
        tokenA.mint(user2, 3000 * 1e18);
        tokenB.mint(resolver, 10000 * 1e6);

        // Approvals
        vm.prank(user1);
        tokenA.approve(address(mockProtocol), type(uint256).max);

        vm.prank(user2);
        tokenA.approve(address(mockProtocol), type(uint256).max);

        vm.prank(resolver);
        tokenB.approve(address(mockProtocol), type(uint256).max);
    }

    function testMakerArgumentExplanation() public view {
        console.log("=== MAKER ARGUMENT EXPLANATION ===");
        console.log("");

        console.log("In 1inch limit orders, 'maker' = the ORIGINAL USER who created the order");
        console.log("");
        console.log("Example batch with 2 users:");
        console.log("- Order 1: maker = user1 (0x1001)");
        console.log("- Order 2: maker = user2 (0x1002)");
        console.log("");
        console.log("IMPORTANT: Even in batches, each order keeps its original maker!");
        console.log("The batch helper just groups orders for the same token pair.");
    }

    function testResolverFulfillmentAndRedistribution() public {
        console.log("=== RESOLVER FULFILLMENT & REDISTRIBUTION ===");
        console.log("");

        // STEP 1: Create batch orders
        MultiBatch1inchHelper.BatchedOrder[] memory batchedOrders =
            new MultiBatch1inchHelper.BatchedOrder[](2);

        batchedOrders[0] = MultiBatch1inchHelper.BatchedOrder({
            maker: user1,           // ← MAKER = USER1 (original owner)
            makingAmount: 1000 * 1e18,  // User1 sells 1000 TokenA
            takingAmount: 500 * 1e6,    // User1 wants 500 TokenB
            salt: 12345
        });

        batchedOrders[1] = MultiBatch1inchHelper.BatchedOrder({
            maker: user2,           // ← MAKER = USER2 (original owner)
            makingAmount: 2000 * 1e18,  // User2 sells 2000 TokenA
            takingAmount: 900 * 1e6,    // User2 wants 900 TokenB
            salt: 12346
        });

        console.log("BATCH CREATED:");
        console.log("- User1: Sell 1000 TokenA for 500 TokenB");
        console.log("- User2: Sell 2000 TokenA for 900 TokenB");
        console.log("- TOTAL: 3000 TokenA for 1400 TokenB");

        // Create submission
        MultiBatch1inchHelper.BatchSubmission memory submission = batchHelper.createTokenPairBatch(
            address(tokenA),
            address(tokenB),
            batchedOrders,
            address(0) // receiver = 0 means send to maker
        );

        // Verify makers are preserved
        assertEq(submission.makers[0], user1);
        assertEq(submission.makers[1], user2);
        console.log("[PASS] Makers preserved: user1, user2");

        // STEP 2: Record balances before
        uint256 user1_A_before = tokenA.balanceOf(user1);
        uint256 user1_B_before = tokenB.balanceOf(user1);
        uint256 user2_A_before = tokenA.balanceOf(user2);
        uint256 user2_B_before = tokenB.balanceOf(user2);
        uint256 resolver_A_before = tokenA.balanceOf(resolver);
        uint256 resolver_B_before = tokenB.balanceOf(resolver);

        console.log("");
        console.log("BEFORE RESOLUTION:");
        console.log("User1: %d TokenA, %d TokenB", user1_A_before / 1e18, user1_B_before / 1e6);
        console.log("User2: %d TokenA, %d TokenB", user2_A_before / 1e18, user2_B_before / 1e6);
        console.log("Resolver: %d TokenA, %d TokenB", resolver_A_before / 1e18, resolver_B_before / 1e6);

        // STEP 3: Resolver fulfills orders
        console.log("");
        console.log("RESOLVER FULFILLING ORDERS...");

        vm.startPrank(resolver);

        // Fill User1's order
        mockProtocol.fillOrder(
            submission.orders[0],
            bytes32(0), bytes32(0),
            500 * 1e6, // Resolver provides 500 TokenB
            TakerTraits.wrap(0)
        );

        // Fill User2's order
        mockProtocol.fillOrder(
            submission.orders[1],
            bytes32(0), bytes32(0),
            900 * 1e6, // Resolver provides 900 TokenB
            TakerTraits.wrap(0)
        );

        vm.stopPrank();

        // STEP 4: Check redistribution
        uint256 user1_A_after = tokenA.balanceOf(user1);
        uint256 user1_B_after = tokenB.balanceOf(user1);
        uint256 user2_A_after = tokenA.balanceOf(user2);
        uint256 user2_B_after = tokenB.balanceOf(user2);
        uint256 resolver_A_after = tokenA.balanceOf(resolver);
        uint256 resolver_B_after = tokenB.balanceOf(resolver);

        console.log("");
        console.log("AFTER RESOLUTION:");
        console.log("User1: %d TokenA, %d TokenB", user1_A_after / 1e18, user1_B_after / 1e6);
        console.log("User2: %d TokenA, %d TokenB", user2_A_after / 1e18, user2_B_after / 1e6);
        console.log("Resolver: %d TokenA, %d TokenB", resolver_A_after / 1e18, resolver_B_after / 1e6);

        // STEP 5: Verify redistribution
        console.log("");
        console.log("REDISTRIBUTION VERIFICATION:");

        // User1 changes
        uint256 user1_A_change = user1_A_before - user1_A_after;
        uint256 user1_B_change = user1_B_after - user1_B_before;
        assertEq(user1_A_change, 1000 * 1e18);
        assertEq(user1_B_change, 500 * 1e6);
        console.log("[PASS] User1 trade verified");

        // User2 changes
        uint256 user2_A_change = user2_A_before - user2_A_after;
        uint256 user2_B_change = user2_B_after - user2_B_before;
        assertEq(user2_A_change, 2000 * 1e18);
        assertEq(user2_B_change, 900 * 1e6);
        console.log("[PASS] User2 trade verified");

        // Resolver changes
        uint256 resolver_A_change = resolver_A_after - resolver_A_before;
        uint256 resolver_B_change = resolver_B_before - resolver_B_after;
        assertEq(resolver_A_change, 3000 * 1e18);
        assertEq(resolver_B_change, 1400 * 1e6);
        console.log("[PASS] Resolver trade verified");

        console.log("");
        console.log("[SUCCESS] REDISTRIBUTION SUCCESSFUL!");
        console.log("- Each user got exactly what they wanted");
        console.log("- Resolver got all the TokenA they provided liquidity for");
        console.log("- Total: 3000 TokenA <-> 1400 TokenB traded");
    }

    function testBatchHelperPreservesOriginalMakers() public {
        console.log("=== BATCH HELPER PRESERVES ORIGINAL MAKERS ===");

        MultiBatch1inchHelper.BatchedOrder[] memory orders =
            new MultiBatch1inchHelper.BatchedOrder[](2);

        orders[0] = MultiBatch1inchHelper.BatchedOrder({
            maker: user1,
            makingAmount: 1000 * 1e18,
            takingAmount: 500 * 1e6,
            salt: 12345
        });

        orders[1] = MultiBatch1inchHelper.BatchedOrder({
            maker: user2,
            makingAmount: 2000 * 1e18,
            takingAmount: 900 * 1e6,
            salt: 12346
        });

        MultiBatch1inchHelper.BatchSubmission memory submission = batchHelper.createTokenPairBatch(
            address(tokenA),
            address(tokenB),
            orders,
            address(0)
        );

        console.log("INPUT MAKERS:");
        console.log("- orders[0].maker = %s", orders[0].maker);
        console.log("- orders[1].maker = %s", orders[1].maker);

        console.log("");
        console.log("OUTPUT MAKERS (in 1inch orders):");
        console.log("- submission.makers[0] = %s", submission.makers[0]);
        console.log("- submission.makers[1] = %s", submission.makers[1]);

        console.log("");
        console.log("ACTUAL 1INCH ORDER MAKERS:");
        console.log("- submission.orders[0].maker = %s", submission.orders[0].maker.get());
        console.log("- submission.orders[1].maker = %s", submission.orders[1].maker.get());

        // Verify makers are preserved throughout
        assertEq(submission.makers[0], user1);
        assertEq(submission.makers[1], user2);
        assertEq(submission.orders[0].maker.get(), user1);
        assertEq(submission.orders[1].maker.get(), user2);

        console.log("");
        console.log("[CONFIRMED] Makers are preserved at every level!");
        console.log("[CONFIRMED] Each user maintains ownership of their individual order");
    }
}