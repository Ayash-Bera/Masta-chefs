const express = require('express');
const router = express.Router();
const StealthKYCService = require('../services/StealthKYCService');
const { body, param, validationResult } = require('express-validator');

// Initialize stealth KYC service
const stealthKYCService = new StealthKYCService();

/**
 * @route POST /api/stealth-kyc/session
 * @desc Create a new stealth KYC verification session
 */
router.post('/session', [
  body('userId').notEmpty().withMessage('User ID is required'),
  body('stealthAddress').isEthereumAddress().withMessage('Valid stealth address is required'),
  body('additionalRequirements').optional().isObject(),
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array(),
        requestId: req.id,
      });
    }

    const { userId, stealthAddress, additionalRequirements = {} } = req.body;

    console.log(`📋 Creating stealth KYC session for user ${userId} with address ${stealthAddress}`);

    const result = await stealthKYCService.initiateStealthKYC(
      userId,
      stealthAddress,
      additionalRequirements
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
        details: result.details,
        requestId: req.id,
      });
    }

    res.json({
      success: true,
      sessionData: result.sessionData,
      session: result.session,
      requestId: req.id,
    });

  } catch (error) {
    console.error('❌ Error creating stealth KYC session:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message,
      requestId: req.id,
    });
  }
});

/**
 * @route GET /api/stealth-kyc/session/:sessionId
 * @desc Get stealth KYC session status
 */
router.get('/session/:sessionId', [
  param('sessionId').notEmpty().withMessage('Session ID is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array(),
        requestId: req.id,
      });
    }

    const { sessionId } = req.params;

    // In a real implementation, you'd fetch session from database
    // For now, return a placeholder response
    res.json({
      success: true,
      session: {
        sessionId,
        status: 'pending',
        message: 'Session status tracking not implemented yet',
      },
      requestId: req.id,
    });

  } catch (error) {
    console.error('❌ Error fetching stealth KYC session:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message,
      requestId: req.id,
    });
  }
});

/**
 * @route POST /api/stealth-kyc/verify
 * @desc Process stealth KYC verification callback from Self.xyz
 */
router.post('/verify', async (req, res) => {
  try {
    const verificationData = req.body;
    const signature = req.headers['x-self-signature'];

    console.log('🔄 Received stealth KYC verification callback');

    const result = await stealthKYCService.processStealthVerification(
      verificationData,
      signature
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
        details: result.details,
        requestId: req.id,
      });
    }

    res.json({
      success: true,
      verificationResult: result.verificationResult,
      user: result.user,
      onchainResult: result.onchainResult,
      requestId: req.id,
    });

  } catch (error) {
    console.error('❌ Error processing stealth verification:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message,
      requestId: req.id,
    });
  }
});

/**
 * @route GET /api/stealth-kyc/status/:stealthAddress
 * @desc Get KYC status for a stealth address
 */
router.get('/status/:stealthAddress', [
  param('stealthAddress').isEthereumAddress().withMessage('Valid stealth address is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array(),
        requestId: req.id,
      });
    }

    const { stealthAddress } = req.params;

    console.log(`🔍 Checking stealth KYC status for ${stealthAddress}`);

    const result = await stealthKYCService.getStealthKYCStatus(stealthAddress);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        error: result.error,
        requestId: req.id,
      });
    }

    res.json({
      success: true,
      kycData: result.kycData,
      requestId: req.id,
    });

  } catch (error) {
    console.error('❌ Error fetching stealth KYC status:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message,
      requestId: req.id,
    });
  }
});

/**
 * @route GET /api/stealth-kyc/master/:masterNullifier
 * @desc Get master identity information
 */
router.get('/master/:masterNullifier', [
  param('masterNullifier').notEmpty().withMessage('Master nullifier is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array(),
        requestId: req.id,
      });
    }

    const { masterNullifier } = req.params;

    console.log(`🔍 Fetching master identity for ${masterNullifier}`);

    const result = await stealthKYCService.getMasterIdentity(masterNullifier);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        error: result.error,
        requestId: req.id,
      });
    }

    res.json({
      success: true,
      masterIdentity: result.masterIdentity,
      requestId: req.id,
    });

  } catch (error) {
    console.error('❌ Error fetching master identity:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message,
      requestId: req.id,
    });
  }
});

/**
 * @route POST /api/stealth-kyc/link
 * @desc Link a new stealth address to existing master identity
 */
