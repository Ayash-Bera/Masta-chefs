'use client';

import { useEffect, useState } from 'react';
import { useAccount, useChainId } from 'wagmi';

const CELO_SEPOLIA_CHAIN_ID = 11142220;

export function useAutoNetworkSwitch() {
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const [needsNetworkSwitch, setNeedsNetworkSwitch] = useState(false);

  useEffect(() => {
    if (isConnected && chainId !== CELO_SEPOLIA_CHAIN_ID) {
      setNeedsNetworkSwitch(true);
    } else {
      setNeedsNetworkSwitch(false);
    }
  }, [isConnected, chainId]);

  const forceNetworkSwitch = async () => {
    if (!window.ethereum) {
      console.error('No wallet detected');
      return false;
    }

    try {
      // First try to switch to the network
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${CELO_SEPOLIA_CHAIN_ID.toString(16)}` }],
        });
        return true;
      } catch (switchError: any) {
        // If the network doesn't exist, add it
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: `0x${CELO_SEPOLIA_CHAIN_ID.toString(16)}`,
                chainName: 'Celo Sepolia Testnet',
                nativeCurrency: {
                  name: 'S-CELO',
                  symbol: 'S-CELO',
                  decimals: 18,
                },
                rpcUrls: ['https://forno.celo-sepolia.celo-testnet.org'],
                blockExplorerUrls: ['https://celo-sepolia.blockscout.com'],
              },
            ],
          });
          return true;
        } else {
          throw switchError;
        }
      }
    } catch (error) {
      console.error('Failed to switch network:', error);
      return false;
    }
  };

  return {
    needsNetworkSwitch,
    isCorrectNetwork: chainId === CELO_SEPOLIA_CHAIN_ID,
    forceNetworkSwitch,
    currentChainId: chainId,
    targetChainId: CELO_SEPOLIA_CHAIN_ID
  };
}