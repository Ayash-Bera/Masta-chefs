const { getCeloConfig } = require('../config/celo');
const { ethers } = require('ethers');

// SelfKYCVerifier contract ABI (minimal interface needed for backend operations)
const SELF_KYC_VERIFIER_ABI = [
  // View functions
  "function isKYCVerified(address user) external view returns (bool)",
  "function getKYCData(address user) external view returns (tuple(bool isVerified, uint256 timestamp, string nationality, uint8 documentType, bool isOfacClear, uint256 verificationCount))",
  "function getUserFromNullifier(uint256 nullifier) external view returns (address)",
  "function isNullifierUsed(uint256 nullifier) external view returns (bool)",
  "function getStatistics() external view returns (uint256 totalVerifications, uint256 uniqueUsers)",
  "function getConfiguration() external view returns (tuple(uint256 configId, string scope, bool requireOfacCheck, uint256 minimumAge, string[] excludedCountries, uint8[] allowedDocumentTypes, bool isActive))",

  // Verification function (inherited from SelfVerificationRoot)
  "function verify(uint256 nullifier, uint256 userIdentifier, tuple(string nationality, uint8 documentType, uint256 ageAtLeast, bool isOfacMatch) extractedAttrs, bytes calldata proof) external",

  // Events
  "event KYCVerified(address indexed user, uint256 indexed nullifier, string nationality, uint8 documentType, uint256 timestamp, bool isOfacClear)",

  // Admin functions
  "function revokeKYC(address user, string memory reason) external",
  "function updateConfiguration(uint256 _configId, string memory _scope, bool _requireOfacCheck, uint256 _minimumAge, string[] memory _excludedCountries, uint8[] memory _allowedDocumentTypes) external"
];

class CeloService {
  constructor() {
    this.celoConfig = getCeloConfig();
    this.contract = null;
    this.initialized = false;

    this.initializeContract();
  }

  async initializeContract() {
    try {
      if (!this.celoConfig.contractAddress) {
        console.warn('⚠️  SelfKYCVerifier contract address not configured');
        return;
      }

      // Create contract instance with provider for read operations
      this.contract = new ethers.Contract(
        this.celoConfig.contractAddress,
        SELF_KYC_VERIFIER_ABI,
        this.celoConfig.provider
      );

      // Test contract connectivity
      await this.contract.getStatistics();
      this.initialized = true;

      console.log(`📋 SelfKYCVerifier contract initialized: ${this.celoConfig.contractAddress}`);

    } catch (error) {
      console.error('❌ Failed to initialize SelfKYCVerifier contract:', error.message);
      this.initialized = false;
    }
  }

