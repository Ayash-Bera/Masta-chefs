const mongoose = require('mongoose');

// KYC Session Schema for detailed session tracking
const kycSessionSchema = new mongoose.Schema({
  // Session identification
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },

  // User information
  userId: {
    type: String,
    required: true,
    index: true,
  },
  userEmail: { type: String },
  walletAddress: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^0x[a-fA-F0-9]{40}$/.test(v);
      },
      message: 'Invalid Ethereum address format'
    },
    index: true,
  },

  // Session status and flow
  status: {
    type: String,
    enum: [
      'initiated',      // Session created, waiting for user action
      'qr_generated',   // QR code generated and displayed
      'qr_scanned',     // User scanned QR with Self app
      'in_progress',    // User completing verification in Self app
      'proof_submitted', // Self submitted proof to backend
      'proof_verified', // Backend verified the Self proof
      'blockchain_pending', // Submitting to blockchain
      'blockchain_confirmed', // Blockchain transaction confirmed
      'completed',      // Full KYC process completed
      'failed',         // Verification failed
      'expired',        // Session expired
      'cancelled',      // User cancelled
    ],
    default: 'initiated',
    index: true,
  },

  // Verification method and configuration
  method: {
    type: String,
    enum: ['self_onchain', 'traditional'],
    default: 'self_onchain',
  },
  requirements: {
    minimumAge: { type: Number, default: 18 },
    requireOfacCheck: { type: Boolean, default: true },
    allowedDocumentTypes: [{ type: Number }],
    excludedCountries: [{ type: String }],
    customRequirements: { type: Map, of: mongoose.Schema.Types.Mixed },
  },

  // Self.xyz specific data
  selfData: {
    scope: { type: String },
    configId: { type: String },
    qrCodeData: { type: Map, of: mongoose.Schema.Types.Mixed },
    proofData: { type: Map, of: mongoose.Schema.Types.Mixed },
    verificationResult: { type: Map, of: mongoose.Schema.Types.Mixed },
  },

  // Blockchain transaction data
  blockchainData: {
    transactionHash: { type: String },
    blockNumber: { type: Number },
    gasUsed: { type: String },
    gasPrice: { type: String },
    networkFee: { type: String },
    confirmations: { type: Number, default: 0 },
  },

  // Verification results
  verificationResults: {
    nullifier: { type: String },
    userIdentifier: { type: String },
    nationality: { type: String },
    documentType: { type: Number },
    documentTypeName: { type: String },
    ageAtLeast: { type: Number },
    isOfacMatch: { type: Boolean },
    isOfacClear: { type: Boolean },
    riskScore: { type: Number },
  },

  // Timeline tracking
  timeline: [{
    event: {
      type: String,
      enum: [
        'session_created',
        'qr_generated',
        'qr_scanned',
        'verification_started',
        'document_captured',
        'biometric_captured',
        'proof_generated',
        'proof_submitted',
        'proof_verified',
        'blockchain_submitted',
        'blockchain_confirmed',
        'session_completed',
        'session_failed',
        'session_expired',
        'session_cancelled',
      ],
    },
    timestamp: { type: Date, default: Date.now },
    details: { type: Map, of: mongoose.Schema.Types.Mixed },
    metadata: { type: Map, of: mongoose.Schema.Types.Mixed },
  }],

  // Error tracking
  errors: [{
    errorCode: { type: String },
    errorMessage: { type: String },
    errorDetails: { type: Map, of: mongoose.Schema.Types.Mixed },
    timestamp: { type: Date, default: Date.now },
    resolved: { type: Boolean, default: false },
  }],

  // Session metadata
  metadata: {
    userAgent: { type: String },
    ipAddress: { type: String },
    referrer: { type: String },
    clientVersion: { type: String },
    deviceInfo: { type: Map, of: mongoose.Schema.Types.Mixed },
  },

  // Timing information
  timings: {
    createdAt: { type: Date, default: Date.now },
    qrGeneratedAt: { type: Date },
    qrScannedAt: { type: Date },
    verificationStartedAt: { type: Date },
    verificationCompletedAt: { type: Date },
    proofSubmittedAt: { type: Date },
    proofVerifiedAt: { type: Date },
    blockchainSubmittedAt: { type: Date },
    blockchainConfirmedAt: { type: Date },
    sessionCompletedAt: { type: Date },
    expiresAt: { type: Date },
  },

  // Compliance and audit
  compliance: {
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low',
    },
    complianceChecks: [{
      checkType: { type: String },
      checkResult: { type: String },
      checkTimestamp: { type: Date, default: Date.now },
      checkDetails: { type: Map, of: mongoose.Schema.Types.Mixed },
    }],
    auditTrail: [{
      action: { type: String },
      actor: { type: String },
      timestamp: { type: Date, default: Date.now },
      details: { type: Map, of: mongoose.Schema.Types.Mixed },
    }],
  },

  // Performance metrics
  performance: {
    totalDuration: { type: Number }, // milliseconds
    qrScanDuration: { type: Number },
    verificationDuration: { type: Number },
    proofGenerationDuration: { type: Number },
    blockchainSubmissionDuration: { type: Number },
  },

  // External references
  externalReferences: {
    userId: { type: String },
    sessionToken: { type: String },
    correlationId: { type: String },
    parentSessionId: { type: String }, // For retry sessions
  },

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes for performance
kycSessionSchema.index({ sessionId: 1 });
kycSessionSchema.index({ userId: 1, status: 1 });
kycSessionSchema.index({ walletAddress: 1, status: 1 });
kycSessionSchema.index({ status: 1, 'timings.createdAt': -1 });
kycSessionSchema.index({ 'timings.expiresAt': 1 }); // For cleanup
kycSessionSchema.index({ 'verificationResults.nullifier': 1 });
kycSessionSchema.index({ 'blockchainData.transactionHash': 1 });

