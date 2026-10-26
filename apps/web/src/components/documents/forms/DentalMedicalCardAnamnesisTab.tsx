/**
 * forms/DentalMedicalCardAnamnesisTab.tsx
 * Anamnesis and clinical status tab for dental medical card (Mandate 8b <= 120 lines, Mandate 8e, Mandate 8x)
 * Разделы: История настоящего заболевания:, Анамнез жизни и соматический статус.
 */

import type React from "react";
import { AnamnesisSomaticSection } from "./medicalCard/AnamnesisSomaticSection";
import { AnamnesisOralStatusSection } from "./medicalCard/AnamnesisOralStatusSection";
import type { DentalMedicalCardAnamnesisTabProps } from "./medicalCard/medicalCardAnamnesisTypes";

export {
	ORAL_MUCOSA_COLORS,
	ORAL_MUCOSA_MOISTURE,
	GINGIVAL_PAPILLAE_OPTIONS,
	BLEEDING_PBI_OPTIONS,
} from "./medicalCard/anamnesisConstants";
export type { DentalMedicalCardAnamnesisTabProps } from "./medicalCard/medicalCardAnamnesisTypes";

export const DentalMedicalCardAnamnesisTab: React.FC<DentalMedicalCardAnamnesisTabProps> = (props) => {
	const {
		xrayFindingsDescription,
		setXrayFindingsDescription,
		generalTreatmentPlan,
		setGeneralTreatmentPlan,
		effectiveDisabled,
	} = props;

	return (
		<div className="form-043u-anamnesis-tab">
			<AnamnesisSomaticSection {...props} />
			<AnamnesisOralStatusSection {...props} />

			<h5 style={{ marginBottom: "12px", borderTop: "1px solid var(--doc-border, #cbd5e1)", paddingTop: "14px" }}>
				Рентгенодиагностика и Общий план лечения
			</h5>
			<div style={{ marginBottom: "14px" }}>
				<label style={{ display: "block", marginBottom: "4px", fontWeight: 600 }}>Данные рентгенологических исследований / КТ:</label>
				<textarea
					value={xrayFindingsDescription}
					onChange={(e) => setXrayFindingsDescription(e.target.value)}
					rows={2}
					disabled={effectiveDisabled}
					style={{ width: "100%" }}
				/>
			</div>
			<div>
				<label style={{ display: "block", marginBottom: "4px", fontWeight: 600 }}>Общий план лечения стоматологического больного:</label>
				<textarea
					value={generalTreatmentPlan}
					onChange={(e) => setGeneralTreatmentPlan(e.target.value)}
					rows={3}
					disabled={effectiveDisabled}
					style={{ width: "100%" }}
				/>
			</div>
		</div>
	);
};
