import type { FastifyPluginAsync } from "fastify";
import { telephonyRecordingStreamHandler } from "./telephony/telephonyRecordingStreamHandler.js";

/**
 * Secure Call Recording Streaming Proxy (SSRF, Tenant Isolation, and Clinical Read Guard)
 */
export const telephonyRecordingRoutes: FastifyPluginAsync = async (server) => {
	server.get<{
		Params: { eventId?: string; id?: string };
		Querystring: { url?: string };
	}>("/:organizationId/recordings/stream", telephonyRecordingStreamHandler);

	server.get<{
		Params: { eventId?: string; id?: string };
		Querystring: { url?: string };
	}>("/recordings/stream", telephonyRecordingStreamHandler);
};
