// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../contracts/OneInchAdapter.sol";
import "../contracts/StealthSwapPoolFinal.sol";
import "../contracts/StealthFactory.sol";
import "../contracts/StealthPaymaster.sol";
import "../contracts/MockERC20.sol";

contract DeployBaseSepolia is Script {
    // Base Sepolia Configuration
    address constant FHERC_ADDRESS = 0xD5afc45c69644CBd63f362D64B4198a7d81e53C7; // Your fhERC address
    address constant LOP_ADDRESS = 0x111111125421cA6dc452d289314280a0f8842A65; // 1inch LOP on Base Sepolia
    address constant ENTRY_POINT = 0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789; // Base Sepolia EntryPoint
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying contracts with the account:", deployer);
        console.log("Account balance:", deployer.balance);
        console.log("Block number:", block.number);
        console.log("Chain ID:", block.chainid);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // 1. Deploy OneInchAdapter (real 1inch LOP integration)
        console.log("\n=== Deploying OneInchAdapter ===");
        OneInchAdapter adapter = new OneInchAdapter(LOP_ADDRESS);
        console.log("OneInchAdapter deployed to:", address(adapter));
        
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
        
        // 5. Deploy test tokens for Base Sepolia
        console.log("\n=== Deploying Test Tokens ===");
        MockERC20 testTokenA = new MockERC20("Test Token A", "TESTA", 18);
        MockERC20 testTokenB = new MockERC20("Test Token B", "TESTB", 18);
        console.log("Test Token A deployed to:", address(testTokenA));
        console.log("Test Token B deployed to:", address(testTokenB));
        
        // 6. Configure contracts
        console.log("\n=== Configuring contracts ===");
        
        // Set adapter as allowed in pool
        stealthSwapPool.setAdapterAllowed(address(adapter), true);
        console.log("Adapter allowed in pool");
        
        // Set fhERC in pool
        stealthSwapPool.setFhERC(FHERC_ADDRESS);
        console.log("fhERC set in pool");
        
        // Set fhERC in paymaster
        stealthPaymaster.setFhERC(FHERC_ADDRESS);
        console.log("fhERC set in paymaster");
        
        // Mint test tokens to deployer
        testTokenA.mint(deployer, 1000000e18);
        testTokenB.mint(deployer, 1000000e18);
        console.log("Test tokens minted to deployer");
        
        // Note: OneInchAdapter doesn't need pre-deposited tokens
        // It will receive tokens during swap execution
        console.log("Adapter ready for real 1inch LOP integration");
        
        vm.stopBroadcast();
        
        // 7. Save deployment data
        console.log("\n=== Deployment Summary ===");
        console.log("Network: Base Sepolia Testnet");
        console.log("Chain ID: 84532");
        console.log("Deployer:", deployer);
        console.log("\nContract Addresses:");
        console.log("OneInchAdapter:", address(adapter));
        console.log("StealthSwapPoolFinal:", address(stealthSwapPool));
        console.log("StealthFactory:", address(stealthFactory));
        console.log("StealthPaymaster:", address(stealthPaymaster));
        console.log("Test Token A:", address(testTokenA));
        console.log("Test Token B:", address(testTokenB));
        console.log("fhERC (existing):", FHERC_ADDRESS);
        console.log("1inch LOP:", LOP_ADDRESS);
        
        // Save to file
        string memory deploymentData = string(abi.encodePacked(
            '{\n',
            '  "network": "base-sepolia-testnet",\n',
            '  "chainId": 84532,\n',
            '  "deployer": "', vm.toString(deployer), '",\n',
            '  "deploymentTimestamp": "', vm.toString(block.timestamp), '",\n',
            '  "contracts": {\n',
            '    "stealthSwapPool": "', vm.toString(address(stealthSwapPool)), '",\n',
            '    "oneInchAdapter": "', vm.toString(address(adapter)), '",\n',
            '    "stealthFactory": "', vm.toString(address(stealthFactory)), '",\n',
            '    "stealthPaymaster": "', vm.toString(address(stealthPaymaster)), '",\n',
            '    "testTokenA": "', vm.toString(address(testTokenA)), '",\n',
            '    "testTokenB": "', vm.toString(address(testTokenB)), '",\n',
            '    "fhERC": "', vm.toString(FHERC_ADDRESS), '",\n',
            '    "lopAddress": "', vm.toString(LOP_ADDRESS), '"\n',
            '  }\n',
            '}'
        ));
        
        vm.writeFile("./deployments/base-sepolia-deployment.json", deploymentData);
        console.log("\nDeployment data saved to: ./deployments/base-sepolia-deployment.json");
        console.log("Explorer: https://sepolia.basescan.org/address/", vm.toString(address(stealthSwapPool)));
        
        console.log("\nDeployment completed successfully!");
        console.log("\nNote: This deployment uses REAL 1inch LOP integration on Base Sepolia.");
        console.log("The system is now ready for testing with actual 1inch limit orders and eERC tokens!");
    }
}
