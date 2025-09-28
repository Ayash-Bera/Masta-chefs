"use client"

import { useState, useCallback } from 'react'
import { useAccount, useChainId, useReadContract, useWriteContract, useWaitForTransactionReceipt, useSignMessage } from 'wagmi'
import { EERC_CONTRACT, REGISTRAR_CONTRACT } from '../lib/contracts'
import { sepolia } from 'wagmi/chains'
import { formatEther, parseEther } from 'viem'
import { getDecryptedBalance, decryptEGCTBalance } from '../lib/balances/balances'
import { Base8, mulPointEscalar, subOrder } from '@zk-kit/baby-jubjub'
import { formatPrivKeyForBabyJub } from 'maci-crypto'
import { processPoseidonEncryption } from '../lib/poseidon/poseidon'
import { encryptMessage } from '../lib/jub/jub'
import * as snarkjs from 'snarkjs'
import { getCachedPrivateKey, getDerivedPrivateKey } from '../lib/signing-cache'

export interface TransferParams {
  tokenId: bigint
  amount: bigint
  recipient: string
}

export function useTransfer(tokenAddress?: `0x${string}`, tokenDecimals: number = 18) {
  const { address } = useAccount()
  const chainId = useChainId()
  const { signMessageAsync } = useSignMessage()
  const isOnCorrectChain = chainId === sepolia.id

  // Contract write operations
  const { writeContract, data: hash, isPending, error: writeError } = useWriteContract()
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash })

  // Get encrypted balance for the selected token
  const { data: encryptedBalanceData, isLoading: isLoadingBalance } = useReadContract({
    address: EERC_CONTRACT.address,
    abi: EERC_CONTRACT.abi,
    functionName: 'getBalanceFromTokenAddress',
    args: address && tokenAddress ? [address, tokenAddress] : undefined,
    chainId: sepolia.id,
    query: { enabled: !!address && !!tokenAddress && isOnCorrectChain }
  })

  // Get auditor public key
  const { data: auditorPublicKey, isLoading: isLoadingAuditor } = useReadContract({
    address: EERC_CONTRACT.address,
    abi: EERC_CONTRACT.abi,
    functionName: 'auditorPublicKey',
    chainId: sepolia.id,
    query: { enabled: isOnCorrectChain }
  })

  // Get user's public key
  const { data: userPublicKey, isLoading: isLoadingUserKey } = useReadContract({
    address: REGISTRAR_CONTRACT.address,
    abi: REGISTRAR_CONTRACT.abi,
    functionName: 'getUserPublicKey',
    args: address ? [address] : undefined,
    chainId: sepolia.id,
    query: { enabled: !!address && isOnCorrectChain }
  })

  // State for proof generation
  const [isGeneratingProof, setIsGeneratingProof] = useState(false)
  const [proofError, setProofError] = useState<string | null>(null)
  const [generatedProof, setGeneratedProof] = useState<any>(null)

  // Generate transfer proof
  const generateTransferProof = useCallback(async (params: TransferParams, currentBalance: bigint, recipientPublicKey: bigint[], encryptedBalanceData: any) => {
    if (!address || !userPublicKey || !auditorPublicKey || !encryptedBalanceData) {
      throw new Error('Missing required data for proof generation')
    }

    setIsGeneratingProof(true)
    setProofError(null)

    try {
      // Derive or reuse cached private key to avoid duplicate prompts
      let privateKey = getCachedPrivateKey(address)
      if (!privateKey) {
        privateKey = await getDerivedPrivateKey(address, signMessageAsync)
      }
      const formattedPrivateKey = formatPrivKeyForBabyJub(privateKey) % subOrder
      const userPublicKeyArray = mulPointEscalar(Base8, formattedPrivateKey).map((x) => BigInt(x)) as [bigint, bigint]

      // Normalize auditor public key (handle both object and array formats)
      const auditorX = BigInt(Array.isArray(auditorPublicKey) ? (auditorPublicKey as any)[0] : (auditorPublicKey as any).x)
      const auditorY = BigInt(Array.isArray(auditorPublicKey) ? (auditorPublicKey as any)[1] : (auditorPublicKey as any).y)
      const auditorPublicKeyArray: [bigint, bigint] = [auditorX, auditorY]

      // Scale amount from token decimals to circuit's internal decimals (2)
      const INTERNAL_DECIMALS = 2n
      const diff = BigInt(tokenDecimals) - INTERNAL_DECIMALS
      const valueToTransferInternal = diff >= 0n
        ? (params.amount / (10n ** diff))
        : (params.amount * (10n ** (-diff)))

      // Scale current balance to internal decimals
      const currentBalanceInternal = diff >= 0n
        ? (currentBalance / (10n ** diff))
        : (currentBalance * (10n ** (-diff)))

      // Check if encrypted balance exists
      const egct = (encryptedBalanceData as any)?.eGCT ?? (encryptedBalanceData as any)?.[0];
      console.log('🔍 Encrypted balance data structure:', encryptedBalanceData);
      console.log('🔍 Extracted eGCT:', egct);
      const isEgctZero = BigInt(egct?.c1?.x ?? 0) === 0n && BigInt(egct?.c1?.y ?? 0) === 0n && BigInt(egct?.c2?.x ?? 0) === 0n && BigInt(egct?.c2?.y ?? 0) === 0n;
      if (isEgctZero) {
        throw new Error('No encrypted balance found for the selected token')
      }

      // Decrypt EGCT to derive the sender's balance in internal (2) decimals
      const c1: [bigint, bigint] = [BigInt(egct.c1.x), BigInt(egct.c1.y)]
      const c2: [bigint, bigint] = [BigInt(egct.c2.x), BigInt(egct.c2.y)]
      const egctBalanceInternal = decryptEGCTBalance(privateKey, c1, c2)
      console.log('🔍 Decrypted EGCT balance (internal 2d):', egctBalanceInternal.toString())

      // Generate encrypted amounts for sender (VTTC - Value To Transfer Ciphertext)
      // For sender, we need to encrypt with sender's public key to prove ownership
      const { cipher: senderEncryptedAmount } = encryptMessage(
        userPublicKeyArray,
        valueToTransferInternal
      )

      // Generate encrypted amounts for receiver
      // For receiver, we encrypt with receiver's public key
      const recipientPublicKeyBig: [bigint, bigint] = [
        BigInt((recipientPublicKey as any)[0]),
        BigInt((recipientPublicKey as any)[1])
      ]
      const { cipher: receiverEncryptedAmount, random: receiverRandom } = encryptMessage(
        recipientPublicKeyBig,
        valueToTransferInternal
      )

      // Generate PCT (Poseidon Ciphertext) for receiver
      const { ciphertext: receiverCiphertext, nonce: receiverNonce, encRandom: receiverEncRandom, authKey: receiverAuthKey } = processPoseidonEncryption(
        [valueToTransferInternal],
        recipientPublicKey
      )

      // Generate PCT for auditor
      const { ciphertext: auditorCiphertext, nonce: auditorNonce, encRandom: auditorEncRandom, authKey: auditorAuthKey } = processPoseidonEncryption(
        [valueToTransferInternal],
        auditorPublicKeyArray
      )

      // Generate sender's new balance PCT
      const senderNewBalance = currentBalanceInternal - valueToTransferInternal
      const { ciphertext: senderCiphertext, nonce: senderNonce, encRandom: senderEncRandom, authKey: senderAuthKey } = processPoseidonEncryption(
        [senderNewBalance],
        userPublicKeyArray
      )

      const inputs = {
        ValueToTransfer: valueToTransferInternal.toString(),
        SenderPrivateKey: formattedPrivateKey.toString(),
        SenderPublicKey: [userPublicKeyArray[0].toString(), userPublicKeyArray[1].toString()],
        SenderBalance: egctBalanceInternal.toString(),
        SenderBalanceC1: [c1[0].toString(), c1[1].toString()],
        SenderBalanceC2: [c2[0].toString(), c2[1].toString()],
        SenderVTTC1: [senderEncryptedAmount[0][0].toString(), senderEncryptedAmount[0][1].toString()],
        SenderVTTC2: [senderEncryptedAmount[1][0].toString(), senderEncryptedAmount[1][1].toString()],
        ReceiverPublicKey: [recipientPublicKeyBig[0].toString(), recipientPublicKeyBig[1].toString()],
        ReceiverVTTC1: [receiverEncryptedAmount[0][0].toString(), receiverEncryptedAmount[0][1].toString()],
        ReceiverVTTC2: [receiverEncryptedAmount[1][0].toString(), receiverEncryptedAmount[1][1].toString()],
        ReceiverVTTRandom: receiverRandom.toString(),
        ReceiverPCT: receiverCiphertext.map(x => x.toString()),
        ReceiverPCTAuthKey: receiverAuthKey.map(x => x.toString()),
        ReceiverPCTNonce: receiverNonce.toString(),
        ReceiverPCTRandom: receiverEncRandom.toString(),
        AuditorPublicKey: [auditorX.toString(), auditorY.toString()],
        AuditorPCT: auditorCiphertext.map(x => x.toString()),
        AuditorPCTAuthKey: auditorAuthKey.map(x => x.toString()),
        AuditorPCTNonce: auditorNonce.toString(),
        AuditorPCTRandom: auditorEncRandom.toString(),
      }

      console.log('🔐 Generating transfer proof with inputs:', inputs)
      console.log('🔍 SenderBalanceC1:', inputs.SenderBalanceC1);
      console.log('🔍 SenderBalanceC2:', inputs.SenderBalanceC2);
      console.log('🔍 SenderVTTC1:', inputs.SenderVTTC1);
      console.log('🔍 SenderVTTC2:', inputs.SenderVTTC2);

      // Check if circuit files exist
      const wasmPath = '/circuits/TransferCircuit.wasm'
      const zkeyPath = '/circuits/TransferCircuit.groth16.zkey'
      
      try {
        const response = await fetch(wasmPath)
        if (!response.ok) {
          throw new Error(`Transfer circuit assets missing. Place TransferCircuit.wasm and TransferCircuit.groth16.zkey under /public/circuits`)
        }
      } catch (error) {
        throw new Error(`Transfer circuit assets missing. Place TransferCircuit.wasm and TransferCircuit.groth16.zkey under /public/circuits`)
      }

      const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        inputs,
        wasmPath,
        zkeyPath
      )

      const formattedProof = {
        proofPoints: {
          a: [proof.pi_a[0], proof.pi_a[1]],
          b: [[proof.pi_b[0][1], proof.pi_b[0][0]], [proof.pi_b[1][1], proof.pi_b[1][0]]],
          c: [proof.pi_c[0], proof.pi_c[1]]
        },
        publicSignals: publicSignals
      }

      console.log('✅ Transfer proof generated successfully!')
      return formattedProof

    } catch (error) {
      console.error('Error generating transfer proof:', error)
      setProofError(error instanceof Error ? error.message : 'Failed to generate proof')
      throw error
    } finally {
      setIsGeneratingProof(false)
    }
  }, [address, userPublicKey, auditorPublicKey, encryptedBalanceData, signMessageAsync, tokenDecimals])

  // Execute transfer
  const executeTransfer = useCallback(async (params: TransferParams, currentBalance: bigint, proof: any) => {
    if (!isOnCorrectChain) {
      throw new Error('Please switch to Sepolia network')
    }

    if (!address) {
      throw new Error('Please connect your wallet')
    }

    try {
      // Generate balance PCT for the new balance after transfer
      const newBalance = currentBalance - params.amount
      const balancePCT = [
        newBalance,
        0n,
        0n,
        0n,
        0n,
        0n,
        0n,
      ] as unknown as readonly [bigint, bigint, bigint, bigint, bigint, bigint, bigint]

      await writeContract({
        address: EERC_CONTRACT.address,
        abi: EERC_CONTRACT.abi,
        functionName: 'transfer',
        args: [params.recipient as `0x${string}`, params.tokenId, proof, balancePCT],
        chainId: sepolia.id,
      })

    } catch (error) {
      console.error('Error executing transfer:', error)
      throw error
    }
  }, [address, isOnCorrectChain, writeContract])

  // Combined transfer function
  const transfer = useCallback(async (params: TransferParams, currentBalance: bigint, recipientPublicKey: bigint[], encryptedBalanceData: any) => {
    try {
      // Generate proof if not already generated
      let proof = generatedProof
      if (!proof) {
        proof = await generateTransferProof(params, currentBalance, recipientPublicKey, encryptedBalanceData)
      }

      // Execute transfer
      await executeTransfer(params, currentBalance, proof)

      // Clear generated proof after successful execution
      setGeneratedProof(null)

    } catch (error) {
      console.error('Transfer failed:', error)
      throw error
    }
  }, [generatedProof, generateTransferProof, executeTransfer])

  return {
    // State
    isGeneratingProof,
    proofError,
    generatedProof,
    
    // Contract state
    isPending,
    isConfirming,
    isSuccess,
    hash,
    error: writeError,
    
    // Data
    encryptedBalanceData,
    isLoadingBalance,
    auditorPublicKey,
    isLoadingAuditor,
    userPublicKey,
    isLoadingUserKey,
    
    // Functions
    transfer,
    generateTransferProof,
    executeTransfer,
    
    // Utils
    isReady: !!(address && isOnCorrectChain && userPublicKey && auditorPublicKey && encryptedBalanceData)
  }
}
