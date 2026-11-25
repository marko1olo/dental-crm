import type { FastifyReply, FastifyRequest } from "fastify";
import { requireClinicalMutationContext } from "../../../accessGuard.js";
import { getRequestIdentity } from "../../../security/identity.js";
import { TelephonyGatewayService } from "../../../services/telephony/telephonyGatewayService.js";
import { telephonySipTransferBodySchema } from "../types.js";

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

	const parsedBody = telephonySipTransferBodySchema.safeParse(request.body ?? {});
	if (!parsedBody.success) {
		return reply.status(400).send({
			error: "ValidationError",
			message: "callId and targetExtensionOrPhone are required for call transfer",
		});
	}

	const identity = getRequestIdentity(request);
	const result = await TelephonyGatewayService.transferCall({
		organizationId: orgId,
		callId: parsedBody.data.callId,
		targetExtensionOrPhone: parsedBody.data.targetExtensionOrPhone,
		transferType: parsedBody.data.transferType,
		initiatedByUserId: identity.userId ?? undefined,
		logger: request.log,
	});

	if (!result.success) {
		return reply.status(result.statusCode ?? 422).send(result);
	}

	return reply.status(200).send(result);
}
