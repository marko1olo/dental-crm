/**
 * telephonyCallerLookupRoutes.ts
 *
 * Fastify plugin providing high-performance caller resolution routes for Telephony Screen Pop:
 * - GET /:organizationId/lookup
 * - GET /lookup
 */

import type { FastifyPluginAsync } from "fastify";
import { requireClinicalReadContext } from "../../accessGuard.js";
import { defineStreamRoute } from "../../core/routeFactories.js";
import { withTenantReadCtx } from "../../db/rls.js";
import { CallerLookupService } from "../../services/telephony/callerLookupService.js";

export const telephonyCallerLookupRoutes: FastifyPluginAsync = async (server) => {
	const registerLookupRoute = (path: string) => {
		defineStreamRoute(server, {
			method: "GET",
			path,
			permission: "public",
			handler: async ({ request, reply }) => {
				const context = await requireClinicalReadContext(request, reply, "lookup caller");
				if (!context) return;
				const resolvedOrgId = context.organizationId;

				const params = (request.params ?? {}) as { organizationId?: string };
				const query = (request.query ?? {}) as {
					phone?: string;
					patientId?: string;
					organizationId?: string;
				};

				if (params.organizationId && params.organizationId !== resolvedOrgId) {
					return reply.status(403).send({
						error: "OrganizationMismatch",
						message: "Несовпадение идентификатора организации",
					});
				}

				const phone = query.phone;
				const patientId = query.patientId;

				const result = await withTenantReadCtx(resolvedOrgId, async (tx) => {
					return CallerLookupService.lookupCaller({
						organizationId: resolvedOrgId,
						phone,
						patientId,
						tx,
						logger: request.log,
					});
				});

				return reply.send(result);
			},
		});
	};

	registerLookupRoute("/:organizationId/lookup");
	registerLookupRoute("/lookup");

	// Backward-compatibility aliases for CTI screen pop specifications
	registerLookupRoute("/:organizationId/lookup-caller");
	registerLookupRoute("/lookup-caller");
};
