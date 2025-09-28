'use client'

import { useChainId } from 'wagmi'
import { type Connector } from 'wagmi'

/**
 * Utility functions to safely handle connector operations
 * and prevent errors with missing methods like getChainId
 */

export function useConnectorChainId(connector?: Connector) {
  const chainId = useChainId()
  
  // Always use wagmi's useChainId hook instead of connector.getChainId()
  // This prevents the "getChainId is not a function" error
  return chainId
}

export function safeGetConnectorInfo(connector?: Connector) {
  if (!connector) {
    return {
      name: 'Unknown',
      id: 'unknown',
      ready: false,
    }
  }

  return {
    name: connector.name || 'Unknown',
    id: connector.id || 'unknown',
    ready: connector.ready ?? false,
  }
}

/**
 * Safe wrapper for connector operations that might fail
 */
export async function safeConnectorOperation<T>(
  operation: () => Promise<T>,
  fallback: T,
  errorMessage?: string
): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    console.warn(errorMessage || 'Connector operation failed:', error)
    return fallback
  }
}
