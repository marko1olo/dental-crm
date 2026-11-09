import * as http from "node:http";
import * as https from "node:https";
import { and, eq } from "drizzle-orm";
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import {
	requireClinicalReadAccess,
	requireResolvedOrganizationId,
} from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { withTenantCtx } from "../../db/rls.js";
import { communicationEvents } from "../../db/schema.js";
import {
	UUID_REGEX,
	validateSsrfSafeRecordingUrl,
} from "../../services/telephony/telephonySecurity.js";

export type StreamRecordingRouteGeneric = {
	Params: { eventId?: string; id?: string; organizationId?: string };
	Querystring: { eventId?: string; id?: string; url?: string };
};

export async function handleStreamRecording(
	request: FastifyRequest<StreamRecordingRouteGeneric>,
	reply: FastifyReply,
) {
	if (!(await requireClinicalReadAccess(request, reply, "stream call recording"))) return;
	const orgId = await requireResolvedOrganizationId(request, reply, "stream call recording");
	if (!orgId) return;

	const eventId = request.params.eventId || request.params.id || request.query?.eventId || request.query?.id;
	if (!eventId || !UUID_REGEX.test(eventId)) {
		return reply.status(400).send({ error: "InvalidEventId", message: "Invalid event ID format" });
	}

	const eventRow = await withTenantCtx(orgId, async () => {
		const rows = await db
			.select({ id: communicationEvents.id, recordingUrl: communicationEvents.recordingUrl, audioFormat: communicationEvents.audioFormat })
			.from(communicationEvents)
			.where(and(eq(communicationEvents.id, eventId), eq(communicationEvents.organizationId, orgId)))
			.limit(1);
		return rows[0] || null;
	});

	if (!eventRow?.recordingUrl) {
		return reply.status(404).send({ error: "NotFound", message: "Audio recording not found or inaccessible" });
	}

	const ssrf = await validateSsrfSafeRecordingUrl(eventRow.recordingUrl);
	if (!ssrf.valid || !ssrf.parsedUrl) {
		request.log.error({ eventId, url: eventRow.recordingUrl, reason: ssrf.error }, "[TelephonyStream] SSRF check rejected");
		return reply.status(403).send({ error: "ForbiddenRecordingUrl", message: "Audio URL failed security verification" });
	}

	const targetUrl = ssrf.parsedUrl;
	return new Promise<void>((resolve) => {
		const client = targetUrl.protocol === "https:" ? https : http;
		const reqHeaders: Record<string, string> = {
			"User-Agent": "DenteDentalCRM-AudioProxy/1.0",
		};
		if (request.headers.range) {
			reqHeaders.range = request.headers.range;
		}

		const proxyReq = client.get(targetUrl.href, { timeout: 10000, headers: reqHeaders }, (proxyRes) => {
			const statusCode = proxyRes.statusCode || 500;
			if (statusCode < 200 || statusCode >= 300) {
				reply.status(502).send({ error: "BadGateway", message: `PBX audio server returned status ${statusCode}` });
				return resolve();
			}
			const contentType = proxyRes.headers["content-type"] || eventRow.audioFormat || "audio/mpeg";
			const responseHeaders: Record<string, string> = {
				"Content-Type": contentType,
				"Accept-Ranges": "bytes",
				"Cache-Control": "private, no-cache, no-store, must-revalidate",
				"X-Content-Type-Options": "nosniff",
			};
			if (proxyRes.headers["content-length"]) {
				responseHeaders["Content-Length"] = proxyRes.headers["content-length"];
			}
			if (proxyRes.headers["content-range"]) {
				responseHeaders["Content-Range"] = proxyRes.headers["content-range"];
			}

			reply.raw.writeHead(statusCode === 206 ? 206 : 200, responseHeaders);
			proxyRes.pipe(reply.raw);
			proxyRes.on("end", () => resolve());
			proxyRes.on("error", () => {
				if (!reply.raw.headersSent) reply.status(500).send({ error: "StreamError", message: "Failed to stream audio" });
				resolve();
			});
		});
		proxyReq.on("timeout", () => {
			proxyReq.destroy();
			if (!reply.raw.headersSent) reply.status(504).send({ error: "GatewayTimeout", message: "Timeout connecting to PBX audio server" });
			resolve();
		});
		proxyReq.on("error", () => {
			if (!reply.raw.headersSent) reply.status(502).send({ error: "BadGateway", message: "Unable to connect to PBX audio storage" });
			resolve();
		});
	});
}

export const telephonyRecordingStreamHandler = handleStreamRecording;

export const telephonyRecordingStreamRoutes: FastifyPluginAsync = async (server) => {
	server.get<StreamRecordingRouteGeneric>("/recordings/:eventId/stream", { config: { tenantTxSelfManaged: true } }, handleStreamRecording);
	server.get<StreamRecordingRouteGeneric>("/recordings/:eventId", { config: { tenantTxSelfManaged: true } }, handleStreamRecording);
	server.get<StreamRecordingRouteGeneric>("/:organizationId/recordings/:eventId/stream", { config: { tenantTxSelfManaged: true } }, handleStreamRecording);
	server.get<StreamRecordingRouteGeneric>("/:organizationId/recordings/:eventId", { config: { tenantTxSelfManaged: true } }, handleStreamRecording);
};
