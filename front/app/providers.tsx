"use client"

import type React from "react"
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { config } from "../lib/wagmi-config"
import { Toaster } from "@/components/ui/sonner"
import { WagmiErrorBoundary } from "../components/wagmi-error-boundary"

export default function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        // Prevent aggressive retrying on wagmi errors
        retry: (failureCount, error) => {
          // Don't retry wagmi connector errors
          if (error?.message?.includes('connector') || error?.message?.includes('getChainId')) {
            return false
          }
          return failureCount < 3
        },
        staleTime: 1000 * 60 * 5, // 5 minutes
      },
    },
  })
  
  return (
    <WagmiErrorBoundary>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          {children}
          <Toaster position="bottom-right" richColors />
        </QueryClientProvider>
      </WagmiProvider>
    </WagmiErrorBoundary>
  )
}


