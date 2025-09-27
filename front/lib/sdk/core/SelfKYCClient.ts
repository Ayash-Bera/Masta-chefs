// SPDX-License-Identifier: MIT
// STEALTH KYC CLIENT - Primary stealth address KYC system
import { useAccount, useChainId, useWriteContract, useReadContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import {
  MasterKYCIdentity,
  VerificationConfig,
  KYCResult,
  VerificationStats,
  SelfProof,
  VerificationEvent
} from '../types/contracts';
import { CONTRACT_ADDRESSES, DEFAULT_CONFIG } from '../constants/contracts';

const STEALTH_KYC_ABI = [
  {
    "name": "getConfigId",
    "type": "function",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [{ "name": "", "type": "bytes32" }]
  },
  {
    "name": "isStealthAddressVerified",
    "type": "function",
    "stateMutability": "view",
    "inputs": [{ "name": "stealthAddress", "type": "address" }],
    "outputs": [{ "name": "", "type": "bool" }]
  },
  {
    "name": "getMasterIdentityByStealthAddress",
    "type": "function",
    "stateMutability": "view",
    "inputs": [{ "name": "stealthAddress", "type": "address" }],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "components": [
          { "name": "isVerified", "type": "bool" },
          { "name": "dobCommitment", "type": "bytes32" },
          { "name": "nationality", "type": "string" },
          { "name": "documentType", "type": "uint8" },
          { "name": "isOfacClear", "type": "bool" },
          { "name": "verificationTimestamp", "type": "uint256" },
          { "name": "verificationCount", "type": "uint256" },
          { "name": "primaryStealthAddress", "type": "address" }
        ]
      }
    ]
  },
  {
    "name": "getMasterIdentity",
    "type": "function",
    "stateMutability": "view",
    "inputs": [{ "name": "masterNullifier", "type": "bytes32" }],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "components": [
          { "name": "isVerified", "type": "bool" },
          { "name": "dobCommitment", "type": "bytes32" },
          { "name": "nationality", "type": "string" },
          { "name": "documentType", "type": "uint8" },
          { "name": "isOfacClear", "type": "bool" },
          { "name": "verificationTimestamp", "type": "uint256" },
          { "name": "verificationCount", "type": "uint256" },
          { "name": "primaryStealthAddress", "type": "address" }
        ]
      }
    ]
  },
  {
    "name": "getConfiguration",
    "type": "function",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "components": [
          { "name": "configId", "type": "bytes32" },
          { "name": "scope", "type": "uint256" },
          { "name": "requireOfacCheck", "type": "bool" },
          { "name": "minimumAge", "type": "uint256" },
          { "name": "excludedCountries", "type": "string[]" },
          { "name": "allowedDocumentTypes", "type": "uint8[]" },
          { "name": "isActive", "type": "bool" }
        ]
      }
    ]
  },
  {
    "name": "getStatistics",
    "type": "function",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [
      { "name": "totalVerifications", "type": "uint256" },
      { "name": "uniqueIdentities", "type": "uint256" },
      { "name": "totalStealthAddresses", "type": "uint256" }
    ]
  },
  {
    "name": "customVerificationHook",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [
      {
        "name": "output",
        "type": "tuple",
        "components": [
          { "name": "nullifier", "type": "uint256" },
          { "name": "userIdentifier", "type": "uint256" },
          { "name": "nationality", "type": "string" },
          { "name": "documentType", "type": "uint8" },
          { "name": "olderThan", "type": "uint256" },
          { "name": "ofac", "type": "bool[]" },
          { "name": "attestationId", "type": "bytes32" }
        ]
      },
      { "name": "userData", "type": "bytes" }
    ],
    "outputs": []
  },
  {
    "name": "MasterIdentityVerified",
    "type": "event",
    "anonymous": false,
    "inputs": [
      { "name": "masterNullifier", "type": "bytes32", "indexed": true },
      { "name": "primaryStealthAddress", "type": "address", "indexed": true },
      { "name": "nationality", "type": "string", "indexed": false },
      { "name": "documentType", "type": "uint8", "indexed": false },
      { "name": "timestamp", "type": "uint256", "indexed": false },
      { "name": "isOfacClear", "type": "bool", "indexed": false }
    ]
  },
  {
    "name": "StealthAddressLinked",
    "type": "event",
    "anonymous": false,
    "inputs": [
      { "name": "masterNullifier", "type": "bytes32", "indexed": true },
      { "name": "stealthAddress", "type": "address", "indexed": true },
      { "name": "linkedBy", "type": "address", "indexed": true },
      { "name": "timestamp", "type": "uint256", "indexed": false }
    ]
  },
  {
    "name": "ConfigurationUpdated",
    "type": "event",
    "anonymous": false,
    "inputs": [
      { "name": "configId", "type": "bytes32", "indexed": true },
      { "name": "scope", "type": "uint256", "indexed": false },
      { "name": "minimumAge", "type": "uint256", "indexed": false },
      { "name": "requireOfacCheck", "type": "bool", "indexed": false }
    ]
  }
] as const;

export class StealthKYCClient {
  private contractAddress: string;
  private chainId: number;

  constructor(chainId: number = 11142220) {
    this.chainId = chainId;
    this.contractAddress = this.getContractAddress();
  }

  private getContractAddress(): string {
    if (this.chainId === 44787) {
      return CONTRACT_ADDRESSES.STEALTH_KYC_VERIFIER.ALFAJORES;
    } else if (this.chainId === 11142220) {
      return CONTRACT_ADDRESSES.STEALTH_KYC_VERIFIER.SEPOLIA;
    } else if (this.chainId === 42220) {
      return CONTRACT_ADDRESSES.STEALTH_KYC_VERIFIER.CELO;
    }
    throw new Error(`Unsupported chain ID: ${this.chainId}`);
  }

