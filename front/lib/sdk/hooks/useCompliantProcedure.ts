'use client';

import { useAccount, useReadContract, useWatchContractEvent } from 'wagmi';
import { useState, useEffect } from 'react';
import { CONTRACT_ADDRESSES } from '../constants/contracts';
import type { UserCompliance, ComplianceStats, ComplianceEvent } from '../types/compliantProcedure';

// CompliantProcedure contract ABI (essential functions only)
const COMPLIANT_PROCEDURE_ABI = [
  {
    name: 'isUserCompliant',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }]
  },
  {
    name: 'getUserCompliance',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'dataHash', type: 'bytes32' },
          { name: 'timestamp', type: 'uint256' },
          { name: 'isCompliant', type: 'bool' },
          { name: 'nationality', type: 'string' },
          { name: 'documentType', type: 'uint8' }
        ]
      }
    ]
  },
  {
    name: 'getTotalCompliantUsers',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    name: 'ComplianceVerified',
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'dataHash', type: 'bytes32', indexed: true },
      { name: 'nationality', type: 'string', indexed: false },
      { name: 'documentType', type: 'uint8', indexed: false },
      { name: 'timestamp', type: 'uint256', indexed: false }
    ]
  },
  {
    name: 'ComplianceRevoked',
    type: 'event',
    anonymous: false,
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'timestamp', type: 'uint256', indexed: false }
    ]
  }
] as const;

export function useCompliantProcedure() {
  const { address, isConnected } = useAccount();
  const [recentEvents, setRecentEvents] = useState<ComplianceEvent[]>([]);
  const [lastEventUpdate, setLastEventUpdate] = useState<number>(Date.now());

  // Get contract address (currently placeholder - will be updated after deployment)
  const contractAddress = CONTRACT_ADDRESSES.COMPLIANT_PROCEDURE.SEPOLIA as `0x${string}`;

  // Check if user is compliant
  const { data: isCompliant, refetch: refetchCompliance } = useReadContract({
    address: contractAddress,
    abi: COMPLIANT_PROCEDURE_ABI,
    functionName: 'isUserCompliant',
    args: address ? [address] : undefined,
    enabled: !!address && isConnected,
  });

  // Get user compliance data
  const { data: complianceDataRaw, refetch: refetchComplianceData } = useReadContract({
    address: contractAddress,
    abi: COMPLIANT_PROCEDURE_ABI,
    functionName: 'getUserCompliance',
    args: address ? [address] : undefined,
    enabled: !!address && isConnected,
  });

  // Get total compliant users
  const { data: totalCompliantUsers, refetch: refetchStats } = useReadContract({
    address: contractAddress,
    abi: COMPLIANT_PROCEDURE_ABI,
    functionName: 'getTotalCompliantUsers',
    enabled: true,
  });

  // Transform raw compliance data
  const complianceData: UserCompliance | null = complianceDataRaw ? {
    dataHash: complianceDataRaw[0] as string,
    timestamp: Number(complianceDataRaw[1]),
    isCompliant: complianceDataRaw[2] as boolean,
    nationality: complianceDataRaw[3] as string,
    documentType: Number(complianceDataRaw[4])
  } : null;

  // Transform stats data
  const stats: ComplianceStats | null = totalCompliantUsers ? {
    totalCompliantUsers: Number(totalCompliantUsers)
  } : null;

  // Watch for compliance verification events
  useWatchContractEvent({
    address: contractAddress,
    abi: COMPLIANT_PROCEDURE_ABI,
    eventName: 'ComplianceVerified',
    onLogs: (logs) => {
      console.log('ComplianceVerified events:', logs);

      // Transform logs to ComplianceEvent objects
      const newEvents: ComplianceEvent[] = logs.map((log) => ({
        user: log.args.user as string,
        dataHash: log.args.dataHash as string,
        nationality: log.args.nationality as string,
        documentType: Number(log.args.documentType),
        timestamp: Number(log.args.timestamp),
        transactionHash: log.transactionHash,
        blockNumber: Number(log.blockNumber)
      }));

      setRecentEvents(prev => [...newEvents, ...prev].slice(0, 10)); // Keep last 10 events
      setLastEventUpdate(Date.now());

      // Refetch user data if this event is for the current user
      if (address && newEvents.some(event => event.user.toLowerCase() === address.toLowerCase())) {
        refetchCompliance();
        refetchComplianceData();
        refetchStats();
      }
    },
    enabled: true,
  });

  // Watch for compliance revocation events
  useWatchContractEvent({
    address: contractAddress,
    abi: COMPLIANT_PROCEDURE_ABI,
    eventName: 'ComplianceRevoked',
    onLogs: (logs) => {
      console.log('ComplianceRevoked events:', logs);

      // Refetch user data if this event is for the current user
      if (address && logs.some(log => log.args.user?.toLowerCase() === address.toLowerCase())) {
        refetchCompliance();
        refetchComplianceData();
        refetchStats();
      }
    },
    enabled: true,
  });

  // Utility functions
  const refreshData = async () => {
    await Promise.all([
      refetchCompliance(),
      refetchComplianceData(),
      refetchStats()
    ]);
  };

  const isContractAddressValid = () => {
    return contractAddress !== '0x0000000000000000000000000000000000000000';
  };

  return {
    // Core state
    isCompliant: Boolean(isCompliant),
    complianceData,
    stats,
    recentEvents,
    lastEventUpdate,

    // Utility functions
    refreshData,
    isContractAddressValid,

    // Contract information
    contractAddress,

    // Connection state
    isConnected,
    userAddress: address,

    // Loading states (derived from wagmi hooks)
    isLoading: false, // Could be enhanced with loading states from wagmi
  };
}

// Helper hook for compliance status checking (simplified version)
export function useComplianceStatus(userAddress?: string) {
  const targetAddress = userAddress;
  const contractAddress = CONTRACT_ADDRESSES.COMPLIANT_PROCEDURE.SEPOLIA as `0x${string}`;

  const { data: isCompliant } = useReadContract({
    address: contractAddress,
    abi: COMPLIANT_PROCEDURE_ABI,
    functionName: 'isUserCompliant',
    args: targetAddress ? [targetAddress as `0x${string}`] : undefined,
    enabled: !!targetAddress,
  });

  return {
    isCompliant: Boolean(isCompliant),
    targetAddress,
    contractAddress
  };
}