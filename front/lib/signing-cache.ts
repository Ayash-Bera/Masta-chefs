'use client'

import { type UseSignMessageReturnType } from 'wagmi'
import { i0 } from './crypto-utils'

// In-memory cache for the current session
const privKeyCache = new Map<string, bigint>()
const inFlight = new Map<string, Promise<bigint>>()

function regMessage(address: string) {
  return `eERC\nRegistering user with\n Address:${address.toLowerCase()}`
}

export async function getDerivedPrivateKey(
  address: string,
  signMessageAsync: UseSignMessageReturnType['signMessageAsync']
): Promise<bigint> {
  if (!address) throw new Error('Address required')

  const cached = privKeyCache.get(address)
  if (cached) return cached

  const existing = inFlight.get(address)
  if (existing) return existing

  const p = (async () => {
    const signature = await signMessageAsync({ message: regMessage(address) })
    const sk = i0(signature)
    privKeyCache.set(address, sk)
    inFlight.delete(address)
    try {
      // Persist for page reloads in this tab
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(`eerc:pk:${address.toLowerCase()}`,(sk as unknown as string))
      }
    } catch {}
    return sk
  })()

  inFlight.set(address, p)
  return p
}

export function getCachedPrivateKey(address: string): bigint | null {
  const v = privKeyCache.get(address)
  if (v) return v
  try {
    if (typeof window !== 'undefined') {
      const raw = sessionStorage.getItem(`eerc:pk:${address.toLowerCase()}`)
      if (raw) {
        // We stored as string via type-cast; parse back to bigint safely
        // Accept both decimal and hex-like strings
        const parsed = BigInt(raw)
        privKeyCache.set(address, parsed)
        return parsed
      }
    }
  } catch {}
  return null
}
