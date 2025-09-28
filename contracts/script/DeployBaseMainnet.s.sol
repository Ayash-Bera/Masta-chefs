// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../contracts/OneInchAdapter.sol";
import "../contracts/StealthSwapPoolFinal.sol";
import "../contracts/StealthFactory.sol";
import "../contracts/StealthPaymaster.sol";

contract DeployBaseMainnet is Script {
    // Base Mainnet Configuration
    address constant FHERC_ADDRESS = 0xD5afc45c69644CBd63f362D64B4198a7d81e53C7;
    address constant LOP_ADDRESS = 0x111111125421cA6dc452d289314280a0f8842A65;
    address constant ENTRY_POINT = 0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789; // Base mainnet EntryPoint
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying contracts with the account:", deployer);
        console.log("Account balance:", deployer.balance);
        console.log("Block number:", block.number);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // 1. Deploy OneInchAdapter
        console.log("\n=== Deploying OneInchAdapter ===");
        OneInchAdapter oneInchAdapter = new OneInchAdapter(LOP_ADDRESS);
        console.log("OneInchAdapter deployed to:", address(oneInchAdapter));
        
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
        
        // 5. Configure contracts
        console.log("\n=== Configuring contracts ===");
        
        // Set adapter as allowed in pool
        stealthSwapPool.setAdapterAllowed(address(oneInchAdapter), true);
        console.log("Adapter allowed in pool");
        
        // Set fhERC in pool
        stealthSwapPool.setFhERC(FHERC_ADDRESS);
        console.log("fhERC set in pool");
        
        vm.stopBroadcast();
        
        // 6. Save deployment data
        console.log("\n=== Deployment Summary ===");
        console.log("Network: Base Mainnet");
        console.log("Chain ID: 8453");
        console.log("Deployer:", deployer);
        console.log("\nContract Addresses:");
        console.log("OneInchAdapter:", address(oneInchAdapter));
        console.log("StealthSwapPoolFinal:", address(stealthSwapPool));
        console.log("StealthFactory:", address(stealthFactory));
        console.log("StealthPaymaster:", address(stealthPaymaster));
        console.log("fhERC (existing):", FHERC_ADDRESS);
        console.log("LOP Address:", LOP_ADDRESS);
        
        // Save to file
        string memory deploymentData = string(abi.encodePacked(
            '{\n',
            '  "network": "base-mainnet",\n',
            '  "chainId": 8453,\n',
            '  "deployer": "', vm.toString(deployer), '",\n',
            '  "deploymentTimestamp": "', vm.toString(block.timestamp), '",\n',
            '  "contracts": {\n',
            '    "stealthSwapPool": "', vm.toString(address(stealthSwapPool)), '",\n',
            '    "oneInchAdapter": "', vm.toString(address(oneInchAdapter)), '",\n',
            '    "stealthFactory": "', vm.toString(address(stealthFactory)), '",\n',
            '    "stealthPaymaster": "', vm.toString(address(stealthPaymaster)), '",\n',
            '    "fhERC": "', vm.toString(FHERC_ADDRESS), '",\n',
            '    "lop": "', vm.toString(LOP_ADDRESS), '"\n',
            '  }\n',
            '}'
        ));
        
        vm.writeFile("./deployments/base-mainnet-deployment.json", deploymentData);
        console.log("\nDeployment data saved to: ./deployments/base-mainnet-deployment.json");
        console.log("Explorer: https://basescan.org/address/", vm.toString(address(stealthSwapPool)));
        
        console.log("\nDeployment completed successfully!");
    }
}
