/**
 * Helper factory for VITA Shade objects
 */

import { ColorRGB, VitaShade, VitaSystemType } from './types';
import { rgbToLab } from './colorimetry';

export function createVitaShade(
	code: string,
	nameRu: string,
	system: VitaSystemType,
	rgb: ColorRGB,
	hueGroup: 'A' | 'B' | 'C' | 'D' | 'L' | 'M' | 'R' | 'Bleach',
	valueRanking: number,
	chromaLevel: number,
	descriptionRu: string,
): VitaShade {
	return {
		code,
		nameRu,
		system,
		rgb,
		lab: rgbToLab(rgb),
		hueGroup,
		valueRanking,
		chromaLevel,
		descriptionRu,
	};
}
