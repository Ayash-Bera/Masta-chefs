// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {CompliantProcedure} from "../src/CompliantProcedure.sol";
import {PoseidonT3} from "poseidon-solidity/PoseidonT3.sol";

contract DeployScript is Script {
    function run() external {
        // Use the provided private key for deployment
        uint256 deployerPrivateKey = 0x95492791d9e40b7771b8b57117c399cc5e27d99d4959b7f9592925a398be7bdb;
        
        vm.startBroadcast(deployerPrivateKey);

        // Deploy the CompliantProcedure contract
        // Using Self.xyz V2 Hub staging address for Celo Sepolia
        address hubAddress = 0x16ECBA51e18a4a7e61fdC417f0d47AFEeDfbed74;
        
        // Use a scope value that matches the frontend scope "tsunami"
        // The frontend sends "tsunami" as scope, so we need to use a compatible value
        uint256 scopeValue = uint256(keccak256(abi.encodePacked("tsunami")));
        
        CompliantProcedure compliantProcedure = new CompliantProcedure(
            hubAddress,
            scopeValue
        );

        // The scope is already set correctly in the constructor

        vm.stopBroadcast();

        console.log("Deploying CompliantProcedure contract...");
        console.log("Deployer address:", vm.addr(deployerPrivateKey));
        console.log("Deployer balance:", vm.addr(deployerPrivateKey).balance);
        console.log("CompliantProcedure deployed at:", address(compliantProcedure));
        console.log("Contract owner:", compliantProcedure.owner());
        console.log("Total compliant users:", compliantProcedure.getTotalCompliantUsers());
        console.log("Scope value:", scopeValue);
        
        console.log("\n=== Contract Verification ===");
        console.log("To verify the contract on Celoscan, run:");
        console.log("forge verify-contract --chain celo_sepolia --constructor-args $(cast abi-encode 'constructor()') --etherscan-api-key $CELOSCAN_API_KEY", address(compliantProcedure), "src/CompliantProcedure.sol:CompliantProcedure");
        
        console.log("\n=== Frontend Integration ===");
        console.log("Add this contract address to your frontend constants:");
        console.log("COMPLIANT_PROCEDURE_SEPOLIA:", address(compliantProcedure));
    }
}