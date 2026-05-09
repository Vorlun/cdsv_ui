import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

const QueryClientContext = createContext(null);

export class QueryClient {
  constructor(options = {}) {
    this.options = options;
    this.cache = new Map();
  }
}

const DEFAULT_CLIENT = new QueryClient();

export function QueryClientProvider({ client, children }) {
  return <QueryClientContext.Provider value={client ?? DEFAULT_CLIENT}>{children}</QueryClientContext.Provider>;
}

export function useQuery({ queryKey, queryFn, refetchInterval }) {
  const client = useContext(QueryClientContext) ?? DEFAULT_CLIENT;
  const key = useMemo(() => JSON.stringify(queryKey ?? []), [queryKey]);
  const queryFnRef = useRef(queryFn);
  const mountedRef = useRef(false);
  const inFlightRef = useRef(null);
  const cached = client.cache.get(key);
  const [data, setData] = useState(() => cached?.data ?? null);
  const [error, setError] = useState(() => cached?.error ?? null);
  const [isLoading, setIsLoading] = useState(() => !cached);
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    queryFnRef.current = queryFn;
  }, [queryFn]);

  useEffect(() => {
    const entry = client.cache.get(key);
    setData(entry?.data ?? null);
    setError(entry?.error ?? null);
    setIsLoading(!entry);
  }, [client, key]);

  const runQuery = useCallback(async () => {
    if (inFlightRef.current) return inFlightRef.current;
    setIsFetching(true);
    const promise = (async () => {
      try {
        const next = await queryFnRef.current();
        client.cache.set(key, { data: next, error: null, updatedAt: Date.now() });
        if (mountedRef.current) {
          setData((prev) => (Object.is(prev, next) ? prev : next));
          setError(null);
        }
        return { data: next };
      } catch (err) {
        const previous = client.cache.get(key)?.data ?? null;
        client.cache.set(key, { data: previous, error: err, updatedAt: Date.now() });
        if (mountedRef.current) setError(err);
        return { error: err };
      } finally {
        inFlightRef.current = null;
        if (mountedRef.current) {
          setIsFetching(false);
          setIsLoading(false);
        }
      }
    })();
    inFlightRef.current = promise;
    return promise;
  }, [client, key]);

  useEffect(() => {
    mountedRef.current = true;
    void runQuery();
    return () => {
      mountedRef.current = false;
    };
  }, [runQuery]);

  useEffect(() => {
    if (!refetchInterval) return undefined;
    const id = window.setInterval(() => {
      void runQuery();
    }, refetchInterval);
    return () => window.clearInterval(id);
  }, [refetchInterval, runQuery]);

  return {
    data,
    error,
    isLoading,
    isFetching,
    isError: Boolean(error),
    refetch: runQuery,
  };
}

