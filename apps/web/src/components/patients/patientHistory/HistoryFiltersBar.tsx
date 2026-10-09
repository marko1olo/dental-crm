/**
 * apps/web/src/components/patients/patientHistory/HistoryFiltersBar.tsx
 *
 * DENTE Dental CRM — Панель фильтров и поиска клинического таймлайна истории приёмов.
 * Layer 1: Презентационный тулбар фильтрации по направлениям, зубам, диагнозам и врачам.
 */

import React from "react";
import { Plus, Search, SquareMinus, SquarePlus, X } from "lucide-react";
import {
	type ClinicalSpecialty,
	SPECIALTY_FILTERS,
} from "./types";

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
				{/* Быстрые фильтры направлений */}
				<div className="clinical-timeline-filters" data-testid="timeline-specialty-filters">
					{SPECIALTY_FILTERS.map((filter) => {
						const count =
							filter.id === "all"
								? totalVisitsCount
								: getSpecialtyCount(filter.id);
						const isActive = selectedSpecialty === filter.id;

						return (
							<button
								key={filter.id}
								type="button"
								onClick={() => onSelectSpecialty(filter.id)}
								className={`clinical-filter-chip ${isActive ? "active" : ""}`}
								data-testid={`filter-specialty-${filter.id}`}
							>
								<span>{filter.label}</span>
								<span className="opacity-75 text-[11px] font-mono">({count})</span>
							</button>
						);
					})}
				</div>

				{/* Поиск по диагнозу / зубу + Кнопки Свернуть/Развернуть + Добавить приём */}
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

					{/* Expand/Collapse All — Studio HIG Micro-Buttons */}
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

					{/* Кнопка записи */}
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
