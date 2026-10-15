import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import {
	AlertCircle, Calendar, CheckCheck, CheckCircle2, Download,
	FileCheck, FileSignature, FileText, Hash, Printer,
	ShieldCheck, Smartphone, X,
} from "lucide-react";
import type {
	DocumentKind,
	DocumentSourceStatus,
	DocumentStatus,
} from "@dental/shared";
import { DocumentUkepSignButton } from "../DocumentUkepSignButton";
import { CANONICAL_DOCUMENT_STATUS_LABELS, humanizeDocumentAuditText } from "../documentAutonomy";
import { isoDateLabel } from "../../../AppHelpers";

export interface DocumentAuditFactsModalProps {
	documentAuditFacts: any;
	documentLabels?: Record<DocumentKind, string>;
	documentStatusLabels?: Record<DocumentStatus, string>;
	formatShortDate?: (date: string | null | undefined) => string;
	documentSourceStatusClassNames?: Record<DocumentSourceStatus, string>;
	documentSourceStatusLabels?: Record<DocumentSourceStatus, string>;
	documentIssueSignatureModeLabels: Record<string, string>;
	documentVoidReasonLabels: Record<string, string>;
	loadDocumentAuditFacts: (id: string) => Promise<void> | void;
	setDocumentAuditFacts: (facts: any) => void;
	openIssuedDocumentHtml: (id: string) => Promise<void> | void;
	downloadIssuedDocumentHtml: (id: string) => Promise<void> | void;
	downloadIssuedDocumentPdf: (id: string) => Promise<void> | void;
}

