"use client"
import { Shield } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import { useAccount, useChainId, useConnect, useDisconnect } from 'wagmi'
import { injected } from 'wagmi/connectors'
import { toast } from 'sonner'
import { useEffect, useState } from 'react'

export default function Navbar() {
  const router = useRouter()
  const pathname = usePathname()
  const { address } = useAccount()
  const chainId = useChainId()
  const { connect } = useConnect()
  const { disconnect } = useDisconnect()
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => setMounted(true), [])

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4">
      <div className="max-w-7xl mx-auto">
        <div
          className="backdrop-blur-3xl backdrop-saturate-200 border border-white/15 rounded-2xl px-6 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_16px_56px_rgba(0,0,0,0.35)]"
          style={{ background: "rgba(17,17,17,0.35)" }}
        >
          <div className="flex items-center justify-between text-white">
            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-3 text-white/80 hover:text-white transition-colors"
            >
              <Shield className="w-6 h-6" />
              <span className="font-bold text-xl tracking-wide">tZunami</span>
            </button>
            <div className="flex items-center gap-6">
              {pathname !== '/' && (
                <div className="hidden md:flex items-center gap-3 text-sm">
                  <button onClick={() => router.push('/dashboard')} className="px-3 py-2 rounded-md border border-white/15 bg-white/5 hover:bg-white/10 text-white/90">Dashboard</button>
                  <button onClick={() => router.push('/deposit')} className="px-3 py-2 rounded-md border border-white/15 bg-white/5 hover:bg-white/10 text-white/90">Deposit</button>
                  <button onClick={() => router.push('/transfer')} className="px-3 py-2 rounded-md border border-white/15 bg-white/5 hover:bg-white/10 text-white/90">Transfer</button>
                  <button onClick={() => router.push('/swap')} className="px-3 py-2 rounded-md border border-white/15 bg-white/5 hover:bg-white/10 text-white/90">Swap</button>
                  <button onClick={() => router.push('/withdraw')} className="px-3 py-2 rounded-md border border-white/15 bg-white/5 hover:bg-white/10 text-white/90">Withdraw</button>
                  <button onClick={() => router.push('/onboarding')} className="px-3 py-2 rounded-md border border-white/15 bg-white/5 hover:bg-white/10 text-white/90">Onboarding</button>
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
