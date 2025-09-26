const { getSelfConfig } = require('../config/self');
const { getCeloConfig } = require('../config/celo');
const CeloService = require('./CeloService');

class SelfService {
  constructor() {
    this.selfConfig = getSelfConfig();
    this.celoConfig = getCeloConfig();
    this.celoService = new CeloService();
  }

  /**
   * Initialize an onchain KYC verification session
   * @param {string} userId - User ID from your system
   * @param {string} walletAddress - User's Celo wallet address
   * @param {Object} additionalRequirements - Additional KYC requirements
   * @returns {Object} Session data for frontend QR code generation
   */
  async initiateOnchainKYC(userId, walletAddress, additionalRequirements = {}) {
    try {
      console.log(`🚀 Initiating onchain KYC for user ${userId} with wallet ${walletAddress}`);

      // Validate inputs
      if (!userId) {
        throw new Error('User ID is required');
      }

      if (!walletAddress || !this.isValidAddress(walletAddress)) {
        throw new Error('Valid wallet address is required');
      }

      // Check if user is already verified
      const existingVerification = await this.celoService.getKYCStatus(walletAddress);
      if (existingVerification && existingVerification.isVerified) {
        return {
          success: false,
          error: 'User already verified',
          details: {
            verifiedAt: existingVerification.timestamp,
            nationality: existingVerification.nationality,
          },
        };
      }

      // Create verification session
      const sessionData = this.selfConfig.createVerificationSession(
        userId,
        walletAddress,
        additionalRequirements
      );

      // Generate session metadata
      const session = {
        sessionId: this.generateSessionId(),
        userId,
        walletAddress,
        status: 'pending',
        requirements: sessionData.requirements,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
      };

      console.log(`✅ KYC session created: ${session.sessionId}`);

      return {
        success: true,
        sessionData: {
          // Data needed for Self QR code generation
          scope: sessionData.scope,
          configId: sessionData.configId,
          endpoint: sessionData.endpoint,
          userId: walletAddress, // Use wallet address as userId for Self
          requirements: sessionData.requirements,
          sessionId: session.sessionId,
        },
        session,
      };

    } catch (error) {
      console.error('❌ Self KYC initiation error:', error);
      return {
        success: false,
        error: error.message,
        details: error.stack,
      };
    }
  }

  /**
   * Process Self verification callback/webhook
   * @param {Object} verificationData - Proof data from Self
   * @param {string} signature - Webhook signature for verification
   * @returns {Object} Processing result
   */
  async processVerification(verificationData, signature = null) {
    try {
      console.log('🔄 Processing Self verification callback...');

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

      // Extract wallet address from userContextData or use the userId
      const walletAddress = verificationData.userContextData?.walletAddress ||
                           verificationData.userContextData?.userId;

      if (!walletAddress || !this.isValidAddress(walletAddress)) {
        return {
          success: false,
          error: 'Invalid or missing wallet address in verification data',
        };
      }

      console.log(`📋 Verified data for wallet ${walletAddress}:`, {
        nationality: validatedData.nationality,
        documentType: validatedData.documentType,
        ageAtLeast: validatedData.ageAtLeast,
        isOfacMatch: validatedData.isOfacMatch,
      });

      // Submit verification to Celo smart contract
      const onchainResult = await this.celoService.submitKYCVerification({
        walletAddress,
        nullifier: validatedData.nullifier,
        userIdentifier: validatedData.userIdentifier,
        nationality: validatedData.nationality,
        documentType: validatedData.documentType,
        ageAtLeast: validatedData.ageAtLeast,
        isOfacMatch: validatedData.isOfacMatch,
        proof: verificationData.proof,
      });

      if (!onchainResult.success) {
        console.error('❌ Onchain submission failed:', onchainResult.error);
        return {
          success: false,
          error: 'Onchain verification submission failed',
          details: onchainResult.error,
        };
      }

      console.log(`✅ Onchain KYC completed for ${walletAddress}`);
      console.log(`🔗 Transaction: ${onchainResult.transactionHash}`);

      return {
        success: true,
        verificationResult: validatedData,
        onchainResult,
        user: {
          walletAddress,
          isVerified: true,
          verifiedAt: validatedData.timestamp,
          nationality: validatedData.nationality,
          documentType: validatedData.documentType,
          transactionHash: onchainResult.transactionHash,
        },
      };

    } catch (error) {
      console.error('❌ Self verification processing error:', error);
      return {
        success: false,
        error: 'Verification processing failed',
        details: error.message,
      };
    }
  }

