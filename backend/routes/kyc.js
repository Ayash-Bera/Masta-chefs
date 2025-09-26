const express = require('express');
const router = express.Router();
const SelfService = require('../services/SelfService');
const { User, KYCSession, createOrUpdateUserKYC } = require('../models');

// Initialize services
const selfService = new SelfService();
console.log('✅ KYC routes loaded - validateWalletAddress middleware removed');

// ========================================
// Middleware
// ========================================

// Basic request validation middleware
const validateRequest = (req, res, next) => {
  req.requestId = req.requestId || Math.random().toString(36).substring(2, 15);
  next();
};

// User authentication middleware (implement based on your auth system)
const authenticateUser = (req, res, next) => {
  // TODO: Implement your authentication logic here
  // For now, we'll extract user info from headers or token

  const userId = req.headers['x-user-id'] || req.query.userId;
  const userEmail = req.headers['x-user-email'] || req.query.userEmail;

  if (!userId) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      message: 'User ID is required. Set x-user-id header or userId query parameter.',
      requestId: req.requestId,
    });
  }

  req.user = {
    id: userId,
    email: userEmail,
  };

  next();
};


// ========================================
// Onchain KYC Routes
// ========================================

/**
 * Initiate onchain KYC verification
 * POST /api/kyc/onchain/initiate
 */
router.post('/onchain/initiate', validateRequest, authenticateUser, async (req, res) => {
  try {
    const { walletAddress, requirements = {} } = req.body;
    const userId = req.user.id;

    // Validate wallet address
    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address is required',
        requestId: req.requestId,
      });
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid wallet address format',
        requestId: req.requestId,
      });
    }

    console.log(`🚀 KYC initiation request from user ${userId} for wallet ${walletAddress}`);

    // Check if user is already verified
    const existingUser = await User.findByWalletAddress(walletAddress);
    if (existingUser && existingUser.isKYCVerified()) {
      return res.status(400).json({
        success: false,
        error: 'User already verified',
        kycStatus: existingUser.getKYCStatus(),
        requestId: req.requestId,
      });
    }

    // Check for active sessions
    const activeSessions = await KYCSession.findActiveByUser(userId);
    if (activeSessions.length > 0) {
      const activeSession = activeSessions[0];
      return res.status(409).json({
        success: false,
        error: 'Active verification session exists',
        sessionId: activeSession.sessionId,
        status: activeSession.status,
        expiresAt: activeSession.timings.expiresAt,
        requestId: req.requestId,
      });
    }

    // Validate requirements
    const validationResult = selfService.validateRequirements(requirements);
    if (!validationResult.isValid) {
      return res.status(400).json({
        success: false,
        error: 'Invalid verification requirements',
        details: validationResult.errors,
        supportedConfig: validationResult.supportedConfig,
        requestId: req.requestId,
      });
    }

    // Initiate KYC with Self service
    const result = await selfService.initiateOnchainKYC(userId, walletAddress, requirements);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
        details: result.details,
        requestId: req.requestId,
      });
    }

    // Create KYC session
    const kycSession = new KYCSession({
      sessionId: result.session.sessionId,
      userId: userId,
      userEmail: req.user.email,
      walletAddress: walletAddress,
      status: 'qr_generated',
      method: 'self_onchain',
      requirements: result.session.requirements,
      selfData: {
        scope: result.sessionData.scope,
        configId: result.sessionData.configId,
        qrCodeData: new Map(Object.entries(result.sessionData)),
      },
      timings: {
        createdAt: new Date(),
        qrGeneratedAt: new Date(),
        expiresAt: result.session.expiresAt,
      },
      metadata: {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip || req.connection.remoteAddress,
      },
    });

    await kycSession.save();
    await kycSession.addTimelineEvent('session_created', {
      userId,
      walletAddress,
      method: 'self_onchain',
    });

    console.log(`✅ KYC session created: ${kycSession.sessionId}`);

    res.json({
      success: true,
      sessionData: result.sessionData,
      session: {
        sessionId: kycSession.sessionId,
        status: kycSession.status,
        expiresAt: kycSession.timings.expiresAt,
        progressPercentage: kycSession.progressPercentage,
      },
      requestId: req.requestId,
    });

  } catch (error) {
    console.error('❌ KYC initiation error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Unable to initiate KYC',
      requestId: req.requestId,
    });
  }
});

