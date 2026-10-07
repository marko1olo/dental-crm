import type React from "react";
import {
	Calendar,
	Check,
	Lightbulb,
	MessageCircle,
	Phone,
	PhoneCall,
	Search,
	Send,
	X,
} from "lucide-react";
import {
	STOMX_TASK_CALLS_CATALOG,
	STOMX_TASK_CALL_BY_TYPE,
	type StomxTaskCallType,
} from "@dental/shared";
import type { PatientRecallRecord, RecallContactStatus } from "./patientRecallEngine";

export interface TaskCallCandidateItem {
	readonly candidate: PatientRecallRecord;
	readonly taskType: StomxTaskCallType;
}

export interface PatientRecallsTaskCallsTabProps {
	readonly taskCallCandidates: readonly TaskCallCandidateItem[];
	readonly searchQuery: string;
	readonly onSearchQueryChange: (query: string) => void;
	readonly selectedTaskCallType: StomxTaskCallType | "all";
	readonly onSelectTaskCallType: (type: StomxTaskCallType | "all") => void;
	readonly activeTaskCallScriptType: StomxTaskCallType | null;
	readonly onToggleTaskCallScriptType: (type: StomxTaskCallType | null) => void;
	readonly onWhatsApp: (candidate: PatientRecallRecord) => void;
	readonly onTelegram: (candidate: PatientRecallRecord) => void;
	readonly onBook: (candidate: PatientRecallRecord) => void;
	readonly onStatusUpdate: (candidateId: string, status: RecallContactStatus) => void;
}

