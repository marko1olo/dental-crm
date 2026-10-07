import React from "react";
import { Cpu, ChevronDown, ChevronsDown } from "lucide-react";
import {
	DEFAULT_DOM_CHUNK_STEP,
	DEFAULT_DOM_PAGE_SIZE,
} from "../../utils/domVirtualizationHelper.js";

export interface InvoicesDomVirtualizationBarProps {
	listSlice: {
		displayedCount: number;
		totalCount: number;
		hasMore: boolean;
		remainingCount: number;
	};
	onLoadMore: () => void;
	onLoadAll: () => void;
	onCollapseLimit: () => void;
}

export const InvoicesDomVirtualizationBar: React.FC<InvoicesDomVirtualizationBarProps> = ({
	listSlice,
	onLoadMore,
	onLoadAll,
	onCollapseLimit,
}) => {
	return (
		<div
			className="mt-4 p-3 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs"
			data-testid="invoices-dom-virtualization-bar"
		>
			<div className="flex items-center gap-2 text-[var(--muted,#64748b)]">
				<Cpu
					size={15}
					className="text-teal-600 dark:text-teal-400 shrink-0"
				/>
				<span>
					Отображено{" "}
					<strong className="text-[var(--ink,#0f172a)] font-bold">
						{listSlice.displayedCount}
					</strong>{" "}
					из{" "}
					<strong className="text-[var(--ink,#0f172a)] font-bold">
						{listSlice.totalCount}
					</strong>{" "}
					счетов
					{listSlice.hasMore && (
						<span className="hidden md:inline text-[11px] opacity-75">
							{" "}
							(осталось {listSlice.remainingCount})
						</span>
					)}
				</span>
			</div>

			<div className="flex items-center gap-2 flex-wrap justify-center sm:justify-end">
				{listSlice.hasMore ? (
					<>
						<button
							type="button"
							onClick={onLoadMore}
							className="min-h-[44px] sm:min-h-0 sm:h-8 px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all active:scale-98"
							data-testid="btn-invoices-load-more"
						>
							<ChevronDown size={14} />
							<span>
								Показать ещё (+
								{Math.min(
									DEFAULT_DOM_CHUNK_STEP,
									listSlice.remainingCount,
								)}
								)
							</span>
						</button>

						<button
							type="button"
							onClick={onLoadAll}
							className="min-h-[44px] sm:min-h-0 sm:h-8 px-3 py-1.5 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] hover:bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
							data-testid="btn-invoices-load-all"
						>
							<ChevronsDown size={14} />
							<span>Показать все ({listSlice.totalCount})</span>
						</button>
					</>
				) : (
					listSlice.displayedCount > DEFAULT_DOM_PAGE_SIZE && (
						<button
							type="button"
							onClick={onCollapseLimit}
							className="min-h-[44px] sm:min-h-0 sm:h-8 px-3 py-1.5 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] hover:bg-[var(--paper,#ffffff)] text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
							data-testid="btn-invoices-collapse-limit"
						>
							<span>Свернуть до {DEFAULT_DOM_PAGE_SIZE}</span>
						</button>
					)
				)}
			</div>
		</div>
	);
};
