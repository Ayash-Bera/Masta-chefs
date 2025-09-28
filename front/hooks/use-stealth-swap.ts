import { useState, useCallback } from 'react'
import { useAccount, useWriteContract, useReadContract } from 'wagmi'
import { parseEther, formatEther, keccak256, toHex, encodePacked } from 'viem'
import { sepolia } from 'viem/chains'

// Contract ABIs (minimal)
const STEALTH_SWAP_POOL_ABI = [
  {
    name: 'createIntent',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'tokenIn', type: 'address' },
      { name: 'tokenOut', type: 'address' },
      { name: 'minOut', type: 'uint256' },
      { name: 'deadline', type: 'uint256' },
      { name: 'policy', type: 'bytes32' }
    ],
    outputs: [{ name: 'intentId', type: 'bytes32' }]
  },
  {
    name: 'contribute',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'intentId', type: 'bytes32' },
      { name: 'amount', type: 'uint256' }
    ]
  },
  {
    name: 'execute',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'intentId', type: 'bytes32' },
      { name: 'adapter', type: 'address' },
      { name: 'routerCalldata', type: 'bytes' },
      { name: 'expectedMinOut', type: 'uint256' }
    ],
    outputs: [{ name: 'amountOut', type: 'uint256' }]
  },
  {
    name: 'getIntent',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'intentId', type: 'bytes32' }],
    outputs: [{
      name: 'intent',
      type: 'tuple',
      components: [
        { name: 'tokenIn', type: 'address' },
        { name: 'tokenOut', type: 'address' },
        { name: 'minOut', type: 'uint256' },
        { name: 'deadline', type: 'uint256' },
        { name: 'policy', type: 'bytes32' },
        { name: 'total', type: 'uint256' }
      ]
    }]
  },
  {
    name: 'contributedOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'intentId', type: 'bytes32' },
      { name: 'user', type: 'address' }
    ],
    outputs: [{ name: 'amount', type: 'uint256' }]
  }
] as const

// Contract addresses (update with deployed addresses)
const STEALTH_SWAP_POOL_ADDRESS = '0x0000000000000000000000000000000000000000' // TODO: Deploy and update
const ONEINCH_ADAPTER_ADDRESS = '0x0000000000000000000000000000000000000000' // TODO: Deploy and update

export interface SwapIntent {
  tokenIn: string
  tokenOut: string
  minOut: bigint
  deadline: bigint
  policy: string
  total: bigint
}

export interface CreateIntentParams {
  tokenIn: string
  tokenOut: string
  minOut: bigint
  deadline: number // seconds from now
  slippageBps?: number // basis points, default 50 (0.5%)
}

export interface ContributeParams {
  intentId: string
  amount: bigint
}

export interface ExecuteParams {
  intentId: string
  routerCalldata: string // 1inch aggregator calldata
  expectedMinOut: bigint
}

export function useStealthSwap() {
  const { address } = useAccount()
  const { writeContractAsync } = useWriteContract()
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const createIntent = useCallback(async (params: CreateIntentParams) => {
    if (!address) throw new Error('Wallet not connected')
    
    try {
      setIsLoading(true)
      setError(null)

      const deadline = BigInt(Math.floor(Date.now() / 1000) + params.deadline)
      const slippageBps = params.slippageBps || 50
      
      // Create policy hash (simple version - could be more complex)
      const policyData = encodePacked(
        ['uint256', 'address'],
        [BigInt(slippageBps), ONEINCH_ADAPTER_ADDRESS]
      )
      const policy = keccak256(policyData)

      const hash = await writeContractAsync({
        address: STEALTH_SWAP_POOL_ADDRESS,
        abi: STEALTH_SWAP_POOL_ABI,
        functionName: 'createIntent',
        args: [params.tokenIn as `0x${string}`, params.tokenOut as `0x${string}`, params.minOut, deadline, policy],
        chain: sepolia,
      })

      return { success: true, hash, intentId: null } // TODO: Parse intentId from logs
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create intent'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setIsLoading(false)
    }
  }, [address, writeContractAsync])

  const contribute = useCallback(async (params: ContributeParams) => {
    if (!address) throw new Error('Wallet not connected')
    
    try {
      setIsLoading(true)
      setError(null)

      const hash = await writeContractAsync({
        address: STEALTH_SWAP_POOL_ADDRESS,
        abi: STEALTH_SWAP_POOL_ABI,
        functionName: 'contribute',
        args: [params.intentId as `0x${string}`, params.amount],
        chain: sepolia,
      })

      return { success: true, hash }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to contribute'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setIsLoading(false)
    }
  }, [address, writeContractAsync])

  const execute = useCallback(async (params: ExecuteParams) => {
    if (!address) throw new Error('Wallet not connected')
    
    try {
      setIsLoading(true)
      setError(null)

      const hash = await writeContractAsync({
        address: STEALTH_SWAP_POOL_ADDRESS,
        abi: STEALTH_SWAP_POOL_ABI,
        functionName: 'execute',
        args: [
          params.intentId as `0x${string}`,
          ONEINCH_ADAPTER_ADDRESS,
          params.routerCalldata as `0x${string}`,
          params.expectedMinOut
        ],
        chain: sepolia,
      })

      return { success: true, hash }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to execute swap'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setIsLoading(false)
    }
  }, [address, writeContractAsync])

  return {
    createIntent,
    contribute,
    execute,
    isLoading,
    error
  }
}

export function useSwapIntent(intentId: string | null) {
  const { data: intent, isLoading, error, refetch } = useReadContract({
    address: STEALTH_SWAP_POOL_ADDRESS,
    abi: STEALTH_SWAP_POOL_ABI,
    functionName: 'getIntent',
    args: intentId ? [intentId as `0x${string}`] : undefined,
    query: {
      enabled: !!intentId
    }
  })

  return {
    intent: intent as SwapIntent | undefined,
    isLoading,
    error,
    refetch
  }
}

export function useUserContribution(intentId: string | null, userAddress: string | null) {
  const { data: contribution, isLoading, error, refetch } = useReadContract({
    address: STEALTH_SWAP_POOL_ADDRESS,
    abi: STEALTH_SWAP_POOL_ABI,
    functionName: 'contributedOf',
    args: (intentId && userAddress) ? [intentId as `0x${string}`, userAddress as `0x${string}`] : undefined,
    query: {
      enabled: !!(intentId && userAddress)
    }
  })

  return {
    contribution: contribution as bigint | undefined,
    isLoading,
    error,
    refetch
  }
}

