import React from "react";
import { Edit3 } from "lucide-react";
import { useDocumentStore } from "../../../store/documentStore";

export interface PrescriptionOrderFormProps {
	renderClinicalToothRowsEditor?: () => React.ReactNode;
}

export const PrescriptionOrderForm: React.FC<PrescriptionOrderFormProps> =
	React.memo(function PrescriptionOrderForm(props) {
		const { renderClinicalToothRowsEditor } = props;

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

		return (
			<article className="document-payload-card">
				<div>
					<h3>Назначение препаратов</h3>
					<p>Один понятный блок назначения без догадок в документе.</p>
				</div>
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
					<div
						className="document-payload-collapsed-content"
						style={{
							marginTop: "16px",
							display: "flex",
							flexDirection: "column",
							gap: "16px",
						}}
					>
						{typeof renderClinicalToothRowsEditor === "function"
							? renderClinicalToothRowsEditor()
							: null}
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
	});