// Virtual for session duration
kycSessionSchema.virtual('duration').get(function() {
  if (this.timings.sessionCompletedAt && this.timings.createdAt) {
    return this.timings.sessionCompletedAt - this.timings.createdAt;
  }
  return Date.now() - this.timings.createdAt;
});

// Virtual for session progress percentage
kycSessionSchema.virtual('progressPercentage').get(function() {
  const statusProgress = {
    'initiated': 10,
    'qr_generated': 20,
    'qr_scanned': 30,
    'in_progress': 50,
    'proof_submitted': 70,
    'proof_verified': 80,
    'blockchain_pending': 90,
    'blockchain_confirmed': 95,
    'completed': 100,
    'failed': 0,
    'expired': 0,
    'cancelled': 0,
  };
  return statusProgress[this.status] || 0;
});

// Virtual for session health status
kycSessionSchema.virtual('healthStatus').get(function() {
  if (this.status === 'completed') return 'healthy';
  if (this.status === 'failed' || this.status === 'expired') return 'unhealthy';
  if (this.errors.length > 0) return 'warning';
  if (this.timings.expiresAt && this.timings.expiresAt < new Date()) return 'expired';
  return 'active';
});

// Instance methods

// Add timeline event
kycSessionSchema.methods.addTimelineEvent = function(event, details = {}, metadata = {}) {
  this.timeline.push({
    event,
    timestamp: new Date(),
    details: new Map(Object.entries(details)),
    metadata: new Map(Object.entries(metadata)),
  });

  // Update relevant timing fields
  const timingField = this.getTimingFieldForEvent(event);
  if (timingField) {
    this.timings[timingField] = new Date();
  }

  return this.save();
};

// Get timing field name for event
kycSessionSchema.methods.getTimingFieldForEvent = function(event) {
  const eventToTiming = {
    'qr_generated': 'qrGeneratedAt',
    'qr_scanned': 'qrScannedAt',
    'verification_started': 'verificationStartedAt',
    'proof_submitted': 'proofSubmittedAt',
    'proof_verified': 'proofVerifiedAt',
    'blockchain_submitted': 'blockchainSubmittedAt',
    'blockchain_confirmed': 'blockchainConfirmedAt',
    'session_completed': 'sessionCompletedAt',
  };
  return eventToTiming[event];
};

// Update session status
kycSessionSchema.methods.updateStatus = function(newStatus, details = {}) {
  const oldStatus = this.status;
  this.status = newStatus;

  // Add timeline event
  this.addTimelineEvent(`status_changed_to_${newStatus}`, {
    oldStatus,
    newStatus,
    ...details,
  });

  return this.save();
};

// Add error
kycSessionSchema.methods.addError = function(errorCode, errorMessage, errorDetails = {}) {
  this.errors.push({
    errorCode,
    errorMessage,
    errorDetails: new Map(Object.entries(errorDetails)),
    timestamp: new Date(),
  });

  return this.save();
};

// Update verification results
kycSessionSchema.methods.updateVerificationResults = function(results) {
  this.verificationResults = { ...this.verificationResults, ...results };
  this.markModified('verificationResults');
  return this.save();
};

// Update blockchain data
kycSessionSchema.methods.updateBlockchainData = function(blockchainData) {
  this.blockchainData = { ...this.blockchainData, ...blockchainData };
  this.markModified('blockchainData');
  return this.save();
};

// Check if session is expired
kycSessionSchema.methods.isExpired = function() {
  return this.timings.expiresAt && this.timings.expiresAt < new Date();
};

