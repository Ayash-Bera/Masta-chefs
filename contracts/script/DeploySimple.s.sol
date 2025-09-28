// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../contracts/MockERC20.sol";

contract DeploySimple is Script {
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
        
        // Mint tokens to deployer
        tokenA.mint(deployer, 1000000 * 10**18);
        tokenB.mint(deployer, 1000000 * 10**18);
        
        console.log("Tokens minted to deployer");
        console.log("TESTA balance:", tokenA.balanceOf(deployer));
        console.log("TESTB balance:", tokenB.balanceOf(deployer));
        
        vm.stopBroadcast();
        
        console.log("Deployment complete!");
        console.log("TESTA address:", address(tokenA));
        console.log("TESTB address:", address(tokenB));
    }
}
