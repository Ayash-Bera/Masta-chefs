// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../contracts/StealthKYCVerifier.sol";

/**
 * @title DeployStealthKYC
 * @notice Foundry deployment script for StealthKYCVerifier contract
 * @dev Deploys to Celo networks with EIP-5564 stealth address support
 */
contract DeployStealthKYC is Script {
    // Self.xyz Hub V2 addresses
    address constant SELF_HUB_V2_ALFAJORES =
        0x68c931C9a534D37aa78094877F46fE46a49F1A51;
    address constant SELF_HUB_V2_CELO =
        0xe57F4773bd9c9d8b6Cd70431117d353298B9f5BF;

    // Default deployment parameters for stealth KYC
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
        console.log("Deploying StealthKYCVerifier to Celo Network");
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
        console.log("Features: EIP-5564 Stealth Addresses + DOB Commitments");
        console.log("");

        // Prepare constructor arguments
        string[] memory excludedCountries = new string[](0); // Empty for testing
        uint8[] memory allowedDocumentTypes = new uint8[](2);
        allowedDocumentTypes[0] = 1; // E-Passport
        allowedDocumentTypes[1] = 2; // EU ID Card

        vm.startBroadcast(deployerPrivateKey);

        // Deploy the stealth KYC contract
        console.log("Deploying StealthKYCVerifier contract...");
        StealthKYCVerifier stealthKYCVerifier = new StealthKYCVerifier(
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
        console.log("Contract Address:", address(stealthKYCVerifier));
        console.log("Explorer URL:", getExplorerUrl(address(stealthKYCVerifier)));
        console.log("");
        console.log("Contract Features:");
        console.log("  - Master Identity System (nullifier-based)");
        console.log("  - EIP-5564 Stealth Address Support");
        console.log("  - DOB Commitment Privacy System");
        console.log("  - Multiple Address Linking");
        console.log("  - Zero-Knowledge Proof Verification");
        console.log("");
        console.log("Next Steps:");
        console.log("1. Update STEALTH_CONTRACT_ADDRESS in backend .env");
        console.log("2. Test stealth address verification flow");
        console.log("3. Test DOB commitment system");
        console.log("4. Test master identity linking");
        console.log("");
        console.log("Environment Variables to Update:");
        console.log("STEALTH_CONTRACT_ADDRESS_ALFAJORES=", address(stealthKYCVerifier));
        console.log("");

        // Verify the deployment with comprehensive tests
        console.log("Verifying deployment...");
        _verifyDeployment(stealthKYCVerifier, deployer);
        console.log("Deployment verification passed!");
        console.log("");

        // Test basic functionality
        console.log("Testing basic functionality...");
        _testBasicFunctionality(stealthKYCVerifier);
        console.log("Basic functionality tests passed!");
    }

    function _verifyDeployment(StealthKYCVerifier stealthContract, address expectedOwner) internal view {
        // Verify basic contract state
        require(address(stealthContract) != address(0), "Deployment failed");
        require(stealthContract.getConfigId() == DEFAULT_CONFIG_ID, "Config ID mismatch");
        require(stealthContract.scope() == DEFAULT_SCOPE, "Scope mismatch");
        require(stealthContract.owner() == expectedOwner, "Owner mismatch");

        // Verify stealth-specific functionality exists
        (uint256 totalVerifications, uint256 uniqueIdentities, uint256 totalStealthAddresses) = stealthContract.getStatistics();
        require(totalVerifications == 0, "Initial verifications should be zero");
        require(uniqueIdentities == 0, "Initial identities should be zero");
        require(totalStealthAddresses == 0, "Initial stealth addresses should be zero");

        console.log("Basic contract verification passed");
        console.log("Stealth address functionality verified");
        console.log("Statistics initialized correctly");
    }

    function _testBasicFunctionality(StealthKYCVerifier stealthContract) internal view {
        // Test configuration access
        StealthKYCVerifier.VerificationConfig memory config = stealthContract.getConfiguration();
        require(config.isActive, "Configuration should be active");
        require(config.minimumAge == DEFAULT_MINIMUM_AGE, "Minimum age mismatch");
        require(config.requireOfacCheck == DEFAULT_REQUIRE_OFAC_CHECK, "OFAC check mismatch");

        // Test stealth address verification (should return false for non-existent addresses)
        address testStealthAddress = address(0x1234567890123456789012345678901234567890);
        bool isVerified = stealthContract.isStealthAddressVerified(testStealthAddress);
        require(!isVerified, "Non-existent stealth address should not be verified");

        console.log("Configuration access working");
        console.log("Stealth address verification working");
        console.log("Master identity system ready");
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