// Get session summary
kycSessionSchema.methods.getSummary = function() {
  return {
    sessionId: this.sessionId,
    userId: this.userId,
    walletAddress: this.walletAddress,
    status: this.status,
    method: this.method,
    progressPercentage: this.progressPercentage,
    duration: this.duration,
    healthStatus: this.healthStatus,
    createdAt: this.timings.createdAt,
    completedAt: this.timings.sessionCompletedAt,
    expiresAt: this.timings.expiresAt,
    errorCount: this.errors.length,
    hasBlockchainTx: !!this.blockchainData.transactionHash,
  };
};

// Static methods

// Find active sessions for user
kycSessionSchema.statics.findActiveByUser = function(userId) {
  return this.find({
    userId,
    status: { $nin: ['completed', 'failed', 'expired', 'cancelled'] },
    'timings.expiresAt': { $gt: new Date() },
  }).sort({ 'timings.createdAt': -1 });
};

// Find sessions by wallet address
kycSessionSchema.statics.findByWalletAddress = function(walletAddress) {
  return this.find({ walletAddress }).sort({ 'timings.createdAt': -1 });
};

// Find sessions by transaction hash
kycSessionSchema.statics.findByTransactionHash = function(txHash) {
  return this.findOne({ 'blockchainData.transactionHash': txHash });
};

// Get session statistics
kycSessionSchema.statics.getStatistics = async function(timeframe = 'all') {
  const matchCondition = {};

  if (timeframe !== 'all') {
    const now = new Date();
    let startDate;

    switch (timeframe) {
      case '24h':
        startDate = new Date(now - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    if (startDate) {
      matchCondition['timings.createdAt'] = { $gte: startDate };
    }
  }

  const stats = await this.aggregate([
    { $match: matchCondition },
    {
      $group: {
        _id: null,
        totalSessions: { $sum: 1 },
        completedSessions: {
          $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
        },
        failedSessions: {
          $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
        },
        averageDuration: {
          $avg: {
            $cond: [
              { $ne: ['$timings.sessionCompletedAt', null] },
              { $subtract: ['$timings.sessionCompletedAt', '$timings.createdAt'] },
              null
            ]
          }
        },
        uniqueUsers: { $addToSet: '$userId' },
        uniqueWallets: { $addToSet: '$walletAddress' },
      }
    },
    {
      $addFields: {
        successRate: {
          $cond: [
            { $gt: ['$totalSessions', 0] },
            { $multiply: [{ $divide: ['$completedSessions', '$totalSessions'] }, 100] },
            0
          ]
        },
        uniqueUserCount: { $size: '$uniqueUsers' },
        uniqueWalletCount: { $size: '$uniqueWallets' },
      }
    }
  ]);

  return stats[0] || {
    totalSessions: 0,
    completedSessions: 0,
    failedSessions: 0,
    successRate: 0,
    averageDuration: 0,
    uniqueUserCount: 0,
    uniqueWalletCount: 0,
  };
};

// Cleanup expired sessions
kycSessionSchema.statics.cleanupExpiredSessions = async function() {
  const result = await this.updateMany(
    {
      status: { $nin: ['completed', 'failed', 'expired', 'cancelled'] },
      'timings.expiresAt': { $lt: new Date() },
    },
    {
      $set: { status: 'expired' },
      $push: {
        timeline: {
          event: 'session_expired',
          timestamp: new Date(),
          details: new Map([['reason', 'automatic_cleanup']]),
        }
      }
    }
  );

  return result;
};

// Middleware

// Pre-save middleware to calculate performance metrics
kycSessionSchema.pre('save', function(next) {
  if (this.isModified('timings')) {
    this.calculatePerformanceMetrics();
  }
  next();
});

// Calculate performance metrics
kycSessionSchema.methods.calculatePerformanceMetrics = function() {
  const timings = this.timings;

  if (timings.sessionCompletedAt && timings.createdAt) {
    this.performance.totalDuration = timings.sessionCompletedAt - timings.createdAt;
  }

  if (timings.qrScannedAt && timings.qrGeneratedAt) {
    this.performance.qrScanDuration = timings.qrScannedAt - timings.qrGeneratedAt;
  }

  if (timings.verificationCompletedAt && timings.verificationStartedAt) {
    this.performance.verificationDuration = timings.verificationCompletedAt - timings.verificationStartedAt;
  }

  if (timings.proofVerifiedAt && timings.proofSubmittedAt) {
    this.performance.proofGenerationDuration = timings.proofVerifiedAt - timings.proofSubmittedAt;
  }

  if (timings.blockchainConfirmedAt && timings.blockchainSubmittedAt) {
    this.performance.blockchainSubmissionDuration = timings.blockchainConfirmedAt - timings.blockchainSubmittedAt;
  }
};

const KYCSession = mongoose.model('KYCSession', kycSessionSchema);

module.exports = KYCSession;