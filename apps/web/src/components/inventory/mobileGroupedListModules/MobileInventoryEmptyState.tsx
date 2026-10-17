import { Package } from "lucide-react";
import React from "react";

export interface MobileInventoryEmptyStateProps {
	readonly searchQuery: string;
	readonly onClearSearch: () => void;
}

export const MobileInventoryEmptyState: React.FC<MobileInventoryEmptyStateProps> = ({
	searchQuery,
	onClearSearch,
}) => {
	const isSearching = Boolean(searchQuery.trim());

	return (
		<div className="p-8 text-center flex flex-col items-center justify-center gap-3 text-[var(--muted)]">
			<Package size={36} className="opacity-40" />
			<div className="font-semibold text-sm text-[var(--ink)]">
				{isSearching
					? `По запросу «${searchQuery}» ничего не найдено`
					: "В выбранной категории нет материалов"}
			</div>
			<p className="text-xs max-w-xs">
				{isSearching
					? "Проверьте правильность написания или сбросьте фильтры поиска."
					: "Нажмите кнопку ниже, чтобы оприходовать новую партию расходников."}
			</p>
			{isSearching && (
				<button
					type="button"
					className="mt-2 h-9 px-4 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] text-xs font-semibold text-[var(--ink)] cursor-pointer"
					onClick={onClearSearch}
				>
					Сбросить поиск
				</button>
			)}
		</div>
	);
};
