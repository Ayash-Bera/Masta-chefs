"use client"
import {
  Shield,
  ArrowUpRight,
  DollarSign,
  Coins,
  CheckCircle2,
  AlertTriangle,
  Wallet,
  ArrowLeftRight,
} from "lucide-react"
import type React from "react"

import { useMemo, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useEncryptedBalance } from "@/hooks/use-encrypted-balance"
import { useTokens } from "@/hooks/use-tokens"
import { useAccount } from "wagmi"
import { usePriceOracle } from "../hooks/use-price-oracle"

type TokenRow = {
  symbol: string
  balance: number
  usd: number
  icon?: React.ComponentType<{ className?: string }>
}

export default function TsunamiDashboard() {
  const router = useRouter()
  const [showBalances, setShowBalances] = useState(true)
  const [hasZkAttestation, setHasZkAttestation] = useState<boolean>(true)
  const { address } = useAccount()
  const [mounted, setMounted] = useState(false)
  
  // Real-time price oracle for ETH/USD conversion
  const { 
    ethPrice, 
    isLoading: isPriceLoading, 
    error: priceError,
    isOnSepolia,
    formattedPrice,
    isPriceStale
  } = usePriceOracle()
  
  useEffect(() => setMounted(true), [])

  // Token discovery and per-token balance
  const { tokens: discoveredTokens } = useTokens()
  const [selectedTokenAddress, setSelectedTokenAddress] = useState<`0x${string}` | null>(null)
  const selectedMeta = useMemo(() => (discoveredTokens || [])[0] && (discoveredTokens || []).find(t => t.address === (selectedTokenAddress as any)) || (discoveredTokens || [])[0], [discoveredTokens, selectedTokenAddress])
  const selectedDecimals = selectedMeta?.decimals ?? 18
  const selectedSymbol = selectedMeta ? (selectedMeta.isNative ? 'eETH' : `e${selectedMeta.symbol}`) : 'eTOKEN'
  const { decryptedBalance, isLoading } = useEncryptedBalance(selectedMeta?.address as any, selectedDecimals)
  const decryptedBalanceNum = useMemo(() => Number(decryptedBalance || 0), [decryptedBalance])
  const tokens: TokenRow[] = useMemo(() => selectedMeta ? [
    { 
      symbol: selectedSymbol, 
      balance: decryptedBalanceNum, 
      usd: decryptedBalanceNum * (selectedMeta.isNative ? ethPrice : 1), 
      icon: DollarSign 
    },
  ] : [], [selectedMeta, decryptedBalanceNum, selectedSymbol, ethPrice])

  const totalUsd = useMemo(() => tokens.reduce((sum, t) => sum + t.usd, 0), [tokens])

  // util
  const obfuscate = (addr?: string) => addr && addr.startsWith("0x") && addr.length > 6 ? `${addr.slice(0,6)}…${addr.slice(-4)}` : "0x…"

  const goDeposit = () => router.push("/deposit")
  const goSwap = (prefill?: { from?: string; to?: string }) => {
    const params = new URLSearchParams()
    if (prefill?.from) params.set("from", prefill.from)
    if (prefill?.to) params.set("to", prefill.to)
    router.push(`/swap${params.toString() ? `?${params.toString()}` : ""}`)
  }
  const goWithdraw = () => router.push("/withdraw")

  // Analytics: removed (no simulations)

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex flex-col font-sans">
      {/* Liquid Ether background removed */}

      {/* Header / Identity */}
      <header className="sticky top-20 z-30 mt-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4">
          <div
            className="backdrop-blur-3xl backdrop-saturate-200 border border-white/15 rounded-2xl px-4 py-3 flex items-center justify-between shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_16px_56px_rgba(0,0,0,0.35)]"
            style={{ background: "transparent" }}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center shadow-sm">
                <Shield className="w-5 h-5 text-black" />
              </div>
              <div className="flex items-center gap-2 text-white/90 text-sm">
                <span className="hidden xs:inline">Wallet:</span>
                <span className="font-mono text-white">{mounted ? obfuscate(address) : "0x…"}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hasZkAttestation ? (
                <span className="inline-flex items-center gap-1.5 text-emerald-300 text-xs px-2.5 py-1.5 rounded-md bg-emerald-500/15 border border-emerald-500/40">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Compliant
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-yellow-200 text-xs px-2.5 py-1.5 rounded-md bg-yellow-500/15 border border-yellow-500/40">
                  <AlertTriangle className="w-3.5 h-3.5" /> Unverified
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6 relative z-10">
        {/* Quick Actions (Always Visible) */}
        <div className="sticky top-[72px] z-20">
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={goDeposit}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-full bg-purple-500 hover:bg-purple-600 text-white font-bold shadow-[0_10px_30px_rgba(139,92,246,0.3)] hover:scale-105 transition-all"
            >
              <Wallet className="w-4 h-4" /> Deposit
            </button>
            <button
              onClick={() => goSwap()}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-white/90 font-semibold hover:bg-white/15 transition-colors"
            >
              <ArrowLeftRight className="w-4 h-4" /> Private Swap
            </button>
            <button
              onClick={goWithdraw}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-white/90 font-semibold hover:bg-white/15 transition-colors"
            >
              <ArrowUpRight className="w-4 h-4" /> Withdraw
            </button>
          </div>
        </div>

        {/* Balances Section */}
        <section
          className="backdrop-blur-xl border border-white/15 rounded-2xl p-6 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06),0_16px_56px_rgba(0,0,0,0.45)]"
          style={{ background: "transparent" }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">Private Balances</h2>
            <button
              onClick={() => setShowBalances((s) => !s)}
              className="text-xs px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/15 text-white/90 border border-white/15"
            >
              {showBalances ? "Hide" : "Show"}
            </button>
          </div>
          <div className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            {showBalances ? `$${totalUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "••••"}
          </div>
          {/* Token selector */}
          <div className="mt-3 text-xs text-white/70">
            {discoveredTokens && discoveredTokens.length > 0 && (
              <select
                className="bg-white/10 border border-white/15 rounded-md px-2 py-1"
                value={selectedTokenAddress ?? (discoveredTokens[0].address as any)}
                onChange={(e) => setSelectedTokenAddress(e.target.value as any)}
              >
                {discoveredTokens.map((t) => (
                  <option key={t.address} value={t.address as any}>
                    {t.isNative ? 'eETH' : `e${t.symbol}`}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="mt-4 divide-y divide-white/10">
            {tokens.map((t) => (
              <div key={t.symbol} className="py-4 flex items-center gap-3 justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center">
                    {t.icon ? <t.icon className="w-4 h-4 text-white" /> : <Coins className="w-4 h-4 text-white" />}
                  </div>
                  <div>
                    <div className="text-white font-medium">{t.symbol}</div>
                    <div className="text-xs text-white/70">{showBalances ? `${t.balance} ${t.symbol}` : "••••"}</div>
                  </div>
                </div>
                <div className="hidden sm:block text-white/85 text-sm min-w-[96px] text-right">
                  {showBalances ? `$${t.usd.toLocaleString()}` : "••••"}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={goDeposit}
                    className="px-3 py-1.5 text-xs rounded-md bg-white/10 backdrop-blur-md border border-white/15 text-white/90 hover:bg-white/15"
                  >
                    Deposit
                  </button>
                  <button
                    onClick={() => goSwap({ from: t.symbol })}
                    className="px-3 py-1.5 text-xs rounded-md bg-white/10 backdrop-blur-md border border-white/15 text-white/90 hover:bg-white/15"
                  >
                    Swap
                  </button>
                  <button
                    onClick={goWithdraw}
                    className="px-3 py-1.5 text-xs rounded-md bg-[#e6ff55] text-[#0a0b0e] font-semibold hover:brightness-110 transition"
                  >
                    Withdraw
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ETH/USD Conversion Rate - Only show for ETH */}
        {selectedMeta?.isNative && (
          <section
            className="backdrop-blur-xl border border-white/15 rounded-2xl p-6 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06),0_16px_56px_rgba(0,0,0,0.45)]"
            style={{ background: "transparent" }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-white">ETH/USD Rate</h2>
              <div className="flex items-center gap-2">
                {isPriceLoading ? (
                  <div className="flex items-center gap-2 text-yellow-400 text-xs">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                    Loading...
                  </div>
                ) : priceError ? (
                  <div className="flex items-center gap-2 text-red-400 text-xs">
                    <div className="w-2 h-2 bg-red-400 rounded-full" />
                    Error
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs">
                    <div className={`w-2 h-2 rounded-full ${
                      isOnSepolia 
                        ? (isPriceStale ? 'bg-yellow-400' : 'bg-green-400')
                        : 'bg-gray-400'
                    }`} />
                    <span className="text-white/70">
                      {isOnSepolia ? (isPriceStale ? 'Stale' : 'Live') : 'Fallback'}
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Current Rate */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="text-sm text-white/70 mb-1">Current Rate</div>
                <div className="text-2xl font-bold text-white">
                  {isPriceLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                      <span>Loading...</span>
                    </div>
                  ) : priceError ? (
                    <span className="text-red-400">Error</span>
                  ) : (
                    formattedPrice
                  )}
                </div>
                <div className="text-xs text-white/60 mt-1">
                  1 ETH = 1 eETH
                </div>
              </div>
              
              {/* Network Status */}
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="text-sm text-white/70 mb-1">Oracle Status</div>
                <div className="text-lg font-semibold text-white">
                  {isOnSepolia ? (
                    <span className="text-green-400">🟢 Pyth Network</span>
                  ) : (
                    <span className="text-gray-400">🟫 Fallback Mode</span>
                  )}
                </div>
                <div className="text-xs text-white/60 mt-1">
                  {isOnSepolia 
                    ? 'Real-time price feeds' 
                    : 'Switch to Sepolia for live prices'
                  }
                </div>
              </div>
            </div>
            
            {/* Conversion Examples */}
            {selectedMeta?.isNative && decryptedBalance && parseFloat(decryptedBalance) > 0 && (
              <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <div className="text-sm text-blue-300 mb-2">💡 Your Balance Conversion:</div>
                <div className="text-white">
                  <span className="font-mono">{parseFloat(decryptedBalance).toFixed(4)} eETH</span>
                  <span className="text-white/70"> ≈ </span>
                  <span className="font-semibold">{showBalances ? `$${(parseFloat(decryptedBalance) * ethPrice).toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '••••'}</span>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Compliance */}
        <div className="grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <section
              className="backdrop-blur-xl border border-white/15 rounded-2xl p-6 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06),0_16px_56px_rgba(0,0,0,0.45)]"
              style={{ background: "transparent" }}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-white">Compliance & Limits</h3>
                {hasZkAttestation ? (
                  <span className="inline-flex items-center gap-1.5 text-emerald-300 text-xs px-2.5 py-1.5 rounded-md bg-emerald-500/15 border border-emerald-500/40">
                    Ready
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-yellow-200 text-xs px-2.5 py-1.5 rounded-md bg-yellow-500/15 border border-yellow-500/40">
                    <AlertTriangle className="w-3.5 h-3.5" /> Action needed
                  </span>
                )}
              </div>
              <ul className="space-y-2 text-sm text-white/85">
                <li>Status reflects your linked zk-attestation.</li>
              </ul>
              <div className="mt-3 text-sm">
                {hasZkAttestation ? (
                  <span className="text-emerald-300">Compliant mode enabled.</span>
                ) : (
                  <span className="text-yellow-200">Link zk-attestation to enable withdrawals.</span>
                )}
              </div>
              {!hasZkAttestation && (
                <div className="mt-4">
                  <button
                    onClick={() => setHasZkAttestation(true)}
                    className="px-4 py-2 rounded-full bg-purple-500 hover:bg-purple-600 text-white text-sm font-bold shadow-[0_10px_30px_rgba(139,92,246,0.3)] hover:scale-105 transition-all"
                  >
                    Provide zk-Attestation
                  </button>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}
