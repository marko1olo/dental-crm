import { AnamnesisField } from "../AnamnesisField";
import { PaidContractRequiredFieldsPanel } from "../PaidContractRequiredFieldsPanel";
import { EmptyState } from "../../EmptyState";
import {
	EXTRACT_DIAGNOSIS_CHIPS,
	PAID_CONTRACT_FIELDS_BLOCK_TITLE,
} from "./documentFormChips";
import type { MedicalDocumentReleaseChannel } from "../../../store/documentStore";

export function XrayCbctReferralForm(props: any) {

            const {
                article,
                div,
                h3,
                p,
                details,
                summary,
                renderClinicalToothRowsEditor,
                label,
                select,
                xrayStudyType,
                event,
                setXrayStudyType,
                normalizedXrayStudyType,
                typedXrayStudyTypeOptions,
                option,
                input,
                xrayArea,
                setXrayArea,
                inferredTreatmentArea,
                textarea,
                xrayClinicalQuestion,
                setXrayClinicalQuestion,
                xrayIndication,
                setXrayIndication,
                xrayPriority,
                setXrayPriority,
                normalizedXrayPriority,
                xrayPregnancyStatus,
                setXrayPregnancyStatus,
                normalizedXrayPregnancyStatus,
                typedXrayPregnancyStatusOptions,
                xraySafetyNotes,
                setXraySafetyNotes,
                xrayIncludeDicomExport,
                setXrayIncludeDicomExport,
                xrayIncludeRadiologistReport,
                setXrayIncludeRadiologistReport,
                xrayRequestedBy,
                setXrayRequestedBy,
                activeDoctor,
                xrayRecipientClinic,
                setXrayRecipientClinic,
                xrayDueDate,
                setXrayDueDate
            } = props;
            
            return (
                <article className="document-payload-card">
    							<div>
    								<h3>Направление на снимок</h3>
    								<p>
    									Вид исследования, область, клинический вопрос, показание и
    									ограничения до рентгена или КЛКТ.
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
    									{renderClinicalToothRowsEditor()}
    									<label>
    										Вид исследования
    										<select
    											value={xrayStudyType}
    											onChange={(event) =>
    												setXrayStudyType(
    													normalizedXrayStudyType(event.target.value),
    												)
    											}
    										>
    											{typedXrayStudyTypeOptions.map((option) => (
    												<option key={option.value} value={option.value}>
    													{option.label}
    												</option>
    											))}
    										</select>
    									</label>
    									<label>
    										Область
    										<input
    											value={xrayArea}
    											onChange={(event) => setXrayArea(event.target.value)}
    											placeholder={
    												inferredTreatmentArea || "зуб / сегмент / челюсть"
    											}
    										/>
    									</label>
    									<label>
    										Клинический вопрос
    										<textarea
    											value={xrayClinicalQuestion}
    											onChange={(event) =>
    												setXrayClinicalQuestion(event.target.value)
    											}
    											placeholder="что нужно подтвердить или исключить"
    											rows={2}
    										/>
    									</label>
    									<label>
    										Показание
    										<textarea
    											value={xrayIndication}
    											onChange={(event) =>
    												setXrayIndication(event.target.value)
    											}
    											placeholder="эндодонтия / имплантация / хирургия / ортодонтия / контроль"
    											rows={2}
    										/>
    									</label>
    									<div className="document-payload-row">
    										<label>
    											Срочность
    											<select
    												value={xrayPriority}
    												onChange={(event) =>
    													setXrayPriority(
    														normalizedXrayPriority(event.target.value),
    													)
    												}
    											>
    												<option value="routine">Планово</option>
    												<option value="urgent">Срочно</option>
    											</select>
    										</label>
    										<label>
    											Беременность
    											<select
    												value={xrayPregnancyStatus}
    												onChange={(event) =>
    													setXrayPregnancyStatus(
    														normalizedXrayPregnancyStatus(event.target.value),
    													)
    												}
    											>
    												{typedXrayPregnancyStatusOptions.map((option) => (
    													<option key={option.value} value={option.value}>
    														{option.label}
    													</option>
    												))}
    											</select>
    										</label>
    									</div>
    									<label>
    										Ограничения и защита
    										<textarea
    											value={xraySafetyNotes}
    											onChange={(event) =>
    												setXraySafetyNotes(event.target.value)
    											}
    											rows={2}
    										/>
    									</label>
    									<div className="document-payload-row">
    										<label className="document-payload-checkbox">
    											<input
    												checked={xrayIncludeDicomExport}
    												type="checkbox"
    												onChange={(event) =>
    													setXrayIncludeDicomExport(event.target.checked)
    												}
    											/>
    											Нужны исходные файлы снимков
    										</label>
    										<label className="document-payload-checkbox">
    											<input
    												checked={xrayIncludeRadiologistReport}
    												type="checkbox"
    												onChange={(event) =>
    													setXrayIncludeRadiologistReport(event.target.checked)
    												}
    											/>
    											Нужен отчет рентгенолога
    										</label>
    									</div>
    									<label>
    										Назначил
    										<input
    											value={xrayRequestedBy}
    											onChange={(event) =>
    												setXrayRequestedBy(event.target.value)
    											}
    											placeholder={activeDoctor?.fullName ?? "лечащий врач"}
    										/>
    									</label>
    									<div className="document-payload-row">
    										<label>
    											Куда направить
    											<input
    												value={xrayRecipientClinic}
    												onChange={(event) =>
    													setXrayRecipientClinic(event.target.value)
    												}
    												placeholder="свой кабинет / партнерский центр"
    											/>
    										</label>
    										<label>
    											Срок
    											<input
    												value={xrayDueDate}
    												onChange={(event) => setXrayDueDate(event.target.value)}
    												placeholder="например: до имплантации"
    											/>
    										</label>
    									</div>
    								</div>
    							</details>
    						</article>
            );
            
}

