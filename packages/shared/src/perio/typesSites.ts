/**
 * packages/shared/src/perio/typesSites.ts
 *
 * 6 anatomical probing sites per tooth and measurement schemas.
 * Mandate 8b: File <= 120 lines.
 */

import { z } from "zod";

export const perioSiteKeySchema = z.enum([
	"distoBuccal",
	"midBuccal",
	"mesioBuccal",
	"distoLingual",
	"midLingual",
	"mesioLingual",
]);
export type PerioSiteKey = z.infer<typeof perioSiteKeySchema>;

export const perioSiteShortKeySchema = z.enum(["MB", "B", "DB", "ML", "L", "DL"]);
export type PerioSiteShortKey = z.infer<typeof perioSiteShortKeySchema>;

export interface PerioSiteConfig {
	readonly key: PerioSiteKey;
	readonly shortKey: PerioSiteShortKey;
	readonly labelRu: string;
	readonly aspect: "buccal" | "lingual";
	readonly anatomicalLocationRu: string;
}

export const PERIO_SITES_CONFIG: readonly PerioSiteConfig[] = [
	{
		key: "mesioBuccal",
		shortKey: "MB",
		labelRu: "Медиально-вестибулярно (MB)",
		aspect: "buccal",
		anatomicalLocationRu: "Медиально-щечный угол",
	},
	{
		key: "midBuccal",
		shortKey: "B",
		labelRu: "По центру вестибулярно (B)",
		aspect: "buccal",
		anatomicalLocationRu: "Середина вестибулярной поверхности",
	},
	{
		key: "distoBuccal",
		shortKey: "DB",
		labelRu: "Дистально-вестибулярно (DB)",
		aspect: "buccal",
		anatomicalLocationRu: "Дистально-щечный угол",
	},
	{
		key: "mesioLingual",
		shortKey: "ML",
		labelRu: "Медиально-орально (ML)",
		aspect: "lingual",
		anatomicalLocationRu: "Медиально-язычный/нёбный угол",
	},
	{
		key: "midLingual",
		shortKey: "L",
		labelRu: "По центру орально (L)",
		aspect: "lingual",
		anatomicalLocationRu: "Середина язычной/нёбной поверхности",
	},
	{
		key: "distoLingual",
		shortKey: "DL",
		labelRu: "Дистально-орально (DL)",
		aspect: "lingual",
		anatomicalLocationRu: "Дистально-язычный/нёбный угол",
	},
] as const;

export const BUCCAL_SITE_KEYS: readonly PerioSiteKey[] = [
	"distoBuccal",
	"midBuccal",
	"mesioBuccal",
] as const;

export const LINGUAL_SITE_KEYS: readonly PerioSiteKey[] = [
	"distoLingual",
	"midLingual",
	"mesioLingual",
] as const;

export const PERIO_SITE_KEYS: readonly PerioSiteKey[] = [
	"distoBuccal",
	"midBuccal",
	"mesioBuccal",
	"distoLingual",
	"midLingual",
	"mesioLingual",
] as const;

export const perioSiteMeasurementSchema = z.object({
	probingDepthMm: z.number().int().min(0).max(20).default(0),
	gingivalMarginMm: z.number().int().min(-15).max(15).default(0),
	bleedingOnProbing: z.boolean().default(false),
	suppuration: z.boolean().default(false),
	plaque: z.boolean().default(false),
	calculus: z.boolean().default(false),
	calMm: z.number().int().optional(),
});
export type PerioSiteMeasurement = z.infer<typeof perioSiteMeasurementSchema>;
