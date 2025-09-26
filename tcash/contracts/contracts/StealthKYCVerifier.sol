// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@selfxyz/contracts/contracts/abstract/SelfVerificationRoot.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title StealthKYCVerifier
 * @notice A privacy-enhanced KYC verification contract using EIP-5564 stealth addresses
 * @dev Uses master identity system with Self.xyz nullifiers as unique identifiers
 * @author Your Team
 */
contract StealthKYCVerifier is SelfVerificationRoot, Ownable, ReentrancyGuard, Pausable {

    // ========================================
    // Data Structures
    // ========================================

    struct MasterKYCIdentity {
        bool isVerified;
        bytes32 dobCommitment;      // Private DOB storage as hash(DOB + salt)
        string nationality;
        uint8 documentType;         // 1=E-Passport, 2=EU ID Card, etc.
        bool isOfacClear;
        uint256 verificationTimestamp;
        uint256 verificationCount;
        address primaryStealthAddress; // First stealth address used for verification
    }

    struct VerificationConfig {
        bytes32 configId;
        uint256 scope;
        bool requireOfacCheck;
        uint256 minimumAge;
        string[] excludedCountries;
        uint8[] allowedDocumentTypes;
        bool isActive;
    }

    struct StealthAddressProof {
        bytes32 masterNullifier;
        bytes signature;            // Signature proving ownership of master identity
        uint256 timestamp;
    }

    // ========================================
    // State Variables
    // ========================================

    // Master nullifier => KYC identity data (one per person)
    mapping(bytes32 => MasterKYCIdentity) public masterIdentities;

    // Stealth address => master nullifier lookup
    mapping(address => bytes32) public stealthToMaster;

    // Master nullifier => list of linked stealth addresses
    mapping(bytes32 => address[]) public masterToStealthAddresses;

    // Track if a stealth address has been used for initial verification
    mapping(address => bool) public usedForInitialVerification;

    // Nullifier => verification status (for Self.xyz compatibility)
    mapping(uint256 => bool) public verifiedNullifiers;

    // Configuration management
    VerificationConfig public currentConfig;

    // Statistics
    uint256 public totalVerifications;
    uint256 public uniqueIdentities;
    uint256 public totalStealthAddresses;

    // Emergency controls
    bool public emergencyStop;

    // ========================================
    // Events
    // ========================================

    event MasterIdentityVerified(
        bytes32 indexed masterNullifier,
        address indexed primaryStealthAddress,
        string nationality,
        uint8 documentType,
        uint256 timestamp,
        bool isOfacClear
    );

    event StealthAddressLinked(
        bytes32 indexed masterNullifier,
        address indexed stealthAddress,
        address indexed linkedBy,
        uint256 timestamp
    );

    event StealthAddressUnlinked(
        bytes32 indexed masterNullifier,
        address indexed stealthAddress,
        string reason,
        uint256 timestamp
    );

    event DOBCommitmentVerified(
        bytes32 indexed masterNullifier,
        address indexed verifier,
        bool isValid,
        uint256 timestamp
    );

    event ConfigurationUpdated(
        bytes32 indexed configId,
        uint256 scope,
        uint256 minimumAge,
        bool requireOfacCheck
    );

    event EmergencyStopActivated(address indexed admin, uint256 timestamp);
    event EmergencyStopDeactivated(address indexed admin, uint256 timestamp);

    // ========================================
    // Modifiers
    // ========================================

    modifier notInEmergency() {
        require(!emergencyStop, "StealthKYCVerifier: Emergency stop activated");
        _;
    }

    modifier validStealthAddress(address stealthAddr) {
        require(stealthAddr != address(0), "StealthKYCVerifier: Invalid stealth address");
        _;
    }

    modifier masterIdentityExists(bytes32 masterNullifier) {
        require(masterIdentities[masterNullifier].isVerified, "StealthKYCVerifier: Master identity not verified");
        _;
    }

    // ========================================
    // Constructor
    // ========================================

    constructor(
        address _identityVerificationHubV2Address,
        uint256 _scope,
        bytes32 _configId,
        bool _requireOfacCheck,
        uint256 _minimumAge,
        string[] memory _excludedCountries,
        uint8[] memory _allowedDocumentTypes
    ) SelfVerificationRoot(_identityVerificationHubV2Address, _scope) Ownable(msg.sender) {
        currentConfig = VerificationConfig({
            configId: _configId,
            scope: _scope,
            requireOfacCheck: _requireOfacCheck,
            minimumAge: _minimumAge,
            excludedCountries: _excludedCountries,
            allowedDocumentTypes: _allowedDocumentTypes,
            isActive: true
        });

        emit ConfigurationUpdated(_configId, _scope, _minimumAge, _requireOfacCheck);
    }

    // ========================================
    // Self.xyz Integration - Custom Verification Hook
    // ========================================

    /**
     * @notice Custom verification logic using master identity system
     * @dev This function creates or updates master identity based on Self.xyz nullifier
     * @param output The verification output containing disclosed identity information
     * @param userData User-defined data passed through the verification process
     */
    function customVerificationHook(
        ISelfVerificationRoot.GenericDiscloseOutputV2 memory output,
        bytes memory userData
    ) internal override nonReentrant notInEmergency {
        // Extract master nullifier and stealth address from the verification
        bytes32 masterNullifier = bytes32(output.nullifier);
        address stealthAddress = msg.sender; // The stealth address calling verification

        // Prevent duplicate verifications for same nullifier
        require(!verifiedNullifiers[output.nullifier], "StealthKYCVerifier: Nullifier already used");

        // Validate configuration requirements
        _validateVerificationRequirements(output);

        // Check if this is a new master identity or existing one
        bool isNewIdentity = !masterIdentities[masterNullifier].isVerified;

        if (isNewIdentity) {
            // Create new master identity
            _createMasterIdentity(masterNullifier, stealthAddress, output, userData);
        } else {
            // Link stealth address to existing master identity
            _linkStealthAddressToMaster(masterNullifier, stealthAddress);
        }

        // Mark nullifier as used
        verifiedNullifiers[output.nullifier] = true;

        // Update statistics
        totalVerifications++;
        if (isNewIdentity) {
            uniqueIdentities++;
        }
        totalStealthAddresses++;
    }

    /**
     * @notice Create a new master identity from verification output
     * @param masterNullifier The unique master identifier from Self.xyz
     * @param stealthAddress The stealth address used for verification
     * @param output The verification output from Self.xyz
     * @param userData Additional user data
     */
    function _createMasterIdentity(
        bytes32 masterNullifier,
        address stealthAddress,
        ISelfVerificationRoot.GenericDiscloseOutputV2 memory output,
        bytes memory userData
    ) internal {
        // Extract DOB and create commitment
        bytes32 dobCommitment = _createDOBCommitment(output.dateOfBirth, stealthAddress);

        // Create master identity
        masterIdentities[masterNullifier] = MasterKYCIdentity({
            isVerified: true,
            dobCommitment: dobCommitment,
            nationality: output.nationality,
            documentType: _getDocumentTypeFromAttestation(output.attestationId),
            isOfacClear: !output.ofac[0],
            verificationTimestamp: block.timestamp,
            verificationCount: 1,
            primaryStealthAddress: stealthAddress
        });

        // Link stealth address to master identity
        stealthToMaster[stealthAddress] = masterNullifier;
        masterToStealthAddresses[masterNullifier].push(stealthAddress);
        usedForInitialVerification[stealthAddress] = true;

        emit MasterIdentityVerified(
            masterNullifier,
            stealthAddress,
            output.nationality,
            _getDocumentTypeFromAttestation(output.attestationId),
            block.timestamp,
            !output.ofac[0]
        );
    }

    /**
     * @notice Link a stealth address to existing master identity
     * @param masterNullifier The master identity to link to
     * @param stealthAddress The stealth address to link
     */
    function _linkStealthAddressToMaster(
        bytes32 masterNullifier,
        address stealthAddress
    ) internal {
        // Ensure stealth address isn't already linked
        require(stealthToMaster[stealthAddress] == bytes32(0), "StealthKYCVerifier: Stealth address already linked");

        // Link the stealth address
        stealthToMaster[stealthAddress] = masterNullifier;
        masterToStealthAddresses[masterNullifier].push(stealthAddress);

        // Update verification count
        masterIdentities[masterNullifier].verificationCount++;

        emit StealthAddressLinked(
            masterNullifier,
            stealthAddress,
            tx.origin, // The original caller who initiated the transaction
            block.timestamp
        );
    }

    /**
     * @notice Create DOB commitment for privacy
     * @param dateOfBirth The date of birth string from Self.xyz
     * @param stealthAddress The stealth address (used as salt)
     * @return The DOB commitment hash
     */
    function _createDOBCommitment(
        string memory dateOfBirth,
        address stealthAddress
    ) internal view returns (bytes32) {
        // Use stealth address as salt for added privacy
        return keccak256(abi.encodePacked(dateOfBirth, stealthAddress, block.timestamp));
    }

    /**
     * @notice Validate verification meets configuration requirements
     * @param output The verification output containing disclosed identity information
     */
    function _validateVerificationRequirements(ISelfVerificationRoot.GenericDiscloseOutputV2 memory output) internal view {
        require(currentConfig.isActive, "StealthKYCVerifier: Configuration not active");

        // Check OFAC requirement
        if (currentConfig.requireOfacCheck) {
            require(!output.ofac[0], "StealthKYCVerifier: OFAC check failed");
        }

        // Check age requirement
        if (currentConfig.minimumAge > 0) {
            require(output.olderThan >= currentConfig.minimumAge, "StealthKYCVerifier: Age requirement not met");
        }

        // Check document type
        if (currentConfig.allowedDocumentTypes.length > 0) {
            bool documentTypeAllowed = false;
            for (uint i = 0; i < currentConfig.allowedDocumentTypes.length; i++) {
                if (currentConfig.allowedDocumentTypes[i] == _getDocumentTypeFromAttestation(output.attestationId)) {
                    documentTypeAllowed = true;
                    break;
                }
            }
            require(documentTypeAllowed, "StealthKYCVerifier: Document type not allowed");
        }

        // Check excluded countries
        for (uint i = 0; i < currentConfig.excludedCountries.length; i++) {
            require(
                keccak256(bytes(output.nationality)) != keccak256(bytes(currentConfig.excludedCountries[i])),
                "StealthKYCVerifier: Nationality not allowed"
            );
        }
    }

    // ========================================
    // Public View Functions
    // ========================================

    /**
     * @notice Get the configuration ID for Self.xyz verification
     * @dev This is required by the SelfVerificationRoot interface
     * @return The configuration ID as bytes32
     */
    function getConfigId() public view returns (bytes32) {
        return currentConfig.configId;
    }

    /**
     * @notice Check if a stealth address is KYC verified
     * @param stealthAddress The stealth address to check
     * @return isVerified Whether the stealth address is verified
     */
    function isStealthAddressVerified(address stealthAddress)
        external
        view
        validStealthAddress(stealthAddress)
        returns (bool)
    {
        bytes32 masterNullifier = stealthToMaster[stealthAddress];
        return masterIdentities[masterNullifier].isVerified;
    }

    /**
     * @notice Get master identity data for a stealth address
     * @param stealthAddress The stealth address
     * @return Master identity data
     */
    function getMasterIdentityByStealthAddress(address stealthAddress)
        external
        view
        validStealthAddress(stealthAddress)
        returns (MasterKYCIdentity memory)
    {
        bytes32 masterNullifier = stealthToMaster[stealthAddress];
        require(masterNullifier != bytes32(0), "StealthKYCVerifier: Stealth address not linked");
        return masterIdentities[masterNullifier];
    }

    /**
     * @notice Get master identity data by master nullifier
     * @param masterNullifier The master nullifier
     * @return Master identity data
     */
    function getMasterIdentity(bytes32 masterNullifier)
        external
        view
        masterIdentityExists(masterNullifier)
        returns (MasterKYCIdentity memory)
    {
        return masterIdentities[masterNullifier];
    }

    /**
     * @notice Get all stealth addresses linked to a master identity
     * @param masterNullifier The master nullifier
     * @return Array of linked stealth addresses
     */
    function getLinkedStealthAddresses(bytes32 masterNullifier)
        external
        view
        masterIdentityExists(masterNullifier)
        returns (address[] memory)
    {
        return masterToStealthAddresses[masterNullifier];
    }

    /**
     * @notice Verify DOB commitment
     * @param masterNullifier The master identity to check
     * @param dateOfBirth The claimed date of birth
     * @param salt The salt used for commitment (could be stealth address)
     * @return Whether the commitment is valid
     */
    function verifyDOBCommitment(
        bytes32 masterNullifier,
        string memory dateOfBirth,
        address salt
    ) external view masterIdentityExists(masterNullifier) returns (bool) {
        bytes32 providedCommitment = keccak256(abi.encodePacked(dateOfBirth, salt, masterIdentities[masterNullifier].verificationTimestamp));
        return masterIdentities[masterNullifier].dobCommitment == providedCommitment;
    }

    /**
     * @notice Get current verification configuration
     * @return Current configuration struct
     */
    function getConfiguration() external view returns (VerificationConfig memory) {
        return currentConfig;
    }

    /**
     * @notice Get verification statistics
     * @return totalVerifications Total number of verifications
     * @return uniqueIdentities Number of unique verified identities
     * @return totalStealthAddresses Total number of stealth addresses
     */
    function getStatistics() external view returns (uint256, uint256, uint256) {
        return (totalVerifications, uniqueIdentities, totalStealthAddresses);
    }

    // ========================================
    // Admin Functions
    // ========================================

    /**
     * @notice Update verification configuration
     * @param _configId New configuration ID
     * @param _scope New scope
     * @param _requireOfacCheck Whether to require OFAC check
     * @param _minimumAge Minimum age requirement
     * @param _excludedCountries Array of excluded country codes
     * @param _allowedDocumentTypes Array of allowed document types
     */
    function updateConfiguration(
        bytes32 _configId,
        uint256 _scope,
        bool _requireOfacCheck,
        uint256 _minimumAge,
        string[] memory _excludedCountries,
        uint8[] memory _allowedDocumentTypes
    ) external onlyOwner {
        currentConfig = VerificationConfig({
            configId: _configId,
            scope: _scope,
            requireOfacCheck: _requireOfacCheck,
            minimumAge: _minimumAge,
            excludedCountries: _excludedCountries,
            allowedDocumentTypes: _allowedDocumentTypes,
            isActive: true
        });

        // Update the parent contract's configuration
        _setScope(_scope);

        emit ConfigurationUpdated(_configId, _scope, _minimumAge, _requireOfacCheck);
    }

    /**
     * @notice Unlink a stealth address from master identity (emergency use only)
     * @param masterNullifier The master identity
     * @param stealthAddress The stealth address to unlink
     * @param reason Reason for unlinking
     */
    function unlinkStealthAddress(
        bytes32 masterNullifier,
        address stealthAddress,
        string memory reason
    ) external onlyOwner masterIdentityExists(masterNullifier) validStealthAddress(stealthAddress) {
        require(stealthToMaster[stealthAddress] == masterNullifier, "StealthKYCVerifier: Address not linked to this identity");

        // Remove from mapping
        delete stealthToMaster[stealthAddress];

        // Remove from array (find and remove)
        address[] storage linkedAddresses = masterToStealthAddresses[masterNullifier];
        for (uint i = 0; i < linkedAddresses.length; i++) {
            if (linkedAddresses[i] == stealthAddress) {
                linkedAddresses[i] = linkedAddresses[linkedAddresses.length - 1];
                linkedAddresses.pop();
                break;
            }
        }

        // Update statistics
        totalStealthAddresses--;

        emit StealthAddressUnlinked(masterNullifier, stealthAddress, reason, block.timestamp);
    }

    /**
     * @notice Activate emergency stop
     */
    function activateEmergencyStop() external onlyOwner {
        emergencyStop = true;
        _pause();
        emit EmergencyStopActivated(msg.sender, block.timestamp);
    }

    /**
     * @notice Deactivate emergency stop
     */
    function deactivateEmergencyStop() external onlyOwner {
        emergencyStop = false;
        _unpause();
        emit EmergencyStopDeactivated(msg.sender, block.timestamp);
    }

    /**
     * @notice Pause contract (stops new verifications)
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @notice Unpause contract
     */
    function unpause() external onlyOwner {
        _unpause();
    }

    // ========================================
    // Internal Helper Functions
    // ========================================

    /**
     * @notice Maps attestation ID to document type
     * @param attestationId The attestation ID from Self verification
     * @return Document type identifier
     */
    function _getDocumentTypeFromAttestation(bytes32 attestationId) internal pure returns (uint8) {
        // Map Self.xyz attestation IDs to document types
        // This would need to be updated based on Self.xyz attestation ID mappings
        if (attestationId == bytes32(uint256(1))) return 1; // E-Passport
        if (attestationId == bytes32(uint256(2))) return 2; // EU ID Card
        return 1; // Default to E-Passport
    }
}