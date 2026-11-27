import {
	type FieldConflictDetail,
	type MutationVector,
	type SyncMutationEnvelope,
	type SyncMutationStatus,
	assertIntegerKopecks,
	kopecksToRubles,
	parseKopecks,
} from "@dental/shared";
import { and, eq, sql } from "drizzle-orm";
import type { TenantDb } from "../../../db/rls.js";
import {
	clinicalTasks,
	patients,
	syncEntityVectors,
	toothStateHistory,
	toothStates,
	treatmentItems,
	visitDiaries,
	visits,
} from "../../../db/schema.js";
import {
	buildOdontogramVector,
	parseTeethFromPayload,
	performFieldLevelCrdtMerge,
	resolveOdontogramToothConflict,
} from "./syncConflictResolver.js";
import { SyncQueueManager } from "./syncQueueManager.js";
import {
	type EntityMutationHandlerResult,
	ensureEntityRecord,
	toEntityRecord,
} from "./types.js";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function isValidUuid(val: unknown): boolean {
	return typeof val === "string" && UUID_REGEX.test(val);
}

/**
 * Clinical mutation handlers (Medical Visits, Visit Diaries, Odontogram & Tooth States).
 */
export class SyncClinicalHandlers {
	/**
	 * Clinical Visit & Diary Handler with field-level CRDT merging.
	 */
	public static async handleClinicalMutation(
		tx: TenantDb,
		organizationId: string,
		mutation: SyncMutationEnvelope,
		clientId: string,
		authorUserId?: string,
	): Promise<EntityMutationHandlerResult> {
		if (mutation.entityKind === "visit_diary") {
			const [serverDiary] = await tx
				.select()
				.from(visitDiaries)
				.where(
					and(
						eq(visitDiaries.organizationId, organizationId),
						eq(visitDiaries.id, mutation.entityId),
					),
				)
				.limit(1);

			const [vectorRow] = await tx
				.select()
				.from(syncEntityVectors)
				.where(
					and(
						eq(syncEntityVectors.organizationId, organizationId),
						eq(syncEntityVectors.entityKind, "visit_diary"),
						eq(syncEntityVectors.entityId, mutation.entityId),
					),
				)
				.limit(1);

			const serverVector = (vectorRow?.vectorJson as MutationVector) || {};

			const mergeResult = performFieldLevelCrdtMerge({
				entityKind: "visit_diary",
				entityId: mutation.entityId,
				serverEntity: toEntityRecord(serverDiary),
				serverVector,
				clientPatch: mutation.payload,
				clientVector: mutation.mutationVector,
				clientUpdatedAt: mutation.updatedAt,
				serverUpdatedAt:
					serverDiary?.updatedAt?.toISOString() ||
					vectorRow?.updatedAt?.toISOString() ||
					null,
				clientId,
				authorUserId: authorUserId || mutation.authorUserId,
			});

			if (!serverDiary) {
				const p = mergeResult.mergedEntity;
				const rawVisitId = p.visitId ?? (mutation.payload as Record<string, unknown> | undefined)?.visitId;
				if (!isValidUuid(rawVisitId)) {
					throw new Error(
						`Invalid or missing visitId UUID for visit_diary mutation: ${String(rawVisitId)}`,
					);
				}
				const validVisitId = String(rawVisitId);
				const validPatientId = isValidUuid(p.patientId) ? String(p.patientId) : null;

				const [inserted] = await tx
					.insert(visitDiaries)
					.values({
						id: mutation.entityId,
						organizationId,
						visitId: validVisitId,
						patientId: validPatientId,
						authorId: authorUserId || mutation.authorUserId || null,
						anamnesis: p.anamnesis ? String(p.anamnesis) : null,
						statusLocalis: p.statusLocalis ? String(p.statusLocalis) : null,
						diagnosisIcd10: p.diagnosisIcd10 ? String(p.diagnosisIcd10) : null,
						diagnosisTooth: p.diagnosisTooth ? String(p.diagnosisTooth) : null,
						treatmentDescription: p.treatmentDescription
							? String(p.treatmentDescription)
							: null,
						complications: p.complications ? String(p.complications) : null,
						content: String(p.content || ""),
						version: 1,
					})
					.returning();

				await SyncQueueManager.upsertEntityVector(
					tx,
					organizationId,
					"visit_diary",
					mutation.entityId,
					mergeResult.updatedVector,
					mutation.mutationId,
				);

				return {
					status: "applied",
					mergedFields: mergeResult.changedFields,
					conflicts: [],
					entity: ensureEntityRecord(inserted),
				};
			}

			const merged = mergeResult.mergedEntity;
			const updateData: Record<string, unknown> = {
				updatedAt: new Date(),
				version: (serverDiary.version ?? 0) + 1,
			};
			if ("anamnesis" in merged) updateData.anamnesis = merged.anamnesis;
			if ("statusLocalis" in merged)
				updateData.statusLocalis = merged.statusLocalis;
			if ("diagnosisIcd10" in merged)
				updateData.diagnosisIcd10 = merged.diagnosisIcd10;
			if ("diagnosisTooth" in merged)
				updateData.diagnosisTooth = merged.diagnosisTooth;
			if ("treatmentDescription" in merged)
				updateData.treatmentDescription = merged.treatmentDescription;
			if ("complications" in merged)
				updateData.complications = merged.complications;
			if ("content" in merged) updateData.content = merged.content;

			const [updated] = await tx
				.update(visitDiaries)
				.set(updateData)
				.where(
					and(
						eq(visitDiaries.organizationId, organizationId),
						eq(visitDiaries.id, mutation.entityId),
					),
				)
				.returning();

			await SyncQueueManager.upsertEntityVector(
				tx,
				organizationId,
				"visit_diary",
				mutation.entityId,
				mergeResult.updatedVector,
				mutation.mutationId,
			);

			const status: SyncMutationStatus = mergeResult.hasConflicts
				? "conflict_resolved"
				: mergeResult.changedFields.length > 0
					? "merged"
					: "applied";

			return {
				status,
				mergedFields: mergeResult.changedFields,
				conflicts: mergeResult.conflicts,
				entity: ensureEntityRecord(updated || merged),
			};
		}

		// Otherwise visit entity
		const [serverVisit] = await tx
			.select()
			.from(visits)
			.where(
				and(
					eq(visits.organizationId, organizationId),
					eq(visits.id, mutation.entityId),
				),
			)
			.limit(1);

		const [vectorRow] = await tx
			.select()
			.from(syncEntityVectors)
			.where(
				and(
					eq(syncEntityVectors.organizationId, organizationId),
					eq(syncEntityVectors.entityKind, "visit"),
					eq(syncEntityVectors.entityId, mutation.entityId),
				),
			)
			.limit(1);

		const serverVector = (vectorRow?.vectorJson as MutationVector) || {};

		const mergeResult = performFieldLevelCrdtMerge({
			entityKind: "visit",
			entityId: mutation.entityId,
			serverEntity: toEntityRecord(serverVisit),
			serverVector,
			clientPatch: mutation.payload,
			clientVector: mutation.mutationVector,
			clientUpdatedAt: mutation.updatedAt,
			serverUpdatedAt:
				serverVisit?.updatedAt?.toISOString() ||
				vectorRow?.updatedAt?.toISOString() ||
				null,
			clientId,
			authorUserId: authorUserId || mutation.authorUserId,
		});

		if (!serverVisit) {
			const p = mergeResult.mergedEntity;
			const rawPatientId = p.patientId ?? (mutation.payload as Record<string, unknown> | undefined)?.patientId;
			if (!isValidUuid(rawPatientId)) {
				throw new Error(
					`Invalid or missing patientId UUID for visit mutation: ${String(rawPatientId)}`,
				);
			}
			const validPatientId = String(rawPatientId);
			const validAppointmentId = isValidUuid(p.appointmentId) ? String(p.appointmentId) : null;

			const [inserted] = await tx
				.insert(visits)
				.values({
					id: mutation.entityId,
					organizationId,
					patientId: validPatientId,
					appointmentId: validAppointmentId,
					status: (p.status as "draft" | "signed" | "voided") || "draft",
					complaint: p.complaint ? String(p.complaint) : null,
					anamnesis: p.anamnesis ? String(p.anamnesis) : null,
					objectiveStatus: p.objectiveStatus ? String(p.objectiveStatus) : null,
					diagnosis: p.diagnosis ? String(p.diagnosis) : null,
					treatmentPlan: p.treatmentPlan ? String(p.treatmentPlan) : null,
					doctorSummary: p.doctorSummary ? String(p.doctorSummary) : null,
					transcript: p.transcript ? String(p.transcript) : null,
					draftAutosave: p.draftAutosave ?? null,
					revision: 1,
				})
				.returning();

			await SyncQueueManager.upsertEntityVector(
				tx,
				organizationId,
				"visit",
				mutation.entityId,
				mergeResult.updatedVector,
				mutation.mutationId,
			);

			return {
				status: "applied",
				mergedFields: mergeResult.changedFields,
				conflicts: [],
				entity: ensureEntityRecord(inserted),
			};
		}

		const merged = mergeResult.mergedEntity;
		const updateData: Record<string, unknown> = {
			updatedAt: new Date(),
			revision: (serverVisit.revision ?? 0) + 1,
		};
		if ("complaint" in merged) updateData.complaint = merged.complaint;
		if ("anamnesis" in merged) updateData.anamnesis = merged.anamnesis;
		if ("objectiveStatus" in merged)
			updateData.objectiveStatus = merged.objectiveStatus;
		if ("diagnosis" in merged) updateData.diagnosis = merged.diagnosis;
		if ("treatmentPlan" in merged)
			updateData.treatmentPlan = merged.treatmentPlan;
		if ("doctorSummary" in merged)
			updateData.doctorSummary = merged.doctorSummary;
		if ("transcript" in merged) updateData.transcript = merged.transcript;
		if ("draftAutosave" in merged)
			updateData.draftAutosave = merged.draftAutosave;
		if ("status" in merged) updateData.status = merged.status;

		const [updated] = await tx
			.update(visits)
			.set(updateData)
			.where(
				and(
					eq(visits.organizationId, organizationId),
					eq(visits.id, mutation.entityId),
				),
			)
			.returning();

		await SyncQueueManager.upsertEntityVector(
			tx,
			organizationId,
			"visit",
			mutation.entityId,
			mergeResult.updatedVector,
			mutation.mutationId,
		);

		const status: SyncMutationStatus = mergeResult.hasConflicts
			? "conflict_resolved"
			: mergeResult.changedFields.length > 0
				? "merged"
				: "applied";

		return {
			status,
			mergedFields: mergeResult.changedFields,
			conflicts: mergeResult.conflicts,
			entity: ensureEntityRecord(updated || merged),
		};
	}

