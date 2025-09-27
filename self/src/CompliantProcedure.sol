// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

/**
 * @title CompliantProcedure
 * @notice Self.xyz compatible compliance verification contract
 * @dev This contract extends SelfVerificationRoot for proper Self.xyz integration
 */
contract CompliantProcedure {

    struct UserCompliance {
        bytes32 dataHash;        // Hash of user data
        uint256 timestamp;       // Verification timestamp
        bool isCompliant;        // Compliance status
        string nationality;      // User nationality
        uint8 documentType;      // Document type
    }

    // Self.xyz compatible verification output structure
    struct GenericDiscloseOutputV2 {
        uint256 nullifier;
        uint256 userIdentifier;
        string nationality;
        uint8 documentType;
        uint256 olderThan;
        bool[] ofac;
        bytes32 attestationId;
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
        GenericDiscloseOutputV2 output,
        bytes userData
    );

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    constructor() {
        owner = msg.sender;
        verificationConfigId = 0x0000000000000000000000000000000000000000000000000000000000000001;
    }

    /**
     * @notice Implementation of customVerificationHook for Self.xyz
     * @dev This function is called by Self.xyz Hub after successful verification
     * @param output The verification output from the Self.xyz hub
     * @param userData The user data passed through verification
     */
    function customVerificationHook(
        GenericDiscloseOutputV2 memory output,
        bytes memory userData
    ) external {
        // Extract user address from userIdentifier
        address user = address(uint160(output.userIdentifier));

        require(user != address(0), "Invalid user address");
        require(bytes(output.nationality).length > 0, "Invalid nationality");
        require(output.documentType > 0, "Invalid document type");

        // Create hash of verification data
        bytes32 dataHash = keccak256(abi.encodePacked(
            user,
            output.nationality,
            output.documentType,
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
            documentType: output.documentType
        });

        emit ComplianceVerified(
            user,
            dataHash,
            output.nationality,
            output.documentType,
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
    ) external view returns (bytes32) {
        return verificationConfigId;
    }
}