/**
 * Self.xyz verification webhook endpoint
 * POST /api/kyc/onchain/verify
 */
router.post('/onchain/verify', validateRequest, async (req, res) => {
  try {
    const verificationData = req.body;
    const signature = req.headers['x-self-signature'] || req.headers[process.env.WEBHOOK_SIGNATURE_HEADER || 'x-signature'];

    console.log('🔄 Received Self verification webhook');

    // Process verification using Self service
    const result = await selfService.processVerification(verificationData, signature);

    if (!result.success) {
      console.error('❌ Verification processing failed:', result.error);
      return res.status(400).json({
        success: false,
        error: result.error,
        details: result.details,
        requestId: req.requestId,
      });
    }

    const { user: userData, verificationResult, onchainResult } = result;

    // Find and update the KYC session
    const session = await KYCSession.findOne({
      walletAddress: userData.walletAddress,
      status: { $in: ['qr_generated', 'qr_scanned', 'in_progress', 'proof_submitted'] },
    }).sort({ 'timings.createdAt': -1 });

    if (session) {
      await session.updateStatus('blockchain_confirmed', {
        transactionHash: userData.transactionHash,
      });

      await session.updateVerificationResults({
        nullifier: verificationResult.nullifier,
        userIdentifier: verificationResult.userIdentifier,
        nationality: verificationResult.nationality,
        documentType: verificationResult.documentType,
        ageAtLeast: verificationResult.ageAtLeast,
        isOfacMatch: verificationResult.isOfacMatch,
        isOfacClear: !verificationResult.isOfacMatch,
      });

      await session.updateBlockchainData({
        transactionHash: userData.transactionHash,
        blockNumber: onchainResult.blockNumber,
        gasUsed: onchainResult.gasUsed,
      });
    }

    // Create or update user record
    const user = await createOrUpdateUserKYC(
      verificationData.userContextData?.userId || userData.walletAddress,
      userData.walletAddress,
      {
        nullifier: verificationResult.nullifier,
        transactionHash: userData.transactionHash,
        blockNumber: onchainResult.blockNumber,
        nationality: verificationResult.nationality,
        documentType: verificationResult.documentType,
        ageAtLeast: verificationResult.ageAtLeast,
        isOfacClear: !verificationResult.isOfacMatch,
        email: verificationData.userContextData?.email,
      },
      session?.sessionId
    );

    console.log(`✅ KYC verification completed for ${userData.walletAddress}`);

    res.json({
      success: true,
      message: 'KYC verification completed successfully',
      user: {
        walletAddress: userData.walletAddress,
        isVerified: true,
        verifiedAt: userData.verifiedAt,
        nationality: userData.nationality,
        transactionHash: userData.transactionHash,
      },
      requestId: req.requestId,
    });

  } catch (error) {
    console.error('❌ Verification webhook error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Verification processing failed',
      requestId: req.requestId,
    });
  }
});

/**
 * Get onchain KYC status for a wallet address
 * GET /api/kyc/onchain/status/:walletAddress
 */
