import { ArrowDownToLine, Package, Plus } from "lucide-react";
import React from "react";

export interface MobileCardsEmptyStateProps {
	readonly effectiveSearch: string;
	readonly onOpenWaybills?: (() => void) | undefined;
	readonly onOpenAddModal?: (() => void) | undefined;
}

export const MobileCardsEmptyState: React.FC<MobileCardsEmptyStateProps> = ({
	effectiveSearch,
	onOpenWaybills,
	onOpenAddModal,
}) => {
	return (
		<div className="p-6 text-center text-[var(--muted)] flex flex-col items-center gap-3 bg-[var(--paper)] rounded-2xl border border-[var(--line)]">
			<Package size={36} className="text-teal-600 dark:text-teal-400" />
			<span className="text-[var(--ink)] font-bold text-sm">
				{effectiveSearch ? `Ничего не найдено по запросу «${effectiveSearch}»` : "На складе пока нет материалов"}
			</span>
			<span className="text-xs text-[var(--muted)] max-w-xs">
				{effectiveSearch ? "Проверьте написание наименования или партии" : "Оформите приходную накладную или добавьте позицию вручную"}
			</span>
			<div className="flex flex-wrap items-center justify-center gap-2 mt-2">
				{onOpenWaybills && (
					<button
						type="button"
						onClick={onOpenWaybills}
						className="min-h-[44px] px-4 rounded-xl bg-[var(--teal)] text-white text-xs font-bold shadow-xs hover:bg-[var(--teal-dark,#0f766e)] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
					>
						<ArrowDownToLine size={15} />
						<span>Приходная накладная</span>
					</button>
				)}
				{onOpenAddModal && (
					<button
						type="button"
						onClick={onOpenAddModal}
						className="min-h-[44px] px-4 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] text-xs font-semibold hover:border-[var(--teal)] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
					>
						<Plus size={15} />
						<span>Создать позицию</span>
					</button>
				)}
			</div>
		</div>
	);
};

export default MobileCardsEmptyState;
