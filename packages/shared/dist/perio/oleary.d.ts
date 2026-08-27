/**
 * O'Leary Plaque Control Record (PCR) & Bleeding Index (BI) Engine.
 * Based on O'Leary, Drake & Naylor (1972) clinical periodontal index standard.
 *
 * Evaluates plaque biofilm presence at the gingival margin across 4 or 6 anatomical surfaces
 * per present tooth. Provides clinical staging, quadrant distribution, and pre-surgical clearance gates.
 */
import { z } from "zod";
export declare const olearySurfaceSchema: z.ZodEnum<["mesial", "distal", "buccal", "lingual"]>;
export type OlearySurface = z.infer<typeof olearySurfaceSchema>;
export declare const OLEARY_4_SURFACES: readonly OlearySurface[];
export interface OlearyToothData {
    readonly toothFdi: number;
    readonly isPresent: boolean;
    readonly isImplant?: boolean | undefined;
    readonly surfacesWithPlaque: readonly OlearySurface[];
    readonly surfacesWithBleeding?: readonly OlearySurface[] | undefined;
}
export type OlearyPlaqueControlRating = "excellent" | "good" | "moderate" | "inadequate";
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
/**
 * Calculates the O'Leary Plaque Control Record (PCR) and Bleeding Index (BI).
 */
export declare function calculateOlearyPcr(teeth: readonly OlearyToothData[]): OlearyPcrSummary;