  /**
   * Submit KYC verification to the smart contract
   * Note: In the new architecture, this is called automatically by the Self.xyz contract
   * after successful proof verification. This method is for manual submissions or testing.
   * @param {Object} verificationData - Verification data from Self
   * @returns {Object} Transaction result
   */
  async submitKYCVerification(verificationData) {
    try {
      if (!this.initialized) {
        throw new Error('Contract not initialized');
      }

      if (!this.celoConfig.wallet) {
        throw new Error('Wallet not configured for transactions');
      }

      const {
        walletAddress,
        nullifier,
        userIdentifier,
        nationality,
        documentType,
        ageAtLeast,
        isOfacMatch,
        proof
      } = verificationData;

      console.log(`🔄 Submitting KYC verification for ${walletAddress}`);

      // Create contract instance with signer for transactions
      const contractWithSigner = this.contract.connect(this.celoConfig.wallet);

      // Prepare extracted attributes
      const extractedAttrs = {
        nationality: nationality,
        documentType: documentType,
        ageAtLeast: ageAtLeast,
        isOfacMatch: isOfacMatch
      };

      // Estimate gas for the transaction
      const gasEstimate = await contractWithSigner.verify.estimateGas(
        nullifier,
        userIdentifier,
        extractedAttrs,
        proof
      );

      // Get current gas price
      const gasPrice = await this.celoConfig.getGasPrice();

      // Submit verification transaction
      const tx = await contractWithSigner.verify(
        nullifier,
        userIdentifier,
        extractedAttrs,
        proof,
        {
          gasLimit: gasEstimate * 120n / 100n, // Add 20% buffer
          gasPrice: gasPrice,
        }
      );

      console.log(`📤 Transaction submitted: ${tx.hash}`);

      // Wait for confirmation
      const receipt = await tx.wait();

      console.log(`✅ KYC verification confirmed in block ${receipt.blockNumber}`);

      return {
        success: true,
        transactionHash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        explorerUrl: this.celoConfig.getTransactionUrl(receipt.transactionHash),
      };

    } catch (error) {
      console.error('❌ Celo transaction error:', error);

      // Parse common error types
      let errorMessage = error.message;

      if (error.reason) {
        errorMessage = error.reason;
      } else if (error.message.includes('insufficient funds')) {
        errorMessage = 'Insufficient CELO balance for transaction';
      } else if (error.message.includes('nonce too low')) {
        errorMessage = 'Transaction nonce error. Please try again.';
      } else if (error.message.includes('already verified') || error.message.includes('Nullifier already used')) {
        errorMessage = 'User has already been verified with this identity';
      }

      return {
        success: false,
        error: errorMessage,
        details: error.message,
      };
    }
  }

  /**
   * Get KYC status for a wallet address from the smart contract
   * @param {string} walletAddress - User's wallet address
   * @returns {Object} KYC status data
   */
  async getKYCStatus(walletAddress) {
    try {
      if (!this.initialized) {
        throw new Error('Contract not initialized');
      }

      console.log(`🔍 Fetching KYC status for ${walletAddress}`);

      // Call contract to get KYC data
      const kycData = await this.contract.getKYCData(walletAddress);

      // Extract data from the tuple
      const [isVerified, timestamp, nationality, documentType, isOfacClear, verificationCount] = kycData;

      return {
        isVerified: isVerified,
        timestamp: timestamp.toString(), // Convert BigInt to string
        nationality: nationality,
        documentType: parseInt(documentType),
        isOfacClear: isOfacClear,
        verificationCount: parseInt(verificationCount),
        walletAddress: walletAddress,
      };

    } catch (error) {
      console.error('❌ Error fetching KYC status:', error);

      // Return default unverified status on error
      return {
        isVerified: false,
        timestamp: null,
        nationality: null,
        documentType: null,
        isOfacClear: null,
        verificationCount: 0,
        walletAddress: walletAddress,
      };
    }
  }

  /**
   * Check if a user is KYC verified (simple boolean check)
   * @param {string} walletAddress - User's wallet address
   * @returns {boolean} Verification status
   */
  async isKYCVerified(walletAddress) {
    try {
      if (!this.initialized) {
        return false;
      }

      const isVerified = await this.contract.isKYCVerified(walletAddress);
      return isVerified;

    } catch (error) {
      console.error('❌ Error checking KYC verification:', error);
      return false;
    }
  }

  /**
   * Get user address from nullifier (reverse lookup)
   * @param {string} nullifier - Nullifier to lookup
   * @returns {string|null} User address or null if not found
   */
  async getUserFromNullifier(nullifier) {
    try {
      if (!this.initialized) {
        return null;
      }

      const userAddress = await this.contract.getUserFromNullifier(nullifier);

      // Check if address is zero address (not found)
      if (userAddress === '0x0000000000000000000000000000000000000000') {
        return null;
      }

      return userAddress;

    } catch (error) {
      console.error('❌ Error fetching user from nullifier:', error);
      return null;
    }
  }

