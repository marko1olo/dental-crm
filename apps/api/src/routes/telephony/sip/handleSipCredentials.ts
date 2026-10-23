import type { FastifyReply, FastifyRequest } from "fastify";
import { requireClinicalReadAccess, requireResolvedOrganizationId } from "../../../accessGuard.js";
import { getRequestIdentity } from "../../../security/identity.js";
import { TelephonyGatewayService } from "../../../services/telephony/telephonyGatewayService.js";

export async function handleSipCredentials(
	request: FastifyRequest<{
		Params: { organizationId?: string };
		Body: { extension?: string; staffFullName?: string };
	}>,
	reply: FastifyReply,
) {
	if (!(await requireClinicalReadAccess(request, reply, "provision sip credentials"))) {
		return;
	}
	const orgId = await requireResolvedOrganizationId(request, reply, "provision sip credentials");
	if (!orgId) return;

	const body = (request.body || {}) as { extension?: string; staffFullName?: string };
	const identity = getRequestIdentity(request);
	const credentials = TelephonyGatewayService.generateWebRtcSipCredentials({
		organizationId: orgId,
		userId: identity.userId || "anonymous",
		extension: body.extension,
		staffFullName: body.staffFullName,
	});

	return reply.status(200).send({
		success: true,
		organizationId: orgId,
		credentials,
	});
}
