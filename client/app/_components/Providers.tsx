"use client";

import { createSdk } from "@axis-finance/sdk";
import { OriginSdkProvider } from "@axis-finance/sdk/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createConfig, WagmiProvider, http } from "wagmi";
import { mantle } from "wagmi/chains";
import { hashFn } from "wagmi/query";

// Simple SDK initialization as shown in docs
const sdk = createSdk();

// Configure Wagmi
const config = createConfig({
  chains: [mantle],
  transports: { [mantle.id]: http() }
});

// Configure React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryKeyHashFn: hashFn
    }
  }
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={config}>
        <OriginSdkProvider sdk={sdk}>
          {children}
        </OriginSdkProvider>
      </WagmiProvider>
    </QueryClientProvider>
  );
} 