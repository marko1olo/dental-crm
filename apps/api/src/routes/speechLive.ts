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
} from "../services/agent/networkShield.js";
import {
	GeminiBidiBridge,
	MANDATORY_DENTAL_BIDI_TERMS,
	type GeminiBidiTranscriptEvent,
} from "../speech/geminiBidiBridge.js";
import {
	getDentalSpeechBiasingTerms,
} from "../speech/dentalPrompt.js";
import {
	getProviderKeyPoolSummary,
} from "../speech/keyPool.js";
import { getRequestIdentity } from "../security/identity.js";
import { evaluateClinicalAccess } from "../security/medicalSecrecyWarden.js";

/** Type helper for Fastify WebSocket route registration */
type WebsocketRouteRegistrar = (
	path: string,
	options: { websocket: true },
	handler: (socket: WebSocket, request: FastifyRequest) => void,
) => void;

interface SpeechLiveQueryParams {
	readonly specialty?: DentalSpecialty | undefined;
	readonly sampleRate?: string | number | undefined;
	readonly customTerms?: string | undefined;
	readonly model?: string | undefined;
	readonly key?: string | undefined;
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
		async (_request: FastifyRequest, reply: FastifyReply) => {
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

	// WebSocket Live Transcription Handler
	const wsApp = app as unknown as { get: WebsocketRouteRegistrar };

	const liveWsHandler = (clientSocket: WebSocket, request: FastifyRequest) => {
			const query = (request.query || {}) as SpeechLiveQueryParams;
			const specialty = query.specialty as DentalSpecialty | undefined;
			const sampleRate = query.sampleRate
				? Number(query.sampleRate)
				: 16000;
			const customTerms = query.customTerms
				? query.customTerms.split(/[,;\n]+/).map((t) => t.trim()).filter(Boolean)
				: undefined;
			const model = query.model;
			const apiKey = query.key;

			// Extract tenant identity if headers are available
			const identity = getRequestIdentity(request);
			if (identity.organizationId) {
				const evalAccess = evaluateClinicalAccess(identity.role);
				if (!evalAccess.hasClinicalAccess) {
					request.log.warn(
						{ role: identity.role, orgId: identity.organizationId },
						"[speechLive] Blocked non-clinical staff attempt to access live speech dictation (152-FZ / 323-FZ)",
					);
					if (clientSocket.readyState === clientSocket.OPEN) {
						clientSocket.send(
							JSON.stringify({
								type: "error",
								error: "MedicalSpeechDictationForbidden",
								permission: "speech.dictation.clinical",
								role: identity.role,
								message:
									"Доступ к живому речевому распознаванию клинического приема ограничен 152-ФЗ и 323-ФЗ ст. 13: требуются права врача.",
								timestampMs: Date.now(),
							}),
						);
					}
					clientSocket.close(4403, "Forbidden");
					return;
				}
			}

			const orgId = identity.organizationId || "anonymous";

			request.log.info(
				{ orgId, specialty, sampleRate, url: request.url },
				"[speechLive] Inbound client WebSocket connected to Gemini 3.5 Transcribe Live BiDi",
			);

			// Instantiate BiDi bridge to Google Gemini
			const bridge = new GeminiBidiBridge({
				specialty,
				sampleRate,
				customTerms,
				model,
				apiKey,
			});

			let bridgeConnected = false;

			// Bridge event listeners -> forward to client socket
			bridge.on("setup_complete", () => {
				bridgeConnected = true;
				if (clientSocket.readyState === clientSocket.OPEN) {
					clientSocket.send(
						JSON.stringify({
							type: "setup_complete",
							timestampMs: Date.now(),
						}),
					);
				}
			});

			bridge.on("transcript", (event: GeminiBidiTranscriptEvent) => {
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

			bridge.on("turn_complete", (payload: { finalText: string; timestampMs: number }) => {
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

			bridge.on(
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

			bridge.on(
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

			bridge.on("error", (err: Error) => {
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

			bridge.on("close", (code: number, reason: string) => {
				request.log.info(
					{ code, reason },
					"[speechLive] Gemini BiDi Bridge closed",
				);
				if (clientSocket.readyState === clientSocket.OPEN) {
					clientSocket.close(code, reason || "Bridge Closed");
				}
			});

			// Connect the bridge
			bridge.connect().catch((connectErr) => {
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

			// Handle inbound messages from client socket
			clientSocket.on("message", (data: WebSocket.Data, isBinary: boolean) => {
				if (isBinary || Buffer.isBuffer(data) || data instanceof ArrayBuffer) {
					// Binary audio frame (PCM)
					bridge.sendAudio(data as Buffer | ArrayBuffer);
					return;
				}

				const text = data.toString();
				try {
					const json = JSON.parse(text);

					if (
						(json.type === "audio" || json.type === "audio_chunk") &&
						(json.data || json.audioBase64)
					) {
						// Base64 PCM audio chunk
						bridge.sendAudio(json.data || json.audioBase64);
						return;
					}

					if (json.type === "stop" || json.type === "turn_complete") {
						bridge.endAudioStream();
						return;
					}

					if (json.type === "ping") {
						clientSocket.send(
							JSON.stringify({
								type: "pong",
								timestampMs: Date.now(),
							}),
						);
						return;
					}

					if (json.realtimeInput?.mediaChunks) {
						// Raw Gemini protocol forward
						for (const chunk of json.realtimeInput.mediaChunks) {
							if (chunk.data) {
								bridge.sendAudio(chunk.data);
							}
						}
						return;
					}
				} catch {
					// Non-JSON text payload: if base64 encoded audio, attempt sending
					if (/^[A-Za-z0-9+/=]+$/.test(text.trim())) {
						bridge.sendAudio(text.trim());
					}
				}
			});

			clientSocket.on("close", (code: number, reason: Buffer) => {
				request.log.info(
					{ code, reason: reason.toString("utf8") },
					"[speechLive] Client WebSocket disconnected",
				);
				bridge.close(code, reason.toString("utf8"));
			});

			clientSocket.on("error", (err: Error) => {
				request.log.error(
					{ err: err.message },
					"[speechLive] Client WebSocket socket error",
				);
				bridge.close(1011, err.message);
			});
	};

	wsApp.get("/api/v1/speech/live", { websocket: true }, liveWsHandler);
	wsApp.get("/api/speech/live", { websocket: true }, liveWsHandler);
}
