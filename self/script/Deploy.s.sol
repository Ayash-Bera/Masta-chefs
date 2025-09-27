// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Script, console} from "forge-std/Script.sol";
import {CompliantProcedure} from "../src/CompliantProcedure.sol";

contract DeployCompliantProcedure is Script {
    CompliantProcedure public compliantProcedure;

    function setUp() public {}

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("Deploying CompliantProcedure contract...");
        console.log("Deployer address:", deployer);
        console.log("Deployer balance:", deployer.balance);

        vm.startBroadcast(deployerPrivateKey);

        // Deploy the CompliantProcedure contract
        compliantProcedure = new CompliantProcedure();

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