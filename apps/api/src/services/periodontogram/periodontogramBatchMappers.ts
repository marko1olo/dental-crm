/**
 * apps/api/src/services/periodontogram/periodontogramBatchMappers.ts
 *
 * Batch mapping and upsert helpers for periodontogram teeth and sites.
 * Eliminates N+1 loops via PostgreSQL ON CONFLICT DO UPDATE batching.
 * Mandate 8b: File <= 300 lines.
 */

import { sql } from "drizzle-orm";
import type { db } from "../../db/client.js";
import type { TenantDb } from "../../db/rls.js";
import {
	periodontogramSites,
	periodontogramSnapshots,
	periodontogramTeeth,
} from "../../db/schema.js";
import type { formatSnapshotTeethWithSites } from "./periodontogramQueryService.js";

export type PeriodontogramSnapshotWithTeeth = typeof periodontogramSnapshots.$inferSelect & {
	teeth: ReturnType<typeof formatSnapshotTeethWithSites>;
};

export interface PatchToothInput {
	toothNumber?: number | undefined;
	tooth_number?: number | undefined;
	isPresent?: boolean | undefined;
	is_present?: boolean | undefined;
	isImplant?: boolean | undefined;
	is_implant?: boolean | undefined;
	mobility?: number | null | undefined;
	prognosis?: "good" | "fair" | "poor" | "hopeless" | null | undefined;
	furcationBuccal?: "0" | "I" | "II" | "III" | null | undefined;
	furcation_buccal?: "0" | "I" | "II" | "III" | null | undefined;
	furcationLingual?: "0" | "I" | "II" | "III" | null | undefined;
	furcation_lingual?: "0" | "I" | "II" | "III" | null | undefined;
	keratinizedGingivaMm?: number | null | undefined;
	keratinized_gingiva_mm?: number | null | undefined;
}

export interface SiteItemInput {
	toothNumber?: number | undefined;
	tooth_number?: number | undefined;
	siteCode?: string | undefined;
	site_code?: string | undefined;
	probingDepthMm?: number | null | undefined;
	probing_depth_mm?: number | null | undefined;
	gingivalMarginMm?: number | null | undefined;
	gingival_margin_mm?: number | null | undefined;
	calMm?: number | null | undefined;
	cal_mm?: number | null | undefined;
	bleedingOnProbing?: boolean | undefined;
	bleeding_on_probing?: boolean | undefined;
	plaque?: boolean | undefined;
	suppuration?: boolean | undefined;
	calculus?: boolean | undefined;
}

export interface UpsertPatientFullPeriodontogramParams {
	orgId: string;
	patientId: string;
	rawPatientId?: string | null | undefined;
	visitId?: string | null | undefined;
	recordedByUserId: string | null;
	teeth?: Array<PatchToothInput> | undefined;
	sites?: Array<SiteItemInput> | undefined;
	notes?: string | null | undefined;
	status?: "draft" | "closed" | undefined;
	autoClose?: boolean | undefined;
	psrData?: Record<string, unknown> | undefined;
	tx?: TenantDb | undefined;
	demoOptions?: { readonly allowSyntheticDemoIds?: boolean | undefined } | undefined;
}

export async function upsertSingleSiteRecord(
	executor: TenantDb | typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0],
	snapshotId: string,
	toothId: string | null,
	toothNumber: number,
	siteCode: string,
	item: SiteItemInput,
) {
	const rawCode = (siteCode || "").toUpperCase();
	const normalizedSiteCode =
		rawCode === "MB" ? "MV" :
		rawCode === "B" ? "V" :
		rawCode === "DB" ? "DV" : rawCode;

	const pd = item.probingDepthMm ?? item.probing_depth_mm;
	const gm = item.gingivalMarginMm ?? item.gingival_margin_mm;
	const bop = item.bleedingOnProbing ?? item.bleeding_on_probing;

	const valuesToInsert: typeof periodontogramSites.$inferInsert = {
		snapshotId,
		toothId,
		toothNumber,
		siteCode: normalizedSiteCode,
		probingDepthMm: pd !== undefined ? pd : null,
		gingivalMarginMm: gm !== undefined ? gm : null,
		bleedingOnProbing: bop !== undefined ? bop : false,
		plaque: item.plaque !== undefined ? item.plaque : false,
		suppuration: item.suppuration !== undefined ? item.suppuration : false,
		calculus: item.calculus !== undefined ? item.calculus : false,
	};

	const [saved] = await executor
		.insert(periodontogramSites)
		.values(valuesToInsert)
		.onConflictDoUpdate({
			target: [
				periodontogramSites.snapshotId,
				periodontogramSites.toothNumber,
				periodontogramSites.siteCode,
			],
			set: {
				...(pd !== undefined ? { probingDepthMm: pd } : {}),
				...(gm !== undefined ? { gingivalMarginMm: gm } : {}),
				...(bop !== undefined ? { bleedingOnProbing: bop } : {}),
				...(item.plaque !== undefined ? { plaque: item.plaque } : {}),
				...(item.suppuration !== undefined
					? { suppuration: item.suppuration }
					: {}),
				...(item.calculus !== undefined ? { calculus: item.calculus } : {}),
				updatedAt: new Date(),
			},
		})
		.returning();

	return saved;
}

