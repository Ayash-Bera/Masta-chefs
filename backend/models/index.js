/**
 * Models Index File
 *
 * This file exports all database models and provides utility functions
 * for database operations related to the Self.xyz KYC integration.
 */

const User = require('./User');
const KYCSession = require('./KYCSession');

/**
 * Initialize database models and perform any necessary setup
 */
const initializeModels = async () => {
  try {
    console.log('📊 Initializing database models...');

    // Ensure indexes are created
    await User.createIndexes();
    await KYCSession.createIndexes();

    console.log('✅ Database models initialized successfully');

    return {
      User,
      KYCSession,
    };

  } catch (error) {
    console.error('❌ Failed to initialize database models:', error);
    throw error;
  }
};

/**
 * Database utility functions
 */
const dbUtils = {
  /**
   * Get comprehensive KYC statistics across all models
   */
  async getKYCStatistics(timeframe = '30d') {
    try {
      const [userStats, sessionStats] = await Promise.all([
        User.getKYCStatistics(),
        KYCSession.getStatistics(timeframe),
      ]);

      return {
        users: userStats,
        sessions: sessionStats,
        timeframe,
        generatedAt: new Date(),
      };

    } catch (error) {
      console.error('❌ Error getting KYC statistics:', error);
      throw error;
    }
  },

  /**
   * Find user with complete KYC information by wallet address
   */
  async findUserWithKYCByWallet(walletAddress) {
    try {
      const user = await User.findByWalletAddress(walletAddress);

      if (!user) return null;

      // Get recent sessions for this user
      const recentSessions = await KYCSession.findByWalletAddress(walletAddress)
        .limit(5)
        .select('sessionId status timings.createdAt timings.sessionCompletedAt blockchainData.transactionHash');

      return {
        user,
        recentSessions,
        kycStatus: user.getKYCStatus(),
      };

    } catch (error) {
      console.error('❌ Error finding user with KYC by wallet:', error);
      throw error;
    }
  },

  /**
   * Create or update user KYC data from verification
   */
  async createOrUpdateUserKYC(userId, walletAddress, kycData, sessionId) {
    try {
      let user = await User.findOne({ userId }) || await User.findByWalletAddress(walletAddress);

      if (!user) {
        // Create new user
        user = new User({
          userId,
          email: kycData.email || `${userId}@temp.com`, // Temporary email
          wallets: [{ address: walletAddress, isPrimary: true }],
        });
      }

      // Update KYC data
      await user.updateOnchainKYC({
        isVerified: true,
        verifiedAt: new Date(),
        walletAddress,
        nullifier: kycData.nullifier,
        transactionHash: kycData.transactionHash,
        blockNumber: kycData.blockNumber,
        nationality: kycData.nationality,
        documentType: kycData.documentType,
        ageAtLeast: kycData.ageAtLeast,
        isOfacClear: kycData.isOfacClear,
      });

      // Update the session if provided
      if (sessionId) {
        await KYCSession.findOneAndUpdate(
          { sessionId },
          {
            $set: {
              status: 'completed',
              'timings.sessionCompletedAt': new Date(),
              verificationResults: {
                nullifier: kycData.nullifier,
                nationality: kycData.nationality,
                documentType: kycData.documentType,
                ageAtLeast: kycData.ageAtLeast,
                isOfacClear: kycData.isOfacClear,
              },
              blockchainData: {
                transactionHash: kycData.transactionHash,
                blockNumber: kycData.blockNumber,
              },
            },
            $push: {
              timeline: {
                event: 'session_completed',
                timestamp: new Date(),
                details: new Map([['method', 'onchain_kyc']]),
              },
            },
          }
        );
      }

      return user;

    } catch (error) {
      console.error('❌ Error creating/updating user KYC:', error);
      throw error;
    }
  },

  /**
   * Get dashboard data for admin interface
   */
  async getDashboardData() {
    try {
      const [userStats, sessionStats24h, sessionStats7d] = await Promise.all([
        User.getKYCStatistics(),
        KYCSession.getStatistics('24h'),
        KYCSession.getStatistics('7d'),
      ]);

      // Get recent activities
      const recentSessions = await KYCSession.find()
        .sort({ 'timings.createdAt': -1 })
        .limit(10)
        .select('sessionId userId walletAddress status timings.createdAt verificationResults.nationality');

      const recentVerifications = await User.find({
        'kyc.onchain.isVerified': true,
      })
        .sort({ 'kyc.onchain.verifiedAt': -1 })
        .limit(10)
        .select('userId kyc.onchain.verifiedAt kyc.onchain.nationality kyc.onchain.walletAddress');

      return {
        statistics: {
          users: userStats,
          sessions24h: sessionStats24h,
          sessions7d: sessionStats7d,
        },
        recentActivity: {
          sessions: recentSessions,
          verifications: recentVerifications,
        },
        generatedAt: new Date(),
      };

    } catch (error) {
      console.error('❌ Error getting dashboard data:', error);
      throw error;
    }
  },

  /**
   * Cleanup old data based on retention policies
   */
  async cleanupOldData(retentionDays = 90) {
    try {
      console.log(`🧹 Starting data cleanup (retention: ${retentionDays} days)...`);

      const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

      // Cleanup expired sessions
      const expiredSessions = await KYCSession.cleanupExpiredSessions();

      // Cleanup old completed sessions (keep only metadata)
      const oldSessionsResult = await KYCSession.updateMany(
        {
          status: { $in: ['completed', 'failed'] },
          'timings.createdAt': { $lt: cutoffDate },
          'selfData.proofData': { $exists: true },
        },
        {
          $unset: {
            'selfData.proofData': 1,
            'selfData.qrCodeData': 1,
            'metadata.deviceInfo': 1,
          }
        }
      );

      console.log(`✅ Data cleanup completed:`);
      console.log(`   - Expired sessions: ${expiredSessions.modifiedCount}`);
      console.log(`   - Old sessions cleaned: ${oldSessionsResult.modifiedCount}`);

      return {
        expiredSessions: expiredSessions.modifiedCount,
        oldSessionsCleaned: oldSessionsResult.modifiedCount,
      };

    } catch (error) {
      console.error('❌ Error during data cleanup:', error);
      throw error;
    }
  },

  /**
   * Health check for database models
   */
  async healthCheck() {
    try {
      // Test basic operations
      const userCount = await User.countDocuments();
      const sessionCount = await KYCSession.countDocuments();
      const recentSessionCount = await KYCSession.countDocuments({
        'timings.createdAt': { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      });

      return {
        status: 'healthy',
        models: {
          User: { status: 'available', count: userCount },
          KYCSession: { status: 'available', count: sessionCount },
        },
        activity: {
          recentSessions24h: recentSessionCount,
        },
        timestamp: new Date(),
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date(),
      };
    }
  },
};

module.exports = {
  // Models
  User,
  KYCSession,

  // Initialization
  initializeModels,

  // Utilities
  ...dbUtils,
};