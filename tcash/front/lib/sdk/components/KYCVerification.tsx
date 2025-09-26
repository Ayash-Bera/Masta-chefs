// SPDX-License-Identifier: MIT
'use client';

import React, { useState, useCallback } from 'react';
import { useSelfKYC } from '../hooks/useSelfKYC';
import { SelfProof } from '../types/contracts';
import { CheckCircle, AlertCircle, Loader2, Shield, User, Globe, FileText } from 'lucide-react';

interface KYCVerificationProps {
  onVerificationComplete?: (kycData: any) => void;
  onError?: (error: string) => void;
  className?: string;
}

export function KYCVerification({ 
  onVerificationComplete, 
  onError, 
  className = '' 
}: KYCVerificationProps) {
  const { 
    isVerified, 
    kycData, 
    isLoading, 
    error, 
    config, 
    verifyKYC, 
    clearError 
  } = useSelfKYC();
  
  const [proof, setProof] = useState<SelfProof | null>(null);
  const [isGeneratingProof, setIsGeneratingProof] = useState(false);

  const handleVerification = useCallback(async () => {
    if (!proof) {
      onError?.('No proof provided');
      return;
    }

    try {
      const result = await verifyKYC(proof);
      if (result.success) {
        onVerificationComplete?.(kycData);
      } else {
        onError?.(result.error || 'Verification failed');
      }
    } catch (err) {
      onError?.(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [proof, verifyKYC, kycData, onVerificationComplete, onError]);

  const generateMockProof = useCallback(async () => {
    setIsGeneratingProof(true);
    
    // Simulate proof generation delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const mockProof: SelfProof = {
      nullifier: '0x' + Math.random().toString(16).substr(2, 64),
      userIdentifier: '0x' + Math.random().toString(16).substr(2, 64),
      nationality: 'US',
      documentType: 1, // E-Passport
      ageAtLeast: 25,
      isOfacMatch: false,
      attestationId: '0x' + Math.random().toString(16).substr(2, 64),
      proof: '0x' + Math.random().toString(16).substr(2, 128),
      timestamp: Date.now()
    };
    
    setProof(mockProof);
    setIsGeneratingProof(false);
  }, []);

  const handleClearError = useCallback(() => {
    clearError();
  }, [clearError]);

  if (isVerified && kycData) {
    return (
      <div className={`kyc-verification verified ${className}`}>
        <div className="verification-status">
          <CheckCircle className="w-8 h-8 text-green-500" />
          <h3 className="text-lg font-semibold text-green-500">KYC Verified</h3>
        </div>
        
        <div className="kyc-details">
          <div className="detail-item">
            <Globe className="w-4 h-4" />
            <span>Nationality: {kycData.nationality}</span>
          </div>
          <div className="detail-item">
            <FileText className="w-4 h-4" />
            <span>Document: {kycData.documentType === 1 ? 'E-Passport' : 'EU ID Card'}</span>
          </div>
          <div className="detail-item">
            <Shield className="w-4 h-4" />
            <span>OFAC Clear: {kycData.isOfacClear ? 'Yes' : 'No'}</span>
          </div>
          <div className="detail-item">
            <User className="w-4 h-4" />
            <span>Verifications: {kycData.verificationCount}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`kyc-verification ${className}`}>
      <div className="verification-header">
        <Shield className="w-6 h-6" />
        <h2 className="text-xl font-bold">KYC Verification</h2>
      </div>

      {config && (
        <div className="verification-requirements">
          <h3 className="text-sm font-semibold text-gray-600">Requirements:</h3>
          <ul className="text-sm text-gray-500">
            <li>• Minimum age: {config.minimumAge}</li>
            <li>• OFAC check: {config.requireOfacCheck ? 'Required' : 'Not required'}</li>
            <li>• Document types: {config.allowedDocumentTypes.map(t => t === 1 ? 'E-Passport' : 'EU ID Card').join(', ')}</li>
            {config.excludedCountries.length > 0 && (
              <li>• Excluded countries: {config.excludedCountries.join(', ')}</li>
            )}
          </ul>
        </div>
      )}

      <div className="verification-form">
        {!proof ? (
          <div className="proof-generation">
            <p className="text-sm text-gray-600 mb-4">
              Generate a Self.xyz proof to verify your identity
            </p>
            <button
              onClick={generateMockProof}
              disabled={isGeneratingProof}
              className="generate-proof-btn"
            >
              {isGeneratingProof ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating Proof...
                </>
              ) : (
                'Generate Self.xyz Proof'
              )}
            </button>
          </div>
        ) : (
          <div className="proof-ready">
            <div className="proof-details">
              <h4 className="text-sm font-semibold">Proof Generated:</h4>
              <div className="proof-info">
                <div className="info-item">
                  <span className="label">Nationality:</span>
                  <span className="value">{proof.nationality}</span>
                </div>
                <div className="info-item">
                  <span className="label">Document Type:</span>
                  <span className="value">{proof.documentType === 1 ? 'E-Passport' : 'EU ID Card'}</span>
                </div>
                <div className="info-item">
                  <span className="label">Age:</span>
                  <span className="value">{proof.ageAtLeast}+</span>
                </div>
                <div className="info-item">
                  <span className="label">OFAC Clear:</span>
                  <span className="value">{proof.isOfacMatch ? 'No' : 'Yes'}</span>
                </div>
              </div>
            </div>
            
            <div className="verification-actions">
              <button
                onClick={handleVerification}
                disabled={isLoading}
                className="verify-btn"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify KYC'
                )}
              </button>
              
              <button
                onClick={() => setProof(null)}
                className="regenerate-btn"
              >
                Regenerate Proof
              </button>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="error-message">
          <AlertCircle className="w-4 h-4" />
          <span>{error}</span>
          <button onClick={handleClearError} className="clear-error-btn">
            ×
          </button>
        </div>
      )}
    </div>
  );
}

// Styles (you can move these to a separate CSS file)
const styles = `
.kyc-verification {
  @apply p-6 bg-white rounded-lg shadow-md border;
}

.kyc-verification.verified {
  @apply border-green-200 bg-green-50;
}

.verification-status {
  @apply flex items-center gap-3 mb-4;
}

.kyc-details {
  @apply space-y-2;
}

.detail-item {
  @apply flex items-center gap-2 text-sm;
}

.verification-header {
  @apply flex items-center gap-3 mb-4;
}

.verification-requirements {
  @apply mb-4 p-3 bg-gray-50 rounded;
}

.verification-form {
  @apply space-y-4;
}

.proof-generation {
  @apply text-center;
}

.generate-proof-btn {
  @apply px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2;
}

.proof-ready {
  @apply space-y-4;
}

.proof-details {
  @apply p-3 bg-gray-50 rounded;
}

.proof-info {
  @apply space-y-1 mt-2;
}

.info-item {
  @apply flex justify-between text-sm;
}

.label {
  @apply font-medium text-gray-600;
}

.value {
  @apply text-gray-900;
}

.verification-actions {
  @apply flex gap-2;
}

.verify-btn {
  @apply px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2;
}

.regenerate-btn {
  @apply px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700;
}

.error-message {
  @apply flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded border border-red-200;
}

.clear-error-btn {
  @apply ml-auto text-red-500 hover:text-red-700;
}
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}