	/**
	 * Odontogram Tooth State Handler with LWW resolution & complete 043/u history audit retention.
	 */
	public static async handleOdontogramMutation(
		tx: TenantDb,
		organizationId: string,
		mutation: SyncMutationEnvelope,
		clientId: string,
		authorUserId?: string,
	): Promise<EntityMutationHandlerResult> {
		const payload = mutation.payload;
		const effectiveAuthorId = authorUserId || mutation.authorUserId || null;
		const incomingDate = mutation.updatedAt
			? new Date(mutation.updatedAt)
			: new Date();

		const teethList = parseTeethFromPayload(payload, mutation.entityId);

		let patientId: string | null = null;
		if (isValidUuid(payload.patientId)) {
			patientId = String(payload.patientId);
		} else if (isValidUuid(mutation.entityId)) {
			patientId = mutation.entityId;
		} else {
			const candidate = mutation.entityId.split(":")?.[0]?.trim();
			if (candidate && isValidUuid(candidate)) {
				patientId = candidate;
			}
		}

		if (!patientId) {
			throw new Error(
				`Invalid or missing patientId UUID for odontogram_state mutation: ${String(payload.patientId || mutation.entityId)}`,
			);
		}

		const [vectorRow] = await tx
			.select()
			.from(syncEntityVectors)
			.where(
				and(
					eq(syncEntityVectors.organizationId, organizationId),
					eq(syncEntityVectors.entityKind, "odontogram_state"),
					eq(syncEntityVectors.entityId, mutation.entityId),
				),
			)
			.limit(1);

		const serverVector = (vectorRow?.vectorJson as MutationVector) || {};
		const allConflicts: FieldConflictDetail[] = [];
		const mergedFields: string[] = [];
		const updatedTeethStates: Record<string, unknown>[] = [];

		for (const toothItem of teethList) {
			const [serverTooth] = await tx
				.select()
				.from(toothStates)
				.where(
					and(
						eq(toothStates.organizationId, organizationId),
						eq(toothStates.patientId, patientId),
						eq(toothStates.toothNumber, toothItem.toothNumber),
					),
				)
				.limit(1);

			const conflictCheck = resolveOdontogramToothConflict({
				toothItem,
				serverTooth,
				incomingDate,
			});

			if (conflictCheck.clientWins || conflictCheck.isMerged) {
				await tx.insert(toothStateHistory).values({
					organizationId,
					patientId,
					visitId: toothItem.visitId ?? null,
					toothNumber: toothItem.toothNumber,
					previousState: serverTooth?.state ?? null,
					newState: conflictCheck.effectiveState,
					previousSurfaces: serverTooth?.surfaces ?? null,
					newSurfaces: conflictCheck.effectiveSurfaces ?? null,
					changedByUserId: effectiveAuthorId,
					reason: conflictCheck.isMerged
						? "Оффлайн-синхронизация одонтограммы (Surface Union Merge)"
						: toothItem.notes || "Оффлайн-синхронизация одонтограммы (LWW)",
					changedAt: incomingDate,
				});

				if (!serverTooth) {
					const [inserted] = await tx
						.insert(toothStates)
						.values({
							organizationId,
							patientId,
							toothNumber: toothItem.toothNumber,
							state: conflictCheck.effectiveState,
							surfaces: conflictCheck.effectiveSurfaces ?? null,
							notes: toothItem.notes,
							updatedAt: incomingDate,
							isSynced: true,
							version: 1,
						})
						.returning();
					updatedTeethStates.push(
						toEntityRecord(inserted) ?? {
							patientId,
							toothNumber: toothItem.toothNumber,
							state: conflictCheck.effectiveState,
							surfaces: conflictCheck.effectiveSurfaces,
							notes: toothItem.notes,
						},
					);
				} else {
					const [updated] = await tx
						.update(toothStates)
						.set({
							state: conflictCheck.effectiveState,
							surfaces: conflictCheck.effectiveSurfaces ?? null,
							notes:
								toothItem.notes !== null
									? toothItem.notes
									: serverTooth.notes,
							updatedAt: incomingDate,
							version: (serverTooth.version ?? 0) + 1,
							isSynced: true,
						})
						.where(eq(toothStates.id, serverTooth.id))
						.returning();
					updatedTeethStates.push(
						toEntityRecord(updated) ?? {
							...serverTooth,
							state: conflictCheck.effectiveState,
							surfaces: conflictCheck.effectiveSurfaces,
							notes: toothItem.notes,
						},
					);
				}

				if (conflictCheck.conflictDetail) {
					allConflicts.push(conflictCheck.conflictDetail);
				}
				mergedFields.push(`tooth_${toothItem.toothNumber}`);
				if (conflictCheck.isMerged) {
					mergedFields.push(`tooth_${toothItem.toothNumber}_surfaces`);
				}
			} else {
				await tx.insert(toothStateHistory).values({
					organizationId,
					patientId,
					visitId: toothItem.visitId ?? null,
					toothNumber: toothItem.toothNumber,
					previousState: null,
					newState: toothItem.state,
					previousSurfaces: null,
					newSurfaces: toothItem.surfaces ?? null,
					changedByUserId: effectiveAuthorId,
					reason: "Оффлайн-синхронизация (LWW архив)",
					changedAt: incomingDate,
				});

				if (conflictCheck.conflictDetail) {
					allConflicts.push(conflictCheck.conflictDetail);
				}
				updatedTeethStates.push(
					ensureEntityRecord(serverTooth),
				);
			}
		}

		const newVector = buildOdontogramVector({
			serverVector,
			teethList,
			incomingDate,
			effectiveAuthorId,
			clientId,
		});

		await SyncQueueManager.upsertEntityVector(
			tx,
			organizationId,
			"odontogram_state",
			mutation.entityId,
			newVector,
			mutation.mutationId,
		);

		const status: SyncMutationStatus =
			allConflicts.length > 0
				? "conflict_resolved"
				: mergedFields.length > 0
					? "merged"
					: "applied";

		return {
			status,
			mergedFields,
			conflicts: allConflicts,
			entity: {
				patientId,
				teeth: updatedTeethStates,
			},
		};
	}

