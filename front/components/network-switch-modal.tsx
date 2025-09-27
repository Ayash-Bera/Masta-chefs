'use client';

import React, { useState, useEffect } from 'react';
import { useChainId } from 'wagmi';
import { AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NetworkSwitchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNetworkSwitched: () => void;
  targetChainId?: number;
  targetNetworkName?: string;
}

const CELO_SEPOLIA_CHAIN_ID = 11142220;
const CELO_SEPOLIA_CONFIG = {
  chainId: CELO_SEPOLIA_CHAIN_ID,
  chainName: 'Celo Sepolia Testnet',
  nativeCurrency: {
    name: 'S-CELO',
    symbol: 'S-CELO',
    decimals: 18,
  },
  rpcUrls: ['https://forno.celo-sepolia.celo-testnet.org'],
  blockExplorerUrls: ['https://celo-sepolia.blockscout.com'],
};

export function NetworkSwitchModal({
  isOpen,
  onClose,
  onNetworkSwitched,
  targetChainId = CELO_SEPOLIA_CHAIN_ID,
  targetNetworkName = 'Celo Sepolia Testnet'
}: NetworkSwitchModalProps) {
  const currentChainId = useChainId();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if network switched successfully
  useEffect(() => {
    if (isOpen && currentChainId === targetChainId && isLoading) {
      setIsLoading(false);
      onNetworkSwitched();
      onClose();
    }
  }, [currentChainId, targetChainId, isOpen, isLoading, onNetworkSwitched, onClose]);

  const handleSwitchNetwork = async () => {
    if (!window.ethereum) {
      setError('No wallet detected. Please install MetaMask or another Web3 wallet.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // First try to switch to the network
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${targetChainId.toString(16)}` }],
        });
      } catch (switchError: any) {
        // If the network doesn't exist, add it
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: `0x${targetChainId.toString(16)}`,
                chainName: CELO_SEPOLIA_CONFIG.chainName,
                nativeCurrency: CELO_SEPOLIA_CONFIG.nativeCurrency,
                rpcUrls: CELO_SEPOLIA_CONFIG.rpcUrls,
                blockExplorerUrls: CELO_SEPOLIA_CONFIG.blockExplorerUrls,
              },
            ],
          });
        } else {
          throw switchError;
        }
      }

    } catch (error: any) {
      console.error('Error switching/adding network:', error);
      setError(error.message || 'Failed to switch network');
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const isCorrectNetwork = currentChainId === targetChainId;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-black border border-white/20 rounded-2xl p-6 max-w-md w-full shadow-2xl">
        <div className="text-center">
          {!isCorrectNetwork ? (
            <>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-orange-500/20 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-orange-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Switch Network Required</h2>
              <p className="text-white/70 mb-6">
                To continue with KYC verification, please switch to {targetNetworkName}.
              </p>

              <div className="space-y-3">
                <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                  <div className="text-sm text-white/60 mb-1">Current Network:</div>
                  <div className="text-white font-medium">Chain ID: {currentChainId}</div>
                </div>

                <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                  <div className="text-sm text-blue-300 mb-1">Required Network:</div>
                  <div className="text-blue-300 font-medium">{targetNetworkName}</div>
                  <div className="text-xs text-blue-300/70">Chain ID: {targetChainId}</div>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg mb-4">
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <Button
                  onClick={onClose}
                  variant="outline"
                  className="flex-1 bg-transparent border-white/15 text-white/70 hover:bg-white/5"
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSwitchNetwork}
                  disabled={isLoading}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Switching...
                    </>
                  ) : (
                    'Switch Network'
                  )}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
              <h2 className="text-xl font-bold text-green-400 mb-2">Network Switched Successfully!</h2>
              <p className="text-white/70 mb-6">
                You're now connected to {targetNetworkName}. You can continue with the onboarding process.
              </p>

              <Button
                onClick={onClose}
                className="w-full bg-green-600 hover:bg-green-700 text-white"
              >
                Continue
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}