import React, { useState } from "react";
import { Calendar, Check, ChevronDown, Clock, MessageCircle, Send } from "lucide-react";
import {
	CANONICAL_RECALL_STATUS_CONFIG,
	formatHumanRecallBadge,
	fromCanonicalRecallStatus,
	resolveCandidateTriggerType,
	toCanonicalRecallStatus,
	type CanonicalRecallWorkflowStatus,
	type PatientRecallRecord,
	type RecallContactStatus,
} from "./patientRecallEngine";
import "./recallsKanban.css";

export interface PatientRecallsKanbanViewProps {
	readonly kanbanGroups: Record<CanonicalRecallWorkflowStatus, readonly PatientRecallRecord[]>;
	readonly onBook: (candidate: PatientRecallRecord) => void;
	readonly onWhatsApp: (candidate: PatientRecallRecord) => void;
	readonly onCopySms: (candidate: PatientRecallRecord) => void;
	readonly onStatusUpdate: (candidateId: string, status: RecallContactStatus) => void;
	readonly onPostpone?: ((candidate: PatientRecallRecord, duration: "2_weeks" | "1_month") => void) | undefined;
}

export const PatientRecallsKanbanView: React.FC<PatientRecallsKanbanViewProps> = ({
	kanbanGroups,
	onBook,
	onWhatsApp,
	onCopySms,
	onStatusUpdate,
	onPostpone,
}) => {
	const [activeMobileColumn, setActiveMobileColumn] =
		useState<CanonicalRecallWorkflowStatus>("not_called");
	const [openMenuId, setOpenMenuId] = useState<string | null>(null);

	return (
		<div className="recall-kanban-wrapper">
			{/* Apple HIG 1-Row Mobile Segmented Chip Bar (screens <= 768px) */}
			<div
				className="recall-kanban-mobile-tabs"
				role="tablist"
				aria-label="Когорты канбан-доски"
			>
				{(["not_called", "reached", "declined", "scheduled"] as const).map((colKey) => {
					const colConfig = CANONICAL_RECALL_STATUS_CONFIG[colKey];
					const count = kanbanGroups[colKey]?.length ?? 0;
					const isActive = activeMobileColumn === colKey;
					return (
						<button
							key={colKey}
							type="button"
							role="tab"
							aria-selected={isActive}
							className={`recall-kanban-mobile-tab ${isActive ? "active" : ""}`}
							data-testid={`kanban-mobile-tab-${colKey}`}
							onClick={() => setActiveMobileColumn(colKey)}
						>
							<span>{colConfig.label}</span>
							<span className="recall-kanban-mobile-tab-count">{count}</span>
						</button>
					);
				})}
			</div>

			<div className="recall-kanban-board" data-testid="recall-kanban-board">
				{(["not_called", "reached", "declined", "scheduled"] as const).map((colKey) => {
					const colConfig = CANONICAL_RECALL_STATUS_CONFIG[colKey];
					const colCandidates = kanbanGroups[colKey];
					const isMobileActive = activeMobileColumn === colKey;
					return (
						<div
							key={colKey}
							className="recall-kanban-column"
							data-testid={`kanban-col-${colKey}`}
							data-mobile-active={isMobileActive}
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
														: triggerType === "endodontic_1m"
															? "Эндодонтия 1 мес."
															: triggerType === "periodontal_3m"
																? "Пародонтология 3 мес."
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
													{(() => {
														const badge = formatHumanRecallBadge({
															urgencyStatus: candidate.urgencyStatus,
															daysOverdue: candidate.daysOverdue,
															dueDate: candidate.dueDate,
															status: candidate.status,
														});
														return (
															<span
																className={`recall-badge recall-badge--${badge.badgeClass}`}
																title={badge.badgeTitle}
																data-testid={`kanban-badge-status-${candidate.id}`}
															>
																{badge.badgeText}
															</span>
														);
													})()}
												</div>
											</div>

											{/* Clean 2-Button Action Bar (Mandates 8d, 8e, 8p) */}
											<div
												className="recall-kanban-card-actions"
												style={{
													display: "flex",
													alignItems: "center",
													gap: "6px",
													marginTop: "8px",
													paddingTop: "8px",
													borderTop: "1px dashed var(--rm-border)",
												}}
											>
												{/* Кнопка 1: Записать */}
												<button
													type="button"
													className="recall-action-btn recall-action-btn--book"
													style={{
														minHeight: "32px",
														padding: "4px 8px",
														fontSize: "0.75rem",
														fontWeight: 600,
														flex: "1 1 0",
														display: "inline-flex",
														alignItems: "center",
														justifyContent: "center",
														gap: "5px",
													}}
													onClick={() => onBook(candidate)}
													data-testid={`kanban-book-btn-${candidate.id}`}
													title="Записать в расписание"
												>
													<Calendar size={13} />
													<span>Записать</span>
												</button>

												{/* Кнопка 2: WhatsApp / Действия (Сплит-меню) */}
												<div style={{ position: "relative", flex: "1 1 0", display: "inline-flex" }}>
													<button
														type="button"
														className="recall-action-btn recall-action-btn--whatsapp"
														style={{
															minHeight: "32px",
															padding: "4px 6px",
															fontSize: "0.75rem",
															fontWeight: 600,
															flex: "1 1 auto",
															display: "inline-flex",
															alignItems: "center",
															justifyContent: "center",
															gap: "4px",
															borderTopRightRadius: 0,
															borderBottomRightRadius: 0,
														}}
														onClick={() => void onWhatsApp(candidate)}
														data-testid={`recall-whatsapp-btn-${candidate.id}`}
														title="Отправить в WhatsApp"
													>
														<MessageCircle size={13} />
														<span>WhatsApp</span>
													</button>
													<button
														type="button"
														className="recall-action-btn"
														style={{
															minHeight: "32px",
															padding: "4px 5px",
															display: "inline-flex",
															alignItems: "center",
															justifyContent: "center",
															borderTopLeftRadius: 0,
															borderBottomLeftRadius: 0,
															borderLeft: "none",
														}}
														onClick={() => setOpenMenuId(openMenuId === candidate.id ? null : candidate.id)}
														data-testid={`kanban-actions-menu-btn-${candidate.id}`}
														title="Дополнительные действия (SMS, перенос, статус)"
														aria-expanded={openMenuId === candidate.id}
													>
														<ChevronDown size={13} />
													</button>

													{openMenuId === candidate.id && (
														<div
															className="recall-kanban-dropdown-menu"
															style={{
																position: "absolute",
																right: 0,
																bottom: "100%",
																marginBottom: "4px",
																zIndex: 60,
																background: "var(--paper, #ffffff)",
																border: "1px solid var(--line, #e2e8f0)",
																borderRadius: "8px",
																boxShadow: "0 8px 18px rgba(0, 0, 0, 0.2)",
																padding: "4px",
																minWidth: "185px",
																display: "flex",
																flexDirection: "column",
																gap: "2px",
															}}
														>
															<button
																type="button"
																className="recall-dropdown-item"
																style={{
																	display: "flex",
																	alignItems: "center",
																	gap: "6px",
																	padding: "6px 8px",
																	fontSize: "0.75rem",
																	border: "none",
																	background: "transparent",
																	color: "var(--ink, #0f172a)",
																	borderRadius: "4px",
																	cursor: "pointer",
																	textAlign: "left",
																	width: "100%",
																}}
																onClick={() => {
																	onCopySms(candidate);
																	setOpenMenuId(null);
																}}
																data-testid={`recall-sms-btn-${candidate.id}`}
																title="Копировать SMS"
															>
																<Send size={12} />
																<span>Копировать SMS</span>
															</button>

															<button
																type="button"
																className="recall-dropdown-item"
																style={{
																	display: "flex",
																	alignItems: "center",
																	gap: "6px",
																	padding: "6px 8px",
																	fontSize: "0.75rem",
																	border: "none",
																	background: "transparent",
																	color: "var(--ink, #0f172a)",
																	borderRadius: "4px",
																	cursor: "pointer",
																	textAlign: "left",
																	width: "100%",
																}}
																onClick={() => {
																	if (onPostpone) {
																		onPostpone(candidate, "2_weeks");
																	} else {
																		onStatusUpdate(candidate.id, "declined");
																	}
																	setOpenMenuId(null);
																}}
																data-testid={`kanban-postpone-2w-btn-${candidate.id}`}
																title="Отложить на 2 недели (пациент в отпуске)"
															>
																<Clock size={12} />
																<span>Отложить на 2 недели</span>
															</button>

															<button
																type="button"
																className="recall-dropdown-item"
																style={{
																	display: "flex",
																	alignItems: "center",
																	gap: "6px",
																	padding: "6px 8px",
																	fontSize: "0.75rem",
																	border: "none",
																	background: "transparent",
																	color: "var(--ink, #0f172a)",
																	borderRadius: "4px",
																	cursor: "pointer",
																	textAlign: "left",
																	width: "100%",
																}}
																onClick={() => {
																	if (onPostpone) {
																		onPostpone(candidate, "1_month");
																	} else {
																		onStatusUpdate(candidate.id, "declined");
																	}
																	setOpenMenuId(null);
																}}
																data-testid={`kanban-postpone-1m-btn-${candidate.id}`}
																title="Отложить на 1 месяц"
															>
																<Clock size={12} />
																<span>Отложить на 1 месяц</span>
															</button>

															<button
																type="button"
																className="recall-dropdown-item"
																style={{
																	display: "flex",
																	alignItems: "center",
																	gap: "6px",
																	padding: "6px 8px",
																	fontSize: "0.75rem",
																	border: "none",
																	background: "transparent",
																	color: "var(--color-success, #059669)",
																	borderRadius: "4px",
																	cursor: "pointer",
																	textAlign: "left",
																	width: "100%",
																}}
																onClick={() => {
																	onStatusUpdate(candidate.id, "scheduled");
																	setOpenMenuId(null);
																}}
																data-testid={`kanban-fast-scheduled-btn-${candidate.id}`}
																title="Связались — записан на прием"
															>
																<Check size={12} />
																<span>Пометить: Записан</span>
															</button>

															<div style={{ height: "1px", background: "var(--line, #e2e8f0)", margin: "2px 0" }} />

															<div style={{ padding: "4px 8px" }}>
																<div style={{ fontSize: "0.7rem", color: "var(--muted, #64748b)", marginBottom: "3px" }}>
																	Статус канбана:
																</div>
																<select
																	style={{
																		width: "100%",
																		padding: "3px 4px",
																		borderRadius: "4px",
																		border: "1px solid var(--line, #e2e8f0)",
																		background: "var(--paper-soft, #f8fafc)",
																		color: "var(--ink, #0f172a)",
																		fontSize: "0.72rem",
																	}}
																	value={toCanonicalRecallStatus(candidate.status)}
																	onChange={(e) => {
																		const newCanonical = e.target.value as CanonicalRecallWorkflowStatus;
																		onStatusUpdate(
																			candidate.id,
																			fromCanonicalRecallStatus(newCanonical),
																		);
																		setOpenMenuId(null);
																	}}
																	aria-label="Изменить статус в канбане"
																	data-testid={`kanban-status-select-${candidate.id}`}
																>
																	<option value="not_called">Не звонили</option>
																	<option value="reached">Дозвонились</option>
																	<option value="declined">Отказ / Перенос</option>
																	<option value="scheduled">Записан</option>
																</select>
															</div>
														</div>
													)}
												</div>
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
	</div>
	);
};
