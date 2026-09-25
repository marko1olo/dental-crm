import type React from "react";
import {
	Calendar,
	Check,
	Eye,
	Lightbulb,
	MessageCircle,
	PhoneCall,
	Send,
	X,
} from "lucide-react";
import {
	RECALL_CYCLE_CATALOG,
	buildTelegramUrl,
	buildWhatsAppUrl,
	generateSmsRecallMessage,
	generateTelegramRecallMessage,
	generateWhatsAppRecallMessage,
	type PatientRecallRecord,
} from "./patientRecallEngine";
import {
	CLINICAL_CALLING_SCRIPTS,
	calculateSmsSegments,
	formatSmsSummary,
} from "./recallTemplates";

export interface PatientRecallsPreviewModalsProps {
	readonly activePreviewCandidate: PatientRecallRecord | null;
	readonly previewChannel: "sms" | "whatsapp" | "telegram";
	readonly onPreviewChannelChange: (channel: "sms" | "whatsapp" | "telegram") => void;
	readonly onClosePreview: () => void;
	readonly activeScriptCandidate: PatientRecallRecord | null;
	readonly onCloseScript: () => void;
	readonly selectedObjectionId: string;
	readonly onSelectObjectionId: (id: string) => void;
	readonly clinicName: string;
	readonly copiedCandidateId: string | null;
	readonly onCopySms: (candidate: PatientRecallRecord) => void;
	readonly onWhatsApp: (candidate: PatientRecallRecord) => void;
	readonly onTelegram: (candidate: PatientRecallRecord) => void;
	readonly onBook: (candidate: PatientRecallRecord) => void;
}

