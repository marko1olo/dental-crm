import React from "react";
import type {
	DocumentKind,
	DocumentStatus,
	GeneratedDocument,
	Patient,
	VoidDocumentInput,
} from "@dental/shared";

export interface DocumentVoidConfirmationModalProps {
	documentVoidConfirmation: GeneratedDocument | null;
	documentLabels?: Record<DocumentKind, string>;
	documentStatusLabels?: Record<DocumentStatus, string>;
	patientName?: (
		patients: Patient[] | undefined,
		id: string | null | undefined,
	) => string;
	patients?: Patient[];
	documentVoidReasonCode: VoidDocumentInput["reasonCode"];
	setDocumentVoidReasonCode: (code: any) => void;
	normalizedDocumentVoidReasonCode: (val: string) => any;
	documentVoidReasonLabels: Record<string, string>;
	documentVoidStaffFullName: string;
	setDocumentVoidStaffFullName: (val: string) => void;
	activeDoctor?: { fullName?: string } | null;
	documentVoidStaffRole: string;
	setDocumentVoidStaffRole: (val: string) => void;
	documentVoidCorrectionDocumentId: string;
	setDocumentVoidCorrectionDocumentId: (val: string) => void;
	activeUsableDocuments: GeneratedDocument[];
	documentVoidReasonText: string;
	setDocumentVoidReasonText: (val: string) => void;
	documentVoidReplacementRequired: boolean;
	setDocumentVoidReplacementRequired: (val: boolean) => void;
	documentVoidPatientOrPayerNotified: boolean;
	setDocumentVoidPatientOrPayerNotified: (val: boolean) => void;
	documentVoidArchivePreserved: boolean;
	setDocumentVoidArchivePreserved: (val: boolean) => void;
	documentVoidStatusReviewed: boolean;
	setDocumentVoidStatusReviewed: (val: boolean) => void;
	documentVoidReady: boolean;
	documentVoidMissingSteps: string[];
	documentVoidMissingGuidanceId: string;
	documentVoidSaving: boolean;
	setDocumentVoidConfirmationId: (id: string | null) => void;
	confirmDocumentVoid: () => Promise<void> | void;
}

export const DocumentVoidConfirmationModal: React.FC<
	DocumentVoidConfirmationModalProps