export const PatientRecallsTaskCallsTab: React.FC<PatientRecallsTaskCallsTabProps> = ({
	taskCallCandidates,
	searchQuery,
	onSearchQueryChange,
	selectedTaskCallType,
	onSelectTaskCallType,
	activeTaskCallScriptType,
	onToggleTaskCallScriptType,
	onWhatsApp,
	onTelegram,
	onBook,
	onStatusUpdate,
}) => {
	return (
		<main className="recall-content-area" data-testid="task-calls-view-section">
			<div className="recall-toolbar">
				<div className="recall-toolbar-top">
					<div className="recall-search-input-wrap dente-search-wrap">
						<Search size={15} className="recall-search-icon dente-search-icon" aria-hidden="true" />
						<label htmlFor="task-call-search-input" className="sr-only">
							Поиск по пациенту, телефону или врачу
						</label>
						<input
							id="task-call-search-input"
							type="search"
							className="recall-search-input dente-search-input"
							placeholder="Поиск по пациенту, телефону или врачу..."
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

					{activeTaskCallScriptType ? (
						<button
							type="button"
							onClick={() => onToggleTaskCallScriptType(null)}
							className="recall-action-btn"
							style={{ minHeight: "44px" }}
						>
							<span>Скрыть речевой скрипт</span>
						</button>
					) : null}
				</div>

				{/* StomX 7 Task Call Category Chips */}
				<div
					className="recall-status-chips"
					role="radiogroup"
					aria-label="Фильтр по типам сервисных звонков"
				>
					<button
						type="button"
						data-testid="chip-task-call-all"
						className={`recall-chip ${selectedTaskCallType === "all" ? "active" : ""}`}
						onClick={() => onSelectTaskCallType("all")}
					>
						Все задачи
						<span className="recall-chip-badge">{taskCallCandidates.length}</span>
					</button>

					{STOMX_TASK_CALLS_CATALOG.map((cat) => {
						const count = taskCallCandidates.filter((item) => item.taskType === cat.type).length;
						return (
							<button
								key={cat.type}
								type="button"
								data-testid={`chip-task-call-${cat.type}`}
								className={`recall-chip ${selectedTaskCallType === cat.type ? "active" : ""}`}
								onClick={() => onSelectTaskCallType(cat.type)}
							>
								{cat.shortLabelRu}
								{count > 0 ? <span className="recall-chip-badge">{count}</span> : null}
							</button>
						);
					})}
				</div>
			</div>

			{/* Contextual Speech Script Banner */}
			{activeTaskCallScriptType ? (
				<div
					data-testid="task-call-script-banner"
					style={{
						margin: "0 24px 16px 24px",
						padding: "16px",
						borderRadius: "10px",
						backgroundColor: "var(--paper-soft)",
						border: "1px solid var(--line)",
						display: "flex",
						flexDirection: "column",
						gap: "8px",
					}}
				>
					<div
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
						}}
					>
						<div
							style={{
								display: "flex",
								alignItems: "center",
								gap: "8px",
								fontWeight: 700,
								color: "var(--ink)",
							}}
						>
							<Lightbulb size={18} style={{ color: "var(--teal)" }} />
							<span>
								Речевой скрипт звонка:{" "}
								{STOMX_TASK_CALL_BY_TYPE[activeTaskCallScriptType]?.titleRu}
							</span>
						</div>
						<button
							type="button"
							onClick={() => onToggleTaskCallScriptType(null)}
							style={{
								background: "transparent",
								border: "none",
								cursor: "pointer",
								color: "var(--muted)",
							}}
							aria-label="Закрыть скрипт"
						>
							<X size={16} />
						</button>
					</div>
					<p
						style={{
							margin: 0,
							fontSize: "0.875rem",
							lineHeight: 1.5,
							color: "var(--ink)",
							fontStyle: "italic",
						}}
					>
						{STOMX_TASK_CALL_BY_TYPE[activeTaskCallScriptType]?.defaultScriptRu}
					</p>
					<div style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
						Срок регламентного контакта:{" "}
						{STOMX_TASK_CALL_BY_TYPE[activeTaskCallScriptType]?.defaultDueDays === 0
							? "В день события"
							: `через ${STOMX_TASK_CALL_BY_TYPE[activeTaskCallScriptType]?.defaultDueDays} дн.`}
					</div>
				</div>
			) : null}

			{/* Task Call Cards or Empty State */}
			{taskCallCandidates.length === 0 ? (
				<div className="recall-empty-state" data-testid="task-calls-empty-state">
					<PhoneCall size={48} className="recall-empty-icon" aria-hidden="true" />
					<h3 className="recall-empty-title">Все плановые звонки выполнены</h3>
					<p className="recall-empty-text">
						В выбранной категории сервисных звонков нет ожидающих пациентов. Новые задачи
						формируются автоматически при завершении приемов, операций и истечении сроков
						планов лечения.
					</p>
				</div>
			) : (
				<div
					style={{
						padding: "0 24px 24px 24px",
						display: "flex",
						flexDirection: "column",
						gap: "12px",
					}}
				>
					{taskCallCandidates.map(({ candidate, taskType }) => {
						const meta = STOMX_TASK_CALL_BY_TYPE[taskType];
						return (
							<div
								key={candidate.id}
								data-testid={`task-call-card-${candidate.id}`}
								style={{
									padding: "16px",
									borderRadius: "10px",
									backgroundColor: "var(--paper)",
									border: "1px solid var(--line)",
									display: "grid",
									gridTemplateColumns: "1fr auto",
									alignItems: "center",
									gap: "16px",
								}}
							>
								<div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
									<div
										style={{
											display: "flex",
											alignItems: "center",
											gap: "8px",
											flexWrap: "wrap",
										}}
									>
										<span style={{ fontWeight: 800, fontSize: "1rem", color: "var(--ink)" }}>
											{candidate.fullName}
										</span>
										{candidate.phone ? (
											<a
												href={`tel:${candidate.phone.replace(/[^+\d]/g, "")}`}
												style={{
													fontSize: "0.8125rem",
													color: "var(--teal)",
													textDecoration: "none",
													fontWeight: 600,
												}}
											>
												{candidate.phone}
											</a>
										) : null}
										<span
											className="recall-badge"
											style={{
												backgroundColor: "var(--teal-surface)",
												color: "var(--teal)",
												fontWeight: 700,
											}}
										>
											{meta?.titleRu || "Сервисный звонок"}
										</span>
										{candidate.daysOverdue > 0 ? (
											<span className="recall-badge recall-badge--overdue">
												Просрочен на {candidate.daysOverdue} дн.
											</span>
										) : (
											<span className="recall-badge recall-badge--upcoming">
												Срок: {candidate.dueDate}
											</span>
										)}
									</div>

									<div style={{ fontSize: "0.8125rem", color: "var(--muted)" }}>
										{candidate.attendingDoctorName ? (
											<span>
												Врач: <strong>{candidate.attendingDoctorName}</strong> •{" "}
											</span>
										) : null}
										<span>Последний визит: {candidate.lastVisitDate}</span>
										{candidate.clinicalNotes ? (
											<span> • {candidate.clinicalNotes}</span>
										) : null}
									</div>
								</div>

								{/* Action Buttons */}
								<div
									style={{
										display: "flex",
										alignItems: "center",
										gap: "8px",
										flexWrap: "wrap",
									}}
								>
									{candidate.phone ? (
										<a
											href={`tel:${candidate.phone.replace(/[^+\d]/g, "")}`}
											className="recall-action-btn"
											style={{
												minHeight: "44px",
												textDecoration: "none",
												display: "inline-flex",
												alignItems: "center",
												gap: "6px",
											}}
											data-testid={`btn-call-phone-${candidate.id}`}
										>
											<Phone size={16} />
											<span>Позвонить</span>
										</a>
									) : null}

									<button
										type="button"
										className="recall-action-btn recall-action-btn--whatsapp"
										style={{ minHeight: "44px" }}
										onClick={() => void onWhatsApp(candidate)}
										data-testid={`btn-call-wa-${candidate.id}`}
									>
										<MessageCircle size={16} />
										<span>WhatsApp</span>
									</button>

									<button
										type="button"
										className="recall-action-btn recall-action-btn--telegram"
										style={{ minHeight: "44px" }}
										onClick={() => void onTelegram(candidate)}
										data-testid={`btn-call-tg-${candidate.id}`}
									>
										<Send size={16} />
										<span>TG</span>
									</button>

									<button
										type="button"
										className={`recall-action-btn recall-action-btn--script ${
											activeTaskCallScriptType === taskType ? "active" : ""
										}`}
										style={{ minHeight: "44px" }}
										onClick={() =>
											onToggleTaskCallScriptType(
												activeTaskCallScriptType === taskType ? null : taskType,
											)
										}
										data-testid={`btn-call-script-${candidate.id}`}
										title="Показать речевой скрипт для этой задачи"
									>
										<Lightbulb size={16} />
										<span>Скрипт</span>
									</button>

									<button
										type="button"
										className="recall-action-btn recall-action-btn--book"
										style={{ minHeight: "44px" }}
										onClick={() => onBook(candidate)}
										data-testid={`btn-call-book-${candidate.id}`}
									>
										<Calendar size={16} />
										<span>Записать</span>
									</button>

									<button
										type="button"
										className="recall-action-btn"
										style={{ minHeight: "44px", color: "var(--ok-fg)" }}
										onClick={() => onStatusUpdate(candidate.id, "scheduled")}
										data-testid={`btn-call-done-${candidate.id}`}
										title="Отметить успешный контакт"
									>
										<Check size={16} />
										<span>Успех</span>
									</button>
								</div>
							</div>
						);
					})}
				</div>
			)}
		</main>
	);
};
