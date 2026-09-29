import type React from "react";
import {
	Calendar,
	Check,
	ChevronDown,
	Clock,
	Eye,
	MessageCircle,
	PhoneCall,
	Send,
} from "lucide-react";
import {
	RECALL_CYCLE_CATALOG,
	formatHumanRecallBadge,
	type PatientRecallRecord,
	type RecallContactStatus,
} from "./patientRecallEngine";

export interface PatientRecallsTableViewProps {
	readonly filteredCandidates: readonly PatientRecallRecord[];
	readonly activeScriptCandidate: PatientRecallRecord | null;
	readonly activePreviewCandidate: PatientRecallRecord | null;
	readonly openContactDropdownId: string | null;
	readonly setOpenContactDropdownId: (id: string | null) => void;
	readonly copiedCandidateId: string | null;
	readonly onBook: (candidate: PatientRecallRecord) => void;
	readonly onTogglePreview: (candidate: PatientRecallRecord) => void;
	readonly onToggleScript: (candidate: PatientRecallRecord) => void;
	readonly onWhatsApp: (candidate: PatientRecallRecord) => void;
	readonly onTelegram: (candidate: PatientRecallRecord) => void;
	readonly onCopySms: (candidate: PatientRecallRecord) => void;
	readonly onStatusUpdate: (candidateId: string, status: RecallContactStatus) => void;
	readonly onPostpone?: ((candidate: PatientRecallRecord, duration: "2_weeks" | "1_month") => void) | undefined;
}


