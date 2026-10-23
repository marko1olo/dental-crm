/**
 * VITA Shade Normalization and Homoglyph Resolution
 */

import { VitaShade } from './types';
import { VITA_CLASSICAL_SHADES } from './vitaClassical';
import { VITA_3D_MASTER_SHADES } from './vita3dMaster';

export const ALL_VITA_SHADES: VitaShade[] = [
	...VITA_CLASSICAL_SHADES,
	...VITA_3D_MASTER_SHADES,
];

export function normalizeVitaShadeCode(code: string): string {
	if (!code) return '';
	let s = code.trim().toUpperCase();

	// Strip common prefixes
	s = s.replace(/^(VITA|3D|3D-MASTER)\s*[-_]?\s*/i, '');

	// Cyrillic to Latin homoglyphs mapping
	const cyrillicMap: Record<string, string> = {
		'А': 'A', 'а': 'A',
		'В': 'B', 'в': 'B',
		'С': 'C', 'с': 'C',
		'Д': 'D', 'д': 'D',
		'О': 'O', 'о': 'O',
		'М': 'M', 'м': 'M',
		'Л': 'L', 'л': 'L',
		'Р': 'R', 'р': 'R',
	};
	s = s.replace(/[АаВвСсДдОоМмЛлРр]/g, (char) => cyrillicMap[char] || char);

	// Strip hyphens and spaces
	s = s.replace(/[\s\-_]+/g, '');

	// Normalize OM1/OM2/OM3 (Latin letter O) to 0M1/0M2/0M3 (Digit 0)
	if (/^OM[1-3]$/.test(s)) {
		s = '0' + s.slice(1);
	}

	return s;
}

export function getVitaShadeByCode(code: string): VitaShade | undefined {
	const normalized = normalizeVitaShadeCode(code);
	if (!normalized) return undefined;
	return ALL_VITA_SHADES.find((s) => s.code.toUpperCase() === normalized);
}
