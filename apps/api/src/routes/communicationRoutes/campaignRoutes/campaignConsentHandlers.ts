import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import {
	requireClinicalReadAccess,
	requireResolvedOrganizationId,
} from "../../../accessGuard.js";
import { db } from "../../../db/client.js";
import { patientCommunicationConsents } from "../../../db/schema.js";

export function registerCampaignConsentHandlers(app: FastifyInstance): void {
	app.get(
		"/api/communications/campaigns/consents/:patientId",
		async (request, reply) => {
			if (
				!(await requireClinicalReadAccess(
					request,
					reply,
					"communications get patient consents",
				))
			)
				return;

			const organizationId = await requireResolvedOrganizationId(
				request,
				reply,
				"communications get patient consents",
			);
			if (!organizationId) return;

			const { patientId } = request.params as { patientId: string };

			const consents = await db
				.select()
				.from(patientCommunicationConsents)
				.where(
					and(
						eq(patientCommunicationConsents.organizationId, organizationId),
						eq(patientCommunicationConsents.patientId, patientId),
					),
				)
				.orderBy(desc(patientCommunicationConsents.decidedAt));

			return reply.send({
				success: true,
				patientId,
				consents,
			});
		},
	);
}
