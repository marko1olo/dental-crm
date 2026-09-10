import {
	SEPA_PERMANENT_TEETH,
	SEPA_SITE_CODES,
	type SepaSiteCode,
} from "@dental/shared";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client.js";
import {
	periodontogramSites,
	periodontogramSnapshots,
	periodontogramTeeth,
	toothStates,
} from "../db/schema.js";
import type { SiteRow, ToothRow } from "./periodontogramIndices.js";

// ───────────────────────────────────────────────────────────────────────────
// VALIDATION SCHEMAS
// ───────────────────────────────────────────────────────────────────────────

export const patchToothBodySchema = z
	.object({
		isPresent: z.boolean().optional(),
		is_present: z.boolean().optional(),
		isImplant: z.boolean().optional(),
		is_implant: z.boolean().optional(),
		mobility: z.number().int().min(0).max(3).nullable().optional(),
		prognosis: z
			.enum(["good", "fair", "poor", "hopeless"])
			.nullable()
			.optional(),
		furcationBuccal: z.enum(["0", "I", "II", "III"]).nullable().optional(),
		furcation_buccal: z.enum(["0", "I", "II", "III"]).nullable().optional(),
		furcationLingual: z.enum(["0", "I", "II", "III"]).nullable().optional(),
		furcation_lingual: z.enum(["0", "I", "II", "III"]).nullable().optional(),
		keratinizedGingivaMm: z.number().int().min(0).max(20).nullable().optional(),
		keratinized_gingiva_mm: z
			.number()
			.int()
			.min(0)
			.max(20)
			.nullable()
			.optional(),
	})
	.passthrough();

export type PatchToothInput = z.infer<typeof patchToothBodySchema>;

export const siteItemSchema = z.object({
	toothNumber: z.number().int().min(11).max(48).optional(),
	tooth_number: z.number().int().min(11).max(48).optional(),
	siteCode: z.enum(["MV", "V", "DV", "ML", "L", "DL"]).optional(),
	site_code: z.enum(["MV", "V", "DV", "ML", "L", "DL"]).optional(),
	probingDepthMm: z.number().int().min(0).max(15).nullable().optional(),
	probing_depth_mm: z.number().int().min(0).max(15).nullable().optional(),
	gingivalMarginMm: z.number().int().min(-5).max(10).nullable().optional(),
	gingival_margin_mm: z.number().int().min(-5).max(10).nullable().optional(),
	bleedingOnProbing: z.boolean().optional(),
	bleeding_on_probing: z.boolean().optional(),
	plaque: z.boolean().optional(),
	suppuration: z.boolean().optional(),
	calculus: z.boolean().optional(),
});

export type SiteItemInput = z.infer<typeof siteItemSchema>;

export const patchSitesPayloadSchema = z.union([
	z.array(siteItemSchema),
	z.object({ sites: z.array(siteItemSchema) }),
	siteItemSchema,
]);

export const closeSnapshotBodySchema = z
	.object({
		notes: z.string().max(4000).nullable().optional(),
	})
	.optional();

// ───────────────────────────────────────────────────────────────────────────
// DATA ACCESS & REPOSITORY HELPERS
// ───────────────────────────────────────────────────────────────────────────

export function formatSnapshotTeethWithSites(
	teeth: readonly ToothRow[],
	sites: readonly SiteRow[],
) {
	const sitesByTooth = new Map<number, SiteRow[]>();
	for (const s of sites) {
		const list = sitesByTooth.get(s.toothNumber) ?? [];
		list.push(s);
		sitesByTooth.set(s.toothNumber, list);
	}

	return teeth.map((t) => ({
		...t,
		sites: sitesByTooth.get(t.toothNumber) ?? [],
	}));
}

export async function fetchSnapshotTeethAndSites(snapshotId: string) {
	const teeth = await db
		.select()
		.from(periodontogramTeeth)
		.where(eq(periodontogramTeeth.snapshotId, snapshotId))
		.orderBy(periodontogramTeeth.toothNumber);

	const sites = await db
		.select()
		.from(periodontogramSites)
		.where(eq(periodontogramSites.snapshotId, snapshotId))
		.orderBy(
			periodontogramSites.toothNumber,
			periodontogramSites.siteCode,
		);

	return {
		teeth,
		sites,
		formattedTeeth: formatSnapshotTeethWithSites(teeth, sites),
	};
}

export async function createDraftWithInitialTeeth(
	orgId: string,
	patientId: string,
	recordedByUserId: string | null,
) {
	const existingStates = await db
		.select({
			toothNumber: toothStates.toothNumber,
			state: toothStates.state,
		})
		.from(toothStates)
		.where(
			and(
				eq(toothStates.organizationId, orgId),
				eq(toothStates.patientId, patientId),
			),
		);

	const statesMap = new Map<number, string>();
	for (const row of existingStates) {
		statesMap.set(row.toothNumber, row.state);
	}

	return await db.transaction(async (tx) => {
		const [newDraft] = await tx
			.insert(periodontogramSnapshots)
			.values({
				organizationId: orgId,
				patientId,
				status: "draft",
				recordedAt: new Date(),
				recordedByUserId,
			})
			.returning();

		if (!newDraft) {
			throw new Error("FailedToCreateDraftSnapshot");
		}

		const teethToInsert = SEPA_PERMANENT_TEETH.map((toothNumber) => {
			const rawState = (statesMap.get(toothNumber) ?? "").toLowerCase();
			const isMissing =
				rawState.includes("missing") ||
				rawState.includes("absent") ||
				rawState.includes("extracted") ||
				rawState.includes("отсутств") ||
				rawState.includes("удален");
			const isImplant =
				rawState.includes("implant") || rawState.includes("имплант");

			return {
				snapshotId: newDraft.id,
				toothNumber,
				isPresent: !isMissing,
				isImplant: isImplant,
			};
		});

		const insertedTeeth = await tx
			.insert(periodontogramTeeth)
			.values(teethToInsert)
			.returning();

		return {
			...newDraft,
			teeth: insertedTeeth
				.sort((a, b) => a.toothNumber - b.toothNumber)
				.map((t) => ({ ...t, sites: [] })),
		};
	});
}

export async function upsertSingleSiteRecord(
	executor: typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0],
	snapshotId: string,
	toothId: string | null,
	toothNumber: number,
	siteCode: string,
	item: SiteItemInput,
) {
	const pd = item.probingDepthMm ?? item.probing_depth_mm;
	const gm = item.gingivalMarginMm ?? item.gingival_margin_mm;
	const bop = item.bleedingOnProbing ?? item.bleeding_on_probing;

	const valuesToInsert: typeof periodontogramSites.$inferInsert = {
		snapshotId,
		toothId,
		toothNumber,
		siteCode,
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
