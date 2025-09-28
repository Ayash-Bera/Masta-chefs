// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { ProofOfHuman } from "../src/ProofOfHuman.sol";
import { BaseScript } from "./Base.s.sol";
import { CountryCodes } from "@selfxyz/contracts/contracts/libraries/CountryCode.sol";
import { console } from "forge-std/console.sol";
import { SelfUtils } from "@selfxyz/contracts/contracts/libraries/SelfUtils.sol";

/// @title DeployProofOfHuman
/// @notice Deployment script for ProofOfHuman contract for Tsunami Wallet
contract DeployProofOfHuman is BaseScript {
    // Custom errors for deployment verification
    error DeploymentFailed();

    /// @notice Main deployment function using standard deployment
    /// @return proofOfHuman The deployed ProofOfHuman contract instance
    /// @dev Requires the following environment variables:
    ///      - IDENTITY_VERIFICATION_HUB_ADDRESS: Address of the Self Protocol verification hub
    ///      - SCOPE_SEED: Scope seed value (defaults to "tsunami-proof-of-human")
    function run() public broadcast returns (ProofOfHuman proofOfHuman) {
        address hubAddress = vm.envAddress("IDENTITY_VERIFICATION_HUB_ADDRESS");
        string memory scopeSeed = vm.envString("SCOPE_SEED");

        // Validate inputs
        validateAddress(hubAddress, "IDENTITY_VERIFICATION_HUB_ADDRESS");
        validateString(scopeSeed, "SCOPE_SEED");

        // Setup verification configuration
        string[] memory forbiddenCountries = new string[](1);
        forbiddenCountries[0] = CountryCodes.UNITED_STATES;

        SelfUtils.UnformattedVerificationConfigV2 memory verificationConfig = SelfUtils.UnformattedVerificationConfigV2({
            olderThan: 18,
            forbiddenCountries: forbiddenCountries,
            ofacEnabled: false
        });

        console.log("=================================================================================");
        console.log("Deploying ProofOfHuman for Tsunami Wallet");
        console.log("=================================================================================");
        console.log("Hub Address:", hubAddress);
        console.log("Scope Seed:", scopeSeed);
        console.log("Deployer:", getDeployer());
        console.log("=================================================================================");

        // Deploy the contract using the scope seed from environment
        proofOfHuman = new ProofOfHuman(hubAddress, scopeSeed, verificationConfig);

        // Verify deployment was successful
        if (address(proofOfHuman) == address(0)) revert DeploymentFailed();

        // Log deployment information
        logDeployment("ProofOfHuman", address(proofOfHuman));
        console.log("Identity Verification Hub:", hubAddress);
        console.log("Scope Value:", proofOfHuman.scope());
        console.log("Config ID:", vm.toString(proofOfHuman.verificationConfigId()));

        // Log verification configuration
        console.log("=================================================================================");
        console.log("Verification Configuration:");
        console.log("- Minimum Age: 18");
        console.log("- Forbidden Countries: USA");
        console.log("- OFAC Enabled: false");
        console.log("=================================================================================");

        console.log("Deployment verification completed successfully!");
        console.log("Scope automatically generated from SCOPE_SEED:", scopeSeed);

        console.log("=================================================================================");
        console.log("TSUNAMI WALLET PROOF OF HUMAN DEPLOYED SUCCESSFULLY!");
        console.log("=================================================================================");
    }
}