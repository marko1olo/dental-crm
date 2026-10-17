import type React from "react";
import { useId } from "react";
import { Search, X } from "lucide-react";
import type {
	RecallCycleType,
	RecallMetrics,
	RecallPeriodFilter,
} from "./patientRecallEngine";
import { PatientRecallsViewToggle } from "./PatientRecallsViewToggle";
import { PatientRecallsFastPresets } from "./PatientRecallsFastPresets";
import { PatientRecallsStatusChips } from "./PatientRecallsStatusChips";

export interface PatientRecallsToolbarProps {
	readonly registryViewMode: "table" | "kanban";
	readonly onRegistryViewModeChange: (mode: "table" | "kanban") => void;
	readonly uniqueDoctors: readonly { readonly id: string; readonly name: string }[];
	readonly selectedDoctorId: string | "all";
	readonly onSelectedDoctorIdChange: (id: string | "all") => void;
	readonly selectedPeriod: RecallPeriodFilter;
	readonly onSelectedPeriodChange: (period: RecallPeriodFilter) => void;
	readonly searchQuery: string;
	readonly onSearchQueryChange: (query: string) => void;
	readonly selectedCycle: RecallCycleType | "all";
	readonly onSelectedCycleChange: (cycle: RecallCycleType | "all") => void;
	readonly statusFilter: "all" | "due_now" | "invited" | "scheduled" | "declined" | "completed";
	readonly onStatusFilterChange: (status: "all" | "due_now" | "invited" | "scheduled" | "declined" | "completed") => void;
	readonly candidatesCount: number;
	readonly metrics: RecallMetrics;
}

export const PatientRecallsToolbar: React.FC<PatientRecallsToolbarProps> = ({
	registryViewMode,
	onRegistryViewModeChange,
	uniqueDoctors,
	selectedDoctorId,
	onSelectedDoctorIdChange,
	selectedPeriod,
	onSelectedPeriodChange,
	searchQuery,
	onSearchQueryChange,
	selectedCycle,
	onSelectedCycleChange,
	statusFilter,
	onStatusFilterChange,
	candidatesCount,
	metrics,
}) => {
	const searchInputId = useId();
	const cycleSelectId = useId();
	const doctorSelectId = useId();
	const periodSelectId = useId();

	return (
		<div className="recall-toolbar">
			<PatientRecallsViewToggle
				registryViewMode={registryViewMode}
				onRegistryViewModeChange={onRegistryViewModeChange}
				uniqueDoctors={uniqueDoctors}
				selectedDoctorId={selectedDoctorId}
				onSelectedDoctorIdChange={onSelectedDoctorIdChange}
				selectedPeriod={selectedPeriod}
				onSelectedPeriodChange={onSelectedPeriodChange}
				doctorSelectId={doctorSelectId}
				periodSelectId={periodSelectId}
			/>

			<div className="recall-toolbar-top">
				<div className="recall-search-input-wrap dente-search-wrap">
					<Search size={15} className="recall-search-icon dente-search-icon" aria-hidden="true" />
					<label htmlFor={searchInputId} className="sr-only">Поиск по ФИО, телефону или врачу</label>
					<input
						id={searchInputId}
						type="search"
						className="recall-search-input dente-search-input"
						placeholder="Поиск по ФИО, телефону или лечащему врачу..."
						value={searchQuery}
						onChange={(e) => onSearchQueryChange(e.target.value)}
					/>
					{searchQuery && (
						<button type="button" onClick={() => onSearchQueryChange("")} className="dente-search-clear" aria-label="Очистить поиск">
							<X size={13} />
						</button>
					)}
				</div>

				<div>
					<label htmlFor={cycleSelectId} className="sr-only">Фильтр по клиническому циклу</label>
					<select
						id={cycleSelectId}
						className="recall-cycle-select"
						value={selectedCycle}
						onChange={(e) => onSelectedCycleChange(e.target.value as RecallCycleType | "all")}
					>
						<option value="all">Все клинические циклы</option>
						<option value="standard_prophylaxis">Профгигиена 6 мес.</option>
						<option value="periodontal_maintenance">Пародонтология 3-4 мес.</option>
						<option value="implant_monitoring">Импланты (1, 3, 6, 12 мес.)</option>
						<option value="orthodontic_braces">Брекеты (каждые 4 нед.)</option>
						<option value="orthodontic_aligners">Элайнеры (каждые 6-8 нед.)</option>
						<option value="orthodontic_retention">Ортодонтия: ретенция</option>
						<option value="pediatric_fluoridation">Детская минерализация (3-6 мес.)</option>
						<option value="caries_high_risk">Кариес-риск (3 мес.)</option>
						<option value="prosthetic_check">Ортопедия (6-12 мес.)</option>
						<option value="endodontic_check">Эндодонтия (1 мес.)</option>
					</select>
				</div>
			</div>

			<PatientRecallsFastPresets selectedCycle={selectedCycle} onSelectedCycleChange={onSelectedCycleChange} />
			<PatientRecallsStatusChips statusFilter={statusFilter} onStatusFilterChange={onStatusFilterChange} candidatesCount={candidatesCount} metrics={metrics} />
		</div>
	);
};
