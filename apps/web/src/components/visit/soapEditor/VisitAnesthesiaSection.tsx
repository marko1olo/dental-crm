/**
 * @dental/web/components/visit/soapEditor/VisitAnesthesiaSection.tsx
 * Chairside Anesthesia Section in SOAP Visit Editor (Mandate 8e, 8y, 8b <= 120 lines)
 */

import React from "react";
import { AnesthesiaQuickBar } from "../../anesthesia/AnesthesiaQuickBar";
import type { AnesthesiaCalculationResult } from "../../anesthesia/anesthesiaEngine";

export interface VisitAnesthesiaSectionProps {
	readonly patientId?: string | undefined;
	readonly visitId?: string | undefined;
	readonly targetToothNumberFdi?: number | string | undefined;
	readonly patientWeightKg?: number | undefined;
	readonly hasCardiovascularRisk?: boolean | undefined;
	readonly hasLidocaineAllergy?: boolean | undefined;
	readonly hasArticaineAllergy?: boolean | undefined;
	readonly hasSulfiteAllergy?: boolean | undefined;
	readonly hasBronchialAsthma?: boolean | undefined;
	readonly hasPenicillinAllergy?: boolean | undefined;
	readonly hasLatexAllergy?: boolean | undefined;
	readonly onApplyAnesthesia?: ((diaryText: string, result: AnesthesiaCalculationResult) => void) | undefined;
}

export function VisitAnesthesiaSection({
	patientId,
	visitId,
	targetToothNumberFdi,
	patientWeightKg,
	hasCardiovascularRisk,
	hasLidocaineAllergy,
	hasArticaineAllergy,
	hasSulfiteAllergy,
	hasBronchialAsthma,
	hasPenicillinAllergy,
	hasLatexAllergy,
	onApplyAnesthesia,
}: VisitAnesthesiaSectionProps) {
	return (
		<div className="col-span-1 md:col-span-2" data-testid="visit-anesthesia-section">
			<AnesthesiaQuickBar
				patientId={patientId}
				visitId={visitId}
				targetToothNumberFdi={targetToothNumberFdi}
				patientWeightKg={patientWeightKg}
				hasCardiovascularRisk={hasCardiovascularRisk}
				hasLidocaineAllergy={hasLidocaineAllergy}
				hasArticaineAllergy={hasArticaineAllergy}
				hasSulfiteAllergy={hasSulfiteAllergy}
				hasBronchialAsthma={hasBronchialAsthma}
				hasPenicillinAllergy={hasPenicillinAllergy}
				hasLatexAllergy={hasLatexAllergy}
				onApplyAnesthesia={onApplyAnesthesia}
				disabled={false}
			/>
		</div>
	);
}
