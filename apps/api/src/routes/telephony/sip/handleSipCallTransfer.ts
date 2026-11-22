import type { FastifyReply, FastifyRequest } from "fastify";
import { requireClinicalMutationContext } from "../../../accessGuard.js";
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
	const mutationContext = await requireClinicalMutationContext(request, reply, "transfer sip call");
	if (!mutationContext) {
		return;
	}
	const orgId = mutationContext.organizationId;

	const rawOrgId = request.params?.organizationId;
	if (rawOrgId && rawOrgId !== orgId) {
		return reply.status(403).send({
			error: "OrganizationMismatch",
			message: "Несовпадение идентификатора организации",
		});
	}

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
