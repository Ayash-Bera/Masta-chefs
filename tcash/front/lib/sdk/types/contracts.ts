// SPDX-License-Identifier: MIT
export interface KYCData {
  isVerified: boolean;
  timestamp: number;
  nationality: string;
  documentType: number; // 1=E-Passport, 2=EU ID Card, etc.
  isOfacClear: boolean;
  verificationCount: number;
}

export interface VerificationConfig {
  configId: string;
  scope: string;
  requireOfacCheck: boolean;
  minimumAge: number;
  excludedCountries: string[];
  allowedDocumentTypes: number[];
  isActive: boolean;
}

export interface MasterKYCIdentity {
  isVerified: boolean;
  dobCommitment: string;
  nationality: string;
  documentType: number;
  isOfacClear: boolean;
  verificationTimestamp: number;
  verificationCount: number;
  primaryStealthAddress: string;
}

export interface StealthAddressProof {
  masterNullifier: string;
  signature: string;
  timestamp: number;
}

export interface VerificationStats {
  totalVerifications: number;
  uniqueUsers: number;
  uniqueIdentities?: number;
  totalStealthAddresses?: number;
}

export interface KYCResult {
  success: boolean;
  transactionHash?: string;
  kycData?: KYCData;
  error?: string;
}

export interface StealthKYCResult {
  success: boolean;
  transactionHash?: string;
  masterIdentity?: MasterKYCIdentity;
  stealthAddress?: string;
  error?: string;
}

export interface DepositResult {
  success: boolean;
  transactionHash?: string;
  commitment?: string;
  error?: string;
}

export interface WithdrawResult {
  success: boolean;
  transactionHash?: string;
  amount?: bigint;
  error?: string;
}

export interface SwapResult {
  success: boolean;
  transactionHash?: string;
  amountOut?: bigint;
  error?: string;
}

export interface ComplianceResult {
  isAllowed: boolean;
  reason?: string;
  checks: {
    ofac: boolean;
    age: boolean;
    nationality: boolean;
    documentType: boolean;
  };
}

export interface StealthAddress {
  address: string;
  privateKey: string;
  isLinked: boolean;
  masterNullifier?: string;
}

export interface SelfProof {
  nullifier: string;
  userIdentifier: string;
  nationality: string;
  documentType: number;
  ageAtLeast: number;
  isOfacMatch: boolean;
  attestationId: string;
  proof: string;
  timestamp: number;
}

export interface IdentityData {
  configId: string;
  scope: string;
  userData?: any;
}

export interface SwapParams {
  tokenIn: string;
  tokenOut: string;
  amountIn: bigint;
  minAmountOut: bigint;
  recipientStealthData: string;
  deadline: number;
}

export interface WithdrawProof {
  proof: string;
  root: string;
  nullifier: string;
  token: string;
  amount: bigint;
  recipient: string;
}

export interface SpendProof {
  proof: string;
  root: string;
  nullifier: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: bigint;
  minAmountOut: bigint;
  recipientStealthData: string;
}

export interface VerificationEvent {
  type: 'KYCVerified' | 'KYCRevoked' | 'StealthAddressLinked' | 'StealthAddressUnlinked';
  user: string;
  timestamp: number;
  data: any;
}
