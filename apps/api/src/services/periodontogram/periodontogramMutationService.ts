/**
 * apps/api/src/services/periodontogram/periodontogramMutationService.ts
 *
 * Atomic batch mutations for periodontogram examinations, teeth, and sites.
 * Eliminates N+1 transactional loops via PostgreSQL ON CONFLICT DO UPDATE batching.
 * Mandate 8b: File <= 300 lines.
 */

import { SEPA_PERMANENT_TEETH } from "@dental/shared";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
	patients,
	periodontogramSites,
	periodontogramSnapshots,
	periodontogramTeeth,
	toothStates,
} from "../../db/schema.js";
import { computeSnapshotIndices } from "../periodontogramIndices.js";
import {
	ensurePerioPatientExists,
	isPerioDemoContext,
	resolveExistingPerioUserId,
} from "./periodontogramDemoHelper.js";
import {
	fetchSnapshotTeethAndSites,
	type formatSnapshotTeethWithSites,
} from "./periodontogramQueryService.js";

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
}

export async function createDraftWithInitialTeeth(
	orgId: string,
	patientId: string,
	recordedByUserId: string | null,
	visitId?: string | null,
	rawPatientId?: string | null,
) {
	const validUserId = await resolveExistingPerioUserId(orgId, recordedByUserId);
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
		await ensurePerioPatientExists(tx, orgId, patientId, rawPatientId);
		const [newDraft] = await tx
			.insert(periodontogramSnapshots)
			.values({
				organizationId: orgId,
				patientId,
				visitId: visitId ?? null,
				status: "draft",
				recordedAt: new Date(),
				recordedByUserId: validUserId,
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
	executor: typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0],
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
	executor: typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0],
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

/**
 * Upserts a full periodontogram draft or closed record for a patient (Медицинская карта приёма).
 * Creates draft if none exists, batch updates teeth, batch upserts sites, and calculates indices on close.
 */
export async function upsertPatientFullPeriodontogram({
	orgId,
	patientId,
	rawPatientId,
	visitId,
	recordedByUserId,
	teeth = [],
	sites = [],
	notes,
	status,
	autoClose = false,
	psrData,
}: UpsertPatientFullPeriodontogramParams) {
	try {
		const validRecordedByUserId = await resolveExistingPerioUserId(
			orgId,
			recordedByUserId,
		);

		// Проверяем существование пациента в базе данных (Мандаты 8z / 8wy)
		const [existingPatient] = await db
			.select({ id: patients.id })
			.from(patients)
			.where(and(eq(patients.id, patientId), eq(patients.organizationId, orgId)))
			.limit(1);

		if (!existingPatient && !isPerioDemoContext(orgId, patientId, rawPatientId)) {
			const err = new Error("Пациент не найден") as Error & { statusCode?: number; code?: string };
			err.statusCode = 404;
			err.code = "PatientNotFound";
			throw err;
		}

		// Find existing draft snapshot or create a new one
		let [activeDraft] = await db
			.select()
			.from(periodontogramSnapshots)
			.where(
				and(
					eq(periodontogramSnapshots.organizationId, orgId),
					eq(periodontogramSnapshots.patientId, patientId),
					eq(periodontogramSnapshots.status, "draft"),
				),
			)
			.limit(1);

		if (!activeDraft) {
			activeDraft = await createDraftWithInitialTeeth(
				orgId,
				patientId,
				validRecordedByUserId,
				visitId,
				rawPatientId,
			);
		}

		return await db.transaction(async (tx) => {
			// Update visitId if provided and different
			if (visitId !== undefined && activeDraft.visitId !== visitId) {
				await tx
					.update(periodontogramSnapshots)
					.set({ visitId: visitId ?? null, updatedAt: new Date() })
					.where(eq(periodontogramSnapshots.id, activeDraft.id));
				activeDraft.visitId = visitId ?? null;
			}

			// 1. Пакетное обновление параметров зубов (1 запрос вместо 32)
			if (teeth && teeth.length > 0) {
				await batchUpsertTeeth(tx, activeDraft.id, teeth);
			}

			// 2. Пакетное обновление сайтов зондирования (1 запрос вместо 192)
			if (sites && sites.length > 0) {
				const dbTeeth = await tx
					.select({
						id: periodontogramTeeth.id,
						toothNumber: periodontogramTeeth.toothNumber,
					})
					.from(periodontogramTeeth)
					.where(eq(periodontogramTeeth.snapshotId, activeDraft.id));

				const toothIdMap = new Map<number, string>();
				for (const dt of dbTeeth) {
					toothIdMap.set(dt.toothNumber, dt.id);
				}

				await batchUpsertSites(tx, activeDraft.id, sites, toothIdMap);
			}

			// 3. Update notes if provided
			if (notes !== undefined) {
				await tx
					.update(periodontogramSnapshots)
					.set({ notes, updatedAt: new Date() })
					.where(eq(periodontogramSnapshots.id, activeDraft.id));
			}

			// 4. Close examination if requested
			const shouldClose = status === "closed" || autoClose;
			let finalRecord: PeriodontogramSnapshotWithTeeth;
			if (shouldClose) {
				const { teeth: currentTeeth, sites: currentSites } =
					await fetchSnapshotTeethAndSites(activeDraft.id, tx);
				const computedIndices = computeSnapshotIndices(currentTeeth, currentSites);
				const mergedIndices = {
					...computedIndices,
					...(psrData ? { psrData } : {}),
				};

				const [closedSnap] = await tx
					.update(periodontogramSnapshots)
					.set({
						status: "closed",
						closedAt: new Date(),
						closedByUserId: validRecordedByUserId,
						indices: mergedIndices,
						...(notes !== undefined ? { notes } : {}),
						updatedAt: new Date(),
					})
					.where(eq(periodontogramSnapshots.id, activeDraft.id))
					.returning();

				if (!closedSnap) {
					throw new Error("FailedToClosePeriodontogramSnapshot");
				}
				const { formattedTeeth } = await fetchSnapshotTeethAndSites(activeDraft.id, tx);
				finalRecord = {
					...closedSnap,
					teeth: formattedTeeth,
				};
			} else {
				if (psrData) {
					await tx
						.update(periodontogramSnapshots)
						.set({
							indices: {
								...((activeDraft.indices as Record<string, unknown>) || {}),
								psrData,
							},
							updatedAt: new Date(),
						})
						.where(eq(periodontogramSnapshots.id, activeDraft.id));
				}

				const [updatedSnap] = await tx
					.select()
					.from(periodontogramSnapshots)
					.where(eq(periodontogramSnapshots.id, activeDraft.id))
					.limit(1);

				if (!updatedSnap) {
					throw new Error("PeriodontogramSnapshotNotFound");
				}
				const { formattedTeeth } = await fetchSnapshotTeethAndSites(activeDraft.id, tx);
				finalRecord = {
					...updatedSnap,
					teeth: formattedTeeth,
				};
			}

			return finalRecord;
		});
	} catch (err: unknown) {
		const pgErr = err as { code?: string; message?: string; cause?: { code?: string } };
		const pgCode = pgErr?.code || pgErr?.cause?.code;
		const errMsg = String(pgErr?.message || err);
		const isForeignKey =
			pgCode === "23503" ||
			errMsg.includes("foreign key") ||
			errMsg.includes("violates foreign key");

		if (isForeignKey) {
			const error = new Error("Пациент или организация не найдены") as Error & {
				statusCode?: number;
				code?: string;
			};
			error.statusCode = 404;
			error.code = "PatientNotFound";
			throw error;
		}

		throw err;
	}
}
