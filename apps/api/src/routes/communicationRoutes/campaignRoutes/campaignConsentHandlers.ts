import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import {
	requireClinicalReadAccess,
	requireResolvedOrganizationId,
} from "../../../accessGuard.js";
import { defineStreamRoute } from "../../../core/routeFactories.js";
import { withTenantReadCtx } from "../../../db/rls.js";
import { patientCommunicationConsents } from "../../../db/schema.js";
import { patientIdParamSchema } from "../types.js";

export function registerCampaignConsentHandlers(app: FastifyInstance): void {
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/communications/campaigns/consents/:patientId",
		permission: "public",
		handler: async ({ request, reply }) => {
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

			const paramsParsed = patientIdParamSchema.safeParse(request.params);
			if (!paramsParsed.success) {
				return reply.code(400).send({
					error: "InvalidPatientId",
					message: "Некорректный идентификатор пациента.",
				});
			}
			const { patientId } = paramsParsed.data;

			const consents = await withTenantReadCtx(organizationId, (tx) =>
				tx
					.select()
					.from(patientCommunicationConsents)
					.where(
						and(
							eq(patientCommunicationConsents.organizationId, organizationId),
							eq(patientCommunicationConsents.patientId, patientId),
						),
					)
					.orderBy(desc(patientCommunicationConsents.decidedAt)),
			);

			return reply.send({
				success: true,
				patientId,
				consents,
			});
		},
	});
}
