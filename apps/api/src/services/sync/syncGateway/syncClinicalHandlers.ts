import type {
	FieldConflictDetail,
	MutationVector,
	SyncMutationEnvelope,
	SyncMutationStatus,
} from "@dental/shared";
import { and, eq } from "drizzle-orm";
import type { TenantDb } from "../../../db/rls.js";
import {
	syncEntityVectors,
	toothStateHistory,
	toothStates,
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
import type { EntityMutationHandlerResult } from "./types.js";

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
				serverEntity: (serverDiary as unknown as Record<string, unknown>) || null,
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
					entity: inserted as unknown as Record<string, unknown>,
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
				entity: (updated || merged) as unknown as Record<string, unknown>,
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
			serverEntity: (serverVisit as unknown as Record<string, unknown>) || null,
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
				entity: inserted as unknown as Record<string, unknown>,
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
			entity: (updated || merged) as unknown as Record<string, unknown>,
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
			const candidate = mutation.entityId.split(":")[0];
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
						(inserted as unknown as Record<string, unknown>) || {
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
						(updated as unknown as Record<string, unknown>) || {
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
					serverTooth as unknown as Record<string, unknown>,
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
}
