"use client"

import React from 'react'
import { useAccount, useReadContract, useChainId } from 'wagmi'
import { createPublicClient, http } from 'viem'
import { sepolia, baseSepolia } from 'wagmi/chains'
import { EERC_CONTRACT } from '../lib/contracts'
import { TEST_TOKENS } from '../lib/stealth-contracts'

export type DiscoveredToken = {
  address: `0x${string}`
  symbol: string
  decimals: number
  isNative: boolean
  isEncrypted?: boolean
}

const NATIVE_ZERO_ADDRESS = '0x0000000000000000000000000000000000000000' as const

export function useTokens() {
  const { address: user } = useAccount()
  const chainId = useChainId()

  // Determine which chain we're on
  const isBaseSepolia = chainId === baseSepolia.id
  const isSepolia = chainId === sepolia.id

  const { data: tokenAddresses, isLoading, error } = useReadContract({
    address: EERC_CONTRACT.address,
    abi: EERC_CONTRACT.abi,
    functionName: 'getTokens',
    chainId: isBaseSepolia ? baseSepolia.id : sepolia.id,
    query: { enabled: true },
  })

  const [tokens, setTokens] = React.useState<DiscoveredToken[]>([])
  const [metaLoading, setMetaLoading] = React.useState(false)
  const [metaError, setMetaError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const load = async () => {
      try {
        setMetaLoading(true)
        setMetaError(null)
        
        const discovered: DiscoveredToken[] = []

        // Add native token
        discovered.push({ 
          address: NATIVE_ZERO_ADDRESS, 
          symbol: 'ETH', 
          decimals: 18, 
          isNative: true,
          isEncrypted: true
        })

        // For Base Sepolia, add test tokens
        if (isBaseSepolia) {
          discovered.push({
            address: TEST_TOKENS.TEST_TOKEN_A.address,
            symbol: TEST_TOKENS.TEST_TOKEN_A.symbol,
            decimals: TEST_TOKENS.TEST_TOKEN_A.decimals,
            isNative: false,
            isEncrypted: true
          })
          discovered.push({
            address: TEST_TOKENS.TEST_TOKEN_B.address,
            symbol: TEST_TOKENS.TEST_TOKEN_B.symbol,
            decimals: TEST_TOKENS.TEST_TOKEN_B.decimals,
            isNative: false,
            isEncrypted: true
          })
        }

        // For Sepolia, load from fhERC contract
        if (isSepolia) {
          const list = (tokenAddresses as `0x${string}`[] | undefined) ?? []
          const client = createPublicClient({ chain: sepolia, transport: http() })

          for (const addr of list) {
            try {
              const [symbol, decimals] = await Promise.all([
                client.readContract({
                  address: addr,
                  abi: [
                    { inputs: [], name: 'symbol', outputs: [{ name: '', type: 'string' }], stateMutability: 'view', type: 'function' },
                  ] as const,
                  functionName: 'symbol',
                }) as Promise<string>,
                client.readContract({
                  address: addr,
                  abi: [
                    { inputs: [], name: 'decimals', outputs: [{ name: '', type: 'uint8' }], stateMutability: 'view', type: 'function' },
                  ] as const,
                  functionName: 'decimals',
                }) as Promise<number>,
              ])
              discovered.push({ 
                address: addr, 
                symbol: `e${symbol}`, 
                decimals, 
                isNative: false,
                isEncrypted: true
              })
            } catch (e) {
              // fallback if metadata fails
              discovered.push({ 
                address: addr, 
                symbol: 'eTOKEN', 
                decimals: 18, 
                isNative: false,
                isEncrypted: true
              })
            }
          }
        }

        setTokens(discovered)
      } catch (e: any) {
        setMetaError(e?.message ?? 'Failed to load token metadata')
      } finally {
        setMetaLoading(false)
      }
    }

    load()
  }, [tokenAddresses, isBaseSepolia, isSepolia])

  return {
    tokens,
    isLoading: isLoading || metaLoading,
    error: (error as any)?.message || metaError,
  }
}


