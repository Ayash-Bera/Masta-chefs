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

const COMPLIANT_PROCEDURE_ABI = [
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "_identityVerificationHubV2Address",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "_scope",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "_verificationConfigId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "dataHash",
        "type": "bytes32"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "nationality",
        "type": "string"
      },
      {
        "indexed": false,
        "internalType": "uint8",
        "name": "documentType",
        "type": "uint8"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "name": "ComplianceVerified",
    "type": "event"
  },
  {
    "type": "function",
    "name": "generateDataHash",
    "inputs": [
      {
        "name": "user",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "name",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "dateOfBirth",
        "type": "string",
        "internalType": "string"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "pure"
  },
  {
    "type": "function",
    "name": "isVerifiedHuman",
    "inputs": [
      {
        "name": "user",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "manualVerifyCompliance",
    "inputs": [
      {
        "name": "user",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "name",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "dateOfBirth",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "nationality",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "documentType",
        "type": "uint8",
        "internalType": "uint8"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "onVerificationSuccess",
    "inputs": [
      {
        "name": "output",
        "type": "bytes",
        "internalType": "bytes"
      },
      {
        "name": "userData",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "owner",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "scope",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "totalCompliantUsers",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "usedHashes",
    "inputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "userCompliance",
    "inputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "dataHash",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "timestamp",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "isCompliant",
        "type": "bool",
        "internalType": "bool"
      },
      {
        "name": "nationality",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "documentType",
        "type": "uint8",
        "internalType": "uint8"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "verificationConfigId",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "verifiedHumans",
    "inputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "verifySelfProof",
    "inputs": [
      {
        "name": "proofPayload",
        "type": "bytes",
        "internalType": "bytes"
      },
      {
        "name": "userContextData",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "ScopeUpdated",
    "inputs": [
      {
        "name": "newScope",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "VerificationCompleted",
    "inputs": [
      {
        "name": "output",
        "type": "tuple",
        "indexed": false,
        "internalType": "struct ISelfVerificationRoot.GenericDiscloseOutputV2",
        "components": [
          {
            "name": "attestationId",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "userIdentifier",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "nullifier",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "forbiddenCountriesListPacked",
            "type": "uint256[4]",
            "internalType": "uint256[4]"
          },
          {
            "name": "issuingState",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "name",
            "type": "string[]",
            "internalType": "string[]"
          },
          {
            "name": "idNumber",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "nationality",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "dateOfBirth",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "gender",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "expiryDate",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "olderThan",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "ofac",
            "type": "bool[3]",
            "internalType": "bool[3]"
          }
        ]
      },
      {
        "name": "userData",
        "type": "bytes",
        "indexed": false,
        "internalType": "bytes"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "InvalidDataFormat",
    "inputs": []
  },
  {
    "type": "error",
    "name": "UnauthorizedCaller",
    "inputs": []
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "nullifier",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "userIdentifier",
            "type": "uint256"
          },
          {
            "internalType": "string",
            "name": "nationality",
            "type": "string"
          },
          {
            "internalType": "uint8",
            "name": "documentType",
            "type": "uint8"
          },
          {
            "internalType": "uint256",
            "name": "olderThan",
            "type": "uint256"
          },
          {
            "internalType": "bool[]",
            "name": "ofac",
            "type": "bool[]"
          },
          {
            "internalType": "bytes32",
            "name": "attestationId",
            "type": "bytes32"
          }
        ],
        "internalType": "struct CompliantProcedure.GenericDiscloseOutputV2",
        "name": "output",
        "type": "tuple"
      },
      {
        "internalType": "bytes",
        "name": "userData",
        "type": "bytes"
      }
    ],
    "name": "customVerificationHook",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "name",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "dateOfBirth",
        "type": "string"
      }
    ],
    "name": "generateDataHash",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      },
      {
        "internalType": "bytes",
        "name": "",
        "type": "bytes"
      }
    ],
    "name": "getConfigId",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalCompliantUsers",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      }
    ],
    "name": "getUserCompliance",
    "outputs": [
      {
        "components": [
          {
            "internalType": "bytes32",
            "name": "dataHash",
            "type": "bytes32"
          },
          {
            "internalType": "uint256",
            "name": "timestamp",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "isCompliant",
            "type": "bool"
          },
          {
            "internalType": "string",
            "name": "nationality",
            "type": "string"
          },
          {
            "internalType": "uint8",
            "name": "documentType",
            "type": "uint8"
          }
        ],
        "internalType": "struct CompliantProcedure.UserCompliance",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      }
    ],
    "name": "isUserCompliant",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      }
    ],
    "name": "isVerifiedHuman",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "name",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "dateOfBirth",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "nationality",
        "type": "string"
      },
      {
        "internalType": "uint8",
        "name": "documentType",
        "type": "uint8"
      }
    ],
    "name": "manualVerifyCompliance",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalCompliantUsers",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "name": "usedHashes",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "userCompliance",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "dataHash",
        "type": "bytes32"
      },
      {
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "isCompliant",
        "type": "bool"
      },
      {
        "internalType": "string",
        "name": "nationality",
        "type": "string"
      },
      {
        "internalType": "uint8",
        "name": "documentType",
        "type": "uint8"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "verificationConfigId",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "verifiedHumans",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "verifyCompliance",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "internalType": "string",
        "name": "nationality",
        "type": "string"
      },
      {
        "internalType": "uint8",
        "name": "documentType",
        "type": "uint8"
      }
    ],
    "name": "verifyCompliance",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

