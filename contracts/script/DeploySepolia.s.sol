// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../contracts/MockOneInchAdapter.sol";
import "../contracts/StealthSwapPoolFinal.sol";
import "../contracts/StealthFactory.sol";
import "../contracts/StealthPaymaster.sol";
import "../contracts/MockERC20.sol";

contract DeploySepolia is Script {
    // Sepolia Testnet Configuration
    address constant FHERC_ADDRESS = 0xD5afc45c69644CBd63f362D64B4198a7d81e53C7; // Your fhERC address
    address constant ENTRY_POINT = 0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789; // Sepolia EntryPoint
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying contracts with the account:", deployer);
        console.log("Account balance:", deployer.balance);
        console.log("Block number:", block.number);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // 1. Deploy MockOneInchAdapter (since 1inch LOP doesn't exist on Sepolia)
        console.log("\n=== Deploying MockOneInchAdapter ===");
        MockOneInchAdapter mockAdapter = new MockOneInchAdapter();
        console.log("MockOneInchAdapter deployed to:", address(mockAdapter));
        
        // 2. Deploy StealthSwapPoolFinal
        console.log("\n=== Deploying StealthSwapPoolFinal ===");
        StealthSwapPoolFinal stealthSwapPool = new StealthSwapPoolFinal();
        console.log("StealthSwapPoolFinal deployed to:", address(stealthSwapPool));
        
        // 3. Deploy StealthFactory
        console.log("\n=== Deploying StealthFactory ===");
        StealthFactory stealthFactory = new StealthFactory();
        console.log("StealthFactory deployed to:", address(stealthFactory));
        
        // 4. Deploy StealthPaymaster
        console.log("\n=== Deploying StealthPaymaster ===");
        StealthPaymaster stealthPaymaster = new StealthPaymaster(IEntryPoint(ENTRY_POINT));
        console.log("StealthPaymaster deployed to:", address(stealthPaymaster));
        
        // 5. Deploy test tokens for Sepolia
        console.log("\n=== Deploying Test Tokens ===");
        MockERC20 testTokenA = new MockERC20("Test Token A", "TESTA", 18);
        MockERC20 testTokenB = new MockERC20("Test Token B", "TESTB", 18);
        console.log("Test Token A deployed to:", address(testTokenA));
        console.log("Test Token B deployed to:", address(testTokenB));
        
        // 6. Configure contracts
        console.log("\n=== Configuring contracts ===");
        
        // Set mock adapter as allowed in pool
        stealthSwapPool.setAdapterAllowed(address(mockAdapter), true);
        console.log("Mock adapter allowed in pool");
        
        // Set fhERC in pool
        stealthSwapPool.setFhERC(FHERC_ADDRESS);
        console.log("fhERC set in pool");
        
        // Mint test tokens to deployer
        testTokenA.mint(deployer, 1000000e18);
        testTokenB.mint(deployer, 1000000e18);
        console.log("Test tokens minted to deployer");
        
        // Deposit some test tokens to mock adapter for testing
        testTokenA.approve(address(mockAdapter), 100000e18);
        testTokenB.approve(address(mockAdapter), 100000e18);
        mockAdapter.depositTokens(address(testTokenA), 100000e18);
        mockAdapter.depositTokens(address(testTokenB), 100000e18);
        console.log("Test tokens deposited to mock adapter");
        
        vm.stopBroadcast();
        
        // 7. Save deployment data
        console.log("\n=== Deployment Summary ===");
        console.log("Network: Ethereum Sepolia Testnet");
        console.log("Chain ID: 11155111");
        console.log("Deployer:", deployer);
        console.log("\nContract Addresses:");
        console.log("MockOneInchAdapter:", address(mockAdapter));
        console.log("StealthSwapPoolFinal:", address(stealthSwapPool));
        console.log("StealthFactory:", address(stealthFactory));
        console.log("StealthPaymaster:", address(stealthPaymaster));
        console.log("Test Token A:", address(testTokenA));
        console.log("Test Token B:", address(testTokenB));
        console.log("fhERC (existing):", FHERC_ADDRESS);
        
        // Save to file
        string memory deploymentData = string(abi.encodePacked(
            '{\n',
            '  "network": "sepolia-testnet",\n',
            '  "chainId": 11155111,\n',
            '  "deployer": "', vm.toString(deployer), '",\n',
            '  "deploymentTimestamp": "', vm.toString(block.timestamp), '",\n',
            '  "contracts": {\n',
            '    "stealthSwapPool": "', vm.toString(address(stealthSwapPool)), '",\n',
            '    "mockOneInchAdapter": "', vm.toString(address(mockAdapter)), '",\n',
            '    "stealthFactory": "', vm.toString(address(stealthFactory)), '",\n',
            '    "stealthPaymaster": "', vm.toString(address(stealthPaymaster)), '",\n',
            '    "testTokenA": "', vm.toString(address(testTokenA)), '",\n',
            '    "testTokenB": "', vm.toString(address(testTokenB)), '",\n',
            '    "fhERC": "', vm.toString(FHERC_ADDRESS), '"\n',
            '  }\n',
            '}'
        ));
        
        vm.writeFile("./deployments/sepolia-testnet-deployment.json", deploymentData);
        console.log("\nDeployment data saved to: ./deployments/sepolia-testnet-deployment.json");
        console.log("Explorer: https://sepolia.etherscan.io/address/", vm.toString(address(stealthSwapPool)));
        
        console.log("\nDeployment completed successfully!");
        console.log("\nNote: This deployment uses MockOneInchAdapter since 1inch LOP is not available on Sepolia testnet.");
        console.log("The mock adapter simulates 1:1 token swaps for testing purposes.");
    }
}
