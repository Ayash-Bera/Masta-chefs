// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface ICompliantProcedure {
    struct UserCompliance {
        bytes32 dataHash;        // Hash of (address + name + dob)
        uint256 timestamp;       // Verification timestamp
        bool isCompliant;        // Compliance status
        string nationality;      // User nationality from Self.xyz
        uint8 documentType;      // Document type from Self.xyz
    }

    event ComplianceVerified(
        address indexed user,
        bytes32 indexed dataHash,
        string nationality,
        uint8 documentType,
        uint256 timestamp
    );

    event ComplianceRevoked(
        address indexed user,
        uint256 timestamp
    );

    function verifyCompliance(
        address user,
        string memory name,
        string memory dateOfBirth,
        string memory nationality,
        uint8 documentType
    ) external;

    function revokeCompliance(address user) external;

    function isUserCompliant(address user) external view returns (bool);

    function getUserCompliance(address user) external view returns (UserCompliance memory);

    function getUserDataHash(address user) external view returns (bytes32);

    function isHashUsed(bytes32 hash) external view returns (bool);

    function getTotalCompliantUsers() external view returns (uint256);
}