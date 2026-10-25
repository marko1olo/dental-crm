import type { DentalMeasurementsResult } from "./dentalMeasurements";
import type { SkeletalMeasurementsResult } from "./skeletalMeasurements";
import type { CephalometricDiagnosis } from "./types";
import { evaluateSkeletalAndDentalClassifications } from "./cephDiagnosis/classificationLogic";
import { buildCephalometricProtocolText } from "./cephDiagnosis/protocolTextBuilder";

export function synthesizeCephalometricDiagnosis(
	skeletal: SkeletalMeasurementsResult,
	dental: DentalMeasurementsResult,
): CephalometricDiagnosis {
	const evalResult = evaluateSkeletalAndDentalClassifications(skeletal, dental);
	const protocol043Text = buildCephalometricProtocolText(
		skeletal,
		dental,
		evalResult.growthPatternRu,
		evalResult.summaryRu,
	);

	return {
		...evalResult,
		protocol043Text,
	};
}