export const DocumentAuditFactsModal: React.FC<DocumentAuditFactsModalProps> = React.memo(
	function DocumentAuditFactsModal(props) {
		const {
			documentAuditFacts,
			documentLabels,
			documentStatusLabels,
			formatShortDate,
			documentSourceStatusClassNames,
			documentSourceStatusLabels,
			documentIssueSignatureModeLabels,
			documentVoidReasonLabels,
			loadDocumentAuditFacts,
			setDocumentAuditFacts,
			openIssuedDocumentHtml,
			downloadIssuedDocumentHtml,
			downloadIssuedDocumentPdf,
		} = props;

		useEffect(() => {
			if (!documentAuditFacts) return;
			const handleKeyDown = (e: KeyboardEvent) => {
				if (e.key === "Escape") {
					setDocumentAuditFacts(null);
				}
			};
			window.addEventListener("keydown", handleKeyDown);
			return () => window.removeEventListener("keydown", handleKeyDown);
		}, [documentAuditFacts, setDocumentAuditFacts]);

		if (!documentAuditFacts) return null;

		const hasSignatureAttestation = Boolean(documentAuditFacts.signatureAttestation);
		const sigMode = documentAuditFacts.signatureAttestation?.mode;
		const isSmsOtpSignature =
			sigMode === "simple_sms_otp" ||
			sigMode === "sms_otp" ||
			sigMode === "simple_electronic_signature" ||
			(typeof sigMode === "string" && sigMode.toLowerCase().includes("sms")) ||
			Boolean(documentAuditFacts.signatureAttestation?.note?.toLowerCase().includes("sms"));
		const isHandwrittenSignature = sigMode === "paper_handwritten" || sigMode === "paper_signed";
		const isTabletSignature = sigMode === "electronic_tablet_signature";

		const modalContent = (
			<div
				className="document-package-modal-overlay"
				role="dialog"
				aria-modal="true"
				aria-labelledby="document-audit-facts-title"
				onClick={(e) => {
					if (e.target === e.currentTarget) setDocumentAuditFacts(null);
				}}
				data-testid="modal-document-audit-facts"
			>
				<div
					className="document-package-modal-content max-w-3xl w-full"
					style={{
						background: "var(--paper, #ffffff)",
						color: "var(--ink, #0f172a)",
						borderRadius: "14px",
						border: "1px solid var(--line, #e2e8f0)",
						boxShadow: "var(--shadow-3, 0 20px 25px -5px rgba(0, 0, 0, 0.15))",
					}}
				>
					{/* Modal Header */}
					<div
						className="document-package-modal-header"
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							padding: "14px 18px",
							borderBottom: "1px solid var(--line, #e2e8f0)",
							background: "var(--paper-soft, #f8fafc)",
						}}
					>
						<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
							<div
								style={{
									width: "36px",
									height: "36px",
									borderRadius: "10px",
									background: "var(--teal-soft, rgba(13, 148, 136, 0.12))",
									color: "var(--teal, #0d9488)",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									flexShrink: 0,
								}}
							>
								<ShieldCheck size={20} aria-hidden="true" />
							</div>
							<div>
								<h3
									className="document-package-modal-title"
									id="document-audit-facts-title"
									style={{
										margin: 0,
										fontSize: "16px",
										fontWeight: 700,
										color: "var(--ink, #0f172a)",
									}}
								>
									Аудит юридической чистоты (63-ФЗ)
								</h3>
								<p
									style={{
										margin: 0,
										fontSize: "12px",
										color: "var(--muted, #64748b)",
									}}
								>
									{documentLabels?.[documentAuditFacts.kind] ?? documentAuditFacts.kind} ·{" "}
									{documentStatusLabels?.[documentAuditFacts.status] ??
										CANONICAL_DOCUMENT_STATUS_LABELS[documentAuditFacts.status] ??
										documentAuditFacts.status}
								</p>
							</div>
						</div>
						<button
							type="button"
							className="document-package-close-btn"
							onClick={() => setDocumentAuditFacts(null)}
							aria-label="Закрыть журнал проверки документа"
							title="Закрыть"
							data-testid="btn-close-audit-modal"
							style={{
								minWidth: "36px",
								minHeight: "36px",
								display: "inline-flex",
								alignItems: "center",
								justifyContent: "center",
								borderRadius: "8px",
								border: "none",
								background: "transparent",
								color: "var(--muted, #64748b)",
								cursor: "pointer",
							}}
						>
							<X size={18} aria-hidden="true" />
						</button>
					</div>

					{/* Modal Body */}
					<div
						className="document-package-modal-body"
						style={{
							padding: "16px 18px",
							overflowY: "auto",
							maxHeight: "calc(88vh - 130px)",
							display: "flex",
							flexDirection: "column",
							gap: "14px",
						}}
					>
						{/* 1. Документ и его реквизиты */}
						<div
							style={{
								display: "grid",
								gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
								gap: "10px",
								padding: "12px 14px",
								borderRadius: "10px",
								background: "var(--paper-soft, #f8fafc)",
								border: "1px solid var(--line, #e2e8f0)",
							}}
						>
							<div>
								<span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted, #64748b)", textTransform: "uppercase" }}>
									Вид документа
								</span>
								<strong style={{ display: "block", fontSize: "14px", color: "var(--ink, #0f172a)", marginTop: "2px" }}>
									{documentLabels?.[documentAuditFacts.kind] ?? documentAuditFacts.kind}
								</strong>
							</div>

							<div>
								<span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted, #64748b)", textTransform: "uppercase" }}>
									Статус и дата выдачи
								</span>
								<div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "2px" }}>
									<span
										style={{
											display: "inline-flex",
											alignItems: "center",
											padding: "2px 8px",
											borderRadius: "6px",
											fontSize: "11.5px",
											fontWeight: 600,
											background:
												documentAuditFacts.status === "issued"
													? "rgba(13, 148, 136, 0.12)"
													: documentAuditFacts.status === "voided"
														? "rgba(239, 68, 68, 0.12)"
														: "var(--paper, #ffffff)",
											color:
												documentAuditFacts.status === "issued"
													? "var(--teal, #0d9488)"
													: documentAuditFacts.status === "voided"
														? "#ef4444"
														: "var(--ink, #0f172a)",
											border:
												documentAuditFacts.status === "issued"
													? "1px solid rgba(13, 148, 136, 0.3)"
													: documentAuditFacts.status === "voided"
														? "1px solid rgba(239, 68, 68, 0.3)"
														: "1px solid var(--line, #e2e8f0)",
										}}
									>
										{documentStatusLabels?.[documentAuditFacts.status] ??
											CANONICAL_DOCUMENT_STATUS_LABELS[documentAuditFacts.status] ??
											documentAuditFacts.status}
									</span>
									<span style={{ fontSize: "12px", color: "var(--muted, #64748b)" }}>
										{documentAuditFacts.issuedAt
											? typeof formatShortDate === "function"
												? formatShortDate(documentAuditFacts.issuedAt)
												: String(documentAuditFacts.issuedAt)
											: "не выдан"}
									</span>
								</div>
							</div>

							<div>
								<span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted, #64748b)", textTransform: "uppercase" }}>
									Контрольный отпечаток документа
								</span>
								<div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "2px" }}>
									<Hash size={13} className="text-[var(--muted)]" />
									<code
										style={{
											fontSize: "11.5px",
											fontFamily: "monospace",
											color: "var(--ink, #0f172a)",
											background: "var(--paper, #ffffff)",
											padding: "2px 6px",
											borderRadius: "4px",
											border: "1px solid var(--line, #e2e8f0)",
										}}
									>
										{documentAuditFacts.snapshotSha256
											? documentAuditFacts.snapshotSha256.slice(0, 16)
											: "архив формируется"}
									</code>
								</div>
							</div>
						</div>

						{/* 2. Сведения о подписании и выдаче */}
						<div
							style={{
								padding: "14px",
								borderRadius: "10px",
								background: "var(--paper, #ffffff)",
								border: "1px solid var(--line, #e2e8f0)",
								display: "flex",
								flexDirection: "column",
								gap: "10px",
							}}
						>
							<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
								<span style={{ fontSize: "12px", fontWeight: 800, color: "var(--ink, #0f172a)", textTransform: "uppercase", letterSpacing: "0.03em" }}>
									Сведения о подписании и выдаче
								</span>
								<span
									style={{
										display: "inline-flex",
										alignItems: "center",
										padding: "2px 8px",
										borderRadius: "6px",
										fontSize: "11px",
										fontWeight: 600,
										background: "rgba(13, 148, 136, 0.10)",
										color: "var(--teal, #0d9488)",
										border: "1px solid rgba(13, 148, 136, 0.28)",
									}}
								>
									{documentSourceStatusLabels?.[
										documentAuditFacts.sourceStatus as DocumentSourceStatus
									] ?? "Сверено с источником"}
								</span>
							</div>

							{/* Patient signature audit */}
							{hasSignatureAttestation ? (
								<div
									style={{
										padding: "10px 12px",
										borderRadius: "8px",
										background: isSmsOtpSignature
											? "rgba(13, 148, 136, 0.08)"
											: "var(--paper-soft, #f8fafc)",
										border: isSmsOtpSignature
											? "1px solid var(--teal, #0d9488)"
											: "1px solid var(--line, #e2e8f0)",
										display: "flex",
										flexDirection: "column",
										gap: "6px",
									}}
								>
									<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
										{isSmsOtpSignature ? (
											<Smartphone size={16} className="text-teal-600 dark:text-teal-400 shrink-0" />
										) : isTabletSignature ? (
											<CheckCheck size={16} className="text-teal-600 dark:text-teal-400 shrink-0" />
										) : (
											<FileSignature size={16} className="text-teal-600 dark:text-teal-400 shrink-0" />
										)}
										<strong style={{ fontSize: "13px", color: "var(--ink, #0f172a)" }}>
											{isSmsOtpSignature
												? "Электронная подпись по СМС подтверждена"
												: isHandwrittenSignature
													? "Подписано на бумажном носителе"
													: documentIssueSignatureModeLabels[sigMode] ?? "Подпись зафиксирована"}
										</strong>
									</div>

									<div style={{ fontSize: "12px", color: "var(--muted, #64748b)", display: "flex", flexWrap: "wrap", gap: "12px" }}>
										<span>
											<strong>Получатель:</strong> {documentAuditFacts.signatureAttestation.recipientFullName} ({documentAuditFacts.signatureAttestation.recipientRole})
										</span>
										<span>
											<strong>Ответственный сотрудник:</strong> {documentAuditFacts.signatureAttestation.staffFullName} ({documentAuditFacts.signatureAttestation.staffRole})
										</span>
										{documentAuditFacts.signatureAttestation.signedAt && (
											<span>
												<strong>Дата:</strong>{" "}
												{typeof formatShortDate === "function"
													? formatShortDate(documentAuditFacts.signatureAttestation.signedAt)
													: String(documentAuditFacts.signatureAttestation.signedAt)}
											</span>
										)}
									</div>

									{isSmsOtpSignature && (
										<div style={{ fontSize: "11.5px", color: "var(--teal, #0d9488)", fontWeight: 500 }}>
											Код подтверждения из СМС проверен. Простая электронная подпись пациента зафиксирована.
										</div>
									)}
								</div>
							) : (
								<div
									style={{
										padding: "10px 12px",
										borderRadius: "8px",
										background: "rgba(234, 179, 8, 0.08)",
										border: "1px solid rgba(234, 179, 8, 0.3)",
										display: "flex",
										alignItems: "center",
										gap: "8px",
										fontSize: "12.5px",
										color: "var(--ink, #0f172a)",
									}}
								>
									<AlertCircle size={16} className="text-amber-500 shrink-0" />
									<span>
										Подпись пациента ожидает фиксации. Для завершения выдачи выберите «Выдать на бумаге».
									</span>
								</div>
							)}

							{/* Doctor Digital Signature Seal */}
							{documentAuditFacts.cryptoSignaturePkcs7 || documentAuditFacts.doctorSignedAt ? (
								<div
									style={{
										padding: "10px 12px",
										borderRadius: "8px",
										border: "1px solid var(--teal, #0d9488)",
										background: "rgba(13, 148, 136, 0.06)",
										color: "var(--ink, #0f172a)",
										display: "flex",
										flexDirection: "column",
										gap: "4px",
									}}
								>
									<div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 700, fontSize: "13px", color: "var(--ink, #0f172a)" }}>
										<ShieldCheck size={16} style={{ color: "var(--teal, #0d9488)", flexShrink: 0 }} />
										<span>Подписано электронной подписью (УКЭП ГОСТ)</span>
									</div>
									<div style={{ fontSize: "12px", color: "var(--ink, #0f172a)" }}>
										<strong>Владелец сертификата:</strong> {documentAuditFacts.doctorCertSubject || documentAuditFacts.signatureAttestation?.staffFullName || "Врач клиники"}
									</div>
									{documentAuditFacts.doctorCertSerial && (
										<div style={{ fontSize: "11px", color: "var(--muted, #64748b)", wordBreak: "break-all" }}>
											<strong>Серийный номер:</strong> {documentAuditFacts.doctorCertSerial}
										</div>
									)}
									{documentAuditFacts.doctorSignedAt && (
										<div style={{ fontSize: "11px", color: "var(--muted, #64748b)" }}>
											<strong>Дата подписания:</strong>{" "}
											{typeof formatShortDate === "function"
												? formatShortDate(documentAuditFacts.doctorSignedAt)
												: String(documentAuditFacts.doctorSignedAt)}
										</div>
									)}
								</div>
							) : documentAuditFacts.status === "issued" ? (
								<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", flexWrap: "wrap", padding: "8px 10px", borderRadius: "8px", background: "var(--paper-soft, #f8fafc)", border: "1px solid var(--line, #e2e8f0)" }}>
									<div style={{ fontSize: "12px", color: "var(--muted, #64748b)" }}>
										Электронная подпись врача не проставлена (для бумажного экземпляра не требуется — печать доступна сразу):
									</div>
									<DocumentUkepSignButton
										documentId={documentAuditFacts.documentId}
										onSuccess={() => void loadDocumentAuditFacts(documentAuditFacts.documentId)}
									/>
								</div>
							) : null}
						</div>

						{/* 3. Привязанный визит и план лечения */}
						<div
							style={{
								display: "grid",
								gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
								gap: "10px",
							}}
						>
							<div
								style={{
									padding: "10px 12px",
									borderRadius: "8px",
									background: "var(--paper-soft, #f8fafc)",
									border: "1px solid var(--line, #e2e8f0)",
									display: "flex",
									flexDirection: "column",
									gap: "4px",
								}}
							>
								<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
									<Calendar size={14} className="text-teal-600 dark:text-teal-400 shrink-0" />
									<span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted, #64748b)", textTransform: "uppercase" }}>
										Привязанный клинический приём
									</span>
								</div>
								<strong style={{ fontSize: "12.5px", color: "var(--ink, #0f172a)" }}>
									{documentAuditFacts.visitId
										? `Клинический приём № ${documentAuditFacts.visitId.slice(0, 8)}`
										: "Общеклинический документ пациента"}
								</strong>
								<small style={{ fontSize: "11px", color: "var(--muted, #64748b)" }}>
									{documentAuditFacts.visitId
										? "Документ оформлен в рамках амбулаторного приёма"
										: "Договор, согласие или справка общего прикрепления"}
								</small>
							</div>

							<div
								style={{
									padding: "10px 12px",
									borderRadius: "8px",
									background: "var(--paper-soft, #f8fafc)",
									border: "1px solid var(--line, #e2e8f0)",
									display: "flex",
									flexDirection: "column",
									gap: "4px",
								}}
							>
								<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
									<FileCheck size={14} className="text-teal-600 dark:text-teal-400 shrink-0" />
									<span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted, #64748b)", textTransform: "uppercase" }}>
										Привязанный план лечения
									</span>
								</div>
								<strong style={{ fontSize: "12.5px", color: "var(--ink, #0f172a)" }}>
									{documentAuditFacts.treatmentPlanId
										? `План лечения № ${documentAuditFacts.treatmentPlanId.slice(0, 8)}`
										: documentAuditFacts.kind === "treatment_plan" ||
											  documentAuditFacts.kind === "treatment_plan_acceptance"
											? "Первичный комплексный план лечения"
											: "Общеклинический документ (без отдельного плана)"}
								</strong>
								<small style={{ fontSize: "11px", color: "var(--muted, #64748b)" }}>
									{documentAuditFacts.treatmentPlanId
										? "Связан с утвержденной сметой и планом"
										: "Связка со сметой и планом лечения проверена"}
								</small>
							</div>
						</div>

						{/* 4. Источник и регламент формы */}
						<div
							style={{
								padding: "10px 12px",
								borderRadius: "8px",
								background: "var(--paper-soft, #f8fafc)",
								border: "1px solid var(--line, #e2e8f0)",
								fontSize: "12px",
								color: "var(--muted, #64748b)",
								display: "flex",
								flexDirection: "column",
								gap: "4px",
							}}
						>
							<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
								<strong style={{ color: "var(--ink, #0f172a)" }}>Официальный орган:</strong>
								<span>{documentAuditFacts.sourceAuthority || "Минздрав России"}</span>
							</div>
							<div>
								<strong>Основание формы:</strong> {humanizeDocumentAuditText(String(documentAuditFacts.sourceReference || "Утвержденный бланк медицинской организации"))} · форма сверена с источником{" "}
								{isoDateLabel(documentAuditFacts.sourceCheckedAt)}
							</div>
							{(documentAuditFacts?.sourceUrls ?? []).length ? (
								<div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "4px" }}>
									{(documentAuditFacts?.sourceUrls ?? []).map((url: string, index: number) => (
										<a
											key={url}
											href={url}
											target="_blank"
											rel="noreferrer noopener"
											className="doc-link"
											style={{ fontSize: "11.5px", color: "var(--teal, #0d9488)", textDecoration: "underline" }}
										>
											Официальный источник {index + 1}
										</a>
									))}
								</div>
							) : null}
						</div>

						{/* 5. Файл для налогового вычета (если это налоговая справка) */}
						{documentAuditFacts.taxXmlSourceSnapshotSha256 && (
							<div
								style={{
									padding: "10px 12px",
									borderRadius: "8px",
									background: "var(--paper-soft, #f8fafc)",
									border: "1px solid var(--line, #e2e8f0)",
									fontSize: "12px",
									color: "var(--ink, #0f172a)",
									display: "flex",
									flexDirection: "column",
									gap: "4px",
								}}
							>
								<strong>Справка об оплате медицинских услуг для налогового вычета</strong>
								<div style={{ fontSize: "11.5px", color: "var(--muted, #64748b)" }}>
									Контрольный отпечаток данных: <code>{documentAuditFacts.taxXmlSourceSnapshotSha256.slice(0, 16)}</code>
								</div>
								{documentAuditFacts.taxXmlOfficialValidationNote && (
									<small style={{ color: "var(--muted, #64748b)" }}>
										{humanizeDocumentAuditText(documentAuditFacts.taxXmlOfficialValidationNote)}
									</small>
								)}
							</div>
						)}

						{/* 6. Предупреждения и подсказки */}
						{(documentAuditFacts?.blockers ?? []).length || (documentAuditFacts?.warnings ?? []).length ? (
							<div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
								{[...(documentAuditFacts?.blockers ?? []), ...(documentAuditFacts?.warnings ?? [])].map((note) => (
									<div
										key={note}
										style={{
											display: "flex",
											alignItems: "center",
											gap: "8px",
											fontSize: "12px",
											color: "var(--warn-fg, #b45309)",
											background: "var(--warn-bg, rgba(245, 158, 11, 0.1))",
											padding: "6px 10px",
											borderRadius: "8px",
											border: "1px solid var(--warn-fg, #b45309)",
										}}
									>
										<AlertCircle size={14} className="shrink-0" />
										<span>{humanizeDocumentAuditText(String(note))}</span>
									</div>
								))}
							</div>
						) : null}
					</div>

					{/* Modal Footer */}
					<div
						className="document-package-modal-footer"
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							padding: "12px 18px",
							borderTop: "1px solid var(--line, #e2e8f0)",
							background: "var(--paper-soft, #f8fafc)",
						}}
					>
						<button
							className="secondary-button"
							type="button"
							onClick={() => setDocumentAuditFacts(null)}
							style={{
								minHeight: "36px",
								padding: "0 14px",
								borderRadius: "8px",
								fontSize: "12.5px",
								fontWeight: 600,
								cursor: "pointer",
								background: "var(--paper, #ffffff)",
								border: "1px solid var(--line, #e2e8f0)",
								color: "var(--ink, #0f172a)",
							}}
						>
							Закрыть
						</button>

						<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
							{documentAuditFacts.documentId && (
								<button
									className="secondary-button"
									type="button"
									onClick={() => void openIssuedDocumentHtml(documentAuditFacts.documentId)}
									style={{
										minHeight: "36px",
										padding: "0 12px",
										borderRadius: "8px",
										fontSize: "12.5px",
										fontWeight: 600,
										display: "inline-flex",
										alignItems: "center",
										gap: "6px",
										cursor: "pointer",
										background: "var(--paper, #ffffff)",
										border: "1px solid var(--line, #e2e8f0)",
										color: "var(--ink, #0f172a)",
									}}
								>
									<FileText size={14} aria-hidden="true" />
									<span>Открыть бланк</span>
								</button>
							)}

							{documentAuditFacts.htmlDownloadUrl && (
								<button
									className="secondary-button"
									type="button"
									onClick={() => void downloadIssuedDocumentHtml(documentAuditFacts.documentId)}
									style={{
										minHeight: "36px",
										padding: "0 12px",
										borderRadius: "8px",
										fontSize: "12.5px",
										fontWeight: 600,
										display: "inline-flex",
										alignItems: "center",
										gap: "6px",
										cursor: "pointer",
										background: "var(--paper, #ffffff)",
										border: "1px solid var(--line, #e2e8f0)",
										color: "var(--ink, #0f172a)",
									}}
								>
									<Download size={14} aria-hidden="true" />
									<span>Скачать копию</span>
								</button>
							)}

							{documentAuditFacts.documentId && (
								<button
									className="primary-button"
									type="button"
									onClick={() => void downloadIssuedDocumentPdf(documentAuditFacts.documentId)}
									style={{
										minHeight: "36px",
										padding: "0 14px",
										borderRadius: "8px",
										fontSize: "12.5px",
										fontWeight: 600,
										display: "inline-flex",
										alignItems: "center",
										gap: "6px",
										cursor: "pointer",
										background: "var(--teal, #0d9488)",
										color: "#ffffff",
										border: "none",
									}}
								>
									<Printer size={14} aria-hidden="true" />
									<span>Печать / PDF</span>
								</button>
							)}
						</div>
					</div>
				</div>
			</div>
		);

		return typeof document !== "undefined" ? createPortal(modalContent, document.body) : null;
	},
);

DocumentAuditFactsModal.displayName = "DocumentAuditFactsModal";
export default DocumentAuditFactsModal;
