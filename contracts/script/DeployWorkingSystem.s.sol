// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../contracts/MockERC20.sol";
import "../contracts/StealthSwapPoolFinal.sol";
import "../contracts/OneInchAdapter.sol";
import "../contracts/StealthFactory.sol";
import "../contracts/StealthPaymaster.sol";

contract DeployWorkingSystem is Script {
    // Base Sepolia addresses
    address constant LOP_ADDRESS = 0x111111125421cA6dc452d289314280a0f8842A65;
    address constant FHERC_ADDRESS = 0xD5afc45c69644CBd63f362D64B4198a7d81e53C7;
    address constant ENTRY_POINT = 0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789;
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        console.log("Deploying from:", deployer);
        console.log("Deployer balance:", deployer.balance);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy test tokens
        MockERC20 tokenA = new MockERC20("Test Token A", "TESTA", 18);
        MockERC20 tokenB = new MockERC20("Test Token B", "TESTB", 18);
        
        console.log("TESTA deployed at:", address(tokenA));
        console.log("TESTB deployed at:", address(tokenB));
        
        // Deploy OneInch Adapter
        OneInchAdapter adapter = new OneInchAdapter(LOP_ADDRESS);
        console.log("OneInch Adapter deployed at:", address(adapter));
        
        // Deploy Stealth Swap Pool
        StealthSwapPoolFinal pool = new StealthSwapPoolFinal();
        console.log("Stealth Swap Pool deployed at:", address(pool));
        
        // Deploy Stealth Factory
        StealthFactory factory = new StealthFactory();
        console.log("Stealth Factory deployed at:", address(factory));
        
        // Deploy Stealth Paymaster
        StealthPaymaster paymaster = new StealthPaymaster(IEntryPoint(ENTRY_POINT));
        console.log("Stealth Paymaster deployed at:", address(paymaster));
        
        // Configure the system
        pool.setAdapterAllowed(address(adapter), true);
        pool.setFhERC(FHERC_ADDRESS);
        paymaster.setFhERC(FHERC_ADDRESS);
        
        console.log("System configured successfully");
        
        // Mint tokens to deployer
        tokenA.mint(deployer, 1000000 * 10**18);
        tokenB.mint(deployer, 1000000 * 10**18);
        
        console.log("Tokens minted to deployer");
        console.log("TESTA balance:", tokenA.balanceOf(deployer));
        console.log("TESTB balance:", tokenB.balanceOf(deployer));
        
        vm.stopBroadcast();
        
        // Save deployment data
        string memory deploymentData = string(abi.encodePacked(
            '{\n',
            '  "network": "base-sepolia-testnet",\n',
            '  "chainId": 84532,\n',
            '  "deployer": "', vm.toString(deployer), '",\n',
            '  "deploymentTimestamp": "', vm.toString(block.timestamp), '",\n',
            '  "contracts": {\n',
            '    "testTokenA": "', vm.toString(address(tokenA)), '",\n',
            '    "testTokenB": "', vm.toString(address(tokenB)), '",\n',
            '    "oneInchAdapter": "', vm.toString(address(adapter)), '",\n',
            '    "stealthSwapPool": "', vm.toString(address(pool)), '",\n',
            '    "stealthFactory": "', vm.toString(address(factory)), '",\n',
            '    "stealthPaymaster": "', vm.toString(address(paymaster)), '",\n',
            '    "fhERC": "', vm.toString(FHERC_ADDRESS), '",\n',
            '    "lopAddress": "', vm.toString(LOP_ADDRESS), '"\n',
            '  }\n',
            '}'
        ));
        
        vm.writeFile("deployments/working-base-sepolia-deployment.json", deploymentData);
        console.log("Deployment data saved to deployments/working-base-sepolia-deployment.json");
    }
}
