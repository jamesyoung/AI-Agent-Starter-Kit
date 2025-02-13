"use client";

import { useAllLaunches } from "@/app/_hooks/useAxisApi";
import { ErrorBoundary } from "@/app/_components/ErrorBoundary";
import Link from "next/link";
import { useEffect, useRef } from "react";

const CHAIN_IDS = {
  mantle: 5000,
  // Add other chain mappings as needed
} as const;

function LaunchContent() {
  const mountTime = useRef(new Date());
  const renderCount = useRef(0);
  const { data: launches, isLoading, errors } = useAllLaunches();

  useEffect(() => {
    const startTime = mountTime.current;
    const count = renderCount.current;

    console.log("[Launch] Component mounted", {
      renderCount: count,
      mountTime: startTime,
      launchesData: launches,
      isLoading,
      errors,
      hasData: Boolean(launches?.length)
    });

    return () => {
      console.log("[Launch] Component unmounting", {
        renderCount: count,
        mountDuration: Date.now() - startTime.getTime()
      });
    };
  }, [launches, isLoading, errors]);

  // Debug render
  console.log("[Launch] Rendering", {
    renderCount: ++renderCount.current,
    timestamp: new Date()
  });

  if (isLoading) return <div>Loading...</div>;
  if (errors?.length) return <div>Error loading launches: {errors[0].message}</div>;
  
  // Handle null/undefined data explicitly
  if (!launches) {
    console.error("[Launch] No launches data received");
    return (
      <div className="text-center py-10 text-gray-500">
        Unable to load launches. Please try again.
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Active Launches</h1>
        <Link 
          href="/launch/create" 
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Create Launch
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {launches
          .filter(launch => {
            // Filter out invalid launches
            const chainId = CHAIN_IDS[launch.chain as keyof typeof CHAIN_IDS] || Number(launch.chain);
            return !isNaN(chainId) && launch.lotId && launch.chain;
          })
          .map((launch) => {
            const chainId = CHAIN_IDS[launch.chain as keyof typeof CHAIN_IDS] || Number(launch.chain);
            
            return (
              <Link 
                key={`launch-${launch.chain}-${launch.lotId}`}
                href={`/launch/${chainId}/${launch.lotId}`}
                className="p-4 border rounded hover:shadow-lg transition-shadow"
              >
                <h2 className="text-xl font-semibold">
                  {launch.info?.name || 'Unnamed Launch'}
                </h2>
                <p className="text-gray-600 mt-2 line-clamp-2">
                  {launch.info?.description || 'No description available'}
                </p>
                <div className="mt-4 text-sm text-gray-500">
                  <p>Status: {launch.status || 'Unknown'}</p>
                  <p>Ends: {launch.endDate ? new Date(launch.endDate).toLocaleDateString() : 'TBD'}</p>
                </div>
              </Link>
            );
          })}
      </div>

      {launches.length === 0 && (
        <div className="text-center py-10 text-gray-500">
          No active launches found. Create one to get started!
        </div>
      )}
    </div>
  );
}

export default function LaunchPage() {
  return (
    <ErrorBoundary>
      <LaunchContent />
    </ErrorBoundary>
  );
} 