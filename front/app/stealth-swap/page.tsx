"use client"

import { useEffect, useMemo, useState } from "react"
import {
  ArrowUpDown,
  ChevronDown,
  TrendingUp,
  RotateCcw,
  Settings,
  X,
  Search,
  CheckCircle2,
  AlertTriangle,
  Users,
  Clock,
  Shield,
} from "lucide-react"
import { useStealthSwap } from "@/hooks/use-stealth-swap"
import { useTokens } from "@/hooks/use-tokens"
import { useEncryptedBalance } from "@/hooks/use-encrypted-balance"
import { STEALTH_SWAP_POOL, ONE_INCH_ADAPTER } from "@/lib/stealth-contracts"

export default function StealthSwapPage() {
  // Hooks
  const { createIntent, contributeToSwap, executeSwap } = useStealthSwap()
  const { tokens, loading: tokensLoading } = useTokens()
  const [selectedTokenAddress, setSelectedTokenAddress] = useState<string | null>(null)
  const { balance, loading: balanceLoading } = useEncryptedBalance(selectedTokenAddress, 18)

  // Selection + amounts
  const [fromToken, setFromToken] = useState<any>(null)
  const [toToken, setToToken] = useState<any>(null)
  const [fromAmount, setFromAmount] = useState<string>("")
  const [toAmount, setToAmount] = useState<string>("")
  const [insufficientBalance, setInsufficientBalance] = useState(false)

  // Stealth swap state
  const [intentId, setIntentId] = useState<string | null>(null)
  const [contributionAmount, setContributionAmount] = useState<string>("")
  const [isCreatingIntent, setIsCreatingIntent] = useState(false)
  const [isContributing, setIsContributing] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)

  // UI state
  const [selectingSide, setSelectingSide] = useState<"from" | "to" | null>(null)
  const [tokenQuery, setTokenQuery] = useState("")
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [slippage, setSlippage] = useState(0.5)
  const [successOpen, setSuccessOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [toasts, setToasts] = useState<{ id: number; message: string }[]>([])

  // Set default tokens when loaded
  useEffect(() => {
    if (tokens && tokens.length > 0 && !fromToken) {
      setFromToken(tokens[0])
      setSelectedTokenAddress(tokens[0]?.address)
    }
    if (tokens && tokens.length > 1 && !toToken) {
      setToToken(tokens[1])
    }
  }, [tokens, fromToken, toToken])

  // Update selected token address when fromToken changes
  useEffect(() => {
    if (fromToken?.address) {
      setSelectedTokenAddress(fromToken.address)
    }
  }, [fromToken])

  // Derived quote (mock pricing for now)
  const price = useMemo(() => {
    if (!fromToken || !toToken) return 1
    // Simple mock: 1 eUSDC = 0.99 eDAI, otherwise 1:1
    if (fromToken.symbol === "eUSDC" && toToken.symbol === "eDAI") return 0.99
    if (fromToken.symbol === "eDAI" && toToken.symbol === "eUSDC") return 1 / 0.99
    return 1
  }, [fromToken, toToken])

  useEffect(() => {
    const amt = Number.parseFloat(fromAmount.replace(/,/g, ""))
    if (!isFinite(amt) || amt <= 0) {
      setToAmount("")
      setInsufficientBalance(false)
      return
    }
    const est = amt * price
    setToAmount(est.toLocaleString(undefined, { maximumFractionDigits: 6 }))
    setInsufficientBalance(amt > (balance || 0))
  }, [fromAmount, price, balance])

  const filteredTokens = useMemo(() => {
    if (!tokens) return []
    const q = tokenQuery.trim().toLowerCase()
    if (!q) return tokens
    return tokens.filter((t) => 
      t.symbol.toLowerCase().includes(q) || 
      t.name.toLowerCase().includes(q)
    )
  }, [tokens, tokenQuery])

  function openTokenModal(side: "from" | "to") {
    setSelectingSide(side)
    setTokenQuery("")
  }

  function selectToken(t: any) {
    if (selectingSide === "from") {
      setFromToken(t)
    } else if (selectingSide === "to") {
      setToToken(t)
    }
    setSelectingSide(null)
  }

  function flipDirection() {
    setFromToken(toToken)
    setToToken(fromToken)
    setFromAmount(toAmount)
  }

  function addToast(message: string) {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, message }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 2500)
  }

  async function onCreateIntent() {
    if (!fromToken || !toToken) {
      setErrorMessage("Please select both tokens")
      return
    }

    const amt = Number.parseFloat(fromAmount.replace(/,/g, ""))
    if (!isFinite(amt) || amt <= 0) {
      setErrorMessage("Enter a valid amount")
      return
    }

    try {
      setIsCreatingIntent(true)
      setErrorMessage(null)
      
      addToast("Creating stealth swap intent...")
      
      const deadline = Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
      const policy = "0x" + "0".repeat(64) // Mock policy hash
      
      const intentId = await createIntent(
        fromToken.address,
        toToken.address,
        BigInt(Math.floor(amt * 1e18)), // Convert to wei
        BigInt(deadline),
        policy
      )
      
      setIntentId(intentId)
      addToast("Intent created successfully!")
      
    } catch (e: any) {
      setErrorMessage(`Failed to create intent: ${e.message}`)
    } finally {
      setIsCreatingIntent(false)
    }
  }

  async function onContribute() {
    if (!intentId) {
      setErrorMessage("No intent to contribute to")
      return
    }

    const amt = Number.parseFloat(contributionAmount.replace(/,/g, ""))
    if (!isFinite(amt) || amt <= 0) {
      setErrorMessage("Enter a valid contribution amount")
      return
    }

    try {
      setIsContributing(true)
      setErrorMessage(null)
      
      addToast("Contributing to stealth swap...")
      
      await contributeToSwap(intentId, BigInt(Math.floor(amt * 1e18)))
      
      addToast("Contribution successful!")
      
    } catch (e: any) {
      setErrorMessage(`Failed to contribute: ${e.message}`)
    } finally {
      setIsContributing(false)
    }
  }

  async function onExecute() {
    if (!intentId) {
      setErrorMessage("No intent to execute")
      return
    }

    try {
      setIsExecuting(true)
      setErrorMessage(null)
      
      addToast("Executing stealth swap...")
      
      // Mock 1inch calldata - in production this would come from 1inch API
      const mockCalldata = "0x" + "0".repeat(200)
      
      await executeSwap(
        intentId,
        ONE_INCH_ADAPTER.address,
        mockCalldata,
        BigInt(Math.floor(Number.parseFloat(toAmount) * 1e18))
      )
      
      addToast("Swap executed successfully!")
      setSuccessOpen(true)
      
    } catch (e: any) {
      setErrorMessage(`Failed to execute swap: ${e.message}`)
    } finally {
      setIsExecuting(false)
    }
  }

  if (tokensLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white text-xl">Loading tokens...</div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex flex-col items-center pt-24 md:pt-28">
      {/* Background */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "url('/back.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-black/10" />

      {/* Header */}
      <div className="relative z-10 mb-8 text-center">
        <h1 className="text-4xl font-bold text-white mb-2">Stealth Swap</h1>
        <p className="text-white/80 text-lg">Private token swaps with batched execution</p>
      </div>

      {/* Main Swap Card */}
      <div className="w-full max-w-4xl mx-auto px-4 pb-10 relative z-10">
        <div className="relative rounded-[32px] overflow-hidden shadow-[0_24px_70px_rgba(0,0,0,0.55)]">
          <div className="absolute inset-0 opacity-45 pointer-events-none bg-[radial-gradient(120%_120%_at_50%_0%,rgba(255,255,255,0.16)_0%,rgba(255,255,255,0.08)_40%,rgba(255,255,255,0.03)_100%)]" />
          <div
            className="relative backdrop-blur-3xl backdrop-saturate-200 border border-white/15 rounded-[32px] p-6 lg:p-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_16px_56px_rgba(0,0,0,0.55)]"
            style={{ background: "rgba(255,255,255,0.015)" }}
          >
            {errorMessage && (
              <div className="mb-6 flex items-center gap-3 bg-rose-500/15 border border-rose-500/40 text-rose-200 px-4 py-3 rounded-xl">
                <AlertTriangle className="w-5 h-5" />
                <span className="text-base font-medium">{errorMessage}</span>
              </div>
            )}

            {/* Token Selection */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {/* From Token */}
              <div>
                <label className="text-white text-base font-semibold mb-3 block">From:</label>
                <div className="text-sm text-white mb-3 font-medium">
                  Balance: {balanceLoading ? "Loading..." : `${(balance || 0).toFixed(6)} ${fromToken?.symbol || ""}`}
                </div>

                <button
                  onClick={() => openTokenModal("from")}
                  className="w-full text-left backdrop-blur-xl border border-white/15 rounded-2xl px-5 py-4 flex items-center justify-between mb-5 hover:bg-white/10 transition-colors"
                  style={{ background: "rgba(255,255,255,0.08)" }}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-7 h-7 bg-yellow-400 rounded-full flex items-center justify-center">
                      <span className="text-black text-sm font-bold">{fromToken?.symbol?.[0] || "?"}</span>
                    </div>
                    <span className="text-white text-lg font-semibold">{fromToken?.symbol || "Select Token"}</span>
                    <div className="bg-emerald-500/20 border border-emerald-500/50 rounded-full px-3 py-1 flex items-center gap-2">
                      <Shield className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-200 text-sm font-medium">Encrypted</span>
                    </div>
                  </div>
                  <ChevronDown className="w-5 h-5 text-white" />
                </button>

                <div className="rounded-2xl backdrop-blur-xl border border-white/15 p-6" style={{ background: "rgba(255,255,255,0.08)" }}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-white text-base font-semibold">Amount:</span>
                  </div>
                  <input
                    value={fromAmount}
                    onChange={(e) => setFromAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                    placeholder="0.0"
                    className="w-full bg-transparent outline-none text-center text-3xl font-bold text-white"
                    inputMode="decimal"
                  />
                  {insufficientBalance && (
                    <div className="text-rose-300 text-sm font-medium mt-2 text-center">
                      Insufficient balance
                    </div>
                  )}
                </div>
              </div>

              {/* To Token */}
              <div>
                <label className="text-white text-base font-semibold mb-3 block">To:</label>
                <div className="text-sm text-white mb-3 font-medium">
                  Expected output
                </div>

                <button
                  onClick={() => openTokenModal("to")}
                  className="w-full text-left backdrop-blur-xl border border-white/15 rounded-2xl px-5 py-4 flex items-center justify-between mb-5 hover:bg-white/10 transition-colors"
                  style={{ background: "rgba(255,255,255,0.08)" }}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-7 h-7 bg-emerald-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-bold">{toToken?.symbol?.[0] || "?"}</span>
                    </div>
                    <span className="text-white text-lg font-semibold">{toToken?.symbol || "Select Token"}</span>
                    <div className="bg-rose-500/20 border border-rose-500/50 rounded-full px-3 py-1 flex items-center gap-2">
                      <Shield className="w-3 h-3 text-rose-400" />
                      <span className="text-rose-200 text-sm font-medium">Encrypted</span>
                    </div>
                  </div>
                  <ChevronDown className="w-5 h-5 text-white" />
                </button>

                <div className="rounded-2xl backdrop-blur-xl border border-white/15 p-6" style={{ background: "rgba(255,255,255,0.08)" }}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-white text-base font-semibold">Expected:</span>
                  </div>
                  <div className="text-center text-3xl font-bold text-white">
                    {toAmount || "0.0"}
                  </div>
                </div>
              </div>
            </div>

            {/* Stealth Swap Actions */}
            <div className="space-y-4">
              {!intentId ? (
                <button
                  onClick={onCreateIntent}
                  disabled={isCreatingIntent || !fromToken || !toToken || !fromAmount}
                  className="w-full h-14 bg-[#e6ff55] text-[#0a0b0e] font-bold text-lg rounded-full hover:brightness-110 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isCreatingIntent ? "Creating Intent..." : "Create Stealth Swap Intent"}
                </button>
              ) : (
                <div className="space-y-4">
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-emerald-200 font-medium mb-2">
                      <CheckCircle2 className="w-5 h-5" />
                      Intent Created Successfully
                    </div>
                    <div className="text-white/80 text-sm">
                      Intent ID: {intentId.slice(0, 10)}...{intentId.slice(-8)}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-white text-sm font-medium mb-2 block">Contribution Amount:</label>
                      <input
                        value={contributionAmount}
                        onChange={(e) => setContributionAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                        placeholder="0.0"
                        className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder:text-white/60"
                      />
                    </div>
                    <div className="flex items-end">
                      <button
                        onClick={onContribute}
                        disabled={isContributing || !contributionAmount}
                        className="w-full h-12 bg-blue-500 text-white font-bold rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {isContributing ? "Contributing..." : "Contribute"}
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={onExecute}
                    disabled={isExecuting}
                    className="w-full h-14 bg-[#e6ff55] text-[#0a0b0e] font-bold text-lg rounded-full hover:brightness-110 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isExecuting ? "Executing Swap..." : "Execute Stealth Swap"}
                  </button>
                </div>
              )}
            </div>

            {/* Info Section */}
            <div className="mt-8 p-6 bg-white/5 border border-white/10 rounded-xl">
              <div className="flex items-center gap-2 text-white font-medium mb-4">
                <Users className="w-5 h-5" />
                How Stealth Swaps Work
              </div>
              <div className="space-y-2 text-white/80 text-sm">
                <div>1. Create an intent to swap tokens privately</div>
                <div>2. Other users can contribute to the same swap</div>
                <div>3. When enough liquidity is pooled, execute the swap atomically</div>
                <div>4. All participants receive their pro-rata share of output tokens</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Token Select Modal */}
      {selectingSide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelectingSide(null)} />
          <div className="relative w-full max-w-md mx-auto backdrop-blur-3xl border border-white/15 rounded-2xl p-6 shadow-[0_12px_48px_rgba(0,0,0,0.6)] bg-black/60 text-white">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3 text-white font-semibold text-lg">
                <Search className="w-5 h-5 text-white" />
                Select token
              </div>
              <button
                className="p-2 hover:bg-white/10 rounded-lg border border-white/10"
                onClick={() => setSelectingSide(null)}
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
            <input
              value={tokenQuery}
              onChange={(e) => setTokenQuery(e.target.value)}
              placeholder="Search by name or symbol"
              className="w-full mb-4 bg-white/10 backdrop-blur-md border border-white/15 rounded-xl px-4 py-3 text-white placeholder:text-white/60 outline-none text-base font-medium"
            />
            <div className="max-h-64 overflow-auto divide-y divide-white/10">
              {filteredTokens.map((t) => (
                <button
                  key={t.symbol}
                  onClick={() => selectToken(t)}
                  className="w-full text-left px-4 py-4 hover:bg-white/5 flex items-center justify-between transition-colors"
                >
                  <div>
                    <div className="text-white font-semibold text-base">{t.symbol}</div>
                    <div className="text-white font-medium">{t.name}</div>
                  </div>
                  {(selectingSide === "from" ? fromToken?.symbol === t.symbol : toToken?.symbol === t.symbol) && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {successOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSuccessOpen(false)} />
          <div className="relative w-full max-w-md mx-auto backdrop-blur-3xl border border-white/15 rounded-2xl p-8 text-center shadow-[0_12px_48px_rgba(0,0,0,0.6)] bg-black/60 text-white">
            <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-emerald-300" />
            </div>
            <div className="text-white text-xl font-bold mb-2">Stealth Swap Complete!</div>
            <div className="text-white text-base font-medium mb-6">Your private swap has been executed successfully.</div>
            <button
              className="px-6 py-3 rounded-full bg-[#e6ff55] text-[#0a0b0e] font-bold hover:brightness-110 transition-all"
              onClick={() => setSuccessOpen(false)}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      )}

      {/* Toasts */}
      <div className="fixed bottom-4 right-4 z-50 space-y-3">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="px-4 py-3 rounded-xl backdrop-blur-xl border border-white/15 text-white font-medium text-base shadow-[0_8px_24px_rgba(0,0,0,0.45)]"
            style={{ background: "rgba(255,255,255,0.02)" }}
          >
            {t.message}
          </div>
        ))}
      </div>
    </div>
  )
}
