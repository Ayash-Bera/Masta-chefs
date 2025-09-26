// SPDX-License-Identifier: MIT
'use client';

import React from 'react';
import { useSelfKYC, KYCVerification } from '../index';

export function BasicKYCExample() {
  const { isVerified, kycData, config, stats } = useSelfKYC();

  return (
    <div className="basic-kyc-example">
      <h1 className="text-2xl font-bold mb-6">Basic KYC Example</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* KYC Verification Component */}
        <div className="col-span-1">
          <KYCVerification
            onVerificationComplete={(data) => {
              console.log('KYC verification completed:', data);
            }}
            onError={(error) => {
              console.error('KYC verification error:', error);
            }}
          />
        </div>

        {/* Status Information */}
        <div className="col-span-1">
          <div className="status-panel">
            <h3 className="text-lg font-semibold mb-4">Status Information</h3>
            
            <div className="status-item">
              <span className="label">Verified:</span>
              <span className={`value ${isVerified ? 'text-green-600' : 'text-red-600'}`}>
                {isVerified ? 'Yes' : 'No'}
              </span>
            </div>

            {kycData && (
              <>
                <div className="status-item">
                  <span className="label">Nationality:</span>
                  <span className="value">{kycData.nationality}</span>
                </div>
                <div className="status-item">
                  <span className="label">Document Type:</span>
                  <span className="value">
                    {kycData.documentType === 1 ? 'E-Passport' : 'EU ID Card'}
                  </span>
                </div>
                <div className="status-item">
                  <span className="label">OFAC Clear:</span>
                  <span className={`value ${kycData.isOfacClear ? 'text-green-600' : 'text-red-600'}`}>
                    {kycData.isOfacClear ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="status-item">
                  <span className="label">Verifications:</span>
                  <span className="value">{kycData.verificationCount}</span>
                </div>
              </>
            )}

            {config && (
              <div className="config-info">
                <h4 className="text-sm font-semibold text-gray-600">Configuration:</h4>
                <div className="config-details">
                  <div className="config-item">
                    <span className="label">Minimum Age:</span>
                    <span className="value">{config.minimumAge}</span>
                  </div>
                  <div className="config-item">
                    <span className="label">OFAC Check:</span>
                    <span className="value">{config.requireOfacCheck ? 'Required' : 'Not required'}</span>
                  </div>
                  <div className="config-item">
                    <span className="label">Active:</span>
                    <span className={`value ${config.isActive ? 'text-green-600' : 'text-red-600'}`}>
                      {config.isActive ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {stats && (
              <div className="stats-info">
                <h4 className="text-sm font-semibold text-gray-600">Statistics:</h4>
                <div className="stats-details">
                  <div className="stat-item">
                    <span className="label">Total Verifications:</span>
                    <span className="value">{stats.totalVerifications}</span>
                  </div>
                  <div className="stat-item">
                    <span className="label">Unique Users:</span>
                    <span className="value">{stats.uniqueUsers}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Styles
const styles = `
.basic-kyc-example {
  @apply p-6 max-w-6xl mx-auto;
}

.status-panel {
  @apply p-4 bg-gray-50 rounded-lg;
}

.status-item {
  @apply flex justify-between py-2 border-b border-gray-200 last:border-b-0;
}

.label {
  @apply font-medium text-gray-600;
}

.value {
  @apply text-gray-900;
}

.config-info {
  @apply mt-4 pt-4 border-t border-gray-200;
}

.config-details {
  @apply space-y-2 mt-2;
}

.config-item {
  @apply flex justify-between text-sm;
}

.stats-info {
  @apply mt-4 pt-4 border-t border-gray-200;
}

.stats-details {
  @apply space-y-2 mt-2;
}

.stat-item {
  @apply flex justify-between text-sm;
}
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}
