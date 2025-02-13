import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useLaunchQuery, useLaunchesQuery } from "@axis-finance/sdk/react";
import { useEffect, useRef } from "react";

// Mock data matching Axis SDK types
const MOCK_LAUNCH = {
  id: "0",
  chain: "5000",
  auctionHouse: "0x1234567890123456789012345678901234567890",
  lotId: "1",
  createdBlockNumber: "1",
  createdBlockTimestamp: new Date().toISOString(),
  createdDate: new Date().toISOString(),
  createdTransactionHash: "0x...",
  capacityInitial: "100000000000000000000",
  capacityRemaining: "100000000000000000000",
  info: {
    name: "Test Launch",
    description: "This is a test launch on Mantle testnet",
  },
  status: "active" as const,
  startDate: new Date().toISOString(),
  endDate: new Date(Date.now() + 86400000).toISOString(),
  totalBids: "0",
  totalAmount: "0",
  settled: false
};

export function useAxisLaunch(chainId?: number, lotId?: number) {
  const mountTime = useRef(new Date());
  const queryCount = useRef(0);
  
  // Log initial mount
  useEffect(() => {
    const startTime = mountTime.current;
    const currentCount = queryCount.current;
    
    console.log("[useAxisLaunch] Mounted", {
      mountTime: startTime,
      chainId,
      lotId,
      env: process.env.NODE_ENV
    });
    
    return () => {
      console.log("[useAxisLaunch] Unmounting", {
        mountDuration: Date.now() - startTime.getTime(),
        queryCount: currentCount,
        chainId,
        lotId
      });
    };
  }, [chainId, lotId]);

  // Validate params before query
  const validatedChainId = (!chainId || isNaN(chainId)) ? 0 : Number(chainId);
  const validatedLotId = (!lotId || isNaN(lotId)) ? 0 : Number(lotId);

  console.log("[useAxisLaunch] Preparing query", {
    originalParams: { chainId, lotId },
    validatedParams: { chainId: validatedChainId, lotId: validatedLotId },
    queryCount: ++queryCount.current
  });

  const result = useLaunchQuery({ 
    chainId: validatedChainId,
    lotId: validatedLotId
  });

  // Track query lifecycle
  useEffect(() => {
    console.log("[useAxisLaunch] Query state changed", {
      status: result.status,
      isLoading: result.isLoading,
      isFetching: result.isFetching,
      dataUpdatedAt: result.dataUpdatedAt ? new Date(result.dataUpdatedAt) : null,
      error: result.error ? {
        message: result.error.message,
        stack: result.error.stack
      } : null,
      hasData: !!result.data,
      queryCount: queryCount.current,
      timestamp: new Date()
    });
  }, [result.status, result.isLoading, result.isFetching, result.dataUpdatedAt, result.error, result.data]);

  // Invalid params check
  if (!chainId || !lotId || isNaN(chainId) || isNaN(lotId)) {
    console.log("[useAxisLaunch] Invalid params", { chainId, lotId });
    return { 
      ...result, 
      data: null, 
      error: new Error("Invalid chainId or lotId") 
    };
  }

  // Development mock data
  if (process.env.NODE_ENV === 'development' && !result.data && !result.error) {
    console.log("[useAxisLaunch] Using mock data", { chainId, lotId });
    return { 
      ...result, 
      data: MOCK_LAUNCH, 
      isLoading: false 
    };
  }

  console.log("[useAxisLaunch] Returning result", {
    hasData: !!result.data,
    status: result.status,
    queryCount: queryCount.current
  });

  return result;
}

export function useAllLaunches() {
  const result = useLaunchesQuery({});

  useEffect(() => {
    if (result.errors?.length) {
      console.error("[useAllLaunches] Query errors:", result.errors);
    }
    if (result.data) {
      console.log("[useAllLaunches] Query success:", {
        count: result.data?.length || 0,
        items: result.data
      });
    }
  }, [result.errors, result.data]);

  if (process.env.NODE_ENV === 'development' && (!result.data || result.data.length === 0)) {
    return { ...result, data: [MOCK_LAUNCH] };
  }

  return result;
}

export function useLaunchParticipants(chainId: number, lotId: number) {
  return useQuery({
    queryKey: ["launch", chainId, lotId, "participants"],
    queryFn: async () => {
      const { data } = await axios.get(
        `/api/axis/launch/${chainId}/${lotId}/participants`
      );
      return data;
    },
  });
} 