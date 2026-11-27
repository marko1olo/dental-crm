import * as fs from "node:fs";
import * as http from "node:http";
import * as https from "node:https";
import * as path from "node:path";
import { and, eq } from "drizzle-orm";
import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import {
	requireClinicalReadAccess,
	requireResolvedOrganizationId,
} from "../../accessGuard.js";
import { withTenantReadCtx } from "../../db/rls.js";
import { communicationEvents } from "../../db/schema.js";
import {
	UUID_REGEX,
	validateSsrfSafeRecordingUrl,
} from "../../services/telephony/telephonySecurity.js";

export type StreamRecordingRouteGeneric = {
	Params: { eventId?: string; id?: string; organizationId?: string };
	Querystring: {
		eventId?: string;
		id?: string;
		url?: string;
		token?: string;
		clinicToken?: string;
		staffToken?: string;
		adminSecret?: string;
	};
};

export function getAudioCacheDir(): string {
	const base = process.cwd().includes("apps/api") ? ".data" : "apps/api/.data";
	return path.resolve(process.cwd(), base, "audio-cache");
}

export function getAudioCachePath(orgId: string, eventId: string): string {
	if (!UUID_REGEX.test(orgId) || !UUID_REGEX.test(eventId)) {
		throw new Error("Invalid audio cache parameters: orgId and eventId must be valid UUIDs to prevent path traversal");
	}
	return path.join(getAudioCacheDir(), orgId, `${eventId}.audio`);
}

