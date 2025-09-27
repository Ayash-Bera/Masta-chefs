// SPDX-License-Identifier: MIT
// PriceOracle contract interface and integration for frontend

export const PRICE_ORACLE_ADDRESS = "0xCeF6eB83660984Fa23619B9Ac2066B0aA0A02C08";

export const PRICE_ORACLE_ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_pythContract",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "ETH_USD_FEED_ID",
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
    "name": "BTC_USD_FEED_ID",
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
    "name": "getEthUsdPrice",
    "outputs": [
      {
        "internalType": "int64",
        "name": "price",
        "type": "int64"
      },
      {
        "internalType": "uint64",
        "name": "confidence",
        "type": "uint64"
      },
      {
        "internalType": "int32",
        "name": "exponent",
        "type": "int32"
      },
      {
        "internalType": "uint256",
        "name": "publishTime",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getHumanReadableEthUsdPrice",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "humanPrice",
        "type": "uint256"
      },
      {
        "internalType": "uint64",
        "name": "confidence",
        "type": "uint64"
      },
      {
        "internalType": "uint256",
        "name": "publishTime",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getBtcUsdPrice",
    "outputs": [
      {
        "internalType": "int64",
        "name": "price",
        "type": "int64"
      },
      {
        "internalType": "uint64",
        "name": "confidence",
        "type": "uint64"
      },
      {
        "internalType": "int32",
        "name": "exponent",
        "type": "int32"
      },
      {
        "internalType": "uint256",
        "name": "publishTime",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getPythContract",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

export interface PriceData {
  price: number;
  confidence: bigint;
  publishTime: number;
  isStale: boolean;
  lastUpdated: string;
}

// Network configurations
export const SUPPORTED_NETWORKS = {
  SEPOLIA: {
    chainId: 11155111,
    name: 'Ethereum Sepolia',
    oracleAddress: PRICE_ORACLE_ADDRESS
  }
} as const;