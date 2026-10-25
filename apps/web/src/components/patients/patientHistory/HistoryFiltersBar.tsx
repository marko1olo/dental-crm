import React from "react";
import { Plus, Search, SquareMinus, SquarePlus, X } from "lucide-react";
import { type ClinicalSpecialty } from "./types";
import { HistorySpecialtyFilterChips } from "./HistorySpecialtyFilterChips";

export interface HistoryFiltersBarProps {
	selectedSpecialty: ClinicalSpecialty;
	onSelectSpecialty: (specialty: ClinicalSpecialty) => void;
	searchQuery: string;
	onSearchQueryChange: (query: string) => void;
	onClearSearch: () => void;
	totalVisitsCount: number;
	getSpecialtyCount: (specialty: ClinicalSpecialty) => number;
	onExpandAll: () => void;
	onCollapseAll: () => void;
	onNewAppointment?: ((patientId?: string) => void) | undefined;
	patientId?: string | null | undefined;
}

export const HistoryFiltersBar: React.FC<HistoryFiltersBarProps> = React.memo(
	function HistoryFiltersBar({
		selectedSpecialty,
		onSelectSpecialty,
		searchQuery,
		onSearchQueryChange,
		onClearSearch,
		totalVisitsCount,
		getSpecialtyCount,
		onExpandAll,
		onCollapseAll,
		onNewAppointment,
		patientId,
	}) {
		return (
			<div className="clinical-timeline-toolbar">
				<HistorySpecialtyFilterChips
					selectedSpecialty={selectedSpecialty}
					onSelectSpecialty={onSelectSpecialty}
					totalVisitsCount={totalVisitsCount}
					getSpecialtyCount={getSpecialtyCount}
				/>

				<div className="clinical-timeline-actions">
					<div className="clinical-timeline-search">
						<Search className="w-3.5 h-3.5 text-[var(--muted)] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
						<input
							type="text"
							value={searchQuery}
							onChange={(e) => onSearchQueryChange(e.target.value)}
							placeholder="Поиск по зубу (напр. 16), диагнозу или врачу..."
							className="clinical-search-input"
							data-testid="timeline-search-input"
						/>
						{searchQuery && (
							<button
								type="button"
								onClick={onClearSearch}
								className="clinical-search-clear-btn"
								title="Очистить поиск"
							>
								<X className="w-3.5 h-3.5" />
							</button>
						)}
					</div>

					<div className="clinical-timeline-toggle-group" data-testid="timeline-accordion-controls">
						<button
							type="button"
							onClick={onExpandAll}
							className="clinical-timeline-toggle-btn clinical-timeline-expand-all-btn"
							title="Развернуть протоколы всех визитов"
							data-testid="btn-timeline-expand-all"
						>
							<SquarePlus className="clinical-toggle-icon text-teal-600 dark:text-teal-400" />
							<span>Развернуть всё</span>
						</button>
						<button
							type="button"
							onClick={onCollapseAll}
							className="clinical-timeline-toggle-btn clinical-timeline-collapse-all-btn"
							title="Свернуть все визиты в компактные строки"
							data-testid="btn-timeline-collapse-all"
						>
							<SquareMinus className="clinical-toggle-icon text-slate-500 dark:text-slate-400" />
							<span>Свернуть всё</span>
						</button>
					</div>

					{onNewAppointment && (
						<button
							type="button"
							onClick={() => onNewAppointment(patientId || undefined)}
							className="clinical-timeline-primary-btn"
							data-testid="btn-timeline-new-appointment"
						>
							<Plus className="w-3.5 h-3.5" />
							<span>+ Приём</span>
						</button>
					)}
				</div>
			</div>
		);
	},
);

HistoryFiltersBar.displayName = "HistoryFiltersBar";
