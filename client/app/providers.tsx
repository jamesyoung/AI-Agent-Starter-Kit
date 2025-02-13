"use client";

import { createConfig, WagmiProvider, http } from "wagmi";
import { mantle } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { hashFn } from "wagmi/query";
import { OriginSdkProvider } from "@axis-finance/sdk/react";
import { createSdk } from "@axis-finance/sdk";

const sdk = createSdk();

const config = createConfig({
  chains: [mantle],
  transports: { [mantle.id]: http() },
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryKeyHashFn: hashFn,
    },
  },
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