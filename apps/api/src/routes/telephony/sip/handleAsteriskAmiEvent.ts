import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedOrganizationId } from "../../../accessGuard.js";
import { withTenantCtx } from "../../../db/rls.js";
import { TelephonyGatewayService } from "../../../services/telephony/telephonyGatewayService.js";
import { UUID_REGEX } from "../../../services/telephony/telephonySecurity.js";

export async function handleAsteriskAmiEvent(
	request: FastifyRequest<{ Params: { organizationId?: string } }>,
	reply: FastifyReply,
) {
	const rawOrgId = request.params.organizationId;
	if (rawOrgId && !UUID_REGEX.test(rawOrgId)) {
		return reply.status(400).send({
			error: "InvalidOrganizationId",
			message: "organizationId must be a valid UUID format",
		});
	}

	const orgId = rawOrgId || (await requireResolvedOrganizationId(request, reply, "asterisk ami event"));
	if (!orgId) return;

	const rawBody = (request.body || {}) as Record<string, unknown>;
	const result = await withTenantCtx(orgId, async () => {
		return await TelephonyGatewayService.processAsteriskAmiEvent(orgId, rawBody as any);
	});

	return reply.status(200).send(result);
}
