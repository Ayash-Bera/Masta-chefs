// SPDX-License-Identifier: MIT
export const CONTRACT_ADDRESSES = {
  SHIELDED_VAULT: {
    ALFAJORES: '0x...', // To be deployed
    CELO: '0x...' // To be deployed
  },
  PRIVACY_ROUTER: {
    ALFAJORES: '0x...', // To be deployed
    CELO: '0x...' // To be deployed
  }
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