  /**
   * Check if a nullifier has been used
   * @param {string} nullifier - Nullifier to check
   * @returns {boolean} Whether nullifier is used
   */
  async isNullifierUsed(nullifier) {
    try {
      if (!this.initialized) {
        return false;
      }

      const isUsed = await this.contract.isNullifierUsed(nullifier);
      return isUsed;

    } catch (error) {
      console.error('❌ Error checking nullifier usage:', error);
      return false;
    }
  }

  /**
   * Get contract statistics
   * @returns {Object} Contract statistics
   */
  async getContractStatistics() {
    try {
      if (!this.initialized) {
        throw new Error('Contract not initialized');
      }

      const [totalVerifications, uniqueUsers] = await this.contract.getStatistics();

      return {
        totalVerifications: totalVerifications.toString(),
        uniqueUsers: uniqueUsers.toString(),
        contractAddress: this.celoConfig.contractAddress,
        network: this.celoConfig.network,
      };

    } catch (error) {
      console.error('❌ Error fetching contract statistics:', error);
      throw error;
    }
  }

  /**
   * Get contract configuration
   * @returns {Object} Contract configuration
   */
  async getContractConfiguration() {
    try {
      if (!this.initialized) {
        throw new Error('Contract not initialized');
      }

      const config = await this.contract.getConfiguration();

      // Extract data from the tuple
      const [configId, scope, requireOfacCheck, minimumAge, excludedCountries, allowedDocumentTypes, isActive] = config;

      return {
        configId: configId.toString(),
        scope: scope,
        requireOfacCheck: requireOfacCheck,
        minimumAge: minimumAge.toString(),
        excludedCountries: excludedCountries,
        allowedDocumentTypes: allowedDocumentTypes.map(type => parseInt(type)),
        isActive: isActive,
      };

    } catch (error) {
      console.error('❌ Error fetching contract configuration:', error);
      throw error;
    }
  }

  /**
   * Get recent KYC verification events
   * @param {number} fromBlock - Starting block number (default: latest 1000 blocks)
   * @param {number} toBlock - Ending block number (default: latest)
   * @returns {Array} Array of verification events
   */
  async getRecentVerifications(fromBlock = -1000, toBlock = 'latest') {
    try {
      if (!this.initialized) {
        throw new Error('Contract not initialized');
      }

      // If fromBlock is negative, calculate from current block
      if (fromBlock < 0) {
        const currentBlock = await this.celoConfig.provider.getBlockNumber();
        fromBlock = Math.max(0, currentBlock + fromBlock);
      }

      console.log(`🔍 Fetching KYC events from block ${fromBlock} to ${toBlock}`);

      // Get KYCVerified events
      const filter = this.contract.filters.KYCVerified();
      const events = await this.contract.queryFilter(filter, fromBlock, toBlock);

      const verifications = events.map(event => ({
        user: event.args.user,
        nullifier: event.args.nullifier.toString(),
        nationality: event.args.nationality,
        documentType: parseInt(event.args.documentType),
        timestamp: parseInt(event.args.timestamp),
        isOfacClear: event.args.isOfacClear,
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
        explorerUrl: this.celoConfig.getTransactionUrl(event.transactionHash),
      }));

      console.log(`📊 Found ${verifications.length} verification events`);

      return verifications;

    } catch (error) {
      console.error('❌ Error fetching verification events:', error);
      return [];
    }
  }

  /**
   * Monitor for new KYC verifications (for real-time updates)
   * @param {Function} callback - Callback function to handle new verifications
   * @returns {Function} Cleanup function to stop monitoring
   */
  monitorVerifications(callback) {
    if (!this.initialized) {
      console.error('❌ Cannot monitor - contract not initialized');
      return () => {};
    }

    console.log('👁️  Starting KYC verification monitoring...');

    const filter = this.contract.filters.KYCVerified();

    const handleEvent = (user, nullifier, nationality, documentType, timestamp, isOfacClear, event) => {
      const verificationData = {
        user,
        nullifier: nullifier.toString(),
        nationality,
        documentType: parseInt(documentType),
        timestamp: parseInt(timestamp),
        isOfacClear,
        blockNumber: event.blockNumber,
        transactionHash: event.transactionHash,
        explorerUrl: this.celoConfig.getTransactionUrl(event.transactionHash),
      };

      console.log(`🎉 New KYC verification detected: ${user}`);
      callback(verificationData);
    };

    this.contract.on(filter, handleEvent);

    // Return cleanup function
    return () => {
      console.log('🛑 Stopping KYC verification monitoring');
      this.contract.off(filter, handleEvent);
    };
  }

