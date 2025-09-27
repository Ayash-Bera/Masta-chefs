"use client"

import { Shield } from "lucide-react"
import { usePathname } from "next/navigation"
import { useAccount, useConnect, useDisconnect, useSignMessage } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { toast } from 'sonner'
import { useEffect, useState } from 'react'
import { useInstantNavigation } from "@/hooks/use-instant-navigation"
import { getCachedPrivateKey, getDerivedPrivateKey } from '@/lib/signing-cache'

export default function Navbar() {
  const pathname = usePathname()
  const { address } = useAccount()
  const { connect } = useConnect()
  const { disconnect } = useDisconnect()
  const { signMessageAsync } = useSignMessage()
  const [mounted, setMounted] = useState(false)
  const { navigate, replace, prefetch } = useInstantNavigation()
  
  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (mounted && !address && pathname !== '/') {
      replace('/')
    }
  }, [mounted, address, pathname, replace])

  // One-time unlock: after wallet connects on first page load, trigger a single signature
  useEffect(() => {
    const run = async () => {
      if (!address) return
      try {
        const cached = getCachedPrivateKey(address)
        if (!cached) {
          await getDerivedPrivateKey(address, signMessageAsync)
          // Optional UX: toast to indicate successful unlock
          // toast("Decryption unlocked for this session")
        }
      } catch (e) {
        // silent; user may cancel
      }
    }
    run()
  }, [address, signMessageAsync])

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4">
      <div className="max-w-7xl mx-auto">
        <div
          className="backdrop-blur-3xl backdrop-saturate-200 border border-white/15 rounded-2xl px-6 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_16px_56px_rgba(0,0,0,0.35)]"
          style={{ background: "rgba(17,17,17,0.35)" }}
        >
          <div className="flex items-center justify-between text-white">
            <button
              onPointerEnter={() => prefetch('/')}
              onClick={() => navigate("/")}
              className="flex items-center gap-3 text-white/80 hover:text-white transition-colors"
            >
              <Shield className="w-6 h-6" />
              <span className="font-bold text-xl tracking-wide">tZunami</span>
            </button>
            <div className="flex items-center gap-6">
              {pathname !== '/' && (
                <div className="hidden md:flex items-center gap-5 text-sm">
                  <button
                    onPointerEnter={() => prefetch('/dashboard')}
                    onClick={() => navigate('/dashboard')}
                    className="text-white/75 hover:text-white transition-colors"
                  >
                    Dashboard
                  </button>
                  <button
                    onPointerEnter={() => prefetch('/deposit')}
                    onClick={() => navigate('/deposit')}
                    className="text-white/75 hover:text-white transition-colors"
                  >
                    Deposit
                  </button>
                  <button
                    onPointerEnter={() => prefetch('/swap')}
                    onClick={() => navigate('/swap')}
                    className="text-white/75 hover:text-white transition-colors"
                  >
                    Swap
                  </button>
                  <button
                    onPointerEnter={() => prefetch('/withdraw')}
                    onClick={() => navigate('/withdraw')}
                    className="text-white/75 hover:text-white transition-colors"
                  >
                    Withdraw
                  </button>
                  <button
                    onPointerEnter={() => prefetch('/onboarding')}
                    onClick={() => navigate('/onboarding')}
                    className="text-white/75 hover:text-white transition-colors"
                  >
                    Onboarding
                  </button>
                  <button
                    onPointerEnter={() => prefetch('/transfer')}
                    onClick={() => navigate('/transfer')}
                    className="text-white/75 hover:text-white transition-colors"
                  >
                    Transfer
                  </button>
                  
                </div>
                
              )}
              <div className="flex items-center gap-3">
                <button
                  onClick={async () => {
                    if (address) {
                      await disconnect()
                      toast("Disconnected")
                    } else {
                      try {
                        await connect({ connector: injected() })
                        toast("Wallet connected")
                      } catch (e) {
                        toast.error("Failed to connect")
                      }
                    }
                  }}
                  className="text-sm font-medium text-white/80 hover:text-white transition-colors"
                >
                  {mounted && address ? `${address.slice(0,6)}...${address.slice(-4)}` : 'Connect'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