export const PatientRecallsPreviewModals: React.FC<PatientRecallsPreviewModalsProps> = ({
	activePreviewCandidate,
	previewChannel,
	onPreviewChannelChange,
	onClosePreview,
	activeScriptCandidate,
	onCloseScript,
	selectedObjectionId,
	onSelectObjectionId,
	clinicName,
	copiedCandidateId,
	onCopySms,
	onWhatsApp,
	onTelegram,
	onBook,
}) => {
	return (
		<>
			{/* Real SMS / WhatsApp / Telegram Message Preview Drawer (Mandate 8i Anti-Simulator) */}
			{activePreviewCandidate ? (
				<section
					className="recall-preview-drawer"
					aria-labelledby="preview-hub-heading"
					data-testid="recall-template-preview-drawer"
				>
					{(() => {
						const candidate = activePreviewCandidate;
						const smsText = generateSmsRecallMessage(candidate, { clinicName });
						const waText = generateWhatsAppRecallMessage(candidate, { clinicName });
						const tgText = generateTelegramRecallMessage(candidate, { clinicName });

						const activeText =
							previewChannel === "sms"
								? smsText
								: previewChannel === "whatsapp"
									? waText
									: tgText;

						const smsCalc = calculateSmsSegments(activeText);

						return (
							<>
								<div className="recall-preview-drawer-header">
									<div className="recall-preview-title" id="preview-hub-heading">
										<Eye size={18} />
										<span>
											Предпросмотр сообщения: {candidate.fullName} (
											{RECALL_CYCLE_CATALOG[candidate.cycleType]?.title})
										</span>
									</div>

									{/* Channel Selector Chips */}
									<div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
										<button
											type="button"
											className={`recall-chip ${previewChannel === "sms" ? "active" : ""}`}
											onClick={() => onPreviewChannelChange("sms")}
											data-testid="preview-tab-sms"
										>
											SMS
										</button>
										<button
											type="button"
											className={`recall-chip ${previewChannel === "whatsapp" ? "active" : ""}`}
											onClick={() => onPreviewChannelChange("whatsapp")}
											data-testid="preview-tab-wa"
										>
											WhatsApp
										</button>
										<button
											type="button"
											className={`recall-chip ${previewChannel === "telegram" ? "active" : ""}`}
											onClick={() => onPreviewChannelChange("telegram")}
											data-testid="preview-tab-tg"
										>
											Telegram
										</button>

										<button
											type="button"
											className="recall-action-btn"
											style={{ minHeight: "36px", minWidth: "36px" }}
											onClick={onClosePreview}
											aria-label="Закрыть предпросмотр"
										>
											<X size={16} />
										</button>
									</div>
								</div>

								{/* SMS 3GPP Segment Metadata Box */}
								{previewChannel === "sms" ? (
									<div
										data-testid="sms-segments-info"
										style={{
											display: "flex",
											justifyContent: "space-between",
											alignItems: "center",
											padding: "8px 12px",
											marginBottom: "10px",
											background: "var(--paper-soft)",
											borderRadius: "6px",
											fontSize: "0.8125rem",
											border: "1px solid var(--line)",
										}}
									>
										<div>
											<strong>Биллинг SMS:</strong> {formatSmsSummary(smsCalc)}
										</div>
										<div style={{ color: "var(--muted)" }}>
											Символов: {smsCalc.charCount} | Частей: {smsCalc.segmentCount} (
											{smsCalc.isUnicode ? "Кириллица UCS-2" : "Латиница GSM-7"})
										</div>
									</div>
								) : null}

								{/* Message Box */}
								<div className="recall-preview-box">
									<pre style={{ margin: 0, whiteSpace: "pre-wrap", fontFamily: "inherit" }}>
										{activeText}
									</pre>
								</div>

								{/* 1-Click Action Buttons */}
								<div
									style={{
										display: "flex",
										gap: "8px",
										justifyContent: "flex-end",
										marginTop: "12px",
										flexWrap: "wrap",
									}}
								>
									{previewChannel === "sms" ? (
										<button
											type="button"
											className="recall-action-btn"
											style={{ minHeight: "44px" }}
											onClick={() => onCopySms(candidate)}
											data-testid="btn-copy-preview-sms"
										>
											{copiedCandidateId === candidate.id ? (
												<>
													<Check size={16} />
													<span>Скопировано в буфер</span>
												</>
											) : (
												<>
													<Send size={16} />
													<span>Скопировать SMS</span>
												</>
											)}
										</button>
									) : null}

									{previewChannel === "whatsapp" ? (
										<a
											href={buildWhatsAppUrl(candidate.phone || "", waText)}
											target="_blank"
											rel="noopener noreferrer"
											className="recall-action-btn recall-action-btn--whatsapp"
											style={{
												minHeight: "44px",
												textDecoration: "none",
												display: "inline-flex",
												alignItems: "center",
												gap: "6px",
											}}
											onClick={() => void onWhatsApp(candidate)}
											data-testid="btn-send-preview-wa"
										>
											<MessageCircle size={16} />
											<span>Открыть WhatsApp</span>
										</a>
									) : null}

									{previewChannel === "telegram" ? (
										<a
											href={buildTelegramUrl(tgText, candidate.phone || undefined)}
											target="_blank"
											rel="noopener noreferrer"
											className="recall-action-btn recall-action-btn--telegram"
											style={{
												minHeight: "44px",
												textDecoration: "none",
												display: "inline-flex",
												alignItems: "center",
												gap: "6px",
											}}
											onClick={() => void onTelegram(candidate)}
											data-testid="btn-send-preview-tg"
										>
											<Send size={16} />
											<span>Открыть Telegram</span>
										</a>
									) : null}

									<button
										type="button"
										className="recall-action-btn recall-action-btn--book"
										style={{ minHeight: "44px" }}
										onClick={() => {
											onClosePreview();
											onBook(candidate);
										}}
									>
										<Calendar size={16} />
										<span>Записать на прием</span>
									</button>
								</div>
							</>
						);
					})()}
				</section>
			) : null}

			{/* Objection Script Drawer */}
			{activeScriptCandidate ? (
				<section
					className="recall-script-drawer"
					aria-labelledby="script-drawer-heading"
					data-testid="recall-script-drawer"
				>
					{(() => {
						const script =
							CLINICAL_CALLING_SCRIPTS[activeScriptCandidate.cycleType] ||
							CLINICAL_CALLING_SCRIPTS.standard_prophylaxis;
						const firstName =
							activeScriptCandidate.fullName.split(" ")[1] || activeScriptCandidate.fullName;
						const doctorName = activeScriptCandidate.attendingDoctorName || "лечащий врач";
						const currentObjection =
							script.objections.find((o) => o.id === selectedObjectionId) || script.objections[0];

						return (
							<>
								<div className="recall-script-drawer-header">
									<div className="recall-script-title" id="script-drawer-heading">
										<PhoneCall size={18} />
										<span>
											Речевой скрипт: {activeScriptCandidate.fullName} (
											{RECALL_CYCLE_CATALOG[activeScriptCandidate.cycleType]?.title})
										</span>
									</div>
									<button
										type="button"
										className="recall-action-btn"
										style={{ minHeight: "36px", minWidth: "36px" }}
										onClick={onCloseScript}
										aria-label="Закрыть скрипт"
									>
										<X size={16} />
									</button>
								</div>

								<div className="recall-script-body">
									<div style={{ marginBottom: "12px" }}>
										<strong>1. Приветствие администратора:</strong>
										<p style={{ margin: "4px 0", color: "var(--rm-text-main)" }}>
											{script.greeting
												.replace(/\{\{PATIENT_FIRST_NAME\}\}/g, firstName)
												.replace(/\{\{CLINIC_NAME\}\}/g, clinicName)
												.replace(/\{\{DOCTOR_NAME\}\}/g, doctorName)}
										</p>
									</div>

									<div style={{ marginBottom: "12px" }}>
										<strong>2. Клиническое обоснование (почему важно):</strong>
										<p style={{ margin: "4px 0", color: "var(--rm-text-main)" }}>
											{script.clinicalContext
												.replace(/\{\{PATIENT_FIRST_NAME\}\}/g, firstName)
												.replace(/\{\{CLINIC_NAME\}\}/g, clinicName)
												.replace(/\{\{DOCTOR_NAME\}\}/g, doctorName)}
										</p>
									</div>

									<div style={{ marginBottom: "12px" }}>
										<strong>3. Призыв к действию (выбор слота):</strong>
										<p style={{ margin: "4px 0", color: "var(--rm-primary)", fontWeight: 600 }}>
											{script.callToAction
												.replace(/\{\{PATIENT_FIRST_NAME\}\}/g, firstName)
												.replace(/\{\{DOCTOR_NAME\}\}/g, doctorName)}
										</p>
									</div>

									{/* Objections */}
									{script.objections.length > 0 ? (
										<div>
											<strong style={{ display: "block", marginBottom: "6px" }}>
												Отработка типичных возражений:
											</strong>
											<div className="recall-script-tabs">
												{script.objections.map((obj) => (
													<button
														key={obj.id}
														type="button"
														className={`recall-script-tab-btn ${
															selectedObjectionId === obj.id ? "active" : ""
														}`}
														onClick={() => onSelectObjectionId(obj.id)}
													>
														{obj.title}
													</button>
												))}
											</div>

											{currentObjection ? (
												<div
													className="recall-script-content-box"
													style={{ background: "var(--rm-surface)" }}
												>
													<div>
														<em>Пациент говорит:</em> {currentObjection.patientPhrase}
													</div>
													<div className="recall-script-suggested-text">
														<strong>Что ответить администратору:</strong>
														<div>
															{currentObjection.suggestedResponse
																.replace(/\{\{PATIENT_FIRST_NAME\}\}/g, firstName)
																.replace(/\{\{DOCTOR_NAME\}\}/g, doctorName)}
														</div>
													</div>
													<div className="recall-script-tip">
														<Lightbulb size={13} className="recall-tip-icon" />
														<span>Совет: {currentObjection.psychologicalTip}</span>
													</div>
												</div>
											) : null}
										</div>
									) : null}
								</div>
							</>
						);
					})()}
				</section>
			) : null}
		</>
	);
};
