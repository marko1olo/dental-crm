import { AnamnesisField } from "../AnamnesisField";
import { PaidContractRequiredFieldsPanel } from "../PaidContractRequiredFieldsPanel";
import { EmptyState } from "../../EmptyState";
import {
	EXTRACT_DIAGNOSIS_CHIPS,
	PAID_CONTRACT_FIELDS_BLOCK_TITLE,
} from "./documentFormChips";
import type { MedicalDocumentReleaseChannel } from "../../../store/documentStore";

export function PrescriptionMedicationOrderForm(props: any) {

            const {
                article,
                div,
                h3,
                p,
                details,
                summary,
                renderClinicalToothRowsEditor,
                label,
                input,
                prescriptionMedication,
                event,
                setPrescriptionMedication,
                prescriptionDosage,
                setPrescriptionDosage,
                textarea,
                prescriptionInstructions,
                setPrescriptionInstructions,
                prescriptionDuration,
                setPrescriptionDuration,
                prescriptionSafetyNotes,
                setPrescriptionSafetyNotes,
                prescriptionUrgentContactReason,
                setPrescriptionUrgentContactReason
            } = props;
            
            return (
                <article className="document-payload-card">
    							<div>
    								<h3>Назначение препаратов</h3>
    								<p>Один понятный блок назначения без догадок в документе.</p>
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
    										Препарат
    										<input
    											value={prescriptionMedication}
    											onChange={(event) =>
    												setPrescriptionMedication(event.target.value)
    											}
    											placeholder="например: ибупрофен"
    										/>
    									</label>
    									<label>
    										Дозировка
    										<input
    											value={prescriptionDosage}
    											onChange={(event) =>
    												setPrescriptionDosage(event.target.value)
    											}
    										/>
    									</label>
    									<label>
    										Режим приема
    										<textarea
    											value={prescriptionInstructions}
    											onChange={(event) =>
    												setPrescriptionInstructions(event.target.value)
    											}
    											rows={2}
    										/>
    									</label>
    									<label>
    										Длительность
    										<input
    											value={prescriptionDuration}
    											onChange={(event) =>
    												setPrescriptionDuration(event.target.value)
    											}
    										/>
    									</label>
    									<label>
    										Памятка пациенту
    										<textarea
    											value={prescriptionSafetyNotes}
    											onChange={(event) =>
    												setPrescriptionSafetyNotes(event.target.value)
    											}
    											rows={3}
    										/>
    									</label>
    									<label>
    										Срочно связаться если
    										<textarea
    											value={prescriptionUrgentContactReason}
    											onChange={(event) =>
    												setPrescriptionUrgentContactReason(event.target.value)
    											}
    											rows={2}
    										/>
    									</label>
    								</div>
    							</details>
    						</article>
            );
            
}

