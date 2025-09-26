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
   * Check verification status
   */
  const checkStatus = useCallback(async (userAddress?: string) => {
    const targetAddress = userAddress || address;
    if (!targetAddress) {
      setError('No address provided');
      return false;
    }

    try {
      const status = await client.checkVerificationStatus(targetAddress);
      setIsVerified(status);
      return status;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  }, [address, client]);

  /**
   * Get KYC data for a user
   */
  const getKYCData = useCallback(async (userAddress?: string) => {
    const targetAddress = userAddress || address;
    if (!targetAddress) {
      setError('No address provided');
      return null;
    }

    try {
      const data = await client.getKYCData(targetAddress);
      setKycData(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    }
  }, [address, client]);

  /**
   * Get verification history
   */
  const getVerificationHistory = useCallback(async (userAddress?: string) => {
    const targetAddress = userAddress || address;
    if (!targetAddress) {
      setError('No address provided');
      return [];
    }

    try {
      const history = await client.getVerificationHistory(targetAddress);
      setVerificationHistory(history);
      return history;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return [];
    }
  }, [address, client]);

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
