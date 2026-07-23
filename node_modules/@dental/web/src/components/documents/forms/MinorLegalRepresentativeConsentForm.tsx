import { CheckCircle2, FileText } from "lucide-react";
import React from "react";
import { useDocumentStore } from "../../../store/documentStore";
import { SmartMicrophoneButton } from "../../SmartMicrophoneButton";

export function MinorLegalRepresentativeConsentForm({
	activeDoctor,
	minorConsentDiagnosisOrIndicationValue,
	minorConsentInterventionScopeValue,
	minorConsentPatientBirthDateValue,
	minorConsentPatientFullNameValue,
	minorRepresentativeFullNameValue,
	minorRepresentativeIdentityDocumentValue,
	minorRepresentativePhoneValue,
	minorRepresentativeRelationshipValue,
}: any) {
	const {
		minorRepresentativeFullName,
		setMinorRepresentativeFullName,
		minorRepresentativeRelationship,
		setMinorRepresentativeRelationship,
		minorRepresentativeIdentityDocument,
		setMinorRepresentativeIdentityDocument,
		minorRepresentativeAuthorityDocument,
		setMinorRepresentativeAuthorityDocument,
		minorRepresentativePhone,
		setMinorRepresentativePhone,
		minorConsentPatientFullName,
		setMinorConsentPatientFullName,
		minorConsentPatientBirthDate,
		setMinorConsentPatientBirthDate,
		minorConsentInterventionScope,
		setMinorConsentInterventionScope,
		minorConsentDiagnosisOrIndication,
		setMinorConsentDiagnosisOrIndication,
		minorConsentRisks,
		setMinorConsentRisks,
		minorConsentAlternatives,
		setMinorConsentAlternatives,
		minorConsentDoctorFullName,
		setMinorConsentDoctorFullName,
		minorConsentSignedAt,
		setMinorConsentSignedAt,
		minorConsentIdentityVerified,
		setMinorConsentIdentityVerified,
		minorConsentAuthorityVerified,
		setMinorConsentAuthorityVerified,
		minorConsentExplained,
		setMinorConsentExplained,
		minorConsentStored,
		setMinorConsentStored,
		minorConsentAgeExplanation,
		setMinorConsentAgeExplanation,
	} = useDocumentStore();

	return (
		<article className="document-payload-card">
			<div>
				<h3>Согласие законного представителя</h3>
				<p>
					Проверка личности, полномочий и согласия на конкретное вмешательство
					несовершеннолетнего.
				</p>
			</div>
			<details className="document-manual-override">
				<summary className="document-summary-toggle">
					✏️ Ручная корректировка полей (развернуть)
				</summary>
				<div className="document-payload-collapsed-content">
					<div className="document-payload-row">
						<label>
							Представитель
							<input
								value={minorRepresentativeFullName}
								onChange={(event) =>
									setMinorRepresentativeFullName(event.target.value)
								}
								placeholder={
									minorRepresentativeFullNameValue() ||
									"ФИО законного представителя"
								}
							/>
						</label>
						<label>
							Родство или статус
							<input
								value={minorRepresentativeRelationship}
								onChange={(event) =>
									setMinorRepresentativeRelationship(event.target.value)
								}
								placeholder={
									minorRepresentativeRelationshipValue() || "мать, отец, опекун"
								}
							/>
						</label>
					</div>
					<label>
						Документ представителя
						<input
							value={minorRepresentativeIdentityDocument}
							onChange={(event) =>
								setMinorRepresentativeIdentityDocument(event.target.value)
							}
							placeholder={
								minorRepresentativeIdentityDocumentValue() ||
								"паспорт или иной документ"
							}
						/>
					</label>
					<label>
						Основание полномочий
						<input
							value={minorRepresentativeAuthorityDocument}
							onChange={(event) =>
								setMinorRepresentativeAuthorityDocument(event.target.value)
							}
							placeholder="свидетельство о рождении, акт опеки, доверенность"
						/>
					</label>
					<div className="document-payload-row">
						<label>
							Пациент
							<input
								value={minorConsentPatientFullName}
								onChange={(event) =>
									setMinorConsentPatientFullName(event.target.value)
								}
								placeholder={minorConsentPatientFullNameValue()}
							/>
						</label>
						<label>
							Дата рождения пациента
							<input
								value={minorConsentPatientBirthDate}
								onChange={(event) =>
									setMinorConsentPatientBirthDate(event.target.value)
								}
								placeholder={minorConsentPatientBirthDateValue()}
							/>
						</label>
					</div>
					<label>
						Контакт представителя
						<input
							value={minorRepresentativePhone}
							onChange={(event) =>
								setMinorRepresentativePhone(event.target.value)
							}
							placeholder={
								minorRepresentativePhoneValue() || "телефон представителя"
							}
						/>
					</label>
					<label>
						Вмешательство
						<textarea
							value={minorConsentInterventionScope}
							onChange={(event) =>
								setMinorConsentInterventionScope(event.target.value)
							}
							placeholder={minorConsentInterventionScopeValue()}
							rows={2}
						/>
					</label>
					<label>
						Диагноз или показание
						<textarea
							value={minorConsentDiagnosisOrIndication}
							onChange={(event) =>
								setMinorConsentDiagnosisOrIndication(event.target.value)
							}
							placeholder={minorConsentDiagnosisOrIndicationValue()}
							rows={2}
						/>
					</label>
					<label>
						Риски
						<textarea
							value={minorConsentRisks}
							onChange={(event) => setMinorConsentRisks(event.target.value)}
							rows={4}
						/>
					</label>
					<label>
						Альтернативы
						<textarea
							value={minorConsentAlternatives}
							onChange={(event) =>
								setMinorConsentAlternatives(event.target.value)
							}
							rows={4}
						/>
					</label>
					<div className="document-payload-row">
						<label>
							Врач
							<input
								value={minorConsentDoctorFullName}
								onChange={(event) =>
									setMinorConsentDoctorFullName(event.target.value)
								}
								placeholder={activeDoctor?.fullName ?? "лечащий врач"}
							/>
						</label>
						<label>
							Подписано
							<input
								value={minorConsentSignedAt}
								onChange={(event) =>
									setMinorConsentSignedAt(event.target.value)
								}
							/>
						</label>
					</div>
					<label className="document-payload-checkbox">
						<input
							checked={minorConsentIdentityVerified}
							type="checkbox"
							onChange={(event) =>
								setMinorConsentIdentityVerified(event.target.checked)
							}
						/>
						Личность представителя проверена
					</label>
					<label className="document-payload-checkbox">
						<input
							checked={minorConsentAuthorityVerified}
							type="checkbox"
							onChange={(event) =>
								setMinorConsentAuthorityVerified(event.target.checked)
							}
						/>
						Полномочия представителя подтверждены
					</label>
					<label className="document-payload-checkbox">
						<input
							checked={minorConsentExplained}
							type="checkbox"
							onChange={(event) =>
								setMinorConsentExplained(event.target.checked)
							}
						/>
						Риски, альтернативы и ожидаемый результат разъяснены
					</label>
					<label className="document-payload-checkbox">
						<input
							checked={minorConsentStored}
							type="checkbox"
							onChange={(event) => setMinorConsentStored(event.target.checked)}
						/>
						Согласие будет храниться в медицинской документации
					</label>
					<label className="document-payload-checkbox">
						<input
							checked={minorConsentAgeExplanation}
							type="checkbox"
							onChange={(event) =>
								setMinorConsentAgeExplanation(event.target.checked)
							}
						/>
						Ребенку дано объяснение по возрасту и состоянию
					</label>
				</div>
			</details>
		</article>
	);
}
