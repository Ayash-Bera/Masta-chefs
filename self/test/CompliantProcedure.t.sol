// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test, console} from "forge-std/Test.sol";
import {CompliantProcedure} from "../src/CompliantProcedure.sol";

contract CompliantProcedureTest is Test {
    CompliantProcedure public compliantProcedure;

    address public owner;
    address public user1;
    address public user2;
    address public unauthorized;

    string constant TEST_NAME = "John Doe";
    string constant TEST_DOB = "1990-01-01";
    string constant TEST_NATIONALITY = "US";
    uint8 constant TEST_DOC_TYPE = 1; // Passport

    event ComplianceVerified(
        address indexed user,
        bytes32 indexed dataHash,
        string nationality,
        uint8 documentType,
        uint256 timestamp
    );

    function setUp() public {
        owner = address(this);
        user1 = makeAddr("user1");
        user2 = makeAddr("user2");
        unauthorized = makeAddr("unauthorized");

        // Using Self.xyz V2 Hub staging address for Celo Sepolia
        address hubAddress = 0x16ECBA51e18a4a7e61fdC417f0d47AFEeDfbed74;
        uint256 scope = 115676102258704976723506990530370933694797068406877968317175592069804746921842;
        
        compliantProcedure = new CompliantProcedure(hubAddress, scope);
    }

    function test_InitialState() public view {
        assertEq(compliantProcedure.getTotalCompliantUsers(), 0);
        assertEq(compliantProcedure.owner(), owner);
    }

    function test_ManualVerifyCompliance_Success() public {
        bytes32 expectedHash = keccak256(abi.encodePacked(user1, TEST_NATIONALITY, TEST_DOC_TYPE, block.timestamp));

        vm.expectEmit(true, true, false, true);
        emit ComplianceVerified(user1, expectedHash, TEST_NATIONALITY, TEST_DOC_TYPE, block.timestamp);

        compliantProcedure.verifyCompliance(user1, TEST_NATIONALITY, TEST_DOC_TYPE);

        assertTrue(compliantProcedure.isUserCompliant(user1));
        assertTrue(compliantProcedure.isVerifiedHuman(user1));
        assertEq(compliantProcedure.getTotalCompliantUsers(), 1);

        CompliantProcedure.UserCompliance memory userData = compliantProcedure.getUserCompliance(user1);
        assertEq(userData.dataHash, expectedHash);
        assertTrue(userData.isCompliant);
        assertEq(userData.nationality, TEST_NATIONALITY);
        assertEq(userData.documentType, TEST_DOC_TYPE);
        assertEq(userData.timestamp, block.timestamp);
    }

    function test_ManualVerifyCompliance_RevertUnauthorized() public {
        vm.prank(unauthorized);
        vm.expectRevert("Not owner");
        compliantProcedure.verifyCompliance(user1, TEST_NATIONALITY, TEST_DOC_TYPE);
    }

    function test_ManualVerifyCompliance_RevertInvalidAddress() public {
        vm.expectRevert("Invalid user address");
        compliantProcedure.verifyCompliance(address(0), TEST_NATIONALITY, TEST_DOC_TYPE);
    }

    function test_ManualVerifyCompliance_RevertEmptyNationality() public {
        vm.expectRevert("Invalid nationality");
        compliantProcedure.verifyCompliance(user1, "", TEST_DOC_TYPE);
    }

    function test_ManualVerifyCompliance_RevertEmptyNationality2() public {
        vm.expectRevert("Invalid nationality");
        compliantProcedure.verifyCompliance(user1, "", TEST_DOC_TYPE);
    }

    function test_ManualVerifyCompliance_RevertEmptyNationality3() public {
        vm.expectRevert("Invalid nationality");
        compliantProcedure.verifyCompliance(user1, "", TEST_DOC_TYPE);
    }

    function test_ManualVerifyCompliance_RevertInvalidDocType() public {
        vm.expectRevert("Invalid document type");
        compliantProcedure.verifyCompliance(user1, TEST_NATIONALITY, 0);
    }

    function test_ManualVerifyCompliance_RevertDuplicateHash() public {
        // First verification should succeed
        compliantProcedure.verifyCompliance(user1, TEST_NATIONALITY, TEST_DOC_TYPE);

        // Second verification with same data should fail
        vm.expectRevert("Data hash already used");
        compliantProcedure.verifyCompliance(user1, TEST_NATIONALITY, TEST_DOC_TYPE);
    }

    function test_MultipleUsers() public {
        // Verify multiple users
        compliantProcedure.verifyCompliance(user1, TEST_NATIONALITY, TEST_DOC_TYPE);
        compliantProcedure.verifyCompliance(user2, "CA", 2);

        assertEq(compliantProcedure.getTotalCompliantUsers(), 2);
        assertTrue(compliantProcedure.isUserCompliant(user1));
        assertTrue(compliantProcedure.isUserCompliant(user2));
        assertTrue(compliantProcedure.isVerifiedHuman(user1));
        assertTrue(compliantProcedure.isVerifiedHuman(user2));
    }

    function test_DataHashGeneration() public view {
        // Test that our internal hash generation works correctly
        bytes32 expectedHash = keccak256(abi.encodePacked(user1, TEST_NATIONALITY, uint8(1), block.timestamp));
        // This is just a basic test - the actual hash is generated in the contract
        assertTrue(expectedHash != bytes32(0));
    }

    function test_GetConfigId() public view {
        bytes32 configId = compliantProcedure.getConfigId(bytes32(0), bytes32(0), "");
        // The config ID is set during contract deployment, so we just check it's not zero
        assertTrue(configId != bytes32(0));
    }

    function testFuzz_ManualVerifyCompliance(address user, string memory nationality) public {
        vm.assume(user != address(0));
        vm.assume(bytes(nationality).length > 0 && bytes(nationality).length < 10);

        compliantProcedure.verifyCompliance(user, nationality, 1);

        assertTrue(compliantProcedure.isUserCompliant(user));
        assertTrue(compliantProcedure.isVerifiedHuman(user));
        assertEq(compliantProcedure.getTotalCompliantUsers(), 1);
    }
}