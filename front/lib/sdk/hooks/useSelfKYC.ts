// SPDX-License-Identifier: MIT
'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAccount, useChainId, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { SelfKYCClient } from '../core/SelfKYCClient';
import { 
  KYCData, 
  VerificationConfig, 
  KYCResult, 
  VerificationStats, 
  SelfProof,
  VerificationEvent 
} from '../types/contracts';

export function useSelfKYC() {
  const { address } = useAccount();
  const chainId = useChainId();
  const [isVerified, setIsVerified] = useState(false);
  const [kycData, setKycData] = useState<KYCData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<VerificationConfig | null>(null);
  const [stats, setStats] = useState<VerificationStats | null>(null);
  const [verificationHistory, setVerificationHistory] = useState<VerificationEvent[]>([]);

  const client = new SelfKYCClient(chainId);

  // Read contract data
  const { data: isVerifiedData, refetch: refetchVerification } = useReadContract({
    address: client.getContractAddress() as `0x${string}`,
    abi: client.getABI(),
    functionName: 'isKYCVerified',
    args: address ? [address] : undefined,
    query: { enabled: !!address }
  });

  const { data: kycDataRaw, refetch: refetchKycData } = useReadContract({
    address: client.getContractAddress() as `0x${string}`,
    abi: client.getABI(),
    functionName: 'getKYCData',
    args: address ? [address] : undefined,
    query: { enabled: !!address }
  });

  const { data: configData, refetch: refetchConfig } = useReadContract({
    address: client.getContractAddress() as `0x${string}`,
    abi: client.getABI(),
    functionName: 'getConfiguration',
    query: { enabled: true }
  });

  const { data: statsData, refetch: refetchStats } = useReadContract({
    address: client.getContractAddress() as `0x${string}`,
    abi: client.getABI(),
    functionName: 'getStatistics',
    query: { enabled: true }
  });

  // Write contract for verification
  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // Update state when contract data changes
  useEffect(() => {
    if (isVerifiedData !== undefined) {
      setIsVerified(isVerifiedData as boolean);
    }
  }, [isVerifiedData]);

  useEffect(() => {
    if (kycDataRaw) {
      const data = kycDataRaw as any;
      setKycData({
        isVerified: data.isVerified,
        timestamp: Number(data.timestamp),
        nationality: data.nationality,
        documentType: Number(data.documentType),
        isOfacClear: data.isOfacClear,
        verificationCount: Number(data.verificationCount)
      });
    }
  }, [kycDataRaw]);

  useEffect(() => {
    if (configData) {
      const data = configData as any;
      setConfig({
        configId: data.configId,
        scope: data.scope,
        requireOfacCheck: data.requireOfacCheck,
        minimumAge: Number(data.minimumAge),
        excludedCountries: data.excludedCountries,
        allowedDocumentTypes: data.allowedDocumentTypes,
        isActive: data.isActive
      });
    }
  }, [configData]);

  useEffect(() => {
    if (statsData) {
      const data = statsData as any;
      setStats({
        totalVerifications: Number(data[0]),
        uniqueUsers: Number(data[1])
      });
    }
  }, [statsData]);

  // Update loading state
  useEffect(() => {
    setIsLoading(isPending || isConfirming);
  }, [isPending, isConfirming]);

  // Update error state
  useEffect(() => {
    if (writeError) {
      setError(writeError.message);
    }
  }, [writeError]);

  /**
   * Verify KYC using Self.xyz proof
   */
  const verifyKYC = useCallback(async (proof: SelfProof) => {
    if (!address) {
      setError('No wallet connected');
      return;
    }

    if (!client.validateProof(proof)) {
      setError('Invalid proof structure');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // In a real implementation, this would call the Self.xyz verification process
      // For now, we'll simulate the verification
      const result = await client.verifyKYC(proof);
      
      if (result.success) {
        // Refresh data after successful verification
        await Promise.all([
          refetchVerification(),
          refetchKycData(),
          refetchStats()
        ]);
      } else {
        setError(result.error || 'Verification failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [address, client, refetchVerification, refetchKycData, refetchStats]);

  /**
   * Check verification status (directly uses wagmi data)
   */
  const checkStatus = useCallback(async (userAddress?: string) => {
    if (!userAddress && !address) {
      setError('No address provided');
      return false;
    }

    try {
      // Refetch the current data
      await refetchVerification();
      return isVerified;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  }, [address, isVerified, refetchVerification]);

  /**
   * Get KYC data for a user (directly uses wagmi data)
   */
  const getKYCData = useCallback(async (userAddress?: string) => {
    if (!userAddress && !address) {
      setError('No address provided');
      return null;
    }

    try {
      // Refetch the current data
      await refetchKycData();
      return kycData;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    }
  }, [address, kycData, refetchKycData]);

  /**
   * Get verification history (uses contract events)
   */
  const getVerificationHistory = useCallback(async (userAddress?: string) => {
    if (!userAddress && !address) {
      setError('No address provided');
      return [];
    }

    try {
      // This would typically use wagmi's useContractEvent or useLogs
      // For now, return empty array as event fetching requires separate implementation
      setVerificationHistory([]);
      return [];
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return [];
    }
  }, [address]);

  /**
   * Refresh all data
   */
  const refresh = useCallback(async () => {
    try {
      await Promise.all([
        refetchVerification(),
        refetchKycData(),
        refetchConfig(),
        refetchStats()
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [refetchVerification, refetchKycData, refetchConfig, refetchStats]);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    // State
    isVerified,
    kycData,
    isLoading,
    error,
    config,
    stats,
    verificationHistory,
    
    // Actions
    verifyKYC,
    checkStatus,
    getKYCData,
    getVerificationHistory,
    refresh,
    clearError,
    
    // Contract info
    contractAddress: client.getContractAddress(),
    chainId
  };
}
