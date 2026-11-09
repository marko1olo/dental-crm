import type { FastifyPluginAsync } from "fastify";
import { telephonyRecordingStreamHandler } from "./telephony/telephonyRecordingStreamHandler.js";

/**
 * Secure Call Recording Streaming Proxy (SSRF, Tenant Isolation, and Clinical Read Guard)
 * Mandate 8e: Doctor Autonomy & Mandate 8b <= 120 lines.
 */
export const telephonyRecordingRoutes: FastifyPluginAsync = async (server) => {
	server.get<{
		Params: { organizationId?: string; eventId?: string; id?: string };
		Querystring: { eventId?: string; id?: string; url?: string };
	}>("/:organizationId/recordings/:eventId/stream", { config: { tenantTxSelfManaged: true } }, telephonyRecordingStreamHandler);

	server.get<{
		Params: { organizationId?: string; eventId?: string; id?: string };
		Querystring: { eventId?: string; id?: string; url?: string };
	}>("/recordings/:eventId/stream", { config: { tenantTxSelfManaged: true } }, telephonyRecordingStreamHandler);

	server.get<{
		Params: { organizationId?: string; eventId?: string; id?: string };
		Querystring: { eventId?: string; id?: string; url?: string };
	}>("/:organizationId/recordings/:eventId", { config: { tenantTxSelfManaged: true } }, telephonyRecordingStreamHandler);

	server.get<{
		Params: { organizationId?: string; eventId?: string; id?: string };
		Querystring: { eventId?: string; id?: string; url?: string };
	}>("/recordings/:eventId", { config: { tenantTxSelfManaged: true } }, telephonyRecordingStreamHandler);

	server.get<{
		Params: { organizationId?: string; eventId?: string; id?: string };
		Querystring: { eventId?: string; id?: string; url?: string };
	}>("/:organizationId/recordings/stream", { config: { tenantTxSelfManaged: true } }, telephonyRecordingStreamHandler);

	server.get<{
		Params: { organizationId?: string; eventId?: string; id?: string };
		Querystring: { eventId?: string; id?: string; url?: string };
	}>("/recordings/stream", { config: { tenantTxSelfManaged: true } }, telephonyRecordingStreamHandler);
};
