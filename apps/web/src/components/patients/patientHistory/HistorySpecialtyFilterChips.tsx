import React from "react";
import { type ClinicalSpecialty, SPECIALTY_FILTERS } from "./types";

interface HistorySpecialtyFilterChipsProps {
	selectedSpecialty: ClinicalSpecialty;
	onSelectSpecialty: (specialty: ClinicalSpecialty) => void;
	totalVisitsCount: number;
	getSpecialtyCount: (specialty: ClinicalSpecialty) => number;
}

export const HistorySpecialtyFilterChips: React.FC<HistorySpecialtyFilterChipsProps> = ({
	selectedSpecialty, onSelectSpecialty, totalVisitsCount, getSpecialtyCount,
}) => {
	return (
		<div className="clinical-timeline-filters" data-testid="timeline-specialty-filters">
			{SPECIALTY_FILTERS.map((filter) => {
				const count = filter.id === "all" ? totalVisitsCount : getSpecialtyCount(filter.id);
				const isActive = selectedSpecialty === filter.id;

				return (
					<button
						key={filter.id} type="button" onClick={() => onSelectSpecialty(filter.id)}
						className={`clinical-filter-chip ${isActive ? "active" : ""}`}
						data-testid={`filter-specialty-${filter.id}`}
					>
						<span>{filter.label}</span>
						<span className="opacity-75 text-[11px] font-mono">({count})</span>
					</button>
				);
			})}
		</div>
	);
};
