/**
 * packages/shared/src/perio/olearyTypes.ts
 *
 * Types and schemas for O'Leary Plaque Control Record (PCR).
 * Mandate 8b: File <= 120 lines.
 */

import { z } from "zod";

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
	| "excellent"
	| "good"
	| "moderate"
	| "inadequate";

export interface OlearyPcrSummary {
	readonly presentTeethCount: number;
	readonly totalSurfaces: number;
	readonly plaqueSurfacesCount: number;
	readonly bleedingSurfacesCount: number;
	readonly pcrPercent: number;
	readonly bleedingPercent: number;
	readonly rating: OlearyPlaqueControlRating;
	readonly ratingDescriptionRu: string;
	readonly isSurgicalClearanceMet: boolean;
	readonly interproximalPlaquePercent: number;
	readonly smoothSurfacePlaquePercent: number;
	readonly highestPlaqueQuadrant: 1 | 2 | 3 | 4;
}
