import type React from "react";
import { Calendar, MessageCircle, Send } from "lucide-react";
import {
	CANONICAL_RECALL_STATUS_CONFIG,
	fromCanonicalRecallStatus,
	resolveCandidateTriggerType,
	toCanonicalRecallStatus,
	type CanonicalRecallWorkflowStatus,
	type PatientRecallRecord,
	type RecallContactStatus,
} from "./patientRecallEngine";

export interface PatientRecallsKanbanViewProps {
	readonly kanbanGroups: Record<CanonicalRecallWorkflowStatus, readonly PatientRecallRecord[]>;
	readonly onBook: (candidate: PatientRecallRecord) => void;
	readonly onWhatsApp: (candidate: PatientRecallRecord) => void;
	readonly onCopySms: (candidate: PatientRecallRecord) => void;
	readonly onStatusUpdate: (candidateId: string, status: RecallContactStatus) => void;
}

export const PatientRecallsKanbanView: React.FC<PatientRecallsKanbanViewProps> = ({
	kanbanGroups,
	onBook,
	onWhatsApp,
	onCopySms,
	onStatusUpdate,
}) => {
	return (
		<div className="recall-kanban-board" data-testid="recall-kanban-board">
			{(["not_called", "reached", "declined", "scheduled"] as const).map((colKey) => {
				const colConfig = CANONICAL_RECALL_STATUS_CONFIG[colKey];
				const colCandidates = kanbanGroups[colKey];
				return (
					<div
						key={colKey}
						className="recall-kanban-column"
						data-testid={`kanban-col-${colKey}`}
					>
						<div className="recall-kanban-column-header">
							<div className="recall-kanban-column-title">
								<span>{colConfig.label}</span>
							</div>
							<span
								className="recall-kanban-column-badge"
								data-testid={`kanban-badge-${colKey}`}
							>
								{colCandidates.length}
							</span>
						</div>
						<div className="recall-kanban-cards-list">
							{colCandidates.length === 0 ? (
								<div className="recall-kanban-empty">Нет пациентов в этом статусе</div>
							) : (
								colCandidates.map((candidate) => {
									const triggerType = resolveCandidateTriggerType(candidate);
									const triggerLabel =
										triggerType === "hygiene_6m"
											? "Профгигиена 6 мес."
											: triggerType === "implant_prosthetic_12m"
												? "Импланты/Ортопедия 12 мес."
												: triggerType === "ortho_activation_1m"
													? "Орто-активация 1 мес."
													: "Детский осмотр 3-4 мес.";

									return (
										<div
											key={candidate.id}
											className="recall-kanban-card"
											data-testid={`kanban-card-${candidate.id}`}
										>
											<div className="recall-kanban-card-patient">
												<div className="recall-kanban-card-name">
													{candidate.fullName}
												</div>
												<div className="recall-kanban-card-phone">
													{candidate.phone || "телефон не указан"}
												</div>
											</div>

											<div className="recall-kanban-card-meta">
												<span
													className="recall-cycle-tag"
													style={{ alignSelf: "flex-start" }}
												>
													{triggerLabel}
												</span>
												<div className="recall-kanban-card-doctor">
													Врач: {candidate.attendingDoctorName || "—"}
												</div>
												<div
													style={{
														display: "flex",
														justifyContent: "space-between",
														alignItems: "center",
													}}
												>
													<span>План: {candidate.dueDate}</span>
													<span
														className={`recall-badge recall-badge--${candidate.urgencyStatus}`}
													>
														{candidate.urgencyStatus === "due_now" && "Срочно"}
														{candidate.urgencyStatus === "overdue_30" &&
															`+${candidate.daysOverdue} дн.`}
														{candidate.urgencyStatus === "overdue_90" &&
															`+${candidate.daysOverdue} дн.`}
														{candidate.urgencyStatus === "upcoming" && "План"}
														{candidate.urgencyStatus === "completed" && "Визит"}
													</span>
												</div>
											</div>

											{/* 1-Click Fast Actions on Kanban Card */}
											<div
												className="recall-kanban-card-actions"
												style={{
													display: "flex",
													gap: "6px",
													marginTop: "8px",
													paddingTop: "8px",
													borderTop: "1px dashed var(--rm-border)",
												}}
											>
												{/* 1-Click: Записать */}
												<button
													type="button"
													className="recall-action-btn recall-action-btn--book"
													style={{ minHeight: "32px", padding: "4px 8px", fontSize: "0.75rem" }}
													onClick={() => onBook(candidate)}
													data-testid={`kanban-book-btn-${candidate.id}`}
													title="Записать в расписание"
												>
													<Calendar size={13} />
													<span>Записать</span>
												</button>

												{/* 1-Click: WhatsApp */}
												<button
													type="button"
													className="recall-action-btn recall-action-btn--whatsapp"
													style={{ minHeight: "32px", padding: "4px 8px", fontSize: "0.75rem" }}
													onClick={() => void onWhatsApp(candidate)}
													data-testid={`recall-whatsapp-btn-${candidate.id}`}
													title="Отправить шаблон в WhatsApp"
												>
													<MessageCircle size={13} />
													<span>WA</span>
												</button>

												{/* 1-Click: SMS */}
												<button
													type="button"
													className="recall-action-btn"
													style={{ minHeight: "32px", padding: "4px 8px", fontSize: "0.75rem" }}
													onClick={() => onCopySms(candidate)}
													data-testid={`recall-sms-btn-${candidate.id}`}
													title="Скопировать 152-ФЗ SMS"
												>
													<Send size={13} />
													<span>SMS</span>
												</button>

												{/* Status dropdown to move candidate */}
												<select
													style={{
														padding: "4px 6px",
														borderRadius: "4px",
														border: "1px solid var(--rm-border)",
														background: "var(--rm-surface)",
														color: "var(--rm-text-main)",
														fontSize: "0.75rem",
														marginLeft: "auto",
														minHeight: "32px",
													}}
													value={toCanonicalRecallStatus(candidate.status)}
													onChange={(e) => {
														const newCanonical = e.target.value as CanonicalRecallWorkflowStatus;
														onStatusUpdate(
															candidate.id,
															fromCanonicalRecallStatus(newCanonical),
														);
													}}
													aria-label="Изменить статус в канбане"
													data-testid={`kanban-status-select-${candidate.id}`}
												>
													<option value="not_called">Не звонили</option>
													<option value="reached">Дозвонились</option>
													<option value="declined">Отказ</option>
													<option value="scheduled">Записан</option>
												</select>
											</div>
										</div>
									);
								})
							)}
						</div>
					</div>
				);
			})}
		</div>
	);
};
