/**
 * speechLive.ts — Fastify Live Speech-to-Text WebSocket Route (/api/v1/speech/live).
 *
 * SQUAD BETA INVARIANTS:
 * 1. Fastify WebSocket route at `/api/v1/speech/live`: accepts incoming live microphone streams from web/desktop/mobile clients.
 * 2. BiDi Bridge Orchestration: creates an outgoing GeminiBidiBridge to Google Gemini 3.5 Transcribe Live.
 * 3. Network Shield & SOCKS5 Routing: automatically wraps outgoing socket in SOCKS5/HTTPS agent if USE_PROXY=true or GLOBAL_LLM_PROXY_URL is set.
 * 4. Full Dental Vocabulary Biasing: passes specialty and custom dental terms into Setup frame (FDI 11-48, 51-85, SanPiN, etc.).
 * 5. Strict Response Parsing: interimInputTranscription -> interim, inputTranscription -> final (NO modelTurn.parts search!).
 * 6. Automatic Key Pool Failover: transparent key rotation on 1008, 403, 429 errors.
 * 7. Live Health/Status endpoint: GET `/api/v1/speech/live/status` for observability.
 */

import { Buffer } from "node:buffer";
import fastifyWebsocket from "@fastify/websocket";
import type { DentalSpecialty } from "@dental/shared";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { WebSocket } from "ws";
import {
	getNetworkShieldStatus,
	isNetworkShieldEnabled,
	resolveNetworkShieldProxyUrl,
} from "../ai/network/networkShield.js";
import {
	GeminiBidiBridge,
	MANDATORY_DENTAL_BIDI_TERMS,
	type GeminiBidiTranscriptEvent,
} from "../speech/geminiBidiBridge.js";
import {
	getDentalSpeechBiasingTerms,
} from "../speech/dentalPrompt.js";
import { getProviderKeyPoolSummary } from "../speech/keyPool.js";
import { authTokenSecret } from "../security/authSecret.js";
import { getRequestIdentity, resolveIdentityFromTokens } from "../security/identity.js";
import { requireClinicalReadContext, requireResolvedOrganizationId } from "../accessGuard.js";
import { signToken, verifyToken } from "../utils/cryptoHelper.js";
import { z } from "zod";

interface SpeechLiveQueryParams {
	readonly specialty?: DentalSpecialty | undefined;
	readonly sampleRate?: string | number | undefined;
	readonly customTerms?: string | undefined;
	readonly model?: string | undefined;
	readonly key?: string | undefined;
	readonly ticket?: string | undefined;
}

interface VerifiedWsSession {
	readonly organizationId: string;
	readonly userId: string | null;
	readonly role: string;
}

const WS_TICKET_TTL_SECONDS = 60;
const WS_FIRST_FRAME_AUTH_TIMEOUT_MS = 1200;

const speechLiveTicketBodySchema = z
	.object({
		specialty: z.string().optional(),
		sampleRate: z.number().int().positive().optional(),
		model: z.string().optional(),
	})
	.strict();

function verifySpeechWsTicket(ticket: unknown): VerifiedWsSession | null {
	if (typeof ticket !== "string" || ticket.trim().length === 0) return null;
	let secret: string;
	try {
		secret = authTokenSecret();
	} catch {
		return null;
	}
	const payload = verifyToken(ticket.trim(), secret);
	if (!payload || payload.purpose !== "speech_live_ws") return null;
	if (typeof payload.organizationId !== "string" || payload.organizationId.trim().length === 0) {
		return null;
	}
	return {
		organizationId: payload.organizationId,
		userId: typeof payload.userId === "string" ? payload.userId : null,
		role: typeof payload.role === "string" ? payload.role : "staff",
	};
}

