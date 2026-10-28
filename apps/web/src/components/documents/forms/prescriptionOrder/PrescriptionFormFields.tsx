import React from "react";
import { useDocumentStore } from "../../../../store/documentStore";

export interface PrescriptionFormFieldsProps {
	renderClinicalToothRowsEditor?: () => React.ReactNode;
}

export const PrescriptionFormFields: React.FC<PrescriptionFormFieldsProps> = React.memo(
	function PrescriptionFormFields({ renderClinicalToothRowsEditor }) {
		const {
			prescriptionMedication, setPrescriptionMedication,
			prescriptionDosage, setPrescriptionDosage,
			prescriptionInstructions, setPrescriptionInstructions,
			prescriptionDuration, setPrescriptionDuration,
			prescriptionSafetyNotes, setPrescriptionSafetyNotes,
			prescriptionUrgentContactReason, setPrescriptionUrgentContactReason,
		} = useDocumentStore();

		return (
			<div className="document-payload-collapsed-content" style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
				{typeof renderClinicalToothRowsEditor === "function" ? renderClinicalToothRowsEditor() : null}
				<label>
					Препарат
					<input
						value={prescriptionMedication}
						onChange={(e) => setPrescriptionMedication(e.target.value)}
						placeholder="например: ибупрофен"
					/>
				</label>
				<label>
					Дозировка
					<input value={prescriptionDosage} onChange={(e) => setPrescriptionDosage(e.target.value)} />
				</label>
				<label>
					Режим приема
					<textarea value={prescriptionInstructions} onChange={(e) => setPrescriptionInstructions(e.target.value)} rows={2} />
				</label>
				<label>
					Длительность
					<input value={prescriptionDuration} onChange={(e) => setPrescriptionDuration(e.target.value)} />
				</label>
				<label>
					Памятка пациенту
					<textarea value={prescriptionSafetyNotes} onChange={(e) => setPrescriptionSafetyNotes(e.target.value)} rows={3} />
				</label>
				<label>
					Срочно связаться если
					<textarea value={prescriptionUrgentContactReason} onChange={(e) => setPrescriptionUrgentContactReason(e.target.value)} rows={2} />
				</label>
			</div>
		);
	},
);