router.post('/link', [
  body('masterNullifier').notEmpty().withMessage('Master nullifier is required'),
  body('stealthAddress').isEthereumAddress().withMessage('Valid stealth address is required'),
  body('linkingProof').notEmpty().withMessage('Linking proof is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array(),
        requestId: req.id,
      });
    }

    const { masterNullifier, stealthAddress, linkingProof } = req.body;

    console.log(`🔗 Linking stealth address ${stealthAddress} to master ${masterNullifier}`);

    const result = await stealthKYCService.linkStealthAddress(
      masterNullifier,
      stealthAddress,
      linkingProof
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
        details: result.details,
        requestId: req.id,
      });
    }

    res.json({
      success: true,
      linkingResult: result.linkingResult,
      linkedAddress: result.linkedAddress,
      requestId: req.id,
    });

  } catch (error) {
    console.error('❌ Error linking stealth address:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message,
      requestId: req.id,
    });
  }
});

/**
 * @route POST /api/stealth-kyc/verify-dob
 * @desc Verify DOB commitment for a master identity
 */
router.post('/verify-dob', [
  body('masterNullifier').notEmpty().withMessage('Master nullifier is required'),
  body('dateOfBirth').notEmpty().withMessage('Date of birth is required'),
  body('stealthAddress').isEthereumAddress().withMessage('Valid stealth address is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array(),
        requestId: req.id,
      });
    }

    const { masterNullifier, dateOfBirth, stealthAddress } = req.body;

    console.log(`🔒 Verifying DOB commitment for master ${masterNullifier}`);

    const result = await stealthKYCService.verifyDOBCommitment(
      masterNullifier,
      dateOfBirth,
      stealthAddress
    );

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: result.error,
        requestId: req.id,
      });
    }

    res.json({
      success: true,
      isValid: result.isValid,
      verificationTimestamp: result.verificationTimestamp,
      masterNullifier: result.masterNullifier,
      requestId: req.id,
    });

  } catch (error) {
    console.error('❌ Error verifying DOB commitment:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message,
      requestId: req.id,
    });
  }
});

/**
 * @route GET /api/stealth-kyc/config
 * @desc Get stealth KYC system configuration
 */
router.get('/config', async (req, res) => {
  try {
    const selfConfig = stealthKYCService.getCurrentConfiguration();
    const networkInfo = stealthKYCService.getNetworkInfo();

    res.json({
      success: true,
      configuration: {
        self: selfConfig,
        network: networkInfo,
        features: {
          stealthAddresses: true,
          dobCommitments: true,
          masterIdentities: true,
          multipleAddressLinking: true,
        },
      },
      requestId: req.id,
    });

  } catch (error) {
    console.error('❌ Error fetching stealth KYC configuration:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message,
      requestId: req.id,
    });
  }
});

/**
 * @route GET /api/stealth-kyc/health
 * @desc Health check for stealth KYC services
 */
router.get('/health', async (req, res) => {
  try {
    const healthStatus = await stealthKYCService.healthCheck();

    const httpStatus = healthStatus.status === 'operational' ? 200 :
                      healthStatus.status === 'degraded' ? 206 : 503;

    res.status(httpStatus).json({
      success: healthStatus.status !== 'error',
      health: healthStatus,
      requestId: req.id,
    });

  } catch (error) {
    console.error('❌ Error checking stealth KYC health:', error);
    res.status(503).json({
      success: false,
      error: 'Health check failed',
      details: error.message,
      requestId: req.id,
    });
  }
});

/**
 * @route GET /api/stealth-kyc/stats
 * @desc Get stealth KYC system statistics
 */
router.get('/stats', async (req, res) => {
  try {
    // In a real implementation, you'd fetch from the contract
    // For now, return placeholder statistics
    const stats = {
      totalVerifications: 0,
      uniqueIdentities: 0,
      totalStealthAddresses: 0,
      contractAddress: stealthKYCService.getNetworkInfo().contractAddress,
      network: stealthKYCService.getNetworkInfo().network,
      lastUpdated: new Date().toISOString(),
    };

    res.json({
      success: true,
      statistics: stats,
      requestId: req.id,
    });

  } catch (error) {
    console.error('❌ Error fetching stealth KYC statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      details: error.message,
      requestId: req.id,
    });
  }
});

module.exports = router;