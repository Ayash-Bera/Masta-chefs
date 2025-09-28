// SPDX-License-Identifier: MIT
// Main SDK export file

// Core clients
export { VaultClient } from './core/VaultClient';

// React hooks
export { useVault } from './hooks/useVault';

// Utility classes
export { SelfIntegration } from './utils/selfIntegration';
export { StealthAddressUtils } from './utils/stealthAddress';

// Types
export type {
  DepositResult,
  WithdrawResult,
  SwapResult,
  SwapParams,
  WithdrawProof,
  SpendProof
} from './types/contracts';

// Constants
export {
  CONTRACT_ADDRESSES,
  NETWORK_CONFIGS
} from './constants/contracts';

// Re-export everything for convenience
export * from './types/contracts';
export * from './constants/contracts';
