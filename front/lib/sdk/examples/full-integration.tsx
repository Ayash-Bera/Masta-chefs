// SPDX-License-Identifier: MIT
'use client';

import React, { useState } from 'react';
import { 
  useSelfKYC, 
  useStealthKYC, 
  useVault,
  KYCVerification,
  StealthAddressManager,
  SelfIntegration,
  StealthAddressUtils
} from '../index';

export function FullIntegrationExample() {
  const [activeTab, setActiveTab] = useState<'kyc' | 'stealth' | 'vault'>('kyc');
  
  const { isVerified, kycData, config, stats: kycStats } = useSelfKYC();
  const { stealthAddresses, masterIdentity, stats: stealthStats } = useStealthKYC();
  const { supportedTokens, latestRoot, stats: vaultStats } = useVault();

  const handleGenerateProof = async () => {
    try {
      const proof = await SelfIntegration.generateProof({
        configId: '0x0000000000000000000000000000000000000000000000000000000000000001',
        scope: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
      });
      console.log('Generated proof:', proof);
    } catch (error) {
      console.error('Error generating proof:', error);
    }
  };

  const handleCreateStealthAddress = async () => {
    try {
      const stealthAddress = StealthAddressUtils.generateStealthAddress();
      console.log('Generated stealth address:', stealthAddress);
    } catch (error) {
      console.error('Error creating stealth address:', error);
    }
  };

  return (
    <div className="full-integration-example">
      <h1 className="text-3xl font-bold mb-8">Full Integration Example</h1>
      
      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          onClick={() => setActiveTab('kyc')}
          className={`tab-btn ${activeTab === 'kyc' ? 'active' : ''}`}
        >
          KYC Verification
        </button>
        <button
          onClick={() => setActiveTab('stealth')}
          className={`tab-btn ${activeTab === 'stealth' ? 'active' : ''}`}
        >
          Stealth Addresses
        </button>
        <button
          onClick={() => setActiveTab('vault')}
          className={`tab-btn ${activeTab === 'vault' ? 'active' : ''}`}
        >
          Vault Operations
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'kyc' && (
          <div className="kyc-tab">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
              
              <div className="col-span-1">
                <div className="status-panel">
                  <h3 className="text-lg font-semibold mb-4">KYC Status</h3>
                  
                  <div className="status-grid">
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
                      </>
                    )}
                  </div>

                  {config && (
                    <div className="config-section">
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
                      </div>
                    </div>
                  )}

                  {kycStats && (
                    <div className="stats-section">
                      <h4 className="text-sm font-semibold text-gray-600">Statistics:</h4>
                      <div className="stats-grid">
                        <div className="stat-card">
                          <div className="stat-value">{kycStats.totalVerifications}</div>
                          <div className="stat-label">Total Verifications</div>
                        </div>
                        <div className="stat-card">
                          <div className="stat-value">{kycStats.uniqueUsers}</div>
                          <div className="stat-label">Unique Users</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'stealth' && (
          <div className="stealth-tab">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                    </div>
                  ) : (
                    <div className="no-identity">
                      <p className="text-gray-500">No master identity found</p>
                    </div>
                  )}

                  {stealthStats && (
                    <div className="stats-section">
                      <h4 className="text-sm font-semibold text-gray-600">Statistics:</h4>
                      <div className="stats-grid">
                        <div className="stat-card">
                          <div className="stat-value">{stealthStats.totalVerifications}</div>
                          <div className="stat-label">Total Verifications</div>
                        </div>
                        <div className="stat-card">
                          <div className="stat-value">{stealthStats.uniqueIdentities}</div>
                          <div className="stat-label">Unique Identities</div>
                        </div>
                        <div className="stat-card">
                          <div className="stat-value">{stealthStats.totalStealthAddresses}</div>
                          <div className="stat-label">Stealth Addresses</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'vault' && (
          <div className="vault-tab">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="col-span-1">
                <div className="vault-operations">
                  <h3 className="text-lg font-semibold mb-4">Vault Operations</h3>
                  
                  <div className="operation-section">
                    <h4 className="text-sm font-semibold text-gray-600">Deposit</h4>
                    <div className="operation-form">
                      <input
                        type="text"
                        placeholder="Token Address"
                        className="form-input"
                      />
                      <input
                        type="number"
                        placeholder="Amount"
                        className="form-input"
                      />
                      <button className="operation-btn">Deposit</button>
                    </div>
                  </div>

                  <div className="operation-section">
                    <h4 className="text-sm font-semibold text-gray-600">Withdraw</h4>
                    <div className="operation-form">
                      <input
                        type="text"
                        placeholder="Proof"
                        className="form-input"
                      />
                      <input
                        type="text"
                        placeholder="Recipient"
                        className="form-input"
                      />
                      <button className="operation-btn">Withdraw</button>
                    </div>
                  </div>

                  <div className="operation-section">
                    <h4 className="text-sm font-semibold text-gray-600">Swap</h4>
                    <div className="operation-form">
                      <input
                        type="text"
                        placeholder="Token In"
                        className="form-input"
                      />
                      <input
                        type="text"
                        placeholder="Token Out"
                        className="form-input"
                      />
                      <button className="operation-btn">Swap</button>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="col-span-1">
                <div className="vault-info">
                  <h3 className="text-lg font-semibold mb-4">Vault Information</h3>
                  
                  <div className="info-section">
                    <h4 className="text-sm font-semibold text-gray-600">Supported Tokens:</h4>
                    <div className="tokens-list">
                      {supportedTokens.map((token, index) => (
                        <div key={index} className="token-item">
                          <span className="token-address">{token}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="info-section">
                    <h4 className="text-sm font-semibold text-gray-600">Latest Root:</h4>
                    <div className="root-display">
                      <span className="root-text">{latestRoot}</span>
                    </div>
                  </div>

                  {vaultStats && (
                    <div className="stats-section">
                      <h4 className="text-sm font-semibold text-gray-600">Statistics:</h4>
                      <div className="stats-grid">
                        <div className="stat-card">
                          <div className="stat-value">{vaultStats.totalDeposits || 0}</div>
                          <div className="stat-label">Total Deposits</div>
                        </div>
                        <div className="stat-card">
                          <div className="stat-value">{vaultStats.totalWithdrawals || 0}</div>
                          <div className="stat-label">Total Withdrawals</div>
                        </div>
                        <div className="stat-card">
                          <div className="stat-value">{vaultStats.totalSwaps || 0}</div>
                          <div className="stat-label">Total Swaps</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Utility Actions */}
      <div className="utility-actions">
        <h3 className="text-lg font-semibold mb-4">Utility Actions</h3>
        <div className="actions-grid">
          <button
            onClick={handleGenerateProof}
            className="utility-btn"
          >
            Generate Self.xyz Proof
          </button>
          <button
            onClick={handleCreateStealthAddress}
            className="utility-btn"
          >
            Create Stealth Address
          </button>
          <button
            onClick={() => console.log('Current state:', { isVerified, kycData, stealthAddresses, masterIdentity })}
            className="utility-btn"
          >
            Log Current State
          </button>
        </div>
      </div>
    </div>
  );
}

// Styles
const styles = `
.full-integration-example {
  @apply p-6 max-w-7xl mx-auto;
}

.tab-navigation {
  @apply flex gap-2 mb-6;
}

.tab-btn {
  @apply px-4 py-2 rounded text-sm font-medium;
  @apply bg-gray-100 text-gray-700 hover:bg-gray-200;
}

.tab-btn.active {
  @apply bg-blue-600 text-white hover:bg-blue-700;
}

.tab-content {
  @apply min-h-96;
}

.status-panel {
  @apply p-4 bg-gray-50 rounded-lg;
}

.status-grid {
  @apply space-y-2;
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

.config-section {
  @apply mt-4 pt-4 border-t border-gray-200;
}

.config-details {
  @apply space-y-2 mt-2;
}

.config-item {
  @apply flex justify-between text-sm;
}

.stats-section {
  @apply mt-4 pt-4 border-t border-gray-200;
}

.stats-grid {
  @apply grid grid-cols-2 gap-4 mt-2;
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

.info-panel {
  @apply p-4 bg-gray-50 rounded-lg;
}

.identity-details {
  @apply space-y-2;
}

.detail-item {
  @apply flex justify-between py-2 border-b border-gray-200 last:border-b-0;
}

.no-identity {
  @apply text-center py-8;
}

.vault-operations {
  @apply p-4 bg-gray-50 rounded-lg;
}

.operation-section {
  @apply mb-4;
}

.operation-form {
  @apply flex gap-2 mt-2;
}

.form-input {
  @apply flex-1 px-3 py-2 border rounded text-sm;
}

.operation-btn {
  @apply px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700;
}

.vault-info {
  @apply p-4 bg-gray-50 rounded-lg;
}

.info-section {
  @apply mb-4;
}

.tokens-list {
  @apply space-y-2 mt-2;
}

.token-item {
  @apply p-2 bg-white rounded border;
}

.token-address {
  @apply font-mono text-sm;
}

.root-display {
  @apply p-2 bg-white rounded border mt-2;
}

.root-text {
  @apply font-mono text-sm break-all;
}

.utility-actions {
  @apply mt-8 pt-6 border-t border-gray-200;
}

.actions-grid {
  @apply grid grid-cols-3 gap-4;
}

.utility-btn {
  @apply px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700;
}
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}
