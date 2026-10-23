import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import {
	requireClinicalReadAccess,
	requireResolvedOrganizationId,
} from "../../accessGuard.js";
import { getRequestIdentity } from "../../security/identity.js";
import { TelephonyGatewayService } from "../../services/telephony/telephonyGatewayService.js";

export async function handleSipCredentials(
	request: FastifyRequest<{
		Params: { organizationId?: string };
		Body: { extension?: string; staffFullName?: string };
	}>,
	reply: FastifyReply,
) {
	if (!(await requireClinicalReadAccess(request, reply, "provision sip credentials"))) return;
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

	return reply.status(200).send({ success: true, organizationId: orgId, credentials });
}

export async function handleSipStatus(
	request: FastifyRequest<{ Params: { organizationId?: string } }>,
	reply: FastifyReply,
) {
	if (!(await requireClinicalReadAccess(request, reply, "get telephony gateway status"))) return;
	const orgId = await requireResolvedOrganizationId(request, reply, "get telephony gateway status");
	if (!orgId) return;

	const status = await TelephonyGatewayService.evaluateTelephonyGatewayStatus(orgId);
	return reply.status(200).send({ success: true, status });
}

export async function handleSipFailover(
	request: FastifyRequest<{
		Params: { organizationId?: string };
		Body: { forceCloudFallback?: boolean };
	}>,
	reply: FastifyReply,
) {
	if (!(await requireClinicalReadAccess(request, reply, "set telephony failover"))) return;
	const orgId = await requireResolvedOrganizationId(request, reply, "set telephony failover");
	if (!orgId) return;

	const body = (request.body || {}) as { forceCloudFallback?: boolean };
	const force = Boolean(body.forceCloudFallback);

	TelephonyGatewayService.setForcedFailover(orgId, force);
	const status = await TelephonyGatewayService.evaluateTelephonyGatewayStatus(orgId);
	return reply.status(200).send({ success: true, failoverActive: force, status });
}

export const telephonyCallStatusHandler = handleSipStatus;

export const telephonyCallStatusRoutes: FastifyPluginAsync = async (server) => {
	server.post<{ Params: { organizationId: string }; Body: { extension?: string; staffFullName?: string } }>("/:organizationId/sip/credentials", handleSipCredentials);
	server.post<{ Params: { organizationId?: string }; Body: { extension?: string; staffFullName?: string } }>("/sip/credentials", handleSipCredentials);
	server.get<{ Params: { organizationId: string } }>("/:organizationId/sip/status", handleSipStatus);
	server.get<{ Params: { organizationId?: string } }>("/sip/status", handleSipStatus);
	server.post<{ Params: { organizationId: string }; Body: { forceCloudFallback?: boolean } }>("/:organizationId/sip/failover", handleSipFailover);
	server.post<{ Params: { organizationId?: string }; Body: { forceCloudFallback?: boolean } }>("/sip/failover", handleSipFailover);
};
