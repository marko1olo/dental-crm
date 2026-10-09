import React from "react";
import type { AutoclaveLogsSlice } from "./types";

export interface AutoclavePaginationProps {
	readonly logsSlice: AutoclaveLogsSlice;
	readonly onLoadMore: () => void;
	readonly onLoadAll: () => void;
}

export function AutoclavePagination({
	logsSlice,
	onLoadMore,
	onLoadAll,
}: AutoclavePaginationProps) {
	if (!logsSlice.hasMore) return null;

	return (
		<div className="flex flex-col sm:flex-row items-center justify-center gap-2 py-3 px-2">
			<button
				type="button"
				data-testid="autoclave-load-more-btn"
				onClick={onLoadMore}
				className="sanpin-btn sanpin-btn-secondary w-full sm:w-auto touch-manipulation font-semibold text-xs"
				style={{ minHeight: "44px", padding: "0.5rem 1.25rem", borderRadius: "10px" }}
			>
				Показать ещё 50 циклов (осталось {logsSlice.remainingCount} из {logsSlice.totalCount})
			</button>
			<button
				type="button"
				data-testid="autoclave-load-all-btn"
				onClick={onLoadAll}
				className="sanpin-btn w-full sm:w-auto touch-manipulation text-xs text-[var(--muted)]"
				style={{ minHeight: "44px", padding: "0.5rem 1rem", borderRadius: "10px" }}
			>
				Все ({logsSlice.totalCount})
			</button>
		</div>
	);
}
