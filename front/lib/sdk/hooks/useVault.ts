// SPDX-License-Identifier: MIT
'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAccount, useChainId, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { VaultClient } from '../core/VaultClient';
import { 
  DepositResult, 
  WithdrawResult, 
  SwapResult, 
  ComplianceResult,
  WithdrawProof,
  SpendProof,
  SwapParams
} from '../types/contracts';

export function useVault() {
  const { address } = useAccount();
  const chainId = useChainId();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [supportedTokens, setSupportedTokens] = useState<string[]>([]);
  const [latestRoot, setLatestRoot] = useState<string>('');
  const [complianceResult, setComplianceResult] = useState<ComplianceResult | null>(null);

  const client = new VaultClient(chainId);

  // Read contract data
  const { data: latestRootData, refetch: refetchLatestRoot } = useReadContract({
    address: client.getVaultAddress() as `0x${string}`,
    abi: client.getABI(),
    functionName: 'latestRoot',
    query: { enabled: true }
  });

  // Write contract for operations
  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // Update state when contract data changes
  useEffect(() => {
    if (latestRootData) {
      setLatestRoot(latestRootData as string);
    }
  }, [latestRootData]);

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
   * Deposit tokens into the vault
   */
  const deposit = useCallback(async (
    token: string, 
    amount: bigint, 
    commitment: string, 
    denominationId: number
  ) => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await client.deposit(token, amount, commitment, denominationId);
      
      if (result.success) {
        // Refresh latest root after successful deposit
        await refetchLatestRoot();
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
  }, [client, refetchLatestRoot]);

  /**
   * Withdraw tokens from the vault
   */
  const withdraw = useCallback(async (proof: WithdrawProof, recipient: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await client.withdraw(proof, recipient);
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
   * Execute privacy-preserving spend and swap
   */
  const executeSpend = useCallback(async (proof: SpendProof, swapParams: SwapParams) => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await client.executeSpend(proof, swapParams);
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
   * Check compliance for a token and amount
   */
  const checkCompliance = useCallback(async (token: string, amount: bigint) => {
    try {
      const result = await client.checkCompliance(token, amount);
      setComplianceResult(result);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return {
        isAllowed: false,
        reason: err instanceof Error ? err.message : 'Unknown error',
        checks: {
          ofac: false,
          age: false,
          nationality: false,
          documentType: false
        }
      };
    }
  }, [client]);

  /**
   * Get supported tokens
   */
  const getSupportedTokens = useCallback(async () => {
    try {
      const tokens = await client.getSupportedTokens();
      setSupportedTokens(tokens);
      return tokens;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return [];
    }
  }, [client]);

  /**
   * Get denominations for a token
   */
  const getDenominations = useCallback(async (token: string) => {
    try {
      const denominations = await client.getDenominations(token);
      return denominations;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return [];
    }
  }, [client]);

  /**
   * Check if nullifier has been used
   */
  const isNullifierUsed = useCallback(async (nullifier: string) => {
    try {
      const isUsed = await client.isNullifierUsed(nullifier);
      return isUsed;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  }, [client]);

  /**
   * Get latest merkle root
   */
  const getLatestRoot = useCallback(async () => {
    try {
      const root = await client.getLatestRoot();
      setLatestRoot(root);
      return root;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return '';
    }
  }, [client]);

  /**
   * Refresh all data
   */
  const refresh = useCallback(async () => {
    try {
      await Promise.all([
        refetchLatestRoot(),
        getSupportedTokens()
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [refetchLatestRoot, getSupportedTokens]);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Generate commitment for deposit
   */
  const generateCommitment = useCallback((amount: bigint, secret: string) => {
    // In a real implementation, this would use proper cryptographic methods
    const data = amount.toString() + secret + Date.now();
    return '0x' + Array.from(data).map(c => c.charCodeAt(0).toString(16)).join('');
  }, []);

  /**
   * Generate nullifier for withdraw/spend
   */
  const generateNullifier = useCallback((secret: string, index: number) => {
    // In a real implementation, this would use proper cryptographic methods
    const data = secret + index.toString() + Date.now();
    return '0x' + Array.from(data).map(c => c.charCodeAt(0).toString(16)).join('');
  }, []);

  return {
    // State
    isLoading,
    error,
    supportedTokens,
    latestRoot,
    complianceResult,
    
    // Actions
    deposit,
    withdraw,
    executeSpend,
    checkCompliance,
    getSupportedTokens,
    getDenominations,
    isNullifierUsed,
    getLatestRoot,
    refresh,
    clearError,
    
    // Utilities
    generateCommitment,
    generateNullifier,
    
    // Contract info
    vaultAddress: client.getVaultAddress(),
    complianceOracleAddress: client.getComplianceOracleAddress(),
    chainId
  };
}