  /**
   * Verify stealth address KYC using Self.xyz proof - This is called by Self.xyz verification flow
   */
  async verifyStealthKYC(proof: SelfProof, userData?: any): Promise<KYCResult> {
    try {
      // Note: In the actual Self.xyz integration, this method would be called
      // automatically by the Self.xyz verification flow through the customVerificationHook
      // in the smart contract. The frontend primarily monitors events and updates state.

      return {
        success: true,
        message: 'Stealth address verification initiated through Self.xyz mobile app'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check if a stealth address is KYC verified
   * Note: This should be used with wagmi hooks in React components
   */
  getIsStealthAddressVerifiedConfig(stealthAddress: string) {
    return {
      address: this.contractAddress as `0x${string}`,
      abi: STEALTH_KYC_ABI,
      functionName: 'isStealthAddressVerified',
      args: [stealthAddress as `0x${string}`],
    };
  }

  /**
   * Get master identity data for a stealth address
   * Note: This should be used with wagmi hooks in React components
   */
  getMasterIdentityByStealthAddressConfig(stealthAddress: string) {
    return {
      address: this.contractAddress as `0x${string}`,
      abi: STEALTH_KYC_ABI,
      functionName: 'getMasterIdentityByStealthAddress',
      args: [stealthAddress as `0x${string}`],
    };
  }

  /**
   * Get master identity data by nullifier
   * Note: This should be used with wagmi hooks in React components
   */
  getMasterIdentityConfig(masterNullifier: string) {
    return {
      address: this.contractAddress as `0x${string}`,
      abi: STEALTH_KYC_ABI,
      functionName: 'getMasterIdentity',
      args: [masterNullifier as `0x${string}`],
    };
  }

  /**
   * Get current verification configuration
   * Note: This should be used with wagmi hooks in React components
   */
  getConfigurationConfig() {
    return {
      address: this.contractAddress as `0x${string}`,
      abi: STEALTH_KYC_ABI,
      functionName: 'getConfiguration',
    };
  }

  /**
   * Get verification statistics including stealth addresses
   * Note: This should be used with wagmi hooks in React components
   */
  getStatisticsConfig() {
    return {
      address: this.contractAddress as `0x${string}`,
      abi: STEALTH_KYC_ABI,
      functionName: 'getStatistics',
    };
  }

  /**
   * Get master identity verification events config for wagmi
   */
  getMasterIdentityVerificationEventsConfig(stealthAddress?: string) {
    return {
      address: this.contractAddress as `0x${string}`,
      abi: STEALTH_KYC_ABI,
      eventName: 'MasterIdentityVerified',
      args: stealthAddress ? { primaryStealthAddress: stealthAddress as `0x${string}` } : undefined,
      fromBlock: 'earliest' as const,
    };
  }

  /**
   * Get stealth address linking events config for wagmi
   */
  getStealthAddressLinkedEventsConfig(stealthAddress?: string) {
    return {
      address: this.contractAddress as `0x${string}`,
      abi: STEALTH_KYC_ABI,
      eventName: 'StealthAddressLinked',
      args: stealthAddress ? { stealthAddress: stealthAddress as `0x${string}` } : undefined,
      fromBlock: 'earliest' as const,
    };
  }

  /**
   * Get configuration for watching master identity verification events
   */
  getWatchMasterIdentityEventsConfig() {
    return {
      address: this.contractAddress as `0x${string}`,
      abi: STEALTH_KYC_ABI,
      eventName: 'MasterIdentityVerified',
    };
  }

  /**
   * Get configuration for watching stealth address linking events
   */
  getWatchStealthAddressLinkedEventsConfig() {
    return {
      address: this.contractAddress as `0x${string}`,
      abi: STEALTH_KYC_ABI,
      eventName: 'StealthAddressLinked',
    };
  }

  /**
   * Validate proof structure
   */
  validateProof(proof: SelfProof): boolean {
    return !!(
      proof.nullifier &&
      proof.userIdentifier &&
      proof.nationality &&
      proof.documentType &&
      proof.ageAtLeast &&
      typeof proof.isOfacMatch === 'boolean' &&
      proof.attestationId &&
      proof.proof &&
      proof.timestamp
    );
  }

  /**
   * Get contract ABI for use with wagmi
   */
  getABI() {
    return STEALTH_KYC_ABI;
  }

  /**
   * Get contract address
   */
  getContractAddress(): string {
    return this.contractAddress;
  }

  /**
   * Get contract configuration for manual verification calls (admin only)
   */
  getCustomVerificationHookConfig(output: any, userData: string = '') {
    return {
      address: this.contractAddress as `0x${string}`,
      abi: STEALTH_KYC_ABI,
      functionName: 'customVerificationHook',
      args: [output, userData],
    };
  }

  // Legacy compatibility - redirect to stealth address methods
  getIsVerifiedConfig = this.getIsStealthAddressVerifiedConfig;
  getKYCDataConfig = this.getMasterIdentityByStealthAddressConfig;
  getVerificationEventsConfig = this.getMasterIdentityVerificationEventsConfig;
  getWatchKYCEventsConfig = this.getWatchMasterIdentityEventsConfig;
  verifyKYC = this.verifyStealthKYC;
}

// Export as legacy alias for compatibility
export const SelfKYCClient = StealthKYCClient;
