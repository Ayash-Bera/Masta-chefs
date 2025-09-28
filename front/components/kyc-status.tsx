'use client';

import React, { useState, useEffect } from 'react';
import { useAccount, useReadContract, useChainId } from 'wagmi';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { StealthKYCClient } from '@/lib/sdk/core/SelfKYCClient';

export function KYCStatus() {
  const { address } = useAccount();
  const chainId = useChainId();
  const stealthKYCClient = new StealthKYCClient(chainId);

  // Check if stealth address is verified using wagmi
  const { data: isVerified, isLoading, error } = useReadContract({
    ...stealthKYCClient.getIsStealthAddressVerifiedConfig(address || ''),
    query: {
      enabled: !!address,
    },
  });

  // Get master identity data for additional info
  const { data: masterIdentity, isLoading: identityLoading } = useReadContract({
    ...stealthKYCClient.getMasterIdentityByStealthAddressConfig(address || ''),
    query: {
      enabled: !!address && !!isVerified,
    },
  });


  if (!address) {
    return (
      <div className="p-4 rounded-xl bg-gray-500/10 border border-gray-500/20">
        <div className="flex items-center gap-3 text-gray-300">
          <AlertCircle className="w-5 h-5" />
          <div>
            <p className="font-medium">Wallet Not Connected</p>
            <p className="text-xs text-gray-400">Connect your wallet to check stealth KYC status</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading || identityLoading) {
    return (
      <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
        <div className="flex items-center gap-3 text-blue-300">
          <Loader2 className="w-5 h-5 animate-spin" />
          <div>
            <p className="font-medium">Checking Stealth KYC Status...</p>
            <p className="text-xs text-blue-300/70">Reading from StealthKYC contract</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
        <div className="flex items-center gap-3 text-red-300">
          <AlertCircle className="w-5 h-5" />
          <div>
            <p className="font-medium">Error Checking Stealth KYC</p>
            <p className="text-xs text-red-300/70">{error?.message || 'Failed to read from contract'}</p>
          </div>
        </div>
      </div>
    );
  }

  if (isVerified === true) {
    return (
      <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
        <div className="flex items-center gap-3 text-green-300">
          <CheckCircle className="w-5 h-5" />
          <div>
            <p className="font-medium">✅ Stealth KYC Verified</p>
            <p className="text-xs text-green-300/70">
              Your stealth address is verified on the StealthKYC contract
            </p>
            {masterIdentity && (
              <p className="text-xs text-green-300/50 mt-1">
                Nationality: {masterIdentity.nationality} | Doc Type: {masterIdentity.documentType}
              </p>
            )}
            <p className="text-xs text-green-300/50 mt-1">
              Stealth Address: {address?.slice(0, 6)}...{address?.slice(-4)}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl bg-orange-500/10 border border-orange-500/20">
      <div className="flex items-center gap-3 text-orange-300">
        <AlertCircle className="w-5 h-5" />
        <div>
          <p className="font-medium">❌ Stealth KYC Not Verified</p>
          <p className="text-xs text-orange-300/70">
            Complete stealth address verification to access institutional features
          </p>
          <p className="text-xs text-orange-300/50 mt-1">
            Stealth Address: {address?.slice(0, 6)}...{address?.slice(-4)}
          </p>
        </div>
      </div>
    </div>
  );
}
