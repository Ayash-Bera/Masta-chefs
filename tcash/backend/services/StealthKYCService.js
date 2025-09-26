const { getSelfConfig } = require('../config/self');
const { getCeloConfig } = require('../config/celo');
const CeloService = require('./CeloService');
const crypto = require('crypto');

class StealthKYCService {
  constructor() {
    this.selfConfig = getSelfConfig();
    this.celoConfig = getCeloConfig();
    this.celoService = new CeloService();
  }

  /**
   * Initialize a stealth address KYC verification session
   * @param {string} userId - User ID from your system
   * @param {string} stealthAddress - User's stealth address for KYC
   * @param {Object} additionalRequirements - Additional KYC requirements
   * @returns {Object} Session data for frontend QR code generation
   */
  async initiateStealthKYC(userId, stealthAddress, additionalRequirements = {}) {
    try {
      console.log(`🚀 Initiating stealth KYC for user ${userId} with stealth address ${stealthAddress}`);

      // Validate inputs
      if (!userId) {
        throw new Error('User ID is required');
      }

      if (!stealthAddress || !this.isValidAddress(stealthAddress)) {
        throw new Error('Valid stealth address is required');
      }

      // Check if stealth address is already verified
      const existingVerification = await this.getStealthKYCStatus(stealthAddress);
      if (existingVerification && existingVerification.isVerified) {
        return {
          success: false,
          error: 'Stealth address already verified',
          details: {
            verifiedAt: existingVerification.verificationTimestamp,
            nationality: existingVerification.nationality,
            masterNullifier: existingVerification.masterNullifier,
          },
        };
      }

      // Create verification session with stealth address as the user context
      const sessionData = this.selfConfig.createVerificationSession(
        userId,
        stealthAddress, // Use stealth address instead of wallet address
        additionalRequirements
      );

      // Generate session metadata
      const session = {
        sessionId: this.generateSessionId(),
        userId,
        stealthAddress,
        status: 'pending',
        requirements: sessionData.requirements,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
      };

      console.log(`✅ Stealth KYC session created: ${session.sessionId}`);

      return {
        success: true,
        sessionData: {
          // Data needed for Self QR code generation
          scope: sessionData.scope,
          configId: sessionData.configId,
          endpoint: sessionData.endpoint,
          userId: stealthAddress, // Use stealth address as userId for Self
          requirements: sessionData.requirements,
          sessionId: session.sessionId,
        },
        session,
      };

    } catch (error) {
      console.error('❌ Stealth KYC initiation error:', error);
      return {
        success: false,
        error: error.message,
        details: error.stack,
      };
    }
  }

  /**
   * Process Self verification callback with stealth address integration
   * @param {Object} verificationData - Proof data from Self
   * @param {string} signature - Webhook signature for verification
   * @returns {Object} Processing result
   */
  async processStealthVerification(verificationData, signature = null) {
    try {
      console.log('🔄 Processing Self stealth verification callback...');

      // Verify webhook signature if provided
      if (signature && !this.selfConfig.verifyWebhookSignature(
        JSON.stringify(verificationData),
        signature
      )) {
        console.error('❌ Invalid webhook signature');
        return {
          success: false,
          error: 'Invalid webhook signature',
        };
      }

      // Process verification using Self config
      const selfResult = await this.selfConfig.processVerificationResult(verificationData);

      if (!selfResult.success) {
        console.error('❌ Self proof verification failed:', selfResult.error);
        return selfResult;
      }

      const { verificationData: validatedData } = selfResult;

      // Extract stealth address from userContextData
      const stealthAddress = verificationData.userContextData?.walletAddress ||
                           verificationData.userContextData?.userId;

      if (!stealthAddress || !this.isValidAddress(stealthAddress)) {
        return {
          success: false,
          error: 'Invalid or missing stealth address in verification data',
        };
      }

      // Extract master nullifier from Self.xyz proof
      const masterNullifier = validatedData.nullifier;
      if (!masterNullifier) {
        return {
          success: false,
          error: 'Missing master nullifier from Self verification',
        };
      }

      console.log(`📋 Verified data for stealth address ${stealthAddress}:`, {
        masterNullifier: masterNullifier,
        nationality: validatedData.nationality,
        documentType: validatedData.documentType,
        ageAtLeast: validatedData.ageAtLeast,
        isOfacMatch: validatedData.isOfacMatch,
        dateOfBirth: validatedData.dateOfBirth ? '[PRIVATE]' : 'not provided',
      });

      // Create DOB commitment for privacy
      const dobCommitment = this.createDOBCommitment(
        validatedData.dateOfBirth,
        stealthAddress
      );

      // Submit verification to Celo smart contract (StealthKYCVerifier)
      const onchainResult = await this.celoService.submitStealthKYCVerification({
        stealthAddress,
        masterNullifier,
        userIdentifier: validatedData.userIdentifier,
        nationality: validatedData.nationality,
        documentType: validatedData.documentType,
        ageAtLeast: validatedData.ageAtLeast,
        isOfacMatch: validatedData.isOfacMatch,
        dobCommitment: dobCommitment.commitment,
        proof: verificationData.proof,
      });

      if (!onchainResult.success) {
        console.error('❌ Onchain stealth submission failed:', onchainResult.error);
        return {
          success: false,
          error: 'Onchain stealth verification submission failed',
          details: onchainResult.error,
        };
      }

      // Store encrypted DOB commitment salt for future verification
      await this.storeDOBCommitmentSalt(
        masterNullifier,
        stealthAddress,
        dobCommitment.salt
      );

      console.log(`✅ Onchain stealth KYC completed for ${stealthAddress}`);
      console.log(`🔗 Transaction: ${onchainResult.transactionHash}`);

      return {
        success: true,
        verificationResult: {
          ...validatedData,
          masterNullifier,
          dobCommitment: dobCommitment.commitment,
        },
        onchainResult,
        user: {
          stealthAddress,
          masterNullifier,
          isVerified: true,
          verifiedAt: validatedData.timestamp,
          nationality: validatedData.nationality,
          documentType: validatedData.documentType,
          transactionHash: onchainResult.transactionHash,
        },
      };

    } catch (error) {
      console.error('❌ Stealth verification processing error:', error);
      return {
        success: false,
        error: 'Stealth verification processing failed',
        details: error.message,
      };
    }
  }

