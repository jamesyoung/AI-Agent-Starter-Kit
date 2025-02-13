"use client";

import { useLaunchQuery } from "@axis-finance/sdk/react";
import { useBid } from "@axis-finance/sdk/react";
import { parseUnits } from "viem";
import Link from "next/link";
import { useState, type ReactNode, useEffect, useRef } from "react";

// Separate bid form to avoid re-renders
function BidForm({ chainId, lotId }: { chainId: number; lotId: number }) {
  console.log("[BidForm] Rendering", { chainId, lotId });
  const [amount, setAmount] = useState("10");
  
  const { submit, isWaiting, error: bidError } = useBid({
    chainId,
    lotId,
    amountIn: parseUnits(amount, 18),
    amountOut: parseUnits((Number(amount) * 2).toString(), 18),
    bidderAddress: "0x123..." as `0x${string}`,
    referrerAddress: "0x456..." as `0x${string}`,
    callbackData: "0x"
  });

  return (
    <div className="border-t pt-6">
      <h2 className="text-xl font-semibold mb-4">Place Bid</h2>
      <div className="flex gap-2">
        <input 
          type="number"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          className="border p-2 rounded flex-grow"
          placeholder="Enter amount"
          min="0"
        />
        <button 
          onClick={() => submit?.()}
          disabled={isWaiting}
          className="bg-blue-500 text-white px-6 py-2 rounded disabled:opacity-50 hover:bg-blue-600 transition-colors"
        >
          {isWaiting ? 'Processing...' : 'Place Bid'}
        </button>
      </div>
      {bidError && (
        <div className="mt-2 text-red-500 bg-red-50 p-2 rounded">
          Error: {bidError.message}
        </div>
      )}
    </div>
  );
}

export function LaunchClient({ chainId, lotId }: { chainId: string; lotId: string }): ReactNode {
  const renderCount = useRef(0);
  renderCount.current++;

  // Track component lifecycle
  useEffect(() => {
    const id = `launch-${chainId}-${lotId}`;
    const count = renderCount.current;  // Capture current value
    
    console.log("[LaunchClient] Mounted", { 
      id,
      renderCount: count,
      time: new Date().toISOString()
    });

    return () => {
      console.log("[LaunchClient] Unmounting", { 
        id,
        renderCount: count,  // Use captured value
        time: new Date().toISOString()
      });
    };
  }, [chainId, lotId]);

  // Debug query setup
  console.log("[LaunchClient] Setting up query", {
    chainId: Number(chainId),
    lotId: Number(lotId),
    renderCount: renderCount.current
  });

  const {
    data: launch,
    status,
    error: launchError,
    isLoading,
    isFetching,
    dataUpdatedAt
  } = useLaunchQuery({
    chainId: Number(chainId),
    lotId: Number(lotId)
  });

  // Track query state
  useEffect(() => {
    console.log("[LaunchClient] Query updated", {
      hasData: !!launch,
      status,
      error: launchError?.message,
      isLoading,
      isFetching,
      dataUpdatedAt: new Date(dataUpdatedAt).toISOString(),
      renderCount: renderCount.current
    });
  }, [launch, status, launchError, isLoading, isFetching, dataUpdatedAt]);

  // Loading state
  if (isLoading || isFetching) {
    console.log("[LaunchClient] Loading", { renderCount: renderCount.current });
    return (
      <div id={`loading-${chainId}-${lotId}`} className="p-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/4 mb-4" />
        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
      </div>
    );
  }

  // Error state
  if (launchError) {
    console.log("[LaunchClient] Error", { 
      error: launchError,
      renderCount: renderCount.current 
    });
    return (
      <div id={`error-${chainId}-${lotId}`} className="p-4 bg-red-50 text-red-600 rounded">
        <h2 className="font-semibold">Error Loading Launch</h2>
        <p>{launchError.message}</p>
      </div>
    );
  }

  // Not found state
  if (!launch) {
    console.log("[LaunchClient] Not found", { renderCount: renderCount.current });
    return (
      <div id={`not-found-${chainId}-${lotId}`} className="p-4">
        Launch not found
      </div>
    );
  }

  // Success state
  console.log("[LaunchClient] Success", { 
    launchInfo: launch.info,
    renderCount: renderCount.current 
  });

  return (
    <div id={`launch-${chainId}-${lotId}`} className="p-4 max-w-4xl mx-auto">
      <Link href="/launch" className="text-blue-500 hover:underline mb-4 inline-block">
        ← Back to Launches
      </Link>
      
      <div className="mt-4 bg-white rounded-lg shadow p-6">
        <h1 className="text-3xl font-bold mb-2">
          {launch.info?.name || 'Untitled Launch'}
        </h1>
        <p className="text-gray-600 mb-6">
          {launch.info?.description || 'No description available'}
        </p>

        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <h2 className="font-semibold mb-2">Launch Details</h2>
          <div className="space-y-2">
            <p>Status: {status}</p>
            <p>Chain ID: {chainId}</p>
            <p>Lot ID: {lotId}</p>
          </div>
        </div>

        <BidForm chainId={Number(chainId)} lotId={Number(lotId)} />
      </div>
    </div>
  );
} 