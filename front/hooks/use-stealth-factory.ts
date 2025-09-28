import { useState, useCallback } from 'react'
import { useAccount, useWriteContract, useReadContract } from 'wagmi'
import { keccak256, encodePacked, toHex } from 'viem'
import { sepolia } from 'viem/chains'

const STEALTH_FACTORY_ABI = [
  {
    name: 'predictStealth',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'metaSalt', type: 'bytes32' }
    ],
    outputs: [{ name: 'predicted', type: 'address' }]
  },
  {
    name: 'createStealth',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'metaSalt', type: 'bytes32' }
    ],
    outputs: [{ name: 'stealth', type: 'address' }]
  }
] as const

const STEALTH_ACCOUNT_ABI = [
  {
    name: 'exec',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'target', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'data', type: 'bytes' }
    ],
    outputs: [{ name: 'result', type: 'bytes' }]
  },
  {
    name: 'sweep',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'token', type: 'address' },
      { name: 'to', type: 'address' }
    ]
  },
  {
    name: 'destroy',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'to', type: 'address' }]
  }
] as const

// Contract address (update with deployed address)
const STEALTH_FACTORY_ADDRESS = '0x0000000000000000000000000000000000000000' // TODO: Deploy and update

export interface CreateStealthParams {
  owner: string
  metaSalt?: string // Optional, will generate if not provided
}

export interface StealthAccountAction {
  target: string
  value: bigint
  data: string
}

export function useStealthFactory() {
  const { address } = useAccount()
  const { writeContractAsync } = useWriteContract()
  
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generateMetaSalt = useCallback((intentId?: string) => {
    const entropy = intentId || `${Date.now()}-${Math.random()}`
    return keccak256(encodePacked(['string'], [entropy]))
  }, [])

  const predictStealthAddress = useCallback(async (owner: string, metaSalt: string) => {
    try {
      // This would be a view call, but we'll simulate it
      // In practice, you'd use useReadContract for this
      return '0x0000000000000000000000000000000000000000' // Placeholder
    } catch (err) {
      console.error('Failed to predict stealth address:', err)
      return null
    }
  }, [])

  const createStealth = useCallback(async (params: CreateStealthParams) => {
    if (!address) throw new Error('Wallet not connected')
    
    try {
      setIsLoading(true)
      setError(null)

      const metaSalt = params.metaSalt || generateMetaSalt()

      const hash = await writeContractAsync({
        address: STEALTH_FACTORY_ADDRESS,
        abi: STEALTH_FACTORY_ABI,
        functionName: 'createStealth',
        args: [params.owner as `0x${string}`, metaSalt as `0x${string}`],
        chain: sepolia,
      })

      return { success: true, hash, metaSalt }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create stealth account'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setIsLoading(false)
    }
  }, [address, writeContractAsync, generateMetaSalt])

  return {
    createStealth,
    predictStealthAddress,
    generateMetaSalt,
    isLoading,
    error
  }
}

export function usePredictStealth(owner: string | null, metaSalt: string | null) {
  const { data: predicted, isLoading, error } = useReadContract({
    address: STEALTH_FACTORY_ADDRESS,
    abi: STEALTH_FACTORY_ABI,
    functionName: 'predictStealth',
    args: (owner && metaSalt) ? [owner as `0x${string}`, metaSalt as `0x${string}`] : undefined,
    query: {
      enabled: !!(owner && metaSalt)
    }
  })

  return {
    predicted: predicted as string | undefined,
    isLoading,
    error
  }
}

export function useStealthAccount(stealthAddress: string) {
  const { writeContractAsync } = useWriteContract()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const exec = useCallback(async (action: StealthAccountAction) => {
    try {
      setIsLoading(true)
      setError(null)

      const hash = await writeContractAsync({
        address: stealthAddress as `0x${string}`,
        abi: STEALTH_ACCOUNT_ABI,
        functionName: 'exec',
        args: [action.target as `0x${string}`, action.value, action.data as `0x${string}`],
        chain: sepolia,
      })

      return { success: true, hash }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to execute action'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setIsLoading(false)
    }
  }, [stealthAddress, writeContractAsync])

  const sweep = useCallback(async (token: string, to: string) => {
    try {
      setIsLoading(true)
      setError(null)

      const hash = await writeContractAsync({
        address: stealthAddress as `0x${string}`,
        abi: STEALTH_ACCOUNT_ABI,
        functionName: 'sweep',
        args: [token as `0x${string}`, to as `0x${string}`],
        chain: sepolia,
      })

      return { success: true, hash }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to sweep tokens'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setIsLoading(false)
    }
  }, [stealthAddress, writeContractAsync])

  const destroy = useCallback(async (to: string) => {
    try {
      setIsLoading(true)
      setError(null)

      const hash = await writeContractAsync({
        address: stealthAddress as `0x${string}`,
        abi: STEALTH_ACCOUNT_ABI,
        functionName: 'destroy',
        args: [to as `0x${string}`],
        chain: sepolia,
      })

      return { success: true, hash }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to destroy account'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setIsLoading(false)
    }
  }, [stealthAddress, writeContractAsync])

  return {
    exec,
    sweep,
    destroy,
    isLoading,
    error
  }
}

