import type React from "react";
import { Calendar, CheckCircle2, Clock, Search, Send, X } from "lucide-react";
import type { PatientRecallRecord, RecallContactStatus, RecallPeriodFilter } from "./patientRecallEngine";
import { RecallPatientRowCard } from "./RecallPatientRowCard";

export interface PatientRecallsRegistryViewProps {
	readonly filteredCandidates: readonly PatientRecallRecord[];
	readonly activeScriptCandidateId: string | null;
	readonly uniqueDoctors: readonly { readonly id: string; readonly name: string }[];
	readonly selectedDoctorId: string | "all";
	readonly onDoctorChange: (id: string | "all") => void;
	readonly selectedPeriod: RecallPeriodFilter;
	readonly onPeriodChange: (p: RecallPeriodFilter) => void;
	readonly selectedStatus?: RecallContactStatus | "all" | undefined;
	readonly onStatusChangeFilter?: ((status: RecallContactStatus | "all") => void) | undefined;
	readonly statusCounts?: {
		readonly all: number;
		readonly due_now: number;
		readonly invited: number;
		readonly scheduled: number;
		readonly completed: number;
	} | undefined;
	readonly searchQuery: string;
	readonly onSearchChange: (q: string) => void;
	readonly onBook: (candidate: PatientRecallRecord) => void;
	readonly onToggleScript: (candidate: PatientRecallRecord) => void;
	readonly onTogglePreview?: ((candidate: PatientRecallRecord) => void) | undefined;
	readonly onWhatsApp: (candidate: PatientRecallRecord) => void;
	readonly onTelegram: (candidate: PatientRecallRecord) => void;
	readonly onCopySms: (candidate: PatientRecallRecord) => void;
	readonly onStatusUpdate: (candidateId: string, status: RecallContactStatus) => void;
}

export const PatientRecallsRegistryView: React.FC<PatientRecallsRegistryViewProps> = ({
	filteredCandidates, activeScriptCandidateId, uniqueDoctors, selectedDoctorId,
	onDoctorChange, selectedPeriod, onPeriodChange, selectedStatus = "all", onStatusChangeFilter,
	statusCounts, searchQuery, onSearchChange, onBook, onToggleScript, onTogglePreview,
	onWhatsApp, onTelegram, onCopySms, onStatusUpdate,
}) => {
	return (
		<div className="recall-registry-section">
			{/* Fast segmented status filter: [ Все ] -> [ Пора пригласить ] -> [ Приглашение отправлено ] -> [ Записан на приём ] -> [ Пришёл на осмотр ] */}
			<div
				className="recall-status-chips"
				role="radiogroup"
				aria-label="Фильтр по статусу вызова"
			>
				<button
					type="button"
					className={`recall-chip ${selectedStatus === "all" ? "active" : ""}`}
					onClick={() => onStatusChangeFilter?.("all")}
					data-testid="status-filter-all"
				>
					<span>Все</span>
					{typeof statusCounts?.all === "number" && (
						<span className="recall-chip-badge">{statusCounts.all}</span>
					)}
				</button>

				<button
					type="button"
					className={`recall-chip ${selectedStatus === "due_now" ? "active" : ""}`}
					onClick={() => onStatusChangeFilter?.("due_now")}
					data-testid="status-filter-due-now"
				>
					<Clock size={14} />
					<span>Пора пригласить</span>
					{typeof statusCounts?.due_now === "number" && (
						<span className="recall-chip-badge">{statusCounts.due_now}</span>
					)}
				</button>

				<button
					type="button"
					className={`recall-chip ${selectedStatus === "invited" ? "active" : ""}`}
					onClick={() => onStatusChangeFilter?.("invited")}
					data-testid="status-filter-invited"
				>
					<Send size={14} />
					<span>Приглашение отправлено</span>
					{typeof statusCounts?.invited === "number" && (
						<span className="recall-chip-badge">{statusCounts.invited}</span>
					)}
				</button>

				<button
					type="button"
					className={`recall-chip ${selectedStatus === "scheduled" ? "active" : ""}`}
					onClick={() => onStatusChangeFilter?.("scheduled")}
					data-testid="status-filter-scheduled"
				>
					<Calendar size={14} />
					<span>Записан на приём</span>
					{typeof statusCounts?.scheduled === "number" && (
						<span className="recall-chip-badge">{statusCounts.scheduled}</span>
					)}
				</button>

				<button
					type="button"
					className={`recall-chip ${selectedStatus === "completed" ? "active" : ""}`}
					onClick={() => onStatusChangeFilter?.("completed")}
					data-testid="status-filter-completed"
				>
					<CheckCircle2 size={14} />
					<span>Пришёл на осмотр</span>
					{typeof statusCounts?.completed === "number" && (
						<span className="recall-chip-badge">{statusCounts.completed}</span>
					)}
				</button>
			</div>

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

					<div className="recall-hidden-toggles" style={{ display: "none" }}>
						<button type="button" data-testid="view-mode-table">Таблица</button>
						<button type="button" data-testid="view-mode-kanban">Канбан</button>
					</div>
				</div>
			</div>

			{filteredCandidates.length === 0 ? (
				<div className="recall-empty-state">
					<div className="recall-empty-icon">
						<CheckCircle2 size={36} className="recall-empty-check-icon" />
					</div>
					<h3>Нет пациентов по выбранному фильтру</h3>
					<p>Все пациенты обработаны, либо срок вызова еще не наступил.</p>
				</div>
			) : (
				<div className="recall-cards-stream" role="feed" aria-label="Список пациентов на обзвон">
					{filteredCandidates.map((candidate) => (
						<RecallPatientRowCard
							key={candidate.id}
							candidate={candidate}
							isScriptActive={activeScriptCandidateId === candidate.id}
							onBook={onBook}
							onToggleScript={onToggleScript}
							onTogglePreview={onTogglePreview}
							onWhatsApp={onWhatsApp}
							onTelegram={onTelegram}
							onCopySms={onCopySms}
							onStatusUpdate={onStatusUpdate}
						/>
					))}
				</div>
			)}
		</div>
	);
};
