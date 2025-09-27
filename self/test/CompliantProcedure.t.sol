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

        compliantProcedure = new CompliantProcedure();
    }

    function test_InitialState() public view {
        assertEq(compliantProcedure.getTotalCompliantUsers(), 0);
        assertEq(compliantProcedure.owner(), owner);
    }

    function test_ManualVerifyCompliance_Success() public {
        bytes32 expectedHash = keccak256(abi.encodePacked(user1, TEST_NAME, TEST_DOB));

        vm.expectEmit(true, true, false, true);
        emit ComplianceVerified(user1, expectedHash, TEST_NATIONALITY, TEST_DOC_TYPE, block.timestamp);

        compliantProcedure.manualVerifyCompliance(user1, TEST_NAME, TEST_DOB, TEST_NATIONALITY, TEST_DOC_TYPE);

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
        compliantProcedure.manualVerifyCompliance(user1, TEST_NAME, TEST_DOB, TEST_NATIONALITY, TEST_DOC_TYPE);
    }

    function test_ManualVerifyCompliance_RevertInvalidAddress() public {
        vm.expectRevert("Invalid user address");
        compliantProcedure.manualVerifyCompliance(address(0), TEST_NAME, TEST_DOB, TEST_NATIONALITY, TEST_DOC_TYPE);
    }

    function test_ManualVerifyCompliance_RevertEmptyName() public {
        vm.expectRevert("Name cannot be empty");
        compliantProcedure.manualVerifyCompliance(user1, "", TEST_DOB, TEST_NATIONALITY, TEST_DOC_TYPE);
    }

    function test_ManualVerifyCompliance_RevertEmptyDOB() public {
        vm.expectRevert("Date of birth cannot be empty");
        compliantProcedure.manualVerifyCompliance(user1, TEST_NAME, "", TEST_NATIONALITY, TEST_DOC_TYPE);
    }

    function test_ManualVerifyCompliance_RevertEmptyNationality() public {
        vm.expectRevert("Nationality cannot be empty");
        compliantProcedure.manualVerifyCompliance(user1, TEST_NAME, TEST_DOB, "", TEST_DOC_TYPE);
    }

    function test_ManualVerifyCompliance_RevertInvalidDocType() public {
        vm.expectRevert("Invalid document type");
        compliantProcedure.manualVerifyCompliance(user1, TEST_NAME, TEST_DOB, TEST_NATIONALITY, 0);
    }

    function test_ManualVerifyCompliance_RevertDuplicateHash() public {
        // First verification should succeed
        compliantProcedure.manualVerifyCompliance(user1, TEST_NAME, TEST_DOB, TEST_NATIONALITY, TEST_DOC_TYPE);

        // Second verification with same data should fail
        vm.expectRevert("Data hash already used");
        compliantProcedure.manualVerifyCompliance(user1, TEST_NAME, TEST_DOB, TEST_NATIONALITY, TEST_DOC_TYPE);
    }

    function test_MultipleUsers() public {
        // Verify multiple users
        compliantProcedure.manualVerifyCompliance(user1, TEST_NAME, TEST_DOB, TEST_NATIONALITY, TEST_DOC_TYPE);
        compliantProcedure.manualVerifyCompliance(user2, "Jane Smith", "1985-05-15", "CA", 2);

        assertEq(compliantProcedure.getTotalCompliantUsers(), 2);
        assertTrue(compliantProcedure.isUserCompliant(user1));
        assertTrue(compliantProcedure.isUserCompliant(user2));
        assertTrue(compliantProcedure.isVerifiedHuman(user1));
        assertTrue(compliantProcedure.isVerifiedHuman(user2));
    }

    function test_GenerateDataHash() public view {
        bytes32 hash1 = compliantProcedure.generateDataHash(user1, TEST_NAME, TEST_DOB);
        bytes32 hash2 = keccak256(abi.encodePacked(user1, TEST_NAME, TEST_DOB));

        assertEq(hash1, hash2);
    }

    function test_GetConfigId() public view {
        bytes32 configId = compliantProcedure.getConfigId(bytes32(0), bytes32(0), "");
        assertEq(configId, 0x0000000000000000000000000000000000000000000000000000000000000001);
    }

    function testFuzz_ManualVerifyCompliance(address user, string memory name, string memory dob, string memory nationality) public {
        vm.assume(user != address(0));
        vm.assume(bytes(name).length > 0 && bytes(name).length < 100);
        vm.assume(bytes(dob).length > 0 && bytes(dob).length < 50);
        vm.assume(bytes(nationality).length > 0 && bytes(nationality).length < 10);

        compliantProcedure.manualVerifyCompliance(user, name, dob, nationality, 1);

        assertTrue(compliantProcedure.isUserCompliant(user));
        assertTrue(compliantProcedure.isVerifiedHuman(user));
        assertEq(compliantProcedure.getTotalCompliantUsers(), 1);
    }
}