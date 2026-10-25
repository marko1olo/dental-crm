import React from "react";
import { Sparkles } from "lucide-react";

interface MobilePricesEmptyStateProps {
	searchQuery: string;
	onResetFilters: () => void;
	isSeeding: boolean;
	onSeedBaseline: () => void;
}

export const MobilePricesEmptyState: React.FC<MobilePricesEmptyStateProps> = ({
	searchQuery,
	onResetFilters,
	isSeeding,
	onSeedBaseline,
}) => {
	return (
		<div className="p-6 my-4 rounded-2xl bg-[var(--paper)] border border-[var(--line)] shadow-xs text-center flex flex-col items-center gap-3">
			<div className="w-12 h-12 rounded-full bg-[var(--teal-soft)] text-[var(--teal)] flex items-center justify-center shrink-0">
				<Sparkles size={24} />
			</div>
			<div className="flex flex-col gap-1">
				<h4 className="text-[16px] font-bold text-[var(--ink)]">
					{searchQuery ? "Ничего не найдено" : "Прейскурант услуг пуст"}
				</h4>
				<p className="text-[13px] text-[var(--muted)] leading-relaxed max-w-xs mx-auto">
					{searchQuery
						? "Проверьте поисковый запрос или сбросьте фильтры."
						: "Быстро наполните номенклатуру 30 базовыми стоматологическими услугами."}
				</p>
			</div>

			{searchQuery ? (
				<button
					type="button"
					onClick={onResetFilters}
					className="min-h-[40px] px-4 rounded-xl text-[13px] font-semibold bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)] active:scale-95 transition-transform cursor-pointer mt-1"
				>
					Сбросить фильтры
				</button>
			) : (
				<button
					type="button"
					disabled={isSeeding}
					onClick={onSeedBaseline}
					className="w-full min-h-[46px] h-11 px-4 rounded-xl text-[14px] font-bold bg-[var(--teal)] hover:bg-[var(--teal-dark)] text-white shadow-xs flex items-center justify-center gap-2 active:scale-[0.98] transition-transform cursor-pointer disabled:opacity-50 mt-1"
					data-testid="btn-mobile-seed-baseline"
				>
					<Sparkles size={16} />
					<span>
						{isSeeding ? "Наполнение каталога..." : "Заполнить прейскурант (30 услуг)"}
					</span>
				</button>
			)}
		</div>
	);
};
