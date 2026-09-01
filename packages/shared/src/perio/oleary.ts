/**
 * O'Leary Plaque Control Record (PCR) & Bleeding Index (BI) Engine.
 * Based on O'Leary, Drake & Naylor (1972) clinical periodontal index standard.
 *
 * Evaluates plaque biofilm presence at the gingival margin across 4 or 6 anatomical surfaces
 * per present tooth. Provides clinical staging, quadrant distribution, and pre-surgical clearance gates.
 */

import { z } from "zod";
import type { PerioToothRecord } from "./types.js";

export const olearySurfaceSchema = z.enum(["mesial", "distal", "buccal", "lingual"]);
export type OlearySurface = z.infer<typeof olearySurfaceSchema>;

export const OLEARY_4_SURFACES: readonly OlearySurface[] = [
	"mesial",
	"distal",
	"buccal",
	"lingual",
] as const;

export interface OlearyToothData {
	readonly toothFdi: number;
	readonly isPresent: boolean;
	readonly isImplant?: boolean | undefined;
	readonly surfacesWithPlaque: readonly OlearySurface[];
	readonly surfacesWithBleeding?: readonly OlearySurface[] | undefined;
}

export type OlearyPlaqueControlRating =
	| "excellent" // < 10% (Pre-surgical threshold met)
	| "good" // 10% - 20%
	| "moderate" // 21% - 30%
	| "inadequate"; // > 30% (Contraindication for regenerative surgery)

export interface OlearyPcrSummary {
	readonly presentTeethCount: number;
	readonly totalSurfaces: number; // presentTeethCount * 4
	readonly plaqueSurfacesCount: number;
	readonly bleedingSurfacesCount: number;
	readonly pcrPercent: number; // 0.0 .. 100.0%
	readonly bleedingPercent: number; // 0.0 .. 100.0%
	readonly rating: OlearyPlaqueControlRating;
	readonly ratingDescriptionRu: string;
	readonly isSurgicalClearanceMet: boolean; // pcrPercent <= 15% and bleedingPercent <= 15%
	readonly interproximalPlaquePercent: number; // Mesial + Distal
	readonly smoothSurfacePlaquePercent: number; // Buccal + Lingual
	readonly highestPlaqueQuadrant: 1 | 2 | 3 | 4;
}

/**
 * Calculates the O'Leary Plaque Control Record (PCR) and Bleeding Index (BI).
 */
export function calculateOlearyPcr(
	teeth: readonly OlearyToothData[],
): OlearyPcrSummary {
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
			if (quad >= 1 && quad <= 4) {
				quadrantPlaqueCount[quad]++;
			}
			if (s === "mesial" || s === "distal") {
				interproximalPlaque++;
			} else {
				smoothPlaque++;
			}
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

	const interproximalPlaquePercent = Number.parseFloat(
		((interproximalPlaque / interproximalTotal) * 100).toFixed(1),
	);
	const smoothSurfacePlaquePercent = Number.parseFloat(
		((smoothPlaque / smoothTotal) * 100).toFixed(1),
	);

	let highestPlaqueQuadrant: 1 | 2 | 3 | 4 = 1;
	let maxQuadPlaque = -1;
	for (let q = 1 as 1 | 2 | 3 | 4; q <= 4; q = (q + 1) as 1 | 2 | 3 | 4) {
		if (quadrantPlaqueCount[q] > maxQuadPlaque) {
			maxQuadPlaque = quadrantPlaqueCount[q];
			highestPlaqueQuadrant = q;
		}
	}

	return {
		presentTeethCount,
		totalSurfaces,
		plaqueSurfacesCount: totalPlaque,
		bleedingSurfacesCount: totalBleeding,
		pcrPercent,
		bleedingPercent,
		rating,
		ratingDescriptionRu,
		isSurgicalClearanceMet: pcrPercent <= 15.0 && bleedingPercent <= 15.0,
		interproximalPlaquePercent,
		smoothSurfacePlaquePercent,
		highestPlaqueQuadrant,
	};
}

/**
 * Calculates O'Leary PCR & Bleeding Index directly from full 6-point PerioToothRecord array.
 * Maps 6 anatomical sites (MB, B, DB, ML, L, DL) into standard 4 O'Leary surfaces (Mesial, Distal, Buccal, Lingual).
 */
export function calculateOlearyFromPerioTeeth(
	teeth: readonly PerioToothRecord[],
): OlearyPcrSummary {
	const olearyData: OlearyToothData[] = teeth.map((tooth) => {
		const surfacesWithPlaque: OlearySurface[] = [];
		const surfacesWithBleeding: OlearySurface[] = [];

		// Mesial surface (plaque/bleeding on mesioBuccal or mesioLingual)
		if (tooth.mesioBuccal?.plaque || tooth.mesioLingual?.plaque) {
			surfacesWithPlaque.push("mesial");
		}
		if (tooth.mesioBuccal?.bleedingOnProbing || tooth.mesioLingual?.bleedingOnProbing) {
			surfacesWithBleeding.push("mesial");
		}

		// Distal surface (plaque/bleeding on distoBuccal or distoLingual)
		if (tooth.distoBuccal?.plaque || tooth.distoLingual?.plaque) {
			surfacesWithPlaque.push("distal");
		}
		if (tooth.distoBuccal?.bleedingOnProbing || tooth.distoLingual?.bleedingOnProbing) {
			surfacesWithBleeding.push("distal");
		}

		// Buccal / Vestibular surface
		if (tooth.midBuccal?.plaque) {
			surfacesWithPlaque.push("buccal");
		}
		if (tooth.midBuccal?.bleedingOnProbing) {
			surfacesWithBleeding.push("buccal");
		}

		// Lingual / Palatal surface
		if (tooth.midLingual?.plaque) {
			surfacesWithPlaque.push("lingual");
		}
		if (tooth.midLingual?.bleedingOnProbing) {
			surfacesWithBleeding.push("lingual");
		}

		return {
			toothFdi: tooth.toothNumber,
			isPresent: !tooth.isMissing,
			isImplant: tooth.isImplant,
			surfacesWithPlaque,
			surfacesWithBleeding,
		};
	});

	return calculateOlearyPcr(olearyData);
}

