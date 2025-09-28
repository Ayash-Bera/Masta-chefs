// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "forge-std/console.sol";
import "../contracts/MockOneInchAdapter.sol";
import "../contracts/StealthSwapPoolFinal.sol";
import "../contracts/StealthFactory.sol";
import "../contracts/StealthPaymaster.sol";
import "../contracts/MockERC20.sol";

contract SepoliaIntegrationTest is Test {
    // Sepolia deployed addresses
    address constant FHERC_ADDRESS = 0xD5afc45c69644CBd63f362D64B4198a7d81e53C7;
    address constant ENTRY_POINT = 0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789;
    
    // Deployed contract addresses on Sepolia
    address constant STEALTH_SWAP_POOL = 0x0e4d945f84cbb445aB0a96974Ef01EbB63343f71;
    address constant MOCK_ADAPTER = 0x66cAbbc261AFb45C728CcCCC6e592935d3Ba83ef;
    address constant STEALTH_FACTORY = 0xeD539fD12EB44692A935fDA55e24C861639eD074;
    address payable constant STEALTH_PAYMASTER = payable(0x3168D014cD515c0b6E857618680A652E920eFBc7);
    address constant TEST_TOKEN_A = 0x18067cb5A4830feEdF7ACdD3dF8d0d084442D3fD;
    address constant TEST_TOKEN_B = 0x50989e0C3464C66ae48CF272e972aeeAB9eb05BB;
    
    // Test users
    address user1 = makeAddr("user1");
    address user2 = makeAddr("user2");
    address user3 = makeAddr("user3");
    
    // Contract instances
    StealthSwapPoolFinal pool;
    MockOneInchAdapter adapter;
    StealthFactory factory;
    StealthPaymaster paymaster;
    MockERC20 tokenA;
    MockERC20 tokenB;
    
    function setUp() public {
        // Initialize contract instances with deployed addresses
        pool = StealthSwapPoolFinal(STEALTH_SWAP_POOL);
        adapter = MockOneInchAdapter(MOCK_ADAPTER);
        factory = StealthFactory(STEALTH_FACTORY);
        paymaster = StealthPaymaster(STEALTH_PAYMASTER);
        tokenA = MockERC20(TEST_TOKEN_A);
        tokenB = MockERC20(TEST_TOKEN_B);
        
        // Fund test users with ETH
        vm.deal(user1, 10 ether);
        vm.deal(user2, 10 ether);
        vm.deal(user3, 10 ether);
        
        // Fund test users with tokens
        // First mint tokens to this contract, then transfer to users
        vm.startPrank(address(this));
        tokenA.mint(address(this), 10000e18);
        tokenB.mint(address(this), 10000e18);
        tokenA.transfer(user1, 1000e18);
        tokenA.transfer(user2, 1000e18);
        tokenA.transfer(user3, 1000e18);
        tokenB.transfer(user1, 1000e18);
        tokenB.transfer(user2, 1000e18);
        tokenB.transfer(user3, 1000e18);
        vm.stopPrank();
    }
    
    function testMockAdapterFunctionality() public {
        console.log("=== Testing MockOneInchAdapter ===");
        
        // Check initial balances
        uint256 user1BalanceA = tokenA.balanceOf(user1);
        uint256 user1BalanceB = tokenB.balanceOf(user1);
        console.log("User1 TokenA balance before:", user1BalanceA);
        console.log("User1 TokenB balance before:", user1BalanceB);
        
        // User1 approves adapter to spend tokens
        vm.startPrank(user1);
        tokenA.approve(address(adapter), 100e18);
        vm.stopPrank();
        
        // Perform swap: 100 TokenA -> TokenB
        vm.startPrank(user1);
        uint256 amountOut = adapter.swapViaLOP(
            address(tokenA),
            address(tokenB),
            100e18, // amountIn
            90e18,  // minAmountOut (10% slippage)
            ""      // empty calldata
        );
        vm.stopPrank();
        
        console.log("Amount out from swap:", amountOut);
        
        // Check final balances
        uint256 user1BalanceAAfter = tokenA.balanceOf(user1);
        uint256 user1BalanceBAfter = tokenB.balanceOf(user1);
        console.log("User1 TokenA balance after:", user1BalanceAAfter);
        console.log("User1 TokenB balance after:", user1BalanceBAfter);
        
        // Verify swap worked (1:1 ratio in mock)
        assertEq(user1BalanceAAfter, user1BalanceA - 100e18, "TokenA should be reduced by 100");
        assertEq(user1BalanceBAfter, user1BalanceB + 100e18, "TokenB should be increased by 100");
        assertEq(amountOut, 100e18, "Amount out should be 100e18");
    }
    
    function testStealthSwapPoolIntegration() public {
        console.log("=== Testing StealthSwapPool Integration ===");
        
        // Check pool configuration
        // Note: adapterAllowed is internal, so we'll test it indirectly through execution
        assertEq(address(pool.fhERC()), FHERC_ADDRESS, "fhERC should be set");
        
        // Create a swap intent
        vm.startPrank(user1);
        bytes32 intentId = pool.createIntent(
            address(tokenA),
            address(tokenB),
            100e18, // minOut
            block.timestamp + 3600, // deadline (1 hour)
            keccak256("test-policy") // policy
        );
        vm.stopPrank();
        
        console.log("Created intent with ID:", vm.toString(intentId));
        
        // Get intent details
        IStealthSwapPool.SwapIntent memory intent = pool.getIntent(intentId);
        
        assertEq(intent.tokenIn, address(tokenA), "TokenIn should be TokenA");
        assertEq(intent.tokenOut, address(tokenB), "TokenOut should be TokenB");
        assertEq(intent.minOut, 100e18, "MinOut should be 100e18");
        assertEq(intent.policy, keccak256("test-policy"), "Policy should match");
        assertEq(intent.total, 0, "Total should be 0 initially");
        
        console.log("Intent details verified");
        
        // User1 contributes to the intent
        vm.startPrank(user1);
        tokenA.approve(address(pool), 50e18);
        pool.contribute(intentId, 50e18);
        vm.stopPrank();
        
        // Check contribution
        uint256 user1Contribution = pool.contributedOf(intentId, user1);
        assertEq(user1Contribution, 50e18, "User1 contribution should be 50e18");
        
        // User2 contributes to the same intent
        vm.startPrank(user2);
        tokenA.approve(address(pool), 50e18);
        pool.contribute(intentId, 50e18);
        vm.stopPrank();
        
        // Check total contributions
        intent = pool.getIntent(intentId);
        assertEq(intent.total, 100e18, "Total contributions should be 100e18");
        
        console.log("Contributions verified");
        
        // Execute the swap
        vm.startPrank(user1);
        uint256 swapAmountOut = pool.execute(
            intentId,
            address(adapter),
            "", // empty calldata for mock
            90e18 // expectedMinOut
        );
        vm.stopPrank();
        
        console.log("Swap executed, amount out:", swapAmountOut);
        assertEq(swapAmountOut, 100e18, "Swap should return 100e18 tokens");
    }
    
    function testStealthFactory() public {
        console.log("=== Testing StealthFactory ===");
        
        bytes32 salt = keccak256("test-stealth-account");
        
        // Predict stealth address
        address predictedAddress = factory.predictStealth(user1, salt);
        console.log("Predicted stealth address:", predictedAddress);
        
        // Create stealth account
        vm.startPrank(user1);
        address stealthAddress = factory.createStealth(user1, salt);
        vm.stopPrank();
        
        console.log("Created stealth address:", stealthAddress);
        assertEq(stealthAddress, predictedAddress, "Addresses should match");
    }
    
    function testStealthPaymaster() public {
        console.log("=== Testing StealthPaymaster ===");
        
        // Check initial balance
        uint256 initialBalance = paymaster.getDepositBalance(user1, address(tokenA));
        console.log("Initial gas token balance:", initialBalance);
        
        // User1 deposits gas tokens
        vm.startPrank(user1);
        tokenA.approve(address(paymaster), 100e18);
        paymaster.depositForGas(address(tokenA), 100e18);
        vm.stopPrank();
        
        // Check balance after deposit
        uint256 balanceAfterDeposit = paymaster.getDepositBalance(user1, address(tokenA));
        assertEq(balanceAfterDeposit, 100e18, "Balance should be 100e18");
        
        console.log("Gas token deposit verified");
        
        // User1 withdraws some gas tokens
        vm.startPrank(user1);
        paymaster.withdrawDeposit(address(tokenA), 50e18);
        vm.stopPrank();
        
        // Check balance after withdrawal
        uint256 balanceAfterWithdrawal = paymaster.getDepositBalance(user1, address(tokenA));
        assertEq(balanceAfterWithdrawal, 50e18, "Balance should be 50e18");
        
        console.log("Gas token withdrawal verified");
    }
    
    function testFullStealthSwapFlow() public {
        console.log("=== Testing Full Stealth Swap Flow ===");
        
        // 1. Create intent
        vm.startPrank(user1);
        bytes32 intentId = pool.createIntent(
            address(tokenA),
            address(tokenB),
            200e18, // minOut
            block.timestamp + 3600, // deadline
            keccak256("full-test-policy")
        );
        vm.stopPrank();
        
        // 2. Multiple users contribute
        vm.startPrank(user1);
        tokenA.approve(address(pool), 100e18);
        pool.contribute(intentId, 100e18);
        vm.stopPrank();
        
        vm.startPrank(user2);
        tokenA.approve(address(pool), 75e18);
        pool.contribute(intentId, 75e18);
        vm.stopPrank();
        
        vm.startPrank(user3);
        tokenA.approve(address(pool), 25e18);
        pool.contribute(intentId, 25e18);
        vm.stopPrank();
        
        // 3. Verify total contributions
        IStealthSwapPool.SwapIntent memory intent = pool.getIntent(intentId);
        assertEq(intent.total, 200e18, "Total should be 200e18");
        
        // 4. Execute swap
        vm.startPrank(user1);
        uint256 amountOut = pool.execute(
            intentId,
            address(adapter),
            "",
            180e18 // 10% slippage
        );
        vm.stopPrank();
        
        // 5. Verify execution
        assertEq(amountOut, 200e18, "Amount out should be 200e18");
        
        console.log("Full stealth swap flow completed successfully!");
        console.log("Total amount swapped:", amountOut);
    }
    
    function testErrorHandling() public {
        console.log("=== Testing Error Handling ===");
        
        // Test expired intent
        vm.startPrank(user1);
        bytes32 expiredIntentId = pool.createIntent(
            address(tokenA),
            address(tokenB),
            100e18,
            block.timestamp - 1, // Past deadline
            keccak256("expired-policy")
        );
        vm.stopPrank();
        
        // Try to contribute to expired intent
        vm.startPrank(user1);
        tokenA.approve(address(pool), 50e18);
        vm.expectRevert();
        pool.contribute(expiredIntentId, 50e18);
        vm.stopPrank();
        
        console.log("Expired intent handling verified");
        
        // Test insufficient balance
        vm.startPrank(user1);
        vm.expectRevert();
        pool.contribute(expiredIntentId, 1000e18); // More than user has
        vm.stopPrank();
        
        console.log("Insufficient balance handling verified");
    }
}
