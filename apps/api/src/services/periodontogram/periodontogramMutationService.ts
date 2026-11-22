/**
 * apps/api/src/services/periodontogram/periodontogramMutationService.ts
 *
 * Atomic batch mutations for periodontogram examinations, teeth, and sites.
 * Eliminates N+1 transactional loops via PostgreSQL ON CONFLICT DO UPDATE batching.
 * Mandate 8b: File <= 300 lines (Sweet Spot 200-300 lines).
 */

import { SEPA_PERMANENT_TEETH } from "@dental/shared";
import { and, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
	patients,
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
} from "./periodontogramQueryService.js";
import {
	batchUpsertSites,
	batchUpsertTeeth,
	type PeriodontogramSnapshotWithTeeth,
	type UpsertPatientFullPeriodontogramParams,
} from "./periodontogramBatchMappers.js";

export * from "./periodontogramBatchMappers.js";

export async function createDraftWithInitialTeeth(
	orgId: string,
	patientId: string,
	recordedByUserId: string | null,
	visitId?: string | null,
	rawPatientId?: string | null,
	executor: typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0] = db,
) {
	const validUserId = await resolveExistingPerioUserId(orgId, recordedByUserId);
	const existingStates = await executor
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

	const executeDraftCreation = async (tx: Parameters<Parameters<typeof db.transaction>[0]>[0]) => {
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
	};

	if ("transaction" in executor && typeof executor.transaction === "function") {
		return await executor.transaction(executeDraftCreation);
	}
	return await executeDraftCreation(executor as Parameters<Parameters<typeof db.transaction>[0]>[0]);
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

		return await db.transaction(async (tx) => {
			// Проверяем существование пациента в базе данных (Мандаты 8z / 8wy)
			const [existingPatient] = await tx
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

			// Find existing draft snapshot or create a new one within same transaction
			let [activeDraft] = await tx
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
					tx,
				);
			}
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
					...((activeDraft.indices as Record<string, unknown>) || {}),
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
