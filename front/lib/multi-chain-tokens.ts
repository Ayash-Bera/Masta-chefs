// Multi-chain token configuration for fhERC and stealth swap system
import { baseSepolia, sepolia } from 'viem/chains'

export type TokenConfig = {
  address: `0x${string}`
  symbol: string
  name: string
  decimals: number
  isNative: boolean
  isEncrypted: boolean
  chainId: number
  logoUrl?: string
}

// Base Sepolia tokens (for stealth swap testing)
export const BASE_SEPOLIA_TOKENS: TokenConfig[] = [
  {
    address: '0x0000000000000000000000000000000000000000',
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    isNative: true,
    isEncrypted: false,
    chainId: baseSepolia.id,
  },
  {
    address: '0x18067cb5A4830feEdF7ACdD3dF8d0d084442D3fD',
    symbol: 'TESTA',
    name: 'Test Token A',
    decimals: 18,
    isNative: false,
    isEncrypted: false,
    chainId: baseSepolia.id,
  },
  {
    address: '0x50989e0C3464C66ae48CF272e972aeeAB9eb05BB',
    symbol: 'TESTB',
    name: 'Test Token B',
    decimals: 18,
    isNative: false,
    isEncrypted: false,
    chainId: baseSepolia.id,
  },
  // Encrypted versions for stealth swaps
  {
    address: '0x0000000000000000000000000000000000000000',
    symbol: 'eETH',
    name: 'Encrypted Ethereum',
    decimals: 18,
    isNative: true,
    isEncrypted: true,
    chainId: baseSepolia.id,
  },
  {
    address: '0x18067cb5A4830feEdF7ACdD3dF8d0d084442D3fD',
    symbol: 'eTESTA',
    name: 'Encrypted Test Token A',
    decimals: 18,
    isNative: false,
    isEncrypted: true,
    chainId: baseSepolia.id,
  },
  {
    address: '0x50989e0C3464C66ae48CF272e972aeeAB9eb05BB',
    symbol: 'eTESTB',
    name: 'Encrypted Test Token B',
    decimals: 18,
    isNative: false,
    isEncrypted: true,
    chainId: baseSepolia.id,
  },
]

// Ethereum Sepolia tokens (existing fhERC system)
export const SEPOLIA_TOKENS: TokenConfig[] = [
  {
    address: '0x0000000000000000000000000000000000000000',
    symbol: 'ETH',
    name: 'Ethereum',
    decimals: 18,
    isNative: true,
    isEncrypted: false,
    chainId: sepolia.id,
  },
  {
    address: '0xd7f834eF5d3A089e3Ec3A9E08EA035926D6A0bA1',
    symbol: 'TEST',
    name: 'Test Token',
    decimals: 18,
    isNative: false,
    isEncrypted: false,
    chainId: sepolia.id,
  },
  // Encrypted versions for fhERC
  {
    address: '0x0000000000000000000000000000000000000000',
    symbol: 'eETH',
    name: 'Encrypted Ethereum',
    decimals: 18,
    isNative: true,
    isEncrypted: true,
    chainId: sepolia.id,
  },
  {
    address: '0xd7f834eF5d3A089e3Ec3A9E08EA035926D6A0bA1',
    symbol: 'eTEST',
    name: 'Encrypted Test Token',
    decimals: 18,
    isNative: false,
    isEncrypted: true,
    chainId: sepolia.id,
  },
]

// Common tokens that work on both chains
export const COMMON_TOKENS: TokenConfig[] = [
  // USDC (if available on both chains)
  {
    address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base Sepolia USDC
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    isNative: false,
    isEncrypted: false,
    chainId: baseSepolia.id,
  },
  {
    address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238', // Sepolia USDC
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    isNative: false,
    isEncrypted: false,
    chainId: sepolia.id,
  },
  // Encrypted USDC
  {
    address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    symbol: 'eUSDC',
    name: 'Encrypted USD Coin',
    decimals: 6,
    isNative: false,
    isEncrypted: true,
    chainId: baseSepolia.id,
  },
  {
    address: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    symbol: 'eUSDC',
    name: 'Encrypted USD Coin',
    decimals: 6,
    isNative: false,
    isEncrypted: true,
    chainId: sepolia.id,
  },
]

// Get tokens for a specific chain
export function getTokensForChain(chainId: number): TokenConfig[] {
  const allTokens = [...BASE_SEPOLIA_TOKENS, ...SEPOLIA_TOKENS, ...COMMON_TOKENS]
  return allTokens.filter(token => token.chainId === chainId)
}

// Get encrypted tokens for a specific chain
export function getEncryptedTokensForChain(chainId: number): TokenConfig[] {
  return getTokensForChain(chainId).filter(token => token.isEncrypted)
}

// Get native tokens for a specific chain
export function getNativeTokensForChain(chainId: number): TokenConfig[] {
  return getTokensForChain(chainId).filter(token => token.isNative)
}

// Get regular (non-encrypted) tokens for a specific chain
export function getRegularTokensForChain(chainId: number): TokenConfig[] {
  return getTokensForChain(chainId).filter(token => !token.isEncrypted)
}

// Find token by address and chain
export function findTokenByAddress(address: string, chainId: number): TokenConfig | undefined {
  return getTokensForChain(chainId).find(token => 
    token.address.toLowerCase() === address.toLowerCase()
  )
}

// Get token display name (with 'e' prefix for encrypted)
export function getTokenDisplayName(token: TokenConfig): string {
  return token.isEncrypted ? `e${token.symbol}` : token.symbol
}

// Check if token is supported for stealth swaps
export function isTokenSupportedForStealthSwap(token: TokenConfig): boolean {
  // All tokens are supported for stealth swaps
  return true
}

// Get token balance display text
export function getTokenBalanceText(token: TokenConfig, balance: string): string {
  const displayName = getTokenDisplayName(token)
  return `Balance: ${balance} ${displayName}`
}

// Chain configuration
export const CHAIN_CONFIGS = {
  [baseSepolia.id]: {
    name: 'Base Sepolia',
    shortName: 'Base Sepolia',
    rpcUrl: 'https://sepolia.base.org',
    explorerUrl: 'https://sepolia.basescan.org',
    nativeCurrency: {
      name: 'ETH',
      symbol: 'ETH',
      decimals: 18
    }
  },
  [sepolia.id]: {
    name: 'Ethereum Sepolia',
    shortName: 'Sepolia',
    rpcUrl: 'https://sepolia.infura.io/v3/',
    explorerUrl: 'https://sepolia.etherscan.io',
    nativeCurrency: {
      name: 'ETH',
      symbol: 'ETH',
      decimals: 18
    }
  }
} as const

// Get chain config by ID
export function getChainConfig(chainId: number) {
  return CHAIN_CONFIGS[chainId as keyof typeof CHAIN_CONFIGS]
}
