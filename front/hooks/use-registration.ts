'use client';

import { useWriteContract, useWaitForTransactionReceipt, useAccount, useSignMessage, useChainId } from 'wagmi';
import { REGISTRAR_CONTRACT } from '../lib/contracts';
import { sepolia } from 'wagmi/chains';
import { useState, useEffect } from 'react';
import { i0 } from '../lib/crypto-utils';
import { Base8, subOrder, mulPointEscalar } from "@zk-kit/baby-jubjub";
import { formatPrivKeyForBabyJub } from "maci-crypto";
import { poseidon3 } from "poseidon-lite";
import * as snarkjs from 'snarkjs';

export function useRegistration(refetchRegistrationStatus?: () => void) {
  const { writeContract, data: hash, isPending: isWritePending, error: writeError } = useWriteContract();
  const { address } = useAccount();
  const { signMessage, data: signature, isPending: isSigning, error: signError } = useSignMessage();
  const chainId = useChainId();
  const [isPreparingProof, setIsPreparingProof] = useState(false);
  const [proofError, setProofError] = useState<Error | null>(null);
  
  // Store the generated proof to use later when user clicks register
  const [generatedProof, setGeneratedProof] = useState<any>(null);
  
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // Log signature and generate private key when signature becomes available
  useEffect(() => {
    if (signature && address) {
      const handleProofGeneration = async () => {
        try {
          const privateKey = i0(signature);
          const formattedPrivateKey = formatPrivKeyForBabyJub(privateKey) % subOrder;
          const publicKey = mulPointEscalar(Base8, formattedPrivateKey).map((x) => BigInt(x.toString())) as [bigint, bigint];
          
          console.log('🔑 Generated private key:', formattedPrivateKey.toString());
          console.log('🔑 Generated public key:', publicKey.map(k => k.toString()));

          // Generate registration hash (matches eerc-frontend)
          const registrationHash = poseidon3([
            BigInt(chainId),
            formattedPrivateKey,
            BigInt(address)
          ]);

          console.log('🔐 Registration hash:', registrationHash.toString());

          // Generate zero-knowledge proof
          console.log('🔐 Generating zero-knowledge proof...');
          
          try {
            const inputs = {
              SenderPrivateKey: formattedPrivateKey,
              SenderPublicKey: publicKey,
              SenderAddress: BigInt(address),
              ChainID: BigInt(chainId),
              RegistrationHash: registrationHash,
            };

            console.log('📋 Circuit inputs:', inputs);
            console.log('📁 Loading circuit files...');

            // Generate proof using snarkjs
            const wasmPath = '/circuits/RegistrationCircuit.wasm';
            const zkeyPath = '/circuits/RegistrationCircuit.groth16.zkey';
            
            console.log('📁 WASM path:', wasmPath);
            console.log('🔑 ZKey path:', zkeyPath);

            const { proof, publicSignals } = await snarkjs.groth16.fullProve(
              inputs,
              wasmPath,
              zkeyPath
            );

            console.log('✅ Proof generated successfully!');
            console.log('🔐 Proof:', proof);
            console.log('📊 Public signals:', publicSignals);

            // Format proof for contract
            const formattedProof = {
              proofPoints: {
                a: [BigInt(proof.pi_a[0]), BigInt(proof.pi_a[1])] as readonly [bigint, bigint],
                b: [
                  [BigInt(proof.pi_b[0][1]), BigInt(proof.pi_b[0][0])],
                  [BigInt(proof.pi_b[1][1]), BigInt(proof.pi_b[1][0])]
                ] as readonly [readonly [bigint, bigint], readonly [bigint, bigint]],
                c: [BigInt(proof.pi_c[0]), BigInt(proof.pi_c[1])] as readonly [bigint, bigint]
              },
              publicSignals: (() => {
                const signals = publicSignals.map((signal: string) => BigInt(signal));
                if (signals.length !== 5) {
                  throw new Error(`Expected 5 public signals, got ${signals.length}`);
                }
                return [signals[0], signals[1], signals[2], signals[3], signals[4]] as const;
              })()
            };

            console.log('🎯 Formatted proof for contract:', formattedProof);
            setGeneratedProof(formattedProof);
            setIsPreparingProof(false);
            setProofError(null);
            
          } catch (proofError) {
            console.error('❌ Proof generation failed:', proofError);
            setProofError(proofError as Error);
            setIsPreparingProof(false);
          }

        } catch (error) {
          console.error('❌ Private key generation failed:', error);
          setProofError(error as Error);
          setIsPreparingProof(false);
        }
      };

      handleProofGeneration();
    }
  }, [signature, address, chainId]);

  // Auto-submit proof to blockchain when it's generated
  useEffect(() => {
    if (generatedProof && !isWritePending && !isConfirming && !isConfirmed) {
      console.log('🚀 AUTO-SUBMITTING REGISTRATION TO BLOCKCHAIN');
      console.log('📍 Contract Address:', REGISTRAR_CONTRACT.address);
      console.log('🌐 Target Network:', sepolia.name, '(Chain ID:', sepolia.id, ')');
      console.log('👤 User Address:', address);
      
      // Network validation
      if (chainId !== sepolia.id) {
        console.error('❌ Wrong network! Please switch to Ethereum Sepolia');
        setProofError(new Error('Please switch to Ethereum Sepolia network'));
        return;
      }
      
      const submitProof = async () => {
        try {
          console.log('📤 Submitting proof to contract...');
          await writeContract({
            address: REGISTRAR_CONTRACT.address,
            abi: REGISTRAR_CONTRACT.abi,
            functionName: 'register',
            args: [generatedProof],
            chainId: sepolia.id,
          });
          
          console.log('✅ Registration submitted to blockchain!');
          
          // Refetch registration status after successful submission
          if (refetchRegistrationStatus) {
            console.log('🔄 Refetching registration status after submission...');
            setTimeout(() => {
              refetchRegistrationStatus();
            }, 1000);
          }
          
        } catch (err) {
          console.error('❌ Registration submission error:', err);
          setProofError(err as Error);
        }
      };
      
      submitProof();
    }
  }, [generatedProof, isWritePending, isConfirming, isConfirmed, address, chainId, writeContract]);

  // Reset states when transaction is confirmed
  useEffect(() => {
    if (isConfirmed) {
      console.log('✅ Registration confirmed! Resetting states...');
      setIsPreparingProof(false);
      setGeneratedProof(null);
      setProofError(null);
      if (refetchRegistrationStatus) {
        refetchRegistrationStatus();
      }
    }
  }, [isConfirmed, refetchRegistrationStatus]);

  const register = async () => {
    if (!address) {
      console.error('❌ No wallet connected');
      return;
    }

    console.log('🔥 REGISTER FUNCTION CALLED');
    console.log('📍 Current state:', {
      hasProof: !!generatedProof,
      isPreparingProof,
      isWritePending,
      isSigning,
      isConfirming,
      isConfirmed,
      chainId,
      address
    });

    // If we already have a proof, submit it to the blockchain
    if (generatedProof) {
      console.log('🚀 SUBMITTING REGISTRATION TO BLOCKCHAIN');
      console.log('📍 Contract Address:', REGISTRAR_CONTRACT.address);
      console.log('🌐 Target Network:', sepolia.name, '(Chain ID:', sepolia.id, ')');
      console.log('👤 User Address:', address);
      
      // Network validation
      if (chainId !== sepolia.id) {
        console.error('❌ Wrong network! Please switch to Ethereum Sepolia');
        setProofError(new Error('Please switch to Ethereum Sepolia network'));
        return;
      }
      
      try {
        console.log('📤 Submitting proof to contract...');
        await writeContract({
          address: REGISTRAR_CONTRACT.address,
          abi: REGISTRAR_CONTRACT.abi,
          functionName: 'register',
          args: [generatedProof],
          chainId: sepolia.id,
        });
        
        console.log('✅ Registration submitted to blockchain!');
        
      } catch (err) {
        console.error('❌ Registration submission error:', err);
        setProofError(err as Error);
      }
      
      return;
    }

    // If no proof yet, start the signature process
    console.log('🔥 STARTING REGISTRATION PROCESS');
    console.log('📍 Contract Address:', REGISTRAR_CONTRACT.address);
    console.log('🌐 Target Network:', sepolia.name, '(Chain ID:', sepolia.id, ')');
    console.log('👤 User Address:', address);
    
    try {
      setIsPreparingProof(true);
      setProofError(null);
      
      const message = `eERC\nRegistering user with\n Address:${address.toLowerCase()}`;
      console.log('📝 Message to sign:', message);
      console.log('⚠️  This will prompt you to sign a message');
      
      await signMessage({ message });
      
      console.log('✅ Message signed successfully - generating proof...');
      
    } catch (err) {
      console.error('❌ Signature error:', err);
      setProofError(err as Error);
      setIsPreparingProof(false);
    }
  };

  return {
    register,
    isPending: isWritePending || isSigning || isPreparingProof,
    isPreparingProof: isSigning,
    isConfirming,
    isConfirmed,
    error: writeError || signError || proofError,
    hash,
    hasProofReady: !!generatedProof,
    signature
  };
}