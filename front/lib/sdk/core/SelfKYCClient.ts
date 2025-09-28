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
        "name": "hubV2",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "scopeValue",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getConfigId",
    "inputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
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
    "name": "getTotalCompliantUsers",
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
    "name": "getUserAgeVerification",
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
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getUserCompliance",
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
        "type": "tuple",
        "internalType": "struct CompliantProcedure.UserCompliance",
        "components": [
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
          },
          {
            "name": "documentType",
            "type": "uint8",
            "internalType": "uint8"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getUserDateOfBirth",
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
        "type": "string",
        "internalType": "string"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getUserGender",
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
        "type": "string",
        "internalType": "string"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getUserIssuingState",
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
        "type": "string",
        "internalType": "string"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getUserName",
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
        "type": "string[]",
        "internalType": "string[]"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getUserNationality",
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
        "type": "string",
        "internalType": "string"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getUserOfacVerification",
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
        "type": "bool[3]",
        "internalType": "bool[3]"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "isUserCompliant",
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
    "name": "verifyCompliance",
    "inputs": [
      {
        "name": "user",
        "type": "address",
        "internalType": "address"
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
    "name": "verifyCompliance",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "ComplianceVerified",
    "inputs": [
      {
        "name": "user",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "dataHash",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "nationality",
        "type": "string",
        "indexed": false,
        "internalType": "string"
      },
      {
        "name": "documentType",
        "type": "uint8",
        "indexed": false,
        "internalType": "uint8"
      },
      {
        "name": "timestamp",
        "type": "uint256",
        "indexed": false,
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

  /**
   * Get user's nationality
   */
  getUserNationalityConfig(user: string) {
    return {
      address: this.contractAddress as `0x${string}`,
      abi: COMPLIANT_PROCEDURE_ABI,
      functionName: 'getUserNationality',
      args: [user],
    };
  }

  /**
   * Get user's issuing state
   */
  getUserIssuingStateConfig(user: string) {
    return {
      address: this.contractAddress as `0x${string}`,
      abi: COMPLIANT_PROCEDURE_ABI,
      functionName: 'getUserIssuingState',
      args: [user],
    };
  }

  /**
   * Get user's name
   */
  getUserNameConfig(user: string) {
    return {
      address: this.contractAddress as `0x${string}`,
      abi: COMPLIANT_PROCEDURE_ABI,
      functionName: 'getUserName',
      args: [user],
    };
  }

  /**
   * Get user's date of birth
   */
  getUserDateOfBirthConfig(user: string) {
    return {
      address: this.contractAddress as `0x${string}`,
      abi: COMPLIANT_PROCEDURE_ABI,
      functionName: 'getUserDateOfBirth',
      args: [user],
    };
  }

  /**
   * Get user's gender
   */
  getUserGenderConfig(user: string) {
    return {
      address: this.contractAddress as `0x${string}`,
      abi: COMPLIANT_PROCEDURE_ABI,
      functionName: 'getUserGender',
      args: [user],
    };
  }

  /**
   * Get user's age verification result
   */
  getUserAgeVerificationConfig(user: string) {
    return {
      address: this.contractAddress as `0x${string}`,
      abi: COMPLIANT_PROCEDURE_ABI,
      functionName: 'getUserAgeVerification',
      args: [user],
    };
  }

  /**
   * Get user's OFAC verification result
   */
  getUserOfacVerificationConfig(user: string) {
    return {
      address: this.contractAddress as `0x${string}`,
      abi: COMPLIANT_PROCEDURE_ABI,
      functionName: 'getUserOfacVerification',
      args: [user],
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
