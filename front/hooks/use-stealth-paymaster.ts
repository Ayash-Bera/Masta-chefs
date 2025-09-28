import { useState, useCallback } from 'react'
import { useAccount, useWriteContract, useReadContract } from 'wagmi'
import { parseEther, formatEther, encodePacked } from 'viem'
import { sepolia } from 'viem/chains'

// Contract ABI (minimal)
const STEALTH_PAYMASTER_ABI = [
  {
    name: 'depositForGas',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ]
  },
  {
    name: 'withdrawDeposit',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'amount', type: 'uint256' }
    ]
  },
  {
    name: 'getDepositBalance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'token', type: 'address' }
    ],
    outputs: [{ name: 'balance', type: 'uint256' }]
  },
  {
    name: 'calculateTokenCost',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'gasLimit', type: 'uint256' },
      { name: 'gasPrice', type: 'uint256' }
    ],
    outputs: [{ name: 'tokenCost', type: 'uint256' }]
  },
  {
    name: 'supportedTokens',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'token', type: 'address' }],
    outputs: [{ name: 'supported', type: 'bool' }]
  },
  {
    name: 'tokenToEthRate',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'token', type: 'address' }],
    outputs: [{ name: 'rate', type: 'uint256' }]
  }
] as const

// Contract address (update with deployed address)
const STEALTH_PAYMASTER_ADDRESS = '0x0000000000000000000000000000000000000000' // TODO: Deploy and update

export interface DepositForGasParams {
  token: string
  amount: bigint
}

export interface WithdrawDepositParams {
  token: string
  amount: bigint
}

export interface UserOperation {
  sender: string
  nonce: bigint
  initCode: string
  callData: string
  callGasLimit: bigint
  verificationGasLimit: bigint
  preVerificationGas: bigint
  maxFeePerGas: bigint
  maxPriorityFeePerGas: bigint
  paymasterAndData: string
  signature: string
}

export function useStealthPaymaster() {
  const { address } = useAccount()
  const { writeContractAsync } = useWriteContract()
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const depositForGas = useCallback(async (params: DepositForGasParams) => {
    if (!address) throw new Error('Wallet not connected')
    
    try {
      setIsLoading(true)
      setError(null)

      const hash = await writeContractAsync({
        address: STEALTH_PAYMASTER_ADDRESS,
        abi: STEALTH_PAYMASTER_ABI,
        functionName: 'depositForGas',
        args: [params.token as `0x${string}`, params.amount],
        chain: sepolia,
      })

      return { success: true, hash }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to deposit for gas'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setIsLoading(false)
    }
  }, [address, writeContractAsync])

  const withdrawDeposit = useCallback(async (params: WithdrawDepositParams) => {
    if (!address) throw new Error('Wallet not connected')
    
    try {
      setIsLoading(true)
      setError(null)

      const hash = await writeContractAsync({
        address: STEALTH_PAYMASTER_ADDRESS,
        abi: STEALTH_PAYMASTER_ABI,
        functionName: 'withdrawDeposit',
        args: [params.token as `0x${string}`, params.amount],
        chain: sepolia,
      })

      return { success: true, hash }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to withdraw deposit'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setIsLoading(false)
    }
  }, [address, writeContractAsync])

  const buildPaymasterData = useCallback((token: string, maxTokenAmount: bigint) => {
    // Format: [paymaster_address][token_address][max_token_amount]
    return encodePacked(
      ['address', 'address', 'uint256'],
      [STEALTH_PAYMASTER_ADDRESS as `0x${string}`, token as `0x${string}`, maxTokenAmount]
    )
  }, [])

  const estimateGasCost = useCallback(async (
    token: string,
    gasLimit: bigint,
    gasPrice: bigint
  ): Promise<bigint | null> => {
    try {
      // This would be a read contract call
      // For now, we'll calculate manually
      const ethCost = gasLimit * gasPrice
      // Need to get token rate from contract
      // Placeholder calculation: assume 1 token = 0.001 ETH
      const tokenRate = parseEther('0.001')
      return (ethCost * parseEther('1')) / tokenRate
    } catch (err) {
      console.error('Failed to estimate gas cost:', err)
      return null
    }
  }, [])

  return {
    depositForGas,
    withdrawDeposit,
    buildPaymasterData,
    estimateGasCost,
    isLoading,
    error
  }
}

export function usePaymasterBalance(token: string | null) {
  const { address } = useAccount()
  
  const { data: balance, isLoading, error, refetch } = useReadContract({
    address: STEALTH_PAYMASTER_ADDRESS,
    abi: STEALTH_PAYMASTER_ABI,
    functionName: 'getDepositBalance',
    args: (address && token) ? [address as `0x${string}`, token as `0x${string}`] : undefined,
    query: {
      enabled: !!(address && token)
    }
  })

  return {
    balance: balance as bigint | undefined,
    isLoading,
    error,
    refetch
  }
}

export function useTokenSupport(token: string | null) {
  const { data: isSupported, isLoading, error } = useReadContract({
    address: STEALTH_PAYMASTER_ADDRESS,
    abi: STEALTH_PAYMASTER_ABI,
    functionName: 'supportedTokens',
    args: token ? [token as `0x${string}`] : undefined,
    query: {
      enabled: !!token
    }
  })

  return {
    isSupported: isSupported as boolean | undefined,
    isLoading,
    error
  }
}

export function useTokenRate(token: string | null) {
  const { data: rate, isLoading, error } = useReadContract({
    address: STEALTH_PAYMASTER_ADDRESS,
    abi: STEALTH_PAYMASTER_ABI,
    functionName: 'tokenToEthRate',
    args: token ? [token as `0x${string}`] : undefined,
    query: {
      enabled: !!token
    }
  })

  return {
    rate: rate as bigint | undefined,
    isLoading,
    error
  }
}

export function useGasCostCalculator() {
  const calculateGasCost = useCallback(async (
    token: string,
    gasLimit: bigint,
    gasPrice: bigint
  ): Promise<bigint | null> => {
    try {
      // This would call the contract's calculateTokenCost function
      // For now, placeholder implementation
      const ethCost = gasLimit * gasPrice
      // Assume 1 token = 0.001 ETH for demo
      const tokenRate = parseEther('0.001')
      return (ethCost * parseEther('1')) / tokenRate
    } catch (err) {
      console.error('Failed to calculate gas cost:', err)
      return null
    }
  }, [])

  return { calculateGasCost }
}

