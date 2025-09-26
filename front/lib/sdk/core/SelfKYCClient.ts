// SPDX-License-Identifier: MIT
import { useAccount, useChainId, useWriteContract, useReadContract, useWaitForTransactionReceipt } from 'wagmi';
import { 
  KYCData, 
  VerificationConfig, 
  KYCResult, 
  VerificationStats, 
  SelfProof,
  VerificationEvent 
} from '../types/contracts';
import { CONTRACT_ADDRESSES, DEFAULT_CONFIG } from '../constants/contracts';

const SELFKYC_ABI = [
  {
    "name": "getConfigId",
    "type": "function",
    "stateMutability": "view",
    "inputs": [],
    "outputs": [{ "name": "", "type": "bytes32" }]
  },
  {
    "name": "isKYCVerified",
    "type": "function",
    "stateMutability": "view",
    "inputs": [{ "name": "user", "type": "address" }],
    "outputs": [{ "name": "", "type": "bool" }]
  },
  {
    "name": "getKYCData",
    "type": "function",
    "stateMutability": "view",
    "inputs": [{ "name": "user", "type": "address" }],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "components": [
          { "name": "isVerified", "type": "bool" },
          { "name": "timestamp", "type": "uint256" },
          { "name": "nationality", "type": "string" },
          { "name": "documentType", "type": "uint8" },
          { "name": "isOfacClear", "type": "bool" },
          { "name": "verificationCount", "type": "uint256" }
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
      { "name": "uniqueUsers", "type": "uint256" }
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
    "name": "KYCVerified",
    "type": "event",
    "anonymous": false,
    "inputs": [
      { "name": "user", "type": "address", "indexed": true },
      { "name": "nullifier", "type": "uint256", "indexed": true },
      { "name": "nationality", "type": "string", "indexed": false },
      { "name": "documentType", "type": "uint8", "indexed": false },
      { "name": "timestamp", "type": "uint256", "indexed": false },
      { "name": "isOfacClear", "type": "bool", "indexed": false }
    ]
  },
  {
    "name": "KYCRevoked",
    "type": "event",
    "anonymous": false,
    "inputs": [
      { "name": "user", "type": "address", "indexed": true },
      { "name": "nullifier", "type": "uint256", "indexed": true },
      { "name": "reason", "type": "string", "indexed": false },
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

export class SelfKYCClient {
  private contractAddress: string;
  private chainId: number;

  constructor(chainId: number = 44787) {
    this.chainId = chainId;
    this.contractAddress = this.getContractAddress();
  }

  private getContractAddress(): string {
    if (this.chainId === 44787) {
      return CONTRACT_ADDRESSES.SELFKYC_VERIFIER.ALFAJORES;
    } else if (this.chainId === 42220) {
      return CONTRACT_ADDRESSES.SELFKYC_VERIFIER.CELO;
    }
    throw new Error(`Unsupported chain ID: ${this.chainId}`);
  }

  /**
   * Verify KYC using Self.xyz proof
   */
  async verifyKYC(proof: SelfProof, userData?: any): Promise<KYCResult> {
    try {
      const output = {
        nullifier: BigInt(proof.nullifier),
        userIdentifier: BigInt(proof.userIdentifier),
        nationality: proof.nationality,
        documentType: proof.documentType,
        olderThan: proof.ageAtLeast,
        ofac: [proof.isOfacMatch],
        attestationId: proof.attestationId
      };

      const userDataBytes = userData ? JSON.stringify(userData) : '';

      // This would typically be called through the Self.xyz verification process
      // For now, we'll simulate the verification
      const result = await this.simulateVerification(output, userDataBytes);
      
      return {
        success: true,
        transactionHash: result.transactionHash,
        kycData: result.kycData
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check if a user is KYC verified
   */
  async checkVerificationStatus(address: string): Promise<boolean> {
    try {
      // This would use useReadContract in a React component
      // For now, return a mock result
      return false;
    } catch (error) {
      console.error('Error checking verification status:', error);
      return false;
    }
  }

  /**
   * Get KYC data for a user
   */
  async getKYCData(address: string): Promise<KYCData | null> {
    try {
      // This would use useReadContract in a React component
      // For now, return mock data
      return {
        isVerified: false,
        timestamp: 0,
        nationality: '',
        documentType: 0,
        isOfacClear: false,
        verificationCount: 0
      };
    } catch (error) {
      console.error('Error getting KYC data:', error);
      return null;
    }
  }

  /**
   * Get current verification configuration
   */
  async getConfiguration(): Promise<VerificationConfig | null> {
    try {
      // This would use useReadContract in a React component
      return {
        configId: DEFAULT_CONFIG.CONFIG_ID,
        scope: DEFAULT_CONFIG.SCOPE,
        requireOfacCheck: DEFAULT_CONFIG.REQUIRE_OFAC_CHECK,
        minimumAge: DEFAULT_CONFIG.MINIMUM_AGE,
        excludedCountries: DEFAULT_CONFIG.EXCLUDED_COUNTRIES,
        allowedDocumentTypes: DEFAULT_CONFIG.ALLOWED_DOCUMENT_TYPES,
        isActive: true
      };
    } catch (error) {
      console.error('Error getting configuration:', error);
      return null;
    }
  }

  /**
   * Get verification statistics
   */
  async getStatistics(): Promise<VerificationStats | null> {
    try {
      // This would use useReadContract in a React component
      return {
        totalVerifications: 0,
        uniqueUsers: 0
      };
    } catch (error) {
      console.error('Error getting statistics:', error);
      return null;
    }
  }

  /**
   * Get verification history for a user
   */
  async getVerificationHistory(address: string): Promise<VerificationEvent[]> {
    try {
      // This would query contract events
      return [];
    } catch (error) {
      console.error('Error getting verification history:', error);
      return [];
    }
  }

  /**
   * Simulate verification process
   * In a real implementation, this would be handled by Self.xyz
   */
  private async simulateVerification(output: any, userData: string): Promise<{ transactionHash: string; kycData: KYCData }> {
    // Simulate verification delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    return {
      transactionHash: '0x' + Math.random().toString(16).substr(2, 64),
      kycData: {
        isVerified: true,
        timestamp: Date.now(),
        nationality: output.nationality,
        documentType: output.documentType,
        isOfacClear: !output.ofac[0],
        verificationCount: 1
      }
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
    return SELFKYC_ABI;
  }

  /**
   * Get contract address
   */
  getContractAddress(): string {
    return this.contractAddress;
  }
}
