import React from "react";
import { FolderArchive } from "lucide-react";

export const OutpatientArchiveEmptyState: React.FC = () => (
	<div
		data-testid="archive-empty-state"
		className="p-8 text-center bg-[var(--paper-soft,#f8fafc)] border border-dashed border-[var(--line,#cbd5e1)] rounded-xl text-[var(--muted,#64748b)]"
	>
		<FolderArchive size={32} className="mx-auto mb-2 opacity-60" />
		<p className="m-0 text-[13px] font-semibold text-[var(--ink,#0f172a)]">
			В архиве нет документов по выбранному фильтру
		</p>
		<p className="mt-1 text-xs">
			Воспользуйтесь кнопками выше для моментальной печати чистых бланков («________»)
		</p>
	</div>
);

interface OutpatientArchivePaginationProps {
	totalCount: number;
	remainingCount: number;
	onLoadMore: () => void;
	onLoadAll: () => void;
}

export const OutpatientArchivePagination: React.FC<OutpatientArchivePaginationProps> = ({
	totalCount,
	remainingCount,
	onLoadMore,
	onLoadAll,
}) => (
	<div className="flex items-center justify-center gap-2 mt-3 py-2">
		<button
			type="button"
			data-testid="archive-load-more-btn"
			onClick={onLoadMore}
			className="min-h-[44px] sm:min-h-8 sm:h-8 px-4 text-[13px] font-medium rounded-lg secondary-button cursor-pointer inline-flex items-center gap-1.5"
		>
			<span>Показать ещё ({remainingCount} из {totalCount})</span>
		</button>

		<button
			type="button"
			data-testid="archive-load-all-btn"
			onClick={onLoadAll}
			className="min-h-[44px] sm:min-h-8 sm:h-8 px-3 text-[13px] font-medium rounded-lg ghost-button cursor-pointer"
		>
			<span>Показать все</span>
		</button>
	</div>
);
