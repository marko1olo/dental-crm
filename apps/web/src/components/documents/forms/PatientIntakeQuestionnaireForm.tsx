import React from "react";
import { AnamnesisField } from "../AnamnesisField";
import { useDocumentStore } from "../../../store/documentStore";

interface PatientIntakeQuestionnaireFormProps {
	activeVisitComplaint?: string | null;
}

export const PatientIntakeQuestionnaireForm: React.FC<
	PatientIntakeQuestionnaireFormProps
> = React.memo(({ activeVisitComplaint }) => {
	const intakeChiefComplaint = useDocumentStore(
		(state) => state.intakeChiefComplaint,
	);
	const setIntakeChiefComplaint = useDocumentStore(
		(state) => state.setIntakeChiefComplaint,
	);
	const intakeAllergyStatus = useDocumentStore(
		(state) => state.intakeAllergyStatus,
	);
	const setIntakeAllergyStatus = useDocumentStore(
		(state) => state.setIntakeAllergyStatus,
	);
	const intakeCurrentMedications = useDocumentStore(
		(state) => state.intakeCurrentMedications,
	);
	const setIntakeCurrentMedications = useDocumentStore(
		(state) => state.setIntakeCurrentMedications,
	);
	const intakeChronicConditions = useDocumentStore(
		(state) => state.intakeChronicConditions,
	);
	const setIntakeChronicConditions = useDocumentStore(
		(state) => state.setIntakeChronicConditions,
	);
	const intakePregnancyStatus = useDocumentStore(
		(state) => state.intakePregnancyStatus,
	);
	const setIntakePregnancyStatus = useDocumentStore(
		(state) => state.setIntakePregnancyStatus,
	);
	const intakeEmergencyContact = useDocumentStore(
		(state) => state.intakeEmergencyContact,
	);
	const setIntakeEmergencyContact = useDocumentStore(
		(state) => state.setIntakeEmergencyContact,
	);
	const intakeAnticoagulants = useDocumentStore(
		(state) => state.intakeAnticoagulants,
	);
	const setIntakeAnticoagulants = useDocumentStore(
		(state) => state.setIntakeAnticoagulants,
	);
	const intakeInfectiousRiskNotes = useDocumentStore(
		(state) => state.intakeInfectiousRiskNotes,
	);
	const setIntakeInfectiousRiskNotes = useDocumentStore(
		(state) => state.setIntakeInfectiousRiskNotes,
	);
	const intakeCardioEndocrineNotes = useDocumentStore(
		(state) => state.intakeCardioEndocrineNotes,
	);
	const setIntakeCardioEndocrineNotes = useDocumentStore(
		(state) => state.setIntakeCardioEndocrineNotes,
	);
	const intakeAdditionalNotes = useDocumentStore(
		(state) => state.intakeAdditionalNotes,
	);
	const setIntakeAdditionalNotes = useDocumentStore(
		(state) => state.setIntakeAdditionalNotes,
	);
	const intakeAccuracyConfirmed = useDocumentStore(
		(state) => state.intakeAccuracyConfirmed,
	);
	const setIntakeAccuracyConfirmed = useDocumentStore(
		(state) => state.setIntakeAccuracyConfirmed,
	);

	return (
		<article className="document-payload-card">
			<div>
				<h3>Анкета о состоянии здоровья</h3>
				<p>
					Жалобы, аллергии, соматический статус, хронические диагнозы, постоянная
					фармакотерапия и специфические риски перед вмешательством.
				</p>
			</div>
			<details
				className="document-manual-override"
				style={{
					background: "var(--surface-100)",
					padding: "12px 16px",
					borderRadius: "8px",
					border: "1px solid var(--line)",
					marginTop: "16px",
				}}
			>
				<summary
					style={{
						cursor: "pointer",
						fontWeight: 600,
						color: "var(--brand-700)",
						userSelect: "none",
					}}
				>
					✏️ Ручная корректировка полей (развернуть)
				</summary>
				<div
					className="document-payload-collapsed-content"
					style={{
						marginTop: "16px",
						display: "flex",
						flexDirection: "column",
						gap: "16px",
					}}
				>
					<label>
						Жалоба или цель визита
						<textarea
							value={intakeChiefComplaint}
							onChange={(event) =>
								setIntakeChiefComplaint(event.target.value)
							}
							placeholder={activeVisitComplaint ?? "со слов пациента"}
							rows={2}
						/>
					</label>
					<AnamnesisField
						label="Аллергии и нежелательные реакции"
						value={intakeAllergyStatus}
						onChange={setIntakeAllergyStatus}
						placeholder="на что бывала реакция: препараты, латекс, металлы, анестетики"
						denialText="Аллергии и нежелательные реакции со слов пациента не отмечены."
					/>
					<AnamnesisField
						label="Постоянные препараты"
						value={intakeCurrentMedications}
						onChange={setIntakeCurrentMedications}
						placeholder="что пациент принимает постоянно и в какой дозе"
						denialText="Постоянные препараты со слов пациента не принимает."
						denialLabel="Со слов пациента — не принимает"
					/>
					<AnamnesisField
						label="Хронические заболевания"
						value={intakeChronicConditions}
						onChange={setIntakeChronicConditions}
						placeholder="диабет, гипертония, гепатит, эпилепсия и другое"
						denialText="Хронические заболевания со слов пациента отрицает."
						denialLabel="Со слов пациента — отрицает"
					/>
					<div className="document-payload-row">
						<label>
							Беременность/лактация
							<select
								value={intakePregnancyStatus}
								onChange={(event) =>
									setIntakePregnancyStatus(
										event.target.value as any,
									)
								}
							>
								<option value="not_applicable">Не применимо / отрицает</option>
								<option value="pregnant_first_trimester">Беременность 1 триместр</option>
								<option value="pregnant_second_trimester">Беременность 2 триместр</option>
								<option value="pregnant_third_trimester">Беременность 3 триместр</option>
								<option value="lactating">Период грудного вскармливания</option>
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
					<AnamnesisField
						label="Антикоагулянты и кровотечения"
						value={intakeAnticoagulants}
						onChange={setIntakeAnticoagulants}
						placeholder="варфарин, ксарелто, аспирин; были ли долгие кровотечения"
						denialText="Антикоагулянты и препараты, влияющие на кровотечение, со слов пациента не принимает."
						denialLabel="Со слов пациента — не принимает"
					/>
					<AnamnesisField
						label="Инфекционные риски"
						value={intakeInfectiousRiskNotes}
						onChange={setIntakeInfectiousRiskNotes}
						placeholder="гепатит, ВИЧ, туберкулёз и другое, о чём сообщил пациент"
						denialText="Инфекционные риски со слов пациента не заявлены."
						denialLabel="Со слов пациента — не заявлены"
					/>
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
							onChange={(event) =>
								setIntakeAdditionalNotes(event.target.value)
							}
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
});

PatientIntakeQuestionnaireForm.displayName = "PatientIntakeQuestionnaireForm";
