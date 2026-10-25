/**
 * packages/shared/src/perio/olearyCalc.ts
 *
 * Calculation functions for O'Leary Plaque Control Record and Bleeding Index.
 * Mandate 8b: File <= 120 lines.
 */

import type { PerioToothRecord } from "./types.js";
import type {
	OlearyPcrSummary,
	OlearyPlaqueControlRating,
	OlearySurface,
	OlearyToothData,
} from "./olearyTypes.js";

export function calculateOlearyPcr(teeth: readonly OlearyToothData[]): OlearyPcrSummary {
	const presentTeeth = teeth.filter((t) => t.isPresent);
	const presentTeethCount = presentTeeth.length;
	const totalSurfaces = Math.max(1, presentTeethCount * 4);

	let totalPlaque = 0;
	let totalBleeding = 0;
	let interproximalPlaque = 0;
	let smoothPlaque = 0;
	const quadrantPlaqueCount = { 1: 0, 2: 0, 3: 0, 4: 0 };

	for (const tooth of presentTeeth) {
		const quad = Math.floor(tooth.toothFdi / 10) as 1 | 2 | 3 | 4;
		const plaqueSurfaces = tooth.surfacesWithPlaque ?? [];
		const bleedingSurfaces = tooth.surfacesWithBleeding ?? [];

		for (const s of plaqueSurfaces) {
			totalPlaque++;
			if (quad >= 1 && quad <= 4) quadrantPlaqueCount[quad]++;
			if (s === "mesial" || s === "distal") interproximalPlaque++;
			else smoothPlaque++;
		}
		totalBleeding += bleedingSurfaces.length;
	}

	const pcrPercent = Number.parseFloat(((totalPlaque / totalSurfaces) * 100).toFixed(1));
	const bleedingPercent = Number.parseFloat(((totalBleeding / totalSurfaces) * 100).toFixed(1));

	let rating: OlearyPlaqueControlRating = "excellent";
	let ratingDescriptionRu = "Отличный уровень гигиены (< 10%): биопленка под контролем, допуск к хирургии";

	if (pcrPercent > 30.0) {
		rating = "inadequate";
		ratingDescriptionRu = "Неудовлетворительная гигиена (> 30%): высокий риск рецидива пародонтита, требуется ремотивация";
	} else if (pcrPercent > 20.0) {
		rating = "moderate";
		ratingDescriptionRu = "Умеренный налет (21-30%): показан повторный контролируемый тренинг гигиены";
	} else if (pcrPercent >= 10.0) {
		rating = "good";
		ratingDescriptionRu = "Хороший уровень гигиены (10-20%): стабильное состояние с небольшими зонами ретенции";
	}

	const interproximalTotal = Math.max(1, presentTeethCount * 2);
	const smoothTotal = Math.max(1, presentTeethCount * 2);

	let highestPlaqueQuadrant: 1 | 2 | 3 | 4 = 1;
	let maxQuadPlaque = -1;
	for (let q = 1 as 1 | 2 | 3 | 4; q <= 4; q = (q + 1) as 1 | 2 | 3 | 4) {
		if (quadrantPlaqueCount[q] > maxQuadPlaque) {
			maxQuadPlaque = quadrantPlaqueCount[q];
			highestPlaqueQuadrant = q;
		}
	}

	return {
		presentTeethCount, totalSurfaces, plaqueSurfacesCount: totalPlaque,
		bleedingSurfacesCount: totalBleeding, pcrPercent, bleedingPercent,
		rating, ratingDescriptionRu,
		isSurgicalClearanceMet: pcrPercent <= 15.0 && bleedingPercent <= 15.0,
		interproximalPlaquePercent: Number.parseFloat(((interproximalPlaque / interproximalTotal) * 100).toFixed(1)),
		smoothSurfacePlaquePercent: Number.parseFloat(((smoothPlaque / smoothTotal) * 100).toFixed(1)),
		highestPlaqueQuadrant,
	};
}

export function calculateOlearyFromPerioTeeth(teeth: readonly PerioToothRecord[]): OlearyPcrSummary {
	const olearyData: OlearyToothData[] = teeth.map((tooth) => {
		const surfacesWithPlaque: OlearySurface[] = [];
		const surfacesWithBleeding: OlearySurface[] = [];

		if (tooth.mesioBuccal?.plaque || tooth.mesioLingual?.plaque) surfacesWithPlaque.push("mesial");
		if (tooth.mesioBuccal?.bleedingOnProbing || tooth.mesioLingual?.bleedingOnProbing) surfacesWithBleeding.push("mesial");
		if (tooth.distoBuccal?.plaque || tooth.distoLingual?.plaque) surfacesWithPlaque.push("distal");
		if (tooth.distoBuccal?.bleedingOnProbing || tooth.distoLingual?.bleedingOnProbing) surfacesWithBleeding.push("distal");
		if (tooth.midBuccal?.plaque) surfacesWithPlaque.push("buccal");
		if (tooth.midBuccal?.bleedingOnProbing) surfacesWithBleeding.push("buccal");
		if (tooth.midLingual?.plaque) surfacesWithPlaque.push("lingual");
		if (tooth.midLingual?.bleedingOnProbing) surfacesWithBleeding.push("lingual");

		return {
			toothFdi: tooth.toothNumber, isPresent: !tooth.isMissing,
			isImplant: tooth.isImplant, surfacesWithPlaque, surfacesWithBleeding,
		};
	});

	return calculateOlearyPcr(olearyData);
}