router.get('/onchain/status/:walletAddress', validateRequest, async (req, res) => {
  try {
    const walletAddress = req.params.walletAddress;

    // Validate wallet address
    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address is required',
        requestId: req.requestId,
      });
    }

    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid wallet address format',
        requestId: req.requestId,
      });
    }

    console.log(`🔍 Checking KYC status for ${walletAddress}`);

    // Get onchain status from Self service (which queries the smart contract)
    const onchainResult = await selfService.getOnchainKYCStatus(walletAddress);

    if (!onchainResult.success) {
      return res.status(500).json({
        success: false,
        error: onchainResult.error,
        requestId: req.requestId,
      });
    }

    // Get user data from database
    const userWithKYC = await User.findByWalletAddress(walletAddress);

    // Get recent session data
    const recentSessions = await KYCSession.findByWalletAddress(walletAddress)
      .limit(3)
      .select('sessionId status timings.createdAt timings.sessionCompletedAt blockchainData.transactionHash')
      .sort({ 'timings.createdAt': -1 });

    const kycStatus = {
      walletAddress,
      isVerified: onchainResult.kycData.isVerified,

      // Onchain data (source of truth)
      onchain: onchainResult.kycData,

      // Database data (additional context)
      user: userWithKYC ? {
        userId: userWithKYC.userId,
        email: userWithKYC.email,
        kycStatus: userWithKYC.getKYCStatus(),
        primaryWallet: userWithKYC.primaryWallet,
      } : null,

      // Recent activity
      recentSessions: recentSessions.map(session => ({
        sessionId: session.sessionId,
        status: session.status,
        createdAt: session.timings.createdAt,
        completedAt: session.timings.sessionCompletedAt,
        transactionHash: session.blockchainData?.transactionHash,
      })),

      // Metadata
      lastCheckedAt: new Date(),
      requestId: req.requestId,
    };

    res.json({
      success: true,
      kycStatus,
      requestId: req.requestId,
    });

  } catch (error) {
    console.error('❌ Error fetching KYC status:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Unable to fetch KYC status',
      requestId: req.requestId,
    });
  }
});

/**
 * Get KYC session details
 * GET /api/kyc/onchain/session/:sessionId
 */
router.get('/onchain/session/:sessionId', validateRequest, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const session = await KYCSession.findOne({ sessionId });

    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
        requestId: req.requestId,
      });
    }

    res.json({
      success: true,
      session: session.getSummary(),
      timeline: session.timeline,
      requestId: req.requestId,
    });

  } catch (error) {
    console.error('❌ Error fetching session details:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      requestId: req.requestId,
    });
  }
});

/**
 * Get verification statistics
 * GET /api/kyc/onchain/statistics
 */
router.get('/onchain/statistics', validateRequest, async (req, res) => {
  try {
    const timeframe = req.query.timeframe || '30d';

    // Get statistics from Self service (contract data)
    const contractStats = await selfService.getVerificationStatistics();

    // Get database statistics
    const dbStats = await KYCSession.getStatistics(timeframe);

    res.json({
      success: true,
      statistics: {
        contract: contractStats.success ? contractStats.statistics : null,
        sessions: dbStats,
        timeframe,
      },
      requestId: req.requestId,
    });

  } catch (error) {
    console.error('❌ Error fetching statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      requestId: req.requestId,
    });
  }
});

/**
 * Get supported configuration
 * GET /api/kyc/onchain/config
 */
router.get('/onchain/config', validateRequest, async (req, res) => {
  try {
    const selfConfig = selfService.getCurrentConfiguration();
    const networkInfo = selfService.getNetworkInfo();
    const documentTypes = selfService.getSupportedDocumentTypes();

    res.json({
      success: true,
      configuration: {
        self: selfConfig,
        network: networkInfo,
        documentTypes,
      },
      requestId: req.requestId,
    });

  } catch (error) {
    console.error('❌ Error fetching configuration:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      requestId: req.requestId,
    });
  }
});

/**
 * Health check for KYC services
 * GET /api/kyc/health
 */
router.get('/health', validateRequest, async (req, res) => {
  try {
    const healthCheck = await selfService.healthCheck();

    res.json({
      success: true,
      health: healthCheck,
      requestId: req.requestId,
    });

  } catch (error) {
    console.error('❌ Health check error:', error);
    res.status(500).json({
      success: false,
      error: 'Health check failed',
      details: error.message,
      requestId: req.requestId,
    });
  }
});

// ========================================
// Error Handling
// ========================================

// Handle 404 for KYC routes
router.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'KYC endpoint not found',
    availableEndpoints: [
      'POST /api/kyc/onchain/initiate',
      'POST /api/kyc/onchain/verify',
      'GET /api/kyc/onchain/status/:walletAddress',
      'GET /api/kyc/onchain/session/:sessionId',
      'GET /api/kyc/onchain/statistics',
      'GET /api/kyc/onchain/config',
      'GET /api/kyc/health',
    ],
    requestId: req.requestId,
  });
});

module.exports = router;