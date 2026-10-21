import type React from "react";

export interface PatientJourneyFilterChipsProps {
	readonly searchQuery: string;
	readonly setSearchQuery: (q: string) => void;
}

const QUICK_SEARCH_TAGS = [
	"Пульпит",
	"Кариес",
	"Пломба",
	"Коффердам",
	"Артикаин",
	"Коронка",
	"Удаление",
	"Оплата",
];

export const PatientJourneyFilterChips: React.FC<
	PatientJourneyFilterChipsProps
> = ({ searchQuery, setSearchQuery }) => {
	return (
		<div className="dente-filter-chips flex items-center gap-1.5 flex-wrap pt-0.5">
			<span className="text-xs font-semibold text-[var(--muted)] mr-1">
				Быстрый фильтр:
			</span>
			{QUICK_SEARCH_TAGS.map((tag) => {
				const isActive = searchQuery.toLowerCase() === tag.toLowerCase();
				return (
					<button
						key={tag}
						type="button"
						onClick={() => setSearchQuery(isActive ? "" : tag)}
						data-active={isActive ? "true" : undefined}
						className={`dente-filter-chip min-h-[32px] h-8 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer border flex items-center gap-1 ${
							isActive
								? "active bg-[var(--teal)] text-white border-[var(--teal-dark,#0d9488)] shadow-2xs font-bold"
								: "bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:border-[var(--teal)] hover:bg-[var(--paper-soft)]"
						}`}
					>
						{tag}
					</button>
				);
			})}
		</div>
	);
};
