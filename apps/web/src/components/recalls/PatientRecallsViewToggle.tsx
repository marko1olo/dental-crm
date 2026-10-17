import type React from "react";
import { LayoutGrid, List } from "lucide-react";
import type { RecallPeriodFilter } from "./patientRecallEngine";

export interface PatientRecallsViewToggleProps {
	readonly registryViewMode: "table" | "kanban";
	readonly onRegistryViewModeChange: (mode: "table" | "kanban") => void;
	readonly uniqueDoctors: readonly { readonly id: string; readonly name: string }[];
	readonly selectedDoctorId: string | "all";
	readonly onSelectedDoctorIdChange: (id: string | "all") => void;
	readonly selectedPeriod: RecallPeriodFilter;
	readonly onSelectedPeriodChange: (period: RecallPeriodFilter) => void;
	readonly doctorSelectId: string;
	readonly periodSelectId: string;
}

export const PatientRecallsViewToggle: React.FC<PatientRecallsViewToggleProps> = ({
	registryViewMode,
	onRegistryViewModeChange,
	uniqueDoctors,
	selectedDoctorId,
	onSelectedDoctorIdChange,
	selectedPeriod,
	onSelectedPeriodChange,
	doctorSelectId,
	periodSelectId,
}) => {
	return (
		<div className="recall-view-mode-bar">
			<div className="recall-view-mode-toggles dente-segmented-bar" role="group" aria-label="Режим отображения реестра">
				<button
					type="button"
					className={`recall-view-mode-btn dente-segmented-item ${registryViewMode === "table" ? "active" : ""}`}
					data-active={registryViewMode === "table"}
					onClick={() => onRegistryViewModeChange("table")}
					data-testid="view-mode-table"
					title="Табличный вид"
				>
					<List size={15} />
					<span>Таблица</span>
				</button>
				<button
					type="button"
					className={`recall-view-mode-btn dente-segmented-item ${registryViewMode === "kanban" ? "active" : ""}`}
					data-active={registryViewMode === "kanban"}
					onClick={() => onRegistryViewModeChange("kanban")}
					data-testid="view-mode-kanban"
					title="Канбан-доска («Не звонили», «Дозвонились», «Отказ», «Записан»)"
				>
					<LayoutGrid size={15} />
					<span>Канбан</span>
				</button>
			</div>

			<div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
				<label htmlFor={doctorSelectId} className="sr-only">Фильтр по лечащему врачу</label>
				<select
					id={doctorSelectId}
					className="recall-filter-select"
					data-testid="doctor-filter-select"
					value={selectedDoctorId}
					onChange={(e) => onSelectedDoctorIdChange(e.target.value)}
					title="Фильтр по лечащему врачу"
				>
					<option value="all">Все врачи</option>
					{uniqueDoctors.map((doc) => (
						<option key={doc.id} value={doc.id}>{doc.name}</option>
					))}
				</select>

				<label htmlFor={periodSelectId} className="sr-only">Фильтр по периоду</label>
				<select
					id={periodSelectId}
					className="recall-filter-select"
					data-testid="period-filter-select"
					value={selectedPeriod}
					onChange={(e) => onSelectedPeriodChange(e.target.value as RecallPeriodFilter)}
					title="Фильтр по периоду наступления срока"
				>
					<option value="all">Все периоды</option>
					<option value="overdue">Просрочено</option>
					<option value="this_month">Текущий месяц</option>
					<option value="next_month">Следующий месяц</option>
					<option value="next_30_days">Ближайшие 30 дней</option>
				</select>
			</div>
		</div>
	);
};
