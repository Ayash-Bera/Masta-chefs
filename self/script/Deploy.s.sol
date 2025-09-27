// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {CompliantProcedure} from "../src/CompliantProcedure.sol";

contract DeployCompliantProcedure is Script {
    CompliantProcedure public compliantProcedure;

    function setUp() public {}

    function run() public {
        uint256 deployerPrivateKey = 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80;
        address deployer = vm.addr(deployerPrivateKey);

        console.log("Deploying CompliantProcedure contract...");
        console.log("Deployer address:", deployer);
        console.log("Deployer balance:", deployer.balance);

        vm.startBroadcast(deployerPrivateKey);

        // Deploy the CompliantProcedure contract
        // Using Self.xyz V2 Hub staging address for Celo Sepolia
        address hubAddress = 0x16ECBA51e18a4a7e61fdC417f0d47AFEeDfbed74;
        uint256 scope = uint256(keccak256("tsunami"));
        bytes32 configId = 0x7b6436b0c98f62380866d9432c2af0ee08ce16a171bda6951aecd95ee1307d61;
        
        compliantProcedure = new CompliantProcedure(hubAddress, scope, configId);

        vm.stopBroadcast();

        console.log("CompliantProcedure deployed at:", address(compliantProcedure));
        console.log("Contract owner:", compliantProcedure.owner());
        console.log("Total compliant users:", compliantProcedure.getTotalCompliantUsers());

        // Verification instructions
        console.log("\n=== Contract Verification ===");
        console.log("To verify the contract on Celoscan, run:");
        console.log("forge verify-contract --chain celo_sepolia --constructor-args $(cast abi-encode 'constructor()') --etherscan-api-key $CELOSCAN_API_KEY", address(compliantProcedure), "src/CompliantProcedure.sol:CompliantProcedure");

        // Frontend integration instructions
        console.log("\n=== Frontend Integration ===");
        console.log("Add this contract address to your frontend constants:");
        console.log("COMPLIANT_PROCEDURE_SEPOLIA:", address(compliantProcedure));
    }
}