	/**
	 * Treatment Item Handler with strict tenant scoping, integer kopecks & CRDT merge.
	 */
	public static async handleTreatmentItemMutation(
		tx: TenantDb,
		organizationId: string,
		mutation: SyncMutationEnvelope,
		clientId: string,
		authorUserId?: string,
	): Promise<EntityMutationHandlerResult> {
		if (!isValidUuid(mutation.entityId)) {
			throw new Error(
				`Invalid treatment_item UUID: ${mutation.entityId}`,
			);
		}

		const [serverItem] = await tx
			.select()
			.from(treatmentItems)
			.where(
				and(
					eq(treatmentItems.organizationId, organizationId),
					eq(treatmentItems.id, mutation.entityId),
				),
			)
			.limit(1);

		const [vectorRow] = await tx
			.select()
			.from(syncEntityVectors)
			.where(
				and(
					eq(syncEntityVectors.organizationId, organizationId),
					eq(syncEntityVectors.entityKind, "treatment_item"),
					eq(syncEntityVectors.entityId, mutation.entityId),
				),
			)
			.limit(1);

		const serverVector = (vectorRow?.vectorJson as MutationVector) || {};

		const mergeResult = performFieldLevelCrdtMerge({
			entityKind: "treatment_item",
			entityId: mutation.entityId,
			serverEntity: toEntityRecord(serverItem),
			serverVector,
			clientPatch: mutation.payload,
			clientVector: mutation.mutationVector,
			clientUpdatedAt: mutation.updatedAt,
			serverUpdatedAt: vectorRow?.updatedAt?.toISOString() || null,
			clientId,
			authorUserId: authorUserId || mutation.authorUserId,
		});

		const resolveKopecksValue = (
			kopecksRaw: unknown,
			rubRaw: unknown,
			fallbackKopecks: bigint,
		): bigint => {
			if (kopecksRaw !== undefined && kopecksRaw !== null) {
				const k = BigInt(String(kopecksRaw));
				assertIntegerKopecks(k);
				return k;
			}
			if (
				typeof rubRaw === "number" ||
				typeof rubRaw === "string"
			) {
				return BigInt(parseKopecks(rubRaw));
			}
			return fallbackKopecks;
		};

		const validItemStatuses = new Set([
			"proposed",
			"approved",
			"in_progress",
			"completed",
			"cancelled",
		]);
		const normalizeItemStatus = (
			raw: unknown,
			fallback: "proposed" | "approved" | "in_progress" | "completed" | "cancelled",
		) => {
			const str = typeof raw === "string" ? raw : "";
			return (
				validItemStatuses.has(str) ? str : fallback
			) as
				| "proposed"
				| "approved"
				| "in_progress"
				| "completed"
				| "cancelled";
		};

		const merged = mergeResult.mergedEntity;

		if (!serverItem) {
			if (!isValidUuid(merged.patientId)) {
				throw new Error(
					`Invalid or missing patientId UUID for treatment_item mutation: ${String(merged.patientId)}`,
				);
			}
			const patientId = String(merged.patientId);
			const [tenantPatient] = await tx
				.select({ id: patients.id })
				.from(patients)
				.where(
					and(
						eq(patients.organizationId, organizationId),
						eq(patients.id, patientId),
					),
				)
				.limit(1);
			if (!tenantPatient) {
				throw new Error(
					`Patient ${patientId} not found in organization ${organizationId} for treatment_item`,
				);
			}

			const title =
				typeof merged.title === "string" && merged.title.trim().length > 0
					? merged.title.trim()
					: "";
			if (!title) {
				throw new Error("Treatment item title is required");
			}

			const unitPriceKopecks = resolveKopecksValue(
				merged.unitPriceKopecks,
				merged.unitPriceRub,
				resolveKopecksValue(merged.priceKopecks, merged.priceRub, 0n),
			);
			const priceKopecks = resolveKopecksValue(
				merged.priceKopecks,
				merged.priceRub,
				unitPriceKopecks,
			);
			const discountKopecks = resolveKopecksValue(
				merged.discountKopecks,
				merged.discountRub,
				0n,
			);

			const [inserted] = await tx
				.insert(treatmentItems)
				.values({
					id: mutation.entityId,
					organizationId,
					patientId,
					visitId: isValidUuid(merged.visitId) ? String(merged.visitId) : null,
					treatmentPlanId: isValidUuid(merged.treatmentPlanId)
						? String(merged.treatmentPlanId)
						: null,
					treatmentPlanItemId: isValidUuid(merged.treatmentPlanItemId)
						? String(merged.treatmentPlanItemId)
						: null,
					invoiceId: isValidUuid(merged.invoiceId) ? String(merged.invoiceId) : null,
					serviceId: isValidUuid(merged.serviceId) ? String(merged.serviceId) : null,
					toothCode: merged.toothCode ? String(merged.toothCode) : null,
					title,
					quantity: String(merged.quantity ?? "1"),
					priceKopecks,
					unitPriceKopecks,
					discountKopecks,
					priceRub: kopecksToRubles(priceKopecks),
					unitPriceRub: kopecksToRubles(unitPriceKopecks),
					discountRub: kopecksToRubles(discountKopecks),
					status: normalizeItemStatus(merged.status, "proposed"),
					plannedDoctorUserId: isValidUuid(merged.plannedDoctorUserId)
						? String(merged.plannedDoctorUserId)
						: null,
					plannedChairId: isValidUuid(merged.plannedChairId)
						? String(merged.plannedChairId)
						: null,
					notes: merged.notes ? String(merged.notes) : null,
					isSynced: true,
					version: 1,
				})
				.returning();

			await SyncQueueManager.upsertEntityVector(
				tx,
				organizationId,
				"treatment_item",
				mutation.entityId,
				mergeResult.updatedVector,
				mutation.mutationId,
			);

			return {
				status: "applied",
				mergedFields: mergeResult.changedFields,
				conflicts: [],
				entity: ensureEntityRecord(inserted),
			};
		}

		const updateData: Record<string, unknown> = {
			isSynced: true,
			version: (serverItem.version ?? 0) + 1,
		};
		if ("title" in merged && typeof merged.title === "string" && merged.title.trim()) {
			updateData.title = merged.title.trim();
		}
		if ("toothCode" in merged) {
			updateData.toothCode = merged.toothCode ? String(merged.toothCode) : null;
		}
		if ("quantity" in merged && merged.quantity !== undefined && merged.quantity !== null) {
			updateData.quantity = String(merged.quantity);
		}
		if ("status" in merged) {
			updateData.status = normalizeItemStatus(merged.status, serverItem.status);
		}
		if ("notes" in merged) {
			updateData.notes = merged.notes ? String(merged.notes) : null;
		}
		if ("unitPriceKopecks" in merged || "unitPriceRub" in merged) {
			const unitK = resolveKopecksValue(
				merged.unitPriceKopecks,
				merged.unitPriceRub,
				serverItem.unitPriceKopecks,
			);
			updateData.unitPriceKopecks = unitK;
			updateData.unitPriceRub = kopecksToRubles(unitK);
		}
		if ("priceKopecks" in merged || "priceRub" in merged) {
			const priceK = resolveKopecksValue(
				merged.priceKopecks,
				merged.priceRub,
				serverItem.priceKopecks,
			);
			updateData.priceKopecks = priceK;
			updateData.priceRub = kopecksToRubles(priceK);
		}
		if ("discountKopecks" in merged || "discountRub" in merged) {
			const discK = resolveKopecksValue(
				merged.discountKopecks,
				merged.discountRub,
				serverItem.discountKopecks,
			);
			updateData.discountKopecks = discK;
			updateData.discountRub = kopecksToRubles(discK);
		}

		const [updated] = await tx
			.update(treatmentItems)
			.set(updateData)
			.where(
				and(
					eq(treatmentItems.organizationId, organizationId),
					eq(treatmentItems.id, mutation.entityId),
				),
			)
			.returning();

		await SyncQueueManager.upsertEntityVector(
			tx,
			organizationId,
			"treatment_item",
			mutation.entityId,
			mergeResult.updatedVector,
			mutation.mutationId,
		);

		const status: SyncMutationStatus = mergeResult.hasConflicts
			? "conflict_resolved"
			: mergeResult.changedFields.length > 0
				? "merged"
				: "applied";

		return {
			status,
			mergedFields: mergeResult.changedFields,
			conflicts: mergeResult.conflicts,
			entity: ensureEntityRecord(updated || merged),
		};
	}

