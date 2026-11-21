/**
 * telephonyCallerLookupRoutes.ts
 *
 * Fastify plugin providing high-performance caller resolution routes for Telephony Screen Pop:
 * - GET /:organizationId/lookup
 * - GET /lookup
 */

import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { requireClinicalReadContext } from "../accessGuard.js";
import { withTenantCtx } from "../db/rls.js";
import { CallerLookupService } from "../services/telephony/callerLookupService.js";

export const telephonyCallerLookupRoutes: FastifyPluginAsync = async (server) => {
	const handleLookupCaller = async (
		request: FastifyRequest<{
			Params: { organizationId?: string };
			Querystring: { phone?: string; patientId?: string; organizationId?: string };
		}>,
		reply: FastifyReply,
	) => {
		const context = await requireClinicalReadContext(request, reply, "lookup caller");
		if (!context) return;
		const resolvedOrgId = context.organizationId;

		if (request.params.organizationId && request.params.organizationId !== resolvedOrgId) {
			return reply.status(403).send({
				error: "OrganizationMismatch",
				message: "Несовпадение идентификатора организации",
			});
		}

		const phone = request.query.phone;
		const patientId = request.query.patientId;

		const result = await withTenantCtx(resolvedOrgId, async () => {
			return CallerLookupService.lookupCaller({
				organizationId: resolvedOrgId,
				phone,
				patientId,
				logger: request.log,
			});
		});

		return reply.send(result);
	};

	server.get<{
		Params: { organizationId: string };
		Querystring: { phone?: string; patientId?: string };
	}>("/:organizationId/lookup", handleLookupCaller);

	server.get<{
		Params: { organizationId?: string };
		Querystring: { phone?: string; patientId?: string; organizationId?: string };
	}>("/lookup", handleLookupCaller);

	// Backward-compatibility aliases for CTI screen pop specifications
	server.get<{
		Params: { organizationId: string };
		Querystring: { phone?: string; patientId?: string };
	}>("/:organizationId/lookup-caller", handleLookupCaller);

	server.get<{
		Params: { organizationId?: string };
		Querystring: { phone?: string; patientId?: string; organizationId?: string };
	}>("/lookup-caller", handleLookupCaller);
};
