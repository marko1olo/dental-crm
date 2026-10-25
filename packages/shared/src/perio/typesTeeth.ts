/**
 * packages/shared/src/perio/typesTeeth.ts
 *
 * Tooth-level schemas, probing steps and dental arches (FDI).
 * Mandate 8b: File <= 120 lines.
 */

import { z } from "zod";
import { perioSiteMeasurementSchema, type PerioSiteKey } from "./typesSites.js";

export const furcationGradeSchema = z.union([
	z.literal(0),
	z.literal(1),
	z.literal(2),
	z.literal(3),
	z.literal(4),
]);
export type FurcationGrade = z.infer<typeof furcationGradeSchema>;

export const mobilityGradeSchema = z.union([
	z.literal(0),
	z.literal(1),
	z.literal(2),
	z.literal(3),
]);
export type MobilityGrade = z.infer<typeof mobilityGradeSchema>;

export const perioToothRecordSchema = z.object({
	toothNumber: z.number().int().min(11).max(85),
	isMissing: z.boolean().default(false),
	isImplant: z.boolean().default(false),
	mobility: mobilityGradeSchema.default(0),
	furcation: furcationGradeSchema.default(0),
	distoBuccal: perioSiteMeasurementSchema.default({}),
	midBuccal: perioSiteMeasurementSchema.default({}),
	mesioBuccal: perioSiteMeasurementSchema.default({}),
	distoLingual: perioSiteMeasurementSchema.default({}),
	midLingual: perioSiteMeasurementSchema.default({}),
	mesioLingual: perioSiteMeasurementSchema.default({}),
});
export type PerioToothRecord = z.infer<typeof perioToothRecordSchema>;

export const PERIO_UPPER_ARCH_TEETH = [
	18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28,
] as const;

export const PERIO_LOWER_ARCH_TEETH = [
	48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38,
] as const;

export const ALL_PERIO_TEETH = [
	...PERIO_UPPER_ARCH_TEETH,
	...PERIO_LOWER_ARCH_TEETH,
] as const;

export interface ProbingStep {
	readonly toothNumber: number;
	readonly siteKey: PerioSiteKey;
	readonly arch: "upper" | "lower";
	readonly aspect: "buccal" | "lingual";
}
