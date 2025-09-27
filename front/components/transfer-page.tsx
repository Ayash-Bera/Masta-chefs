"use client"

import { useMemo, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAccount } from "wagmi"
import {
  ChevronDown,
  Info,
  CheckCircle2,
  AlertTriangle,
  Search,
  X,
  Loader2,
  ArrowRight,
  Wallet,
  ArrowLeft,
  Shield,
  User,
  Send,
} from "lucide-react"
import { useTransfer } from "../hooks/use-transfer"
import { useEncryptedBalance } from "../hooks/use-encrypted-balance"
import { useTokens } from "../hooks/use-tokens"
import { formatEther, parseEther, createPublicClient, http } from "viem"
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
      <div className="relative min-h-screen w-full overflow-hidden flex flex-col items-center justify-center bg-black text-white">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-white/10 rounded-full flex items-center justify-center">
            <Wallet className="w-8 h-8 text-white/60" />
          </div>
          <h2 className="text-2xl font-semibold text-white">Connect Your Wallet</h2>
          <p className="text-white/60">Please connect your wallet to start transferring encrypted tokens</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-black text-white">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 p-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="flex items-center gap-2 text-sm text-white/60">
            <Wallet className="w-4 h-4" />
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex min-h-screen">
        {/* Left Panel - Transfer Form */}
        <div className="flex-1 p-6 pt-24">
          <div className="max-w-md mx-auto space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold bg-gradient-to-b from-white via-zinc-300 to-zinc-500 bg-clip-text text-transparent">Transfer</h1>
              <p className="text-white/60">Send encrypted tokens to another registered user</p>
            </div>

            {/* Token Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/90">Token</label>
              <button
                onClick={() => setShowTokenModal(true)}
                className="w-full p-4 backdrop-blur-xl bg-white/5 border border-white/15 rounded-lg flex items-center justify-between hover:bg-white/10 transition-all duration-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_16px_56px_rgba(0,0,0,0.35)]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center">
                    <Shield className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-left">
                    <div className="font-medium text-white">{selectedToken?.symbol}</div>
                    <div className="text-sm text-white/60">{selectedToken?.name}</div>
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-white/60" />
              </button>
            </div>

            {/* Amount Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-white/90">Amount</label>
                <button
                  onClick={setMax}
                  className="text-xs text-white/60 hover:text-white hover:underline transition-colors"
                >
                  Max: {selectedToken?.balance.toFixed(6)} {selectedToken?.symbol}
                </button>
              </div>
              <div className="relative">
                <input
                  type="text"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full p-4 text-lg backdrop-blur-xl bg-white/5 border border-white/15 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/20 focus:bg-white/10 transition-all duration-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_16px_56px_rgba(0,0,0,0.35)]"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-white/60">
                  {selectedToken?.symbol}
                </div>
              </div>
              {insufficient && (
                <div className="flex items-center gap-2 text-sm text-red-400">
                  <AlertTriangle className="w-4 h-4" />
                  Insufficient balance
                </div>
              )}
            </div>

            {/* Recipient Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/90">Recipient Address</label>
              <div className="relative">
                <input
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="0x..."
                  className="w-full p-4 backdrop-blur-xl bg-white/5 border border-white/15 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-white/20 focus:bg-white/10 transition-all duration-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_16px_56px_rgba(0,0,0,0.35)]"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  {recipientInfo.isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-white/60" />
                  ) : recipientInfo.isRegistered ? (
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                  ) : recipient && recipientInfo.error ? (
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                  ) : null}
                </div>
              </div>
              {recipient && !recipientInfo.isLoading && (
                <div className="text-sm">
                  {recipientInfo.isRegistered ? (
                    <span className="text-green-400 flex items-center gap-1">
                      <User className="w-3 h-3" />
                      Registered user
                    </span>
                  ) : recipientInfo.error ? (
                    <span className="text-red-400">{recipientInfo.error}</span>
                  ) : (
                    <span className="text-white/60">User not registered</span>
                  )}
                </div>
              )}
            </div>

            {/* Transfer Button */}
            <button
              onClick={onConfirmTransfer}
              disabled={!canTransfer || confirming !== false}
              className="w-full p-4 bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/40 text-white rounded-lg font-medium hover:from-purple-500/30 hover:to-pink-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 flex items-center justify-center gap-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_16px_56px_rgba(0,0,0,0.35)]"
            >
              {confirming === "proof" ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating Proof...
                </>
              ) : confirming === "execute" ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Executing Transfer...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Transfer {selectedToken?.symbol}
                </>
              )}
            </button>

            {/* Error Display */}
            {transferError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
                {transferError}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel - Summary */}
        <div className="w-96 backdrop-blur-xl bg-white/5 border-l border-white/15 p-6 pt-24">
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-white">Transfer Summary</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/60">From</span>
                <span className="text-sm font-mono text-white">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/60">To</span>
                <span className="text-sm font-mono text-white">
                  {recipient ? `${recipient.slice(0, 6)}...${recipient.slice(-4)}` : "0x..."}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/60">Amount</span>
                <span className="text-sm text-white">
                  {amount || "0.00"} {selectedToken?.symbol}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/60">Value</span>
                <span className="text-sm text-white">${amountUsd.toFixed(2)}</span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/60">Network</span>
                <span className="text-sm text-white">Sepolia</span>
              </div>
            </div>

            <div className="pt-4 border-t border-white/15">
              <div className="flex items-center gap-2 text-sm text-white/60">
                <Info className="w-4 h-4" />
                <span>Both users must be registered to transfer encrypted tokens</span>
              </div>
            </div>
          </div>
        </div>
      </div>

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
