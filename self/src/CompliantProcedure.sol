// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {SelfVerificationRoot} from "@selfxyz/contracts/abstract/SelfVerificationRoot.sol";
import {ISelfVerificationRoot} from "@selfxyz/contracts/interfaces/ISelfVerificationRoot.sol";
import {SelfStructs} from "@selfxyz/contracts/libraries/SelfStructs.sol";
import {IIdentityVerificationHubV2} from "@selfxyz/contracts/interfaces/IIdentityVerificationHubV2.sol";

/**
 * @title CompliantProcedure
 * @notice Self.xyz compatible compliance verification contract
 * @dev This contract extends SelfVerificationRoot for proper Self.xyz integration
 */
contract CompliantProcedure is SelfVerificationRoot {

    struct UserCompliance {
        bytes32 dataHash;        // Hash of user data
        uint256 timestamp;       // Verification timestamp
        bool isCompliant;        // Compliance status
        string nationality;      // User nationality
        string issuingState;     // Document issuing state
        string[] name;           // User's name (if disclosed)
        string idNumber;         // Document ID number (if disclosed)
        string dateOfBirth;      // Date of birth (if disclosed)
        string gender;           // Gender (if disclosed)
        string expiryDate;       // Document expiry date (if disclosed)
        uint256 olderThan;       // Age verification result
        bool[3] ofac;            // OFAC verification result
        uint8 documentType;      // Document type
    }

    // Storage
    mapping(address => UserCompliance) public userCompliance;
    mapping(address => bool) public verifiedHumans;
    mapping(bytes32 => bool) public usedHashes;

    uint256 public totalCompliantUsers;
    bytes32 public verificationConfigId;
    address public owner;

    // Events
    event ComplianceVerified(
        address indexed user,
        bytes32 indexed dataHash,
        string nationality,
        uint8 documentType,
        uint256 timestamp
    );

    event VerificationCompleted(
        ISelfVerificationRoot.GenericDiscloseOutputV2 output,
        bytes userData
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    /**
     * @notice Constructor following Self.xyz best practices
     * @param _identityVerificationHubV2Address The address of the Identity Verification Hub V2
     * @param _scope The scope value (uint256) - calculated as Poseidon hash of contract address + scope seed
     */
    constructor(
        address _identityVerificationHubV2Address,
        uint256 _scope
    ) SelfVerificationRoot(_identityVerificationHubV2Address, _scope) {
        owner = msg.sender;
        
        // Use the default verification config ID from Self.xyz documentation
        // This is a standard config that works with basic verification requirements
        verificationConfigId = 0x7b6436b0c98f62380866d9432c2af0ee08ce16a171bda6951aecd95ee1307d61;
    }

    /**
     * @notice Implementation of customVerificationHook for Self.xyz
     * @dev This function is called by Self.xyz Hub after successful verification
     * @param output The verification output from the Self.xyz hub
     * @param userData The user data passed through verification
     */
    function customVerificationHook(
        ISelfVerificationRoot.GenericDiscloseOutputV2 memory output,
        bytes memory userData
    ) internal override {
        // Extract user address from userIdentifier
        address user = address(uint160(output.userIdentifier));

        require(user != address(0), "Invalid user address");
        
        // For basic verification, we only require nationality and issuing state
        // Other fields might be empty depending on the configuration
        require(bytes(output.nationality).length > 0, "Invalid nationality");
        require(bytes(output.issuingState).length > 0, "Invalid issuing state");

        // Create hash of verification data
        bytes32 dataHash = keccak256(abi.encodePacked(
            user,
            output.nationality,
            output.issuingState,
            block.timestamp
        ));

        // Prevent duplicate verifications
        require(!usedHashes[dataHash], "Verification already exists");
        usedHashes[dataHash] = true;

        // Store compliance data with all disclosed information
        userCompliance[user] = UserCompliance({
            dataHash: dataHash,
            timestamp: block.timestamp,
            isCompliant: true,
            nationality: output.nationality,
            issuingState: output.issuingState,
            name: output.name,
            idNumber: output.idNumber,
            dateOfBirth: output.dateOfBirth,
            gender: output.gender,
            expiryDate: output.expiryDate,
            olderThan: output.olderThan,
            ofac: output.ofac,
            documentType: 1 // Default document type for passport
        });

        // Mark as verified human
        verifiedHumans[user] = true;
        totalCompliantUsers++;

        // Emit events
        emit ComplianceVerified(user, dataHash, output.nationality, 1, block.timestamp);
        emit VerificationCompleted(output, userData);
    }

    /**
     * @notice Return the verification config ID
     * @dev Required by SelfVerificationRoot interface
     */
    function getConfigId(
        bytes32 /* destinationChainId */,
        bytes32 /* userIdentifier */,
        bytes memory /* userDefinedData */
    ) public view override returns (bytes32) {
        return verificationConfigId;
    }

    /**
     * @notice Check if user is compliant
     */
    function isUserCompliant(address user) external view returns (bool) {
        return userCompliance[user].isCompliant;
    }

    /**
     * @notice Check if user is verified human
     */
    function isVerifiedHuman(address user) external view returns (bool) {
        return verifiedHumans[user];
    }

    /**
     * @notice Get user compliance data
     */
    function getUserCompliance(address user) external view returns (UserCompliance memory) {
        return userCompliance[user];
    }

    /**
     * @notice Get user's disclosed nationality
     */
    function getUserNationality(address user) external view returns (string memory) {
        return userCompliance[user].nationality;
    }

    /**
     * @notice Get user's disclosed issuing state
     */
    function getUserIssuingState(address user) external view returns (string memory) {
        return userCompliance[user].issuingState;
    }

    /**
     * @notice Get user's disclosed name
     */
    function getUserName(address user) external view returns (string[] memory) {
        return userCompliance[user].name;
    }

    /**
     * @notice Get user's disclosed date of birth
     */
    function getUserDateOfBirth(address user) external view returns (string memory) {
        return userCompliance[user].dateOfBirth;
    }

    /**
     * @notice Get user's disclosed gender
     */
    function getUserGender(address user) external view returns (string memory) {
        return userCompliance[user].gender;
    }

    /**
     * @notice Get user's age verification result
     */
    function getUserAgeVerification(address user) external view returns (uint256) {
        return userCompliance[user].olderThan;
    }

    /**
     * @notice Get user's OFAC verification result
     */
    function getUserOfacVerification(address user) external view returns (bool[3] memory) {
        return userCompliance[user].ofac;
    }

    /**
     * @notice Get total compliant users
     */
    function getTotalCompliantUsers() external view returns (uint256) {
        return totalCompliantUsers;
    }

    /**
     * @notice Simple verification function for backward compatibility
     * @dev This function is called by Self.xyz to verify compliance
     */
    function verifyCompliance(
        address user,
        string memory nationality,
        uint8 documentType
    ) external onlyOwner {
        require(user != address(0), "Invalid user address");
        require(bytes(nationality).length > 0, "Invalid nationality");
        require(documentType > 0, "Invalid document type");

        // Create hash of verification data
        bytes32 dataHash = keccak256(abi.encodePacked(
            user,
            nationality,
            documentType,
            block.timestamp
        ));

        // Prevent duplicate verifications
        require(!usedHashes[dataHash], "Data hash already used");
        usedHashes[dataHash] = true;

        // Store compliance data with minimal information for manual verification
        string[] memory emptyNames = new string[](0);
        userCompliance[user] = UserCompliance({
            dataHash: dataHash,
            timestamp: block.timestamp,
            isCompliant: true,
            nationality: nationality,
            issuingState: "", // Not available in manual verification
            name: emptyNames,
            idNumber: "",
            dateOfBirth: "",
            gender: "",
            expiryDate: "",
            olderThan: 0,
            ofac: [false, false, false],
            documentType: documentType
        });

        // Mark as verified human
        verifiedHumans[user] = true;
        totalCompliantUsers++;

        emit ComplianceVerified(user, dataHash, nationality, documentType, block.timestamp);
    }

    /**
     * @notice Simple verification function without parameters for Self.xyz compatibility
     * @dev This function emits a VerificationCompleted event with dummy data
     */
    function verifyCompliance() external {
        // This is a placeholder function for Self.xyz compatibility
        // The actual verification happens through the Self.xyz Hub via customVerificationHook
        string[] memory emptyNames = new string[](0);
        ISelfVerificationRoot.GenericDiscloseOutputV2 memory dummyOutput = 
            ISelfVerificationRoot.GenericDiscloseOutputV2({
                attestationId: bytes32(0),
                userIdentifier: uint256(uint160(msg.sender)),
                nullifier: uint256(0),
                forbiddenCountriesListPacked: [uint256(0), uint256(0), uint256(0), uint256(0)],
                issuingState: "UNKNOWN",
                name: emptyNames,
                idNumber: "",
                nationality: "UNKNOWN",
                dateOfBirth: "",
                gender: "",
                expiryDate: "",
                olderThan: 0,
                ofac: [false, false, false]
            });
        
        emit VerificationCompleted(dummyOutput, "");
    }

    /**
     * @notice Update verification config ID (owner only)
     */
    function setVerificationConfigId(bytes32 _configId) external onlyOwner {
        verificationConfigId = _configId;
    }

    /**
     * @notice Transfer ownership
     */
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Invalid new owner");
        owner = newOwner;
    }
}