// Base Sepolia Testnet Contract Addresses (Real 1inch LOP integration)
export const BASE_SEPOLIA_STEALTH_SWAP_POOL = {
  address: '0x0e4d945f84cbb445aB0a96974Ef01EbB63343f71' as const,
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

export const BASE_SEPOLIA_ONE_INCH_ADAPTER = {
  address: '0x66cAbbc261AFb45C728CcCCC6e592935d3Ba83ef' as const,
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

export const BASE_SEPOLIA_STEALTH_FACTORY = {
  address: '0xeD539fD12EB44692A935fDA55e24C861639eD074' as const,
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

export const BASE_SEPOLIA_STEALTH_PAYMASTER = {
  address: '0x3168D014cD515c0b6E857618680A652E920eFBc7' as const,
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

// Test tokens for Base Sepolia
export const BASE_SEPOLIA_TEST_TOKENS = {
  TEST_TOKEN_A: {
    address: '0x18067cb5A4830feEdF7ACdD3dF8d0d084442D3fD' as const,
    symbol: 'TESTA',
    name: 'Test Token A',
    decimals: 18
  },
  TEST_TOKEN_B: {
    address: '0x50989e0C3464C66ae48CF272e972aeeAB9eb05BB' as const,
    symbol: 'TESTB', 
    name: 'Test Token B',
    decimals: 18
  }
} as const;

// 1inch LOP address on Base Sepolia
export const BASE_SEPOLIA_LOP_ADDRESS = '0x111111125421cA6dc452d289314280a0f8842A65' as const;
