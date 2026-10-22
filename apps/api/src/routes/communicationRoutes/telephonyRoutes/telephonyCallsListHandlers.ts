import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import {
	requireClinicalReadAccess,
	requireResolvedOrganizationId,
} from "../../../accessGuard.js";
import { db } from "../../../db/client.js";
import { communicationEvents, patients } from "../../../db/schema.js";

export function registerTelephonyCallsListHandlers(app: FastifyInstance): void {
	app.get("/api/communications/telephony/calls", async (request, reply) => {
		if (
			!(await requireClinicalReadAccess(
				request,
				reply,
				"list telephony calls",
			))
		)
			return;

		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"list telephony calls",
		);
		if (!orgId) return;

		const calls = await db
			.select({
				id: communicationEvents.id,
				patientId: communicationEvents.patientId,
				channel: communicationEvents.channel,
				direction: communicationEvents.direction,
				status: communicationEvents.status,
				message: communicationEvents.message,
				recordingUrl: communicationEvents.recordingUrl,
				durationSeconds: communicationEvents.durationSeconds,
				createdAt: communicationEvents.createdAt,
				patientName: patients.fullName,
				patientPhone: patients.phone,
			})
			.from(communicationEvents)
			.leftJoin(patients, eq(patients.id, communicationEvents.patientId))
			.where(
				and(
					eq(communicationEvents.organizationId, orgId),
					eq(communicationEvents.channel, "phone"),
				),
			)
			.orderBy(desc(communicationEvents.createdAt))
			.limit(50);

		return reply.send({
			success: true,
			calls,
		});
	});
}