function extractProtocolTicket(request: FastifyRequest): string | null {
	const rawProto = request.headers["sec-websocket-protocol"];
	const values = Array.isArray(rawProto)
		? rawProto
		: typeof rawProto === "string"
		? rawProto.split(",")
		: [];
	for (const entry of values) {
		const trimmed = entry.trim();
		if (trimmed.startsWith("dente-ticket.")) {
			return trimmed.slice("dente-ticket.".length);
		}
		if (trimmed.startsWith("ticket.")) {
			return trimmed.slice("ticket.".length);
		}
	}
	return null;
}

function resolveInitialWsSession(request: FastifyRequest): VerifiedWsSession | null {
	const identity = getRequestIdentity(request);
	if (identity.verified && identity.organizationId) {
		return {
			organizationId: identity.organizationId,
			userId: identity.userId,
			role: identity.role ?? "staff",
		};
	}

	const query = (request.query || {}) as SpeechLiveQueryParams;
	let urlTicket: string | null = null;
	if (typeof request.url === "string" && request.url.includes("ticket=")) {
		try {
			urlTicket = new URL(request.url, "http://127.0.0.1").searchParams.get("ticket");
		} catch {
			urlTicket = null;
		}
	}
	const ticketCandidate = query.ticket || urlTicket || extractProtocolTicket(request);
	return verifySpeechWsTicket(ticketCandidate);
}

