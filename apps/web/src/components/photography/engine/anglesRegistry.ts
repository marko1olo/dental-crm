import type { Standard8AngleDefinition } from './anglesTypes';
import { EXTRAORAL_ANGLES } from './anglesExtraoral';
import { INTRAORAL_ANGLES } from './anglesIntraoral';

export * from './anglesTypes';

export const STANDARD_8_CLINICAL_ANGLES: readonly Standard8AngleDefinition[] = [
	...EXTRAORAL_ANGLES,
	...INTRAORAL_ANGLES,
];

export const STANDARD_8_ANGLES_MAP: Record<string, Standard8AngleDefinition> = Object.fromEntries(
	STANDARD_8_CLINICAL_ANGLES.flatMap((a) => [
		[a.key, a],
		[a.slotId, a],
	])
);

export function getStandard8Angle(keyOrSlotId: string): Standard8AngleDefinition | undefined {
	return STANDARD_8_ANGLES_MAP[keyOrSlotId];
}
