import type React from "react";
import { LayoutGrid, List, Search, X } from "lucide-react";
import type { RecallPeriodFilter } from "./patientRecallEngine";

export interface PatientRecallsRegistryFiltersProps {
	readonly searchQuery: string;
	readonly onSearchChange: (q: string) => void;
	readonly uniqueDoctors: readonly { readonly id: string; readonly name: string }[];
	readonly selectedDoctorId: string | "all";
	readonly onDoctorChange: (id: string | "all") => void;
	readonly selectedPeriod: RecallPeriodFilter;
	readonly onPeriodChange: (p: RecallPeriodFilter) => void;
	readonly viewMode?: "list" | "kanban" | undefined;
	readonly onViewModeChange?: ((mode: "list" | "kanban") => void) | undefined;
}

export const PatientRecallsRegistryFilters: React.FC<PatientRecallsRegistryFiltersProps> = ({
	searchQuery,
	onSearchChange,
	uniqueDoctors,
	selectedDoctorId,
	onDoctorChange,
	selectedPeriod,
	onPeriodChange,
	viewMode = "list",
	onViewModeChange,
}) => {
	return (
		<div className="recall-filters-row">
			<div className="recall-search-input-wrap dente-search-wrap">
				<Search size={15} className="recall-search-icon" aria-hidden="true" />
				<input
					type="search"
					className="recall-search-input"
					placeholder="Поиск по пациенту, телефону или врачу..."
					value={searchQuery}
					onChange={(e) => onSearchChange(e.target.value)}
				/>
				{searchQuery && (
					<button type="button" onClick={() => onSearchChange("")} className="dente-search-clear">
						<X size={13} />
					</button>
				)}
			</div>

			<div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
				<select
					className="recall-filter-select"
					data-testid="doctor-filter-select"
					value={selectedDoctorId}
					onChange={(e) => onDoctorChange(e.target.value)}
				>
					<option value="all">Все врачи</option>
					{uniqueDoctors.map((d) => (
						<option key={d.id} value={d.id}>{d.name}</option>
					))}
				</select>

				<select
					className="recall-filter-select"
					data-testid="period-filter-select"
					value={selectedPeriod}
					onChange={(e) => onPeriodChange(e.target.value as RecallPeriodFilter)}
				>
					<option value="all">Все периоды</option>
					<option value="overdue">Просрочено</option>
					<option value="this_month">Текущий месяц</option>
					<option value="next_month">Следующий месяц</option>
					<option value="next_30_days">Ближайшие 30 дней</option>
				</select>

				<div className="recall-view-mode-toggle dente-segmented-bar" role="tablist" aria-label="Режим отображения">
					<button
						type="button"
						role="tab"
						aria-selected={viewMode === "list"}
						className={`recall-tab-btn ${viewMode === "list" ? "active" : ""}`}
						data-testid="view-mode-table"
						onClick={() => onViewModeChange?.("list")}
						title="Список пациентов"
					>
						<List size={15} />
						<span>Список</span>
					</button>
					<button
						type="button"
						role="tab"
						aria-selected={viewMode === "kanban"}
						className={`recall-tab-btn ${viewMode === "kanban" ? "active" : ""}`}
						data-testid="view-mode-kanban"
						onClick={() => onViewModeChange?.("kanban")}
						title="Канбан-доска"
					>
						<LayoutGrid size={15} />
						<span>Канбан</span>
					</button>
				</div>
			</div>
		</div>
	);
};
