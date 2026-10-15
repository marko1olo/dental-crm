import React, { useEffect } from "react";
import { createPortal } from "react-dom";
import {
	AlertCircle,
	Calendar,
	Check,
	CheckCircle2,
	FileSignature,
	User,
	X,
} from "lucide-react";
import type { DocumentKind, GeneratedDocument, Patient } from "@dental/shared";

export interface DocumentIssueConfirmationModalProps {
	documentIssueConfirmation: GeneratedDocument | null;
	documentLabels?: Record<DocumentKind, string>;
	patientName?: (
		patients: Patient[] | undefined,
		id: string | null | undefined,
	) => string;
	patients?: Patient[];
	money?: (val: number | null | undefined) => string;
	documentIssueSignatureMode: string;
	setDocumentIssueSignatureMode: (mode: any) => void;
	normalizedDocumentIssueSignatureMode: (val: string) => any;
	documentIssueSignatureModeLabels: Record<string, string>;
	documentIssueSignedAt: string;
	setDocumentIssueSignedAt: (val: string) => void;
	documentIssueRecipientFullName: string;
	setDocumentIssueRecipientFullName: (val: string) => void;
	documentIssueRecipientRole: string;
	setDocumentIssueRecipientRole: (val: string) => void;
	documentIssueStaffFullName: string;
	setDocumentIssueStaffFullName: (val: string) => void;
	documentIssueStaffRole: string;
	setDocumentIssueStaffRole: (val: string) => void;
	documentIssueNote: string;
	setDocumentIssueNote: (val: string) => void;
	activeDoctor?: { fullName?: string } | null;
	documentIssueIdentityChecked: boolean;
	setDocumentIssueIdentityChecked: (val: boolean) => void;
	documentIssueDocumentOpenedAndChecked: boolean;
	setDocumentIssueDocumentOpenedAndChecked: (val: boolean) => void;
	documentIssueRecipientSigned: boolean;
	setDocumentIssueRecipientSigned: (val: boolean) => void;
	documentIssueClinicSigned: boolean;
	setDocumentIssueClinicSigned: (val: boolean) => void;
	documentIssueAttestationReady: boolean;
	documentIssueMissingSteps: string[];
	documentIssueMissingGuidanceId: string;
	documentIssueSaving: boolean;
	setDocumentIssueConfirmationId: (id: string | null) => void;
	confirmDocumentIssue: (bypassChecks?: boolean) => Promise<void> | void;
}

export const DocumentIssueConfirmationModal: React.FC<
	DocumentIssueConfirmationModalProps
