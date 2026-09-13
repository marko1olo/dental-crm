import React, { useCallback } from "react";
import { ClinicalDiaryTemplatesModal } from "../emr/templates/ClinicalDiaryTemplatesModal";
import {
	type ClinicalSoapPreset,
	CLINICAL_SOAP_PRESETS,
	getPresetById,
} from "./clinicalSoapPresets";

export interface VisitSoapTemplatesModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly onApplyPreset: (
		preset: ClinicalSoapPreset,
		targetTooth?: number | null,
		mode?: "clean_replace" | "smart_append",
	) => void;
	readonly activeTooth?: number | null;
	readonly isLocked?: boolean;
}

/**
 * Transparent Facade: Delegates to ClinicalDiaryTemplatesModal (Mandate 8s Best-of-Breed SSOT).
 * Bridges ClinicalSoapPreset format to the unified statutory EMR protocols engine.
 */
export const VisitSoapTemplatesModal: React.FC<VisitSoapTemplatesModalProps> = ({
	isOpen,
	onClose,
	onApplyPreset,
	activeTooth = null,
	isLocked = false,
}) => {
	const handleApplyDiary = useCallback(
		(result: any) => {
			const matchedPreset =
				getPresetById(result.templateId) ||
				CLINICAL_SOAP_PRESETS.find((p) => result.templateId.startsWith(p.id)) ||
				CLINICAL_SOAP_PRESETS.find((p) => p.icd10 === result.icd10Code) ||
				CLINICAL_SOAP_PRESETS[0];

			const targetTooth = result.toothNumber ?? activeTooth ?? matchedPreset?.defaultTooth ?? 16;
			const effectivePreset: ClinicalSoapPreset = matchedPreset
				? {
						...matchedPreset,
						complaint: result.subjectiveComplaints || matchedPreset.complaint,
						anamnesis: result.anamnesisMorbi || matchedPreset.anamnesis,
						statusLocalis: result.objectiveStatusLocalis || matchedPreset.statusLocalis,
						treatmentDescription: result.procedureProtocol || matchedPreset.treatmentDescription,
					}
				: {
						id: result.templateId,
						title: result.title,
						shortBadge: result.icd10Code,
						category: "therapy",
						icd10: result.icd10Code,
						icd10Label: `${result.icd10Code} ${result.title}`,
						complaint: result.subjectiveComplaints,
						anamnesis: result.anamnesisMorbi,
						statusLocalis: result.objectiveStatusLocalis,
						treatmentDescription: result.procedureProtocol,
						toothState: "Caries",
						defaultTooth: targetTooth,
						service804n: {
							code804n: result.order804nServices?.[0]?.code || "A16.07.002.001",
							title: result.order804nServices?.[0]?.nameRu || result.title,
							basePriceRub: 4500,
							category: "therapy",
						},
						materialsToDeduct: [],
						recommendations: result.homeCareRecommendations || "Соблюдение гигиены полости рта",
						warrantyMonths: 12,
						serviceLifeMonths: 24,
					};

			onApplyPreset(effectivePreset, targetTooth, "clean_replace");
			onClose();
		},
		[activeTooth, onApplyPreset, onClose],
	);

	if (!isOpen) return null;

	return (
		<ClinicalDiaryTemplatesModal
			isOpen={isOpen}
			onClose={onClose}
			initialToothNumber={activeTooth}
			onApplyDiary={handleApplyDiary}
		/>
	);
};

export default VisitSoapTemplatesModal;
