import type { FastifyReply, FastifyRequest } from "fastify";
import { requireClinicalReadAccess, requireResolvedOrganizationId } from "../../../accessGuard.js";
import { TelephonyGatewayService } from "../../../services/telephony/telephonyGatewayService.js";

export async function handleSipStatus(
	request: FastifyRequest<{ Params: { organizationId?: string } }>,
	reply: FastifyReply,
) {
	if (!(await requireClinicalReadAccess(request, reply, "get telephony gateway status"))) {
		return;
	}
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
	if (!(await requireClinicalReadAccess(request, reply, "set telephony failover"))) {
		return;
	}
	const orgId = await requireResolvedOrganizationId(request, reply, "set telephony failover");
	if (!orgId) return;

	const body = (request.body || {}) as { forceCloudFallback?: boolean };
	const force = Boolean(body.forceCloudFallback);

	TelephonyGatewayService.setForcedFailover(orgId, force);
	const status = await TelephonyGatewayService.evaluateTelephonyGatewayStatus(orgId);

	return reply.status(200).send({
		success: true,
		failoverActive: force,
		status,
	});
}
