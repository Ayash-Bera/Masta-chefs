// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../contracts/SelfKYCVerifier.sol";

/**
 * @title DeploySelfKYC
 * @notice Foundry deployment script for SelfKYCVerifier contract
 * @dev Deploys to Celo networks with proper Self.xyz integration
 */
contract DeploySelfKYC is Script {
    // Self.xyz Hub V2 addresses
    address constant SELF_HUB_V2_ALFAJORES =
        0x68c931C9a534D37aa78094877F46fE46a49F1A51;
    address constant SELF_HUB_V2_CELO =
        0xe57F4773bd9c9d8b6Cd70431117d353298B9f5BF;

    // Default deployment parameters
    uint256 constant DEFAULT_SCOPE =
        0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef;
    bytes32 constant DEFAULT_CONFIG_ID =
        0x0000000000000000000000000000000000000000000000000000000000000001;
    bool constant DEFAULT_REQUIRE_OFAC_CHECK = true;
    uint256 constant DEFAULT_MINIMUM_AGE = 18;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("CELO_PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        console.log("=================================================");
        console.log("Deploying SelfKYCVerifier to Celo Network");
        console.log("=================================================");
        console.log("Deployer:", deployer);
        console.log("Deployer Balance:", deployer.balance / 1e18, "CELO");
        console.log("");

        // Determine which Hub V2 address to use based on chain ID
        address hubV2Address = getHubV2Address();
        string memory networkName = getNetworkName();

        console.log("Network:", networkName);
        console.log("Self.xyz Hub V2:", hubV2Address);
        console.log("Scope:", vm.toString(DEFAULT_SCOPE));
        console.log("Config ID:", vm.toString(DEFAULT_CONFIG_ID));
        console.log("OFAC Check:", DEFAULT_REQUIRE_OFAC_CHECK);
        console.log("Minimum Age:", DEFAULT_MINIMUM_AGE);
        console.log("");

        // Prepare constructor arguments
        string[] memory excludedCountries = new string[](0); // Empty for testing
        uint8[] memory allowedDocumentTypes = new uint8[](2);
        allowedDocumentTypes[0] = 1; // E-Passport
        allowedDocumentTypes[1] = 2; // EU ID Card

        vm.startBroadcast(deployerPrivateKey);

        // Deploy the contract
        console.log("Deploying SelfKYCVerifier contract...");
        SelfKYCVerifier selfKYCVerifier = new SelfKYCVerifier(
            hubV2Address,
            DEFAULT_SCOPE,
            DEFAULT_CONFIG_ID,
            DEFAULT_REQUIRE_OFAC_CHECK,
            DEFAULT_MINIMUM_AGE,
            excludedCountries,
            allowedDocumentTypes
        );

        vm.stopBroadcast();

        console.log("Deployment completed successfully!");
        console.log("=================================================");
        console.log("Contract Address:", address(selfKYCVerifier));
        console.log("Explorer URL:", getExplorerUrl(address(selfKYCVerifier)));
        console.log("");
        console.log("Next Steps:");
        console.log(
            "1. Update SELFKYC_CONTRACT_ADDRESS_ALFAJORES in backend .env"
        );
        console.log("2. Configure Self.xyz with proper config ID and scope");
        console.log("3. Test verification flow with Self mobile app");
        console.log("");
        console.log("Environment Variables to Update:");
        console.log(
            "SELFKYC_CONTRACT_ADDRESS_ALFAJORES=",
            address(selfKYCVerifier)
        );
        console.log("");

        // Verify the deployment
        console.log("Verifying deployment...");
        require(address(selfKYCVerifier) != address(0), "Deployment failed");
        require(
            selfKYCVerifier.getConfigId() == DEFAULT_CONFIG_ID,
            "Config ID mismatch"
        );
        require(selfKYCVerifier.scope() == DEFAULT_SCOPE, "Scope mismatch");
        console.log("Deployment verification passed!");
    }

    function getHubV2Address() internal view returns (address) {
        uint256 chainId = block.chainid;
        if (chainId == 44787) {
            // Alfajores
            return SELF_HUB_V2_ALFAJORES;
        } else if (chainId == 42220) {
            // Celo Mainnet
            return SELF_HUB_V2_CELO;
        } else {
            revert("Unsupported network");
        }
    }

    function getNetworkName() internal view returns (string memory) {
        uint256 chainId = block.chainid;
        if (chainId == 44787) {
            return "Celo Alfajores Testnet";
        } else if (chainId == 42220) {
            return "Celo Mainnet";
        } else {
            return "Unknown Network";
        }
    }

    function getExplorerUrl(
        address contractAddress
    ) internal view returns (string memory) {
        uint256 chainId = block.chainid;
        string memory baseUrl;

        if (chainId == 44787) {
            // Alfajores
            baseUrl = "https://alfajores.celoscan.io/address/";
        } else if (chainId == 42220) {
            // Celo Mainnet
            baseUrl = "https://celoscan.io/address/";
        } else {
            baseUrl = "https://unknown-explorer.com/address/";
        }

        return string(abi.encodePacked(baseUrl, vm.toString(contractAddress)));
    }
}