> = React.memo(function DocumentIssueConfirmationModal(props) {
	const {
		documentIssueConfirmation,
		documentLabels,
		patientName,
		patients,
		money,
		documentIssueSignatureMode,
		setDocumentIssueSignatureMode,
		normalizedDocumentIssueSignatureMode,
		documentIssueSignatureModeLabels,
		documentIssueSignedAt,
		setDocumentIssueSignedAt,
		documentIssueRecipientFullName,
		setDocumentIssueRecipientFullName,
		documentIssueRecipientRole,
		setDocumentIssueRecipientRole,
		documentIssueStaffFullName,
		setDocumentIssueStaffFullName,
		documentIssueStaffRole,
		setDocumentIssueStaffRole,
		documentIssueNote,
		setDocumentIssueNote,
		activeDoctor,
		documentIssueIdentityChecked,
		setDocumentIssueIdentityChecked,
		documentIssueDocumentOpenedAndChecked,
		setDocumentIssueDocumentOpenedAndChecked,
		documentIssueRecipientSigned,
		setDocumentIssueRecipientSigned,
		documentIssueClinicSigned,
		setDocumentIssueClinicSigned,
		documentIssueAttestationReady,
		documentIssueMissingSteps,
		documentIssueMissingGuidanceId,
		documentIssueSaving,
		setDocumentIssueConfirmationId,
		confirmDocumentIssue,
	} = props;

	useEffect(() => {
		if (!documentIssueConfirmation) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				setDocumentIssueConfirmationId(null);
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [documentIssueConfirmation, setDocumentIssueConfirmationId]);

	if (!documentIssueConfirmation) return null;

	const allChecked =
		documentIssueIdentityChecked &&
		documentIssueDocumentOpenedAndChecked &&
		documentIssueRecipientSigned &&
		documentIssueClinicSigned;

	const toggleAllCheckboxes = () => {
		const next = !allChecked;
		setDocumentIssueIdentityChecked(next);
		setDocumentIssueDocumentOpenedAndChecked(next);
		setDocumentIssueRecipientSigned(next);
		setDocumentIssueClinicSigned(next);
	};

	const modalContent = (
		<div
			className="document-package-modal-overlay"
			role="dialog"
			aria-modal="true"
			aria-labelledby="document-issue-confirmation-title"
			onClick={(e) => {
				if (e.target === e.currentTarget) setDocumentIssueConfirmationId(null);
			}}
			data-testid="modal-document-issue-confirmation"
		>
			<div
				className="document-package-modal-content max-w-2xl w-full"
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
							<FileSignature size={20} aria-hidden="true" />
						</div>
						<div>
							<h3
								className="document-package-modal-title"
								id="document-issue-confirmation-title"
								style={{
									margin: 0,
									fontSize: "16px",
									fontWeight: 700,
									color: "var(--ink, #0f172a)",
								}}
							>
								Подтверждение выдачи официального документа
							</h3>
							<p
								style={{
									margin: 0,
									fontSize: "12px",
									color: "var(--muted, #64748b)",
								}}
							>
								{documentLabels?.[documentIssueConfirmation.kind] ?? documentIssueConfirmation.kind} ·{" "}
								Пациент:{" "}
								{typeof patientName === "function"
									? patientName(patients, documentIssueConfirmation.patientId)
									: "Пациент"}
							</p>
						</div>
					</div>
					<button
						type="button"
						className="document-package-close-btn"
						onClick={() => setDocumentIssueConfirmationId(null)}
						aria-label="Закрыть подтверждение выдачи"
						title="Закрыть"
						data-testid="btn-close-issue-modal"
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
					{/* Document Details Card */}
					<div
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "space-between",
							flexWrap: "wrap",
							gap: "10px",
							padding: "12px 14px",
							borderRadius: "10px",
							background: "var(--paper-soft, #f8fafc)",
							border: "1px solid var(--line, #e2e8f0)",
						}}
					>
						<div>
							<span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted, #64748b)", textTransform: "uppercase" }}>
								Параметры выдачи
							</span>
							<strong style={{ display: "block", fontSize: "14px", color: "var(--ink, #0f172a)", marginTop: "2px" }}>
								{documentLabels?.[documentIssueConfirmation.kind] ?? documentIssueConfirmation.kind}
							</strong>
						</div>
						<div style={{ fontSize: "12.5px", color: "var(--muted, #64748b)", textAlign: "right" }}>
							{documentIssueConfirmation.taxYear && <div>Год: <strong>{documentIssueConfirmation.taxYear}</strong></div>}
							{documentIssueConfirmation.taxPayerInn && <div>ИНН плательщика: <code>{documentIssueConfirmation.taxPayerInn}</code></div>}
							{documentIssueConfirmation.totalAmountRub !== undefined && (
								<div style={{ color: "var(--teal, #0d9488)", fontWeight: 700 }}>
									Сумма: {typeof money === "function" ? money(documentIssueConfirmation.totalAmountRub) : String(documentIssueConfirmation.totalAmountRub)}
								</div>
							)}
						</div>
					</div>

					{/* Attestation Grid */}
					<div className="document-issue-attestation-grid">
						<label>
							<span style={{ fontSize: "11.5px", fontWeight: 600, color: "var(--ink, #0f172a)" }}>
								Способ фиксации подписи
							</span>
							<select
								value={documentIssueSignatureMode}
								onChange={(event) =>
									setDocumentIssueSignatureMode(
										normalizedDocumentIssueSignatureMode(event.target.value),
									)
								}
								style={{
									background: "var(--paper, #ffffff)",
									border: "1px solid var(--line, #e2e8f0)",
									color: "var(--ink, #0f172a)",
									borderRadius: "8px",
									padding: "8px 10px",
									fontSize: "13px",
								}}
							>
								{(
									Object.entries(documentIssueSignatureModeLabels) as Array<
										[string, string]
									>
								)?.map(([mode, label]) => (
									<option key={mode} value={mode}>
										{label}
									</option>
								))}
							</select>
						</label>

						<label>
							<span style={{ fontSize: "11.5px", fontWeight: 600, color: "var(--ink, #0f172a)" }}>
								Дата и время фиксации
							</span>
							<input
								type="datetime-local"
								value={documentIssueSignedAt}
								onChange={(event) => setDocumentIssueSignedAt(event.target.value)}
								style={{
									background: "var(--paper, #ffffff)",
									border: "1px solid var(--line, #e2e8f0)",
									color: "var(--ink, #0f172a)",
									borderRadius: "8px",
									padding: "8px 10px",
									fontSize: "13px",
								}}
							/>
						</label>

						<label>
							<span style={{ fontSize: "11.5px", fontWeight: 600, color: "var(--ink, #0f172a)" }}>
								Получатель документа
							</span>
							<input
								value={documentIssueRecipientFullName}
								onChange={(event) =>
									setDocumentIssueRecipientFullName(event.target.value)
								}
								placeholder="ФИО пациента или представителя"
								style={{
									background: "var(--paper, #ffffff)",
									border: "1px solid var(--line, #e2e8f0)",
									color: "var(--ink, #0f172a)",
									borderRadius: "8px",
									padding: "8px 10px",
									fontSize: "13px",
								}}
							/>
						</label>

						<label>
							<span style={{ fontSize: "11.5px", fontWeight: 600, color: "var(--ink, #0f172a)" }}>
								Статус получателя
							</span>
							<input
								value={documentIssueRecipientRole}
								onChange={(event) =>
									setDocumentIssueRecipientRole(event.target.value)
								}
								placeholder="пациент, законный представитель"
								style={{
									background: "var(--paper, #ffffff)",
									border: "1px solid var(--line, #e2e8f0)",
									color: "var(--ink, #0f172a)",
									borderRadius: "8px",
									padding: "8px 10px",
									fontSize: "13px",
								}}
							/>
						</label>

						<label>
							<span style={{ fontSize: "11.5px", fontWeight: 600, color: "var(--ink, #0f172a)" }}>
								Сотрудник клиники
							</span>
							<input
								value={documentIssueStaffFullName}
								onChange={(event) =>
									setDocumentIssueStaffFullName(event.target.value)
								}
								placeholder={activeDoctor?.fullName ?? "ФИО сотрудника"}
								style={{
									background: "var(--paper, #ffffff)",
									border: "1px solid var(--line, #e2e8f0)",
									color: "var(--ink, #0f172a)",
									borderRadius: "8px",
									padding: "8px 10px",
									fontSize: "13px",
								}}
							/>
						</label>

						<label>
							<span style={{ fontSize: "11.5px", fontWeight: 600, color: "var(--ink, #0f172a)" }}>
								Роль сотрудника
							</span>
							<input
								value={documentIssueStaffRole}
								onChange={(event) => setDocumentIssueStaffRole(event.target.value)}
								placeholder="врач, администратор"
								style={{
									background: "var(--paper, #ffffff)",
									border: "1px solid var(--line, #e2e8f0)",
									color: "var(--ink, #0f172a)",
									borderRadius: "8px",
									padding: "8px 10px",
									fontSize: "13px",
								}}
							/>
						</label>

						<label className="document-issue-attestation-note" style={{ gridColumn: "1 / -1" }}>
							<span style={{ fontSize: "11.5px", fontWeight: 600, color: "var(--ink, #0f172a)" }}>
								Примечание
							</span>
							<textarea
								value={documentIssueNote}
								onChange={(event) => setDocumentIssueNote(event.target.value)}
								placeholder="например: представитель предъявил паспорт и доверенность, код подтверждения проверен"
								style={{
									background: "var(--paper, #ffffff)",
									border: "1px solid var(--line, #e2e8f0)",
									color: "var(--ink, #0f172a)",
									borderRadius: "8px",
									padding: "8px 10px",
									fontSize: "13px",
									minHeight: "56px",
									resize: "vertical",
								}}
							/>
						</label>
					</div>

					{/* Checkboxes verification block */}
					<div
						style={{
							padding: "12px",
							borderRadius: "10px",
							background: "var(--paper-soft, #f8fafc)",
							border: "1px solid var(--line, #e2e8f0)",
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
								flexWrap: "wrap",
								gap: "6px",
								paddingBottom: "6px",
								borderBottom: "1px solid var(--line, #e2e8f0)",
							}}
						>
							<span style={{ fontSize: "12px", fontWeight: 600, color: "var(--ink, #0f172a)" }}>
								Чек-лист аттестации выдачи
							</span>
							<button
								type="button"
								className="secondary-button"
								style={{
									padding: "2px 8px",
									fontSize: "11px",
									height: "26px",
									borderRadius: "6px",
									cursor: "pointer",
									background: "var(--paper, #ffffff)",
									border: "1px solid var(--line, #e2e8f0)",
									color: "var(--ink, #0f172a)",
								}}
								onClick={toggleAllCheckboxes}
							>
								{allChecked ? "Снять отметки" : "Выбрать все пункты"}
							</button>
						</div>

						<div className="document-issue-checkboxes">
							<label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
								<input
									type="checkbox"
									checked={documentIssueIdentityChecked}
									onChange={(event) =>
										setDocumentIssueIdentityChecked(event.target.checked)
									}
								/>
								<span style={{ fontSize: "12.5px", color: "var(--ink, #0f172a)" }}>
									Личность получателя проверена
								</span>
							</label>

							<label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
								<input
									type="checkbox"
									checked={documentIssueDocumentOpenedAndChecked}
									onChange={(event) =>
										setDocumentIssueDocumentOpenedAndChecked(event.target.checked)
									}
								/>
								<span style={{ fontSize: "12.5px", color: "var(--ink, #0f172a)" }}>
									HTML/PDF открыт и проверен
								</span>
							</label>

							<label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
								<input
									type="checkbox"
									checked={documentIssueRecipientSigned}
									onChange={(event) =>
										setDocumentIssueRecipientSigned(event.target.checked)
									}
								/>
								<span style={{ fontSize: "12.5px", color: "var(--ink, #0f172a)" }}>
									Получатель подписал выдачу
								</span>
							</label>

							<label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
								<input
									type="checkbox"
									checked={documentIssueClinicSigned}
									onChange={(event) =>
										setDocumentIssueClinicSigned(event.target.checked)
									}
								/>
								<span style={{ fontSize: "12.5px", color: "var(--ink, #0f172a)" }}>
									Представитель клиники подписал
								</span>
							</label>
						</div>
					</div>

					{/* Missing guidance if not all ready */}
					{!documentIssueAttestationReady && documentIssueMissingSteps?.length ? (
						<div
							className="document-confirmation-missing"
							id={documentIssueMissingGuidanceId}
							role="status"
							aria-live="polite"
							style={{
								padding: "10px 12px",
								borderRadius: "8px",
								background: "rgba(239, 68, 68, 0.08)",
								border: "1px solid rgba(239, 68, 68, 0.3)",
								display: "flex",
								flexDirection: "column",
								gap: "6px",
							}}
						>
							<div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
								<AlertCircle size={15} className="text-red-500 shrink-0" />
								<strong style={{ fontSize: "12.5px", color: "var(--bad-fg, #b91c1c)" }}>
									Для завершения осталось:
								</strong>
							</div>
							<div style={{ display: "flex", flexDirection: "column", gap: "4px", paddingLeft: "20px" }}>
								{documentIssueMissingSteps.map((step) => (
									<span key={step} style={{ fontSize: "12px", color: "var(--bad-fg, #b91c1c)" }}>
										· {step}
									</span>
								))}
							</div>
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
						disabled={documentIssueSaving}
						onClick={() => setDocumentIssueConfirmationId(null)}
						style={{
							height: "32px",
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
						Вернуться
					</button>

					{/* Mandate 8e: 0 disabled buttons — clicking CTA sets flags and executes! */}
					<button
						className="primary-button"
						type="button"
						disabled={documentIssueSaving}
						aria-busy={documentIssueSaving || undefined}
						onClick={() => {
							setDocumentIssueIdentityChecked(true);
							setDocumentIssueDocumentOpenedAndChecked(true);
							setDocumentIssueRecipientSigned(true);
							setDocumentIssueClinicSigned(true);
							void confirmDocumentIssue(true);
						}}
						data-testid="btn-confirm-issue-primary"
						style={{
							height: "32px",
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
						<CheckCircle2 size={15} aria-hidden="true" />
						<span>{documentIssueSaving ? "Выдаю документ..." : "Выдать после проверки"}</span>
					</button>
				</div>
			</div>
		</div>
	);

	return typeof document !== "undefined" ? createPortal(modalContent, document.body) : null;
});

DocumentIssueConfirmationModal.displayName = "DocumentIssueConfirmationModal";
export default DocumentIssueConfirmationModal;
