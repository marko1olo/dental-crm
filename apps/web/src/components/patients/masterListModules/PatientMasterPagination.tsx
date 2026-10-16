import React from "react";

interface PatientMasterPaginationProps {
	readonly displayedCount: number;
	readonly totalCount: number;
	readonly hasMore: boolean;
	readonly onLoadMore: (step?: number) => void;
	readonly onLoadAll: () => void;
}

export const PatientMasterPagination: React.FC<PatientMasterPaginationProps> = ({
	displayedCount,
	totalCount,
	hasMore,
	onLoadMore,
	onLoadAll,
}) => {
	if (!hasMore) return null;
	return (
		<div className="patient-list-pagination flex items-center justify-between p-2.5 my-1.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-xs text-[var(--muted)]">
			<span>Показано {displayedCount} из {totalCount} пациентов</span>
			<div className="flex items-center gap-2">
				<button
					type="button"
					className="secondary-button min-h-[32px] px-2.5 text-xs font-semibold rounded-lg"
					onClick={() => onLoadMore(50)}
				>
					Загрузить ещё 50
				</button>
				<button
					type="button"
					className="text-button min-h-[32px] px-2 text-xs text-[var(--teal)] font-medium hover:underline"
					onClick={onLoadAll}
				>
					Все ({totalCount})
				</button>
			</div>
		</div>
	);
};
