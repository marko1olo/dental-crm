/**
 * ImagingHeaderFilterTabs.tsx — Вкладки фильтрации типов исследований (Мандат 8b <= 120 строк).
 */

import React from "react";

export const COMPACT_FILTER_TABS: Array<{ key: string; label: string }> = [
	{ key: "all", label: "Все" },
	{ key: "periapical", label: "RVG" },
	{ key: "opg", label: "ОПТГ" },
	{ key: "cbct", label: "КТ" },
	{ key: "photo", label: "Фото" },
];

interface Props {
	imagingKindFilter?: string | undefined;
	setImagingKindFilter: (filter: string) => void;
}

export const ImagingHeaderFilterTabs: React.FC<Props> = ({
	imagingKindFilter = "all",
	setImagingKindFilter,
}) => {
	return (
		<nav
			className="imaging-kind-filter inline-flex items-center p-0.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] shrink-0 h-9 min-h-[36px]"
			role="tablist"
			aria-label="Фильтр типа снимка"
		>
			{COMPACT_FILTER_TABS.map((tab) => {
				const isSelected = imagingKindFilter === tab.key;
				return (
					<button
						key={tab.key}
						type="button"
						role="tab"
						aria-selected={isSelected}
						onClick={() => setImagingKindFilter(tab.key)}
						className={`h-8 min-h-[32px] px-2.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
							isSelected
								? "bg-[var(--paper-soft)] text-[var(--ink)] font-bold shadow-xs border border-[var(--line)]"
								: "text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper-soft)] border border-transparent"
						}`}
					>
						{tab.label}
					</button>
				);
			})}
		</nav>
	);
};
