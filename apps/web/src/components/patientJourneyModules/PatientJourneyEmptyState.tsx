import type React from "react";

interface PatientJourneyEmptyStateProps {
	readonly searchQuery: string;
	readonly onResetSearch: () => void;
}

export const PatientJourneyEmptyState: React.FC<
	PatientJourneyEmptyStateProps
> = ({ searchQuery, onResetSearch }) => (
	<div className="p-6 text-center rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-2">
		<p className="text-xs sm:text-sm font-bold text-[var(--ink)] m-0">
			{searchQuery
				? `По запросу «${searchQuery}» ничего не найдено`
				: "Здесь пока нет записей"}
		</p>
		<span className="text-xs text-[var(--muted)]">
			{searchQuery
				? "Попробуйте изменить поисковую фразу"
				: "Записи на приём и оплаты появятся здесь автоматически."}
		</span>
		{searchQuery && (
			<div className="pt-2">
				<button
					type="button"
					onClick={onResetSearch}
					className="min-h-[36px] h-9 px-4 text-xs font-semibold rounded-xl bg-[var(--teal)] text-white hover:opacity-90 transition-colors cursor-pointer"
				>
					Сбросить фильтр
				</button>
			</div>
		)}
	</div>
);