  /**
   * Get onchain KYC status for a wallet address
   * @param {string} walletAddress - User's wallet address
   * @returns {Object} KYC status information
   */
  async getOnchainKYCStatus(walletAddress) {
    try {
      if (!this.isValidAddress(walletAddress)) {
        throw new Error('Invalid wallet address');
      }

      console.log(`🔍 Checking KYC status for ${walletAddress}`);

      const onchainStatus = await this.celoService.getKYCStatus(walletAddress);

      return {
        success: true,
        kycData: {
          isVerified: onchainStatus.isVerified,
          nationality: onchainStatus.nationality,
          documentType: onchainStatus.documentType,
          verifiedAt: onchainStatus.timestamp ? new Date(onchainStatus.timestamp * 1000) : null,
          isOfacClear: onchainStatus.isOfacClear,
          verificationCount: onchainStatus.verificationCount || 1,
          transactionHash: onchainStatus.transactionHash,
          explorerUrl: onchainStatus.transactionHash ?
            this.celoConfig.getTransactionUrl(onchainStatus.transactionHash) : null,
        },
      };

    } catch (error) {
      console.error('❌ Error fetching onchain KYC status:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Get verification statistics from the contract
   * @returns {Object} Verification statistics
   */
  async getVerificationStatistics() {
    try {
      const stats = await this.celoService.getContractStatistics();

      return {
        success: true,
        statistics: {
          totalVerifications: stats.totalVerifications,
          uniqueUsers: stats.uniqueUsers,
          contractAddress: this.celoConfig.contractAddress,
          network: this.celoConfig.network,
          explorerUrl: this.celoConfig.getAddressUrl(this.celoConfig.contractAddress),
        },
      };

    } catch (error) {
      console.error('❌ Error fetching verification statistics:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Validate verification requirements against current configuration
   * @param {Object} requirements - Requirements to validate
   * @returns {Object} Validation result
   */
  validateRequirements(requirements) {
    try {
      const config = this.selfConfig.getConfiguration();
      const errors = [];

      // Check minimum age
      if (requirements.minimumAge && requirements.minimumAge < config.verificationConfig.minimumAge) {
        errors.push(`Minimum age cannot be less than ${config.verificationConfig.minimumAge}`);
      }

      // Check excluded countries
      if (requirements.allowedCountries) {
        const conflicting = requirements.allowedCountries.filter(country =>
          config.verificationConfig.excludedCountries.includes(country.toUpperCase())
        );
        if (conflicting.length > 0) {
          errors.push(`Countries not allowed: ${conflicting.join(', ')}`);
        }
      }

      // Check document types
      if (requirements.allowedDocumentTypes) {
        const invalid = requirements.allowedDocumentTypes.filter(type =>
          !config.verificationConfig.allowedDocumentTypes.includes(parseInt(type))
        );
        if (invalid.length > 0) {
          errors.push(`Document types not supported: ${invalid.join(', ')}`);
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        supportedConfig: config.verificationConfig,
      };

    } catch (error) {
      return {
        isValid: false,
        errors: [error.message],
      };
    }
  }

  /**
   * Get supported document types and their names
   * @returns {Object} Document type information
   */
  getSupportedDocumentTypes() {
    const config = this.selfConfig.getConfiguration();

    return {
      allowedTypes: config.verificationConfig.allowedDocumentTypes,
      typeNames: config.verificationConfig.allowedDocumentTypes.map(type => ({
        id: type,
        name: this.selfConfig.getDocumentTypeName(type),
      })),
    };
  }

  /**
   * Check if a country is excluded from verification
   * @param {string} countryCode - ISO country code (e.g., 'US', 'CN')
   * @returns {boolean} Whether the country is excluded
   */
  isCountryExcluded(countryCode) {
    return this.selfConfig.isCountryExcluded(countryCode);
  }

  /**
   * Generate a unique session ID
   * @returns {string} Session ID
   */
  generateSessionId() {
    return `kyc_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
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
   * Health check for all services
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

      // Test contract accessibility
      let contractHealthy = false;
      try {
        if (networkInfo.contractAddress) {
          await this.celoService.getContractStatistics();
          contractHealthy = true;
        }
      } catch (error) {
        console.warn('⚠️  Contract access issue:', error.message);
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
          contract: {
            status: contractHealthy ? 'operational' : 'unavailable',
            address: networkInfo.contractAddress,
            deployed: !!networkInfo.contractAddress,
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

module.exports = SelfService;