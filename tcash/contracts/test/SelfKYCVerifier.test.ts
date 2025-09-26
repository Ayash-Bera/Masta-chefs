import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { getAddress, parseEther, keccak256, toBytes } from "viem";

describe("SelfKYCVerifier", function () {
  // Test configuration constants
  const TEST_CONFIG = {
    configId: 1,
    scope: "test-kyc-v1",
    requireOfacCheck: true,
    minimumAge: 18,
    excludedCountries: ["CN", "IR"],
    allowedDocumentTypes: [1, 2], // E-Passport, EU ID Card
  };

  // Mock extracted attributes for testing
  const MOCK_ATTRS = {
    nationality: "US",
    documentType: 1, // E-Passport
    ageAtLeast: 25,
    isOfacMatch: false,
  };

  async function deployKYCVerifierFixture() {
    const [owner, user1, user2, user3] = await hre.viem.getWalletClients();
    const publicClient = await hre.viem.getPublicClient();

    // Deploy the contract
    const selfKYCVerifier = await hre.viem.deployContract("SelfKYCVerifier", [
      TEST_CONFIG.configId,
      TEST_CONFIG.scope,
      TEST_CONFIG.requireOfacCheck,
      TEST_CONFIG.minimumAge,
      TEST_CONFIG.excludedCountries,
      TEST_CONFIG.allowedDocumentTypes,
    ]);

    return {
      selfKYCVerifier,
      owner,
      user1,
      user2,
      user3,
      publicClient,
    };
  }

  describe("Deployment", function () {
    it("Should deploy with correct initial configuration", async function () {
      const { selfKYCVerifier } = await loadFixture(deployKYCVerifierFixture);

      const config = await selfKYCVerifier.read.getConfiguration();

      expect(config.configId).to.equal(BigInt(TEST_CONFIG.configId));
      expect(config.scope).to.equal(TEST_CONFIG.scope);
      expect(config.requireOfacCheck).to.equal(TEST_CONFIG.requireOfacCheck);
      expect(config.minimumAge).to.equal(BigInt(TEST_CONFIG.minimumAge));
      expect(config.isActive).to.equal(true);
    });

    it("Should set correct owner", async function () {
      const { selfKYCVerifier, owner } = await loadFixture(deployKYCVerifierFixture);

      const contractOwner = await selfKYCVerifier.read.owner();
      expect(contractOwner.toLowerCase()).to.equal(owner.account.address.toLowerCase());
    });

    it("Should initialize statistics to zero", async function () {
      const { selfKYCVerifier } = await loadFixture(deployKYCVerifierFixture);

      const [totalVerifications, uniqueUsers] = await selfKYCVerifier.read.getStatistics();
      expect(totalVerifications).to.equal(0n);
      expect(uniqueUsers).to.equal(0n);
    });
  });

  describe("KYC Verification", function () {
    it("Should verify user successfully with valid proof", async function () {
      const { selfKYCVerifier, user1 } = await loadFixture(deployKYCVerifierFixture);

      const nullifier = BigInt(keccak256(toBytes("test-nullifier-1")));
      const userIdentifier = BigInt(keccak256(toBytes("test-user-1")));
      const mockProof = "0x1234567890abcdef";

      // Note: In real implementation, this would call the Self verification root
      // For testing, we'll simulate successful verification
      const verifyTx = await selfKYCVerifier.write.verify([
        nullifier,
        userIdentifier,
        MOCK_ATTRS,
        mockProof as `0x${string}`,
      ], { account: user1.account });

      await expect(verifyTx).to.not.be.reverted;

      // Check user KYC data
      const kycData = await selfKYCVerifier.read.getKYCData([user1.account.address]);
      expect(kycData.isVerified).to.equal(true);
      expect(kycData.nationality).to.equal(MOCK_ATTRS.nationality);
      expect(kycData.documentType).to.equal(MOCK_ATTRS.documentType);
      expect(kycData.isOfacClear).to.equal(!MOCK_ATTRS.isOfacMatch);
    });

    it("Should prevent duplicate verification with same nullifier", async function () {
      const { selfKYCVerifier, user1, user2 } = await loadFixture(deployKYCVerifierFixture);

      const nullifier = BigInt(keccak256(toBytes("test-nullifier-1")));
      const userIdentifier1 = BigInt(keccak256(toBytes("test-user-1")));
      const userIdentifier2 = BigInt(keccak256(toBytes("test-user-2")));
      const mockProof = "0x1234567890abcdef";

      // First verification should succeed
      await selfKYCVerifier.write.verify([
        nullifier,
        userIdentifier1,
        MOCK_ATTRS,
        mockProof as `0x${string}`,
      ], { account: user1.account });

      // Second verification with same nullifier should fail
      await expect(
        selfKYCVerifier.write.verify([
          nullifier,
          userIdentifier2,
          MOCK_ATTRS,
          mockProof as `0x${string}`,
        ], { account: user2.account })
      ).to.be.revertedWith("SelfKYCVerifier: Nullifier already used");
    });

    it("Should reject verification for excluded countries", async function () {
      const { selfKYCVerifier, user1 } = await loadFixture(deployKYCVerifierFixture);

      const nullifier = BigInt(keccak256(toBytes("test-nullifier-1")));
      const userIdentifier = BigInt(keccak256(toBytes("test-user-1")));
      const mockProof = "0x1234567890abcdef";

      const excludedAttrs = {
        ...MOCK_ATTRS,
        nationality: "CN", // Excluded country
      };

      await expect(
        selfKYCVerifier.write.verify([
          nullifier,
          userIdentifier,
          excludedAttrs,
          mockProof as `0x${string}`,
        ], { account: user1.account })
      ).to.be.revertedWith("SelfKYCVerifier: Nationality not allowed");
    });

    it("Should reject verification for underage users", async function () {
      const { selfKYCVerifier, user1 } = await loadFixture(deployKYCVerifierFixture);

      const nullifier = BigInt(keccak256(toBytes("test-nullifier-1")));
      const userIdentifier = BigInt(keccak256(toBytes("test-user-1")));
      const mockProof = "0x1234567890abcdef";

      const underageAttrs = {
        ...MOCK_ATTRS,
        ageAtLeast: 17, // Below minimum age
      };

      await expect(
        selfKYCVerifier.write.verify([
          nullifier,
          userIdentifier,
          underageAttrs,
          mockProof as `0x${string}`,
        ], { account: user1.account })
      ).to.be.revertedWith("SelfKYCVerifier: Age requirement not met");
    });

    it("Should reject verification for OFAC matches when required", async function () {
      const { selfKYCVerifier, user1 } = await loadFixture(deployKYCVerifierFixture);

      const nullifier = BigInt(keccak256(toBytes("test-nullifier-1")));
      const userIdentifier = BigInt(keccak256(toBytes("test-user-1")));
      const mockProof = "0x1234567890abcdef";

      const ofacAttrs = {
        ...MOCK_ATTRS,
        isOfacMatch: true, // OFAC match
      };

      await expect(
        selfKYCVerifier.write.verify([
          nullifier,
          userIdentifier,
          ofacAttrs,
          mockProof as `0x${string}`,
        ], { account: user1.account })
      ).to.be.revertedWith("SelfKYCVerifier: OFAC check failed");
    });

    it("Should reject verification for disallowed document types", async function () {
      const { selfKYCVerifier, user1 } = await loadFixture(deployKYCVerifierFixture);

      const nullifier = BigInt(keccak256(toBytes("test-nullifier-1")));
      const userIdentifier = BigInt(keccak256(toBytes("test-user-1")));
      const mockProof = "0x1234567890abcdef";

      const invalidDocAttrs = {
        ...MOCK_ATTRS,
        documentType: 3, // Aadhaar - not in allowed types
      };

      await expect(
        selfKYCVerifier.write.verify([
          nullifier,
          userIdentifier,
          invalidDocAttrs,
          mockProof as `0x${string}`,
        ], { account: user1.account })
      ).to.be.revertedWith("SelfKYCVerifier: Document type not allowed");
    });
  });

  describe("Statistics and Tracking", function () {
    it("Should update statistics correctly on verification", async function () {
      const { selfKYCVerifier, user1, user2 } = await loadFixture(deployKYCVerifierFixture);

      // Initial statistics
      let [totalVerifications, uniqueUsers] = await selfKYCVerifier.read.getStatistics();
      expect(totalVerifications).to.equal(0n);
      expect(uniqueUsers).to.equal(0n);

      // First verification
      const nullifier1 = BigInt(keccak256(toBytes("test-nullifier-1")));
      const userIdentifier1 = BigInt(keccak256(toBytes("test-user-1")));
      const mockProof = "0x1234567890abcdef";

      await selfKYCVerifier.write.verify([
        nullifier1,
        userIdentifier1,
        MOCK_ATTRS,
        mockProof as `0x${string}`,
      ], { account: user1.account });

      [totalVerifications, uniqueUsers] = await selfKYCVerifier.read.getStatistics();
      expect(totalVerifications).to.equal(1n);
      expect(uniqueUsers).to.equal(1n);

      // Second verification by different user
      const nullifier2 = BigInt(keccak256(toBytes("test-nullifier-2")));
      const userIdentifier2 = BigInt(keccak256(toBytes("test-user-2")));

      await selfKYCVerifier.write.verify([
        nullifier2,
        userIdentifier2,
        MOCK_ATTRS,
        mockProof as `0x${string}`,
      ], { account: user2.account });

      [totalVerifications, uniqueUsers] = await selfKYCVerifier.read.getStatistics();
      expect(totalVerifications).to.equal(2n);
      expect(uniqueUsers).to.equal(2n);
    });

    it("Should track nullifier to user mapping correctly", async function () {
      const { selfKYCVerifier, user1 } = await loadFixture(deployKYCVerifierFixture);

      const nullifier = BigInt(keccak256(toBytes("test-nullifier-1")));
      const userIdentifier = BigInt(keccak256(toBytes("test-user-1")));
      const mockProof = "0x1234567890abcdef";

      await selfKYCVerifier.write.verify([
        nullifier,
        userIdentifier,
        MOCK_ATTRS,
        mockProof as `0x${string}`,
      ], { account: user1.account });

      const userFromNullifier = await selfKYCVerifier.read.getUserFromNullifier([nullifier]);
      expect(userFromNullifier.toLowerCase()).to.equal(user1.account.address.toLowerCase());

      const nullifierUsed = await selfKYCVerifier.read.isNullifierUsed([nullifier]);
      expect(nullifierUsed).to.equal(true);
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to update configuration", async function () {
      const { selfKYCVerifier, owner } = await loadFixture(deployKYCVerifierFixture);

      const newConfig = {
        configId: 2,
        scope: "updated-kyc-v1",
        requireOfacCheck: false,
        minimumAge: 21,
        excludedCountries: ["RU"],
        allowedDocumentTypes: [1, 2, 3],
      };

      await selfKYCVerifier.write.updateConfiguration([
        newConfig.configId,
        newConfig.scope,
        newConfig.requireOfacCheck,
        newConfig.minimumAge,
        newConfig.excludedCountries,
        newConfig.allowedDocumentTypes,
      ], { account: owner.account });

      const updatedConfig = await selfKYCVerifier.read.getConfiguration();
      expect(updatedConfig.configId).to.equal(BigInt(newConfig.configId));
      expect(updatedConfig.scope).to.equal(newConfig.scope);
      expect(updatedConfig.requireOfacCheck).to.equal(newConfig.requireOfacCheck);
      expect(updatedConfig.minimumAge).to.equal(BigInt(newConfig.minimumAge));
    });

    it("Should not allow non-owner to update configuration", async function () {
      const { selfKYCVerifier, user1 } = await loadFixture(deployKYCVerifierFixture);

      await expect(
        selfKYCVerifier.write.updateConfiguration([
          2,
          "unauthorized-update",
          false,
          21,
          [],
          [1, 2, 3],
        ], { account: user1.account })
      ).to.be.revertedWith("OwnableUnauthorizedAccount");
    });

    it("Should allow owner to revoke KYC", async function () {
      const { selfKYCVerifier, owner, user1 } = await loadFixture(deployKYCVerifierFixture);

      // First, verify the user
      const nullifier = BigInt(keccak256(toBytes("test-nullifier-1")));
      const userIdentifier = BigInt(keccak256(toBytes("test-user-1")));
      const mockProof = "0x1234567890abcdef";

      await selfKYCVerifier.write.verify([
        nullifier,
        userIdentifier,
        MOCK_ATTRS,
        mockProof as `0x${string}`,
      ], { account: user1.account });

      // Verify the user is verified
      let kycData = await selfKYCVerifier.read.getKYCData([user1.account.address]);
      expect(kycData.isVerified).to.equal(true);

      // Revoke KYC
      await selfKYCVerifier.write.revokeKYC([
        user1.account.address,
        "Test revocation"
      ], { account: owner.account });

      // Verify the user is no longer verified
      kycData = await selfKYCVerifier.read.getKYCData([user1.account.address]);
      expect(kycData.isVerified).to.equal(false);

      // Check that nullifier is cleared
      const nullifierUsed = await selfKYCVerifier.read.isNullifierUsed([nullifier]);
      expect(nullifierUsed).to.equal(false);
    });

    it("Should allow owner to pause and unpause contract", async function () {
      const { selfKYCVerifier, owner, user1 } = await loadFixture(deployKYCVerifierFixture);

      // Pause the contract
      await selfKYCVerifier.write.pause([], { account: owner.account });

      // Try to verify while paused - should fail
      const nullifier = BigInt(keccak256(toBytes("test-nullifier-1")));
      const userIdentifier = BigInt(keccak256(toBytes("test-user-1")));
      const mockProof = "0x1234567890abcdef";

      await expect(
        selfKYCVerifier.write.verify([
          nullifier,
          userIdentifier,
          MOCK_ATTRS,
          mockProof as `0x${string}`,
        ], { account: user1.account })
      ).to.be.revertedWith("EnforcedPause");

      // Unpause the contract
      await selfKYCVerifier.write.unpause([], { account: owner.account });

      // Verification should work again
      await expect(
        selfKYCVerifier.write.verify([
          nullifier,
          userIdentifier,
          MOCK_ATTRS,
          mockProof as `0x${string}`,
        ], { account: user1.account })
      ).to.not.be.reverted;
    });

    it("Should handle emergency stop correctly", async function () {
      const { selfKYCVerifier, owner, user1 } = await loadFixture(deployKYCVerifierFixture);

      // Activate emergency stop
      await selfKYCVerifier.write.activateEmergencyStop([], { account: owner.account });

      // Try to verify during emergency - should fail
      const nullifier = BigInt(keccak256(toBytes("test-nullifier-1")));
      const userIdentifier = BigInt(keccak256(toBytes("test-user-1")));
      const mockProof = "0x1234567890abcdef";

      await expect(
        selfKYCVerifier.write.verify([
          nullifier,
          userIdentifier,
          MOCK_ATTRS,
          mockProof as `0x${string}`,
        ], { account: user1.account })
      ).to.be.revertedWith("SelfKYCVerifier: Emergency stop activated");

      // Deactivate emergency stop
      await selfKYCVerifier.write.deactivateEmergencyStop([], { account: owner.account });

      // Verification should work again
      await expect(
        selfKYCVerifier.write.verify([
          nullifier,
          userIdentifier,
          MOCK_ATTRS,
          mockProof as `0x${string}`,
        ], { account: user1.account })
      ).to.not.be.reverted;
    });
  });

  describe("View Functions", function () {
    it("Should return correct KYC verification status", async function () {
      const { selfKYCVerifier, user1, user2 } = await loadFixture(deployKYCVerifierFixture);

      // Check unverified user
      const isVerified1Before = await selfKYCVerifier.read.isKYCVerified([user1.account.address]);
      expect(isVerified1Before).to.equal(false);

      // Verify user1
      const nullifier = BigInt(keccak256(toBytes("test-nullifier-1")));
      const userIdentifier = BigInt(keccak256(toBytes("test-user-1")));
      const mockProof = "0x1234567890abcdef";

      await selfKYCVerifier.write.verify([
        nullifier,
        userIdentifier,
        MOCK_ATTRS,
        mockProof as `0x${string}`,
      ], { account: user1.account });

      // Check verified user
      const isVerified1After = await selfKYCVerifier.read.isKYCVerified([user1.account.address]);
      expect(isVerified1After).to.equal(true);

      // Check still unverified user2
      const isVerified2 = await selfKYCVerifier.read.isKYCVerified([user2.account.address]);
      expect(isVerified2).to.equal(false);
    });

    it("Should reject invalid user addresses", async function () {
      const { selfKYCVerifier } = await loadFixture(deployKYCVerifierFixture);

      await expect(
        selfKYCVerifier.read.isKYCVerified(["0x0000000000000000000000000000000000000000"])
      ).to.be.revertedWith("SelfKYCVerifier: Invalid user address");
    });
  });

  describe("Events", function () {
    it("Should emit KYCVerified event on successful verification", async function () {
      const { selfKYCVerifier, user1, publicClient } = await loadFixture(deployKYCVerifierFixture);

      const nullifier = BigInt(keccak256(toBytes("test-nullifier-1")));
      const userIdentifier = BigInt(keccak256(toBytes("test-user-1")));
      const mockProof = "0x1234567890abcdef";

      const txHash = await selfKYCVerifier.write.verify([
        nullifier,
        userIdentifier,
        MOCK_ATTRS,
        mockProof as `0x${string}`,
      ], { account: user1.account });

      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

      // Check for KYCVerified event
      const events = await selfKYCVerifier.getEvents.KYCVerified();
      expect(events).to.have.lengthOf(1);

      const event = events[0];
      expect(event.args.user?.toLowerCase()).to.equal(user1.account.address.toLowerCase());
      expect(event.args.nullifier).to.equal(nullifier);
      expect(event.args.nationality).to.equal(MOCK_ATTRS.nationality);
      expect(event.args.documentType).to.equal(MOCK_ATTRS.documentType);
    });

    it("Should emit ConfigurationUpdated event when configuration changes", async function () {
      const { selfKYCVerifier, owner } = await loadFixture(deployKYCVerifierFixture);

      const newConfigId = 2;
      const newScope = "updated-kyc-v1";
      const newMinimumAge = 21;

      await selfKYCVerifier.write.updateConfiguration([
        newConfigId,
        newScope,
        false,
        newMinimumAge,
        [],
        [1, 2, 3],
      ], { account: owner.account });

      const events = await selfKYCVerifier.getEvents.ConfigurationUpdated();
      expect(events).to.have.lengthOf(2); // One from deployment, one from update

      const latestEvent = events[1];
      expect(latestEvent.args.configId).to.equal(BigInt(newConfigId));
      expect(latestEvent.args.scope).to.equal(newScope);
      expect(latestEvent.args.minimumAge).to.equal(BigInt(newMinimumAge));
    });
  });
});