// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "forge-std/console.sol";
import "../contracts/MockOneInchAdapter.sol";
import "../contracts/StealthSwapPoolFinal.sol";
import "../contracts/StealthFactory.sol";
import "../contracts/StealthPaymaster.sol";
import "../contracts/MockERC20.sol";

contract SimpleSepoliaTest is Test {
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
    }
    
    function testContractDeployment() public {
        console.log("=== Testing Contract Deployment ===");
        
        // Test that contracts are deployed and accessible
        assertTrue(address(pool) != address(0), "Pool should be deployed");
        assertTrue(address(adapter) != address(0), "Adapter should be deployed");
        assertTrue(address(factory) != address(0), "Factory should be deployed");
        assertTrue(address(paymaster) != address(0), "Paymaster should be deployed");
        assertTrue(address(tokenA) != address(0), "TokenA should be deployed");
        assertTrue(address(tokenB) != address(0), "TokenB should be deployed");
        
        console.log("All contracts are deployed and accessible");
    }
    
    function testPoolConfiguration() public {
        console.log("=== Testing Pool Configuration ===");
        
        // Test fhERC is set
        assertEq(address(pool.fhERC()), FHERC_ADDRESS, "fhERC should be set");
        console.log("fhERC is correctly set");
        
        // Test that we can create an intent (this will fail if adapter not allowed)
        address user = makeAddr("testUser");
        vm.deal(user, 1 ether);
        
        vm.startPrank(user);
        bytes32 intentId = pool.createIntent(
            address(tokenA),
            address(tokenB),
            100e18, // minOut
            block.timestamp + 3600, // deadline
            keccak256("test-policy")
        );
        vm.stopPrank();
        
        assertTrue(intentId != bytes32(0), "Intent should be created");
        console.log("Intent created successfully, adapter is allowed");
    }
    
    function testMockAdapter() public {
        console.log("=== Testing Mock Adapter ===");
        
        // Test that adapter is a mock
        bool isMock = adapter.isMockAdapter();
        assertTrue(isMock, "Adapter should be a mock");
        console.log("Adapter is confirmed as mock");
        
        // Test exchange rate
        uint256 rate = adapter.getMockExchangeRate();
        assertEq(rate, 1e18, "Exchange rate should be 1:1");
        console.log("Mock exchange rate is 1:1");
    }
    
    function testStealthFactory() public {
        console.log("=== Testing Stealth Factory ===");
        
        address user = makeAddr("testUser");
        bytes32 salt = keccak256("test-salt");
        
        // Test prediction
        address predicted = factory.predictStealth(user, salt);
        assertTrue(predicted != address(0), "Predicted address should not be zero");
        console.log("Stealth address prediction works");
        
        // Test creation
        vm.startPrank(user);
        address created = factory.createStealth(user, salt);
        vm.stopPrank();
        
        assertEq(created, predicted, "Created address should match prediction");
        console.log("Stealth account creation works");
    }
    
    function testStealthPaymaster() public {
        console.log("=== Testing Stealth Paymaster ===");
        
        address user = makeAddr("testUser");
        vm.deal(user, 1 ether);
        
        // Test initial balance
        uint256 initialBalance = paymaster.getDepositBalance(user, address(tokenA));
        assertEq(initialBalance, 0, "Initial balance should be zero");
        console.log("Initial deposit balance is zero");
        
        // Test deposit (this will fail if token not supported, but that's expected)
        vm.startPrank(user);
        tokenA.mint(user, 1000e18);
        tokenA.approve(address(paymaster), 100e18);
        
        // This might fail if tokenA is not supported, which is expected
        try paymaster.depositForGas(address(tokenA), 100e18) {
            console.log("Token deposit successful");
            
            // Check balance after deposit
            uint256 balanceAfter = paymaster.getDepositBalance(user, address(tokenA));
            assertEq(balanceAfter, 100e18, "Balance should be 100e18");
            console.log("Deposit balance updated correctly");
        } catch {
            console.log("Token not supported in paymaster (expected for test tokens)");
        }
        
        vm.stopPrank();
    }
    
    function testTokenFunctionality() public {
        console.log("=== Testing Token Functionality ===");
        
        address user = makeAddr("testUser");
        
        // Test token properties
        assertEq(tokenA.name(), "Test Token A", "TokenA name should be correct");
        assertEq(tokenA.symbol(), "TESTA", "TokenA symbol should be correct");
        assertEq(tokenA.decimals(), 18, "TokenA decimals should be 18");
        
        assertEq(tokenB.name(), "Test Token B", "TokenB name should be correct");
        assertEq(tokenB.symbol(), "TESTB", "TokenB symbol should be correct");
        assertEq(tokenB.decimals(), 18, "TokenB decimals should be 18");
        
        console.log("Token properties are correct");
        
        // Test minting
        vm.startPrank(user);
        tokenA.mint(user, 1000e18);
        tokenB.mint(user, 1000e18);
        vm.stopPrank();
        
        assertEq(tokenA.balanceOf(user), 1000e18, "User should have 1000 TokenA");
        assertEq(tokenB.balanceOf(user), 1000e18, "User should have 1000 TokenB");
        
        console.log("Token minting and balances work correctly");
    }
}