> = React.memo(function DocumentVoidConfirmationModal(props) {
	const {
		documentVoidConfirmation,
		documentLabels,
		documentStatusLabels,
		patientName,
		patients,
		documentVoidReasonCode,
		setDocumentVoidReasonCode,
		normalizedDocumentVoidReasonCode,
		documentVoidReasonLabels,
		documentVoidStaffFullName,
		setDocumentVoidStaffFullName,
		activeDoctor,
		documentVoidStaffRole,
		setDocumentVoidStaffRole,
		documentVoidCorrectionDocumentId,
		setDocumentVoidCorrectionDocumentId,
		activeUsableDocuments,
		documentVoidReasonText,
		setDocumentVoidReasonText,
		documentVoidReplacementRequired,
		setDocumentVoidReplacementRequired,
		documentVoidPatientOrPayerNotified,
		setDocumentVoidPatientOrPayerNotified,
		documentVoidArchivePreserved,
		setDocumentVoidArchivePreserved,
		documentVoidStatusReviewed,
		setDocumentVoidStatusReviewed,
		documentVoidReady,
		documentVoidMissingSteps,
		documentVoidMissingGuidanceId,
		documentVoidSaving,
		setDocumentVoidConfirmationId,
		confirmDocumentVoid,
	} = props;

	if (!documentVoidConfirmation) return null;

	return (
		<section
			className="document-issue-confirmation"
			role="dialog"
			aria-label="Аннулирование документа"
		>
			<div>
				<span>Аннулирование без удаления архива</span>
				<strong>
					{documentLabels?.[documentVoidConfirmation.kind] ??
						documentVoidConfirmation.kind}
				</strong>
				<p>
					Пациент:{" "}
					{typeof patientName === "function"
						? patientName(patients, documentVoidConfirmation.patientId)
						: "Пациент"}
					{documentVoidConfirmation.taxYear
						? ` · год ${documentVoidConfirmation.taxYear}`
						: ""}{" "}
					·{" "}
					{documentStatusLabels?.[documentVoidConfirmation.status] ??
						documentVoidConfirmation.status}
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
							background: "var(--warn-fg)",
							flexShrink: 0,
						}}
					/>
					<span>Запись останется в журнале, архивная копия не удаляется.</span>
				</div>
				<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
					<span
						style={{
							width: "6px",
							height: "6px",
							borderRadius: "50%",
							background: "var(--warn-fg)",
							flexShrink: 0,
						}}
					/>
					<span>
						Для налоговых и медицинских документов укажите, нужна ли замена или
						исправляющий документ.
					</span>
				</div>
			</div>
			<div className="document-issue-attestation-grid">
				<label>
					<span>Причина</span>
					<select
						value={documentVoidReasonCode}
						style={{ minHeight: "44px" }}
						onChange={(event) =>
							setDocumentVoidReasonCode(
								normalizedDocumentVoidReasonCode(event.target.value),
							)
						}
					>
						{(
							Object.entries(documentVoidReasonLabels) as Array<
								[string, string]
							>
						)?.map(([code, label]) => (
							<option key={code} value={code}>
								{label}
							</option>
						))}
					</select>
				</label>
				<label>
					<span>Ответственный сотрудник</span>
					<input
						value={documentVoidStaffFullName}
						style={{ minHeight: "44px" }}
						onChange={(event) =>
							setDocumentVoidStaffFullName(event.target.value)
						}
						placeholder={activeDoctor?.fullName ?? "ФИО сотрудника"}
					/>
				</label>
				<label>
					<span>Роль сотрудника</span>
					<input
						value={documentVoidStaffRole}
						style={{ minHeight: "44px" }}
						onChange={(event) => setDocumentVoidStaffRole(event.target.value)}
						placeholder="врач, администратор"
					/>
				</label>
				<label>
					<span>Исправляющий документ</span>
					<select
						value={documentVoidCorrectionDocumentId}
						style={{ minHeight: "44px" }}
						onChange={(event) =>
							setDocumentVoidCorrectionDocumentId(event.target.value)
						}
					>
						<option value="">Не выбран</option>
						{((activeUsableDocuments as GeneratedDocument[]) ?? [])
							.filter(
								(document) => document.id !== documentVoidConfirmation.id,
							)
							?.map((document) => (
								<option key={document.id} value={document.id}>
									{documentLabels?.[document.kind] ?? document.kind} ·{" "}
									{documentStatusLabels?.[document.status] ?? document.status}
								</option>
							))}
					</select>
				</label>
				<label className="document-issue-attestation-note">
					<span>Подробная причина</span>
					<textarea
						value={documentVoidReasonText}
						style={{ minHeight: "64px" }}
						onChange={(event) =>
							setDocumentVoidReasonText(event.target.value)
						}
						placeholder="Например: в справке указан неверный плательщик, нужна новая годовая справка после проверки чеков."
					/>
				</label>
			</div>
			<div className="document-issue-checkboxes">
				<label
					style={{
						minHeight: "44px",
						display: "flex",
						alignItems: "center",
					}}
				>
					<input
						type="checkbox"
						checked={documentVoidReplacementRequired}
						onChange={(event) =>
							setDocumentVoidReplacementRequired(event.target.checked)
						}
					/>
					<span>Нужен новый или исправляющий документ</span>
				</label>
				<label
					style={{
						minHeight: "44px",
						display: "flex",
						alignItems: "center",
					}}
				>
					<input
						type="checkbox"
						checked={documentVoidPatientOrPayerNotified}
						onChange={(event) =>
							setDocumentVoidPatientOrPayerNotified(event.target.checked)
						}
					/>
					<span>Пациент или плательщик уведомлен</span>
				</label>
				<label
					style={{
						minHeight: "44px",
						display: "flex",
						alignItems: "center",
					}}
				>
					<input
						type="checkbox"
						checked={documentVoidArchivePreserved}
						onChange={(event) =>
							setDocumentVoidArchivePreserved(event.target.checked)
						}
					/>
					<span>Архивная копия и история выдачи сохранены</span>
				</label>
				<label
					style={{
						minHeight: "44px",
						display: "flex",
						alignItems: "center",
					}}
				>
					<input
						type="checkbox"
						checked={documentVoidStatusReviewed}
						onChange={(event) =>
							setDocumentVoidStatusReviewed(event.target.checked)
						}
					/>
					<span>Статус, налоговые и медицинские последствия проверены</span>
				</label>
			</div>
			{!documentVoidReady && documentVoidMissingSteps.length ? (
				<div
					className="document-confirmation-missing"
					id={documentVoidMissingGuidanceId}
					role="status"
					aria-live="polite"
				>
					<strong>Чтобы аннулировать документ, осталось:</strong>
					<div
						style={{
							display: "flex",
							flexDirection: "column",
							gap: "6px",
							marginTop: "8px",
						}}
					>
						{documentVoidMissingSteps?.map((step) => (
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
					disabled={documentVoidSaving}
					aria-busy={documentVoidSaving || undefined}
					style={{ minHeight: "44px" }}
					onClick={() => setDocumentVoidConfirmationId(null)}
				>
					Вернуться
				</button>
				<button
					className="primary-button"
					type="button"
					disabled={documentVoidSaving}
					aria-busy={documentVoidSaving || undefined}
					aria-describedby={
						!documentVoidReady ? documentVoidMissingGuidanceId : undefined
					}
					style={{ minHeight: "44px" }}
					onClick={() => void confirmDocumentVoid()}
				>
					{documentVoidSaving
						? "Аннулирую документ"
						: "Аннулировать с причиной"}
				</button>
			</div>
		</section>
	);
});
