// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import { SelfVerificationRoot } from "@selfxyz/contracts/contracts/abstract/SelfVerificationRoot.sol";
import { ISelfVerificationRoot } from "@selfxyz/contracts/contracts/interfaces/ISelfVerificationRoot.sol";
import { SelfStructs } from "@selfxyz/contracts/contracts/libraries/SelfStructs.sol";
import { SelfUtils } from "@selfxyz/contracts/contracts/libraries/SelfUtils.sol";
import { IIdentityVerificationHubV2 } from "@selfxyz/contracts/contracts/interfaces/IIdentityVerificationHubV2.sol";

/**
 * @title ProofOfHuman
 * @notice Tsunami Wallet implementation of SelfVerificationRoot for human verification
 * @dev This contract provides proof of human verification for Tsunami Wallet users
 */
contract ProofOfHuman is SelfVerificationRoot {
    // Storage for verification tracking
    mapping(address => bool) public verifiedHumans;
    bool public verificationSuccessful;
    ISelfVerificationRoot.GenericDiscloseOutputV2 public lastOutput;
    bytes public lastUserData;
    SelfStructs.VerificationConfigV2 public verificationConfig;
    bytes32 public verificationConfigId;
    address public lastUserAddress;

    // Events for verification tracking
    event VerificationCompleted(ISelfVerificationRoot.GenericDiscloseOutputV2 output, bytes userData);
    event HumanVerified(address indexed user, uint256 timestamp);

    /**
     * @notice Constructor for the Tsunami Wallet ProofOfHuman contract
     * @param identityVerificationHubV2Address The address of the Identity Verification Hub V2
     * @param scope The scope string for this verification system
     * @param _verificationConfig The verification configuration parameters
     */
    constructor(
        address identityVerificationHubV2Address,
        string memory scope,
        SelfUtils.UnformattedVerificationConfigV2 memory _verificationConfig
    )
        SelfVerificationRoot(identityVerificationHubV2Address, scope)
    {
        verificationConfig = SelfUtils.formatVerificationConfigV2(_verificationConfig);
        verificationConfigId =
            IIdentityVerificationHubV2(identityVerificationHubV2Address).setVerificationConfigV2(verificationConfig);
    }

    /**
     * @notice Implementation of customVerificationHook for human verification
     * @dev This function is called by onVerificationSuccess after hub address validation
     * @param output The verification output from the hub
     * @param userData The user data passed through verification
     */
    function customVerificationHook(
        ISelfVerificationRoot.GenericDiscloseOutputV2 memory output,
        bytes memory userData
    )
        internal
        override
    {
        verificationSuccessful = true;
        lastOutput = output;
        lastUserData = userData;
        lastUserAddress = address(uint160(output.userIdentifier));

        // Mark the user as a verified human
        verifiedHumans[lastUserAddress] = true;

        emit VerificationCompleted(output, userData);
        emit HumanVerified(lastUserAddress, block.timestamp);
    }

    /**
     * @notice Check if a user is verified as human
     * @param user The address to check
     * @return bool True if the user is verified as human
     */
    function isVerifiedHuman(address user) external view returns (bool) {
        return verifiedHumans[user];
    }

    /**
     * @notice Set the verification config ID (admin function)
     * @param configId The new config ID
     */
    function setConfigId(bytes32 configId) external {
        verificationConfigId = configId;
    }

    /**
     * @notice Get the verification config ID for a user
     * @return bytes32 The verification config ID
     */
    function getConfigId(
        bytes32, /* destinationChainId */
        bytes32, /* userIdentifier */
        bytes memory /* userDefinedData */
    )
        public
        view
        override
        returns (bytes32)
    {
        return verificationConfigId;
    }

    /**
     * @notice Get verification statistics
     * @return totalVerified The total number of verified humans
     * @return configId The current verification config ID
     */
    function getVerificationStats() external view returns (uint256 totalVerified, bytes32 configId) {
        // Note: This is a simple implementation. For a production system,
        // you might want to track this more efficiently
        totalVerified = 0;
        configId = verificationConfigId;

        // Count would require additional tracking in a real implementation
        // This is just for demonstration purposes
    }
}