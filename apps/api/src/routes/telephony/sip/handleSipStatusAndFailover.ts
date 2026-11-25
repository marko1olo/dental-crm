import type { FastifyReply, FastifyRequest } from "fastify";
import { requireClinicalMutationContext, requireClinicalReadContext } from "../../../accessGuard.js";
import { TelephonyGatewayService } from "../../../services/telephony/telephonyGatewayService.js";
import { telephonySipFailoverBodySchema } from "../types.js";

export async function handleSipStatus(
	request: FastifyRequest<{ Params: { organizationId?: string } }>,
	reply: FastifyReply,
) {
	const context = await requireClinicalReadContext(request, reply, "get telephony gateway status");
	if (!context) return;
	const orgId = context.organizationId;

	const rawOrgId = request.params?.organizationId;
	if (rawOrgId && rawOrgId !== orgId) {
		return reply.code(403).send({
			error: "Forbidden",
			message: "Tenant context mismatch for SIP status",
		});
	}

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
	const context = await requireClinicalMutationContext(request, reply, "set telephony failover");
	if (!context) return;
	const orgId = context.organizationId;

	const rawOrgId = request.params?.organizationId;
	if (rawOrgId && rawOrgId !== orgId) {
		return reply.code(403).send({
			error: "Forbidden",
			message: "Tenant context mismatch for SIP failover",
		});
	}

	const parsedBody = telephonySipFailoverBodySchema.safeParse(request.body ?? {});
	if (!parsedBody.success) {
		return reply.status(400).send({
			error: "ValidationError",
			message: "forceCloudFallback must be a boolean",
		});
	}

	const force = parsedBody.data.forceCloudFallback;
	await TelephonyGatewayService.setForcedFailover(orgId, force);
	const status = await TelephonyGatewayService.evaluateTelephonyGatewayStatus(orgId);

	return reply.status(200).send({
		success: true,
		failoverActive: force,
		status,
	});
}
