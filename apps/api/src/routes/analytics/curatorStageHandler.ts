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

	const existingProfile = (patient.profile as Record<string, unknown>) ?? {};
	const updatedProfile: Record<string, unknown> = {
		...existingProfile,
		curatorFunnelStage: payload.stage,
		curatorStageUpdatedAt: new Date().toISOString(),
	};

	if (payload.notes !== undefined) {
		updatedProfile.curatorNotes = payload.notes;
	}
	if (payload.curatorId !== undefined) {
		updatedProfile.curatorId = payload.curatorId;
	}

	await db
		.update(patients)
		.set({ administrativeProfile: updatedProfile as any })
		.where(and(eq(patients.id, payload.patientId), eq(patients.organizationId, orgId)));

	return { success: true };
}
