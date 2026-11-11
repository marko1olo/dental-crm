import type { FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedOrganizationId } from "../../../accessGuard.js";
import { withTenantCtx } from "../../../db/rls.js";
import {
	type AsteriskAmiEventPayload,
	TelephonyGatewayService,
} from "../../../services/telephony/telephonyGatewayService.js";
import { UUID_REGEX } from "../../../services/telephony/telephonySecurity.js";

export async function handleAsteriskAmiEvent(
	request: FastifyRequest<{
		Params: { organizationId?: string };
		Body: AsteriskAmiEventPayload;
	}>,
	reply: FastifyReply,
) {
	const rawOrgId = request.params.organizationId;
	if (rawOrgId && !UUID_REGEX.test(rawOrgId)) {
		return reply.status(400).send({
			error: "InvalidOrganizationId",
			message: "organizationId must be a valid UUID format",
		});
	}

	const orgId = await requireResolvedOrganizationId(request, reply, "asterisk ami event");
	if (!orgId) return;

	// DEF-TEL-10: Предотвращение обхода изоляции арендатора при передаче чужого organizationId в params
	if (rawOrgId && rawOrgId !== orgId) {
		return reply.status(403).send({
			error: "OrganizationMismatch",
			message: "Запрещён доступ к событиям телефонии другой организации.",
		});
	}

	const payload = (request.body || {}) as AsteriskAmiEventPayload;
	const result = await withTenantCtx(orgId, async () => {
		return await TelephonyGatewayService.processAsteriskAmiEvent(orgId, payload);
	});

	return reply.status(200).send(result);
}
