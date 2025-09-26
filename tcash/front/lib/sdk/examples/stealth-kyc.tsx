// SPDX-License-Identifier: MIT
'use client';

import React from 'react';
import { useStealthKYC, StealthAddressManager } from '../index';

export function StealthKYCExample() {
  const { 
    stealthAddresses, 
    masterIdentity, 
    stats, 
    createStealthAddress, 
    getStatistics 
  } = useStealthKYC();

  const handleCreateAddress = async () => {
    const newAddress = await createStealthAddress();
    if (newAddress) {
      console.log('New stealth address created:', newAddress);
    }
  };

  const handleGetStats = async () => {
    const statistics = await getStatistics();
    console.log('Stealth KYC statistics:', statistics);
  };

  return (
    <div className="stealth-kyc-example">
      <h1 className="text-2xl font-bold mb-6">Stealth KYC Example</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stealth Address Manager */}
        <div className="col-span-1">
          <StealthAddressManager
            onAddressCreated={(address) => {
              console.log('Stealth address created:', address);
            }}
            onAddressLinked={(address, masterNullifier) => {
              console.log('Address linked:', address, 'to master:', masterNullifier);
            }}
          />
        </div>

        {/* Master Identity & Statistics */}
        <div className="col-span-1">
          <div className="info-panel">
            <h3 className="text-lg font-semibold mb-4">Master Identity</h3>
            
            {masterIdentity ? (
              <div className="identity-details">
                <div className="detail-item">
                  <span className="label">Verified:</span>
                  <span className={`value ${masterIdentity.isVerified ? 'text-green-600' : 'text-red-600'}`}>
                    {masterIdentity.isVerified ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="label">Nationality:</span>
                  <span className="value">{masterIdentity.nationality}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Document Type:</span>
                  <span className="value">
                    {masterIdentity.documentType === 1 ? 'E-Passport' : 'EU ID Card'}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="label">OFAC Clear:</span>
                  <span className={`value ${masterIdentity.isOfacClear ? 'text-green-600' : 'text-red-600'}`}>
                    {masterIdentity.isOfacClear ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="detail-item">
                  <span className="label">Verifications:</span>
                  <span className="value">{masterIdentity.verificationCount}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Primary Address:</span>
                  <span className="value font-mono text-xs">
                    {masterIdentity.primaryStealthAddress}
                  </span>
                </div>
              </div>
            ) : (
              <div className="no-identity">
                <p className="text-gray-500">No master identity found</p>
                <p className="text-sm text-gray-400">
                  Create and link stealth addresses to establish a master identity
                </p>
              </div>
            )}

            <div className="actions-section">
              <button
                onClick={handleCreateAddress}
                className="action-btn primary"
              >
                Create Stealth Address
              </button>
              <button
                onClick={handleGetStats}
                className="action-btn secondary"
              >
                Get Statistics
              </button>
            </div>

            {stats && (
              <div className="stats-section">
                <h4 className="text-sm font-semibold text-gray-600">Statistics:</h4>
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-value">{stats.totalVerifications}</div>
                    <div className="stat-label">Total Verifications</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{stats.uniqueIdentities}</div>
                    <div className="stat-label">Unique Identities</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{stats.totalStealthAddresses}</div>
                    <div className="stat-label">Stealth Addresses</div>
                  </div>
                </div>
              </div>
            )}

            {stealthAddresses.length > 0 && (
              <div className="addresses-section">
                <h4 className="text-sm font-semibold text-gray-600">Your Stealth Addresses:</h4>
                <div className="addresses-list">
                  {stealthAddresses.map((address, index) => (
                    <div key={index} className="address-item">
                      <div className="address-info">
                        <span className="address-text">
                          {address.address.slice(0, 6)}...{address.address.slice(-4)}
                        </span>
                        <span className={`status-badge ${address.isLinked ? 'linked' : 'unlinked'}`}>
                          {address.isLinked ? 'Linked' : 'Unlinked'}
                        </span>
                      </div>
                    </div>
                  ))}
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
.stealth-kyc-example {
  @apply p-6 max-w-6xl mx-auto;
}

.info-panel {
  @apply p-4 bg-gray-50 rounded-lg;
}

.identity-details {
  @apply space-y-2;
}

.detail-item {
  @apply flex justify-between py-2 border-b border-gray-200 last:border-b-0;
}

.label {
  @apply font-medium text-gray-600;
}

.value {
  @apply text-gray-900;
}

.no-identity {
  @apply text-center py-8;
}

.actions-section {
  @apply flex gap-2 mt-4;
}

.action-btn {
  @apply px-4 py-2 rounded text-sm font-medium;
}

.action-btn.primary {
  @apply bg-blue-600 text-white hover:bg-blue-700;
}

.action-btn.secondary {
  @apply bg-gray-600 text-white hover:bg-gray-700;
}

.stats-section {
  @apply mt-6 pt-4 border-t border-gray-200;
}

.stats-grid {
  @apply grid grid-cols-3 gap-4 mt-2;
}

.stat-card {
  @apply text-center p-3 bg-white rounded border;
}

.stat-value {
  @apply text-2xl font-bold text-gray-900;
}

.stat-label {
  @apply text-xs text-gray-600 mt-1;
}

.addresses-section {
  @apply mt-6 pt-4 border-t border-gray-200;
}

.addresses-list {
  @apply space-y-2 mt-2;
}

.address-item {
  @apply p-2 bg-white rounded border;
}

.address-info {
  @apply flex justify-between items-center;
}

.address-text {
  @apply font-mono text-sm;
}

.status-badge {
  @apply px-2 py-1 text-xs rounded;
}

.status-badge.linked {
  @apply bg-green-100 text-green-700;
}

.status-badge.unlinked {
  @apply bg-gray-100 text-gray-700;
}
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}
