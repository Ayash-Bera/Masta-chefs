'use client'

import { http, createConfig } from 'wagmi'
import { mainnet, sepolia} from 'wagmi/chains'
import { injected } from 'wagmi/connectors'

export const config = createConfig({
  chains: [mainnet, sepolia],
  connectors: [
    injected({
      // Ensure proper connector configuration
      shimDisconnect: true,
    }),
  ],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
  // Add SSR configuration to prevent hydration issues
  ssr: true,
})

declare module 'wagmi' {
  interface Register {
    config: typeof config
  }
}
