// SPDX-License-Identifier: MIT
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useReadContract, useChainId } from 'wagmi';
import { formatEther } from 'viem';
import { PRICE_ORACLE_ADDRESS, PRICE_ORACLE_ABI, PriceData } from '../lib/price-oracle';

export function usePriceOracle() {
  const chainId = useChainId();
  const [ethPrice, setEthPrice] = useState<PriceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<number>(Date.now());

  // Check if we're on Sepolia (where our oracle is deployed)
  const isOnSepolia = chainId === 11155111;

  // Read ETH/USD price from the oracle
  const { 
    data: priceData, 
    error: contractError, 
    refetch: refetchPrice,
    isLoading: isContractLoading 
  } = useReadContract({
    address: PRICE_ORACLE_ADDRESS as `0x${string}`,
    abi: PRICE_ORACLE_ABI,
    functionName: 'getHumanReadableEthUsdPrice',
    query: {
      enabled: isOnSepolia,
      refetchInterval: 30000, // Refetch every 30 seconds
      staleTime: 15000, // Consider data stale after 15 seconds
    }
  });

  // Process the price data when it changes
  useEffect(() => {
    if (!isOnSepolia) {
      // Fallback to hardcoded price for non-Sepolia networks
      setEthPrice({
        price: 2000,
        confidence: BigInt(0),
        publishTime: Date.now() / 1000,
        isStale: false,
        lastUpdated: new Date().toISOString()
      });
      setIsLoading(false);
      setError(null);
      return;
    }

    if (contractError) {
      console.error('Price oracle contract error:', contractError);
      setError(contractError.message);
      setIsLoading(false);
      return;
    }

    if (priceData && Array.isArray(priceData) && priceData.length >= 3) {
      try {
        const [humanPrice, confidence, publishTime] = priceData;
        
        // Convert the price from wei to a regular number
        const priceInUsd = parseFloat(formatEther(humanPrice as bigint));
        
        // Check if price is stale (older than 5 minutes)
        const currentTime = Date.now() / 1000;
        const priceAge = currentTime - Number(publishTime);
        const isStale = priceAge > 300; // 5 minutes
        
        setEthPrice({
          price: priceInUsd,
          confidence: confidence as bigint,
          publishTime: Number(publishTime),
          isStale,
          lastUpdated: new Date().toISOString()
        });
        
        setError(null);
      } catch (err) {
        console.error('Error processing price data:', err);
        setError('Failed to process price data');
      }
    }
    
    setIsLoading(isContractLoading);
  }, [priceData, contractError, isContractLoading, isOnSepolia]);

  // Manual refresh function
  const refreshPrice = useCallback(async () => {
    if (!isOnSepolia) return;
    
    setIsLoading(true);
    try {
      await refetchPrice();
      setLastRefresh(Date.now());
    } catch (err) {
      console.error('Error refreshing price:', err);
      setError('Failed to refresh price');
    }
  }, [refetchPrice, isOnSepolia]);

  // Auto-refresh every minute
  useEffect(() => {
    if (!isOnSepolia) return;

    const interval = setInterval(() => {
      refreshPrice();
    }, 60000); // 1 minute

    return () => clearInterval(interval);
  }, [refreshPrice, isOnSepolia]);

  return {
    ethPrice: ethPrice?.price || 2000, // Fallback to $2000
    ethPriceData: ethPrice,
    isLoading,
    error,
    isOnSepolia,
    lastRefresh,
    refreshPrice,
    // Helper function to get price for any token (for now just ETH)
    getTokenPrice: (symbol: string) => {
      if (symbol.toLowerCase().includes('eth')) {
        return ethPrice?.price || 2000;
      }
      return 1; // Fallback for other tokens
    },
    // Helper to check if price is recent
    isPriceStale: ethPrice?.isStale || false,
    // Formatted price display
    formattedPrice: ethPrice ? `$${ethPrice.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '$2,000'
  };
}