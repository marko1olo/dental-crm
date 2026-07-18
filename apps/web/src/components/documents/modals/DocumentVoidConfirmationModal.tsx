import type React from "react";
import type { GeneratedDocument } from "@dental/shared";
import { useAppLogicContext } from "../../../contexts/AppLogicContext";

export const DocumentVoidConfirmationModal: React.FC = () => {
	const {
		dashboard,
		activeDoctor,
		documentLabels,
		documentStatusLabels,
		documentVoidConfirmation,
		patientName,
		documentVoidReasonCode,
		setDocumentVoidReasonCode,
		normalizedDocumentVoidReasonCode,
		documentVoidReasonLabels,
		documentVoidStaffFullName,
		setDocumentVoidStaffFullName,
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
	} = useAppLogicContext();

	if (!documentVoidConfirmation) return null;

	return (
		<section
			className="document-issue-confirmation"
			role="dialog"
			aria-label="Аннулирование документа"
		>
			<div>
				<span>Аннулирование без удаления архива</span>
				<strong>{documentLabels[documentVoidConfirmation.kind]}</strong>
				<p>
					Пациент:{" "}
					{patientName(
						dashboard.patients,
						documentVoidConfirmation.patientId,
					)}
					{documentVoidConfirmation.taxYear
						? ` · год ${documentVoidConfirmation.taxYear}`
						: ""}{" "}
					· {documentStatusLabels[documentVoidConfirmation.status]}
				</p>
			</div>
			<ul>
				<li>Запись останется в журнале, архивная копия не удаляется.</li>
				<li>
					Для налоговых и медицинских документов укажите, нужна ли замена
					или исправляющий документ.
				</li>
			</ul>
			<div className="document-issue-attestation-grid">
				<label>
					<span>Причина</span>
					<select
						value={documentVoidReasonCode}
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
						).map(([code, label]) => (
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
						onChange={(event) =>
							setDocumentVoidStaffRole(event.target.value)
						}
						placeholder="врач, администратор"
					/>
				</label>
				<label>
					<span>Исправляющий документ</span>
					<select
						value={documentVoidCorrectionDocumentId}
						onChange={(event) =>
							setDocumentVoidCorrectionDocumentId(event.target.value)
						}
					>
						<option value="">Не выбран</option>
						{(activeUsableDocuments as GeneratedDocument[])
							.filter(
								(document) => document.id !== documentVoidConfirmation.id,
							)
							.map((document) => (
								<option key={document.id} value={document.id}>
									{documentLabels[document.kind]} ·{" "}
									{documentStatusLabels[document.status]}
								</option>
							))}
					</select>
				</label>
				<label className="document-issue-attestation-note">
					<span>Подробная причина</span>
					<textarea
						value={documentVoidReasonText}
						onChange={(event) =>
							setDocumentVoidReasonText(event.target.value)
						}
						placeholder="Например: в справке указан неверный плательщик, нужна новая годовая справка после проверки чеков."
					/>
				</label>
			</div>
			<div className="document-issue-checkboxes">
				<label>
					<input
						type="checkbox"
						checked={documentVoidReplacementRequired}
						onChange={(event) =>
							setDocumentVoidReplacementRequired(event.target.checked)
						}
					/>
					<span>Нужен новый или исправляющий документ</span>
				</label>
				<label>
					<input
						type="checkbox"
						checked={documentVoidPatientOrPayerNotified}
						onChange={(event) =>
							setDocumentVoidPatientOrPayerNotified(event.target.checked)
						}
					/>
					<span>Пациент или плательщик уведомлен</span>
				</label>
				<label>
					<input
						type="checkbox"
						checked={documentVoidArchivePreserved}
						onChange={(event) =>
							setDocumentVoidArchivePreserved(event.target.checked)
						}
					/>
					<span>Архивная копия и история выдачи сохранены</span>
				</label>
				<label>
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
					<ul>
						{documentVoidMissingSteps.map((step) => (
							<li key={step}>{step}</li>
						))}
					</ul>
				</div>
			) : null}
			<div className="document-issue-confirmation-actions">
				<button
					className="secondary-button"
					type="button"
					disabled={documentVoidSaving}
					aria-busy={documentVoidSaving || undefined}
					onClick={() => setDocumentVoidConfirmationId(null)}
				>
					Вернуться
				</button>
				<button
					className="primary-button"
					type="button"
					disabled={!documentVoidReady || documentVoidSaving}
					aria-busy={documentVoidSaving || undefined}
					aria-describedby={
						!documentVoidReady ? documentVoidMissingGuidanceId : undefined
					}
					onClick={() => void confirmDocumentVoid()}
				>
					{documentVoidSaving
						? "Аннулирую документ"
						: "Аннулировать с причиной"}
				</button>
			</div>
		</section>
	);
};
