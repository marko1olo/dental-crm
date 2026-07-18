import type React from "react";
import { useAppLogicContext } from "../../../contexts/AppLogicContext";

export const DocumentIssueConfirmationModal: React.FC = () => {
	const {
		dashboard,
		activeDoctor,
		documentLabels,
		documentIssueConfirmation,
		patientName,
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
	} = useAppLogicContext();

	if (!documentIssueConfirmation) return null;

	return (
		<section
			className="document-issue-confirmation"
			role="dialog"
			aria-label="Подтверждение выдачи документа"
		>
			<div>
				<span>Финальная проверка</span>
				<strong>{documentLabels[documentIssueConfirmation.kind]}</strong>
				<p>
					Пациент:{" "}
					{patientName(
						dashboard.patients,
						documentIssueConfirmation.patientId,
					)}
					{documentIssueConfirmation.taxYear
						? ` · год ${documentIssueConfirmation.taxYear}`
						: ""}
					{documentIssueConfirmation.taxPayerInn
						? ` · ИНН ${documentIssueConfirmation.taxPayerInn}`
						: ""}{" "}
					· {money(documentIssueConfirmation.totalAmountRub)}
				</p>
			</div>
			<ul>
				<li>
					Откройте HTML и проверьте пациента, реквизиты, подписи и основание
					выдачи.
				</li>
				<li>
					После выдачи документ попадет в аудит и станет основанием для
					портала и уведомлений.
				</li>
			</ul>
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
						).map(([mode, label]) => (
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
						onChange={(event) =>
							setDocumentIssueSignedAt(event.target.value)
						}
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
						onChange={(event) =>
							setDocumentIssueStaffRole(event.target.value)
						}
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
					<ul>
						{documentIssueMissingSteps.map((step) => (
							<li key={step}>{step}</li>
						))}
					</ul>
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
					disabled={!documentIssueAttestationReady || documentIssueSaving}
					aria-busy={documentIssueSaving || undefined}
					aria-describedby={
						!documentIssueAttestationReady
							? documentIssueMissingGuidanceId
							: undefined
					}
					onClick={() => void confirmDocumentIssue()}
				>
					{documentIssueSaving ? "Выдаю документ" : "Выдать после проверки"}
				</button>
			</div>
		</section>
	);
};
