/**
 * apps/api/src/routes/sanpin/wasteModules/emergencyBiohazardHandlers.ts
 * Обработчики журнала аварийных ситуаций («Анти-ВИЧ»).
 * Мандат 8b: строго <= 120 строк.
 */

import crypto from "node:crypto";
import {
	SanPiNRegulatoryEngine,
	createEmergencyBiohazardLogDtoSchema,
} from "@dental/shared";
import { desc, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../accessGuard.js";
import { db } from "../../../db/client.js";
import { emergencyBiohazardLogs } from "../../../db/schema.js";
import { wsBroker } from "../../../services/websocketBroker.js";

export async function handleGetEmergencyBiohazard(req: FastifyRequest, reply: FastifyReply) {
	const organizationId = await requireResolvedStaffOrAdminOrganizationId(
		req,
		reply,
		"biohazard read",
	);
	if (!organizationId) return;

	const logs = await db
		.select()
		.from(emergencyBiohazardLogs)
		.where(eq(emergencyBiohazardLogs.organizationId, organizationId))
		.orderBy(desc(emergencyBiohazardLogs.incidentDateTime));

	return logs;
}

export async function handlePostEmergencyBiohazard(req: FastifyRequest, reply: FastifyReply) {
	const organizationId = await requireResolvedStaffOrAdminOrganizationId(
		req,
		reply,
		"biohazard create",
	);
	if (!organizationId) return;

	const parsed = createEmergencyBiohazardLogDtoSchema.safeParse(req.body);
	if (!parsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: parsed.error.issues[0]?.message ?? "Некорректные параметры аварийной ситуации.",
		});
	}
	const data = parsed.data;

	const protocolEval = SanPiNRegulatoryEngine.evaluateBiohazardEmergencyProtocol({
		antiHivKitUsed: data.antiHivKitUsed,
		bloodSampled: data.bloodSampledForTesting,
		arvRecommended: data.arvProphylaxisRecommended,
		arvStartedWithin72h: data.arvProphylaxisStartedWithin72h,
		chiefPhysicianNotified: data.chiefPhysicianNotified,
	});

	const year = new Date().getFullYear();
	const actNumber = data.actSanPiNNumber || `АКТ-ВБИ-${year}-${crypto.randomInt(100, 999)}`;

	const [log] = await db
		.insert(emergencyBiohazardLogs)
		.values({
			organizationId,
			incidentDateTime: new Date(data.incidentDateTime),
			victimStaffId: data.victimStaffId ?? null,
			victimFullName: data.victimFullName,
			victimRole: data.victimRole,
			patientId: data.patientId ?? null,
			patientFullName: data.patientFullName ?? null,
			patientCardNumber: data.patientCardNumber ?? null,
			patientInfectiousStatus: data.patientInfectiousStatus ?? null,
			injuryType: data.injuryType,
			circumstances: data.circumstances,
			firstAidMeasures: data.firstAidMeasures,
			antiHivKitUsed: data.antiHivKitUsed,
			bloodSampledForTesting: data.bloodSampledForTesting,
			arvProphylaxisRecommended: data.arvProphylaxisRecommended,
			arvProphylaxisStartedWithin72h: data.arvProphylaxisStartedWithin72h,
			arvDrugsPrescribed: data.arvDrugsPrescribed ?? null,
			chiefPhysicianNotified: data.chiefPhysicianNotified,
			actSanPiNNumber: actNumber,
			responsibleDoctorId: data.responsibleDoctorId ?? null,
			notes: data.notes ?? null,
		})
		.returning();

	wsBroker.broadcastToOrganization(organizationId, {
		type: "SANPIN_BIOHAZARD_LOG_ADDED",
		payload: { log, protocolEval },
	});

	return reply.code(201).send({ success: true, log, protocolEval });
}
