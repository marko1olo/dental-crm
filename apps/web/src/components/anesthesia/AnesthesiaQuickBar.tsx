import React from "react";
import { CheckCircle2 } from "lucide-react";
import { STANDARD_ANESTHESIA_NORM_PRESET_RU } from "../../lib/clinicalProtocols043";
import {
	formatAnesthesiaPatientMemo,
	type AnesthesiaPatientMemoParams,
	WEIGHT_QUICK_PRESETS,
	WEIGHT_PRESETS,
	PRIMARY_ANESTHETIC_DRUGS,
	type AnesthesiaQuickBarProps,
} from "./anesthesiaQuickBar/types";
import { AnestheticDrugSelector } from "./anesthesiaQuickBar/AnestheticDrugSelector";
import { AnesthesiaMethodSelector } from "./anesthesiaQuickBar/AnesthesiaMethodSelector";
import { AnesthesiaSafetyAllergyHud } from "./anesthesiaQuickBar/AnesthesiaSafetyAllergyHud";
import { AnesthesiaQuickBarActions } from "./anesthesiaQuickBar/AnesthesiaQuickBarActions";
import { useAnesthesiaQuickBar } from "./anesthesiaQuickBar/useAnesthesiaQuickBar";
import "./anesthesia.css";

export {
	formatAnesthesiaPatientMemo,
	type AnesthesiaPatientMemoParams,
	WEIGHT_QUICK_PRESETS,
	WEIGHT_PRESETS,
	PRIMARY_ANESTHETIC_DRUGS,
	type AnesthesiaQuickBarProps,
	STANDARD_ANESTHESIA_NORM_PRESET_RU,
};

export function AnesthesiaQuickBar(props: AnesthesiaQuickBarProps) {
	const bar = useAnesthesiaQuickBar(props);

	return (
		<div className="anesthesia-quick-bar" data-testid="anesthesia-quick-bar">
			<AnesthesiaSafetyAllergyHud
				patientWeightKg={bar.patientWeightKg}
				isCardioRisk={bar.isCardioRisk}
				takesBetaBlockers={Boolean(props.takesBetaBlockers)}
				hasSulfiteAllergy={Boolean(props.hasSulfiteAllergy)}
				hasBronchialAsthma={Boolean(props.hasBronchialAsthma)}
				selectedDrugId={bar.selectedDrugId}
				selectedDrugInfo={bar.selectedDrugInfo}
				safetyWarning={bar.safetyWarning}
				onSelectDrug={bar.handleSelectDrug}
				onDismissWarning={bar.handleDismissWarning}
				onConfirmWarningOverride={bar.handleConfirmWarningOverride}
				onOpenEmergencyProtocol={props.onOpenEmergencyProtocol}
				onOpenAspirationJournal={props.onOpenAspirationJournal}
				disabled={props.disabled}
			/>

			<AnesthesiaMethodSelector
				techniqueId={bar.techniqueId}
				onSelectTechnique={bar.setTechniqueId}
				targetToothNumberFdi={props.targetToothNumberFdi}
				disabled={props.disabled}
			/>

			<AnestheticDrugSelector
				selectedDrugId={bar.selectedDrugId}
				onSelectDrug={bar.handleSelectDrug}
				isCardioRisk={bar.isCardioRisk}
				hasSulfiteAllergy={Boolean(props.hasSulfiteAllergy)}
				hasBronchialAsthma={Boolean(props.hasBronchialAsthma)}
				disabled={props.disabled}
			/>

			<AnesthesiaQuickBarActions
				patientWeightKg={bar.patientWeightKg}
				selectedDrugId={bar.selectedDrugId}
				selectedDrugInfo={bar.selectedDrugInfo}
				singleCarpuleResult={bar.singleCarpuleResult}
				maxSafeCarpules={bar.maxSafeCarpules}
				sessionInjectedCarpules={bar.sessionInjectedCarpules}
				selectedCarpulesCount={bar.selectedCarpulesCount}
				onChangeSelectedCarpulesCount={bar.setSelectedCarpulesCount}
				onApplyCarpules={bar.handleApplyCarpules}
				onApplyStandardNormPreset={bar.handleApplyStandardNormPreset}
				onApplyUltracainForteCombined={bar.handleApplyUltracainForteCombined}
				onApplySeptanestInfiltration={bar.handleApplySeptanestInfiltration}
				onNurseQuickDisposal={bar.handleNurseQuickDisposal}
				onNursePacketDisposal={bar.handleNursePacketDisposal}
				onNurseSeptanestDisposal={bar.handleNurseSeptanestDisposal}
				onSelectDrug={bar.handleSelectDrug}
				disabled={props.disabled}
			/>

			{bar.activeToastMessage && (
				<div className="anesthesia-quick-toast" role="status">
					<CheckCircle2 size={16} />
					<span>{bar.activeToastMessage}</span>
				</div>
			)}
		</div>
	);
}
