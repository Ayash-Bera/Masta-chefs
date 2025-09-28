"use client"

import { useMemo, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAccount } from "wagmi"
import {
  ChevronDown,
  Info,
  CheckCircle2,
  AlertTriangle,
  X,
  Loader2,
  Wallet,
  ArrowLeft,
  Shield,
  User,
  Send,
} from "lucide-react"
import { useTransfer } from "../hooks/use-transfer"
import { useEncryptedBalance } from "../hooks/use-encrypted-balance"
import { useTokens } from "../hooks/use-tokens"
import { createPublicClient, http } from "viem"
import { useReadContract } from "wagmi"
import { EERC_CONTRACT, REGISTRAR_CONTRACT } from "../lib/contracts"
import { sepolia } from "wagmi/chains"

type Token = {
  symbol: string
  name: string
  balance: number
  priceUsd: number
  tokenId: bigint
  tokenAddress: string
}

type RecipientInfo = {
  address: string
  isRegistered: boolean
  publicKey: [bigint, bigint] | null
  isLoading: boolean
  error: string | null
}

export default function TransferPage() {
  const router = useRouter()
  const { address } = useAccount()

  // Token selection state
  const [selectedTokenAddress, setSelectedTokenAddress] = useState<`0x${string}` | undefined>(undefined)
  const [selectedTokenDecimals, setSelectedTokenDecimals] = useState<number>(18)
  const [selectedToken, setSelectedToken] = useState<Token | null>(null)

  // Transfer form state
  const [amount, setAmount] = useState<string>("")
  const [recipient, setRecipient] = useState<string>("")
  const [recipientInfo, setRecipientInfo] = useState<RecipientInfo>({
    address: "",
    isRegistered: false,
    publicKey: null,
    isLoading: false,
    error: null
  })

  // UI state
  const [showTokenModal, setShowTokenModal] = useState(false)
  const [confirming, setConfirming] = useState<false | "proof" | "execute">(false)
  const [transferError, setTransferError] = useState<string | null>(null)
  const [successOpen, setSuccessOpen] = useState(false)

  // Hooks
  const { tokens: discoveredTokens, isLoading: isLoadingTokens } = useTokens()
  const { 
    encryptedBalance, 
    decryptedBalance, 
    formattedEncryptedBalance, 
    isLoading: isLoadingBalance 
  } = useEncryptedBalance(selectedTokenAddress, selectedTokenDecimals)

  const {
    transfer,
    isGeneratingProof,
    proofError,
    isPending,
    isConfirming,
    isSuccess,
    hash,
    error: transferHookError,
    isReady
  } = useTransfer(selectedTokenAddress, selectedTokenDecimals)

  // Available tokens from chain metadata
  const tokens = useMemo<Token[]>(() => {
    const list = (discoveredTokens || []).map((t) => ({
      symbol: t.isNative ? "eETH" : `e${t.symbol}`,
      name: t.isNative ? "Encrypted ETH" : `Encrypted ${t.symbol}`,
      balance: decryptedBalance ? parseFloat(decryptedBalance) : 0,
      priceUsd: 1600,
      tokenId: 0n, // Will be fetched dynamically
      tokenAddress: t.address,
    }))
    return list
  }, [discoveredTokens, decryptedBalance])

  // Set default token on load
  useEffect(() => {
    if (tokens.length > 0 && !selectedToken) {
      const defaultToken = tokens[0]
      setSelectedToken(defaultToken)
      setSelectedTokenAddress(defaultToken.tokenAddress as `0x${string}`)
      setSelectedTokenDecimals(defaultToken.tokenAddress === '0x0000000000000000000000000000000000000000' ? 18 : 18)
    }
  }, [tokens, selectedToken])

  // Check recipient registration and get public key
  const { data: isRecipientRegistered, isLoading: isLoadingRecipientCheck } = useReadContract({
    address: REGISTRAR_CONTRACT.address,
    abi: REGISTRAR_CONTRACT.abi,
    functionName: 'isUserRegistered',
    args: recipient.startsWith('0x') && recipient.length === 42 ? [recipient as `0x${string}`] : undefined,
    chainId: sepolia.id,
    query: { enabled: !!recipient && recipient.startsWith('0x') && recipient.length === 42 }
  })

  const { data: recipientPublicKey, isLoading: isLoadingRecipientKey } = useReadContract({
    address: REGISTRAR_CONTRACT.address,
    abi: REGISTRAR_CONTRACT.abi,
    functionName: 'getUserPublicKey',
    args: recipient.startsWith('0x') && recipient.length === 42 ? [recipient as `0x${string}`] : undefined,
    chainId: sepolia.id,
    query: { enabled: !!recipient && recipient.startsWith('0x') && recipient.length === 42 && !!isRecipientRegistered }
  })

  // Update recipient info when data changes
  useEffect(() => {
    if (recipient.startsWith('0x') && recipient.length === 42) {
      setRecipientInfo({
        address: recipient,
        isRegistered: !!isRecipientRegistered,
        publicKey: recipientPublicKey ? [recipientPublicKey[0], recipientPublicKey[1]] : null,
        isLoading: isLoadingRecipientCheck || isLoadingRecipientKey,
        error: null
      })
    } else if (recipient) {
      setRecipientInfo({
        address: recipient,
        isRegistered: false,
        publicKey: null,
        isLoading: false,
        error: "Invalid address format"
      })
    } else {
      setRecipientInfo({
        address: "",
        isRegistered: false,
        publicKey: null,
        isLoading: false,
        error: null
      })
    }
  }, [recipient, isRecipientRegistered, recipientPublicKey, isLoadingRecipientCheck, isLoadingRecipientKey])

  // Derived values
  const numericAmount = useMemo(() => Number.parseFloat(amount.replace(/,/g, "")) || 0, [amount])
  const amountUsd = useMemo(() => numericAmount * (selectedToken?.priceUsd ?? 0), [numericAmount, selectedToken])
  const insufficient = numericAmount > (selectedToken?.balance ?? 0)
  const isPositive = numericAmount > 0
  const isValidRecipient = recipientInfo.isRegistered && recipientInfo.publicKey !== null
  const canTransfer = isPositive && isValidRecipient && !insufficient && isReady

  const background = (
    <>
      <svg aria-hidden="true" width="0" height="0" className="absolute">
        <defs>
          <linearGradient id="metallic-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="45%" stopColor="#d4d4d4" />
            <stop offset="100%" stopColor="#737373" />
          </linearGradient>
        </defs>
      </svg>
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
    </>
  )

  // Token selection handlers
  function selectToken(t: Token) {
    setSelectedToken(t)
    setSelectedTokenAddress(t.tokenAddress as `0x${string}`)
    setSelectedTokenDecimals(t.tokenAddress === '0x0000000000000000000000000000000000000000' ? 18 : 18)
    setShowTokenModal(false)
  }

  function setMax() {
    if (!selectedToken) return
    setAmount(String(selectedToken.balance))
  }

  // Transfer execution
  async function onConfirmTransfer() {
    if (!canTransfer || !selectedToken || !recipientInfo.publicKey) {
      setTransferError("Please enter valid amount and recipient address")
      return
    }

    try {
      setTransferError(null)
      setConfirming("proof")
      
      // Fetch the actual tokenId from the contract
      const client = createPublicClient({
        chain: sepolia,
        transport: http()
      })
      
      const tokenId = await client.readContract({
        address: EERC_CONTRACT.address,
        abi: EERC_CONTRACT.abi,
        functionName: 'tokenIds',
        args: [selectedToken.tokenAddress as `0x${string}`]
      })
      
      const transferParams = {
        tokenId: tokenId as bigint,
        amount: BigInt(Math.floor(parseFloat(amount) * (10 ** selectedTokenDecimals))),
        recipient: recipient,
      }

      // Convert decrypted balance to bigint for transfer function
      const currentBalance = decryptedBalance ? BigInt(Math.floor(parseFloat(decryptedBalance) * (10 ** selectedTokenDecimals))) : 0n
      
      // Convert recipient public key to the format expected by the hook
      const recipientPublicKeyArray = [recipientInfo.publicKey[0], recipientInfo.publicKey[1]]
      
      console.log('🔍 Transfer page - encryptedBalance:', encryptedBalance);
      console.log('🔍 Transfer page - currentBalance:', currentBalance.toString());
      
      await transfer(transferParams, currentBalance, recipientPublicKeyArray, encryptedBalance)
      
      setConfirming(false)
      setSuccessOpen(true)
      
      // Reset form
      setAmount("")
      setRecipient("")
      
    } catch (error) {
      console.error('Transfer failed:', error)
      setTransferError(error instanceof Error ? error.message : 'Transfer failed')
      setConfirming(false)
    }
  }

  // Show connection prompt if not ready
  if (!address || !selectedToken) {
    return (
      <div className="relative min-h-screen w-full overflow-hidden flex flex-col items-center justify-center font-sans text-white">
        {background}
        <div className="relative z-10 text-center space-y-4 px-6">
          <div className="w-16 h-16 mx-auto bg-white/10 border border-white/15 rounded-2xl flex items-center justify-center shadow-[0_16px_40px_rgba(0,0,0,0.45)]">
            <Wallet className="w-8 h-8 text-white/70" />
          </div>
          <h2 className="text-3xl font-semibold bg-gradient-to-b from-white via-zinc-300 to-zinc-500 bg-clip-text text-transparent tracking-tight">
            Connect Your Wallet
          </h2>
          <p className="text-white/70 text-sm sm:text-base max-w-md mx-auto">
            Please connect your wallet to start transferring encrypted tokens securely across the Tsunami network.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex flex-col font-sans text-white">
      {background}

      <header className="sticky top-0 z-30 px-4 sm:px-6 pt-6">
        <div className="max-w-6xl mx-auto">
          <div className="backdrop-blur-3xl backdrop-saturate-200 border border-white/15 rounded-2xl px-4 sm:px-6 py-3 flex items-center justify-between gap-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_16px_56px_rgba(0,0,0,0.35)]" style={{ background: "rgba(10,11,14,0.35)" }}>
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-2 text-xs sm:text-sm text-white/75 hover:text-white transition-colors font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-white/80 font-mono">
              <Wallet className="w-4 h-4 text-white" />
              <span>{address ? `${address.slice(0, 6)}…${address.slice(-4)}` : "0x…"}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1 w-full">
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 pt-16 pb-16 lg:pb-24 space-y-10">
          <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-6 lg:gap-10 items-start">
            <section className="relative rounded-[32px] overflow-hidden shadow-[0_24px_70px_rgba(0,0,0,0.55)]">
              <div className="absolute inset-0 opacity-45 pointer-events-none bg-[radial-gradient(120%_120%_at_50%_0%,rgba(255,255,255,0.18)_0%,rgba(255,255,255,0.08)_40%,rgba(255,255,255,0.03)_100%)]" />
              <div
                className="absolute -inset-1 rounded-[36px] pointer-events-none"
                style={{
                  background: "radial-gradient(80% 50% at 15% 0%, rgba(255,255,255,0.16), rgba(255,255,255,0) 60%)",
                }}
              />
              <div
                className="relative backdrop-blur-3xl backdrop-saturate-200 border border-white/15 rounded-[32px] p-6 sm:p-8 space-y-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_16px_56px_rgba(0,0,0,0.55)]"
                style={{ background: "rgba(10,11,14,0.35)" }}
              >
                <div className="text-center space-y-3">
                  <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight bg-gradient-to-b from-white via-zinc-300 to-zinc-500 bg-clip-text text-transparent">
                    Transfer Privately
                  </h1>
                  <p className="text-white/75 text-sm sm:text-base max-w-md mx-auto">
                    Send encrypted assets to another shielded account with end-to-end privacy protections.
                  </p>
                </div>

                <div className="space-y-7">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs sm:text-sm font-medium text-white/85">Token</label>
                      <span className="text-[11px] sm:text-xs text-white/60">Balance: {selectedToken?.balance.toFixed(6)} {selectedToken?.symbol}</span>
                    </div>
                    <button
                      onClick={() => setShowTokenModal(true)}
                      className="w-full text-left backdrop-blur-2xl border border-white/15 rounded-2xl px-5 py-4 flex items-center justify-between gap-3 hover:bg-white/10 transition-all duration-300 shadow-[inset_0_-1px_0_rgba(255,255,255,0.06)]"
                      style={{ background: "rgba(255,255,255,0.08)" }}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm">
                          <Shield className="w-4 h-4 text-[#0a0b0e]" />
                        </div>
                        <div>
                          <div className="text-base font-semibold text-white">{selectedToken?.symbol}</div>
                          <div className="text-xs text-white/65">{selectedToken?.name}</div>
                        </div>
                      </div>
                      <ChevronDown className="w-5 h-5 text-white" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs sm:text-sm font-medium text-white/85">Amount</label>
                      <button
                        onClick={setMax}
                        className="text-[11px] sm:text-xs text-[#e6ff55] font-semibold tracking-wide uppercase hover:brightness-110 transition"
                      >
                        Use max
                      </button>
                    </div>
                    <div
                      className="rounded-2xl backdrop-blur-2xl border border-white/15 p-5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06),0_10px_28px_rgba(0,0,0,0.45)]"
                      style={{ background: "rgba(255,255,255,0.08)" }}
                    >
                      <div className="relative">
                        <input
                          type="text"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="0.00"
                          className="w-full bg-transparent outline-none text-4xl sm:text-[44px] font-semibold tracking-tight text-white text-center"
                        />
                        <div className="absolute inset-x-0 -bottom-2 flex items-center justify-center text-xs text-white/55 uppercase tracking-widest">
                          {selectedToken?.symbol}
                        </div>
                      </div>
                      <div className="mt-5 flex items-center justify-between text-xs sm:text-sm text-white/70">
                        <span>≈ ${amountUsd.toFixed(2)}</span>
                        {insufficient && (
                          <span className="inline-flex items-center gap-1 text-rose-300 font-medium">
                            <AlertTriangle className="w-4 h-4" />
                            Insufficient balance
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-xs sm:text-sm font-medium text-white/85">Recipient address</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={recipient}
                        onChange={(e) => setRecipient(e.target.value)}
                        placeholder="0x…"
                        className="w-full rounded-2xl backdrop-blur-2xl border border-white/15 px-4 sm:px-5 py-4 sm:py-5 text-sm sm:text-base text-white placeholder:text-white/45 focus:outline-none focus:ring-2 focus:ring-white/20 focus:bg-white/10 transition-all duration-300 shadow-[inset_0_-1px_0_rgba(255,255,255,0.06)]"
                        style={{ background: "rgba(255,255,255,0.08)" }}
                      />
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 text-white">
                        {recipientInfo.isLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin text-white/60" />
                        ) : recipientInfo.isRegistered ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                        ) : recipient && recipientInfo.error ? (
                          <AlertTriangle className="w-4 h-4 text-rose-300" />
                        ) : null}
                      </div>
                    </div>
                    {recipient && !recipientInfo.isLoading && (
                      <div className="text-xs sm:text-sm">
                        {recipientInfo.isRegistered ? (
                          <span className="inline-flex items-center gap-1.5 text-emerald-300">
                            <User className="w-3 h-3" />
                            Registered shielded user
                          </span>
                        ) : recipientInfo.error ? (
                          <span className="text-rose-300">{recipientInfo.error}</span>
                        ) : (
                          <span className="text-white/70">User not registered</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <button
                      onClick={onConfirmTransfer}
                      disabled={!canTransfer || confirming !== false}
                      className="w-full h-14 rounded-full bg-[#e6ff55] text-[#0a0b0e] font-semibold text-sm sm:text-base tracking-tight hover:brightness-110 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 shadow-[0_12px_30px_rgba(230,255,85,0.35)]"
                    >
                      {confirming === "proof" ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Generating zk proof…
                        </>
                      ) : confirming === "execute" ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Executing transfer…
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          Transfer {selectedToken?.symbol}
                        </>
                      )}
                    </button>
                    {transferError && (
                      <div className="px-4 py-3 rounded-2xl bg-rose-500/15 border border-rose-500/35 text-rose-200 text-sm font-medium">
                        {transferError}
                      </div>
                    )}
                    <div className="flex items-center justify-center gap-2 text-xs text-white/60">
                      <Info className="w-4 h-4" />
                      <span>Transfers stay private with zk shielding and encrypted balances.</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <aside className="relative rounded-[28px] overflow-hidden shadow-[0_18px_54px_rgba(0,0,0,0.5)]">
              <div className="absolute inset-0 opacity-35 pointer-events-none bg-[radial-gradient(120%_120%_at_50%_0%,rgba(255,255,255,0.16)_0%,rgba(255,255,255,0.06)_45%,rgba(255,255,255,0.02)_100%)]" />
              <div
                className="absolute -inset-1 rounded-[32px] pointer-events-none"
                style={{
                  background: "radial-gradient(120% 70% at 0% 0%, rgba(230,255,85,0.22), rgba(230,255,85,0) 65%)",
                }}
              />
              <div
                className="relative backdrop-blur-3xl border border-white/15 rounded-[28px] p-6 space-y-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_12px_32px_rgba(0,0,0,0.5)]"
                style={{ background: "rgba(10,11,14,0.4)" }}
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold bg-gradient-to-b from-white via-zinc-300 to-zinc-500 bg-clip-text text-transparent">
                    Transfer summary
                  </h2>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-white/15 text-white/75 text-[11px] uppercase tracking-wide">
                    Shielded
                  </span>
                </div>

                <div className="space-y-4 text-sm text-white/75">
                  <div className="flex items-center justify-between">
                    <span className="text-white/60">From</span>
                    <span className="font-mono text-white/85">{address?.slice(0, 6)}…{address?.slice(-4)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/60">To</span>
                    <span className="font-mono text-white/85">{recipient ? `${recipient.slice(0, 6)}…${recipient.slice(-4)}` : "0x…"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/60">Amount</span>
                    <span className="text-white font-semibold">{amount || "0.00"} {selectedToken?.symbol}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/60">USD value</span>
                    <span className="text-white font-semibold">${amountUsd.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-white/60">Network</span>
                    <span className="text-white font-semibold">Sepolia</span>
                  </div>
                </div>

                <div className="space-y-3 text-xs text-white/70">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                    <span>Recipient must be registered to decrypt shielded funds.</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-300" />
                    <span>Transfers above compliance limits may require attestation review.</span>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>

      {/* Token Selection Modal */}
      {showTokenModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="backdrop-blur-xl bg-white/5 border border-white/15 rounded-lg w-full max-w-md max-h-[80vh] overflow-hidden shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_16px_56px_rgba(0,0,0,0.35)]">
            <div className="p-4 border-b border-white/15 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Select Token</h3>
              <button
                onClick={() => setShowTokenModal(false)}
                className="p-1 hover:bg-white/10 rounded transition-colors"
              >
                <X className="w-4 h-4 text-white/60" />
              </button>
            </div>
            
            <div className="max-h-96 overflow-y-auto">
              {tokens.map((token) => (
                <button
                  key={token.tokenAddress}
                  onClick={() => selectToken(token)}
                  className="w-full p-4 hover:bg-white/10 flex items-center gap-3 text-left transition-colors"
                >
                  <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
                    <Shield className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-white">{token.symbol}</div>
                    <div className="text-sm text-white/60">{token.name}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-white">{token.balance.toFixed(6)}</div>
                    <div className="text-xs text-white/60">${(token.balance * token.priceUsd).toFixed(2)}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {successOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="backdrop-blur-xl bg-white/5 border border-white/15 rounded-lg p-6 w-full max-w-md text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_16px_56px_rgba(0,0,0,0.35)]">
            <div className="w-16 h-16 mx-auto mb-4 bg-green-500/20 border border-green-500/40 rounded-full flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2 text-white">Transfer Complete!</h3>
            <p className="text-white/60 mb-6">
              Your encrypted tokens have been transferred successfully.
            </p>
            <div className="space-y-2">
              <button
                onClick={() => {
                  setSuccessOpen(false)
                  router.push('/dashboard')
                }}
                className="w-full p-3 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/40 text-white rounded-lg font-medium hover:from-purple-500/30 hover:to-pink-500/30 transition-all duration-300"
              >
                Back to Dashboard
              </button>
              <button
                onClick={() => setSuccessOpen(false)}
                className="w-full p-3 border border-white/15 rounded-lg font-medium hover:bg-white/10 text-white transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
