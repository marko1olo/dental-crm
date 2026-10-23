import type { FastifyPluginAsync } from "fastify";
import { handleAsteriskAmiEvent } from "./telephony/sip/handleAsteriskAmiEvent.js";
import { handleSipCallTransfer } from "./telephony/sip/handleSipCallTransfer.js";
import { handleSipCredentials } from "./telephony/sip/handleSipCredentials.js";
import { handleSipFailover, handleSipStatus } from "./telephony/sip/handleSipStatusAndFailover.js";

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

	// Gateway Status
	server.get<{ Params: { organizationId: string } }>("/:organizationId/sip/status", handleSipStatus);
	server.get<{ Params: { organizationId?: string } }>("/sip/status", handleSipStatus);

	// Failover
	server.post<{ Params: { organizationId: string }; Body: { forceCloudFallback?: boolean } }>(
		"/:organizationId/sip/failover",
		handleSipFailover,
	);
	server.post<{ Params: { organizationId?: string }; Body: { forceCloudFallback?: boolean } }>(
		"/sip/failover",
		handleSipFailover,
	);

	// Asterisk AMI / ARI
	server.post<{ Params: { organizationId: string } }>("/:organizationId/asterisk/ami-event", handleAsteriskAmiEvent);
	server.post<{ Params: { organizationId?: string } }>("/asterisk/ami-event", handleAsteriskAmiEvent);

	// SIP Transfer
	server.post<{ Params: { organizationId: string }; Body: { callId?: string; targetExtensionOrPhone?: string; transferType?: "blind" | "attended" } }>(
		"/:organizationId/sip/transfer",
		handleSipCallTransfer,
	);
	server.post<{ Params: { organizationId?: string }; Body: { callId?: string; targetExtensionOrPhone?: string; transferType?: "blind" | "attended" } }>(
		"/sip/transfer",
		handleSipCallTransfer,
	);
};
