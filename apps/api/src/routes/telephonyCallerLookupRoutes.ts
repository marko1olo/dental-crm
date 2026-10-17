/**
 * telephonyCallerLookupRoutes.ts
 *
 * Fastify plugin providing high-performance caller resolution routes for Telephony Screen Pop:
 * - GET /:organizationId/lookup-caller
 * - GET /lookup-caller
 */

import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedOrganizationId } from "../accessGuard.js";
import { withTenantCtx } from "../db/rls.js";
import { CallerLookupService } from "../services/telephony/callerLookupService.js";
import { UUID_REGEX } from "../services/telephony/telephonySecurity.js";

export const telephonyCallerLookupRoutes: FastifyPluginAsync = async (server) => {
	const handleLookupCaller = async (
		request: FastifyRequest<{
			Params: { organizationId?: string };
			Querystring: { phone?: string; patientId?: string; organizationId?: string };
		}>,
		reply: FastifyReply,
	) => {
		let orgId: string | null = null;
		if (request.params.organizationId && UUID_REGEX.test(request.params.organizationId)) {
			orgId = request.params.organizationId;
		} else {
			orgId = await requireResolvedOrganizationId(request, reply, "lookup caller");
		}

		if (!orgId) return;

		const phone = request.query.phone;
		const patientId = request.query.patientId;

		const result = await withTenantCtx(orgId, async () => {
			return CallerLookupService.lookupCaller({
				organizationId: orgId!,
				phone,
				patientId,
			});
		});

		return reply.send(result);
	};

	server.get<{
		Params: { organizationId: string };
		Querystring: { phone?: string; patientId?: string };
	}>("/:organizationId/lookup-caller", handleLookupCaller);

	server.get<{
		Params: { organizationId?: string };
		Querystring: { phone?: string; patientId?: string; organizationId?: string };
	}>("/lookup-caller", handleLookupCaller);

	server.get<{
		Params: { organizationId: string };
		Querystring: { phone?: string; patientId?: string };
	}>("/:organizationId/caller-lookup", handleLookupCaller);

	server.get<{
		Params: { organizationId?: string };
		Querystring: { phone?: string; patientId?: string; organizationId?: string };
	}>("/caller-lookup", handleLookupCaller);
};