  /**
   * Get stealth address KYC status
   * @param {string} stealthAddress - The stealth address to check
   * @returns {Object} KYC status information
   */
  async getStealthKYCStatus(stealthAddress) {
    try {
      if (!this.isValidAddress(stealthAddress)) {
        throw new Error('Invalid stealth address');
      }

      console.log(`🔍 Checking stealth KYC status for ${stealthAddress}`);

      const onchainStatus = await this.celoService.getStealthKYCStatus(stealthAddress);

      return {
        success: true,
        kycData: {
          isVerified: onchainStatus.isVerified,
          masterNullifier: onchainStatus.masterNullifier,
          nationality: onchainStatus.nationality,
          documentType: onchainStatus.documentType,
          verificationTimestamp: onchainStatus.verificationTimestamp ?
            new Date(onchainStatus.verificationTimestamp * 1000) : null,
          isOfacClear: onchainStatus.isOfacClear,
          verificationCount: onchainStatus.verificationCount || 1,
          transactionHash: onchainStatus.transactionHash,
          explorerUrl: onchainStatus.transactionHash ?
            this.celoConfig.getTransactionUrl(onchainStatus.transactionHash) : null,
        },
      };

    } catch (error) {
      console.error('❌ Error fetching stealth KYC status:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get master identity information by master nullifier
   * @param {string} masterNullifier - The master nullifier to lookup
   * @returns {Object} Master identity information
   */
  async getMasterIdentity(masterNullifier) {
    try {
      console.log(`🔍 Fetching master identity for nullifier: ${masterNullifier}`);

      const masterIdentity = await this.celoService.getMasterIdentity(masterNullifier);

      return {
        success: true,
        masterIdentity: {
          isVerified: masterIdentity.isVerified,
          nationality: masterIdentity.nationality,
          documentType: masterIdentity.documentType,
          isOfacClear: masterIdentity.isOfacClear,
          verificationTimestamp: masterIdentity.verificationTimestamp ?
            new Date(masterIdentity.verificationTimestamp * 1000) : null,
          verificationCount: masterIdentity.verificationCount,
          primaryStealthAddress: masterIdentity.primaryStealthAddress,
          linkedAddresses: masterIdentity.linkedAddresses || [],
        },
      };

    } catch (error) {
      console.error('❌ Error fetching master identity:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Link a new stealth address to existing master identity
   * @param {string} masterNullifier - The master identity to link to
   * @param {string} newStealthAddress - The new stealth address to link
   * @param {Object} linkingProof - Proof of ownership of master identity
   * @returns {Object} Linking result
   */
  async linkStealthAddress(masterNullifier, newStealthAddress, linkingProof) {
    try {
      console.log(`🔗 Linking stealth address ${newStealthAddress} to master ${masterNullifier}`);

      // Validate inputs
      if (!this.isValidAddress(newStealthAddress)) {
        throw new Error('Invalid stealth address');
      }

      // Check if stealth address is already linked
      const existingLink = await this.getStealthKYCStatus(newStealthAddress);
      if (existingLink.success && existingLink.kycData.isVerified) {
        return {
          success: false,
          error: 'Stealth address already linked to a master identity',
          details: existingLink.kycData,
        };
      }

      // Verify linking proof (implementation depends on your proof system)
      const proofValid = await this.verifyLinkingProof(masterNullifier, newStealthAddress, linkingProof);
      if (!proofValid) {
        return {
          success: false,
          error: 'Invalid linking proof provided',
        };
      }

      // Submit linking transaction to contract
      const linkingResult = await this.celoService.linkStealthAddress(
        masterNullifier,
        newStealthAddress,
        linkingProof
      );

      if (!linkingResult.success) {
        return {
          success: false,
          error: 'Failed to link stealth address on-chain',
          details: linkingResult.error,
        };
      }

      console.log(`✅ Stealth address linked successfully: ${linkingResult.transactionHash}`);

      return {
        success: true,
        linkingResult,
        linkedAddress: {
          stealthAddress: newStealthAddress,
          masterNullifier,
          linkedAt: new Date(),
          transactionHash: linkingResult.transactionHash,
        },
      };

    } catch (error) {
      console.error('❌ Error linking stealth address:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Verify DOB commitment against stored commitment
   * @param {string} masterNullifier - The master identity
   * @param {string} dateOfBirth - The claimed date of birth
   * @param {string} stealthAddress - The stealth address used as salt
   * @returns {Object} Verification result
   */
  async verifyDOBCommitment(masterNullifier, dateOfBirth, stealthAddress) {
    try {
      console.log(`🔒 Verifying DOB commitment for master ${masterNullifier}`);

      // Retrieve encrypted salt from database
      const saltData = await this.getDOBCommitmentSalt(masterNullifier, stealthAddress);
      if (!saltData) {
        return {
          success: false,
          error: 'DOB commitment salt not found',
        };
      }

      // Recreate commitment with provided DOB
      const recreatedCommitment = this.createDOBCommitment(dateOfBirth, stealthAddress, saltData.salt);

      // Verify against on-chain commitment
      const verificationResult = await this.celoService.verifyDOBCommitment(
        masterNullifier,
        dateOfBirth,
        stealthAddress
      );

      const isValid = verificationResult.success && verificationResult.isValid;

      console.log(`${isValid ? '✅' : '❌'} DOB commitment verification: ${isValid ? 'VALID' : 'INVALID'}`);

      return {
        success: true,
        isValid,
        verificationTimestamp: new Date(),
        masterNullifier,
      };

    } catch (error) {
      console.error('❌ Error verifying DOB commitment:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Create DOB commitment for privacy
   * @param {string} dateOfBirth - The date of birth
   * @param {string} stealthAddress - The stealth address
   * @param {string} customSalt - Optional custom salt (otherwise generated)
   * @returns {Object} Commitment data
   */
  createDOBCommitment(dateOfBirth, stealthAddress, customSalt = null) {
    const salt = customSalt || this.generateSalt();
    const commitment = crypto
      .createHash('sha256')
      .update(dateOfBirth + stealthAddress + salt)
      .digest('hex');

    return {
      commitment: `0x${commitment}`,
      salt,
      stealthAddress,
      createdAt: new Date(),
    };
  }

  /**
   * Store DOB commitment salt encrypted in database
   * @param {string} masterNullifier - The master identity
   * @param {string} stealthAddress - The stealth address
   * @param {string} salt - The salt to store
   */
  async storeDOBCommitmentSalt(masterNullifier, stealthAddress, salt) {
    try {
      // In a real implementation, you'd store this in your database
      // For now, we'll use in-memory storage (replace with DB)
      if (!this.dobSaltStorage) {
        this.dobSaltStorage = new Map();
      }

      const key = `${masterNullifier}:${stealthAddress}`;
      const encryptedSalt = this.encrypt(salt, stealthAddress);

      this.dobSaltStorage.set(key, {
        encryptedSalt,
        stealthAddress,
        masterNullifier,
        createdAt: new Date(),
      });

      console.log(`💾 DOB commitment salt stored for ${key}`);
    } catch (error) {
      console.error('❌ Error storing DOB commitment salt:', error);
      throw error;
    }
  }

  /**
   * Retrieve DOB commitment salt from storage
   * @param {string} masterNullifier - The master identity
   * @param {string} stealthAddress - The stealth address
   * @returns {Object} Salt data
   */
  async getDOBCommitmentSalt(masterNullifier, stealthAddress) {
    try {
      if (!this.dobSaltStorage) {
        return null;
      }

      const key = `${masterNullifier}:${stealthAddress}`;
      const saltData = this.dobSaltStorage.get(key);

      if (!saltData) {
        return null;
      }

      const decryptedSalt = this.decrypt(saltData.encryptedSalt, stealthAddress);

      return {
        salt: decryptedSalt,
        masterNullifier,
        stealthAddress,
        createdAt: saltData.createdAt,
      };
    } catch (error) {
      console.error('❌ Error retrieving DOB commitment salt:', error);
      return null;
    }
  }

  /**
   * Verify linking proof for stealth address
   * @param {string} masterNullifier - The master identity
   * @param {string} stealthAddress - The stealth address to link
   * @param {Object} proof - The linking proof
   * @returns {boolean} Whether the proof is valid
   */
  async verifyLinkingProof(masterNullifier, stealthAddress, proof) {
    // In a real implementation, you would verify:
    // 1. Cryptographic proof that the user controls the master identity
    // 2. Proof that they control the stealth address
    // 3. Signature verification, etc.

    // For now, return true (implement proper verification)
    console.log(`🔍 Verifying linking proof for ${masterNullifier} -> ${stealthAddress}`);
    return true;
  }

  /**
   * Simple encryption for salt storage (replace with proper encryption)
   * @param {string} data - Data to encrypt
   * @param {string} key - Encryption key
   * @returns {string} Encrypted data
   */
  encrypt(data, key) {
    const hash = crypto.createHash('sha256').update(key).digest();
    const cipher = crypto.createCipher('aes-256-cbc', hash);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  /**
   * Simple decryption for salt storage (replace with proper decryption)
   * @param {string} encryptedData - Encrypted data
   * @param {string} key - Decryption key
   * @returns {string} Decrypted data
   */
  decrypt(encryptedData, key) {
    const hash = crypto.createHash('sha256').update(key).digest();
    const decipher = crypto.createDecipher('aes-256-cbc', hash);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * Generate a unique session ID
   * @returns {string} Session ID
   */
  generateSessionId() {
    return `stealth_kyc_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  /**
   * Generate cryptographic salt
   * @returns {string} Random salt
   */
  generateSalt() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Validate Ethereum address format
   * @param {string} address - Address to validate
   * @returns {boolean} Whether address is valid
   */
  isValidAddress(address) {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  /**
   * Get current Self.xyz configuration
   * @returns {Object} Current configuration
   */
  getCurrentConfiguration() {
    return this.selfConfig.getConfiguration();
  }

  /**
   * Get Celo network information
   * @returns {Object} Network information
   */
  getNetworkInfo() {
    return this.celoConfig.getNetworkInfo();
  }

  /**
   * Health check for stealth KYC services
   * @returns {Object} Service health status
   */
  async healthCheck() {
    try {
      const selfConfig = this.selfConfig.getConfiguration();
      const networkInfo = this.celoConfig.getNetworkInfo();

      // Test Celo connectivity
      let celoHealthy = false;
      try {
        await this.celoConfig.validateConnection();
        celoHealthy = true;
      } catch (error) {
        console.warn('⚠️  Celo connection issue:', error.message);
      }

      // Test stealth contract accessibility
      let stealthContractHealthy = false;
      try {
        if (networkInfo.stealthContractAddress) {
          // Test stealth contract specific functions
          await this.celoService.getStealthContractStatistics();
          stealthContractHealthy = true;
        }
      } catch (error) {
        console.warn('⚠️  Stealth contract access issue:', error.message);
      }

      return {
        status: 'operational',
        timestamp: new Date().toISOString(),
        services: {
          self: {
            status: 'operational',
            scope: selfConfig.scope,
            endpoint: selfConfig.apiEndpoint,
            hasWebhookSecret: selfConfig.hasWebhookSecret,
          },
          celo: {
            status: celoHealthy ? 'operational' : 'degraded',
            network: networkInfo.network,
            hasWallet: networkInfo.hasWallet,
            chainId: networkInfo.chainId,
          },
          stealthContract: {
            status: stealthContractHealthy ? 'operational' : 'unavailable',
            address: networkInfo.stealthContractAddress,
            deployed: !!networkInfo.stealthContractAddress,
            type: 'StealthKYCVerifier',
          },
        },
      };

    } catch (error) {
      return {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error.message,
      };
    }
  }
}

module.exports = StealthKYCService;