// SPDX-License-Identifier: MIT
'use client';

import React, { useState, useCallback } from 'react';
import { useStealthKYC } from '../hooks/useStealthKYC';
import { StealthAddress } from '../types/contracts';
import { Plus, Link, Unlink, Eye, EyeOff, Copy, Trash2, Loader2 } from 'lucide-react';

interface StealthAddressManagerProps {
  onAddressCreated?: (address: StealthAddress) => void;
  onAddressLinked?: (address: string, masterNullifier: string) => void;
  className?: string;
}

export function StealthAddressManager({ 
  onAddressCreated, 
  onAddressLinked, 
  className = '' 
}: StealthAddressManagerProps) {
  const { 
    stealthAddresses, 
    masterIdentity, 
    isLoading, 
    error, 
    createStealthAddress, 
    linkAddress, 
    removeStealthAddress,
    clearError 
  } = useStealthKYC();
  
  const [newMasterNullifier, setNewMasterNullifier] = useState('');
  const [showPrivateKeys, setShowPrivateKeys] = useState<Set<string>>(new Set());
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  const handleCreateAddress = useCallback(async () => {
    try {
      const newAddress = await createStealthAddress();
      if (newAddress) {
        onAddressCreated?.(newAddress);
      }
    } catch (err) {
      console.error('Failed to create stealth address:', err);
    }
  }, [createStealthAddress, onAddressCreated]);

  const handleLinkAddress = useCallback(async (stealthAddress: string) => {
    if (!newMasterNullifier.trim()) {
      return;
    }

    try {
      await linkAddress(newMasterNullifier, stealthAddress);
      onAddressLinked?.(stealthAddress, newMasterNullifier);
      setNewMasterNullifier('');
    } catch (err) {
      console.error('Failed to link address:', err);
    }
  }, [newMasterNullifier, linkAddress, onAddressLinked]);

  const handleCopyAddress = useCallback(async (address: string) => {
    try {
      await navigator.clipboard.writeText(address);
      setCopiedAddress(address);
      setTimeout(() => setCopiedAddress(null), 2000);
    } catch (err) {
      console.error('Failed to copy address:', err);
    }
  }, []);

  const togglePrivateKeyVisibility = useCallback((address: string) => {
    setShowPrivateKeys(prev => {
      const newSet = new Set(prev);
      if (newSet.has(address)) {
        newSet.delete(address);
      } else {
        newSet.add(address);
      }
      return newSet;
    });
  }, []);

  const handleRemoveAddress = useCallback((address: string) => {
    removeStealthAddress(address);
  }, [removeStealthAddress]);

  const handleClearError = useCallback(() => {
    clearError();
  }, [clearError]);

  return (
    <div className={`stealth-address-manager ${className}`}>
      <div className="manager-header">
        <h3 className="text-lg font-semibold">Stealth Address Management</h3>
        <button
          onClick={handleCreateAddress}
          disabled={isLoading}
          className="create-address-btn"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Creating...
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              Create New Address
            </>
          )}
        </button>
      </div>

      {masterIdentity && (
        <div className="master-identity-info">
          <h4 className="text-sm font-semibold text-gray-600">Master Identity:</h4>
          <div className="identity-details">
            <div className="detail-item">
              <span className="label">Nationality:</span>
              <span className="value">{masterIdentity.nationality}</span>
            </div>
            <div className="detail-item">
              <span className="label">Document Type:</span>
              <span className="value">{masterIdentity.documentType === 1 ? 'E-Passport' : 'EU ID Card'}</span>
            </div>
            <div className="detail-item">
              <span className="label">OFAC Clear:</span>
              <span className="value">{masterIdentity.isOfacClear ? 'Yes' : 'No'}</span>
            </div>
            <div className="detail-item">
              <span className="label">Verifications:</span>
              <span className="value">{masterIdentity.verificationCount}</span>
            </div>
          </div>
        </div>
      )}

      <div className="address-list">
        {stealthAddresses.length === 0 ? (
          <div className="empty-state">
            <p className="text-gray-500">No stealth addresses created yet</p>
            <p className="text-sm text-gray-400">Create your first stealth address to get started</p>
          </div>
        ) : (
          stealthAddresses.map((address, index) => (
            <div key={index} className="address-item">
              <div className="address-header">
                <div className="address-info">
                  <div className="address-display">
                    <span className="address-text">
                      {address.address.slice(0, 6)}...{address.address.slice(-4)}
                    </span>
                    <button
                      onClick={() => handleCopyAddress(address.address)}
                      className="copy-btn"
                    >
                      {copiedAddress === address.address ? (
                        'Copied!'
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                  <div className="address-status">
                    <span className={`status-badge ${address.isLinked ? 'linked' : 'unlinked'}`}>
                      {address.isLinked ? (
                        <>
                          <Link className="w-3 h-3" />
                          Linked
                        </>
                      ) : (
                        <>
                          <Unlink className="w-3 h-3" />
                          Unlinked
                        </>
                      )}
                    </span>
                  </div>
                </div>
                <div className="address-actions">
                  <button
                    onClick={() => togglePrivateKeyVisibility(address.address)}
                    className="toggle-key-btn"
                  >
                    {showPrivateKeys.has(address.address) ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleRemoveAddress(address.address)}
                    className="remove-btn"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              {showPrivateKeys.has(address.address) && (
                <div className="private-key-display">
                  <span className="key-label">Private Key:</span>
                  <span className="key-value">{address.privateKey}</span>
                </div>
              )}
              
              {!address.isLinked && (
                <div className="link-section">
                  <div className="link-form">
                    <input
                      type="text"
                      placeholder="Master Nullifier"
                      value={newMasterNullifier}
                      onChange={(e) => setNewMasterNullifier(e.target.value)}
                      className="nullifier-input"
                    />
                    <button
                      onClick={() => handleLinkAddress(address.address)}
                      disabled={!newMasterNullifier.trim()}
                      className="link-btn"
                    >
                      <Link className="w-4 h-4" />
                      Link
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {error && (
        <div className="error-message">
          <span>{error}</span>
          <button onClick={handleClearError} className="clear-error-btn">
            ×
          </button>
        </div>
      )}
    </div>
  );
}

// Styles
const styles = `
.stealth-address-manager {
  @apply p-6 bg-white rounded-lg shadow-md border;
}

.manager-header {
  @apply flex justify-between items-center mb-6;
}

.create-address-btn {
  @apply px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2;
}

.master-identity-info {
  @apply mb-6 p-4 bg-gray-50 rounded;
}

.identity-details {
  @apply space-y-2 mt-2;
}

.detail-item {
  @apply flex justify-between text-sm;
}

.label {
  @apply font-medium text-gray-600;
}

.value {
  @apply text-gray-900;
}

.address-list {
  @apply space-y-4;
}

.empty-state {
  @apply text-center py-8;
}

.address-item {
  @apply p-4 border rounded-lg;
}

.address-header {
  @apply flex justify-between items-start;
}

.address-info {
  @apply flex-1;
}

.address-display {
  @apply flex items-center gap-2 mb-2;
}

.address-text {
  @apply font-mono text-sm;
}

.copy-btn {
  @apply px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded;
}

.address-status {
  @apply mb-2;
}

.status-badge {
  @apply inline-flex items-center gap-1 px-2 py-1 text-xs rounded;
}

.status-badge.linked {
  @apply bg-green-100 text-green-700;
}

.status-badge.unlinked {
  @apply bg-gray-100 text-gray-700;
}

.address-actions {
  @apply flex gap-2;
}

.toggle-key-btn {
  @apply p-2 text-gray-500 hover:text-gray-700;
}

.remove-btn {
  @apply p-2 text-red-500 hover:text-red-700;
}

.private-key-display {
  @apply mt-3 p-3 bg-gray-50 rounded;
}

.key-label {
  @apply text-xs font-medium text-gray-600;
}

.key-value {
  @apply block mt-1 font-mono text-xs text-gray-900 break-all;
}

.link-section {
  @apply mt-3 pt-3 border-t;
}

.link-form {
  @apply flex gap-2;
}

.nullifier-input {
  @apply flex-1 px-3 py-2 border rounded text-sm;
}

.link-btn {
  @apply px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2;
}

.error-message {
  @apply flex items-center justify-between p-3 bg-red-50 text-red-700 rounded border border-red-200;
}

.clear-error-btn {
  @apply text-red-500 hover:text-red-700;
}
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}
