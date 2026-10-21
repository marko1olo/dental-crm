import React from "react";

export interface StockTablePaginationRowProps {
	readonly hasMore?: boolean | undefined;
	readonly remainingCount?: number | undefined;
	readonly onShowMore?: (() => void) | undefined;
}

export const StockTablePaginationRow: React.FC<StockTablePaginationRowProps> = ({
	hasMore,
	remainingCount,
	onShowMore,
}) => {
	if (!hasMore || !onShowMore) return null;

	return (
		<tr>
			<td colSpan={7} style={{ textAlign: "center", padding: "14px" }}>
				<button
					type="button"
					className="btn-inventory-show-more h-8 px-4 rounded-lg border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-xs font-semibold hover:border-[var(--teal)] transition-colors cursor-pointer inline-flex items-center gap-1.5"
					onClick={onShowMore}
					title="Подгрузить следующие материалы склада"
				>
					<span>Показать ещё 40 материалов (осталось {remainingCount ?? 0})</span>
				</button>
			</td>
		</tr>
	);
};

export default StockTablePaginationRow;
