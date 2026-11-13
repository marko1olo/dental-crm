import type { PatientAdministrativeProfile } from "@dental/shared";
import { and, eq } from "drizzle-orm";
import { db } from "../../db/client.js";
import { patients } from "../../db/schema.js";
import type { UpdateCuratorStagePayload } from "./curatorTypes.js";

export async function persistCuratorStageInDb(
	orgId: string,
	payload: UpdateCuratorStagePayload,
): Promise<{ success: boolean; error?: string }> {
	const [patient] = await db
		.select({ id: patients.id, profile: patients.administrativeProfile })
		.from(patients)
		.where(and(eq(patients.id, payload.patientId), eq(patients.organizationId, orgId)))
		.limit(1);

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

	await db
		.update(patients)
		.set({ administrativeProfile: updatedProfile })
		.where(and(eq(patients.id, payload.patientId), eq(patients.organizationId, orgId)));

	return { success: true };
}
