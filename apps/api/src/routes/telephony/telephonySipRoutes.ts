import type { FastifyPluginAsync } from "fastify";
import type { AsteriskAmiEventPayload } from "../../services/telephony/telephonyGatewayService.js";
import { handleAsteriskAmiEvent } from "./sip/handleAsteriskAmiEvent.js";
import { handleSipCallTransfer } from "./sip/handleSipCallTransfer.js";
import { handleSipCredentials } from "./sip/handleSipCredentials.js";
import { handleSipFailover, handleSipStatus } from "./sip/handleSipStatusAndFailover.js";

export const telephonySipRoutes: FastifyPluginAsync = async (server) => {
	// WebRTC SIP Credentials
	server.post<{ Params: { organizationId: string }; Body: { extension?: string; staffFullName?: string } }>(
		"/:organizationId/sip/credentials",
		handleSipCredentials,
	);
	server.post<{ Params: { organizationId?: string }; Body: { extension?: string; staffFullName?: string } }>(
		"/sip/credentials",
		handleSipCredentials,
	);

	// Gateway Status (TCP socket probing outside PG TX)
	server.get<{ Params: { organizationId: string } }>(
		"/:organizationId/sip/status",
		{ config: { tenantTxSelfManaged: true } },
		handleSipStatus,
	);
	server.get<{ Params: { organizationId?: string } }>(
		"/sip/status",
		{ config: { tenantTxSelfManaged: true } },
		handleSipStatus,
	);

	// Failover (TCP socket probing outside PG TX)
	server.post<{ Params: { organizationId: string }; Body: { forceCloudFallback?: boolean } }>(
		"/:organizationId/sip/failover",
		{ config: { tenantTxSelfManaged: true } },
		handleSipFailover,
	);
	server.post<{ Params: { organizationId?: string }; Body: { forceCloudFallback?: boolean } }>(
		"/sip/failover",
		{ config: { tenantTxSelfManaged: true } },
		handleSipFailover,
	);

	// Asterisk AMI / ARI
	server.post<{ Params: { organizationId?: string }; Body: AsteriskAmiEventPayload }>(
		"/:organizationId/asterisk/ami-event",
		{ config: { tenantTxSelfManaged: true } },
		handleAsteriskAmiEvent,
	);
	server.post<{ Params: { organizationId?: string }; Body: AsteriskAmiEventPayload }>(
		"/asterisk/ami-event",
		{ config: { tenantTxSelfManaged: true } },
		handleAsteriskAmiEvent,
	);

	// SIP Transfer (external PBX AMI / Cloud HTTP outside PG TX)
	server.post<{ Params: { organizationId: string }; Body: { callId?: string; targetExtensionOrPhone?: string; transferType?: "blind" | "attended" } }>(
		"/:organizationId/sip/transfer",
		{ config: { tenantTxSelfManaged: true } },
		handleSipCallTransfer,
	);
	server.post<{ Params: { organizationId?: string }; Body: { callId?: string; targetExtensionOrPhone?: string; transferType?: "blind" | "attended" } }>(
		"/sip/transfer",
		{ config: { tenantTxSelfManaged: true } },
		handleSipCallTransfer,
	);
};
