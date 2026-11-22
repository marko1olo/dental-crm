import type { PatientAdministrativeProfile } from "@dental/shared";
import { and, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { idempotencyKeys, patients } from "../../db/schema.js";
import type { UpdateCuratorStagePayload } from "./curatorTypes.js";

export interface CuratorStageResult {
	readonly success: boolean;
	readonly error?: string;
	readonly replayed?: boolean;
}

export async function persistCuratorStageInDb(
	orgId: string,
	payload: UpdateCuratorStagePayload,
	idempotencyKey?: string,
): Promise<CuratorStageResult> {
	return await db.transaction(async (tx) => {
		if (idempotencyKey) {
			const [existingKey] = await tx
				.select()
				.from(idempotencyKeys)
				.where(
					and(
						eq(idempotencyKeys.clinicId, orgId),
						eq(idempotencyKeys.key, idempotencyKey),
					),
				)
				.for("update");

			if (existingKey) {
				if (existingKey.status === "completed") {
					return { success: true, replayed: true };
				}
				if (existingKey.status === "in_flight") {
					return { success: false, error: "ConflictInFlight" };
				}
			} else {
				await tx.insert(idempotencyKeys).values({
					clinicId: orgId,
					key: idempotencyKey,
					status: "in_flight",
				});
			}
		}

		const [patient] = await tx
			.select({ id: patients.id, profile: patients.administrativeProfile })
			.from(patients)
			.where(and(eq(patients.id, payload.patientId), eq(patients.organizationId, orgId)))
			.for("update");

		if (!patient) {
			return { success: false, error: "PatientNotFound" };
		}

		const existingProfile: Partial<PatientAdministrativeProfile> = patient.profile ?? {};
		const nowIso = new Date().toISOString();
		const existingPlanStages = existingProfile.curatorPlanStages ?? {};

		const updatedPlanStages: NonNullable<PatientAdministrativeProfile["curatorPlanStages"]> = {
			...existingPlanStages,
		};
		if (payload.treatmentPlanId) {
			const prevForPlan = existingPlanStages[payload.treatmentPlanId];
			updatedPlanStages[payload.treatmentPlanId] = {
				stage: payload.stage,
				updatedAt: nowIso,
				notes: payload.notes !== undefined ? payload.notes : (prevForPlan?.notes ?? null),
				curatorId: payload.curatorId !== undefined ? payload.curatorId : (prevForPlan?.curatorId ?? null),
			};
		}

		const updatedProfile: Partial<PatientAdministrativeProfile> = {
			...existingProfile,
			curatorFunnelStage: payload.stage,
			curatorStageUpdatedAt: nowIso,
			curatorPlanStages: updatedPlanStages,
			...(payload.notes !== undefined ? { curatorNotes: payload.notes } : {}),
			...(payload.curatorId !== undefined ? { curatorId: payload.curatorId } : {}),
		};

		await tx
			.update(patients)
			.set({ administrativeProfile: updatedProfile })
			.where(and(eq(patients.id, payload.patientId), eq(patients.organizationId, orgId)));

		if (idempotencyKey) {
			await tx
				.update(idempotencyKeys)
				.set({
					status: "completed",
					responseCode: 200,
					responseBody: { success: true, message: "Этап воронки куратора обновлен" },
				})
				.where(
					and(
						eq(idempotencyKeys.clinicId, orgId),
						eq(idempotencyKeys.key, idempotencyKey),
					),
				);
		}

		return { success: true };
	});
}
