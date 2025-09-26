// SPDX-License-Identifier: MIT
'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAccount, useChainId, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { StealthKYCClient } from '../core/StealthKYCClient';
import { 
  StealthAddress, 
  MasterKYCIdentity, 
  StealthKYCResult, 
  SelfProof 
} from '../types/contracts';

export function useStealthKYC() {
  const { address } = useAccount();
  const chainId = useChainId();
  const [stealthAddresses, setStealthAddresses] = useState<StealthAddress[]>([]);
  const [masterIdentity, setMasterIdentity] = useState<MasterKYCIdentity | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{ totalVerifications: number; uniqueIdentities: number; totalStealthAddresses: number } | null>(null);

  const client = new StealthKYCClient(chainId);

  // Read contract data
  const { data: isStealthVerified, refetch: refetchStealthVerification } = useReadContract({
    address: client.getContractAddress() as `0x${string}`,
    abi: client.getABI(),
    functionName: 'isStealthAddressVerified',
    args: address ? [address] : undefined,
    query: { enabled: !!address }
  });

  const { data: masterIdentityData, refetch: refetchMasterIdentity } = useReadContract({
    address: client.getContractAddress() as `0x${string}`,
    abi: client.getABI(),
    functionName: 'getMasterIdentityByStealthAddress',
    args: address ? [address] : undefined,
    query: { enabled: !!address }
  });

  const { data: statsData, refetch: refetchStats } = useReadContract({
    address: client.getContractAddress() as `0x${string}`,
    abi: client.getABI(),
    functionName: 'getStatistics',
    query: { enabled: true }
  });

  // Write contract for operations
  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // Update state when contract data changes
  useEffect(() => {
    if (masterIdentityData) {
      const data = masterIdentityData as any;
      setMasterIdentity({
        isVerified: data.isVerified,
        dobCommitment: data.dobCommitment,
        nationality: data.nationality,
        documentType: Number(data.documentType),
        isOfacClear: data.isOfacClear,
        verificationTimestamp: Number(data.verificationTimestamp),
        verificationCount: Number(data.verificationCount),
        primaryStealthAddress: data.primaryStealthAddress
      });
    }
  }, [masterIdentityData]);

  useEffect(() => {
    if (statsData) {
      const data = statsData as any;
      setStats({
        totalVerifications: Number(data[0]),
        uniqueIdentities: Number(data[1]),
        totalStealthAddresses: Number(data[2])
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
   * Create a new stealth address
   */
  const createStealthAddress = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const stealthAddress = await client.createStealthAddress();
      setStealthAddresses(prev => [...prev, stealthAddress]);
      
      return stealthAddress;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  /**
   * Link a stealth address to master identity
   */
  const linkAddress = useCallback(async (masterNullifier: string, stealthAddress: string) => {
    try {
      setIsLoading(true);
      setError(null);

      await client.linkStealthAddress(masterNullifier, stealthAddress);
      
      // Update local state
      setStealthAddresses(prev => 
        prev.map(addr => 
          addr.address === stealthAddress 
            ? { ...addr, isLinked: true, masterNullifier }
            : addr
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  /**
   * Get linked addresses for a master identity
   */
  const getLinkedAddresses = useCallback(async (masterNullifier: string) => {
    try {
      const addresses = await client.getLinkedAddresses(masterNullifier);
      return addresses;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return [];
    }
  }, [client]);

  /**
   * Get master identity by stealth address
   */
  const getMasterIdentity = useCallback(async (stealthAddress?: string) => {
    const targetAddress = stealthAddress || address;
    if (!targetAddress) {
      setError('No address provided');
      return null;
    }

    try {
      const identity = await client.getMasterIdentity(targetAddress);
      setMasterIdentity(identity);
      return identity;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    }
  }, [address, client]);

  /**
   * Verify DOB commitment
   */
  const verifyDOBCommitment = useCallback(async (
    masterNullifier: string, 
    dateOfBirth: string, 
    salt: string
  ) => {
    try {
      const isValid = await client.verifyDOBCommitment(masterNullifier, dateOfBirth, salt);
      return isValid;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  }, [client]);

  /**
   * Verify KYC with stealth address
   */
  const verifyWithStealth = useCallback(async (proof: SelfProof, stealthAddress: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await client.verifyWithStealth(proof, stealthAddress);
      
      if (result.success && result.masterIdentity) {
        setMasterIdentity(result.masterIdentity);
        
        // Update stealth address as linked
        setStealthAddresses(prev => 
          prev.map(addr => 
            addr.address === stealthAddress 
              ? { ...addr, isLinked: true, masterNullifier: result.masterIdentity?.dobCommitment }
              : addr
          )
        );
      }

      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      };
    } finally {
      setIsLoading(false);
    }
  }, [client]);

  /**
   * Check if stealth address is verified
   */
  const isStealthAddressVerified = useCallback(async (stealthAddress?: string) => {
    const targetAddress = stealthAddress || address;
    if (!targetAddress) {
      setError('No address provided');
      return false;
    }

    try {
      const isVerified = await client.isStealthAddressVerified(targetAddress);
      return isVerified;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  }, [address, client]);

  /**
   * Get statistics
   */
  const getStatistics = useCallback(async () => {
    try {
      const statistics = await client.getStatistics();
      setStats(statistics);
      return statistics;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    }
  }, [client]);

  /**
   * Refresh all data
   */
  const refresh = useCallback(async () => {
    try {
      await Promise.all([
        refetchStealthVerification(),
        refetchMasterIdentity(),
        refetchStats()
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [refetchStealthVerification, refetchMasterIdentity, refetchStats]);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Remove stealth address from local state
   */
  const removeStealthAddress = useCallback((stealthAddress: string) => {
    setStealthAddresses(prev => prev.filter(addr => addr.address !== stealthAddress));
  }, []);

  return {
    // State
    stealthAddresses,
    masterIdentity,
    isLoading,
    error,
    stats,
    
    // Actions
    createStealthAddress,
    linkAddress,
    getLinkedAddresses,
    getMasterIdentity,
    verifyDOBCommitment,
    verifyWithStealth,
    isStealthAddressVerified,
    getStatistics,
    refresh,
    clearError,
    removeStealthAddress,
    
    // Contract info
    contractAddress: client.getContractAddress(),
    chainId
  };
}
