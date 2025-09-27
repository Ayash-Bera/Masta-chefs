// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Script, console2} from "forge-std/Script.sol";
import {MultiBatch1inchHelper} from "../src/MultiBatch1inchHelper.sol";

contract DeployScript is Script {
    // 1inch Limit Order Protocol v4 addresses
    address constant MAINNET_LIMIT_ORDER_PROTOCOL = 0x111111125421cA6dc452d289314280a0f8842A65;
    address constant BASE_SEPOLIA_LIMIT_ORDER_PROTOCOL = 0x111111125421cA6dc452d289314280a0f8842A65;
    address constant BASE_LIMIT_ORDER_PROTOCOL = 0x111111125421cA6dc452d289314280a0f8842A65;

    function setUp() public {}

    function run() public {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console2.log("Deploying MultiBatch1inchHelper...");
        console2.log("Deployer address:", deployer);
        console2.log("Deployer balance:", deployer.balance);

        // Get the appropriate limit order protocol address based on chain
        address limitOrderProtocol = getLimitOrderProtocolAddress();
        console2.log("Using 1inch Limit Order Protocol at:", limitOrderProtocol);

        vm.startBroadcast(deployerPrivateKey);

        MultiBatch1inchHelper helper = new MultiBatch1inchHelper(limitOrderProtocol);

        vm.stopBroadcast();

        console2.log("MultiBatch1inchHelper deployed at:", address(helper));
        console2.log("1inch Limit Order Protocol:", helper.limitOrderProtocol());

        // Verify deployment
        console2.log("\n=== Deployment Verification ===");
        console2.log("Contract code size:", address(helper).code.length);
        console2.log("Deployment successful:", address(helper).code.length > 0);

        // Save deployment info
        string memory deploymentInfo = string.concat(
            "MULTIBATCH_HELPER_ADDRESS=", vm.toString(address(helper)), "\n",
            "LIMIT_ORDER_PROTOCOL=", vm.toString(limitOrderProtocol), "\n",
            "DEPLOYER=", vm.toString(deployer), "\n",
            "CHAIN_ID=", vm.toString(block.chainid), "\n"
        );

        vm.writeFile("deployments.env", deploymentInfo);
        console2.log("Deployment info saved to deployments.env");
    }

    function getLimitOrderProtocolAddress() internal view returns (address) {
        uint256 chainId = block.chainid;

        if (chainId == 1) {
            // Ethereum Mainnet
            return MAINNET_LIMIT_ORDER_PROTOCOL;
        } else if (chainId == 8453) {
            // Base Mainnet
            return BASE_LIMIT_ORDER_PROTOCOL;
        } else if (chainId == 84532) {
            // Base Sepolia
            return BASE_SEPOLIA_LIMIT_ORDER_PROTOCOL;
        } else {
            // Default to mainnet address for other networks
            console2.log("Warning: Unknown chain ID, using mainnet address");
            return MAINNET_LIMIT_ORDER_PROTOCOL;
        }
    }
}