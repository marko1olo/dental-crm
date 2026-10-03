import React, { useMemo } from "react";
import { Edit3, AlertCircle, Sparkles } from "lucide-react";
import { useDocumentStore } from "../../../store/documentStore";
import {
	DENTAL_STATUTORY_MNN_CATALOG,
	ORDER_1094N_NAME,
	FORM_107_1_U_TITLE,
	validatePrescriptionItemStrict,
	type DentalMnnDefinition,
} from "../prescriptionPrintEngine";

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

		const quickDrugs = useMemo(
			() =>
				DENTAL_STATUTORY_MNN_CATALOG.filter((d) =>
					[
						"amoxicillin",
						"amoxicillin_clavulanate",
						"ibuprofen",
						"nimesulide",
						"chlorhexidine",
					].includes(d.id),
				),
			[],
		);

		const applyQuickDrug = (drug: DentalMnnDefinition) => {
			setPrescriptionMedication(`${drug.mnnRu} (${drug.mnnLatin})`);
			if (drug.standardDosages[0]) {
				setPrescriptionDosage(drug.standardDosages[0]);
			}
			setPrescriptionInstructions(drug.standardSignaRussianTemplate);
			setPrescriptionDuration(
				drug.category === "antibiotic"
					? "5–7 дней"
					: drug.category === "antiseptic"
						? "7–10 дней"
						: "3–5 дней",
			);
			setPrescriptionSafetyNotes(
				`Максимальная суточная доза: ${drug.maxDailyDoseRu}.${drug.pediatricNotesRu ? ` ${drug.pediatricNotesRu}` : ""}`,
			);
		};

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
					<h3>Назначение препаратов ({FORM_107_1_U_TITLE})</h3>
					<p>Рецептурный бланк по {ORDER_1094N_NAME} с выпиской по МНН.</p>
				</div>
				<div style={{ display: "flex", flexWrap: "wrap", gap: "6px", margin: "8px 0" }}>
					{quickDrugs.map((drug) => (
						<button
							key={drug.id}
							type="button"
							onClick={() => applyQuickDrug(drug)}
							style={{
								display: "inline-flex",
								alignItems: "center",
								gap: "4px",
								fontSize: "0.75rem",
								padding: "4px 8px",
								borderRadius: "var(--radius-sm, 4px)",
								border: "1px solid var(--border-subtle, #cbd5e1)",
								background: "var(--surface-subtle, #f8fafc)",
								color: "var(--text-main, #0f172a)",
								cursor: "pointer",
							}}
							title={`Выбрать шаблон: ${drug.mnnRu} (${drug.categoryLabelRu})`}
						>
							<Sparkles size={11} aria-hidden="true" />
							{drug.mnnRu}
						</button>
					))}
				</div>
				{validation && (!validation.isValid || validation.warnings.length > 0) ? (
					<div
						style={{
							margin: "8px 0",
							padding: "8px 12px",
							borderRadius: "var(--radius-sm, 4px)",
							backgroundColor: "var(--surface-warning, #fffbeb)",
							border: "1px solid var(--border-warning, #fef3c7)",
							color: "var(--text-warning, #92400e)",
							fontSize: "0.8rem",
							display: "flex",
							flexDirection: "column",
							gap: "4px",
						}}
					>
						{validation.errors.map((err, idx) => (
							<div key={idx} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
								<AlertCircle size={13} aria-hidden="true" />
								<span>{err}</span>
							</div>
						))}
						{validation.warnings.map((warn, idx) => (
							<div key={`w-${idx}`} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
								<AlertCircle size={13} aria-hidden="true" />
								<span>{warn}</span>
							</div>
						))}
					</div>
				) : null}
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