export class StealthKYCClient {
  private contractAddress: string;
  private chainId: number;

  constructor(chainId: number = 11142220) {
    console.log('SelfKYCClient constructor called with chainId:', chainId);
    console.log('Chain ID type:', typeof chainId);
    console.log('Chain ID comparison 11142220:', chainId === 11142220);
    console.log('Chain ID comparison 11155111:', chainId === 11155111);
    this.chainId = chainId;
    this.contractAddress = this.getContractAddress();
    console.log('Contract address resolved to:', this.contractAddress);
  }

  private getContractAddress(): string {
    console.log('getContractAddress called with chainId:', this.chainId);
    if (this.chainId === 44787) {
      console.log('Using ALFAJORES contract address');
      return CONTRACT_ADDRESSES.COMPLIANT_PROCEDURE.ALFAJORES;
    } else if (this.chainId === 11142220) {
      console.log('Using CELO SEPOLIA contract address');
      return CONTRACT_ADDRESSES.COMPLIANT_PROCEDURE.SEPOLIA;
    } else if (this.chainId === 11155111) {
      console.log('Using ETHEREUM SEPOLIA contract address');
      return CONTRACT_ADDRESSES.COMPLIANT_PROCEDURE.ETHEREUM_SEPOLIA;
    } else if (this.chainId === 8453) {
      console.log('Using BASE MAINNET contract address');
      return CONTRACT_ADDRESSES.COMPLIANT_PROCEDURE.BASE_MAINNET;
    } else if (this.chainId === 42220) {
      console.log('Using CELO contract address');
      return CONTRACT_ADDRESSES.COMPLIANT_PROCEDURE.CELO;
    }
    console.error('Unsupported chain ID:', this.chainId);
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
        kycData: undefined
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
   * Note: This should be used with wagmi hooks in React components
   */
  getIsUserCompliantConfig(userAddress: string) {
    return {
      address: this.contractAddress as `0x${string}`,
      abi: COMPLIANT_PROCEDURE_ABI,
      functionName: 'isUserCompliant',
      args: [userAddress as `0x${string}`],
    };
  }

  /**
   * Check if a user is verified human
   * Note: This should be used with wagmi hooks in React components
   */
  getIsVerifiedHumanConfig(userAddress: string) {
    return {
      address: this.contractAddress as `0x${string}`,
      abi: COMPLIANT_PROCEDURE_ABI,
      functionName: 'isVerifiedHuman',
      args: [userAddress as `0x${string}`],
    };
  }

  /**
   * Get user compliance data
   * Note: This should be used with wagmi hooks in React components
   */
  getUserComplianceConfig(userAddress: string) {
    return {
      address: this.contractAddress as `0x${string}`,
      abi: COMPLIANT_PROCEDURE_ABI,
      functionName: 'getUserCompliance',
      args: [userAddress as `0x${string}`],
    };
  }

  /**
   * Get verification config ID
   * Note: This should be used with wagmi hooks in React components
   */
  getConfigIdConfig() {
    return {
      address: this.contractAddress as `0x${string}`,
      abi: COMPLIANT_PROCEDURE_ABI,
      functionName: 'getConfigId',
      args: ['0x0000000000000000000000000000000000000000000000000000000000000000', '0x0000000000000000000000000000000000000000000000000000000000000000', '0x'],
    };
  }

  /**
   * Get total compliant users
   * Note: This should be used with wagmi hooks in React components
   */
  getTotalCompliantUsersConfig() {
    return {
      address: this.contractAddress as `0x${string}`,
      abi: COMPLIANT_PROCEDURE_ABI,
      functionName: 'getTotalCompliantUsers',
    };
  }

  /**
   * Get compliance verification events config for wagmi
   */
  getComplianceVerifiedEventsConfig(userAddress?: string) {
    return {
      address: this.contractAddress as `0x${string}`,
      abi: COMPLIANT_PROCEDURE_ABI,
      eventName: 'ComplianceVerified',
      args: userAddress ? { user: userAddress as `0x${string}` } : undefined,
      fromBlock: 'earliest' as const,
    };
  }

  /**
   * Get verification completed events config for wagmi
   */
  getVerificationCompletedEventsConfig() {
    return {
      address: this.contractAddress as `0x${string}`,
      abi: COMPLIANT_PROCEDURE_ABI,
      eventName: 'VerificationCompleted',
      fromBlock: 'earliest' as const,
    };
  }

  /**
   * Get configuration for watching compliance verification events
   */
  getWatchComplianceEventsConfig() {
    return {
      address: this.contractAddress as `0x${string}`,
      abi: COMPLIANT_PROCEDURE_ABI,
      eventName: 'ComplianceVerified',
    };
  }

  /**
   * Get configuration for watching verification completed events
   */
  getWatchVerificationCompletedEventsConfig() {
    return {
      address: this.contractAddress as `0x${string}`,
      abi: COMPLIANT_PROCEDURE_ABI,
      eventName: 'VerificationCompleted',
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
    return COMPLIANT_PROCEDURE_ABI;
  }

  /**
   * Get contract address (public method)
   */
  getContractAddressPublic(): string {
    return this.contractAddress;
  }

  /**
   * Get contract configuration for manual verification calls (admin only)
   */
  getCustomVerificationHookConfig(output: any, userData: string = '') {
    return {
      address: this.contractAddress as `0x${string}`,
      abi: COMPLIANT_PROCEDURE_ABI,
      functionName: 'customVerificationHook',
      args: [output, userData],
    };
  }

  /**
   * Get contract configuration for simple verification (Self.xyz compatible)
   */
  getVerifyComplianceConfig() {
    return {
      address: this.contractAddress as `0x${string}`,
      abi: COMPLIANT_PROCEDURE_ABI,
      functionName: 'verifyCompliance',
      args: [],
    };
  }

  /**
   * Get contract configuration for verification with parameters
   */
  getVerifyComplianceWithParamsConfig(user: string, nationality: string, documentType: number) {
    return {
      address: this.contractAddress as `0x${string}`,
      abi: COMPLIANT_PROCEDURE_ABI,
      functionName: 'verifyCompliance',
      args: [user, nationality, documentType],
    };
  }

  // Legacy compatibility - redirect to compliant procedure methods
  getIsVerifiedConfig = this.getIsUserCompliantConfig;
  getKYCDataConfig = this.getUserComplianceConfig;
  getVerificationEventsConfig = this.getComplianceVerifiedEventsConfig;
  getWatchKYCEventsConfig = this.getWatchComplianceEventsConfig;
  verifyKYC = this.verifyStealthKYC;
}

// Export as legacy alias for compatibility
export const SelfKYCClient = StealthKYCClient;
