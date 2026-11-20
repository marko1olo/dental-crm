import {
	SEPA_PERMANENT_TEETH,
	SEPA_SITE_CODES,
	type SepaSiteCode,
	isDemoOrganizationId,
	isDemoEntityId,
} from "@dental/shared";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db/client.js";
import {
	patients,
	periodontogramSites,
	periodontogramSnapshots,
	periodontogramTeeth,
	toothStates,
	users,
} from "../db/schema.js";
import {
	computeSnapshotIndices,
	type SiteRow,
	type ToothRow,
} from "./periodontogramIndices.js";

// ───────────────────────────────────────────────────────────────────────────
// VALIDATION SCHEMAS
// ───────────────────────────────────────────────────────────────────────────

export const patchToothBodySchema = z
	.object({
		toothNumber: z.number().int().min(11).max(48).optional(),
		tooth_number: z.number().int().min(11).max(48).optional(),
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

export const patchTeethPayloadSchema = z.union([
	z.array(patchToothBodySchema),
	z.object({ teeth: z.array(patchToothBodySchema) }),
]);

export const perioSiteCodeInputSchema = z
	.enum(["MV", "V", "DV", "ML", "L", "DL", "MB", "B", "DB"])
	.transform((val) => {
		if (val === "MB") return "MV";
		if (val === "B") return "V";
		if (val === "DB") return "DV";
		return val;
	});

export const siteItemSchema = z.object({
	toothNumber: z.number().int().min(11).max(48).optional(),
	tooth_number: z.number().int().min(11).max(48).optional(),
	siteCode: perioSiteCodeInputSchema.optional(),
	site_code: perioSiteCodeInputSchema.optional(),
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

export async function fetchSnapshotTeethAndSites(
	snapshotId: string,
	executor: typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0] = db,
) {
	const teeth = await executor
		.select()
		.from(periodontogramTeeth)
		.where(eq(periodontogramTeeth.snapshotId, snapshotId))
		.orderBy(periodontogramTeeth.toothNumber);

	const sites = await executor
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

const UUID_REGEX =
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

import crypto from "node:crypto";

function deterministicUuid(seed: string): string {
	const hash = crypto.createHash("sha256").update(seed).digest("hex");
	return [
		hash.slice(0, 8),
		hash.slice(8, 12),
		"4" + hash.slice(13, 16),
		((parseInt(hash.slice(16, 18), 16) & 0x3f) | 0x80).toString(16) + hash.slice(18, 20),
		hash.slice(20, 32),
	].join("-");
}

export function isPerioDemoContext(
	orgId?: string | null,
	patientId?: string | null,
	rawPatientId?: string | null,
): boolean {
	if (process.env.DENTE_DEMO_MODE === "true" || process.env.IS_DEMO_SHOWCASE === "true") return true;
	if (orgId && (isDemoOrganizationId(orgId) || orgId.toLowerCase().includes("demo"))) return true;
	if (patientId && (isDemoEntityId(patientId) || patientId.toLowerCase().startsWith("demo") || patientId.toLowerCase().startsWith("sample_"))) return true;
	if (rawPatientId && (rawPatientId.toLowerCase().startsWith("demo") || rawPatientId.toLowerCase().startsWith("sample_"))) return true;
	return false;
}

async function ensurePerioPatientExists(
	executor: typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0],
	orgId: string,
	patientId: string,
	rawPatientId?: string | null,
) {
	const [existing] = await executor
		.select({ id: patients.id })
		.from(patients)
		.where(and(eq(patients.id, patientId), eq(patients.organizationId, orgId)))
		.limit(1);
	if (existing) return;

	// В боевом режиме несуществующий пациент не должен создаваться втихую поддельным именем (Мандат 8z / 8wy)
	if (!isPerioDemoContext(orgId, patientId, rawPatientId)) {
		const err = new Error("Пациент не найден") as Error & { statusCode?: number; code?: string };
		err.statusCode = 404;
		err.code = "PatientNotFound";
		throw err;
	}

	// Исключительно в изолированном демонстрационном режиме создаем витринного демо-пациента
	await executor
		.insert(patients)
		.values({
			id: patientId,
			organizationId: orgId,
			fullName: "Демо Пациент Пародонтологии",
			notes: "Демонстрационный профиль для витрины пародонтологической карты",
		})
		.onConflictDoNothing();
}

/**
 * Разрешает идентификатор пациента (поддерживает UUID, client demo и tenant id).
 * Чистая функция чтения без мутации базы данных на GET-запросах (Mandates 8e, 8n).
 */
export async function resolvePerioPatientId(
	orgId: string,
	rawPatientId?: string | null,
): Promise<string> {
	const trimmed = typeof rawPatientId === "string" ? rawPatientId.trim() : "";
	if (!trimmed) {
		return deterministicUuid(`${orgId}:default-perio-patient`);
	}

	if (UUID_REGEX.test(trimmed)) {
		return trimmed;
	}

	// Детерминированный UUID для строковых идентификаторов (включая демонстрационный режим)
	return deterministicUuid(`${orgId}:${trimmed}`);
}

/**
 * Разрешает идентификатор пользователя/врача (staff), проверяя наличие в таблице users.
 * Если передан ID организации (например admin@clinic.ru) или несуществующий пользователь, возвращает null
 * для исключения ошибки PostgreSQL 23503 foreign_key_violation на periodontogram_snapshots.
 */
export async function resolveExistingPerioUserId(
	orgId: string,
	rawUserId?: string | null,
): Promise<string | null> {
	const trimmed = typeof rawUserId === "string" ? rawUserId.trim() : "";
	if (!trimmed) return null;
	try {
		const [user] = await db
			.select({ id: users.id })
			.from(users)
			.where(and(eq(users.id, trimmed), eq(users.organizationId, orgId)))
			.limit(1);
		return user?.id ?? null;
	} catch {
		return null;
	}
}

/**
 * Fetches the active draft or latest closed periodontogram snapshot for a patient.
 */
export async function fetchPatientLatestPeriodontogram(
	orgId: string,
	patientId: string,
) {
	// 1. Check for active draft first
	const [draft] = await db
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

	if (draft) {
		const { formattedTeeth } = await fetchSnapshotTeethAndSites(draft.id);
		return {
			...draft,
			teeth: formattedTeeth,
		};
	}

	// 2. Fall back to latest closed examination
	const [latestClosed] = await db
		.select()
		.from(periodontogramSnapshots)
		.where(
			and(
				eq(periodontogramSnapshots.organizationId, orgId),
				eq(periodontogramSnapshots.patientId, patientId),
				eq(periodontogramSnapshots.status, "closed"),
			),
		)
		.orderBy(desc(periodontogramSnapshots.recordedAt))
		.limit(1);

	if (latestClosed) {
		const { formattedTeeth } = await fetchSnapshotTeethAndSites(latestClosed.id);
		return {
			...latestClosed,
			teeth: formattedTeeth,
		};
	}

	return null;
}

export interface UpsertPatientFullPeriodontogramParams {
	orgId: string;
	patientId: string;
	rawPatientId?: string | null | undefined;
	visitId?: string | null | undefined;
	recordedByUserId: string | null;
	teeth?: Array<z.infer<typeof patchToothBodySchema>> | undefined;
	sites?: Array<SiteItemInput> | undefined;
	notes?: string | null | undefined;
	status?: "draft" | "closed" | undefined;
	autoClose?: boolean | undefined;
	psrData?: Record<string, unknown> | undefined;
}

export type PeriodontogramSnapshotWithTeeth = typeof periodontogramSnapshots.$inferSelect & {
	teeth: ReturnType<typeof formatSnapshotTeethWithSites>;
};

/**
 * Upserts a full periodontogram draft or closed record for a patient (Медицинская карта приёма).
 * Creates draft if none exists, updates teeth, upserts sites, and calculates indices on close.
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
			// 1. Batch update teeth attributes if provided
			if (teeth && teeth.length > 0) {
				for (const t of teeth) {
					const toothNum = t.toothNumber ?? t.tooth_number;
					if (!toothNum) continue;

					const isPresent = t.isPresent ?? t.is_present;
					const isImplant = t.isImplant ?? t.is_implant;
					const furcationBuccal = t.furcationBuccal ?? t.furcation_buccal;
					const furcationLingual = t.furcationLingual ?? t.furcation_lingual;
					const keratinizedGingivaMm =
						t.keratinizedGingivaMm ?? t.keratinized_gingiva_mm;

					const updateValues: Partial<typeof periodontogramTeeth.$inferInsert> = {
						updatedAt: new Date(),
					};
					if (isPresent !== undefined) updateValues.isPresent = isPresent;
					if (isImplant !== undefined) updateValues.isImplant = isImplant;
					if (t.mobility !== undefined) updateValues.mobility = t.mobility;
					if (t.prognosis !== undefined) updateValues.prognosis = t.prognosis;
					if (furcationBuccal !== undefined)
						updateValues.furcationBuccal = furcationBuccal;
					if (furcationLingual !== undefined)
						updateValues.furcationLingual = furcationLingual;
					if (keratinizedGingivaMm !== undefined)
						updateValues.keratinizedGingivaMm = keratinizedGingivaMm;

					await tx
						.update(periodontogramTeeth)
						.set(updateValues)
						.where(
							and(
								eq(periodontogramTeeth.snapshotId, activeDraft.id),
								eq(periodontogramTeeth.toothNumber, toothNum),
							),
						);
				}
			}

			// 2. Batch upsert probing sites if provided
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

				for (const s of sites) {
					const toothNum = s.toothNumber ?? s.tooth_number;
					const siteCode = s.siteCode ?? s.site_code;
					if (!toothNum || !siteCode) continue;

					const toothId = toothIdMap.get(toothNum) ?? null;
					await upsertSingleSiteRecord(
						tx,
						activeDraft.id,
						toothId,
						toothNum,
						siteCode,
						s,
					);
				}
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
