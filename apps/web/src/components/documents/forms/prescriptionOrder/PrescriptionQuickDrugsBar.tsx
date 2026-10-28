import React, { useMemo } from "react";
import { Sparkles } from "lucide-react";
import { useDocumentStore } from "../../../../store/documentStore";
import {
	DENTAL_STATUTORY_MNN_CATALOG,
	type DentalMnnDefinition,
} from "../../prescriptionPrintEngine";

export const PrescriptionQuickDrugsBar: React.FC = React.memo(function PrescriptionQuickDrugsBar() {
	const {
		setPrescriptionMedication,
		setPrescriptionDosage,
		setPrescriptionInstructions,
		setPrescriptionDuration,
		setPrescriptionSafetyNotes,
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

	return (
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
	);
});
