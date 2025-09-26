const mongoose = require('mongoose');

// KYC Session Schema for tracking verification sessions
const kycSessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'failed', 'expired'],
    default: 'pending',
  },
  requirements: {
    minimumAge: { type: Number, default: 18 },
    requireOfacCheck: { type: Boolean, default: true },
    allowedDocumentTypes: [{ type: Number }],
    excludedCountries: [{ type: String }],
  },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date },
  completedAt: { type: Date },
  errorMessage: { type: String },
}, { _id: false });

// Traditional KYC Data Schema (for existing KYC systems)
const traditionalKycSchema = new mongoose.Schema({
  isVerified: { type: Boolean, default: false },
  verifiedAt: { type: Date },
  documents: [{
    type: { type: String }, // passport, license, etc.
    documentId: { type: String },
    uploadedAt: { type: Date, default: Date.now },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    rejectionReason: { type: String },
  }],
  reviewedBy: { type: String },
  notes: { type: String },
}, { _id: false });

// Onchain KYC Data Schema (for Self.xyz verification)
const onchainKycSchema = new mongoose.Schema({
  // Verification status
  isVerified: { type: Boolean, default: false },
  verifiedAt: { type: Date },

  // Blockchain data
  walletAddress: {
    type: String,
    validate: {
      validator: function(v) {
        return /^0x[a-fA-F0-9]{40}$/.test(v);
      },
      message: 'Invalid Ethereum address format'
    }
  },
  nullifier: { type: String }, // Unique identifier from Self proof
  transactionHash: { type: String },
  blockNumber: { type: Number },

  // Identity data (extracted from Self proof)
  nationality: { type: String },
  documentType: {
    type: Number,
    enum: [1, 2, 3], // 1=E-Passport, 2=EU ID Card, 3=Aadhaar
  },
  documentTypeName: { type: String },
  ageAtLeast: { type: Number },
  isOfacClear: { type: Boolean },

  // Verification metadata
  verificationCount: { type: Number, default: 1 },
  lastVerifiedAt: { type: Date },

  // Session tracking
  sessions: [kycSessionSchema],

  // Compliance flags
  riskScore: { type: Number, min: 0, max: 100 },
  complianceNotes: { type: String },

}, { _id: false });

