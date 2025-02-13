"use client";

import { useEffect, useState } from "react";

export function DebugPanel() {
  const [state, setState] = useState({
    sdk: null,
    query: null,
    wagmi: null,
  });

  useEffect(() => {
    // Poll state every second in development
    if (process.env.NODE_ENV === 'development') {
      const interval = setInterval(() => {
        setState({
          sdk: (window as any).sdk,
          query: (window as any).queryClient,
          wagmi: (window as any).wagmi,
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, []);

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className="fixed bottom-0 right-0 p-4 bg-black/80 text-white text-xs">
      <pre>{JSON.stringify(state, null, 2)}</pre>
    </div>
  );
} 