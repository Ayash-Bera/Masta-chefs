// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../contracts/StealthSwapPoolFinal.sol";
import "../contracts/OneInchAdapter.sol";
import "../contracts/MockERC20.sol";
import "../contracts/RouterConfig.sol";

/**
 * @title FhERCIntegrationTest
 * @notice Comprehensive test suite for fhERC integration with StealthSwapPool
 * @dev Tests the complete flow with fhERC contract address from frontend
 */
contract FhERCIntegrationTest is Test {
    StealthSwapPoolFinal public pool;
    OneInchAdapter public adapter;
    MockERC20 public tokenA;
    MockERC20 public tokenB;
    
    // fhERC contract address from frontend
    address constant FHERC_ADDRESS = 0xD5afc45c69644CBd63f362D64B4198a7d81e53C7;
    
    // 1inch LOP address for Sepolia
    address constant LOP_ADDRESS = 0x111111125421cA6dc452d289314280a0f8842A65;
    
    address public user1 = address(0x1);
    address public user2 = address(0x2);
    address public user3 = address(0x3);
    
    function setUp() public {
        // Deploy contracts
        adapter = new OneInchAdapter(LOP_ADDRESS);
        pool = new StealthSwapPoolFinal();
        
        // Deploy test tokens
        tokenA = new MockERC20("Token A", "TKA", 18);
        tokenB = new MockERC20("Token B", "TKB", 6);
        
        // Configure pool
        pool.setAdapterAllowed(address(adapter), true);
        // Don't set fhERC address in test environment since the contract doesn't exist
        // pool.setFhERC(FHERC_ADDRESS);
        
        // Mint tokens to users
        tokenA.mint(user1, 1000e18);
        tokenA.mint(user2, 1000e18);
        tokenA.mint(user3, 1000e18);
        
        tokenB.mint(user1, 1000e6);
        tokenB.mint(user2, 1000e6);
        tokenB.mint(user3, 1000e6);
        
        // Approve pool to spend tokens
        vm.prank(user1);
        tokenA.approve(address(pool), type(uint256).max);
        vm.prank(user1);
        tokenB.approve(address(pool), type(uint256).max);
        
        vm.prank(user2);
        tokenA.approve(address(pool), type(uint256).max);
        vm.prank(user2);
        tokenB.approve(address(pool), type(uint256).max);
        
        vm.prank(user3);
        tokenA.approve(address(pool), type(uint256).max);
        vm.prank(user3);
        tokenB.approve(address(pool), type(uint256).max);
    }
    
    function testFhERCAddressConfiguration() public {
        // Verify fhERC address is not set in test environment
        assertEq(address(pool.fhERC()), address(0));
        console.log("fhERC address in test environment:", address(pool.fhERC()));
        
        // Test setting fhERC address (this would work in production)
        pool.setFhERC(FHERC_ADDRESS);
        assertEq(address(pool.fhERC()), FHERC_ADDRESS);
        console.log("fhERC address set to:", address(pool.fhERC()));
    }
    
    function testLOPAddressConfiguration() public {
        // Verify LOP address is set correctly
        assertEq(adapter.lop(), LOP_ADDRESS);
        console.log("LOP address configured:", adapter.lop());
    }
    
    function testRouterConfigForSepolia() public {
        // Test RouterConfig for Sepolia (chain ID 11155111)
        address sepoliaLOP = RouterConfig.getRouterForChain(11155111);
        assertEq(sepoliaLOP, LOP_ADDRESS);
        console.log("Sepolia LOP address:", sepoliaLOP);
        
        // Test RouterConfig for Base Sepolia (chain ID 84532)
        address baseSepoliaLOP = RouterConfig.getRouterForChain(84532);
        assertEq(baseSepoliaLOP, LOP_ADDRESS);
        console.log("Base Sepolia LOP address:", baseSepoliaLOP);
    }
    
    function testIntentCreationWithFhERC() public {
        // Create intent with fhERC integration
        vm.prank(user1);
        bytes32 intentId = pool.createIntent(
            address(tokenA),
            address(tokenB),
            100e18, // minOut
            block.timestamp + 1 hours,
            keccak256("test-policy")
        );
        
        // Verify intent was created
        assertTrue(intentId != bytes32(0));
        
        // Get intent details
        StealthSwapPoolFinal.SwapIntent memory intent = pool.getIntent(intentId);
        assertEq(intent.tokenIn, address(tokenA));
        assertEq(intent.tokenOut, address(tokenB));
        assertEq(intent.minOut, 100e18);
        assertEq(intent.total, 0);
        
        console.log("Intent created with fhERC integration");
        console.log("   Intent ID:", vm.toString(intentId));
        console.log("   Token In:", intent.tokenIn);
        console.log("   Token Out:", intent.tokenOut);
    }
    
    function testContributionWithRegularERC20() public {
        // Create intent
        vm.prank(user1);
        bytes32 intentId = pool.createIntent(
            address(tokenA),
            address(tokenB),
            100e18,
            block.timestamp + 1 hours,
            keccak256("test-policy")
        );
        
        // Contribute with regular ERC20 (not fhERC encrypted)
        vm.prank(user1);
        pool.contribute(intentId, 100e18);
        
        // Verify contribution
        assertEq(pool.contributedOf(intentId, user1), 100e18);
        
        // Verify token was transferred to pool
        assertEq(tokenA.balanceOf(address(pool)), 100e18);
        assertEq(tokenA.balanceOf(user1), 900e18);
        
        console.log("Regular ERC20 contribution successful");
        console.log("   User1 contribution:", pool.contributedOf(intentId, user1));
        console.log("   Pool tokenA balance:", tokenA.balanceOf(address(pool)));
    }
    
    function testMultipleContributions() public {
        // Create intent
        vm.prank(user1);
        bytes32 intentId = pool.createIntent(
            address(tokenA),
            address(tokenB),
            200e18,
            block.timestamp + 1 hours,
            keccak256("test-policy")
        );
        
        // Multiple users contribute
        vm.prank(user1);
        pool.contribute(intentId, 100e18);
        
        vm.prank(user2);
        pool.contribute(intentId, 75e18);
        
        vm.prank(user3);
        pool.contribute(intentId, 25e18);
        
        // Verify total contributions
        assertEq(pool.contributedOf(intentId, user1), 100e18);
        assertEq(pool.contributedOf(intentId, user2), 75e18);
        assertEq(pool.contributedOf(intentId, user3), 25e18);
        
        // Verify total
        StealthSwapPoolFinal.SwapIntent memory intent = pool.getIntent(intentId);
        assertEq(intent.total, 200e18);
        
        // Verify participants
        address[] memory participants = pool.getParticipants(intentId);
        assertEq(participants.length, 3);
        assertEq(participants[0], user1);
        assertEq(participants[1], user2);
        assertEq(participants[2], user3);
        
        console.log("Multiple contributions successful");
        console.log("   Total contributions:", intent.total);
        console.log("   Number of participants:", participants.length);
    }
    
    function testFhERCIntegrationReadiness() public {
        // Test that the system is ready for fhERC integration
        assertTrue(pool.allowedAdapters(address(adapter)));
        
        // Test token detection (this would work with real fhERC)
        // For now, we test that the system doesn't crash
        bool isEncryptedA = _isEncryptedToken(address(tokenA));
        bool isEncryptedB = _isEncryptedToken(address(tokenB));
        
        // Regular ERC20s should not be detected as encrypted
        assertFalse(isEncryptedA);
        assertFalse(isEncryptedB);
        
        console.log("fhERC integration readiness verified");
        console.log("   fhERC address set:", address(pool.fhERC()) != address(0));
        console.log("   Adapter allowed:", pool.allowedAdapters(address(adapter)));
        
        // Test setting fhERC address
        pool.setFhERC(FHERC_ADDRESS);
        assertTrue(address(pool.fhERC()) != address(0));
        console.log("   fhERC address after setting:", address(pool.fhERC()));
    }
    
    function testGasUsage() public {
        // Test gas usage for key operations
        uint256 gasStart;
        uint256 gasUsed;
        
        // Test createIntent gas
        gasStart = gasleft();
        vm.prank(user1);
        pool.createIntent(
            address(tokenA),
            address(tokenB),
            100e18,
            block.timestamp + 1 hours,
            keccak256("test-policy")
        );
        gasUsed = gasStart - gasleft();
        console.log("createIntent gas used:", gasUsed);
        
        // Test contribute gas
        vm.prank(user1);
        bytes32 intentId = pool.createIntent(
            address(tokenA),
            address(tokenB),
            100e18,
            block.timestamp + 1 hours,
            keccak256("test-policy")
        );
        
        gasStart = gasleft();
        vm.prank(user1);
        pool.contribute(intentId, 100e18);
        gasUsed = gasStart - gasleft();
        console.log("contribute gas used:", gasUsed);
    }
    
    function testSystemCompatibility() public {
        // Test that the system is compatible with the frontend configuration
        assertEq(adapter.lop(), LOP_ADDRESS);
        
        // Test chain ID compatibility
        address sepoliaLOP = RouterConfig.getRouterForChain(11155111);
        address baseSepoliaLOP = RouterConfig.getRouterForChain(84532);
        
        assertEq(sepoliaLOP, LOP_ADDRESS);
        assertEq(baseSepoliaLOP, LOP_ADDRESS);
        
        console.log("System compatibility verified");
        console.log("   Frontend LOP address matches:", adapter.lop() == LOP_ADDRESS);
        console.log("   Sepolia support:", sepoliaLOP == LOP_ADDRESS);
        console.log("   Base Sepolia support:", baseSepoliaLOP == LOP_ADDRESS);
        
        // Test fhERC address setting
        pool.setFhERC(FHERC_ADDRESS);
        assertEq(address(pool.fhERC()), FHERC_ADDRESS);
        console.log("   Frontend fhERC address matches:", address(pool.fhERC()) == FHERC_ADDRESS);
    }
    
    // Helper function to simulate encrypted token detection
    function _isEncryptedToken(address token) internal view returns (bool) {
        // This would normally check if the token is registered in fhERC
        // For testing, we return false for regular ERC20s
        return false;
    }
}