	/**
	 * Clinical Task Handler with strict tenant scoping & CRDT merge.
	 */
	public static async handleClinicalTaskMutation(
		tx: TenantDb,
		organizationId: string,
		mutation: SyncMutationEnvelope,
		clientId: string,
		authorUserId?: string,
	): Promise<EntityMutationHandlerResult> {
		if (!isValidUuid(mutation.entityId)) {
			throw new Error(`Invalid clinical_task UUID: ${mutation.entityId}`);
		}

		const [serverTask] = await tx
			.select({
				id: clinicalTasks.id,
				organizationId: clinicalTasks.organizationId,
				patientId: clinicalTasks.patientId,
				treatmentPlanId: clinicalTasks.treatmentPlanId,
				assignedDoctorId: clinicalTasks.assignedDoctorId,
				taskType: clinicalTasks.taskType,
				status: clinicalTasks.status,
				title: clinicalTasks.title,
				description: clinicalTasks.description,
				dueAt: clinicalTasks.dueAt,
				createdAt: clinicalTasks.createdAt,
			})
			.from(clinicalTasks)
			.where(
				and(
					eq(clinicalTasks.organizationId, organizationId),
					eq(clinicalTasks.id, mutation.entityId),
				),
			)
			.limit(1);

		const [vectorRow] = await tx
			.select()
			.from(syncEntityVectors)
			.where(
				and(
					eq(syncEntityVectors.organizationId, organizationId),
					eq(syncEntityVectors.entityKind, "clinical_task"),
					eq(syncEntityVectors.entityId, mutation.entityId),
				),
			)
			.limit(1);

		const serverVector = (vectorRow?.vectorJson as MutationVector) || {};

		const mergeResult = performFieldLevelCrdtMerge({
			entityKind: "clinical_task",
			entityId: mutation.entityId,
			serverEntity: toEntityRecord(serverTask),
			serverVector,
			clientPatch: mutation.payload,
			clientVector: mutation.mutationVector,
			clientUpdatedAt: mutation.updatedAt,
			serverUpdatedAt:
				vectorRow?.updatedAt?.toISOString() ||
				serverTask?.createdAt?.toISOString() ||
				null,
			clientId,
			authorUserId: authorUserId || mutation.authorUserId,
		});

		const validTaskStatuses = new Set([
			"pending",
			"in_progress",
			"completed",
			"cancelled",
		]);
		const normalizeTaskStatus = (
			raw: unknown,
			fallback: "pending" | "in_progress" | "completed" | "cancelled",
		) => {
			const str = typeof raw === "string" ? raw : "";
			return (
				validTaskStatuses.has(str) ? str : fallback
			) as "pending" | "in_progress" | "completed" | "cancelled";
		};

		const merged = mergeResult.mergedEntity;

		if (!serverTask) {
			if (!isValidUuid(merged.patientId)) {
				throw new Error(
					`Invalid or missing patientId UUID for clinical_task mutation: ${String(merged.patientId)}`,
				);
			}
			const patientId = String(merged.patientId);
			const [tenantPatient] = await tx
				.select({ id: patients.id })
				.from(patients)
				.where(
					and(
						eq(patients.organizationId, organizationId),
						eq(patients.id, patientId),
					),
				)
				.limit(1);
			if (!tenantPatient) {
				throw new Error(
					`Patient ${patientId} not found in organization ${organizationId} for clinical_task`,
				);
			}

			const title =
				typeof merged.title === "string" && merged.title.trim().length > 0
					? merged.title.trim()
					: "";
			if (!title) {
				throw new Error("Clinical task title is required");
			}

			const taskType =
				typeof merged.taskType === "string" && merged.taskType.trim().length > 0
					? merged.taskType.trim()
					: "follow_up";

			const treatmentPlanId = isValidUuid(merged.treatmentPlanId)
				? String(merged.treatmentPlanId)
				: null;
			const assignedDoctorId = isValidUuid(merged.assignedDoctorId)
				? String(merged.assignedDoctorId)
				: null;
			const normalizedStatus = normalizeTaskStatus(merged.status, "pending");
			const description = merged.description ? String(merged.description) : null;
			const dueAt = merged.dueAt ? new Date(String(merged.dueAt)) : null;

			const insertedResult = await tx.execute(sql`
				INSERT INTO "clinical_tasks" (
					"id",
					"organization_id",
					"patient_id",
					"treatment_plan_id",
					"assigned_doctor_id",
					"task_type",
					"status",
					"title",
					"description",
					"due_at"
				) VALUES (
					${mutation.entityId}::uuid,
					${organizationId}::uuid,
					${patientId}::uuid,
					${treatmentPlanId}::uuid,
					${assignedDoctorId}::uuid,
					${taskType},
					${normalizedStatus}::clinical_task_status,
					${title},
					${description},
					${dueAt}
				)
				RETURNING
					"id",
					"organization_id" AS "organizationId",
					"patient_id" AS "patientId",
					"treatment_plan_id" AS "treatmentPlanId",
					"assigned_doctor_id" AS "assignedDoctorId",
					"task_type" AS "taskType",
					"status",
					"title",
					"description",
					"due_at" AS "dueAt",
					"created_at" AS "createdAt"
			`);
			const inserted = insertedResult.rows[0];

			await SyncQueueManager.upsertEntityVector(
				tx,
				organizationId,
				"clinical_task",
				mutation.entityId,
				mergeResult.updatedVector,
				mutation.mutationId,
			);

			return {
				status: "applied",
				mergedFields: mergeResult.changedFields,
				conflicts: [],
				entity: ensureEntityRecord(inserted),
			};
		}

		const updateData: Record<string, unknown> = {};
		if ("title" in merged && typeof merged.title === "string" && merged.title.trim()) {
			updateData.title = merged.title.trim();
		}
		if ("taskType" in merged && typeof merged.taskType === "string" && merged.taskType.trim()) {
			updateData.taskType = merged.taskType.trim();
		}
		if ("status" in merged) {
			updateData.status = normalizeTaskStatus(merged.status, serverTask.status);
		}
		if ("description" in merged) {
			updateData.description = merged.description ? String(merged.description) : null;
		}
		if ("assignedDoctorId" in merged) {
			updateData.assignedDoctorId = isValidUuid(merged.assignedDoctorId)
				? String(merged.assignedDoctorId)
				: null;
		}
		if ("dueAt" in merged) {
			updateData.dueAt = merged.dueAt ? new Date(String(merged.dueAt)) : null;
		}

		let updated = serverTask;
		if (Object.keys(updateData).length > 0) {
			const [row] = await tx
				.update(clinicalTasks)
				.set(updateData)
				.where(
					and(
						eq(clinicalTasks.organizationId, organizationId),
						eq(clinicalTasks.id, mutation.entityId),
					),
				)
				.returning({
					id: clinicalTasks.id,
					organizationId: clinicalTasks.organizationId,
					patientId: clinicalTasks.patientId,
					treatmentPlanId: clinicalTasks.treatmentPlanId,
					assignedDoctorId: clinicalTasks.assignedDoctorId,
					taskType: clinicalTasks.taskType,
					status: clinicalTasks.status,
					title: clinicalTasks.title,
					description: clinicalTasks.description,
					dueAt: clinicalTasks.dueAt,
					createdAt: clinicalTasks.createdAt,
				});
			if (row) {
				updated = row;
			}
		}

		await SyncQueueManager.upsertEntityVector(
			tx,
			organizationId,
			"clinical_task",
			mutation.entityId,
			mergeResult.updatedVector,
			mutation.mutationId,
		);

		const status: SyncMutationStatus = mergeResult.hasConflicts
			? "conflict_resolved"
			: mergeResult.changedFields.length > 0
				? "merged"
				: "applied";

		return {
			status,
			mergedFields: mergeResult.changedFields,
			conflicts: mergeResult.conflicts,
			entity: ensureEntityRecord(updated || merged),
		};
	}
}
