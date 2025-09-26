const { SelfBackendVerifier } = require('@selfxyz/core');

class SelfConfig {
  constructor() {
    this.scope = process.env.SELF_APP_SCOPE || 'your-app-kyc-v1';
    this.apiEndpoint = process.env.SELF_API_ENDPOINT || 'https://staging-api.self.xyz';
    this.configId = process.env.SELF_CONFIG_ID || '1';
    this.webhookSecret = process.env.SELF_WEBHOOK_SECRET;
    this.isProduction = process.env.NODE_ENV === 'production';

    // Verification requirements - match your smart contract configuration
    this.verificationConfig = {
      minimumAge: parseInt(process.env.SELF_MINIMUM_AGE) || 18,
      requireOfacCheck: process.env.SELF_REQUIRE_OFAC_CHECK === 'true',
      excludedCountries: this.parseExcludedCountries(),
      allowedDocumentTypes: this.parseAllowedDocumentTypes(),
    };

    // Initialize Self backend verifier
    this.backendVerifier = null;
    this.initialize();
  }

  parseExcludedCountries() {
    const excluded = process.env.SELF_EXCLUDED_COUNTRIES;
    if (!excluded) return [];
    return excluded.split(',').map(country => country.trim().toUpperCase());
  }

  parseAllowedDocumentTypes() {
    const allowed = process.env.SELF_ALLOWED_DOCUMENT_TYPES;
    if (!allowed) return [1, 2]; // Default: E-Passport, EU ID Card

    return allowed.split(',').map(type => parseInt(type.trim())).filter(type => !isNaN(type));
  }

  initialize() {
    try {
      // Document type mapping for Self.xyz
      const documentTypeMapping = {
        1: 'E-Passport',
        2: 'EU ID Card',
        3: 'Aadhaar', // For Indian users
      };

      // Create backend verifier instance
      this.backendVerifier = new SelfBackendVerifier(
        this.scope,
        this.apiEndpoint,
        !this.isProduction, // testing flag (true for non-production)
        this.verificationConfig.allowedDocumentTypes.map(String), // Convert to string array
        {
          excludedCountries: this.verificationConfig.excludedCountries,
          ofac: this.verificationConfig.requireOfacCheck,
          minimumAge: this.verificationConfig.minimumAge,
        },
        'hex' // User ID type
      );

      console.log(`🔐 Self.xyz initialized with scope: ${this.scope}`);
      console.log(`🌍 API Endpoint: ${this.apiEndpoint}`);
      console.log(`📋 Config ID: ${this.configId}`);
      console.log(`🎯 Environment: ${this.isProduction ? 'production' : 'staging'}`);
      console.log(`📑 Allowed Documents: ${this.verificationConfig.allowedDocumentTypes.map(type => documentTypeMapping[type] || `Type ${type}`).join(', ')}`);

      if (!this.webhookSecret) {
        console.warn('⚠️  Warning: SELF_WEBHOOK_SECRET not set. Webhook signature validation disabled.');
      }

    } catch (error) {
      console.error('❌ Failed to initialize Self.xyz configuration:', error.message);
      throw error;
    }
  }

  async validateConfiguration() {
    try {
      // Test API connectivity (if available in SDK)
      console.log('🔄 Validating Self.xyz configuration...');

      // Validate required configuration
      if (!this.scope) {
        throw new Error('SELF_APP_SCOPE is required');
      }

      if (!this.configId) {
        throw new Error('SELF_CONFIG_ID is required');
      }

      // Validate document types
      const validDocumentTypes = [1, 2, 3]; // E-Passport, EU ID Card, Aadhaar
      const invalidTypes = this.verificationConfig.allowedDocumentTypes.filter(
        type => !validDocumentTypes.includes(type)
      );

      if (invalidTypes.length > 0) {
        console.warn(`⚠️  Warning: Invalid document types configured: ${invalidTypes.join(', ')}`);
      }

      // Validate age requirement
      if (this.verificationConfig.minimumAge < 0 || this.verificationConfig.minimumAge > 120) {
        throw new Error(`Invalid minimum age: ${this.verificationConfig.minimumAge}`);
      }

      console.log('✅ Self.xyz configuration validated successfully');
      return true;

    } catch (error) {
      console.error('❌ Self.xyz configuration validation failed:', error.message);
      throw error;
    }
  }

