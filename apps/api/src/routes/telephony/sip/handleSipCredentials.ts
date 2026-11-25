import type { FastifyReply, FastifyRequest } from "fastify";
import { requireClinicalReadAccess, requireResolvedOrganizationId } from "../../../accessGuard.js";
import { getRequestIdentity } from "../../../security/identity.js";
import { TelephonyGatewayService } from "../../../services/telephony/telephonyGatewayService.js";
import { telephonySipCredentialsBodySchema } from "../types.js";

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

	const rawOrgId = request.params?.organizationId;
	if (rawOrgId && rawOrgId !== orgId) {
		return reply.code(403).send({
			error: "Forbidden",
			message: "Tenant context mismatch for SIP credentials",
		});
	}

	const parsedBody = telephonySipCredentialsBodySchema.safeParse(request.body ?? {});
	if (!parsedBody.success) {
		return reply.status(400).send({
			error: "ValidationError",
			message: "Invalid SIP credentials request payload",
		});
	}

	const identity = getRequestIdentity(request);
	const credentials = TelephonyGatewayService.generateWebRtcSipCredentials({
		organizationId: orgId,
		userId: identity.userId || "anonymous",
		extension: parsedBody.data.extension,
		staffFullName: parsedBody.data.staffFullName,
	});

	return reply.status(200).send({
		success: true,
		organizationId: orgId,
		credentials,
	});
}
