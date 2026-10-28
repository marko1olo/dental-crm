import React, { useMemo } from "react";
import { Edit3 } from "lucide-react";
import { useDocumentStore } from "../../../store/documentStore";
import { validatePrescriptionItemStrict } from "../prescriptionPrintEngine";
import { PrescriptionQuickDrugsBar } from "./prescriptionOrder/PrescriptionQuickDrugsBar";
import { PrescriptionValidationAlert } from "./prescriptionOrder/PrescriptionValidationAlert";
import { PrescriptionFormFields } from "./prescriptionOrder/PrescriptionFormFields";

export interface PrescriptionOrderFormProps {
	renderClinicalToothRowsEditor?: () => React.ReactNode;
}

export const PrescriptionOrderForm: React.FC<PrescriptionOrderFormProps> = React.memo(
	function PrescriptionOrderForm({ renderClinicalToothRowsEditor }) {
		const {
			prescriptionMedication,
			prescriptionDosage,
			prescriptionInstructions,
		} = useDocumentStore();

		const validation = useMemo(() => {
			if (!prescriptionMedication.trim() && !prescriptionInstructions.trim()) {
				return null;
			}
			return validatePrescriptionItemStrict({
				mnnLatin: prescriptionMedication,
				dosage: prescriptionDosage,
				formAndDispenseLatin: "D.t.d. N 20",
				signaRu: prescriptionInstructions,
			});
		}, [prescriptionMedication, prescriptionDosage, prescriptionInstructions]);

		return (
			<article className="document-payload-card">
				<div>
					<h3>Назначение препаратов (Рецептурный бланк)</h3>
					<p>Рецептурный бланк с выпиской по МНН для аптеки.</p>
				</div>

				<PrescriptionQuickDrugsBar />
				<PrescriptionValidationAlert validation={validation} />

				<details className="document-manual-override">
					<summary
						style={{
							cursor: "pointer",
							fontWeight: 600,
							color: "var(--brand-700)",
							userSelect: "none",
						}}
					>
						<span
							style={{
								display: "inline-flex",
								alignItems: "center",
								gap: "6px",
							}}
						>
							<Edit3 size={13} aria-hidden="true" />
							Ручная корректировка полей (развернуть)
						</span>
					</summary>
					<PrescriptionFormFields renderClinicalToothRowsEditor={renderClinicalToothRowsEditor} />
				</details>
			</article>
		);
	},
);
