"use client"

import type React from "react"
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { config } from "../lib/wagmi-config"
import { Toaster } from "@/components/ui/sonner"

export default function Providers({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient()
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster position="top-right" richColors />
      </QueryClientProvider>
    </WagmiProvider>
  )
}