  // Verify webhook signature (if webhook secret is available)
  verifyWebhookSignature(payload, signature) {
    if (!this.webhookSecret) {
      console.warn('⚠️  Warning: Webhook signature verification skipped (no secret configured)');
      return true;
    }

    try {
      const crypto = require('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(payload)
        .digest('hex');

      const providedSignature = signature.replace('sha256=', '');

      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(providedSignature, 'hex')
      );
    } catch (error) {
      console.error('❌ Webhook signature verification failed:', error.message);
      return false;
    }
  }

  // Create verification session data for frontend
  createVerificationSession(userId, userWalletAddress, additionalRequirements = {}) {
    const sessionData = {
      scope: this.scope,
      configId: this.configId,
      userId: userId,
      userWalletAddress: userWalletAddress,
      requirements: {
        ...this.verificationConfig,
        ...additionalRequirements,
      },
      endpoint: `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/kyc/verify`,
      timestamp: new Date().toISOString(),
    };

    return sessionData;
  }

  // Process verification result from Self.xyz
  async processVerificationResult(verificationData) {
    try {
      const {
        attestationId,
        proof,
        publicSignals,
        extractedAttrs,
        userContextData
      } = verificationData;

      // Use Self backend verifier to validate the proof
      const verificationResult = await this.backendVerifier.verify(
        attestationId,
        proof,
        publicSignals,
        extractedAttrs,
        userContextData
      );

      if (!verificationResult.isValid) {
        return {
          success: false,
          error: 'Self proof verification failed',
          details: verificationResult.details || 'Invalid proof',
        };
      }

      // Extract and validate the verification data
      const validatedData = {
        nullifier: verificationResult.nullifier,
        userIdentifier: verificationResult.userIdentifier,
        nationality: extractedAttrs.nationality,
        documentType: extractedAttrs.documentType,
        ageAtLeast: extractedAttrs.ageAtLeast,
        isOfacMatch: extractedAttrs.isOfacMatch || false,
        timestamp: new Date().toISOString(),
      };

      return {
        success: true,
        verificationData: validatedData,
        originalResult: verificationResult,
      };

    } catch (error) {
      console.error('❌ Self verification processing failed:', error.message);
      return {
        success: false,
        error: 'Verification processing failed',
        details: error.message,
      };
    }
  }

  getConfiguration() {
    return {
      scope: this.scope,
      configId: this.configId,
      apiEndpoint: this.apiEndpoint,
      isProduction: this.isProduction,
      verificationConfig: this.verificationConfig,
      hasWebhookSecret: !!this.webhookSecret,
    };
  }

  // Get document type name
  getDocumentTypeName(documentType) {
    const mapping = {
      1: 'E-Passport',
      2: 'EU ID Card',
      3: 'Aadhaar',
    };
    return mapping[documentType] || `Document Type ${documentType}`;
  }

  // Check if a country is excluded
  isCountryExcluded(countryCode) {
    return this.verificationConfig.excludedCountries.includes(countryCode.toUpperCase());
  }

  // Check if a document type is allowed
  isDocumentTypeAllowed(documentType) {
    return this.verificationConfig.allowedDocumentTypes.includes(parseInt(documentType));
  }

  // Update configuration (useful for dynamic updates)
  updateConfiguration(newConfig) {
    Object.assign(this.verificationConfig, newConfig);
    console.log('🔄 Self.xyz configuration updated:', this.verificationConfig);
  }
}

// Create singleton instance
let selfConfig = null;

const getSelfConfig = () => {
  if (!selfConfig) {
    selfConfig = new SelfConfig();
  }
  return selfConfig;
};

// Export both class and singleton
module.exports = {
  SelfConfig,
  getSelfConfig,
  // Export commonly used properties for convenience
  get config() {
    return getSelfConfig();
  },
  get backendVerifier() {
    return getSelfConfig().backendVerifier;
  },
};