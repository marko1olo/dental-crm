import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import {
	requireClinicalReadAccess,
	requireResolvedOrganizationId,
} from "../../accessGuard.js";
import { withTenantCtx } from "../../db/rls.js";
import { getRequestIdentity } from "../../security/identity.js";
import { TelephonyGatewayService } from "../../services/telephony/telephonyGatewayService.js";
import { UUID_REGEX } from "../../services/telephony/telephonySecurity.js";

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

export async function handleSipTransfer(
	request: FastifyRequest<{
		Params: { organizationId?: string };
		Body: { callId?: string; targetExtensionOrPhone?: string; transferType?: "blind" | "attended" };
	}>,
	reply: FastifyReply,
) {
	if (!(await requireClinicalReadAccess(request, reply, "transfer sip call"))) return;
	const orgId = await requireResolvedOrganizationId(request, reply, "transfer sip call");
	if (!orgId) return;

	const body = request.body || {};
	const callId = (body.callId || "").trim();
	const targetExtensionOrPhone = (body.targetExtensionOrPhone || "").trim();
	const transferType = body.transferType === "attended" ? "attended" : "blind";

	if (!callId || !targetExtensionOrPhone) {
		return reply.status(400).send({
			error: "ValidationError",
			message: "callId and targetExtensionOrPhone are required for call transfer",
		});
	}

	const identity = getRequestIdentity(request);
	const result = await TelephonyGatewayService.transferCall({
		organizationId: orgId,
		callId,
		targetExtensionOrPhone,
		transferType,
		initiatedByUserId: identity.userId ?? undefined,
	});
	return reply.status(200).send(result);
}

export const telephonySipTransferHandler = handleSipTransfer;

export const telephonySipTransferRoutes: FastifyPluginAsync = async (server) => {
	server.post<{ Params: { organizationId: string } }>("/:organizationId/asterisk/ami-event", handleAsteriskAmiEvent);
	server.post<{ Params: { organizationId?: string } }>("/asterisk/ami-event", handleAsteriskAmiEvent);
	server.post<{
		Params: { organizationId: string };
		Body: { callId?: string; targetExtensionOrPhone?: string; transferType?: "blind" | "attended" };
	}>("/:organizationId/sip/transfer", handleSipTransfer);
	server.post<{
		Params: { organizationId?: string };
		Body: { callId?: string; targetExtensionOrPhone?: string; transferType?: "blind" | "attended" };
	}>("/sip/transfer", handleSipTransfer);
};
