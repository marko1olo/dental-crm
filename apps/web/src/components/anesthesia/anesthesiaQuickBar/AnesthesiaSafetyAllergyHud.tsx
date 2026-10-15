import React from 'react';
import type { AnesthesiaSafetyAllergyHudProps } from './types';
import { AnesthesiaSafetyHeader } from './AnesthesiaSafetyHeader';
import { AnesthesiaAllergyAlertBanners } from './AnesthesiaAllergyAlertBanners';
import { AnesthesiaSafetyStopperAlert } from './AnesthesiaSafetyStopperAlert';

export function AnesthesiaSafetyAllergyHud({
	patientWeightKg,
	isCardioRisk,
	takesBetaBlockers,
	hasSulfiteAllergy,
	hasBronchialAsthma,
	hasLidocaineAllergy = false,
	hasArticaineAllergy = false,
	selectedDrugId,
	selectedDrugInfo,
	safetyWarning,
	onSelectDrug,
	onDismissWarning,
	onConfirmWarningOverride,
	onOpenEmergencyProtocol,
	disabled = false,
}: AnesthesiaSafetyAllergyHudProps) {
	return (
		<>
			{/* Top Bar: Title & Somatic Tags & Weight & Configure */}
			<AnesthesiaSafetyHeader
				patientWeightKg={patientWeightKg}
				isCardioRisk={isCardioRisk}
				takesBetaBlockers={takesBetaBlockers}
				hasSulfiteAllergy={hasSulfiteAllergy}
				hasBronchialAsthma={hasBronchialAsthma}
				hasLidocaineAllergy={hasLidocaineAllergy}
				hasArticaineAllergy={hasArticaineAllergy}
				onOpenEmergencyProtocol={onOpenEmergencyProtocol}
			/>

			{/* Dedicated Allergy and Somatic Alert Banners */}
			<AnesthesiaAllergyAlertBanners
				isCardioRisk={isCardioRisk}
				takesBetaBlockers={takesBetaBlockers}
				hasSulfiteAllergy={hasSulfiteAllergy}
				hasBronchialAsthma={hasBronchialAsthma}
				hasLidocaineAllergy={hasLidocaineAllergy}
				hasArticaineAllergy={hasArticaineAllergy}
				selectedDrugId={selectedDrugId}
				selectedDrugInfo={selectedDrugInfo}
				onSelectDrug={onSelectDrug}
			/>

			{/* Safety Alert Stopper / Confirmation Banner */}
			{safetyWarning && (
				<AnesthesiaSafetyStopperAlert
					disabled={disabled}
					safetyWarning={safetyWarning}
					onSelectDrug={onSelectDrug}
					onDismissWarning={onDismissWarning}
					onConfirmWarningOverride={onConfirmWarningOverride}
				/>
			)}
		</>
	);
}
