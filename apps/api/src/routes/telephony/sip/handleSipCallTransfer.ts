import type { FastifyReply, FastifyRequest } from "fastify";
import { requireClinicalReadAccess, requireResolvedOrganizationId } from "../../../accessGuard.js";
import { getRequestIdentity } from "../../../security/identity.js";
import { TelephonyGatewayService } from "../../../services/telephony/telephonyGatewayService.js";

export async function handleSipCallTransfer(
	request: FastifyRequest<{
		Params: { organizationId?: string };
		Body: {
			callId?: string;
			targetExtensionOrPhone?: string;
			transferType?: "blind" | "attended";
		};
	}>,
	reply: FastifyReply,
) {
	if (!(await requireClinicalReadAccess(request, reply, "transfer sip call"))) {
		return;
	}
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
