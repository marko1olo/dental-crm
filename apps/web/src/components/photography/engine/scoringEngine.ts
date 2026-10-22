import type { PhotoSlotRecord } from '../photoGridPresets';
import { STANDARD_8_CLINICAL_ANGLES, type Standard8AngleDefinition } from './anglesRegistry';

export interface ProtocolCompletenessResult {
	readonly totalRequired: number; // 8
	readonly uploadedCount: number;
	readonly completionPercentage: number;
	readonly isComplete: boolean;
	readonly missingAngles: readonly Standard8AngleDefinition[];
	readonly extraoralCount: number; // 0..3
	readonly intraoralCount: number; // 0..5
}

export function calculateProtocolCompleteness(
	slots: Record<string, PhotoSlotRecord | { imageUrl?: string } | undefined>
): ProtocolCompletenessResult {
	let uploadedCount = 0;
	let extraoralCount = 0;
	let intraoralCount = 0;
	const missingAngles: Standard8AngleDefinition[] = [];

	for (const angle of STANDARD_8_CLINICAL_ANGLES) {
		const rec = slots[angle.slotId] || slots[angle.key];
		const hasImage = Boolean(rec && rec.imageUrl && rec.imageUrl.trim().length > 0);
		if (hasImage) {
			uploadedCount += 1;
			if (angle.category === 'extraoral') extraoralCount += 1;
			if (angle.category === 'intraoral') intraoralCount += 1;
		} else {
			missingAngles.push(angle);
		}
	}

	const totalRequired = 8;
	const completionPercentage = Math.round((uploadedCount / totalRequired) * 100);
	const isComplete = uploadedCount === totalRequired;

	return {
		totalRequired,
		uploadedCount,
		completionPercentage,
		isComplete,
		missingAngles,
		extraoralCount,
		intraoralCount,
	};
}
