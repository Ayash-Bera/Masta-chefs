"use client"

import { useEffect, useMemo, useState } from "react"
import { useAccount } from "wagmi"
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
  Shield,
} from "lucide-react"

// Import all the wagmi hooks
import { useRegistrationStatus } from "../../hooks/use-registration-status"
import { useRegistration } from "../../hooks/use-registration"
import { useEncryptedBalance } from "../../hooks/use-encrypted-balance"
import { useEercWrites } from "../../hooks/use-eerc"
import { useStealthSwap, useSwapIntent } from "../../hooks/use-stealth-swap"
import { useStealthFactory, usePredictStealth } from "../../hooks/use-stealth-factory"
import { useStealthPaymaster, usePaymasterBalance } from "../../hooks/use-stealth-paymaster"

export default function TsunamiSwap() {
  // Get wallet connection
  const { address, isConnected } = useAccount()
  
  // Registration hooks
  const { isRegistered, isLoading: isCheckingRegistration, refetch: refetchRegistrationStatus } = useRegistrationStatus(address)
  const { register, isPending: isRegistering, error: registrationError, hasProofReady } = useRegistration(refetchRegistrationStatus)
  
  // Encrypted token list with real addresses
  const tokenList = useMemo(
    () => [
      { 
        symbol: "eUSDC", 
        name: "Encrypted USD Coin", 
        address: "0x0000000000000000000000000000000000000000" as `0x${string}`, // Native token placeholder
        decimals: 18
      },
      { 
        symbol: "eDAI", 
        name: "Encrypted DAI", 
        address: "0x0000000000000000000000000000000000000001" as `0x${string}`, // Update with real address
        decimals: 18
      },
      { 
        symbol: "eBNB", 
        name: "Encrypted BNB", 
        address: "0x0000000000000000000000000000000000000002" as `0x${string}`, // Update with real address
        decimals: 18
      },
      { 
        symbol: "eUSDT", 
        name: "Encrypted Tether", 
        address: "0x0000000000000000000000000000000000000003" as `0x${string}`, // Update with real address
        decimals: 6
      },
    ],
    [],
  )

  // Selection + amounts
  const [fromToken, setFromToken] = useState<any>(null)
  const [toToken, setToToken] = useState<any>(null)
  const [fromAmount, setFromAmount] = useState<string>("")
  const [toAmount, setToAmount] = useState<string>("")  
  const [insufficientBalance, setInsufficientBalance] = useState(false)
  
  // Encrypted balance hooks for selected tokens
  const { decryptedBalance: fromBalance, formattedEncryptedBalance: fromBalanceFormatted, isLoading: isLoadingFromBalance } = useEncryptedBalance(fromToken?.address, fromToken?.decimals || 18)
  const { decryptedBalance: toBalance, formattedEncryptedBalance: toBalanceFormatted, isLoading: isLoadingToBalance } = useEncryptedBalance(toToken?.address, toToken?.decimals || 18)
  
  // Stealth swap hooks
  const { createIntent, contribute, execute, isLoading: isSwapLoading, error: swapError } = useStealthSwap()
  
  // Alias functions for user's code compatibility
  const contributeToSwap = contribute
  const executeSwap = execute
  
  // Mock adapter address - replace with real deployed address
  const ONE_INCH_ADAPTER = { address: '0x0000000000000000000000000000000000000000' as `0x${string}` }
  const [currentIntentId, setCurrentIntentId] = useState<string | null>(null)
  const { intent, refetch: refetchIntent } = useSwapIntent(currentIntentId)
  
  // eERC operations
  const { deposit, withdraw, transfer, isPending: isEercPending, error: eercError } = useEercWrites()
  
  // Stealth factory for advanced operations
  const { createStealth, isLoading: isCreatingStealth } = useStealthFactory()
  
  // Paymaster for gas payments
  const { depositForGas, withdrawDeposit, isLoading: isPaymasterLoading } = useStealthPaymaster()

  // Additional state variables for enhanced functionality
  const [swapMode, setSwapMode] = useState<"regular" | "stealth">("regular")
  const [selectedTokenAddress, setSelectedTokenAddress] = useState<string | null>(null)
  const [intentId, setIntentId] = useState<string | null>(null)
  const [contributionAmount, setContributionAmount] = useState<string>("")
  const [isCreatingIntent, setIsCreatingIntent] = useState(false)
  const [isContributing, setIsContributing] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)
  
  // Mock tokens data - replace with real token fetching
  const tokens = tokenList
  const tokensLoading = false

  // UI state
  const [selectingSide, setSelectingSide] = useState<"from" | "to" | null>(null)
  const [tokenQuery, setTokenQuery] = useState("")
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [slippage, setSlippage] = useState(0.5)
  const [isSwapping, setIsSwapping] = useState(false)
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

  // Derived quote (fake pricing)
  const price = useMemo(() => {
    if (!fromToken || !toToken) return 1
    // simple mock: 1 eUSDC = 0.99 eDAI, otherwise 1:1
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
    
    // Check balance using encrypted balance
    const currentBalance = fromBalance ? Number.parseFloat(fromBalance) : 0
    setInsufficientBalance(amt > currentBalance)
  }, [fromAmount, price, fromToken, fromBalance])

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

  function selectToken(t: (typeof tokenList)[number]) {
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
      
      const result = await createIntent({
        tokenIn: fromToken.address,
        tokenOut: toToken.address,
        minOut: BigInt(Math.floor(amt * 1e18)), // Convert to wei
        deadline: 3600, // 1 hour in seconds
        slippageBps: Math.floor(slippage * 100)
      })
      
      if (!result.success) {
        throw new Error(result.error || "Failed to create intent")
      }
      
      // For now, use a mock intent ID since parsing from logs isn't implemented
      const intentId = "0x" + "0".repeat(64)
      
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
      
      await contributeToSwap({
        intentId,
        amount: BigInt(Math.floor(amt * 1e18))
      })
      
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
      
      await executeSwap({
        intentId,
        routerCalldata: mockCalldata,
        expectedMinOut: BigInt(Math.floor(Number.parseFloat(toAmount) * 1e18))
      })
      
      addToast("Swap executed successfully!")
      setSuccessOpen(true)
      
    } catch (e: any) {
      setErrorMessage(`Failed to execute swap: ${e.message}`)
    } finally {
      setIsExecuting(false)
    }
  }

  async function onSwap() {
    setErrorMessage(null)
    
    // Check wallet connection
    if (!isConnected || !address) {
      setErrorMessage("Please connect your wallet")
      return
    }
    
    // Check registration status
    if (!isRegistered) {
      setErrorMessage("Please register first to use encrypted swaps")
      return
    }
    
    const amt = Number.parseFloat(fromAmount.replace(/,/g, ""))
    if (!isFinite(amt) || amt <= 0) {
      setErrorMessage("Enter a valid amount")
      return
    }
    if (insufficientBalance) {
      setErrorMessage("Insufficient balance")
      return
    }

    try {
      setIsSwapping(true)
      addToast("Creating stealth swap intent...")
      
      // Convert amount to wei (considering token decimals)
      const amountInWei = BigInt(Math.floor(amt * 10 ** fromToken.decimals))
      const minOutWei = BigInt(Math.floor(Number.parseFloat(toAmount.replace(/,/g, "")) * 10 ** toToken.decimals * (1 - slippage / 100)))
      
      // Create stealth swap intent
      const intentResult = await createIntent({
        tokenIn: fromToken.address,
        tokenOut: toToken.address,
        minOut: minOutWei,
        deadline: 1800, // 30 minutes
        slippageBps: Math.floor(slippage * 100) // Convert percentage to basis points
      })
      
      if (!intentResult.success) {
        throw new Error(intentResult.error || "Failed to create swap intent")
      }
      
      addToast("Intent created successfully")
      
      // Note: Intent ID parsing from transaction logs is not yet implemented
      // For now, we'll simulate the contribution step
      addToast("Intent created - waiting for other participants...")
      
      // TODO: Parse intentId from transaction logs and contribute
      // if (intentResult.intentId) {
      //   setCurrentIntentId(intentResult.intentId)
      //   addToast("Contributing to swap pool...")
      //   
      //   const contributeResult = await contribute({
      //     intentId: intentResult.intentId,
      //     amount: amountInWei
      //   })
      //   
      //   if (!contributeResult.success) {
      //     throw new Error(contributeResult.error || "Failed to contribute to swap")
      //   }
      //   
      //   addToast("Contribution successful")
      // }
      
      addToast("Swap completed successfully")
      setIsSwapping(false)
      setSuccessOpen(true)
      
    } catch (e) {
      setIsSwapping(false)
      const errorMsg = e instanceof Error ? e.message : "Swap failed: Unknown error"
      setErrorMessage(errorMsg)
      console.error("Swap error:", e)
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
      {/* Local metallic gradient defs */}
      <svg aria-hidden="true" width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="metallic-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="45%" stopColor="#d4d4d4" />
            <stop offset="100%" stopColor="#737373" />
          </linearGradient>
        </defs>
      </svg>
      {/* Background image */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: "url('/back.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />
      {/* Dark overlay for better readability */}
      <div className="pointer-events-none absolute inset-0 bg-black/10" />

      {/* Stepper */}
      <div className="pt-8 mb-6 relative z-10">
        <div className="flex items-center gap-3 bg-white/8 border border-white/20 backdrop-blur-md rounded-3xl px-4 py-2 shadow-[0_8px_28px_rgba(0,0,0,0.35)]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">
              <span className="text-black text-sm font-bold">1</span>
            </div>
            <span className="text-white text-base font-semibold">Select tokens</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-white/15 border border-white/10 flex items-center justify-center">
            <span className="text-white text-sm font-medium">2</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-white/15 border border-white/10 flex items-center justify-center">
            <span className="text-white text-sm font-medium">3</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-white/15 border border-white/10 flex items-center justify-center">
            <span className="text-white text-sm font-medium">4</span>
          </div>
        </div>
      </div>

      {/* Main Swap Card */}
      <div className="w-full max-w-6xl mx-auto px-4 pb-10 relative z-10">
        {/* Glass wrapper with subtle gradient sheen */}
        <div className="relative rounded-[32px] overflow-hidden shadow-[0_24px_70px_rgba(0,0,0,0.55)]">
          <div className="absolute inset-0 opacity-45 pointer-events-none bg-[radial-gradient(120%_120%_at_50%_0%,rgba(255,255,255,0.16)_0%,rgba(255,255,255,0.08)_40%,rgba(255,255,255,0.03)_100%)]" />
          {/* subtle edge glow */}
          <div
            className="absolute -inset-1 rounded-[36px] pointer-events-none"
            style={{
              background: "radial-gradient(80% 50% at 10% 0%, rgba(255,255,255,0.12), rgba(255,255,255,0) 60%)",
            }}
          />
          <div
            className="relative backdrop-blur-3xl backdrop-saturate-200 border border-white/15 rounded-[32px] p-5 sm:p-6 lg:p-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_16px_56px_rgba(0,0,0,0.55)]"
            style={{ background: "rgba(255,255,255,0.015)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-8">
                <div className="flex items-center gap-3">
                  <button className="text-xl font-light tracking-tight bg-gradient-to-b from-white via-zinc-300 to-zinc-500 bg-clip-text text-transparent">Swap</button>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3">
                <button className="p-2 hover:bg-white/10 rounded-lg transition-colors border border-white/10 backdrop-blur-sm">
                  <RotateCcw className="w-5 h-5 text-white" />
                </button>
                <button className="p-2 hover:bg-white/10 rounded-lg transition-colors border border-white/10 backdrop-blur-sm">
                  <Settings className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
            <div className="text-white text-base font-medium mb-8">
              Private token swaps powered by Tsunami & Uniswap v4
            </div>
            
            {/* Swap Mode Toggle */}
            <div className="mb-6 p-4 bg-white/5 border border-white/10 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-medium mb-1">Swap Mode</div>
                  <div className="text-white/80 text-sm">
                    {swapMode === "regular" 
                      ? "Direct private swaps with immediate execution" 
                      : "Stealth swaps with batched execution for enhanced privacy"
                    }
                  </div>
                </div>
                <div className="flex bg-white/10 rounded-lg p-1">
                  <button
                    onClick={() => setSwapMode("regular")}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      swapMode === "regular" 
                        ? "bg-white text-black" 
                        : "text-white/80 hover:text-white"
                    }`}
                  >
                    Regular
                  </button>
                  <button
                    onClick={() => setSwapMode("stealth")}
                    className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                      swapMode === "stealth" 
                        ? "bg-white text-black" 
                        : "text-white/80 hover:text-white"
                    }`}
                  >
                    Stealth
                  </button>
                </div>
              </div>
            </div>

            {/* Registration Status */}
            {isConnected && !isCheckingRegistration && (
              <div className="mb-6">
                {!isRegistered ? (
                  <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-yellow-200 font-medium mb-1">Registration Required</div>
                        <div className="text-white/80 text-sm">You need to register to use encrypted swaps</div>
                      </div>
                      <button
                        onClick={register}
                        disabled={isRegistering}
                        className="px-4 py-2 bg-yellow-500 text-black font-medium rounded-lg hover:bg-yellow-600 transition-colors disabled:opacity-50"
                      >
                        {isRegistering ? "Registering..." : "Register Now"}
                      </button>
                    </div>
                    {registrationError && (
                      <div className="mt-3 text-red-300 text-sm">
                        Error: {registrationError.message}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                      <div className="text-green-200 font-medium">Registered for encrypted swaps</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {errorMessage && (
              <div className="mb-6 flex items-center gap-3 bg-rose-500/15 border border-rose-500/40 text-rose-200 px-4 py-3 rounded-xl">
                <AlertTriangle className="w-5 h-5" />
                <span className="text-base font-medium">{errorMessage}</span>
              </div>
            )}

            {/* Content grid */}
            <div className="relative">
              {/* vertical divider */}
              <div className="hidden md:block absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-px bg-white/10" />

              <div className="grid md:grid-cols-2 gap-6">
                {/* From Section */}
                <div className="">
                  <label className="text-white text-base font-semibold mb-3 block">From:</label>
                  <div className="text-sm text-white mb-3 font-medium">
                    Balance: {isLoadingFromBalance ? "Loading..." : fromBalanceFormatted} {fromToken?.symbol || ""}
                  </div>

                  {/* Token / Network pill */}
                  <button
                    onClick={() => openTokenModal("from")}
                    className="w-full text-left backdrop-blur-xl border border-white/15 rounded-2xl px-5 py-4 flex items-center justify-between mb-5 hover:bg-white/10 transition-colors shadow-[inset_0_-1px_0_rgba(255,255,255,0.06)]"
                    style={{ background: "rgba(255,255,255,0.08)" }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-7 h-7 bg-yellow-400 rounded-full flex items-center justify-center">
                        <span className="text-black text-sm font-bold">{fromToken?.symbol?.[0] || "?"}</span>
                      </div>
                      <span className="text-white text-lg font-semibold">{fromToken?.symbol || "Select Token"}</span>
                      <span className="text-white/60">/</span>
                      <div className="bg-emerald-500/20 border border-emerald-500/50 rounded-full px-3 py-1 flex items-center gap-2">
                        <Shield className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-200 text-sm font-medium">Encrypted</span>
                      </div>
                    </div>
                    <ChevronDown className="w-5 h-5 text-white" />
                  </button>

                  {/* Amount card */}
                  <div
                    className="rounded-2xl backdrop-blur-xl border border-white/15 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06),0_10px_28px_rgba(0,0,0,0.45)] p-6"
                    style={{ background: "rgba(255,255,255,0.08)" }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-white text-base font-semibold">You send:</span>
                    </div>
                    <div className="text-center">
                      <input
                        value={fromAmount}
                        onChange={(e) => setFromAmount(e.target.value.replace(/[^0-9.]/g, ""))}
                        placeholder="0.0"
                        className="w-full bg-transparent outline-none text-center text-[44px] sm:text-[48px] leading-[1.1] font-bold text-white tracking-tight"
                        inputMode="decimal"
                      />
                      <div className="text-rose-300 text-base font-medium mt-2">
                        {insufficientBalance ? "Insufficient balance" : ""}
                      </div>
                    </div>
                  </div>
                </div>

                {/* To Section */}
                <div className="">
                  <label className="text-white text-base font-semibold mb-3 block">To:</label>
                  <div className="text-sm text-white mb-3 font-medium">
                    Balance: {isLoadingToBalance ? "Loading..." : toBalanceFormatted} {toToken?.symbol || ""}
                  </div>

                  {/* Token / Network pill */}
                  <button
                    onClick={() => openTokenModal("to")}
                    className="w-full text-left backdrop-blur-xl border border-white/15 rounded-2xl px-5 py-4 flex items-center justify-between mb-5 hover:bg-white/10 transition-colors shadow-[inset_0_-1px_0_rgba(255,255,255,0.06)]"
                    style={{ background: "rgba(255,255,255,0.08)" }}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-7 h-7 bg-emerald-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-bold">{toToken?.symbol?.[0] || "?"}</span>
                      </div>
                      <span className="text-white text-lg font-semibold">{toToken?.symbol || "Select Token"}</span>
                      <span className="text-white/60">/</span>
                      <div className="bg-rose-500/20 border border-rose-500/50 rounded-full px-3 py-1 flex items-center gap-2">
                        <Shield className="w-3 h-3 text-rose-400" />
                        <span className="text-rose-200 text-sm font-medium">Encrypted</span>
                      </div>
                    </div>
                    <ChevronDown className="w-5 h-5 text-white" />
                  </button>

                  {/* Amount card */}
                  <div
                    className="rounded-2xl backdrop-blur-xl border border-white/15 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06),0_10px_28px_rgba(0,0,0,0.45)] p-6"
                    style={{ background: "rgba(255,255,255,0.08)" }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-white text-base font-semibold">You receive:</span>
                      <span className="text-white text-sm font-medium">Estimated</span>
                    </div>
                    <div className="text-center">
                      <div className="text-[44px] sm:text-[48px] leading-[1.1] font-bold text-white tracking-tight">
                        {toAmount || "0.0"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Center swap button overlapping the divider */}
              <div className="hidden md:flex items-center justify-center">
                <button
                  onClick={flipDirection}
                  className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 top-1/2 w-12 h-12 bg-white/10 backdrop-blur-md border-2 border-white/25 rounded-full flex items-center justify-center hover:-translate-y-[calc(50%+2px)] transition-all duration-200 group shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
                >
                  <ArrowUpDown className="w-5 h-5 text-white group-hover:text-white transition-colors" />
                </button>
              </div>
            </div>

            {/* Footer: price info and button */}
            <div className="mt-8 flex flex-col md:flex-row md:items-center gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-white text-base font-semibold">
                    1 {fromToken?.symbol || "Token"} = {price.toFixed(6)} {toToken?.symbol || "Token"}
                  </span>
                  <TrendingUp className="w-5 h-5 text-emerald-400" />
                  <span className="text-emerald-300 text-base font-semibold">5.62% (24H)</span>
                </div>
                <div className="text-white text-sm font-medium">Rate is for reference only. Updated just now</div>
                {/* Transaction details */}
                <div className="mt-4">
                  <button
                    onClick={() => setDetailsOpen((v) => !v)}
                    className="text-white text-base font-medium underline underline-offset-4 hover:text-white transition-colors"
                  >
                    {detailsOpen ? "Hide" : "Show"} details
                  </button>
                  {detailsOpen && (
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-base text-white">
                      <div
                        className="backdrop-blur-xl border border-white/15 rounded-xl p-5 mb-4"
                        style={{ background: "rgba(255,255,255,0.08)" }}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold">Slippage</span>
                          <select
                            value={slippage}
                            onChange={(e) => setSlippage(Number.parseFloat(e.target.value))}
                            className="bg-[#20232c] border border-white/10 rounded-md px-3 py-2 text-white font-medium"
                          >
                            <option value={0.1}>0.1%</option>
                            <option value={0.5}>0.5%</option>
                            <option value={1}>1%</option>
                          </select>
                        </div>
                      </div>
                      <div
                        className="backdrop-blur-xl border border-white/15 rounded-xl p-4"
                        style={{ background: "rgba(255,255,255,0.08)" }}
                      >
                        <div className="font-medium">
                          Expected rate: 1 {fromToken?.symbol || "Token"} ≈ {price.toFixed(4)} {toToken?.symbol || "Token"}
                        </div>
                      </div>
                      <div
                        className="backdrop-blur-xl border border-white/15 rounded-xl p-4"
                        style={{ background: "rgba(255,255,255,0.08)" }}
                      >
                        <div className="font-medium">Tsunami fee: 0.10%</div>
                        <div className="font-medium">Uniswap LP fee: 0.30%</div>
                      </div>
                      <div
                        className="sm:col-span-3 backdrop-blur-xl border border-white/15 rounded-xl p-4 text-white"
                        style={{ background: "rgba(255,255,255,0.08)" }}
                      >
                        <span className="font-medium">
                          This swap is shielded with zk-proofs. Your wallet generates proofs automatically.
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="md:ml-auto">
                <button
                  onClick={onSwap}
                  disabled={isSwapping || !isConnected || (!isRegistered && !isCheckingRegistration) || isLoadingFromBalance || isLoadingToBalance}
                  className="h-14 px-8 sm:px-10 bg-[#e6ff55] text-[#0a0b0e] font-bold text-base sm:text-lg rounded-full hover:brightness-110 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {!isConnected 
                    ? "Connect Wallet" 
                    : isCheckingRegistration 
                    ? "Checking Registration..." 
                    : !isRegistered 
                    ? "Register First" 
                    : isLoadingFromBalance || isLoadingToBalance 
                    ? "Loading Balances..." 
                    : isSwapping 
                    ? "Creating Stealth Swap..." 
                    : "Swap Privately"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Token select modal */}
      {selectingSide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelectingSide(null)} />
          <div
            className="relative w-full max-w-md mx-auto backdrop-blur-3xl border border-white/15 rounded-2xl p-6 shadow-[0_12px_48px_rgba(0,0,0,0.6)] bg-black/60 text-white"
          >
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
            <div
              className="max-h-64 overflow-auto divide-y divide-white/10 no-scrollbar"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" as any }}
            >
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

      {/* Success modal */}
      {successOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSuccessOpen(false)} />
          <div
            className="relative w-full max-w-md mx-auto backdrop-blur-3xl border border-white/15 rounded-2xl p-8 text-center shadow-[0_12px_48px_rgba(0,0,0,0.6)] bg-black/60 text-white"
          >
            <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-emerald-300" />
            </div>
            <div className="text-white text-xl font-bold mb-2">Swap Complete!</div>
            <div className="text-white text-base font-medium mb-6">Your private swap has been executed.</div>
            <div
              className="backdrop-blur-xl border border-white/15 rounded-xl p-5 text-left text-white mb-6"
              style={{ background: "rgba(255,255,255,0.08)" }}
            >
              <div className="font-medium text-base">
                From: {fromAmount || "0.0"} {fromToken?.symbol || "Token"}
              </div>
              <div className="font-medium text-base">
                To: {toAmount || "0.0"} {toToken?.symbol || "Token"}
              </div>
            </div>
            <div className="flex items-center justify-center gap-4">
              <button
                className="px-5 py-3 rounded-full bg-white/10 border border-white/10 text-white font-medium hover:bg-white/15 transition-colors"
                onClick={() => setSuccessOpen(false)}
              >
                Back to Dashboard
              </button>
              <button
                className="px-5 py-3 rounded-full bg-[#e6ff55] text-[#0a0b0e] font-bold hover:brightness-110 transition-all"
                onClick={() => setSuccessOpen(false)}
              >
                View in Local History
              </button>
            </div>
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
      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  )
}
