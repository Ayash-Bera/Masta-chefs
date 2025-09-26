// SPDX-License-Identifier: MIT
// Main SDK export file

// Core clients
export { SelfKYCClient } from './core/SelfKYCClient';
export { StealthKYCClient } from './core/StealthKYCClient';
export { VaultClient } from './core/VaultClient';

// React hooks
export { useSelfKYC } from './hooks/useSelfKYC';
export { useStealthKYC } from './hooks/useStealthKYC';
export { useVault } from './hooks/useVault';

// UI components
export { KYCVerification } from './components/KYCVerification';
export { StealthAddressManager } from './components/StealthAddressManager';

// Utility classes
export { SelfIntegration } from './utils/selfIntegration';
export { StealthAddressUtils } from './utils/stealthAddress';

// Types
export type {
  KYCData,
  VerificationConfig,
  MasterKYCIdentity,
  StealthAddressProof,
  VerificationStats,
  KYCResult,
  StealthKYCResult,
  DepositResult,
  WithdrawResult,
  SwapResult,
  ComplianceResult,
  StealthAddress,
  SelfProof,
  IdentityData,
  SwapParams,
  WithdrawProof,
  SpendProof,
  VerificationEvent
} from './types/contracts';

// Constants
export {
  CONTRACT_ADDRESSES,
  SELF_HUB_ADDRESSES,
  NETWORK_CONFIGS,
  DEFAULT_CONFIG,
  DOCUMENT_TYPES,
  COMPLIANCE_RULES
} from './constants/contracts';

// Re-export everything for convenience
export * from './types/contracts';
export * from './constants/contracts';
