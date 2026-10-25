/**
 * implantDensityAnatomy.ts — Анатомический выбор параметров имплантата по зубу FDI (11–48) и кости Misch.
 */

import type { MischDensity, ImplantCapType } from "../implantPresetTypes";

export interface AnatomicalImplantDefaults {
	readonly toothFdi: number;
	readonly diameterMm: number;
	readonly lengthMm: number;
	readonly torqueNcm: number;
	readonly boneDensity: MischDensity;
	readonly capType: ImplantCapType;
	readonly isqDay0: number;
	readonly sutureMaterial: string;
}

export function getBoneDensityByToothFdi(toothFdi: number): MischDensity {
	if (toothFdi >= 11 && toothFdi <= 28) {
		if ([17, 18, 27, 28].includes(toothFdi)) return "D4";
		return "D3";
	}
	if (toothFdi >= 31 && toothFdi <= 48) {
		if ([31, 32, 33, 41, 42, 43].includes(toothFdi)) return "D1";
		if ([37, 38, 47, 48].includes(toothFdi)) return "D3";
		return "D2";
	}
	return "D2";
}

export function getAnatomicalImplantDefaults(toothFdi: number): AnatomicalImplantDefaults {
	const tooth = toothFdi || 46;
	const boneDensity = getBoneDensityByToothFdi(tooth);
	const toothNum = tooth % 10;
	const isUpper = tooth >= 11 && tooth <= 28;

	// Моляры (16, 17, 18, 26, 27, 28, 36, 37, 38, 46, 47, 48): стандартно 4.5 x 10 мм
	if (toothNum === 6 || toothNum === 7 || toothNum === 8) {
		return {
			toothFdi: tooth,
			diameterMm: 4.5,
			lengthMm: 10.0,
			torqueNcm: 35,
			boneDensity,
			capType: "fdm",
			isqDay0: 72,
			sutureMaterial: "Викрил 4-0",
		};
	}

	// Премоляры (14, 15, 24, 25, 34, 35, 44, 45): стандартно 4.0 x 10 мм
	if (toothNum === 4 || toothNum === 5) {
		return {
			toothFdi: tooth,
			diameterMm: 4.0,
			lengthMm: 10.0,
			torqueNcm: 35,
			boneDensity,
			capType: "fdm",
			isqDay0: 72,
			sutureMaterial: "Викрил 4-0",
		};
	}

	// Верхние резцы (11, 21, 12, 22): 3.5 x 12.0 мм
	if (isUpper && (toothNum === 1 || toothNum === 2)) {
		return {
			toothFdi: tooth,
			diameterMm: 3.5,
			lengthMm: 12.0,
			torqueNcm: 35,
			boneDensity,
			capType: "fdm",
			isqDay0: 72,
			sutureMaterial: "Викрил 4-0",
		};
	}

	// Клыки (13, 23, 33, 43): 4.0 x 11.5 мм
	if (toothNum === 3) {
		return {
			toothFdi: tooth,
			diameterMm: 4.0,
			lengthMm: 11.5,
			torqueNcm: 35,
			boneDensity,
			capType: "fdm",
			isqDay0: 72,
			sutureMaterial: "Викрил 4-0",
		};
	}

	// Нижние резцы (31, 32, 41, 42): 3.5 x 10.0 мм
	return {
		toothFdi: tooth,
		diameterMm: 3.5,
		lengthMm: 10.0,
		torqueNcm: 35,
		boneDensity,
		capType: "fdm",
		isqDay0: 72,
		sutureMaterial: "Викрил 4-0",
	};
}
