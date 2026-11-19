/**
 * apps/web/src/lib/queryClient.ts
 *
 * Единый канонический экземпляр QueryClient для React Query (TanStack Query) в DENTE CRM.
 */
import { QueryClient } from "@tanstack/react-query";

export const denteQueryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 1000 * 60 * 5, // 5 минут
			gcTime: 1000 * 60 * 30, // 30 минут
			retry: 1,
			refetchOnWindowFocus: false,
		},
		mutations: {
			retry: 0,
		},
	},
});
