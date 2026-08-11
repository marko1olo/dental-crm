import { AnamnesisField } from "../AnamnesisField";
import { PaidContractRequiredFieldsPanel } from "../PaidContractRequiredFieldsPanel";
import { EmptyState } from "../../EmptyState";
import {
	EXTRACT_DIAGNOSIS_CHIPS,
	PAID_CONTRACT_FIELDS_BLOCK_TITLE,
} from "./documentFormChips";
import type { MedicalDocumentReleaseChannel } from "../../../store/documentStore";

export function PatientIntakeQuestionnaireForm(props: any) {

            const {
                article,
                div,
                h3,
                p,
                details,
                summary,
                label,
                textarea,
                intakeChiefComplaint,
                event,
                setIntakeChiefComplaint,
                dashboard,
                intakeAllergyStatus,
                setIntakeAllergyStatus,
                intakeCurrentMedications,
                setIntakeCurrentMedications,
                intakeChronicConditions,
                setIntakeChronicConditions,
                select,
                intakePregnancyStatus,
                setIntakePregnancyStatus,
                normalizedPatientIntakePregnancyStatus,
                typedPatientIntakePregnancyStatusOptions,
                option,
                input,
                intakeEmergencyContact,
                setIntakeEmergencyContact,
                intakeAnticoagulants,
                setIntakeAnticoagulants,
                intakeInfectiousRiskNotes,
                setIntakeInfectiousRiskNotes,
                intakeCardioEndocrineNotes,
                setIntakeCardioEndocrineNotes,
                intakeAdditionalNotes,
                setIntakeAdditionalNotes,
                intakeAccuracyConfirmed,
                setIntakeAccuracyConfirmed
            } = props;
            
            return (
                <article className="document-payload-card">
    							<div>
    								<h3>Анкета пациента</h3>
    								<p>
    									Жалоба, аллергии, лекарства, хронические заболевания и риски
    									до приема.
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
    											placeholder={
    												dashboard?.activeVisit?.complaint ?? "со слов пациента"
    											}
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
    														normalizedPatientIntakePregnancyStatus(
    															event.target.value,
    														),
    													)
    												}
    											>
    												{typedPatientIntakePregnancyStatusOptions.map(
    													(option) => (
    														<option key={option.value} value={option.value}>
    															{option.label}
    														</option>
    													),
    												)}
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
            
}
