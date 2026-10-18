import React from "react";
import type { PatientCategoryFilter, PatientsFilterCounts } from "./types";

export interface PatientsCategorySegmentedBarProps {
	readonly categoryFilter: PatientCategoryFilter;
	readonly onCategoryFilterChange: (cat: PatientCategoryFilter) => void;
	readonly counts: PatientsFilterCounts;
}

export const PatientsCategorySegmentedBar: React.FC<PatientsCategorySegmentedBarProps> = ({
	categoryFilter,
	onCategoryFilterChange,
	counts,
}) => {
	const getItemClass = (isSelected: boolean) =>
		`dente-segmented-item h-8 min-h-[32px] px-3 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border select-none ${
			isSelected
				? "active bg-[var(--paper)] text-[var(--primary)] border-[var(--primary)]/30 shadow-xs font-bold"
				: "bg-transparent border-transparent text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--paper)]/60 font-semibold"
		}`;

	return (
		<div
			className="dente-segmented-bar inline-flex items-center shrink-0 p-0.5 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] gap-0.5 select-none"
			role="tablist"
			aria-label="Фильтры картотеки пациентов"
			data-testid="patients-category-segmented-bar"
		>
			<button
				type="button"
				role="tab"
				aria-selected={categoryFilter === "all"}
				data-active={categoryFilter === "all"}
				className={getItemClass(categoryFilter === "all")}
				onClick={() => onCategoryFilterChange("all")}
				data-testid="patient-filter-all"
			>
				Все {counts.countAll > 0 ? `(${counts.countAll})` : ""}
			</button>

			{counts.countTreatment !== undefined ? (
				<button
					type="button"
					role="tab"
					aria-selected={categoryFilter === "treatment"}
					data-active={categoryFilter === "treatment"}
					className={getItemClass(categoryFilter === "treatment")}
					onClick={() => onCategoryFilterChange("treatment")}
					data-testid="patient-filter-treatment"
				>
					На лечении {counts.countTreatment > 0 ? `(${counts.countTreatment})` : ""}
				</button>
			) : null}

			<button
				type="button"
				role="tab"
				aria-selected={categoryFilter === "primary"}
				data-active={categoryFilter === "primary"}
				className={getItemClass(categoryFilter === "primary")}
				onClick={() => onCategoryFilterChange("primary")}
				data-testid="patient-filter-primary"
			>
				Первичные {counts.countPrimary > 0 ? `(${counts.countPrimary})` : ""}
			</button>

			<button
				type="button"
				role="tab"
				aria-selected={categoryFilter === "debt"}
				data-active={categoryFilter === "debt"}
				className={getItemClass(categoryFilter === "debt")}
				onClick={() => onCategoryFilterChange("debt")}
				data-testid="patient-filter-debt"
			>
				Должники {counts.countDebt > 0 ? `(${counts.countDebt})` : ""}
			</button>

			<button
				type="button"
				role="tab"
				aria-selected={categoryFilter === "archive"}
				data-active={categoryFilter === "archive"}
				className={getItemClass(categoryFilter === "archive")}
				onClick={() => onCategoryFilterChange("archive")}
				data-testid="patient-filter-archive"
			>
				Архив {counts.countArchive > 0 ? `(${counts.countArchive})` : ""}
			</button>
		</div>
	);
};