/**
 * Атомарный пакетный upsert сайтов зондирования (до 192 точек за 1 SQL-запрос).
 */
export async function batchUpsertSites(
	executor: TenantDb | typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0],
	snapshotId: string,
	sites: SiteItemInput[],
	toothIdMap?: Map<number, string>,
): Promise<Array<typeof periodontogramSites.$inferSelect>> {
	if (sites.length === 0) return [];

	const siteValues: Array<typeof periodontogramSites.$inferInsert> = [];
	for (const s of sites) {
		const toothNumber = s.toothNumber ?? s.tooth_number;
		const siteCode = s.siteCode ?? s.site_code;
		if (!toothNumber || !siteCode) continue;

		const rawCode = (siteCode || "").toUpperCase();
		const normalizedSiteCode =
			rawCode === "MB" ? "MV" :
			rawCode === "B" ? "V" :
			rawCode === "DB" ? "DV" : rawCode;

		const pd = s.probingDepthMm ?? s.probing_depth_mm;
		const gm = s.gingivalMarginMm ?? s.gingival_margin_mm;
		const bop = s.bleedingOnProbing ?? s.bleeding_on_probing;

		siteValues.push({
			snapshotId,
			toothId: toothIdMap?.get(toothNumber) ?? null,
			toothNumber,
			siteCode: normalizedSiteCode,
			probingDepthMm: pd !== undefined ? pd : null,
			gingivalMarginMm: gm !== undefined ? gm : null,
			bleedingOnProbing: bop !== undefined ? bop : false,
			plaque: s.plaque !== undefined ? s.plaque : false,
			suppuration: s.suppuration !== undefined ? s.suppuration : false,
			calculus: s.calculus !== undefined ? s.calculus : false,
			updatedAt: new Date(),
		});
	}

	if (siteValues.length === 0) return [];

	return await executor
		.insert(periodontogramSites)
		.values(siteValues)
		.onConflictDoUpdate({
			target: [
				periodontogramSites.snapshotId,
				periodontogramSites.toothNumber,
				periodontogramSites.siteCode,
			],
			set: {
				probingDepthMm: sql`excluded.probing_depth_mm`,
				gingivalMarginMm: sql`excluded.gingival_margin_mm`,
				bleedingOnProbing: sql`excluded.bleeding_on_probing`,
				plaque: sql`excluded.plaque`,
				suppuration: sql`excluded.suppuration`,
				calculus: sql`excluded.calculus`,
				updatedAt: new Date(),
			},
		})
		.returning();
}

/**
 * Атомарный пакетный update параметров зубов (до 32 зубов за 1 SQL-запрос).
 */
export async function batchUpsertTeeth(
	executor: TenantDb | typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0],
	snapshotId: string,
	teeth: PatchToothInput[],
): Promise<Array<typeof periodontogramTeeth.$inferSelect>> {
	if (teeth.length === 0) return [];

	const teethValues: Array<typeof periodontogramTeeth.$inferInsert> = [];
	for (const t of teeth) {
		const toothNumber = t.toothNumber ?? t.tooth_number;
		if (!toothNumber) continue;

		const isPresent = t.isPresent ?? t.is_present;
		const isImplant = t.isImplant ?? t.is_implant;
		const furcationBuccal = t.furcationBuccal ?? t.furcation_buccal;
		const furcationLingual = t.furcationLingual ?? t.furcation_lingual;
		const keratinizedGingivaMm = t.keratinizedGingivaMm ?? t.keratinized_gingiva_mm;

		teethValues.push({
			snapshotId,
			toothNumber,
			isPresent: isPresent !== undefined ? isPresent : true,
			isImplant: isImplant !== undefined ? isImplant : false,
			mobility: t.mobility !== undefined ? t.mobility : null,
			prognosis: t.prognosis !== undefined ? t.prognosis : null,
			furcationBuccal: furcationBuccal !== undefined ? furcationBuccal : null,
			furcationLingual: furcationLingual !== undefined ? furcationLingual : null,
			keratinizedGingivaMm: keratinizedGingivaMm !== undefined ? keratinizedGingivaMm : null,
			updatedAt: new Date(),
		});
	}

	if (teethValues.length === 0) return [];

	return await executor
		.insert(periodontogramTeeth)
		.values(teethValues)
		.onConflictDoUpdate({
			target: [
				periodontogramTeeth.snapshotId,
				periodontogramTeeth.toothNumber,
			],
			set: {
				isPresent: sql`excluded.is_present`,
				isImplant: sql`excluded.is_implant`,
				mobility: sql`excluded.mobility`,
				prognosis: sql`excluded.prognosis`,
				furcationBuccal: sql`excluded.furcation_buccal`,
				furcationLingual: sql`excluded.furcation_lingual`,
				keratinizedGingivaMm: sql`excluded.keratinized_gingiva_mm`,
				updatedAt: new Date(),
			},
		})
		.returning();
}