export async function registerSpeechLiveRoutes(
	app: FastifyInstance,
): Promise<void> {
	// Register fastify-websocket if not already registered
	if (!app.hasRequestDecorator("ws")) {
		await app.register(fastifyWebsocket, {
			options: {
				maxPayload: 1024 * 1024, // 1MB buffer limit for audio frames
			},
		});
	}

	// Status & Diagnostic endpoint
	app.get(
		"/api/v1/speech/live/status",
		{ config: { tenantTxSelfManaged: true } },
		async (request: FastifyRequest, reply: FastifyReply) => {
			const context = await requireClinicalReadContext(
				request,
				reply,
				"speech live status",
			);
			if (!context) return;

			const proxyStatus = getNetworkShieldStatus();
			const keyPool = getProviderKeyPoolSummary("google_speech");
			const activeTerms = getDentalSpeechBiasingTerms("universal");

			return reply.status(200).send({
				ok: true,
				provider: "gemini_transcribe_live",
				endpoint:
					process.env.GEMINI_BIDI_WS_ENDPOINT ||
					"wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent",
				model:
					process.env.GEMINI_BIDI_MODEL ||
					"models/gemini-3.5-transcribe-live",
				proxy: {
					enabled: proxyStatus.enabled,
					url: proxyStatus.proxyUrlMasked,
					protocol: proxyStatus.protocol,
					host: proxyStatus.host,
					port: proxyStatus.port,
					hasAuth: proxyStatus.hasAuth,
				},
				keyPool: {
					configuredKeyCount: keyPool.configuredKeyCount,
					availableKeyCount: keyPool.availableKeyCount,
					coolingDownKeyCount: keyPool.coolingDownKeyCount,
					rotationEnabled: keyPool.rotationEnabled,
				},
				dentalVocabularyTermsCount: Array.from(
					new Set([...MANDATORY_DENTAL_BIDI_TERMS, ...activeTerms]),
				).length,
			});
		},
	);

	const issueWsTicketHandler = async (request: FastifyRequest, reply: FastifyReply) => {
		const organizationId = await requireResolvedOrganizationId(
			request,
			reply,
			"speech live ws ticket",
		);
		if (!organizationId) return;

		const parsedBody = speechLiveTicketBodySchema.safeParse(request.body ?? {});
		if (!parsedBody.success) {
			return reply.status(400).send({
				ok: false,
				error: "ValidationError",
				message: "Некорректные параметры запроса токена Live Speech",
				details: parsedBody.error.format(),
			});
		}

		let secret: string;
		try {
			secret = authTokenSecret();
		} catch {
			return reply.status(503).send({
				ok: false,
				error: "AuthNotConfigured",
				message: "Секрет подписи токенов не настроен",
			});
		}

		const identity = getRequestIdentity(request);
		const ticket = signToken(
			{
				purpose: "speech_live_ws",
				organizationId,
				userId: identity.userId ?? null,
				role: identity.role ?? "staff",
			},
			secret,
			WS_TICKET_TTL_SECONDS,
		);

		return reply.status(200).send({
			ok: true,
			ticket,
			expiresInSeconds: WS_TICKET_TTL_SECONDS,
			organizationId,
		});
	};

	app.post("/api/v1/speech/live/ticket", { config: { tenantTxSelfManaged: true } }, issueWsTicketHandler);
	app.post("/api/speech/live/ticket", { config: { tenantTxSelfManaged: true } }, issueWsTicketHandler);

	// WebSocket Live Transcription Handler
	const liveWsHandler = (clientSocket: WebSocket, request: FastifyRequest) => {
			const query = (request.query || {}) as SpeechLiveQueryParams;
			const baseSpecialty = query.specialty as DentalSpecialty | undefined;
			const baseSampleRate = query.sampleRate ? Number(query.sampleRate) : 16000;
			const baseCustomTerms = query.customTerms
				? query.customTerms.split(/[,;\n]+/).map((t) => t.trim()).filter(Boolean)
				: undefined;
			const baseModel = query.model;
			const headerKeyRaw = request.headers["x-gemini-api-key"];
			const apiKey =
				typeof headerKeyRaw === "string" && headerKeyRaw.trim().length > 0
					? headerKeyRaw.trim()
					: undefined;

			let activeSession: VerifiedWsSession | null = resolveInitialWsSession(request);
			let bridge: GeminiBidiBridge | null = null;
			let authTimer: ReturnType<typeof setTimeout> | null = null;
			let closedByAuthFailure = false;

			const clearAuthTimer = () => {
				if (authTimer) {
					clearTimeout(authTimer);
					authTimer = null;
				}
			};

			const rejectUnauthorized = (reasonLog: string) => {
				if (closedByAuthFailure) return;
				closedByAuthFailure = true;
				clearAuthTimer();
				request.log.warn(
					{ route: "/api/v1/speech/live", reason: reasonLog },
					"[speechLive] Rejected unauthenticated WebSocket connection",
				);
				if (
					clientSocket.readyState === clientSocket.OPEN ||
					clientSocket.readyState === clientSocket.CONNECTING
				) {
					clientSocket.close(4001, "Unauthorized");
				}
			};

			const startBridge = (
				session: VerifiedWsSession,
				overrides?: {
					specialty?: DentalSpecialty | undefined;
					sampleRate?: number | undefined;
					customTerms?: string[] | undefined;
					model?: string | undefined;
				},
			) => {
				if (bridge) return;
				const specialty = overrides?.specialty ?? baseSpecialty;
				const sampleRate = overrides?.sampleRate ?? baseSampleRate;
				const customTerms = overrides?.customTerms ?? baseCustomTerms;
				const model = overrides?.model ?? baseModel;

				request.log.info(
					{
						orgId: session.organizationId,
						specialty,
						sampleRate,
						route: "/api/v1/speech/live",
						hasQueryKeyRejected: Boolean(query.key),
					},
					"[speechLive] Inbound client WebSocket connected to Gemini 3.5 Transcribe Live BiDi",
				);

				const activeBridge = new GeminiBidiBridge({
					specialty,
					sampleRate,
					customTerms,
					model,
					apiKey,
				});
				bridge = activeBridge;

				activeBridge.on("setup_complete", () => {
					if (clientSocket.readyState === clientSocket.OPEN) {
						clientSocket.send(
							JSON.stringify({
								type: "setup_complete",
								timestampMs: Date.now(),
							}),
						);
					}
				});

				activeBridge.on("transcript", (event: GeminiBidiTranscriptEvent) => {
					if (clientSocket.readyState === clientSocket.OPEN) {
						clientSocket.send(
							JSON.stringify({
								type: event.type, // 'interim' | 'final'
								text: event.text,
								timestampMs: event.timestampMs,
							}),
						);
					}
				});

				activeBridge.on("turn_complete", (payload: { finalText: string; timestampMs: number }) => {
					if (clientSocket.readyState === clientSocket.OPEN) {
						clientSocket.send(
							JSON.stringify({
								type: "turn_complete",
								finalText: payload.finalText,
								timestampMs: payload.timestampMs,
							}),
						);
					}
				});

				activeBridge.on(
					"reconnecting",
					(info: { attempt: number; keyFingerprint: string; reason: string }) => {
						request.log.warn(
							info,
							"[speechLive] Bridge key rotation / reconnecting in progress",
						);
						if (clientSocket.readyState === clientSocket.OPEN) {
							clientSocket.send(
								JSON.stringify({
									type: "reconnecting",
									attempt: info.attempt,
									reason: info.reason,
									timestampMs: Date.now(),
								}),
							);
						}
					},
				);

				activeBridge.on(
					"key_rotated",
					(info: { oldFingerprint?: string; newFingerprint: string }) => {
						request.log.info(info, "[speechLive] Key successfully rotated");
						if (clientSocket.readyState === clientSocket.OPEN) {
							clientSocket.send(
								JSON.stringify({
									type: "key_rotated",
									timestampMs: Date.now(),
								}),
							);
						}
					},
				);

				activeBridge.on("error", (err: Error) => {
					request.log.error(
						{ err: err.message },
						"[speechLive] Gemini BiDi Bridge error",
					);
					if (clientSocket.readyState === clientSocket.OPEN) {
						clientSocket.send(
							JSON.stringify({
								type: "error",
								message: err.message,
								timestampMs: Date.now(),
							}),
						);
					}
				});

				activeBridge.on("close", (code: number, reason: string) => {
					request.log.info(
						{ code, reason },
						"[speechLive] Gemini BiDi Bridge closed",
					);
					if (clientSocket.readyState === clientSocket.OPEN) {
						clientSocket.close(code, reason || "Bridge Closed");
					}
				});

				activeBridge.connect().catch((connectErr) => {
					request.log.error(
						{ err: connectErr.message },
						"[speechLive] Failed to initiate Gemini BiDi Bridge connection",
					);
					if (clientSocket.readyState === clientSocket.OPEN) {
						clientSocket.send(
							JSON.stringify({
								type: "error",
								message: `Connection failed: ${connectErr.message}`,
								timestampMs: Date.now(),
							}),
						);
						clientSocket.close(1011, "Bridge Connection Error");
					}
				});
			};

			if (activeSession) {
				startBridge(activeSession);
			} else {
				authTimer = setTimeout(() => {
					if (!activeSession) {
						rejectUnauthorized("first_frame_auth_timeout");
					}
				}, WS_FIRST_FRAME_AUTH_TIMEOUT_MS);
			}

			// Handle inbound messages from client socket
			clientSocket.on("message", (data: WebSocket.Data, isBinary: boolean) => {
				try {
					const treatAsBinary =
						typeof isBinary === "boolean"
							? isBinary
							: Buffer.isBuffer(data) || data instanceof ArrayBuffer;
					if (!activeSession) {
						if (treatAsBinary) {
							rejectUnauthorized("binary_frame_before_auth");
							return;
						}
						let authMsg: Record<string, unknown>;
						try {
							authMsg = JSON.parse(data.toString()) as Record<string, unknown>;
						} catch {
							rejectUnauthorized("invalid_json_before_auth");
							return;
						}

						if (authMsg.type !== "auth" && authMsg.type !== "session_init") {
							rejectUnauthorized(`unexpected_frame_before_auth:${String(authMsg.type ?? "")}`);
							return;
						}

						let verified: VerifiedWsSession | null = verifySpeechWsTicket(authMsg.ticket ?? authMsg.token);
						if (!verified && (typeof authMsg.clinicToken === "string" || typeof authMsg.staffToken === "string")) {
							const tokenIdentity = resolveIdentityFromTokens(
								typeof authMsg.clinicToken === "string" ? authMsg.clinicToken : null,
								typeof authMsg.staffToken === "string" ? authMsg.staffToken : null,
							);
							if (tokenIdentity.verified && tokenIdentity.organizationId) {
								verified = {
									organizationId: tokenIdentity.organizationId,
									userId: tokenIdentity.userId,
									role: tokenIdentity.role ?? "staff",
								};
							}
						}

						if (!verified) {
							rejectUnauthorized("invalid_first_frame_credentials");
							return;
						}

						clearAuthTimer();
						activeSession = verified;
						const initSpecialty = typeof authMsg.specialty === "string" ? (authMsg.specialty as DentalSpecialty) : undefined;
						const initSampleRate = typeof authMsg.sampleRate === "number" && authMsg.sampleRate > 0 ? authMsg.sampleRate : undefined;
						const initModel = typeof authMsg.model === "string" ? authMsg.model : undefined;
						const initCustomTerms = Array.isArray(authMsg.customTerms)
							? authMsg.customTerms.filter((t): t is string => typeof t === "string" && t.trim().length > 0)
							: undefined;

						startBridge(verified, {
							specialty: initSpecialty,
							sampleRate: initSampleRate,
							customTerms: initCustomTerms,
							model: initModel,
						});

						if (clientSocket.readyState === clientSocket.OPEN) {
							clientSocket.send(
								JSON.stringify({
									type: authMsg.type === "auth" ? "auth_ok" : "session_ready",
									organizationId: verified.organizationId,
									timestampMs: Date.now(),
								}),
							);
						}
						return;
					}

					const activeBridge = bridge;
					if (!activeBridge) return;

					if (treatAsBinary) {
						// Binary audio frame (PCM)
						activeBridge.sendAudio(data as Buffer | ArrayBuffer);
						return;
					}

					const text = data.toString();
					try {
						const json = JSON.parse(text);

						if (json.type === "auth" || json.type === "session_init") {
							return;
						}

						if (
							(json.type === "audio" || json.type === "audio_chunk") &&
							(json.data || json.audioBase64)
						) {
							// Base64 PCM audio chunk
							activeBridge.sendAudio(json.data || json.audioBase64);
							return;
						}

						if (json.type === "stop" || json.type === "turn_complete") {
							activeBridge.endAudioStream();
							return;
						}

						if (json.type === "ping") {
							if (clientSocket.readyState === clientSocket.OPEN) {
								clientSocket.send(
									JSON.stringify({
										type: "pong",
										timestampMs: Date.now(),
									}),
								);
							}
							return;
						}

						if (json.realtimeInput?.mediaChunks) {
							// Raw Gemini protocol forward
							for (const chunk of json.realtimeInput.mediaChunks) {
								if (chunk.data) {
									activeBridge.sendAudio(chunk.data);
								}
							}
							return;
						}
					} catch {
						// Non-JSON text payload: if base64 encoded audio, attempt sending
						if (/^[A-Za-z0-9+/=]+$/.test(text.trim())) {
							activeBridge.sendAudio(text.trim());
						}
					}
				} catch (msgErr: unknown) {
					request.log.warn(
						{ err: msgErr instanceof Error ? msgErr.message : String(msgErr) },
						"[speechLive] Inbound message processing error",
					);
				}
			});

			clientSocket.on("close", (code: number, reason: Buffer) => {
				clearAuthTimer();
				request.log.info(
					{ code, reason: reason.toString("utf8") },
					"[speechLive] Client WebSocket disconnected",
				);
				bridge?.close(code, reason.toString("utf8"));
			});

			clientSocket.on("error", (err: Error) => {
				clearAuthTimer();
				request.log.error(
					{ err: err.message },
					"[speechLive] Client WebSocket socket error",
				);
				bridge?.close(1011, err.message);
			});
	};

	app.get("/api/v1/speech/live", { websocket: true }, liveWsHandler);
	app.get("/api/speech/live", { websocket: true }, liveWsHandler);
}
