// SPDX-License-Identifier: MIT
export const CONTRACT_ADDRESSES = {
  // Primary KYC System - StealthKYC with Privacy Features
  STEALTH_KYC_VERIFIER: {
    SEPOLIA: '0x49f84f8FDeda8dA7403f0d9320670329DeA4290B', // Primary Celo Sepolia
    ALFAJORES: '0x...', // Legacy - to be deployed if needed
    CELO: '0x...' // Mainnet - to be deployed
  },
  // Legacy - Remove after migration
  // SELFKYC_VERIFIER: {
  //   SEPOLIA: '0xc34Bd4ddb76036514ade24acae2Ba975469f907C', // Deprecated
  // },
  SHIELDED_VAULT: {
    ALFAJORES: '0x...', // To be deployed
    CELO: '0x...' // To be deployed
  },
  PRIVACY_ROUTER: {
    ALFAJORES: '0x...', // To be deployed
    CELO: '0x...' // To be deployed
  }
} as const;

export const SELF_HUB_ADDRESSES = {
  ALFAJORES: '0x68c931C9a534D37aa78094877F46fE46a49F1A51',
  CELO: '0xe57F4773bd9c9d8b6Cd70431117d353298B9f5BF'
} as const;

export const NETWORK_CONFIGS = {
  ALFAJORES: {
    chainId: 44787,
    name: 'Celo Alfajores Testnet',
    rpcUrl: 'https://alfajores-forno.celo-testnet.org',
    explorerUrl: 'https://alfajores.celoscan.io',
    nativeCurrency: {
      name: 'CELO',
      symbol: 'CELO',
      decimals: 18
    }
  },
  SEPOLIA: {
    chainId: 11142220,
    name: 'Celo Sepolia Testnet',
    rpcUrl: 'https://forno.celo-sepolia.celo-testnet.org',
    explorerUrl: 'https://celo-sepolia.blockscout.com',
    nativeCurrency: {
      name: 'CELO',
      symbol: 'CELO',
      decimals: 18
    }
  },
  CELO: {
    chainId: 42220,
    name: 'Celo',
    rpcUrl: 'https://forno.celo.org',
    explorerUrl: 'https://celoscan.io',
    nativeCurrency: {
      name: 'CELO',
      symbol: 'CELO',
      decimals: 18
    }
  }
} as const;

// Primary KYC Configuration - StealthKYC Only
export const DEFAULT_CONFIG = {
  SCOPE_SEED: 'tcash-stealth-kyc', // Primary stealth KYC scope
  CONFIG_ID: '0x0000000000000000000000000000000000000000000000000000000000000001',
  REQUIRE_OFAC_CHECK: true,
  MINIMUM_AGE: 18,
  ALLOWED_DOCUMENT_TYPES: [1, 2], // E-Passport, EU ID Card
  EXCLUDED_COUNTRIES: [] // Empty for testing
} as const;

export const DOCUMENT_TYPES = {
  E_PASSPORT: 1,
  EU_ID_CARD: 2,
  AADHAAR: 3,
  DRIVERS_LICENSE: 4
} as const;

export const COMPLIANCE_RULES = {
  OFAC_CHECK: true,
  AGE_VERIFICATION: true,
  NATIONALITY_CHECK: true,
  DOCUMENT_TYPE_CHECK: true
} as const;
