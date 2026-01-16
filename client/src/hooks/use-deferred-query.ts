import { useQuery, UseQueryOptions, UseQueryResult } from "@tanstack/react-query";
import { useState, useEffect } from "react";

export function useDeferredQuery<
  TQueryFnData = unknown,
  TError = Error,
  TData = TQueryFnData,
>(
  options: UseQueryOptions<TQueryFnData, TError, TData>
): UseQueryResult<TData, TError> {
  const [isIdle, setIsIdle] = useState(false);

  useEffect(() => {
    if ('requestIdleCallback' in window) {
      const id = requestIdleCallback(() => setIsIdle(true), { timeout: 2000 });
      return () => cancelIdleCallback(id);
    } else {
      const timer = setTimeout(() => setIsIdle(true), 100);
      return () => clearTimeout(timer);
    }
  }, []);

  return useQuery({
    ...options,
    enabled: isIdle && (options.enabled !== false),
  });
}
