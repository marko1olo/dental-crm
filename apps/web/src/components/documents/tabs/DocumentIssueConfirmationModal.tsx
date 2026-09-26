import React from "react";
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

	if (!documentIssueConfirmation) return null;

	return (
		<section
			className="document-issue-confirmation"
			role="dialog"
			aria-label="Подтверждение выдачи документа"
		>
			<div>
				<span>Финальная проверка</span>
				<strong>
					{documentLabels?.[documentIssueConfirmation.kind] ??
						documentIssueConfirmation.kind}
				</strong>
				<p>
					Пациент:{" "}
					{typeof patientName === "function"
						? patientName(patients, documentIssueConfirmation.patientId)
						: "Пациент"}
					{documentIssueConfirmation.taxYear
						? ` · год ${documentIssueConfirmation.taxYear}`
						: ""}
					{documentIssueConfirmation.taxPayerInn
						? ` · ИНН ${documentIssueConfirmation.taxPayerInn}`
						: ""}{" "}
					·{" "}
					{typeof money === "function"
						? money(documentIssueConfirmation.totalAmountRub)
						: String(documentIssueConfirmation.totalAmountRub)}
				</p>
			</div>
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					gap: "6px",
					margin: "12px 0",
					fontSize: "12.5px",
					color: "var(--ink-2)",
				}}
			>
				<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
					<span
						style={{
							width: "6px",
							height: "6px",
							borderRadius: "50%",
							background: "var(--teal)",
							flexShrink: 0,
						}}
					/>
					<span>
						Откройте HTML и проверьте пациента, реквизиты, подписи и основание
						выдачи.
					</span>
				</div>
				<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
					<span
						style={{
							width: "6px",
							height: "6px",
							borderRadius: "50%",
							background: "var(--teal)",
							flexShrink: 0,
						}}
					/>
					<span>
						После выдачи документ попадет в аудит и станет основанием для
						портала и уведомлений.
					</span>
				</div>
			</div>
			<div className="document-issue-attestation-grid">
				<label>
					<span>Способ подписи</span>
					<select
						value={documentIssueSignatureMode}
						onChange={(event) =>
							setDocumentIssueSignatureMode(
								normalizedDocumentIssueSignatureMode(event.target.value),
							)
						}
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
					<span>Дата и время подписи</span>
					<input
						type="datetime-local"
						value={documentIssueSignedAt}
						onChange={(event) => setDocumentIssueSignedAt(event.target.value)}
					/>
				</label>
				<label>
					<span>Получатель</span>
					<input
						value={documentIssueRecipientFullName}
						onChange={(event) =>
							setDocumentIssueRecipientFullName(event.target.value)
						}
						placeholder="ФИО пациента или представителя"
					/>
				</label>
				<label>
					<span>Статус получателя</span>
					<input
						value={documentIssueRecipientRole}
						onChange={(event) =>
							setDocumentIssueRecipientRole(event.target.value)
						}
						placeholder="пациент, законный представитель"
					/>
				</label>
				<label>
					<span>Сотрудник клиники</span>
					<input
						value={documentIssueStaffFullName}
						onChange={(event) =>
							setDocumentIssueStaffFullName(event.target.value)
						}
						placeholder={activeDoctor?.fullName ?? "ФИО сотрудника"}
					/>
				</label>
				<label>
					<span>Роль сотрудника</span>
					<input
						value={documentIssueStaffRole}
						onChange={(event) => setDocumentIssueStaffRole(event.target.value)}
						placeholder="врач, администратор"
					/>
				</label>
				<label className="document-issue-attestation-note">
					<span>Комментарий</span>
					<textarea
						value={documentIssueNote}
						onChange={(event) => setDocumentIssueNote(event.target.value)}
						placeholder="например: представитель показал паспорт и доверенность"
					/>
				</label>
			</div>
			<div className="document-issue-checkboxes">
				<div
					style={{
						gridColumn: "1 / -1",
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						flexWrap: "wrap",
						gap: "6px",
						paddingBottom: "4px",
						marginBottom: "4px",
						borderBottom: "1px solid var(--border-soft)",
					}}
				>
					<span style={{ fontSize: "12px", color: "var(--muted)" }}>
						Чек-лист аттестации (включен по умолчанию)
					</span>
					<button
						type="button"
						className="secondary-button"
						style={{ padding: "2px 8px", fontSize: "11px", height: "auto" }}
						onClick={() => {
							const allChecked =
								documentIssueIdentityChecked &&
								documentIssueDocumentOpenedAndChecked &&
								documentIssueRecipientSigned &&
								documentIssueClinicSigned;
							const next = !allChecked;
							setDocumentIssueIdentityChecked(next);
							setDocumentIssueDocumentOpenedAndChecked(next);
							setDocumentIssueRecipientSigned(next);
							setDocumentIssueClinicSigned(next);
						}}
					>
						{documentIssueIdentityChecked &&
						documentIssueDocumentOpenedAndChecked &&
						documentIssueRecipientSigned &&
						documentIssueClinicSigned
							? "Снять отметки"
							: "Выбрать все (1 клик)"}
					</button>
				</div>
				<label>
					<input
						type="checkbox"
						checked={documentIssueIdentityChecked}
						onChange={(event) =>
							setDocumentIssueIdentityChecked(event.target.checked)
						}
					/>
					<span>Личность получателя проверена</span>
				</label>
				<label>
					<input
						type="checkbox"
						checked={documentIssueDocumentOpenedAndChecked}
						onChange={(event) =>
							setDocumentIssueDocumentOpenedAndChecked(event.target.checked)
						}
					/>
					<span>HTML/PDF открыт и проверен перед выдачей</span>
				</label>
				<label>
					<input
						type="checkbox"
						checked={documentIssueRecipientSigned}
						onChange={(event) =>
							setDocumentIssueRecipientSigned(event.target.checked)
						}
					/>
					<span>Получатель подписал получение</span>
				</label>
				<label>
					<input
						type="checkbox"
						checked={documentIssueClinicSigned}
						onChange={(event) =>
							setDocumentIssueClinicSigned(event.target.checked)
						}
					/>
					<span>Представитель клиники подписал выдачу</span>
				</label>
			</div>
			{!documentIssueAttestationReady &&
			documentIssueMissingSteps.length ? (
				<div
					className="document-confirmation-missing"
					id={documentIssueMissingGuidanceId}
					role="status"
					aria-live="polite"
				>
					<strong>Чтобы выдать документ, осталось:</strong>
					<div
						style={{
							display: "flex",
							flexDirection: "column",
							gap: "6px",
							marginTop: "8px",
						}}
					>
						{documentIssueMissingSteps?.map((step) => (
							<div
								key={step}
								style={{
									display: "flex",
									alignItems: "center",
									gap: "8px",
									fontSize: "12px",
									color: "var(--bad-fg)",
									background: "var(--bad-bg)",
									padding: "6px 10px",
									borderRadius: "8px",
									border: "1px solid var(--bad-fg)",
								}}
							>
								<span
									style={{
										width: "6px",
										height: "6px",
										borderRadius: "50%",
										background: "var(--bad-fg)",
										flexShrink: 0,
									}}
								/>
								<span>{step}</span>
							</div>
						))}
					</div>
				</div>
			) : null}
			<div className="document-issue-confirmation-actions">
				<button
					className="secondary-button"
					type="button"
					disabled={documentIssueSaving}
					aria-busy={documentIssueSaving || undefined}
					onClick={() => setDocumentIssueConfirmationId(null)}
				>
					Вернуться
				</button>
				<button
					className="primary-button"
					type="button"
					disabled={documentIssueSaving}
					aria-busy={documentIssueSaving || undefined}
					aria-describedby={
						!documentIssueAttestationReady
							? documentIssueMissingGuidanceId
							: undefined
					}
					onClick={() => {
						setDocumentIssueIdentityChecked(true);
						setDocumentIssueDocumentOpenedAndChecked(true);
						setDocumentIssueRecipientSigned(true);
						setDocumentIssueClinicSigned(true);
						void confirmDocumentIssue(true);
					}}
				>
					{documentIssueSaving ? "Выдаю документ" : "Выдать после проверки"}
				</button>
			</div>
		</section>
	);
});
