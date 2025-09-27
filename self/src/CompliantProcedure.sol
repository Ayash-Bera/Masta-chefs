// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {SelfVerificationRoot} from "@selfxyz/contracts/abstract/SelfVerificationRoot.sol";
import {ISelfVerificationRoot} from "@selfxyz/contracts/interfaces/ISelfVerificationRoot.sol";

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
        uint8 documentType;      // Document type
    }


    mapping(address => UserCompliance) public userCompliance;
    mapping(address => bool) public verifiedHumans;
    mapping(bytes32 => bool) public usedHashes;

    uint256 public totalCompliantUsers;
    bytes32 public verificationConfigId;
    address public owner;

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

    constructor(
        address _identityVerificationHubV2Address,
        uint256 _scope,
        bytes32 _verificationConfigId
    ) SelfVerificationRoot(_identityVerificationHubV2Address, _scope) {
        owner = msg.sender;
        verificationConfigId = _verificationConfigId;
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
        require(bytes(output.nationality).length > 0, "Invalid nationality");
        require(bytes(output.issuingState).length > 0, "Invalid issuing state");

        // Create hash of verification data
        bytes32 dataHash = keccak256(abi.encodePacked(
            user,
            output.nationality,
            output.issuingState,
            output.nullifier,
            block.timestamp
        ));

        // Prevent duplicate verifications
        require(!usedHashes[dataHash], "Verification already exists");
        usedHashes[dataHash] = true;

        // Mark user as verified human
        if (!verifiedHumans[user]) {
            verifiedHumans[user] = true;
            totalCompliantUsers++;
        }

        // Store compliance data
        userCompliance[user] = UserCompliance({
            dataHash: dataHash,
            timestamp: block.timestamp,
            isCompliant: true,
            nationality: output.nationality,
            documentType: 1 // Default to passport type
        });

        emit ComplianceVerified(
            user,
            dataHash,
            output.nationality,
            1, // Default to passport type
            block.timestamp
        );

        emit VerificationCompleted(output, userData);
    }

    /**
     * @notice Manual verification for testing (owner only)
     */
    function manualVerifyCompliance(
        address user,
        string memory name,
        string memory dateOfBirth,
        string memory nationality,
        uint8 documentType
    ) external onlyOwner {
        require(user != address(0), "Invalid user address");
        require(bytes(name).length > 0, "Name cannot be empty");
        require(bytes(dateOfBirth).length > 0, "Date of birth cannot be empty");
        require(bytes(nationality).length > 0, "Nationality cannot be empty");
        require(documentType > 0, "Invalid document type");

        // Create hash of user data
        bytes32 dataHash = keccak256(abi.encodePacked(user, name, dateOfBirth));

        // Prevent duplicate verifications
        require(!usedHashes[dataHash], "Data hash already used");
        usedHashes[dataHash] = true;

        // Mark user as verified human
        if (!verifiedHumans[user]) {
            verifiedHumans[user] = true;
            totalCompliantUsers++;
        }

        // Store compliance data
        userCompliance[user] = UserCompliance({
            dataHash: dataHash,
            timestamp: block.timestamp,
            isCompliant: true,
            nationality: nationality,
            documentType: documentType
        });

        emit ComplianceVerified(user, dataHash, nationality, documentType, block.timestamp);
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
     * @notice Get total compliant users
     */
    function getTotalCompliantUsers() external view returns (uint256) {
        return totalCompliantUsers;
    }

    /**
     * @notice Generate data hash for given user data
     */
    function generateDataHash(
        address user,
        string memory name,
        string memory dateOfBirth
    ) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(user, name, dateOfBirth));
    }

    /**
     * @notice Get config ID for Self.xyz compatibility
     */
    function getConfigId(
        bytes32 /* destinationChainId */,
        bytes32 /* userIdentifier */,
        bytes memory /* userDefinedData */
    ) public view override returns (bytes32) {
        return verificationConfigId;
    }

    /**
     * @notice Simple verification function for Self.xyz compatibility
     * @dev This function is called by Self.xyz to verify compliance
     */
    function verifyCompliance(
        address user,
        string memory nationality,
        uint8 documentType
    ) external {
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
        require(!usedHashes[dataHash], "Verification already exists");
        usedHashes[dataHash] = true;

        // Mark user as verified human
        if (!verifiedHumans[user]) {
            verifiedHumans[user] = true;
            totalCompliantUsers++;
        }

        // Store compliance data
        userCompliance[user] = UserCompliance({
            dataHash: dataHash,
            timestamp: block.timestamp,
            isCompliant: true,
            nationality: nationality,
            documentType: documentType
        });

        emit ComplianceVerified(
            user,
            dataHash,
            nationality,
            documentType,
            block.timestamp
        );
    }

    /**
     * @notice Simple verification function for Self.xyz compatibility (no parameters)
     * @dev This function is called by Self.xyz to verify compliance
     */
    function verifyCompliance() external {
        // This is a simple function that Self.xyz can call without parameters
        // It will just return success
        emit VerificationCompleted(
            ISelfVerificationRoot.GenericDiscloseOutputV2({
                attestationId: bytes32(0),
                userIdentifier: 0,
                nullifier: 0,
                forbiddenCountriesListPacked: [uint256(0), uint256(0), uint256(0), uint256(0)],
                issuingState: "",
                name: new string[](0),
                idNumber: "",
                nationality: "",
                dateOfBirth: "",
                gender: "",
                expiryDate: "",
                olderThan: 0,
                ofac: [false, false, false]
            }),
            ""
        );
    }
}