export const PatientRecallsTableView: React.FC<PatientRecallsTableViewProps> = ({
	filteredCandidates,
	activeScriptCandidate,
	activePreviewCandidate,
	openContactDropdownId,
	setOpenContactDropdownId,
	copiedCandidateId,
	onBook,
	onTogglePreview,
	onToggleScript,
	onWhatsApp,
	onTelegram,
	onCopySms,
	onStatusUpdate,
	onPostpone,
}) => {
	return (
		<div className="recall-table-wrap">
			<table className="recall-table">
				<thead>
					<tr>
						<th scope="col">Пациент</th>
						<th scope="col">Клинический цикл</th>
						<th scope="col">Визит / Срок</th>
						<th scope="col">Срочность</th>
						<th scope="col">Лечащий врач</th>
						<th scope="col">Статус</th>
						<th scope="col">1-Click Действия</th>
					</tr>
				</thead>
				<tbody>
					{filteredCandidates.map((candidate) => {
						const cycleDef = RECALL_CYCLE_CATALOG[candidate.cycleType];
						const isScriptActive = activeScriptCandidate?.id === candidate.id;
						const isRealPreviewActive = activePreviewCandidate?.id === candidate.id;

						return (
							<tr key={candidate.id} data-testid={`recall-hub-row-${candidate.id}`}>
								<td>
									<div className="recall-patient-cell">
										<span className="recall-patient-name">{candidate.fullName}</span>
										<span className="recall-patient-phone">
											{candidate.phone || "телефон не указан"}
										</span>
									</div>
								</td>

								<td>
									<span
										className="recall-cycle-tag"
										title={cycleDef?.clinicalRationale}
									>
										{cycleDef?.shortTitle || candidate.cycleType}
									</span>
								</td>

								<td>
									<div>
										<div>{candidate.lastVisitDate}</div>
										<div style={{ fontSize: "0.75rem", color: "var(--rm-text-muted)" }}>
											План: {candidate.dueDate}
										</div>
									</div>
								</td>

								<td>
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
												data-testid={`recall-badge-${candidate.id}`}
											>
												{badge.badgeText}
											</span>
										);
									})()}
								</td>

								<td>
									<span style={{ fontSize: "0.8125rem", color: "var(--rm-text-main)" }}>
										{candidate.attendingDoctorName || "—"}
									</span>
								</td>

								<td>
									<select
										style={{
											padding: "6px 8px",
											borderRadius: "6px",
											border: "1px solid var(--rm-border)",
											background: "var(--rm-surface)",
											color: "var(--rm-text-main)",
											fontSize: "0.8125rem",
											minHeight: "44px",
										}}
										value={candidate.status}
										onChange={(e) =>
											onStatusUpdate(
												candidate.id,
												e.target.value as RecallContactStatus,
											)
										}
									>
										<option value="due_now">Срок подошел</option>
										<option value="invited">Приглашен</option>
										<option value="scheduled">Записан на прием</option>
										<option value="completed">Визит завершен</option>
										<option value="declined">Отказ / Перенос</option>
									</select>
								</td>

								<td>
									<div
										className="recall-actions-cell"
										style={{
											display: "flex",
											alignItems: "center",
											gap: "6px",
											position: "relative",
										}}
									>
										{/* Primary Action: Записать в расписание */}
										<button
											type="button"
											className="recall-action-btn recall-action-btn--book"
											title="Записать пациента на прием в расписание"
											style={{ minHeight: "36px", padding: "6px 12px" }}
											onClick={() => onBook(candidate)}
											data-testid={`recall-book-btn-${candidate.id}`}
										>
											<Calendar size={15} />
											<span>Записать</span>
										</button>

										{/* 1-Click Fast Action: Связались — записан на прием */}
										<button
											type="button"
											className="recall-action-btn"
											title="Связались — пациент уже записан на прием (1 клик)"
											style={{
												minHeight: "36px",
												padding: "6px 10px",
												background: candidate.status === "scheduled" ? "var(--color-success-bg, #ecfdf5)" : undefined,
												color: candidate.status === "scheduled" ? "var(--color-success, #059669)" : undefined,
												borderColor: candidate.status === "scheduled" ? "var(--color-success, #059669)" : undefined,
											}}
											onClick={() => onStatusUpdate(candidate.id, "scheduled")}
											data-testid={`recall-fast-scheduled-btn-${candidate.id}`}
										>
											<Check size={14} />
											<span>Записан</span>
										</button>

										{/* Direct 1-Click Preview Action */}
										<button
											type="button"
											className={`recall-action-btn ${isRealPreviewActive ? "recall-action-btn--script active" : ""}`}
											title="Предпросмотр SMS и WhatsApp сообщений с расчетом сегментов"
											style={{ minHeight: "36px", padding: "6px 10px" }}
											onClick={() => onTogglePreview(candidate)}
											data-testid={`recall-quick-preview-btn-${candidate.id}`}
										>
											<Eye size={15} />
											<span>Превью</span>
										</button>

										{/* Consolidating Dropdown: Связаться ▾ */}
										<div style={{ position: "relative", display: "inline-block" }}>
											<button
												type="button"
												className="recall-action-btn"
												title="Каналы связи, скрипты и отложить визит"
												style={{
													minHeight: "36px",
													padding: "6px 10px",
													display: "inline-flex",
													alignItems: "center",
													gap: "4px",
												}}
												onClick={() =>
													setOpenContactDropdownId(
														openContactDropdownId === candidate.id ? null : candidate.id,
													)
												}
												data-testid={`recall-contact-menu-btn-${candidate.id}`}
												aria-expanded={openContactDropdownId === candidate.id}
											>
												<MessageCircle size={15} />
												<span>Связаться</span>
												<ChevronDown size={14} />
											</button>

											{/* Floating Dropdown Menu Container */}
											<div
												className="recall-contact-dropdown-menu"
												style={{
													display: openContactDropdownId === candidate.id ? "flex" : "none",
													position: "absolute",
													right: 0,
													top: "100%",
													zIndex: 50,
													flexDirection: "column",
													gap: "4px",
													padding: "6px",
													marginTop: "4px",
													background: "var(--rm-surface)",
													border: "1px solid var(--rm-border)",
													borderRadius: "8px",
													boxShadow: "var(--shadow-3)",
													minWidth: "180px",
												}}
											>
												{/* WhatsApp */}
												<button
													type="button"
													className="recall-action-btn recall-action-btn--whatsapp"
													title="Отправить готовое сообщение в WhatsApp"
													style={{ width: "100%", justifyContent: "flex-start", minHeight: "34px" }}
													onClick={() => {
														setOpenContactDropdownId(null);
														void onWhatsApp(candidate);
													}}
													data-testid={`recall-whatsapp-btn-${candidate.id}`}
												>
													<MessageCircle size={15} />
													<span>WhatsApp</span>
												</button>

												{/* Telegram */}
												<button
													type="button"
													className="recall-action-btn recall-action-btn--telegram"
													title="Отправить персонализированное сообщение в Telegram"
													style={{ width: "100%", justifyContent: "flex-start", minHeight: "34px" }}
													onClick={() => {
														setOpenContactDropdownId(null);
														void onTelegram(candidate);
													}}
													data-testid={`recall-telegram-btn-${candidate.id}`}
												>
													<Send size={15} />
													<span>Telegram</span>
												</button>

												{/* SMS */}
												<button
													type="button"
													className="recall-action-btn"
													title="Скопировать SMS текст"
													style={{ width: "100%", justifyContent: "flex-start", minHeight: "34px" }}
													onClick={() => {
														setOpenContactDropdownId(null);
														onCopySms(candidate);
													}}
													data-testid={`recall-sms-btn-${candidate.id}`}
												>
													{copiedCandidateId === candidate.id ? (
														<span style={{ display: "inline-flex", alignItems: "center", gap: "2px" }}>
															<Check size={14} />
															<span>Скопировано</span>
														</span>
													) : (
														<span>SMS</span>
													)}
												</button>

												{/* Предпросмотр */}
												<button
													type="button"
													className={`recall-action-btn ${isRealPreviewActive ? "active" : ""}`}
													title="Предпросмотр сообщения с расчетом длины и сегментов SMS"
													style={{ width: "100%", justifyContent: "flex-start", minHeight: "34px" }}
													onClick={() => {
														setOpenContactDropdownId(null);
														onTogglePreview(candidate);
													}}
													data-testid={`recall-preview-btn-${candidate.id}`}
												>
													<Eye size={15} />
													<span>Превью SMS / WA</span>
												</button>

												{/* Скрипт */}
												<button
													type="button"
													className={`recall-action-btn recall-action-btn--script ${isScriptActive ? "active" : ""}`}
													title="Открыть речевой скрипт для администратора"
													style={{ width: "100%", justifyContent: "flex-start", minHeight: "34px" }}
													onClick={() => {
														setOpenContactDropdownId(null);
														onToggleScript(candidate);
													}}
													data-testid={`recall-script-btn-${candidate.id}`}
												>
													<PhoneCall size={15} />
													<span>Скрипт</span>
												</button>

												{/* Divider */}
												<div style={{ height: "1px", background: "var(--rm-border)", margin: "4px 0" }} />

												{/* 1-Click: Отложить на 2 недели */}
												<button
													type="button"
													className="recall-action-btn"
													title="Отложить на 2 недели (пациент в отпуске)"
													style={{ width: "100%", justifyContent: "flex-start", minHeight: "34px", fontSize: "0.8125rem" }}
													onClick={() => {
														setOpenContactDropdownId(null);
														if (onPostpone) {
															onPostpone(candidate, "2_weeks");
														} else {
															onStatusUpdate(candidate.id, "declined");
														}
													}}
													data-testid={`recall-postpone-2w-btn-${candidate.id}`}
												>
													<Clock size={14} />
													<span>Отложить на 2 недели</span>
												</button>

												{/* 1-Click: Отложить на 1 месяц */}
												<button
													type="button"
													className="recall-action-btn"
													title="Отложить на 1 месяц"
													style={{ width: "100%", justifyContent: "flex-start", minHeight: "34px", fontSize: "0.8125rem" }}
													onClick={() => {
														setOpenContactDropdownId(null);
														if (onPostpone) {
															onPostpone(candidate, "1_month");
														} else {
															onStatusUpdate(candidate.id, "declined");
														}
													}}
													data-testid={`recall-postpone-1m-btn-${candidate.id}`}
												>
													<Clock size={14} />
													<span>Отложить на 1 месяц</span>
												</button>
											</div>
										</div>
									</div>
								</td>
							</tr>
						);
					})}
				</tbody>
			</table>
		</div>
	);
};
