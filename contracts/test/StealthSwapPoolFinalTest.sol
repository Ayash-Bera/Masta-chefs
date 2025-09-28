// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../contracts/StealthSwapPoolFinal.sol";
import "../contracts/OneInchAdapter.sol";
import "../contracts/MockERC20.sol";

contract StealthSwapPoolFinalTest is Test {
    StealthSwapPoolFinal public pool;
    OneInchAdapter public adapter;
    MockERC20 public tokenA;
    MockERC20 public tokenB;
    
    address public user1 = makeAddr("user1");
    address public user2 = makeAddr("user2");
    address public owner = makeAddr("owner");
    
    function setUp() public {
        // Deploy mock tokens
        tokenA = new MockERC20("Token A", "TKA", 18);
        tokenB = new MockERC20("Token B", "TKB", 18);
        
        // Deploy adapter with mock router
        adapter = new OneInchAdapter(makeAddr("router"));
        
        // Deploy pool
        pool = new StealthSwapPoolFinal();
        
        // Setup pool - deployer is the owner
        pool.setAdapterAllowed(address(adapter), true);
        
        // Mint tokens to users
        tokenA.mint(user1, 1000e18);
        tokenA.mint(user2, 1000e18);
        tokenB.mint(address(pool), 1000e18); // Pool has output tokens
        
        // Approve pool to spend tokens
        vm.prank(user1);
        tokenA.approve(address(pool), 1000e18);
        vm.prank(user2);
        tokenA.approve(address(pool), 1000e18);
    }
    
    function testCreateIntent() public {
        vm.prank(user1);
        bytes32 intentId = pool.createIntent(
            address(tokenA),
            address(tokenB),
            100e18, // minOut
            block.timestamp + 1 hours, // deadline
            keccak256("policy") // policy
        );
        
        assertTrue(intentId != bytes32(0));
        
        // Check intent details
        IStealthSwapPool.SwapIntent memory intent = pool.getIntent(intentId);
        assertEq(intent.tokenIn, address(tokenA));
        assertEq(intent.tokenOut, address(tokenB));
        assertEq(intent.minOut, 100e18);
        assertEq(intent.deadline, block.timestamp + 1 hours);
        assertEq(intent.policy, keccak256("policy"));
        assertEq(intent.total, 0);
    }
    
    function testContribute() public {
        // Create intent
        vm.prank(user1);
        bytes32 intentId = pool.createIntent(
            address(tokenA),
            address(tokenB),
            100e18,
            block.timestamp + 1 hours,
            keccak256("policy")
        );
        
        // User1 contributes
        vm.prank(user1);
        pool.contribute(intentId, 100e18);
        
        // Check contribution
        assertEq(pool.contributedOf(intentId, user1), 100e18);
        assertEq(tokenA.balanceOf(user1), 900e18);
        assertEq(tokenA.balanceOf(address(pool)), 100e18);
    }
    
    function testMultipleContributions() public {
        // Create intent
        vm.prank(user1);
        bytes32 intentId = pool.createIntent(
            address(tokenA),
            address(tokenB),
            200e18,
            block.timestamp + 1 hours,
            keccak256("policy")
        );
        
        // Both users contribute
        vm.prank(user1);
        pool.contribute(intentId, 100e18);
        
        vm.prank(user2);
        pool.contribute(intentId, 150e18);
        
        // Check total
        IStealthSwapPool.SwapIntent memory intent = pool.getIntent(intentId);
        assertEq(intent.total, 250e18);
        assertEq(pool.contributedOf(intentId, user1), 100e18);
        assertEq(pool.contributedOf(intentId, user2), 150e18);
    }
    
    function test_RevertWhen_ContributeExpiredIntent() public {
        // Create intent with valid deadline first
        vm.prank(user1);
        bytes32 intentId = pool.createIntent(
            address(tokenA),
            address(tokenB),
            100e18,
            block.timestamp + 1 hours, // Valid deadline
            keccak256("policy")
        );
        
        // Fast forward time to make it expired
        vm.warp(block.timestamp + 2 hours);
        
        // Try to contribute - should fail
        vm.prank(user1);
        vm.expectRevert(StealthSwapPoolFinal.IntentExpired.selector);
        pool.contribute(intentId, 100e18);
    }
    
    function test_RevertWhenContributeZeroAmount() public {
        vm.prank(user1);
        bytes32 intentId = pool.createIntent(
            address(tokenA),
            address(tokenB),
            100e18,
            block.timestamp + 1 hours,
            keccak256("policy")
        );
        
        vm.prank(user1);
        vm.expectRevert(StealthSwapPoolFinal.ZeroAmount.selector);
        pool.contribute(intentId, 0);
    }
    
    function test_RevertWhenContributeToNonExistentIntent() public {
        bytes32 fakeIntentId = keccak256("fake");
        
        vm.prank(user1);
        vm.expectRevert(StealthSwapPoolFinal.IntentNotFound.selector);
        pool.contribute(fakeIntentId, 100e18);
    }
    
    function test_RevertWhenCreateIntentWithZeroToken() public {
        vm.prank(user1);
        vm.expectRevert(StealthSwapPoolFinal.TokenNotSupported.selector);
        pool.createIntent(
            address(0), // Zero address
            address(tokenB),
            100e18,
            block.timestamp + 1 hours,
            keccak256("policy")
        );
    }
    
    function test_RevertWhenCreateIntentWithPastDeadline() public {
        vm.prank(user1);
        vm.expectRevert("deadline");
        pool.createIntent(
            address(tokenA),
            address(tokenB),
            100e18,
            block.timestamp - 1, // Past deadline
            keccak256("policy")
        );
    }
    
    function test_RevertWhenCreateIntentWithTooFarDeadline() public {
        vm.prank(user1);
        vm.expectRevert("deadline-too-far");
        pool.createIntent(
            address(tokenA),
            address(tokenB),
            100e18,
            block.timestamp + 2 hours, // Too far
            keccak256("policy")
        );
    }
    
    function test_RevertWhenExecuteWithUnauthorizedAdapter() public {
        // Create intent and contribute
        vm.prank(user1);
        bytes32 intentId = pool.createIntent(
            address(tokenA),
            address(tokenB),
            100e18,
            block.timestamp + 1 hours,
            keccak256("policy")
        );
        
        vm.prank(user1);
        pool.contribute(intentId, 100e18);
        
        // Try to execute with unauthorized adapter
        OneInchAdapter unauthorizedAdapter = new OneInchAdapter(makeAddr("unauthorized"));
        
        vm.expectRevert(StealthSwapPoolFinal.AdapterNotAllowed.selector);
        pool.execute(
            intentId,
            address(unauthorizedAdapter),
            "", // Empty calldata for test
            50e18 // expectedMinOut
        );
    }
    
    function test_RevertWhenExecuteExpiredIntent() public {
        // Create intent with valid deadline first
        vm.prank(user1);
        bytes32 intentId = pool.createIntent(
            address(tokenA),
            address(tokenB),
            100e18,
            block.timestamp + 1 hours, // Valid deadline
            keccak256("policy")
        );
        
        // Fast forward time to make it expired
        vm.warp(block.timestamp + 2 hours);
        
        vm.expectRevert(StealthSwapPoolFinal.IntentExpired.selector);
        pool.execute(
            intentId,
            address(adapter),
            "",
            50e18
        );
    }
    
    function test_RevertWhenExecuteNonExistentIntent() public {
        bytes32 fakeIntentId = keccak256("fake");
        
        vm.expectRevert(StealthSwapPoolFinal.IntentNotFound.selector);
        pool.execute(
            fakeIntentId,
            address(adapter),
            "",
            50e18
        );
    }
    
    // Note: test_RevertWhenExecuteAlreadyExecuted is skipped because it requires
    // a full execution flow which is complex to test without a working adapter
    
    function testGetParticipants() public {
        // Create intent
        vm.prank(user1);
        bytes32 intentId = pool.createIntent(
            address(tokenA),
            address(tokenB),
            200e18,
            block.timestamp + 1 hours,
            keccak256("policy")
        );
        
        // Both users contribute
        vm.prank(user1);
        pool.contribute(intentId, 100e18);
        
        vm.prank(user2);
        pool.contribute(intentId, 150e18);
        
        // Get participants
        address[] memory participants = pool.getParticipants(intentId);
        assertEq(participants.length, 2);
        assertEq(participants[0], user1);
        assertEq(participants[1], user2);
    }
    
    function testCleanupExpiredIntent() public {
        // Create intent with valid deadline first
        vm.prank(user1);
        bytes32 intentId = pool.createIntent(
            address(tokenA),
            address(tokenB),
            100e18,
            block.timestamp + 1 hours, // Valid deadline
            keccak256("policy")
        );
        
        // Fast forward time to make it expired enough for cleanup
        vm.warp(block.timestamp + 2 days);
        
        // Cleanup should work
        pool.cleanupExpiredIntent(intentId);
        
        // Intent should be deleted
        vm.expectRevert(StealthSwapPoolFinal.IntentNotFound.selector);
        pool.getIntent(intentId);
    }
}
