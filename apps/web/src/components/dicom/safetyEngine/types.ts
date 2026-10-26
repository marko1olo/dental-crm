/**
 * types.ts — Типы для проверки анатомической безопасности и рекомендаций имплантации (Мандат 8b <= 120 строк).
 */

import type { ExtendedMischClass } from "../panoramicMprMath";

export const ANATOMICAL_SAFETY_BUFFER_MM = 2.0;
export const ANATOMICAL_DANGER_THRESHOLD_MM = 1.5;

export interface AnatomicalProximityAudit {
	readonly distanceToMandibularCanalMm: number | null;
	readonly distanceToMentalForamenMm: number | null;
	readonly distanceToSinusFloorMm: number | null;
	readonly nearestStructure: "mandibular_canal" | "mental_foramen" | "maxillary_sinus" | "none";
	readonly minClearanceMm: number | null;
	readonly isWarning: boolean;
	readonly isCritical: boolean;
	readonly warningMessageRu: string | null;
	readonly canProceed: boolean; // Mandate 8e: Doctor Autonomy always true
}

export interface MischImplantRecommendation {
	readonly mischClass: ExtendedMischClass | "D1" | "D2" | "D3" | "D4" | "D5";
	readonly hu: number;
	readonly densityLabelRu: string;
	readonly bodyDesignRu: string;
	readonly threadTypeRu: string;
	readonly primaryStabilityExpectationRu: string;
	readonly recommendedSystems: readonly {
		readonly brand: string;
		readonly line: string;
		readonly reasonRu: string;
	}[];
	readonly surgicalProtocolRu: string;
	readonly requiresCorticalTap: boolean;
	readonly requiresUnderDrilling: boolean;
	readonly underDrillingMm: number;
	readonly requiresBoneAugmentation: boolean;
}
