// Stealth Swap System Contracts (Base Sepolia Testnet - WORKING)
export const STEALTH_SWAP_POOL = {
  address: '0x8F9Cce60CDa5c3b262c30321f40a180A6A9DA762' as const,
  abi: [
    {
      "inputs": [{"internalType": "address", "name": "tokenIn", "type": "address"}, {"internalType": "address", "name": "tokenOut", "type": "address"}, {"internalType": "uint256", "name": "minOut", "type": "uint256"}, {"internalType": "uint256", "name": "deadline", "type": "uint256"}, {"internalType": "bytes32", "name": "policy", "type": "bytes32"}],
      "name": "createIntent",
      "outputs": [{"internalType": "bytes32", "name": "intentId", "type": "bytes32"}],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [{"internalType": "bytes32", "name": "intentId", "type": "bytes32"}, {"internalType": "uint256", "name": "amount", "type": "uint256"}],
      "name": "contribute",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [{"internalType": "bytes32", "name": "intentId", "type": "bytes32"}, {"internalType": "address", "name": "adapter", "type": "address"}, {"internalType": "bytes", "name": "routerCalldata", "type": "bytes"}, {"internalType": "uint256", "name": "expectedMinOut", "type": "uint256"}],
      "name": "execute",
      "outputs": [{"internalType": "uint256", "name": "amountOut", "type": "uint256"}],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [{"internalType": "bytes32", "name": "intentId", "type": "bytes32"}],
      "name": "getIntent",
      "outputs": [{"components": [{"internalType": "address", "name": "tokenIn", "type": "address"}, {"internalType": "address", "name": "tokenOut", "type": "address"}, {"internalType": "uint256", "name": "minOut", "type": "uint256"}, {"internalType": "uint256", "name": "deadline", "type": "uint256"}, {"internalType": "bytes32", "name": "policy", "type": "bytes32"}, {"internalType": "uint256", "name": "total", "type": "uint256"}], "internalType": "struct IStealthSwapPool.SwapIntent", "name": "intent", "type": "tuple"}],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [{"internalType": "bytes32", "name": "intentId", "type": "bytes32"}, {"internalType": "address", "name": "user", "type": "address"}],
      "name": "contributedOf",
      "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [{"internalType": "bytes32", "name": "intentId", "type": "bytes32"}],
      "name": "getParticipants",
      "outputs": [{"internalType": "address[]", "name": "", "type": "address[]"}],
      "stateMutability": "view",
      "type": "function"
    }
  ] as const
} as const;

export const ONE_INCH_ADAPTER = {
  address: '0xB94ecC5a4cA8D7D2749cE8353F03B38372235C26' as const,
  abi: [
    {
      "inputs": [{"internalType": "address", "name": "tokenIn", "type": "address"}, {"internalType": "address", "name": "tokenOut", "type": "address"}, {"internalType": "uint256", "name": "amountIn", "type": "uint256"}, {"internalType": "uint256", "name": "minAmountOut", "type": "uint256"}, {"internalType": "bytes", "name": "data", "type": "bytes"}],
      "name": "swapViaLOP",
      "outputs": [{"internalType": "uint256", "name": "amountOut", "type": "uint256"}],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "lop",
      "outputs": [{"internalType": "address", "name": "", "type": "address"}],
      "stateMutability": "view",
      "type": "function"
    }
  ] as const
} as const;

export const STEALTH_FACTORY = {
  address: '0x0E37cc3Dc8Fa1675f2748b77dddfF452b63DD4CC' as const,
  abi: [
    {
      "inputs": [{"internalType": "address", "name": "owner", "type": "address"}, {"internalType": "bytes32", "name": "metaSalt", "type": "bytes32"}],
      "name": "createStealth",
      "outputs": [{"internalType": "address", "name": "stealth", "type": "address"}],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [{"internalType": "address", "name": "owner", "type": "address"}, {"internalType": "bytes32", "name": "metaSalt", "type": "bytes32"}],
      "name": "predictStealth",
      "outputs": [{"internalType": "address", "name": "predicted", "type": "address"}],
      "stateMutability": "view",
      "type": "function"
    }
  ] as const
} as const;

export const STEALTH_PAYMASTER = {
  address: '0x0Ff7d4E7aF64059426F76d2236155ef1655C99D8' as const,
  abi: [
    {
      "inputs": [{"internalType": "address", "name": "token", "type": "address"}, {"internalType": "uint256", "name": "amount", "type": "uint256"}],
      "name": "depositForGas",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [{"internalType": "address", "name": "token", "type": "address"}, {"internalType": "uint256", "name": "amount", "type": "uint256"}],
      "name": "withdrawDeposit",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [{"internalType": "address", "name": "user", "type": "address"}, {"internalType": "address", "name": "token", "type": "address"}],
      "name": "getDepositBalance",
      "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
      "stateMutability": "view",
      "type": "function"
    }
  ] as const
} as const;

// 1inch LOP address on Base Sepolia
export const LOP_ADDRESS = '0x111111125421cA6dc452d289314280a0f8842A65' as const;

// Test tokens for Base Sepolia (WORKING)
export const TEST_TOKENS = {
  TEST_TOKEN_A: {
    address: '0x406B2ec53e2e01f9E9D056D98295d0cf61694279' as const,
    symbol: 'TESTA',
    name: 'Test Token A',
    decimals: 18
  },
  TEST_TOKEN_B: {
    address: '0x3f6f22ADd0b6FEDA58DE416EC347d1747a7908b7' as const,
    symbol: 'TESTB',
    name: 'Test Token B',
    decimals: 18
  }
} as const;