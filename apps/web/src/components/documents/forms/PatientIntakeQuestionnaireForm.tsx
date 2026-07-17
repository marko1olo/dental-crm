import { CheckCircle2, FileText } from "lucide-react";
import React from "react";
import { useDocumentStore } from "../../../store/documentStore";
import { SmartMicrophoneButton } from "../../SmartMicrophoneButton";

export function PatientIntakeQuestionnaireForm({
	dashboard,
	normalizedPatientIntakePregnancyStatus,
	typedPatientIntakePregnancyStatusOptions,
}: any) {
	const {
		intakeChiefComplaint,
		setIntakeChiefComplaint,
		intakeAllergyStatus,
		setIntakeAllergyStatus,
		intakeCurrentMedications,
		setIntakeCurrentMedications,
		intakeChronicConditions,
		setIntakeChronicConditions,
		intakePregnancyStatus,
		setIntakePregnancyStatus,
		intakeAnticoagulants,
		setIntakeAnticoagulants,
		intakeInfectiousRiskNotes,
		setIntakeInfectiousRiskNotes,
		intakeCardioEndocrineNotes,
		setIntakeCardioEndocrineNotes,
		intakeEmergencyContact,
		setIntakeEmergencyContact,
		intakeAdditionalNotes,
		setIntakeAdditionalNotes,
		intakeAccuracyConfirmed,
		setIntakeAccuracyConfirmed,
	} = useDocumentStore();

	return (
		<article className="document-payload-card">
			<div>
				<h3>Анкета пациента</h3>
				<p>
					Жалоба, аллергии, лекарства, хронические заболевания и риски до
					приема.
				</p>
			</div>
			<details className="document-manual-override">
				<summary className="document-summary-toggle">
					✏️ Ручная корректировка полей (развернуть)
				</summary>
				<div className="document-payload-collapsed-content">
					<label>
						Жалоба или цель визита
						<textarea
							value={intakeChiefComplaint}
							onChange={(event) => setIntakeChiefComplaint(event.target.value)}
							placeholder={
								dashboard?.activeVisit?.complaint ?? "со слов пациента"
							}
							rows={2}
						/>
					</label>
					<label>
						Аллергии и нежелательные реакции
						<textarea
							value={intakeAllergyStatus}
							onChange={(event) => setIntakeAllergyStatus(event.target.value)}
							rows={2}
						/>
					</label>
					<label>
						Постоянные препараты
						<textarea
							value={intakeCurrentMedications}
							onChange={(event) =>
								setIntakeCurrentMedications(event.target.value)
							}
							rows={2}
						/>
					</label>
					<label>
						Хронические заболевания
						<textarea
							value={intakeChronicConditions}
							onChange={(event) =>
								setIntakeChronicConditions(event.target.value)
							}
							rows={2}
						/>
					</label>
					<div className="document-payload-row">
						<label>
							Беременность/лактация
							<select
								value={intakePregnancyStatus}
								onChange={(event) =>
									setIntakePregnancyStatus(
										normalizedPatientIntakePregnancyStatus(event.target.value),
									)
								}
							>
								{typedPatientIntakePregnancyStatusOptions.map((option) => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</select>
						</label>
						<label>
							Экстренный контакт
							<input
								value={intakeEmergencyContact}
								onChange={(event) =>
									setIntakeEmergencyContact(event.target.value)
								}
								placeholder="ФИО и телефон, если пациент сообщил"
							/>
						</label>
					</div>
					<label>
						Антикоагулянты и кровотечения
						<textarea
							value={intakeAnticoagulants}
							onChange={(event) => setIntakeAnticoagulants(event.target.value)}
							rows={2}
						/>
					</label>
					<label>
						Инфекционные риски
						<textarea
							value={intakeInfectiousRiskNotes}
							onChange={(event) =>
								setIntakeInfectiousRiskNotes(event.target.value)
							}
							rows={2}
						/>
					</label>
					<label>
						Сердце, давление, диабет и системные риски
						<textarea
							value={intakeCardioEndocrineNotes}
							onChange={(event) =>
								setIntakeCardioEndocrineNotes(event.target.value)
							}
							rows={2}
						/>
					</label>
					<label>
						Дополнительно
						<textarea
							value={intakeAdditionalNotes}
							onChange={(event) => setIntakeAdditionalNotes(event.target.value)}
							rows={2}
						/>
					</label>
					<label className="document-payload-checkbox">
						<input
							checked={intakeAccuracyConfirmed}
							type="checkbox"
							onChange={(event) =>
								setIntakeAccuracyConfirmed(event.target.checked)
							}
						/>
						Пациент подтвердил достоверность сведений
					</label>
				</div>
			</details>
		</article>
	);
}
