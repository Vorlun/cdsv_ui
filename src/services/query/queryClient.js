import { QueryClient } from "@/services/query/reactQueryLite";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 15_000,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

