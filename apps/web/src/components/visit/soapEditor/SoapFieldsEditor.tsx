import React from "react";
import { SoapAnamnesisSection } from "./SoapAnamnesisSection";
import { SoapDiagnosisSection } from "./SoapDiagnosisSection";
import { SoapExpressProtocolsBar } from "./SoapExpressProtocolsBar";
import { SoapTreatmentSection } from "./SoapTreatmentSection";
import type { SoapFieldsEditorProps } from "./types";
import { VisitAnesthesiaSection } from "./VisitAnesthesiaSection";

export const SoapFieldsEditor: React.FC<SoapFieldsEditorProps> = ({
	values,
	onFieldChange,
	onInputFocus,
	onInputBlur,
	selectedTooth,
	isIcd10SelectorOpen,
	onToggleIcd10Selector,
	onApplyExpressProtocol,
	onOpenOrthoWidget,
	patientId,
	visitId,
	patientWeightKg,
	hasCardiovascularRisk,
	hasLidocaineAllergy,
	hasArticaineAllergy,
	hasSulfiteAllergy,
	hasBronchialAsthma,
	hasPenicillinAllergy,
	hasLatexAllergy,
}) => {
	const handleApplyAnesthesia = (diaryText: string) => {
		const current = values.treatmentPlan || "";
		const updated = current ? `${diaryText}\n\n${current}` : diaryText;
		onFieldChange("treatmentPlan", updated);
	};

	return (
		<div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 pb-[calc(env(safe-area-inset-bottom,0px)+80px)] md:pb-4">
			<SoapExpressProtocolsBar
				onApplyExpressProtocol={onApplyExpressProtocol}
				onOpenOrthoWidget={onOpenOrthoWidget}
			/>

			<SoapAnamnesisSection
				values={values}
				onFieldChange={onFieldChange}
				onInputFocus={onInputFocus}
				onInputBlur={onInputBlur}
			/>

			<SoapDiagnosisSection
				values={values}
				onFieldChange={onFieldChange}
				onInputFocus={onInputFocus}
				onInputBlur={onInputBlur}
				selectedTooth={selectedTooth}
				isIcd10SelectorOpen={isIcd10SelectorOpen}
				onToggleIcd10Selector={onToggleIcd10Selector}
			/>

			<VisitAnesthesiaSection
				patientId={patientId}
				visitId={visitId}
				targetToothNumberFdi={selectedTooth ?? undefined}
				patientWeightKg={patientWeightKg}
				hasCardiovascularRisk={hasCardiovascularRisk}
				hasLidocaineAllergy={hasLidocaineAllergy}
				hasArticaineAllergy={hasArticaineAllergy}
				hasSulfiteAllergy={hasSulfiteAllergy}
				hasBronchialAsthma={hasBronchialAsthma}
				hasPenicillinAllergy={hasPenicillinAllergy}
				hasLatexAllergy={hasLatexAllergy}
				onApplyAnesthesia={handleApplyAnesthesia}
			/>

			<SoapTreatmentSection
				values={values}
				onFieldChange={onFieldChange}
				onInputFocus={onInputFocus}
				onInputBlur={onInputBlur}
				selectedTooth={selectedTooth}
				patientId={patientId}
			/>
		</div>
	);
};
