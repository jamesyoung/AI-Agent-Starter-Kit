import { ErrorBoundary } from "@/app/_components/ErrorBoundary";
import { LaunchClient } from "./client";

interface PageProps {
  params: {
    chainId: string;
    lotId: string;
  }
}

export default async function LaunchPage({ params }: PageProps) {
  // Fix the params await issue
  const resolvedParams = await Promise.resolve(params);
  console.log("[LaunchPage] Resolved params:", {
    original: params,
    resolved: resolvedParams,
    time: new Date().toISOString()
  });

  return (
    <div id="launch-page-root">
      <ErrorBoundary>
        <LaunchClient 
          key={`launch-${resolvedParams.chainId}-${resolvedParams.lotId}`}
          chainId={resolvedParams.chainId} 
          lotId={resolvedParams.lotId} 
        />
      </ErrorBoundary>
    </div>
  );
} 