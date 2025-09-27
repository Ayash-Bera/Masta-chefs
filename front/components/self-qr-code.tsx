'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, Smartphone, Shield, CheckCircle } from 'lucide-react';
import { SelfQRcodeWrapper, SelfAppBuilder, type SelfApp } from '@selfxyz/qrcode';
import { getUniversalLink } from '@selfxyz/core';
import { ethers } from 'ethers';
import { useContractRead, useWatchContractEvent } from 'wagmi';
import { CONTRACT_ADDRESSES, DEFAULT_CONFIG } from '@/lib/sdk/constants/contracts';

interface SelfQRCodeProps {
  sessionData?: {
    scope: string;
    configId: string;
    endpoint: string;
    userId: string;
    requirements: any;
  };
  userId?: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
  className?: string;
}

export function SelfQRCode({
  sessionData,
  userId,
  onSuccess,
  onError,
  className = ''
}: SelfQRCodeProps) {
  const [selfApp, setSelfApp] = useState<SelfApp | null>(null);
  const [universalLink, setUniversalLink] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [actualUserId] = useState(userId || sessionData?.userId || ethers.ZeroAddress);
  const [isWatchingEvents, setIsWatchingEvents] = useState(false);

  // Watch for stealth KYC verification events for this user
  useWatchContractEvent({
    address: CONTRACT_ADDRESSES.STEALTH_KYC_VERIFIER.SEPOLIA as `0x${string}`,
    abi: [
      {
        name: 'MasterIdentityVerified',
        type: 'event',
        inputs: [
          { name: 'masterNullifier', type: 'bytes32', indexed: true },
          { name: 'primaryStealthAddress', type: 'address', indexed: true },
          { name: 'nationality', type: 'string', indexed: false },
          { name: 'documentType', type: 'uint8', indexed: false },
          { name: 'timestamp', type: 'uint256', indexed: false },
          { name: 'isOfacClear', type: 'bool', indexed: false }
        ]
      }
    ],
    eventName: 'MasterIdentityVerified',
    args: { primaryStealthAddress: actualUserId as `0x${string}` },
    onLogs: (logs) => {
      console.log('Stealth KYC Master Identity Verification event detected:', logs);
      if (logs.length > 0) {
        setIsWatchingEvents(false);
        handleSuccessfulVerification();
      }
    },
    enabled: isWatchingEvents && !!actualUserId && actualUserId !== ethers.ZeroAddress,
  });

  useEffect(() => {
    initializeSelfApp();
  }, [actualUserId]);

  const initializeSelfApp = () => {
    try {
      setIsLoading(true);

      // Build Self.xyz app configuration using workshop pattern
      const app = new SelfAppBuilder({
        version: 2,
        appName: process.env.NEXT_PUBLIC_SELF_APP_NAME || "Tsunami Wallet",
        scope: sessionData?.scope || DEFAULT_CONFIG.SCOPE_SEED,
        endpoint: CONTRACT_ADDRESSES.STEALTH_KYC_VERIFIER.SEPOLIA, // Point to our stealth KYC contract
        logoBase64: "https://i.postimg.cc/mrmVf9hm/self.png",
        userId: actualUserId,
        endpointType: "staging_celo", // Use contract endpoint type like workshop
        userIdType: "hex",
        userDefinedData: "Tsunami Wallet KYC Verification",
        disclosures: {
          // Verification requirements (match contract configuration)
          minimumAge: sessionData?.requirements?.minimumAge || DEFAULT_CONFIG.MINIMUM_AGE,
          // forbiddenCountries: sessionData?.requirements?.excludedCountries || DEFAULT_CONFIG.EXCLUDED_COUNTRIES,
          ofac: sessionData?.requirements?.requireOfacCheck || DEFAULT_CONFIG.REQUIRE_OFAC_CHECK,

          // Disclosure requests (what users reveal)
          nationality: true,

          // Optional disclosures based on contract requirements
          name: false,
          date_of_birth: false,
          passport_number: false,
          expiry_date: false,
        }
      }).build();

      setSelfApp(app);
      setUniversalLink(getUniversalLink(app));
      setIsWatchingEvents(true); // Start watching for verification events
      setIsLoading(false);
    } catch (error) {
      console.error("Failed to initialize Self app:", error);
      onError?.(error instanceof Error ? error.message : 'Failed to initialize Self app');
      setIsLoading(false);
    }
  };

  const handleSuccessfulVerification = () => {
    console.log("Self.xyz stealth address verification successful!");
    onSuccess?.();
  };

  const handleVerificationError = (error: any) => {
    console.error("Self.xyz stealth verification error:", error);
    onError?.(error?.message || 'Stealth verification failed');
  };

  if (isLoading) {
    return (
      <div className={`flex flex-col items-center justify-center w-80 h-80 bg-white/5 rounded-xl border border-white/10 ${className}`}>
        <Loader2 className="w-8 h-8 animate-spin text-white mb-4" />
        <p className="text-white/70 text-sm">Initializing verification...</p>
      </div>
    );
  }

  if (!selfApp) {
    return (
      <div className={`flex flex-col items-center justify-center w-80 h-80 bg-red-500/10 rounded-xl border border-red-500/20 ${className}`}>
        <Shield className="w-12 h-12 text-red-400 mb-4" />
        <h3 className="text-lg font-semibold text-red-400 mb-2">Initialization Failed</h3>
        <p className="text-red-300/70 text-sm text-center">
          Unable to initialize Self.xyz verification
        </p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center space-y-6 ${className}`}>
      {/* Instructions */}
      <div className="text-center space-y-3">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Shield className="w-5 h-5 text-white" />
          <h3 className="text-lg font-semibold text-white">Scan with Self.xyz App</h3>
        </div>
        
        <p className="text-sm text-white/70 max-w-sm">
          Use the Self.xyz mobile app to scan this QR code and complete your stealth address identity verification.
        </p>
      </div>

      {/* QR Code Component */}
      <div className="relative bg-white rounded-xl p-4 shadow-2xl">
        <SelfQRcodeWrapper
          selfApp={selfApp}
          onSuccess={() => {
            console.log("Self.xyz stealth QR flow initiated - waiting for contract event...");
            // Don't call onSuccess here - wait for the contract event
            setIsWatchingEvents(true);
          }}
          onError={handleVerificationError}
        />
      </div>
      
      {/* Session Info */}
      <div className="w-full p-3 bg-white/5 rounded-lg border border-white/10">
        <div className="text-xs text-white/50 space-y-1">
          <div>Scope: {sessionData?.scope || DEFAULT_CONFIG.SCOPE_SEED}</div>
          <div>Stealth Address: {actualUserId.slice(0, 8)}...{actualUserId.slice(-8)}</div>
          <div>Stealth KYC Contract: {CONTRACT_ADDRESSES.STEALTH_KYC_VERIFIER.SEPOLIA.slice(0, 8)}...{CONTRACT_ADDRESSES.STEALTH_KYC_VERIFIER.SEPOLIA.slice(-8)}</div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isWatchingEvents ? 'bg-blue-400 animate-pulse' : 'bg-green-400'}`}></div>
            <span>{isWatchingEvents ? 'Waiting for stealth verification...' : 'Ready for stealth verification'}</span>
          </div>
        </div>
      </div>

      {/* Universal Link for mobile */}
      {universalLink && (
        <div className="w-full">
          <a 
            href={universalLink}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Smartphone className="w-4 h-4" />
            <span className="text-sm font-medium">Open in Self.xyz App</span>
          </a>
        </div>
      )}
    </div>
  );
}
