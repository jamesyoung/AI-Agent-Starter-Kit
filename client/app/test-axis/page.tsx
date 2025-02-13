"use client";

import { useLaunchQuery } from "@axis-finance/sdk/react";
import { useEffect, useRef } from "react";

export default function TestAxis() {
  const renderCount = useRef(0);
  const mountTime = useRef(new Date());

  // Debug mount/unmount
  useEffect(() => {
    const startTime = mountTime.current;
    const count = renderCount.current;
    
    console.log("[TestAxis] Component mounted", {
      renderCount: count,
      mountTime: startTime,
      timestamp: new Date()
    });

    return () => {
      console.log("[TestAxis] Component unmounting", {
        renderCount: count,
        mountDuration: Date.now() - startTime.getTime(),
        timestamp: new Date()
      });
    };
  }, []);

  // Debug each render
  console.log("[TestAxis] Rendering", {
    renderCount: ++renderCount.current,
    timestamp: new Date()
  });

  // Test with Mantle chainId (5000) and a sample lotId (1)
  const { data: launch, isLoading, error } = useLaunchQuery({
    chainId: 5000,
    lotId: 1
  });

  if (isLoading) {
    console.log("[TestAxis] Loading state");
    return <div>Loading launch data...</div>;
  }
  
  if (error) {
    console.error("[TestAxis] Error state:", error);
    return <div>Error: {error.message}</div>;
  }

  console.log("[TestAxis] Render with data:", launch);

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Launch Test</h1>
      <pre className="mt-4 p-4 bg-gray-100 rounded">
        {JSON.stringify(launch, null, 2)}
      </pre>
    </div>
  );
} 