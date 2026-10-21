import type React from "react";
import { FDI_TOOTH_GROUPS } from "./fdiToothOptions.js";

export interface ImagingToothFilterBarProps {
	effectiveToothFilter: string;
	availableTeeth: string[];
	onToothChange: (tooth: string) => void;
}

export const ImagingToothFilterBar: React.FC<ImagingToothFilterBarProps> = ({
	effectiveToothFilter,
	availableTeeth,
	onToothChange,
}) => {
	return (
		<section
			className="imaging-tooth-filter-bar flex items-center justify-between gap-1.5 p-1 rounded-lg bg-[var(--paper-soft)] border border-[var(--line)] shadow-2xs select-none w-full"
			data-testid="imaging-tooth-filter-bar"
			aria-label="Фильтр по зубам формулы FDI"
		>
			<div className="flex items-center gap-1 overflow-x-auto py-0.5 no-scrollbar min-w-0 flex-1">
				<span className="text-[11px] font-bold text-[var(--muted)] px-1 shrink-0">
					Зуб:
				</span>
				<button
					type="button"
					className={`h-6 min-h-[24px] px-2 rounded text-[11px] font-semibold shrink-0 transition-colors cursor-pointer ${
						effectiveToothFilter === "all"
							? "bg-[var(--teal)] text-white shadow-2xs"
							: "bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:border-teal-500"
					}`}
					onClick={() => onToothChange("all")}
					data-testid="tooth-filter-all"
				>
					Все
				</button>
				{availableTeeth.map((tooth) => {
					const isSelected = effectiveToothFilter === tooth;
					return (
						<button
							key={tooth}
							type="button"
							className={`h-6 min-h-[24px] px-2 rounded text-[11px] font-semibold font-mono shrink-0 transition-colors cursor-pointer ${
								isSelected
									? "bg-[var(--teal)] text-white shadow-2xs"
									: "bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:border-teal-500"
							}`}
							onClick={() => onToothChange(isSelected ? "all" : tooth)}
							data-testid={`tooth-filter-${tooth}`}
							title={`Показать снимки для зуба ${tooth}`}
						>
							#{tooth}
						</button>
					);
				})}
			</div>
			<div className="flex items-center gap-1 shrink-0">
				<select
					className="h-6 min-h-[24px] px-1.5 text-[11px] font-medium rounded bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:border-teal-500 cursor-pointer focus:outline-none focus:ring-1 focus:ring-[var(--teal)]"
					value={effectiveToothFilter}
					onChange={(e) => onToothChange(e.target.value)}
					data-testid="fdi-tooth-select"
					aria-label="Выбрать зуб по формуле FDI"
					title="Выбрать любой зуб по классификации FDI (11..48, 51..85)"
				>
					<option value="all">Выбор зуба</option>
					{FDI_TOOTH_GROUPS.map((grp) => (
						<optgroup key={grp.label} label={grp.label}>
							{grp.options.map((opt) => (
								<option key={opt.value} value={opt.value}>
									{opt.label}
								</option>
							))}
						</optgroup>
					))}
				</select>
			</div>
		</section>
	);
};
