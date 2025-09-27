'use client'

import { useAccount, useChainId } from 'wagmi'
import { useEffect, useState } from 'react'
import { sepolia } from 'wagmi/chains'

/**
 * Safe wagmi hook that prevents connector-related errors
 * and provides fallback values for common operations
 */
export function useSafeWagmi() {
  const [mounted, setMounted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Safely get account info
  const accountResult = (() => {
    try {
      return useAccount()
    } catch (err) {
      console.warn('useAccount error:', err)
      setError('Failed to get account information')
      return {
        address: undefined,
        isConnected: false,
        connector: undefined,
        isConnecting: false,
        isDisconnected: true,
        isReconnecting: false,
        status: 'disconnected' as const
      }
    }
  })()

  // Safely get chain ID
  const chainIdResult = (() => {
    try {
      return useChainId()
    } catch (err) {
      console.warn('useChainId error:', err)
      setError('Failed to get chain ID')
      return sepolia.id // fallback to sepolia
    }
  })()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Don't render until mounted to prevent hydration issues
  if (!mounted) {
    return {
      address: undefined,
      isConnected: false,
      connector: undefined,
      chainId: sepolia.id,
      isCorrectChain: false,
      isLoading: true,
      error: null,
      connectorInfo: {
        name: 'Loading...',
        id: 'loading',
        ready: false
      }
    }
  }

  const { address, isConnected, connector } = accountResult
  const chainId = chainIdResult
  const isCorrectChain = chainId === sepolia.id

  // Safe connector info
  const connectorInfo = {
    name: connector?.name || 'Unknown',
    id: connector?.id || 'unknown',
    ready: connector?.ready ?? false
  }

  return {
    address,
    isConnected,
    connector,
    chainId,
    isCorrectChain,
    isLoading: false,
    error,
    connectorInfo
  }
}

/**
 * Hook to safely check if we're on the correct network
 */
export function useSafeNetworkCheck() {
  const { chainId, isCorrectChain, error } = useSafeWagmi()
  
  return {
    chainId,
    isCorrectChain,
    targetChainId: sepolia.id,
    networkError: error,
    needsNetworkSwitch: !isCorrectChain && !error
  }
}
