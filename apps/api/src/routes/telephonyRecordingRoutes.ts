import * as http from "node:http";
import * as https from "node:https";
import { and, eq } from "drizzle-orm";
import type { FastifyPluginAsync } from "fastify";
import {
	requireClinicalReadAccess,
	requireResolvedOrganizationId,
} from "../accessGuard.js";
import { db } from "../db/client.js";
import { withTenantCtx } from "../db/rls.js";
import { communicationEvents } from "../db/schema.js";
import {
	UUID_REGEX,
	validateSsrfSafeRecordingUrl,
} from "../services/telephony/telephonySecurity.js";

/**
 * Secure Call Recording Streaming Proxy (SSRF, Tenant Isolation, and Clinical Read Guard)
 */
export const telephonyRecordingRoutes: FastifyPluginAsync = async (server) => {
	server.get<{
		Params: { eventId: string };
	}>(
		"/recordings/:eventId/stream",
		{
			config: {
				tenantTxSelfManaged: true,
			},
		},
		async (request, reply) => {
			if (
				!(await requireClinicalReadAccess(
					request,
					reply,
					"stream call recording",
				))
			) {
				return;
			}

			const orgId = await requireResolvedOrganizationId(
				request,
				reply,
				"stream call recording",
			);
			if (!orgId) return;

			const { eventId } = request.params;
			if (!UUID_REGEX.test(eventId)) {
				return reply
					.status(400)
					.send({ error: "InvalidEventId", message: "Invalid event ID format" });
			}

			const eventRow = await withTenantCtx(orgId, async () => {
				const rows = await db
					.select({
						id: communicationEvents.id,
						recordingUrl: communicationEvents.recordingUrl,
						audioFormat: communicationEvents.audioFormat,
					})
					.from(communicationEvents)
					.where(
						and(
							eq(communicationEvents.id, eventId),
							eq(communicationEvents.organizationId, orgId),
						),
					)
					.limit(1);
				return rows[0] || null;
			});

			if (!eventRow || !eventRow.recordingUrl) {
				return reply.status(404).send({
					error: "NotFound",
					message: "Audio recording not found or inaccessible",
				});
			}

			const ssrfVerification = await validateSsrfSafeRecordingUrl(
				eventRow.recordingUrl,
			);
			if (!ssrfVerification.valid || !ssrfVerification.parsedUrl) {
				request.log.error(
					{
						eventId,
						url: eventRow.recordingUrl,
						reason: ssrfVerification.error,
					},
					"[TelephonyStream] SSRF check rejected recording stream request",
				);
				return reply.status(403).send({
					error: "ForbiddenRecordingUrl",
					message:
						"The requested audio recording URL failed security verification",
				});
			}

			const targetUrl = ssrfVerification.parsedUrl;

			return new Promise<void>((resolve) => {
				const client = targetUrl.protocol === "https:" ? https : http;

				const proxyReq = client.get(
					targetUrl.href,
					{
						timeout: 10000,
						headers: {
							"User-Agent": "DenteDentalCRM-AudioProxy/1.0",
						},
					},
					(proxyRes) => {
						const statusCode = proxyRes.statusCode || 500;
						if (statusCode < 200 || statusCode >= 300) {
							reply.status(502).send({
								error: "BadGateway",
								message: `Upstream PBX audio server returned status ${statusCode}`,
							});
							return resolve();
						}

						const contentType =
							proxyRes.headers["content-type"] ||
							eventRow.audioFormat ||
							"audio/mpeg";

						if (
							!contentType.startsWith("audio/") &&
							!contentType.includes("ogg") &&
							!contentType.includes("octet-stream")
						) {
							reply.status(403).send({
								error: "InvalidContentType",
								message: "Upstream resource is not a valid audio stream",
							});
							return resolve();
						}

						reply.raw.writeHead(200, {
							"Content-Type": contentType,
							"Content-Length": proxyRes.headers["content-length"] || "",
							"Accept-Ranges": "bytes",
							"Cache-Control": "private, no-cache, no-store, must-revalidate",
							"X-Content-Type-Options": "nosniff",
						});

						proxyRes.pipe(reply.raw);

						proxyRes.on("end", () => resolve());
						proxyRes.on("error", (err) => {
							request.log.error(
								err,
								"[TelephonyStream] Error in upstream audio pipe",
							);
							if (!reply.raw.headersSent) {
								reply.status(500).send({
									error: "StreamError",
									message: "Failed to stream audio",
								});
							}
							resolve();
						});
					},
				);

				proxyReq.on("timeout", () => {
					proxyReq.destroy();
					if (!reply.raw.headersSent) {
						reply.status(504).send({
							error: "GatewayTimeout",
							message: "Timeout connecting to PBX audio server",
						});
					}
					resolve();
				});

				proxyReq.on("error", (err) => {
					request.log.error(
						err,
						"[TelephonyStream] Connection error to upstream recording server",
					);
					if (!reply.raw.headersSent) {
						reply.status(502).send({
							error: "BadGateway",
							message: "Unable to connect to PBX audio storage",
						});
					}
					resolve();
				});
			});
		},
	);
};
