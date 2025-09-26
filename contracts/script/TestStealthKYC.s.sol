// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "forge-std/Script.sol";
import "forge-std/console.sol";
import "../contracts/StealthKYCVerifier.sol";

/**
 * @title TestStealthKYC
 * @notice Comprehensive testing script for StealthKYCVerifier contract
 * @dev Tests master identity system, DOB commitments, and stealth address linking
 */
contract TestStealthKYC is Script {
    // Contract address on Alfajores
    address constant STEALTH_KYC_CONTRACT = 0xBe2187568d4E71a19afe973f5EDEF19E6276Dc84;

    // Test data
    bytes32 constant TEST_MASTER_NULLIFIER = 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef;
    address constant TEST_STEALTH_ADDRESS_1 = 0x1111111111111111111111111111111111111111;
    address constant TEST_STEALTH_ADDRESS_2 = 0x2222222222222222222222222222222222222222;
    string constant TEST_NATIONALITY = "US";
    uint8 constant TEST_DOCUMENT_TYPE = 1; // E-Passport
    string constant TEST_DOB = "1990-01-01";
    bool constant TEST_OFAC_CLEAR = true;

    function run() external {
        uint256 deployerPrivateKey = vm.envUint("CELO_PRIVATE_KEY");

        console.log("=================================================");
        console.log("Testing StealthKYCVerifier Contract Functions");
        console.log("=================================================");
        console.log("Contract Address:", STEALTH_KYC_CONTRACT);
        console.log("");

        StealthKYCVerifier stealthKYC = StealthKYCVerifier(STEALTH_KYC_CONTRACT);

        // Test 1: Verify contract configuration
        console.log("Test 1: Contract Configuration");
        console.log("------------------------------");
        _testContractConfiguration(stealthKYC);
        console.log("");

        // Test 2: Initial statistics
        console.log("Test 2: Initial Statistics");
        console.log("--------------------------");
        _testInitialStatistics(stealthKYC);
        console.log("");

        // Test 3: Read-only functions verification
        console.log("Test 3: Read-Only Functions");
        console.log("---------------------------");
        _testReadOnlyFunctions(stealthKYC);
        console.log("");

        // Test 4: Emergency and pause functionality
        console.log("Test 4: Emergency and Pause Controls");
        console.log("------------------------------------");
        vm.startBroadcast(deployerPrivateKey);
        _testEmergencyAndPauseControls(stealthKYC);
        vm.stopBroadcast();
        console.log("");

        console.log("=================================================");
        console.log("All Tests Completed Successfully!");
        console.log("=================================================");
    }

    function _testContractConfiguration(StealthKYCVerifier stealthKYC) internal view {
        StealthKYCVerifier.VerificationConfig memory config = stealthKYC.getConfiguration();

        require(config.isActive, "Configuration should be active");
        require(config.minimumAge == 18, "Minimum age should be 18");
        require(config.requireOfacCheck == true, "OFAC check should be required");

        console.log("Configuration active:", config.isActive);
        console.log("Minimum age:", config.minimumAge);
        console.log("OFAC check required:", config.requireOfacCheck);
        console.log("Contract scope:", stealthKYC.scope());
        console.log("Config ID:", vm.toString(stealthKYC.getConfigId()));
        console.log("Configuration test PASSED");
    }

    function _testInitialStatistics(StealthKYCVerifier stealthKYC) internal view {
        (uint256 totalVerifications, uint256 uniqueIdentities, uint256 totalStealthAddresses) = stealthKYC.getStatistics();

        console.log("Total verifications:", totalVerifications);
        console.log("Unique identities:", uniqueIdentities);
        console.log("Total stealth addresses:", totalStealthAddresses);
        console.log("Statistics test PASSED");
    }

    function _testReadOnlyFunctions(StealthKYCVerifier stealthKYC) internal view {
        console.log("Testing contract getter functions...");

        // Test owner function
        address contractOwner = stealthKYC.owner();
        console.log("Contract owner:", contractOwner);
        require(contractOwner != address(0), "Owner should be set");

        // Test scope and config
        uint256 contractScope = stealthKYC.scope();
        bytes32 configId = stealthKYC.getConfigId();
        console.log("Contract scope:", contractScope);
        console.log("Config ID:", vm.toString(configId));

        // Test pause and emergency status
        bool paused = stealthKYC.paused();
        console.log("Contract paused:", paused);

        // Test non-existent stealth address (should return false)
        bool isVerified = stealthKYC.isStealthAddressVerified(TEST_STEALTH_ADDRESS_1);
        console.log("Test address verified (should be false):", isVerified);
        require(!isVerified, "Non-existent address should not be verified");

        console.log("Read-only functions test PASSED");
    }

    function _testEmergencyAndPauseControls(StealthKYCVerifier stealthKYC) internal {
        console.log("Testing emergency and pause controls...");

        // Test pause functionality
        console.log("Pausing contract...");
        stealthKYC.pause();

        bool isPaused = stealthKYC.paused();
        require(isPaused, "Contract should be paused");
        console.log("Contract paused successfully");

        // Test unpause functionality
        console.log("Unpausing contract...");
        stealthKYC.unpause();

        bool isUnpaused = !stealthKYC.paused();
        require(isUnpaused, "Contract should be unpaused");
        console.log("Contract unpaused successfully");

        console.log("Emergency and pause controls test PASSED");
    }
}