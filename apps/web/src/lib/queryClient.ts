/**
 * apps/web/src/lib/queryClient.ts
 *
 * Единый канонический экземпляр QueryClient для React Query (TanStack Query) в DENTE CRM.
 */
import React, { useContext } from "react";
import { QueryClient, QueryClientContext, QueryClientProvider } from "@tanstack/react-query";

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

/**
 * Безопасная обёртка: не создаёт дублирующий QueryClientProvider внутри живого дерева,
 * но обеспечивает единый denteQueryClient в изолированных unit-тестах без AppShell/App.
 */
export function DenteQueryClientProvider({ children }: { readonly children: React.ReactNode }) {
	const existingClient = useContext(QueryClientContext);
	if (existingClient) {
		return React.createElement(React.Fragment, null, children);
	}
	return React.createElement(QueryClientProvider, { client: denteQueryClient }, children);
}
