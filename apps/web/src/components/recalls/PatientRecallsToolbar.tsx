import type React from "react";
import { useId } from "react";
import {
	Calendar,
	CheckCircle2,
	Clock,
	LayoutGrid,
	List,
	RotateCcw,
	Search,
	Send,
	ShieldCheck,
	Sparkles,
	Users,
	X,
} from "lucide-react";
import type {
	RecallCycleType,
	RecallMetrics,
	RecallPeriodFilter,
} from "./patientRecallEngine";

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
	readonly statusFilter:
		| "all"
		| "due_now"
		| "invited"
		| "scheduled"
		| "declined"
		| "completed";
	readonly onStatusFilterChange: (
		status: "all" | "due_now" | "invited" | "scheduled" | "declined" | "completed",
	) => void;
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
			<div className="recall-view-mode-bar">
				<div
					className="recall-view-mode-toggles dente-segmented-bar"
					role="group"
					aria-label="Режим отображения реестра"
				>
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
					<label htmlFor={doctorSelectId} className="sr-only">
						Фильтр по лечащему врачу
					</label>
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
							<option key={doc.id} value={doc.id}>
								{doc.name}
							</option>
						))}
					</select>

					<label htmlFor={periodSelectId} className="sr-only">
						Фильтр по периоду
					</label>
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

			<div className="recall-toolbar-top">
				<div className="recall-search-input-wrap dente-search-wrap">
					<Search size={15} className="recall-search-icon dente-search-icon" aria-hidden="true" />
					<label htmlFor={searchInputId} className="sr-only">
						Поиск по ФИО, телефону или врачу
					</label>
					<input
						id={searchInputId}
						type="search"
						className="recall-search-input dente-search-input"
						placeholder="Поиск по ФИО, телефону или лечащему врачу..."
						value={searchQuery}
						onChange={(e) => onSearchQueryChange(e.target.value)}
					/>
					{searchQuery && (
						<button
							type="button"
							onClick={() => onSearchQueryChange("")}
							className="dente-search-clear"
							aria-label="Очистить поиск"
						>
							<X size={13} />
						</button>
					)}
				</div>

				<div>
					<label htmlFor={cycleSelectId} className="sr-only">
						Фильтр по клиническому циклу
					</label>
					<select
						id={cycleSelectId}
						className="recall-cycle-select"
						value={selectedCycle}
						onChange={(e) =>
							onSelectedCycleChange(e.target.value as RecallCycleType | "all")
						}
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
					</select>
				</div>
			</div>

			{/* Solo Doctor 1-Click Fast Presets (Mandates 8e, 8s) */}
			<div className="recall-solo-presets" role="group" aria-label="1-Click пресеты для врача">
				<button
					type="button"
					data-testid="preset-hygiene-6m"
					className={`recall-preset-btn ${selectedCycle === "standard_prophylaxis" ? "active" : ""}`}
					onClick={() =>
						onSelectedCycleChange(
							selectedCycle === "standard_prophylaxis" ? "all" : "standard_prophylaxis",
						)
					}
					title="1-Click: Пациенты на плановую профгигиену 6 мес."
				>
					<ShieldCheck size={14} />
					<span>1-Click: Профгигиена (6 мес.)</span>
				</button>
				<button
					type="button"
					data-testid="preset-implants-1y"
					className={`recall-preset-btn ${selectedCycle === "implant_monitoring" ? "active" : ""}`}
					onClick={() =>
						onSelectedCycleChange(
							selectedCycle === "implant_monitoring" ? "all" : "implant_monitoring",
						)
					}
					title="1-Click: Пациенты с имплантами на годовой рентген-контроль"
				>
					<Sparkles size={14} />
					<span>1-Click: Импланты (1 год)</span>
				</button>
				<button
					type="button"
					data-testid="preset-ortho-1m"
					className={`recall-preset-btn ${selectedCycle === "orthodontic_braces" ? "active" : ""}`}
					onClick={() =>
						onSelectedCycleChange(
							selectedCycle === "orthodontic_braces" ? "all" : "orthodontic_braces",
						)
					}
					title="1-Click: Пациенты на плановую активацию брекетов (1 мес. / 4 нед.)"
				>
					<Clock size={14} />
					<span>1-Click: Орто-активация (1 мес.)</span>
				</button>
				<button
					type="button"
					data-testid="preset-pediatric-3m"
					className={`recall-preset-btn ${selectedCycle === "pediatric_fluoridation" ? "active" : ""}`}
					onClick={() =>
						onSelectedCycleChange(
							selectedCycle === "pediatric_fluoridation" ? "all" : "pediatric_fluoridation",
						)
					}
					title="1-Click: Детский профилактический осмотр (3-4 мес.)"
				>
					<Users size={14} />
					<span>1-Click: Детский осмотр (3-4 мес.)</span>
				</button>
			</div>

			{/* Status Chips */}
			<div
				className="recall-status-chips"
				role="radiogroup"
				aria-label="Фильтр по статусам реестра"
			>
				<button
					type="button"
					className={`recall-chip ${statusFilter === "all" ? "active" : ""}`}
					onClick={() => onStatusFilterChange("all")}
				>
					Все
					<span className="recall-chip-badge">{candidatesCount}</span>
				</button>

				<button
					type="button"
					className={`recall-chip ${statusFilter === "due_now" ? "active" : ""}`}
					onClick={() => onStatusFilterChange("due_now")}
				>
					<Clock size={14} />
					Пора звать
					<span className="recall-chip-badge">{metrics.dueNowCount}</span>
				</button>

				<button
					type="button"
					className={`recall-chip ${statusFilter === "invited" ? "active" : ""}`}
					onClick={() => onStatusFilterChange("invited")}
				>
					<Send size={14} />
					Приглашен
					<span className="recall-chip-badge">{metrics.contactedCount}</span>
				</button>

				<button
					type="button"
					className={`recall-chip ${statusFilter === "scheduled" ? "active" : ""}`}
					onClick={() => onStatusFilterChange("scheduled")}
				>
					<Calendar size={14} />
					Записался
					<span className="recall-chip-badge">{metrics.scheduledCount}</span>
				</button>

				<button
					type="button"
					className={`recall-chip ${statusFilter === "declined" ? "active" : ""}`}
					onClick={() => onStatusFilterChange("declined")}
				>
					<RotateCcw size={14} />
					Отказ / Перенос
					<span className="recall-chip-badge">{metrics.declinedCount}</span>
				</button>

				<button
					type="button"
					className={`recall-chip ${statusFilter === "completed" ? "active" : ""}`}
					onClick={() => onStatusFilterChange("completed")}
				>
					<CheckCircle2 size={14} />
					Завершено
					<span className="recall-chip-badge">{metrics.completedCount}</span>
				</button>
			</div>
		</div>
	);
};