// Main User Schema
const userSchema = new mongoose.Schema({
  // Basic user information
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  username: {
    type: String,
    unique: true,
    sparse: true, // Allow null values but ensure uniqueness when present
    trim: true,
  },

  // Profile information
  profile: {
    firstName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    phoneNumber: { type: String },
    dateOfBirth: { type: Date },
    country: { type: String },
    profilePicture: { type: String }, // URL or file path
  },

  // Account status
  isActive: { type: Boolean, default: true },
  isEmailVerified: { type: Boolean, default: false },
  isPhoneVerified: { type: Boolean, default: false },

  // KYC Information
  kyc: {
    // Overall KYC status
    overallStatus: {
      type: String,
      enum: ['not_started', 'in_progress', 'pending_review', 'verified', 'rejected'],
      default: 'not_started',
    },

    // Traditional KYC (existing system)
    traditional: traditionalKycSchema,

    // Onchain KYC (Self.xyz)
    onchain: onchainKycSchema,

    // KYC preferences
    preferredMethod: {
      type: String,
      enum: ['traditional', 'onchain'],
      default: 'onchain',
    },

    // Compliance tracking
    lastReviewedAt: { type: Date },
    reviewedBy: { type: String },
    complianceLevel: {
      type: String,
      enum: ['basic', 'enhanced', 'premium'],
      default: 'basic',
    },
  },

  // Wallet addresses
  wallets: [{
    address: {
      type: String,
      required: true,
      validate: {
        validator: function(v) {
          return /^0x[a-fA-F0-9]{40}$/.test(v);
        },
        message: 'Invalid Ethereum address format'
      }
    },
    network: { type: String, default: 'celo' },
    isPrimary: { type: Boolean, default: false },
    addedAt: { type: Date, default: Date.now },
    isVerified: { type: Boolean, default: false }, // KYC verified for this wallet
  }],

  // Security and audit
  security: {
    lastLoginAt: { type: Date },
    loginCount: { type: Number, default: 0 },
    passwordChangedAt: { type: Date },
    twoFactorEnabled: { type: Boolean, default: false },
    securityQuestions: [{
      question: String,
      answerHash: String, // Hashed answer
    }],
  },

  // Preferences
  preferences: {
    language: { type: String, default: 'en' },
    timezone: { type: String, default: 'UTC' },
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
      push: { type: Boolean, default: true },
      kycUpdates: { type: Boolean, default: true },
    },
    privacy: {
      shareData: { type: Boolean, default: false },
      marketingEmails: { type: Boolean, default: false },
    },
  },

  // Metadata
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  lastActiveAt: { type: Date, default: Date.now },

  // Soft delete
  deletedAt: { type: Date },
  isDeleted: { type: Boolean, default: false },

}, {
  timestamps: true, // Automatically manage createdAt and updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ 'kyc.onchain.walletAddress': 1 });
userSchema.index({ 'kyc.onchain.nullifier': 1 });
userSchema.index({ 'kyc.onchain.transactionHash': 1 });
userSchema.index({ 'kyc.overallStatus': 1 });
userSchema.index({ 'wallets.address': 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ isDeleted: 1, isActive: 1 });

// Virtual for full name
userSchema.virtual('profile.fullName').get(function() {
  if (this.profile.firstName && this.profile.lastName) {
    return `${this.profile.firstName} ${this.profile.lastName}`;
  }
  return this.profile.firstName || this.profile.lastName || this.username || 'Anonymous';
});

// Virtual for primary wallet
userSchema.virtual('primaryWallet').get(function() {
  return this.wallets.find(wallet => wallet.isPrimary) || this.wallets[0] || null;
});

// Virtual for KYC completion status
userSchema.virtual('kycCompletionPercentage').get(function() {
  let completed = 0;
  let total = 4;

  if (this.kyc.traditional.isVerified || this.kyc.onchain.isVerified) completed += 2;
  if (this.isEmailVerified) completed += 1;
  if (this.profile.firstName && this.profile.lastName) completed += 1;

  return Math.round((completed / total) * 100);
});

// Instance methods

// Check if user is fully KYC verified
userSchema.methods.isKYCVerified = function() {
  return this.kyc.traditional.isVerified || this.kyc.onchain.isVerified;
};

// Get KYC status summary
userSchema.methods.getKYCStatus = function() {
  return {
    isVerified: this.isKYCVerified(),
    method: this.kyc.onchain.isVerified ? 'onchain' :
           this.kyc.traditional.isVerified ? 'traditional' : null,
    verifiedAt: this.kyc.onchain.verifiedAt || this.kyc.traditional.verifiedAt,
    walletAddress: this.kyc.onchain.walletAddress,
    nationality: this.kyc.onchain.nationality,
    documentType: this.kyc.onchain.documentType,
    completionPercentage: this.kycCompletionPercentage,
  };
};

// Add wallet address
userSchema.methods.addWallet = function(address, network = 'celo', isPrimary = false) {
  // Check if wallet already exists
  const existingWallet = this.wallets.find(w => w.address.toLowerCase() === address.toLowerCase());
  if (existingWallet) {
    return false;
  }

  // If this is the first wallet or explicitly set as primary, make it primary
  if (this.wallets.length === 0 || isPrimary) {
    // Remove primary flag from other wallets
    this.wallets.forEach(wallet => wallet.isPrimary = false);
    isPrimary = true;
  }

  this.wallets.push({
    address: address.toLowerCase(),
    network,
    isPrimary,
    addedAt: new Date(),
  });

  return true;
};

// Update onchain KYC data
userSchema.methods.updateOnchainKYC = function(kycData) {
  this.kyc.onchain = {
    ...this.kyc.onchain,
    ...kycData,
    lastVerifiedAt: new Date(),
  };

  // Update overall status
  if (kycData.isVerified) {
    this.kyc.overallStatus = 'verified';
  }

  // Ensure wallet is added and marked as verified
  if (kycData.walletAddress) {
    this.addWallet(kycData.walletAddress, 'celo', true);
    const wallet = this.wallets.find(w => w.address.toLowerCase() === kycData.walletAddress.toLowerCase());
    if (wallet) {
      wallet.isVerified = true;
    }
  }

  this.markModified('kyc');
  return this.save();
};

// Static methods

// Find user by wallet address
userSchema.statics.findByWalletAddress = function(address) {
  return this.findOne({
    $or: [
      { 'wallets.address': address.toLowerCase() },
      { 'kyc.onchain.walletAddress': address.toLowerCase() },
    ],
    isDeleted: false,
  });
};

// Find users by KYC status
userSchema.statics.findByKYCStatus = function(status) {
  return this.find({
    'kyc.overallStatus': status,
    isDeleted: false,
  });
};

// Get KYC statistics
userSchema.statics.getKYCStatistics = async function() {
  const stats = await this.aggregate([
    { $match: { isDeleted: false } },
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        traditionalKYC: {
          $sum: { $cond: ['$kyc.traditional.isVerified', 1, 0] }
        },
        onchainKYC: {
          $sum: { $cond: ['$kyc.onchain.isVerified', 1, 0] }
        },
        totalVerified: {
          $sum: {
            $cond: [
              { $or: ['$kyc.traditional.isVerified', '$kyc.onchain.isVerified'] },
              1, 0
            ]
          }
        },
      }
    }
  ]);

  return stats[0] || {
    totalUsers: 0,
    traditionalKYC: 0,
    onchainKYC: 0,
    totalVerified: 0,
  };
};

// Middleware

// Pre-save middleware to update timestamps
userSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.updatedAt = new Date();
  }
  next();
});

// Pre-save middleware to set document type name
userSchema.pre('save', function(next) {
  if (this.isModified('kyc.onchain.documentType') && this.kyc.onchain.documentType) {
    const typeNames = {
      1: 'E-Passport',
      2: 'EU ID Card',
      3: 'Aadhaar',
    };
    this.kyc.onchain.documentTypeName = typeNames[this.kyc.onchain.documentType] || 'Unknown';
  }
  next();
});

// Model compilation
const User = mongoose.model('User', userSchema);

module.exports = User;