  /**
   * Get transaction receipt and details
   * @param {string} txHash - Transaction hash
   * @returns {Object} Transaction details
   */
  async getTransactionDetails(txHash) {
    try {
      const [receipt, transaction] = await Promise.all([
        this.celoConfig.provider.getTransactionReceipt(txHash),
        this.celoConfig.provider.getTransaction(txHash)
      ]);

      if (!receipt) {
        return { found: false };
      }

      return {
        found: true,
        hash: receipt.transactionHash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status === 1 ? 'success' : 'failed',
        from: transaction.from,
        to: transaction.to,
        value: transaction.value.toString(),
        gasPrice: transaction.gasPrice?.toString(),
        explorerUrl: this.celoConfig.getTransactionUrl(txHash),
      };

    } catch (error) {
      console.error('❌ Error fetching transaction details:', error);
      return { found: false, error: error.message };
    }
  }

  /**
   * Health check for Celo service
   * @returns {Object} Health status
   */
  async healthCheck() {
    try {
      const networkInfo = this.celoConfig.getNetworkInfo();

      // Test provider connectivity
      const blockNumber = await this.celoConfig.provider.getBlockNumber();

      // Test contract if available
      let contractHealth = null;
      if (this.initialized) {
        try {
          const stats = await this.getContractStatistics();
          contractHealth = { status: 'healthy', stats };
        } catch (error) {
          contractHealth = { status: 'unhealthy', error: error.message };
        }
      }

      return {
        status: 'healthy',
        network: networkInfo,
        provider: {
          connected: true,
          latestBlock: blockNumber,
        },
        contract: contractHealth,
        timestamp: new Date().toISOString(),
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Get network gas information
   * @returns {Object} Gas information
   */
  async getGasInfo() {
    try {
      const gasPrice = await this.celoConfig.getGasPrice();
      const gasPriceGwei = ethers.formatUnits(gasPrice, 'gwei');

      return {
        gasPrice: gasPrice.toString(),
        gasPriceGwei: parseFloat(gasPriceGwei).toFixed(2),
        network: this.celoConfig.network,
      };

    } catch (error) {
      console.error('❌ Error fetching gas info:', error);
      throw error;
    }
  }

  // ========================================
  // Stealth KYC Contract Methods
  // ========================================

  /**
   * Get stealth contract statistics
   * @returns {Object} Contract statistics
   */
  async getStealthContractStatistics() {
    try {
      // For now, return mock statistics since we need the stealth contract interface
      // This will be implemented when stealth contract integration is ready
      return {
        totalVerifications: 0,
        uniqueIdentities: 0,
        totalStealthAddresses: 0,
      };
    } catch (error) {
      console.error('❌ Error fetching stealth contract statistics:', error);
      throw error;
    }
  }

  /**
   * Get KYC status for a stealth address
   * @param {string} stealthAddress - The stealth address to check
   * @returns {Object} KYC status data
   */
  async getStealthKYCStatus(stealthAddress) {
    try {
      // For now, return mock data since we need the stealth contract integration
      // This will be implemented when stealth contract interface is ready
      return {
        success: false,
        error: 'Stealth address not found',
        kycData: null,
      };
    } catch (error) {
      console.error('❌ Error fetching stealth KYC status:', error);
      throw error;
    }
  }
}

module.exports = CeloService;