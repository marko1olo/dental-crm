import type { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import {
	requireClinicalReadAccess,
	requireResolvedOrganizationId,
} from "../accessGuard.js";
import { withTenantCtx } from "../db/rls.js";
import { getRequestIdentity } from "../security/identity.js";
import { TelephonyGatewayService } from "../services/telephony/telephonyGatewayService.js";
import { UUID_REGEX } from "../services/telephony/telephonySecurity.js";

export const telephonySipRoutes: FastifyPluginAsync = async (
	server: FastifyInstance,
) => {
	// --------------------------------------------------------------------------
	// WebRTC SIP Credentials Provisioning (Local Asterisk / FreePBX)
	// --------------------------------------------------------------------------
	const handleSipCredentials = async (
		request: FastifyRequest<{
			Params: { organizationId?: string };
			Body: { extension?: string; staffFullName?: string };
		}>,
		reply: FastifyReply,
	) => {
		if (
			!(await requireClinicalReadAccess(
				request,
				reply,
				"provision sip credentials",
			))
		) {
			return;
		}
		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"provision sip credentials",
		);
		if (!orgId) return;

		const body = (request.body || {}) as {
			extension?: string;
			staffFullName?: string;
		};
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
	};

	server.post<{
		Params: { organizationId: string };
		Body: { extension?: string; staffFullName?: string };
	}>("/:organizationId/sip/credentials", handleSipCredentials);

	server.post<{
		Params: { organizationId?: string };
		Body: { extension?: string; staffFullName?: string };
	}>("/sip/credentials", handleSipCredentials);

	// --------------------------------------------------------------------------
	// Telephony Gateway Health & Active Mode Status (Local vs Cloud Fallback)
	// --------------------------------------------------------------------------
	const handleSipStatus = async (
		request: FastifyRequest<{ Params: { organizationId?: string } }>,
		reply: FastifyReply,
	) => {
		if (
			!(await requireClinicalReadAccess(
				request,
				reply,
				"get telephony gateway status",
			))
		) {
			return;
		}
		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"get telephony gateway status",
		);
		if (!orgId) return;

		const status =
			await TelephonyGatewayService.evaluateTelephonyGatewayStatus(orgId);
		return reply.status(200).send({
			success: true,
			status,
		});
	};

	server.get<{ Params: { organizationId: string } }>(
		"/:organizationId/sip/status",
		handleSipStatus,
	);
	server.get<{ Params: { organizationId?: string } }>(
		"/sip/status",
		handleSipStatus,
	);

	// --------------------------------------------------------------------------
	// Seamless Failover Trigger (Toggle Local WebRTC SIP vs Cloud Webhooks)
	// --------------------------------------------------------------------------
	const handleSipFailover = async (
		request: FastifyRequest<{
			Params: { organizationId?: string };
			Body: { forceCloudFallback?: boolean };
		}>,
		reply: FastifyReply,
	) => {
		if (
			!(await requireClinicalReadAccess(
				request,
				reply,
				"set telephony failover",
			))
		) {
			return;
		}
		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"set telephony failover",
		);
		if (!orgId) return;

		const body = (request.body || {}) as { forceCloudFallback?: boolean };
		const force = Boolean(body.forceCloudFallback);

		TelephonyGatewayService.setForcedFailover(orgId, force);
		const status =
			await TelephonyGatewayService.evaluateTelephonyGatewayStatus(orgId);

		return reply.status(200).send({
			success: true,
			failoverActive: force,
			status,
		});
	};

	server.post<{
		Params: { organizationId: string };
		Body: { forceCloudFallback?: boolean };
	}>("/:organizationId/sip/failover", handleSipFailover);

	server.post<{
		Params: { organizationId?: string };
		Body: { forceCloudFallback?: boolean };
	}>("/sip/failover", handleSipFailover);

	// --------------------------------------------------------------------------
	// Asterisk AMI / ARI Event Bridge Ingestion
	// --------------------------------------------------------------------------
	const handleAsteriskAmiEvent = async (
		request: FastifyRequest<{ Params: { organizationId?: string } }>,
		reply: FastifyReply,
	) => {
		const rawOrgId = request.params.organizationId;
		if (rawOrgId && !UUID_REGEX.test(rawOrgId)) {
			return reply.status(400).send({
				error: "InvalidOrganizationId",
				message: "organizationId must be a valid UUID format",
			});
		}

		const orgId =
			rawOrgId ||
			(await requireResolvedOrganizationId(
				request,
				reply,
				"asterisk ami event",
			));
		if (!orgId) return;

		const rawBody = (request.body || {}) as Record<string, unknown>;
		const result = await withTenantCtx(orgId, async () => {
			return await TelephonyGatewayService.processAsteriskAmiEvent(
				orgId,
				rawBody as any,
			);
		});

		return reply.status(200).send(result);
	};

	server.post<{ Params: { organizationId: string } }>(
		"/:organizationId/asterisk/ami-event",
		handleAsteriskAmiEvent,
	);
	server.post<{ Params: { organizationId?: string } }>(
		"/asterisk/ami-event",
		handleAsteriskAmiEvent,
	);

	// --------------------------------------------------------------------------
	// WebRTC SIP Call Transfer (Blind / Attended Transfer)
	// --------------------------------------------------------------------------
	const handleSipTransfer = async (
		request: FastifyRequest<{
			Params: { organizationId?: string };
			Body: {
				callId?: string;
				targetExtensionOrPhone?: string;
				transferType?: "blind" | "attended";
			};
		}>,
		reply: FastifyReply,
	) => {
		if (
			!(await requireClinicalReadAccess(request, reply, "transfer sip call"))
		) {
			return;
		}
		const orgId = await requireResolvedOrganizationId(
			request,
			reply,
			"transfer sip call",
		);
		if (!orgId) return;

		const body = request.body || {};
		const callId = (body.callId || "").trim();
		const targetExtensionOrPhone = (body.targetExtensionOrPhone || "").trim();
		const transferType =
			body.transferType === "attended" ? "attended" : "blind";

		if (!callId || !targetExtensionOrPhone) {
			return reply.status(400).send({
				error: "ValidationError",
				message:
					"callId and targetExtensionOrPhone are required for call transfer",
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
	};

	server.post<{
		Params: { organizationId: string };
		Body: {
			callId?: string;
			targetExtensionOrPhone?: string;
			transferType?: "blind" | "attended";
		};
	}>("/:organizationId/sip/transfer", handleSipTransfer);

	server.post<{
		Params: { organizationId?: string };
		Body: {
			callId?: string;
			targetExtensionOrPhone?: string;
			transferType?: "blind" | "attended";
		};
	}>("/sip/transfer", handleSipTransfer);
};
