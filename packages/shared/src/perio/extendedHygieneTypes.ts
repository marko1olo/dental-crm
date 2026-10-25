/**
 * packages/shared/src/perio/extendedHygieneTypes.ts
 *
 * Types for Silness-Löe, Fedorov-Volodkina and PHP assessments.
 * Mandate 8b: File <= 120 lines.
 */

import type { HygieneToothAssessment } from "./hygieneConfig.js";

export interface ExtendedToothAssessment extends HygieneToothAssessment {
	readonly silnessScore?: number | undefined;
	readonly fedorovScore?: number | undefined;
	readonly phpScore?: number | undefined;
}

export interface SilnessLoeResult {
	readonly score: number;
	readonly ratingText: string;
	readonly evaluation: "excellent" | "good" | "moderate" | "poor";
	readonly isOptimal: boolean;
}

export interface FedorovVolodkinaResult {
	readonly score: number;
	readonly ratingText: string;
	readonly evaluation: "good" | "moderate" | "poor" | "bad" | "severe";
	readonly isOptimal: boolean;
}

export interface PhpResult {
	readonly score: number;
	readonly ratingText: string;
	readonly evaluation: "excellent" | "good" | "moderate" | "poor";
	readonly isOptimal: boolean;
}
