import { PEDIATRIC_MINOR_CONSENT_PRESET } from "@dental/shared";
import React from "react";
import { useDocumentStore } from "../../../store/documentStore";
import { DocumentPayloadCard } from "../DocumentPayloadCard";
import type { DocumentVisitHints } from "./documentFormTypes";

export interface MinorLegalRepresentativeConsentFormProps extends DocumentVisitHints {
	minorRepresentativeNameValue?: () => string;
	minorRepresentativePhoneValue?: () => string;
	minorConsentPatientFullNameValue?: () => string;
	minorConsentPatientBirthDateValue?: () => string;
	minorConsentInterventionScopeValue?: () => string;
	minorConsentDiagnosisOrIndicationValue?: () => string;
}

/**
 * ИДС на стоматологическое лечение несовершеннолетнего (педиатрия с законным представителем).
 * Ст. 20 ФЗ № 323-ФЗ и Приказ Минздрава № 1051н.
 */
export const MinorLegalRepresentativeConsentForm = React.memo(
	function MinorLegalRepresentativeConsentForm({
		activeDoctorFullName,
		minorRepresentativeNameValue,
		minorRepresentativePhoneValue,
		minorConsentPatientFullNameValue,
		minorConsentPatientBirthDateValue,
		minorConsentInterventionScopeValue,
		minorConsentDiagnosisOrIndicationValue,
	}: MinorLegalRepresentativeConsentFormProps) {
		const minorRepresentativeName = useDocumentStore(
			(state) => state.minorRepresentativeFullName,
		);
		const setMinorRepresentativeName = useDocumentStore(
			(state) => state.setMinorRepresentativeFullName,
		);
		const minorRepresentativeRelation = useDocumentStore(
			(state) => state.minorRepresentativeRelationship,
		);
		const setMinorRepresentativeRelation = useDocumentStore(
			(state) => state.setMinorRepresentativeRelationship,
		);
		const minorRepresentativeDocument = useDocumentStore(
			(state) => state.minorRepresentativeIdentityDocument,
		);
		const setMinorRepresentativeDocument = useDocumentStore(
			(state) => state.setMinorRepresentativeIdentityDocument,
		);
		const minorRepresentativePhone = useDocumentStore(
			(state) => state.minorRepresentativePhone,
		);
		const setMinorRepresentativePhone = useDocumentStore(
			(state) => state.setMinorRepresentativePhone,
		);
		const minorConsentPatientFullName = useDocumentStore(
			(state) => state.minorConsentPatientFullName,
		);
		const setMinorConsentPatientFullName = useDocumentStore(
			(state) => state.setMinorConsentPatientFullName,
		);
		const minorConsentPatientBirthDate = useDocumentStore(
			(state) => state.minorConsentPatientBirthDate,
		);
		const setMinorConsentPatientBirthDate = useDocumentStore(
			(state) => state.setMinorConsentPatientBirthDate,
		);
		const minorConsentInterventionScope = useDocumentStore(
			(state) => state.minorConsentInterventionScope,
		);
		const setMinorConsentInterventionScope = useDocumentStore(
			(state) => state.setMinorConsentInterventionScope,
		);
		const minorConsentDiagnosisOrIndication = useDocumentStore(
			(state) => state.minorConsentDiagnosisOrIndication,
		);
		const setMinorConsentDiagnosisOrIndication = useDocumentStore(
			(state) => state.setMinorConsentDiagnosisOrIndication,
		);
		const minorConsentRisks = useDocumentStore(
			(state) => state.minorConsentRisks,
		);
		const setMinorConsentRisks = useDocumentStore(
			(state) => state.setMinorConsentRisks,
		);
		const minorConsentAlternatives = useDocumentStore(
			(state) => state.minorConsentAlternatives,
		);
		const setMinorConsentAlternatives = useDocumentStore(
			(state) => state.setMinorConsentAlternatives,
		);
		const minorConsentDoctorFullName = useDocumentStore(
			(state) => state.minorConsentDoctorFullName,
		);
		const setMinorConsentDoctorFullName = useDocumentStore(
			(state) => state.setMinorConsentDoctorFullName,
		);
		const minorConsentSignedAt = useDocumentStore(
			(state) => state.minorConsentSignedAt,
		);
		const setMinorConsentSignedAt = useDocumentStore(
			(state) => state.setMinorConsentSignedAt,
		);
		const minorConsentIdentityVerified = useDocumentStore(
			(state) => state.minorConsentIdentityVerified,
		);
		const setMinorConsentIdentityVerified = useDocumentStore(
			(state) => state.setMinorConsentIdentityVerified,
		);
		const minorConsentAuthorityVerified = useDocumentStore(
			(state) => state.minorConsentAuthorityVerified,
		);
		const setMinorConsentAuthorityVerified = useDocumentStore(
			(state) => state.setMinorConsentAuthorityVerified,
		);
		const minorConsentExplained = useDocumentStore(
			(state) => state.minorConsentExplained,
		);
		const setMinorConsentExplained = useDocumentStore(
			(state) => state.setMinorConsentExplained,
		);
		const minorConsentStored = useDocumentStore(
			(state) => state.minorConsentStored,
		);
		const setMinorConsentStored = useDocumentStore(
			(state) => state.setMinorConsentStored,
		);
		const minorConsentAgeExplanation = useDocumentStore(
			(state) => state.minorConsentAgeExplanation,
		);
		const setMinorConsentAgeExplanation = useDocumentStore(
			(state) => state.setMinorConsentAgeExplanation,
		);

		const applyPediatricPreset = () => {
			setMinorConsentInterventionScope(PEDIATRIC_MINOR_CONSENT_PRESET.interventionScope);
			setMinorConsentDiagnosisOrIndication(PEDIATRIC_MINOR_CONSENT_PRESET.diagnosisOrIndication);
			setMinorConsentRisks(PEDIATRIC_MINOR_CONSENT_PRESET.explainedRisks.join("\n"));
			setMinorConsentAlternatives(PEDIATRIC_MINOR_CONSENT_PRESET.alternativesExplained.join("\n"));
		};

		return (
			<DocumentPayloadCard
				title="Согласие законного представителя (педиатрия)"
				description="Информированное согласие на стоматологическое лечение несовершеннолетнего гражданина РФ до 15 лет (до 18 лет при наркологических расстройствах)."
			>
				<div style={{ marginBottom: "12px" }}>
					<button
						type="button"
						className="secondary-button"
						style={{ fontSize: "12px", padding: "4px 10px" }}
						onClick={applyPediatricPreset}
					>
						👶 Заполнить стандартный протокол детского стоматологического лечения (323-ФЗ)
					</button>
				</div>

				<div className="document-payload-row">
					<label>
						Законный представитель
						<input
							value={minorRepresentativeName}
							onChange={(event) =>
								setMinorRepresentativeName(event.target.value)
							}
							placeholder={
								minorRepresentativeNameValue?.() ||
								"ФИО родителя, опекуна, усыновителя"
							}
						/>
					</label>
					<label>
						Статус / родство
						<input
							value={minorRepresentativeRelation}
							onChange={(event) =>
								setMinorRepresentativeRelation(event.target.value)
							}
							placeholder="мать / отец / опекун / доверенное лицо"
						/>
					</label>
				</div>
				<label>
					Документ представителя
					<input
						value={minorRepresentativeDocument}
						onChange={(event) =>
							setMinorRepresentativeDocument(event.target.value)
						}
						placeholder="свидетельство о рождении ребенка, паспорт родителя, акт опеки, доверенность"
					/>
				</label>
				<div className="document-payload-row">
					<label>
						Пациент (ребенок)
						<input
							value={minorConsentPatientFullName}
							onChange={(event) =>
								setMinorConsentPatientFullName(event.target.value)
							}
							placeholder={
								minorConsentPatientFullNameValue?.() ||
								"ФИО несовершеннолетнего пациента"
							}
						/>
					</label>
					<label>
						Дата рождения ребенка
						<input
							value={minorConsentPatientBirthDate}
							onChange={(event) =>
								setMinorConsentPatientBirthDate(event.target.value)
							}
							placeholder={
								minorConsentPatientBirthDateValue?.() || "ГГГГ-ММ-ДД"
							}
						/>
					</label>
				</div>
				<label>
					Контактный телефон представителя
					<input
						value={minorRepresentativePhone}
						onChange={(event) =>
							setMinorRepresentativePhone(event.target.value)
						}
						placeholder={
							minorRepresentativePhoneValue?.() || "+7 (___) ___-__-__"
						}
					/>
				</label>
				<label>
					Объем вмешательства
					<textarea
						value={minorConsentInterventionScope}
						onChange={(event) =>
							setMinorConsentInterventionScope(event.target.value)
						}
						placeholder={
							minorConsentInterventionScopeValue?.() ||
							"первичный осмотр, рентген, лечение временных/постоянных зубов, адаптация"
						}
						rows={2}
					/>
				</label>
				<label>
					Диагноз или клиническое показание
					<textarea
						value={minorConsentDiagnosisOrIndication}
						onChange={(event) =>
							setMinorConsentDiagnosisOrIndication(event.target.value)
						}
						placeholder={
							minorConsentDiagnosisOrIndicationValue?.() ||
							"кариес, пульпит временного зуба, профилактика"
						}
						rows={2}
					/>
				</label>
				<label>
					Разъясненные риски и особенности детского возраста
					<textarea
						value={minorConsentRisks}
						onChange={(event) =>
							setMinorConsentRisks(event.target.value)
						}
						rows={3}
					/>
				</label>
				<label>
					Альтернативы лечения
					<textarea
						value={minorConsentAlternatives}
						onChange={(event) =>
							setMinorConsentAlternatives(event.target.value)
						}
						rows={2}
					/>
				</label>
				<div className="document-payload-row">
					<label>
						Лечащий врач
						<input
							value={minorConsentDoctorFullName}
							onChange={(event) =>
								setMinorConsentDoctorFullName(event.target.value)
							}
							placeholder={activeDoctorFullName ?? "детский врач-стоматолог"}
						/>
					</label>
					<label>
						Дата и время оформления
						<input
							value={minorConsentSignedAt}
							onChange={(event) =>
								setMinorConsentSignedAt(event.target.value)
							}
						/>
					</label>
				</div>
				<div className="document-payload-checkboxes">
					<label className="document-payload-checkbox">
						<input
							checked={minorConsentIdentityVerified}
							type="checkbox"
							onChange={(event) =>
								setMinorConsentIdentityVerified(event.target.checked)
							}
						/>
						Личность законного представителя проверена по паспорту
					</label>
					<label className="document-payload-checkbox">
						<input
							checked={minorConsentAuthorityVerified}
							type="checkbox"
							onChange={(event) =>
								setMinorConsentAuthorityVerified(event.target.checked)
							}
						/>
						Полномочия законного представителя подтверждены документом
					</label>
					<label className="document-payload-checkbox">
						<input
							checked={minorConsentExplained}
							type="checkbox"
							onChange={(event) =>
								setMinorConsentExplained(event.target.checked)
							}
						/>
						Цель, риски, анестезия и уход разъяснены родителю/представителю
					</label>
					<label className="document-payload-checkbox">
						<input
							checked={minorConsentStored}
							type="checkbox"
							onChange={(event) =>
								setMinorConsentStored(event.target.checked)
							}
						/>
						Согласие подшивается в медицинскую карту формы 043/у
					</label>
					<label className="document-payload-checkbox">
						<input
							checked={minorConsentAgeExplanation}
							type="checkbox"
							onChange={(event) =>
								setMinorConsentAgeExplanation(event.target.checked)
							}
						/>
						Ребенку даны понятные адаптационные разъяснения по возрасту
					</label>
				</div>
			</DocumentPayloadCard>
		);
	},
);