export async function handleStreamRecording(
	request: FastifyRequest<StreamRecordingRouteGeneric>,
	reply: FastifyReply,
) {
	// Авторизация передается строго через HTTP-заголовки (x-dente-clinic-token, x-dente-staff-token, x-dente-admin-secret, Authorization).
	// Передача adminSecret и токенов в открытом GET query запрещена в целях безопасности ПДн и предотвращения утечки в логах.
	if (!(await requireClinicalReadAccess(request, reply, "stream call recording"))) return;
	const orgId = await requireResolvedOrganizationId(request, reply, "stream call recording");
	if (!orgId) return;

	const rawOrgId = request.params?.organizationId;
	if (rawOrgId && rawOrgId !== orgId) {
		return reply.status(403).send({
			error: "OrganizationMismatch",
			message: "Несовпадение идентификатора организации при доступе к аудиозаписи",
		});
	}

	const eventId = request.params.eventId || request.params.id || request.query?.eventId || request.query?.id;
	if (!eventId || !UUID_REGEX.test(eventId)) {
		return reply.status(400).send({ error: "InvalidEventId", message: "Invalid event ID format" });
	}

	const eventRow = await withTenantReadCtx(orgId, async (tx) => {
		const rows = await tx
			.select({ id: communicationEvents.id, recordingUrl: communicationEvents.recordingUrl, audioFormat: communicationEvents.audioFormat })
			.from(communicationEvents)
			.where(and(eq(communicationEvents.id, eventId), eq(communicationEvents.organizationId, orgId)))
			.limit(1);
		return rows[0] || null;
	});

	if (!eventRow?.recordingUrl) {
		return reply.status(404).send({ error: "NotFound", message: "Audio recording not found or inaccessible" });
	}

	const cacheFilePath = getAudioCachePath(orgId, eventId);
	let cacheStat: fs.Stats | null = null;
	try {
		cacheStat = await fs.promises.stat(cacheFilePath);
	} catch (err: unknown) {
		if ((err as NodeJS.ErrnoException)?.code !== "ENOENT") {
			request.log.debug({ err, eventId, cacheFilePath }, "[TelephonyStream] Unexpected error accessing audio cache file");
		}
		cacheStat = null;
	}

	const contentType = eventRow.audioFormat || "audio/mpeg";

	// 1. Потоковая отдача из локального дискового кэша с поддержкой HTTP Range (206 Partial Content)
	if (cacheStat && cacheStat.size > 0) {
		const totalSize = cacheStat.size;
		const etag = `W/"${eventId}-${totalSize}-${Math.floor(cacheStat.mtimeMs)}"`;

		if (request.headers["if-none-match"] === etag) {
			reply.raw.writeHead(304, {
				ETag: etag,
				"Cache-Control": "private, max-age=86400, stale-while-revalidate=3600",
				"X-Audio-Cache": "HIT",
			});
			reply.raw.end();
			return;
		}

		const rangeHeader = request.headers.range;
		if (rangeHeader) {
			const rangeMatch = rangeHeader.match(/bytes=(\d*)-(\d*)/);
			if (rangeMatch) {
				const rawStart = rangeMatch[1];
				const rawEnd = rangeMatch[2];
				const start = rawStart ? Number.parseInt(rawStart, 10) : 0;
				let end = rawEnd ? Number.parseInt(rawEnd, 10) : totalSize - 1;

				if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= totalSize) {
					reply.raw.writeHead(416, {
						"Content-Range": `bytes */${totalSize}`,
						"Accept-Ranges": "bytes",
						"Cache-Control": "private, max-age=86400",
						"X-Audio-Cache": "HIT",
					});
					reply.raw.end();
					return;
				}

				end = Math.min(end, totalSize - 1);
				const chunkSize = end - start + 1;

				reply.raw.writeHead(206, {
					"Content-Range": `bytes ${start}-${end}/${totalSize}`,
					"Accept-Ranges": "bytes",
					"Content-Length": String(chunkSize),
					"Content-Type": contentType,
					"Cache-Control": "private, max-age=86400, stale-while-revalidate=3600",
					ETag: etag,
					"X-Content-Type-Options": "nosniff",
					"X-Audio-Cache": "HIT",
				});

				return new Promise<void>((resolve) => {
					const stream = fs.createReadStream(cacheFilePath, { start, end });
					stream.pipe(reply.raw);
					stream.on("end", () => resolve());
					stream.on("error", () => resolve());
				});
			}
		}

		reply.raw.writeHead(200, {
			"Content-Length": String(totalSize),
			"Content-Type": contentType,
			"Accept-Ranges": "bytes",
			"Cache-Control": "private, max-age=86400, stale-while-revalidate=3600",
			ETag: etag,
			"X-Content-Type-Options": "nosniff",
			"X-Audio-Cache": "HIT",
		});

		return new Promise<void>((resolve) => {
			const stream = fs.createReadStream(cacheFilePath);
			stream.pipe(reply.raw);
			stream.on("end", () => resolve());
			stream.on("error", () => resolve());
		});
	}

	// 2. Проксирование и прогрев кэша из удалённой АТС с защитой SSRF
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
		if (request.headers["if-none-match"]) {
			reqHeaders["If-None-Match"] = request.headers["if-none-match"];
		}

		const proxyReq = client.get(targetUrl.href, { timeout: 10000, headers: reqHeaders }, async (proxyRes) => {
			const statusCode = proxyRes.statusCode || 500;
			if (statusCode === 304) {
				reply.raw.writeHead(304, {
					"Cache-Control": "private, max-age=86400, stale-while-revalidate=3600",
					"X-Audio-Cache": "MISS",
				});
				reply.raw.end();
				return resolve();
			}
			if (statusCode < 200 || statusCode >= 300) {
				reply.status(502).send({ error: "BadGateway", message: `PBX audio server returned status ${statusCode}` });
				return resolve();
			}

			const upstreamContentType = proxyRes.headers["content-type"] || contentType;
			const responseHeaders: Record<string, string> = {
				"Content-Type": upstreamContentType,
				"Accept-Ranges": "bytes",
				"Cache-Control": "private, max-age=86400, stale-while-revalidate=3600",
				"X-Content-Type-Options": "nosniff",
				"X-Audio-Cache": "MISS",
			};
			if (proxyRes.headers["content-length"]) {
				responseHeaders["Content-Length"] = proxyRes.headers["content-length"];
			}
			if (proxyRes.headers["content-range"]) {
				responseHeaders["Content-Range"] = proxyRes.headers["content-range"];
			}
			if (proxyRes.headers.etag) {
				responseHeaders.ETag = proxyRes.headers.etag;
			}

			// Прогрев кэша на диске при получении полного аудиопотока (200 OK)
			let cacheWriteStream: fs.WriteStream | null = null;
			let tempFilePath = "";
			if (statusCode === 200) {
				try {
					const orgCacheDir = path.dirname(cacheFilePath);
					await fs.promises.mkdir(orgCacheDir, { recursive: true });
					tempFilePath = `${cacheFilePath}.tmp-${Date.now()}`;
					cacheWriteStream = fs.createWriteStream(tempFilePath);
				} catch (err) {
					request.log.warn({ err, eventId }, "[TelephonyStream] Failed to initialize audio cache write stream");
					cacheWriteStream = null;
				}
			}

			reply.raw.writeHead(statusCode === 206 ? 206 : 200, responseHeaders);

			proxyRes.on("data", (chunk: Buffer) => {
				reply.raw.write(chunk);
				if (cacheWriteStream) {
					cacheWriteStream.write(chunk);
				}
			});

			proxyRes.on("end", () => {
				reply.raw.end();
				if (cacheWriteStream && tempFilePath) {
					cacheWriteStream.end(async () => {
						try {
							await fs.promises.rename(tempFilePath, cacheFilePath);
						} catch (renameErr) {
							request.log.warn({ err: renameErr, tempFilePath, cacheFilePath }, "[TelephonyStream] Failed to commit audio cache file");
							try {
								await fs.promises.unlink(tempFilePath);
							} catch (unlinkErr) {
								request.log.debug({ err: unlinkErr, tempFilePath }, "[TelephonyStream] Failed to clean up temp cache file");
							}
						}
					});
				}
				resolve();
			});

			proxyRes.on("error", async (proxyErr) => {
				request.log.warn({ err: proxyErr, eventId }, "[TelephonyStream] Stream error from PBX audio proxy");
				if (cacheWriteStream && tempFilePath) {
					try {
						cacheWriteStream.destroy();
						await fs.promises.unlink(tempFilePath).catch((unlinkErr) => {
							request.log.debug({ err: unlinkErr, tempFilePath }, "[TelephonyStream] Failed to unlink temp cache on stream error");
						});
					} catch (cleanupErr) {
						request.log.debug({ err: cleanupErr }, "[TelephonyStream] Cache write stream cleanup error");
					}
				}
				if (!reply.raw.headersSent) reply.status(500).send({ error: "StreamError", message: "Failed to stream audio" });
				resolve();
			});
		});

		proxyReq.on("timeout", () => {
			proxyReq.destroy();
			if (!reply.raw.headersSent) reply.status(504).send({ error: "GatewayTimeout", message: "Timeout connecting to PBX audio server" });
			resolve();
		});

		proxyReq.on("error", (reqErr) => {
			request.log.warn({ err: reqErr, eventId, targetUrl: targetUrl.href }, "[TelephonyStream] Connection error to PBX audio storage");
			if (!reply.raw.headersSent) reply.status(502).send({ error: "BadGateway", message: "Unable to connect to PBX audio storage" });
			resolve();
		});
	});
}

export const telephonyRecordingStreamHandler = handleStreamRecording;

export const telephonyRecordingStreamRoutes: FastifyPluginAsync = async (server) => {
	server.get<StreamRecordingRouteGeneric>("/recordings/:eventId/stream", { config: { tenantTxSelfManaged: true } }, handleStreamRecording);
	server.get<StreamRecordingRouteGeneric>("/recordings/:eventId", { config: { tenantTxSelfManaged: true } }, handleStreamRecording);
	server.get<StreamRecordingRouteGeneric>("/recordings/stream", { config: { tenantTxSelfManaged: true } }, handleStreamRecording);
	server.get<StreamRecordingRouteGeneric>("/:organizationId/recordings/:eventId/stream", { config: { tenantTxSelfManaged: true } }, handleStreamRecording);
	server.get<StreamRecordingRouteGeneric>("/:organizationId/recordings/:eventId", { config: { tenantTxSelfManaged: true } }, handleStreamRecording);
	server.get<StreamRecordingRouteGeneric>("/:organizationId/recordings/stream", { config: { tenantTxSelfManaged: true } }, handleStreamRecording);
};
