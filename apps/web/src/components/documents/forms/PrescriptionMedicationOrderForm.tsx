import { CheckCircle2, FileText } from "lucide-react";
import React from "react";
import { useDocumentStore } from "../../../store/documentStore";
import { usePatientStore } from "../../../store/patientStore";
import { SmartMicrophoneButton } from "../../SmartMicrophoneButton";

export function PrescriptionMedicationOrderForm({
	renderClinicalToothRowsEditor,
}: any) {
	const {
		prescriptionMedication,
		setPrescriptionMedication,
		prescriptionDosage,
		setPrescriptionDosage,
		prescriptionInstructions,
		setPrescriptionInstructions,
		prescriptionDuration,
		setPrescriptionDuration,
		prescriptionSafetyNotes,
		setPrescriptionSafetyNotes,
		prescriptionUrgentContactReason,
		setPrescriptionUrgentContactReason,
	} = useDocumentStore();

	const patientAllergies = usePatientStore((s) => s.anamnesisDraft.allergies);
	
	const triggeredAllergies = patientAllergies.filter(a => 
		prescriptionMedication && prescriptionMedication.toLowerCase().includes(a.toLowerCase())
	);

	return (
		<article className="document-payload-card">
			<div>
				<h3>Назначение препаратов</h3>
				<p>Один понятный блок назначения без догадок в документе.</p>
			</div>
			<details className="document-manual-override">
				<summary className="document-summary-toggle">
					✏️ Ручная корректировка полей (развернуть)
				</summary>
				<div className="document-payload-collapsed-content">
					{renderClinicalToothRowsEditor()}
					<label>
						Препарат
						<input
							value={prescriptionMedication}
							onChange={(event) =>
								setPrescriptionMedication(event.target.value)
							}
							placeholder="например: ибупрофен"
							style={{ borderColor: triggeredAllergies.length > 0 ? "var(--red)" : undefined }}
						/>
						{triggeredAllergies.length > 0 && (
							<div style={{ color: "var(--red)", fontSize: "14px", marginTop: "4px", fontWeight: "bold", display: "flex", gap: "6px", alignItems: "center" }}>
								<span style={{ fontSize: "16px" }}>⚠️</span> ВНИМАНИЕ: У ПАЦИЕНТА АЛЛЕРГИЯ НА {triggeredAllergies.join(", ").toUpperCase()}
							</div>
						)}
					</label>
					<label>
						Дозировка
						<input
							value={prescriptionDosage}
							onChange={(event) => setPrescriptionDosage(event.target.value)}
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
							onChange={(event) => setPrescriptionDuration(event.target.value)}
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
