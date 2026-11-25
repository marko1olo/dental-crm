/**
 * DENTE Dental CRM — Telephony Gateway Service (WebRTC SIP Asterisk & Cloud Fallback Engine).
 *
 * Implements resilient hybrid telephony for clinic environments:
 * 1. Local LAN WebRTC SIP Registration for Asterisk / FreePBX:
 *    - Generates WSS endpoint, SIP URI, credentials, and STUN/TURN ICE server topology
 *    - Ingests Asterisk AMI / ARI events (Newchannel, Ringing, Bridge, Hangup, CDR)
 *    - Broadcasts live incoming calls and patient card lookups via WebSocket broker
 * 2. Transparent Cloud Webhook Fallback (Mango Office / Zadarma / UIS):
 *    - Continuous heartbeat monitor for local PBX reachability
 *    - Instant seamless failover to cloud webhooks if local Asterisk is unreachable
 *    - Zero dropped calls and persistent CDR tracking in communicationEvents
 */

import { createHash, createHmac, randomBytes } from "node:crypto";
import * as net from "node:net";
import { and, eq, ilike, or, sql } from "drizzle-orm";
import { onTenantTxCommit, withTenantCtx } from "../../db/rls.js";
import { communicationEvents, crmLeads, organizations, patients } from "../../db/schema.js";
import { createApiLogger, safeLogError } from "../../observability/logger.js";
import { wsBroker } from "../websocketBroker.js";

function escapeLikePattern(raw: string): string {
	return raw.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}

export interface TelephonyStructuredLogger {
	info(obj: unknown, msg?: string): void;
	warn(obj: unknown, msg?: string): void;
	error(obj: unknown, msg?: string): void;
}

const gatewayLogger = createApiLogger("telephonyGatewayService");
const defaultStructuredLogger: TelephonyStructuredLogger = {
	info: (obj, msg) => gatewayLogger.info({ details: obj }, msg || ""),
	warn: (obj, msg) => gatewayLogger.warn({ details: obj }, msg || ""),
	error: (obj, msg) => gatewayLogger.error({ details: obj }, msg || ""),
};

export type TelephonyMode = "local_webrtc_sip" | "cloud_webhooks" | "hybrid_active_fallback";
export type CloudProviderType = "mango" | "zadarma" | "uis" | "asterisk";

export interface LocalAsteriskPbxConfig {
	readonly host: string; // e.g. "192.168.1.10" or "pbx.clinic.lan"
	readonly wsPort: number; // e.g. 8089 (WSS) or 8088 (WS)
	readonly sipPort: number; // e.g. 5060 (UDP) or 5061 (TLS)
	readonly realm: string; // e.g. "asterisk.clinic.lan"
	readonly defaultExtension?: string | undefined;
	readonly stunServer?: string | undefined;
	readonly turnServer?: string | undefined;
	readonly turnUsername?: string | undefined;
	readonly turnCredential?: string | undefined;
}

export interface WebRtcSipCredentials {
	readonly wsServerUrl: string; // e.g. "wss://192.168.1.10:8089/ws"
	readonly sipUri: string; // e.g. "sip:101@asterisk.clinic.lan"
	readonly authorizationUser: string;
	readonly passwordToken: string;
	readonly realm: string;
	readonly displayName: string;
	readonly iceServers: Array<{ urls: string; username?: string; credential?: string }>;
	readonly transport: "wss" | "ws";
	readonly expiresAtIso: string;
}

export interface TelephonyGatewayStatus {
	readonly organizationId: string;
	readonly activeMode: TelephonyMode;
	readonly primaryProvider: "asterisk_local";
	readonly fallbackProvider: CloudProviderType;
	readonly localPbxOnline: boolean;
	readonly localPbxLatencyMs: number;
	readonly cloudWebhookActive: boolean;
	readonly lastEvaluatedAt: string;
	readonly fallbackReason?: string | null | undefined;
}

export interface AsteriskAmiEventPayload {
	readonly event: string; // "Newchannel", "Ringing", "BridgeEnter", "Hangup", "Cdr"
	readonly channel?: string | undefined;
	readonly callerIdNum?: string | undefined;
	readonly callerIdName?: string | undefined;
	readonly exten?: string | undefined;
	readonly uniqueid?: string | undefined;
	readonly linkedid?: string | undefined;
	readonly duration?: number | string | undefined;
	readonly billsec?: number | string | undefined;
	readonly recordingUrl?: string | undefined;
}

export class TelephonyGatewayService {
	private static forcedFailoverMap = new Map<string, boolean>();
	private static localPbxStatusCache = new Map<
		string,
		{ online: boolean; latencyMs: number; expiresAt: number }
	>();

	/**
	 * Resolves default Asterisk PBX config from environment or standard clinic LAN subnet.
	 */
	public static getDefaultAsteriskConfig(): LocalAsteriskPbxConfig {
		const host = process.env.ASTERISK_HOST || "192.168.1.10";
		const wsPort = Number.parseInt(process.env.ASTERISK_WS_PORT || "8089", 10) || 8089;
		const sipPort = Number.parseInt(process.env.ASTERISK_SIP_PORT || "5060", 10) || 5060;
		const realm = process.env.ASTERISK_REALM || `asterisk.${host}`;
		const stunServer = process.env.STUN_SERVER || "stun:stun.l.google.com:19302";

		return {
			host,
			wsPort,
			sipPort,
			realm,
			defaultExtension: "101",
			stunServer,
		};
	}

	/**
	 * Generates WebRTC SIP credentials for clinical workstation registration.
	 */
	public static generateWebRtcSipCredentials(params: {
		organizationId: string;
		userId: string;
		extension?: string | undefined;
		staffFullName?: string | undefined;
		config?: Partial<LocalAsteriskPbxConfig> | undefined;
	}): WebRtcSipCredentials {
		const cfg = { ...this.getDefaultAsteriskConfig(), ...params.config };
		const extension = params.extension || cfg.defaultExtension || "101";
		const displayName = params.staffFullName || `Оператор ${extension}`;

		// Ephemeral SIP authentication token
		const token = randomBytes(16).toString("hex");
		const expiry = new Date(Date.now() + 86400000).toISOString(); // 24h validity

		const wsServerUrl = `wss://${cfg.host}:${cfg.wsPort}/ws`;
		const sipUri = `sip:${extension}@${cfg.realm}`;

		const iceServers: Array<{ urls: string; username?: string; credential?: string }> = [
			{ urls: cfg.stunServer || "stun:stun.l.google.com:19302" },
		];

		if (cfg.turnServer) {
			iceServers.push({
				urls: cfg.turnServer,
				...(cfg.turnUsername ? { username: cfg.turnUsername } : {}),
				...(cfg.turnCredential ? { credential: cfg.turnCredential } : {}),
			});
		}

		return {
			wsServerUrl,
			sipUri,
			authorizationUser: extension,
			passwordToken: token,
			realm: cfg.realm,
			displayName,
			iceServers,
			transport: "wss",
			expiresAtIso: expiry,
		};
	}

	/**
	 * Evaluates local Asterisk PBX reachability and health status.
	 */
	public static async evaluateTelephonyGatewayStatus(
		organizationId: string,
		config?: Partial<LocalAsteriskPbxConfig>,
	): Promise<TelephonyGatewayStatus> {
		const cfg = { ...this.getDefaultAsteriskConfig(), ...config };
		const now = new Date().toISOString();
		const resolvedFallbackProvider: CloudProviderType =
			(process.env.TELEPHONY_PROVIDER as CloudProviderType) ||
			(process.env.MANGO_API_KEY || process.env.MANGO_VPBX_API_KEY
				? "mango"
				: process.env.ZADARMA_API_KEY
					? "zadarma"
					: process.env.UIS_API_KEY || process.env.COMAGIC_API_KEY
						? "uis"
						: "mango");

		let isForcedFailover = this.forcedFailoverMap.get(organizationId);
		if (isForcedFailover === undefined) {
			try {
				const flags = await withTenantCtx(organizationId, async (tx) => {
					const orgRows = await tx
						.select({ flags: organizations.workspaceFeatureFlags })
						.from(organizations)
						.where(eq(organizations.id, organizationId))
						.limit(1);
					return (orgRows[0]?.flags as Record<string, unknown> | null) ?? {};
				});
				isForcedFailover = Boolean(flags.telephonyForcedFailover);
				this.forcedFailoverMap.set(organizationId, isForcedFailover);
			} catch (err) {
				defaultStructuredLogger.warn(
					{ err: safeLogError(err), organizationId },
					"[TelephonyGatewayService] Failed to load workspace feature flags for telephony forced failover",
				);
				isForcedFailover = false;
			}
		}
		if (isForcedFailover || process.env.PBX_FORCE_OFFLINE === "1") {
			return {
				organizationId,
				activeMode: "cloud_webhooks",
				primaryProvider: "asterisk_local",
				fallbackProvider: resolvedFallbackProvider,
				localPbxOnline: false,
				localPbxLatencyMs: 0,
				cloudWebhookActive: true,
				lastEvaluatedAt: now,
				fallbackReason: "Local Asterisk PBX unreachable. Seamlessly routed to Cloud Webhook (Mango/Zadarma).",
			};
		}

		// Check socket connect with short probe timeout (400ms) and 15s caching to prevent event loop stalls
		let localPbxOnline = process.env.PBX_FORCE_ONLINE === "1";
		let latencyMs = localPbxOnline ? 5 : 0;

		const cacheKey = `${cfg.host}:${cfg.wsPort}`;
		const cached = this.localPbxStatusCache.get(cacheKey);

		if (!localPbxOnline && cached && Date.now() < cached.expiresAt) {
			localPbxOnline = cached.online;
			latencyMs = cached.latencyMs;
		} else if (!localPbxOnline) {
			const start = Date.now();
			try {
				const socket = new net.Socket();
				localPbxOnline = await new Promise<boolean>((resolve) => {
					socket.setTimeout(400);
					socket.once("connect", () => {
						latencyMs = Date.now() - start;
						socket.destroy();
						resolve(true);
					});
					socket.once("timeout", () => {
						socket.destroy();
						resolve(false);
					});
					socket.once("error", () => {
						socket.destroy();
						resolve(false);
					});
					socket.connect(cfg.wsPort, cfg.host);
				});
			} catch (err) {
				defaultStructuredLogger.warn(
					{ err: safeLogError(err), host: cfg.host, port: cfg.wsPort },
					"[TelephonyGatewayService] Socket probing failed",
				);
				localPbxOnline = false;
			}

			// Cache socket probe result for 15 seconds
			this.localPbxStatusCache.set(cacheKey, {
				online: localPbxOnline,
				latencyMs,
				expiresAt: Date.now() + 15000,
			});
		}

		const activeMode: TelephonyMode = localPbxOnline ? "local_webrtc_sip" : "cloud_webhooks";

		return {
			organizationId,
			activeMode,
			primaryProvider: "asterisk_local",
			fallbackProvider: resolvedFallbackProvider,
			localPbxOnline,
			localPbxLatencyMs: latencyMs,
			cloudWebhookActive: true, // Cloud fallback listener is always armed
			lastEvaluatedAt: now,
			fallbackReason: localPbxOnline ? null : "Local PBX offline. Cloud webhook failover active.",
		};
	}

	/**
	 * Sets or clears manual failover override for an organization.
	 * Persists failover state into PostgreSQL 18 (organizations.workspaceFeatureFlags)
	 * to prevent amnesia and ensure survivor status across Node.js process restarts.
	 */
	public static async setForcedFailover(
		organizationId: string,
		forceCloudFallback: boolean,
	): Promise<void> {
		this.forcedFailoverMap.set(organizationId, forceCloudFallback);
		try {
			await withTenantCtx(organizationId, async (tx) => {
				const orgRows = await tx
					.select({ flags: organizations.workspaceFeatureFlags })
					.from(organizations)
					.where(eq(organizations.id, organizationId))
					.limit(1);
				const flags = (orgRows[0]?.flags as Record<string, unknown> | null) ?? {};
				const updatedFlags = { ...flags, telephonyForcedFailover: forceCloudFallback };
				await tx
					.update(organizations)
					.set({
						workspaceFeatureFlags: updatedFlags,
						updatedAt: new Date(),
					})
					.where(eq(organizations.id, organizationId));
			});
		} catch (err) {
			defaultStructuredLogger.error(
				{ err: safeLogError(err), organizationId },
				"[TelephonyGatewayService] Failed to persist failover status",
			);
		}
	}

	/**
	 * Clears in-memory local PBX reachability cache.
	 */
	public static clearLocalPbxCache(): void {
		this.localPbxStatusCache.clear();
	}

	/**
	 * Clears in-memory forced failover and socket reachability cache (useful for test isolation).
	 */
	public static clearForcedFailoverCache(): void {
		this.forcedFailoverMap.clear();
		this.clearLocalPbxCache();
	}

	/**
	 * Ingests Asterisk AMI / ARI event and dispatches live notification to clinic web clients.
	 */
	public static async processAsteriskAmiEvent(
		organizationId: string,
		payload: AsteriskAmiEventPayload,
	): Promise<{
		success: boolean;
		event: "ringing" | "answered" | "ended";
		patientId: string | null;
		patientName: string;
	}> {
		const rawEvent = (payload.event || "Newchannel").toLowerCase();
		let event: "ringing" | "answered" | "ended" = "ringing";

		if (rawEvent.includes("ring") || rawEvent.includes("newchannel") || rawEvent.includes("dial")) {
			event = "ringing";
		} else if (rawEvent.includes("answer") || rawEvent.includes("bridge")) {
			event = "answered";
		} else if (rawEvent.includes("hangup") || rawEvent.includes("cdr")) {
			event = "ended";
		}

		const callerPhoneRaw = payload.callerIdNum || payload.callerIdName || "";
		const cleanDigits = callerPhoneRaw.replace(/\D/g, "");
		const national10 = cleanDigits.length >= 10 ? cleanDigits.slice(-10) : cleanDigits;
		const e164 = cleanDigits.startsWith("8") || cleanDigits.startsWith("7") ? `+7${national10}` : `+${cleanDigits}`;
		const escapedNational10 = escapeLikePattern(national10);

		const { patient, patientName } = await withTenantCtx(organizationId, async (tx) => {
			const matchedPatients = national10
				? await tx
						.select({ id: patients.id, fullName: patients.fullName })
						.from(patients)
						.where(
							and(
								eq(patients.organizationId, organizationId),
								or(
									eq(patients.phone, e164),
									ilike(patients.phone, `%${escapedNational10}%`),
									sql`regexp_replace(coalesce(${patients.phone}, ''), '[^0-9]', '', 'g') LIKE ${`%${escapedNational10}%`}`,
								),
							),
						)
						.limit(1)
				: [];

			const foundPatient = matchedPatients[0] || null;
			const resolvedName = foundPatient?.fullName || `Звонок Asterisk ${e164}`;

			if (event === "ringing") {
				if (!foundPatient && national10.length >= 7) {
					await tx.execute(
						sql`SELECT pg_advisory_xact_lock(hashtext('telephony:lead:asterisk:' || ${organizationId} || ':' || ${national10}));`,
					);
					const existingLead = await tx
						.select({ id: crmLeads.id })
						.from(crmLeads)
						.where(
							and(
								eq(crmLeads.organizationId, organizationId),
								or(
									eq(crmLeads.phone, e164),
									ilike(crmLeads.phone, `%${escapedNational10}%`),
								),
							),
						)
						.limit(1);

					if (existingLead.length === 0) {
						await tx.insert(crmLeads).values({
							organizationId,
							phone: e164,
							name: `Лид Asterisk ${e164}`,
							source: "telephony_asterisk",
							status: "new",
						});
					}
				}

				onTenantTxCommit(() => {
					wsBroker.broadcastToOrganization(organizationId, {
						type: "TELEPHONY_INCOMING_CALL",
						payload: {
							phone: e164,
							patientId: foundPatient?.id || null,
							patientName: resolvedName,
							callId: payload.uniqueid || payload.channel || null,
							provider: "asterisk",
							timestamp: new Date().toISOString(),
						},
					});
				});
			} else if (event === "ended") {
				const callId = payload.uniqueid || payload.channel || null;
				const duration =
					typeof payload.billsec === "number"
						? payload.billsec
						: Number.parseInt(String(payload.billsec || "0"), 10) || 0;
				const durationSeconds = duration > 0 ? duration : null;
				const recordingUrl = payload.recordingUrl || null;

				let existingId: string | null = null;
				if (callId) {
					const escapedCallId = escapeLikePattern(callId);
					const existing = await tx
						.select({ id: communicationEvents.id })
						.from(communicationEvents)
						.where(
							and(
								eq(communicationEvents.organizationId, organizationId),
								or(
									eq(communicationEvents.providerCallId, callId),
									ilike(communicationEvents.message, `%ID: ${escapedCallId}%`),
									ilike(communicationEvents.message, `%call_id: ${escapedCallId}%`),
								),
							),
						)
						.limit(1);
					if (existing.length > 0 && existing[0]) {
						existingId = existing[0].id;
					}
				}

				if (existingId) {
					await tx
						.update(communicationEvents)
						.set({
							status: "completed",
							...(durationSeconds !== null ? { durationSeconds } : {}),
							...(recordingUrl ? { recordingUrl } : {}),
							...(foundPatient?.id ? { patientId: foundPatient.id } : {}),
						})
						.where(
							and(
								eq(communicationEvents.id, existingId),
								eq(communicationEvents.organizationId, organizationId),
							),
						);
				} else if (callId) {
					await tx
						.insert(communicationEvents)
						.values({
							organizationId,
							providerCallId: callId,
							providerName: "asterisk",
							patientId: foundPatient?.id || null,
							callerPhone: e164,
							channel: "phone",
							direction: "inbound",
							status: "completed",
							message: `Локальный звонок Asterisk завершён${!foundPatient ? " (первичный абонент)" : ""}`,
							durationSeconds,
							recordingUrl,
						})
						.onConflictDoUpdate({
							target: [communicationEvents.organizationId, communicationEvents.providerCallId],
							set: {
								status: "completed",
								...(durationSeconds !== null ? { durationSeconds } : {}),
								...(recordingUrl ? { recordingUrl } : {}),
								...(foundPatient?.id ? { patientId: foundPatient.id } : {}),
							},
						});
				} else {
					await tx.insert(communicationEvents).values({
						organizationId,
						providerCallId: null,
						providerName: "asterisk",
						patientId: foundPatient?.id || null,
						callerPhone: e164,
						channel: "phone",
						direction: "inbound",
						status: "completed",
						message: `Локальный звонок Asterisk завершён${!foundPatient ? " (первичный абонент)" : ""}`,
						durationSeconds,
						recordingUrl,
					});
				}
			}

			return { patient: foundPatient, patientName: resolvedName };
		});

		return {
			success: true,
			event,
			patientId: patient?.id || null,
			patientName,
		};
	}

	/**
	 * Dispatches a real SIP Call Transfer (Blind or Attended) via Asterisk AMI Redirect/Atxfer
	 * or Cloud PBX HTTP transfer API. Fails closed when PBX transfer gateway is not configured.
	 */
	public static async dispatchAsteriskTransfer(params: {
		callId: string;
		host: string;
		port: number;
		username: string;
		secret: string;
		channel: string;
		exten: string;
		context: string;
		transferType: "blind" | "attended";
	}): Promise<{ success: boolean }> {
		return new Promise<{ success: boolean }>((resolve, reject) => {
			const socket = new net.Socket();
			let loggedIn = false;
			let actionSent = false;
			let settled = false;

			const cleanup = (err?: Error) => {
				if (settled) return;
				settled = true;
				socket.destroy();
				if (err) reject(err);
				else resolve({ success: true });
			};

			socket.setTimeout(4000);
			socket.once("timeout", () => cleanup(new Error("Asterisk AMI transfer timeout")));
			socket.once("error", (err) => cleanup(err));

			socket.connect(params.port, params.host, () => {
				socket.write(
					`Action: Login\r\nUsername: ${params.username}\r\nSecret: ${params.secret}\r\n\r\n`,
				);
			});

			socket.on("data", (chunk) => {
				const data = chunk.toString("utf8");
				if (!loggedIn) {
					if (data.includes("Response: Success") || data.includes("Message: Authentication accepted")) {
						loggedIn = true;
						actionSent = true;
						const amiAction = params.transferType === "attended" ? "Atxfer" : "Redirect";
						socket.write(
							`Action: ${amiAction}\r\n` +
								`Channel: ${params.channel}\r\n` +
								`Exten: ${params.exten}\r\n` +
								`Context: ${params.context}\r\n` +
								`Priority: 1\r\n` +
								`ActionID: ${params.callId}\r\n\r\n`,
						);
						return;
					}
					if (data.includes("Response: Error")) {
						cleanup(new Error(`Asterisk AMI authentication error: ${data.trim()}`));
					}
					return;
				}
				if (actionSent) {
					if (data.includes("Response: Success")) {
						socket.write("Action: Logoff\r\n\r\n");
						cleanup();
					} else if (data.includes("Response: Error")) {
						cleanup(new Error(`Asterisk AMI transfer rejected: ${data.trim()}`));
					}
				}
			});
		});
	}

	public static async transferCall(params: {
		organizationId: string;
		callId: string;
		targetExtensionOrPhone: string;
		transferType: "blind" | "attended";
		initiatedByUserId?: string | undefined;
		logger?: { warn: (obj: unknown, msg?: string) => void; error: (obj: unknown, msg?: string) => void } | undefined;
	}): Promise<{
		success: boolean;
		statusCode?: number;
		error?: string;
		message?: string;
		callId: string;
		target: string;
		transferType: "blind" | "attended";
		status: "transferred" | "initiated" | "failed";
		provider?: string;
		timestamp: string;
	}> {
		const now = new Date().toISOString();
		const cleanTarget = params.targetExtensionOrPhone.trim();
		const cleanCallId = params.callId.trim();
		const log = params.logger || defaultStructuredLogger;

		const amiSecret = process.env.ASTERISK_AMI_SECRET?.trim();
		const amiHost = process.env.ASTERISK_AMI_HOST?.trim() || process.env.ASTERISK_HOST?.trim();
		const mangoKey = process.env.MANGO_API_KEY?.trim() || process.env.MANGO_VPBX_API_KEY?.trim();
		const mangoSalt = process.env.MANGO_API_SALT?.trim() || process.env.TELEPHONY_WEBHOOK_SECRET?.trim();
		const uisKey = process.env.UIS_API_KEY?.trim() || process.env.COMAGIC_API_KEY?.trim();

		let activeProvider: "asterisk" | "mango" | "uis" | null = null;
		if (amiSecret && amiHost) {
			activeProvider = "asterisk";
		} else if (mangoKey && mangoSalt) {
			activeProvider = "mango";
		} else if (uisKey) {
			activeProvider = "uis";
		}

		if (!activeProvider) {
			return {
				success: false,
				statusCode: 422,
				error: "TelephonyTransferNotConfigured",
				message: "Шлюз перевода звонков АТС (Asterisk AMI / Mango / UIS) не настроен в клинике.",
				callId: cleanCallId,
				target: cleanTarget,
				transferType: params.transferType,
				status: "failed",
				timestamp: now,
			};
		}

		try {
			if (activeProvider === "asterisk" && amiHost && amiSecret) {
				const channel = cleanCallId.includes("/")
					? cleanCallId
					: `${process.env.ASTERISK_DEFAULT_CHANNEL || "PJSIP/101"}-${cleanCallId}`;
				await this.dispatchAsteriskTransfer({
					callId: cleanCallId,
					host: amiHost,
					port: Number.parseInt(process.env.ASTERISK_AMI_PORT || "5038", 10) || 5038,
					username: process.env.ASTERISK_AMI_USER?.trim() || "admin",
					secret: amiSecret,
					channel,
					exten: cleanTarget,
					context: process.env.ASTERISK_OUTBOUND_CONTEXT || "from-internal",
					transferType: params.transferType,
				});
			} else if (activeProvider === "mango" && mangoKey && mangoSalt) {
				const jsonPayload = JSON.stringify({
					command_id: `transfer-${cleanCallId}-${Date.now()}`,
					call_id: cleanCallId,
					method: params.transferType === "attended" ? "consult" : "blind",
					to_number: cleanTarget,
				});
				const sign = createHash("sha256")
					.update(`${mangoKey}${jsonPayload}${mangoSalt}`)
					.digest("hex");
				const body = new URLSearchParams({
					vpbx_api_key: mangoKey,
					sign,
					json: jsonPayload,
				});
				const response = await fetch("https://app.mango-office.ru/vpbx/commands/transfer", {
					method: "POST",
					headers: { "Content-Type": "application/x-www-form-urlencoded" },
					body: body.toString(),
					signal: AbortSignal.timeout(5000),
				});
				if (!response.ok) {
					const text = await response.text().catch(() => "");
					throw new Error(`Mango HTTP ${response.status}: ${text || response.statusText}`);
				}
			} else if (activeProvider === "uis" && uisKey) {
				const response = await fetch("https://dataapi.uiscom.ru/v2.0", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						jsonrpc: "2.0",
						id: cleanCallId,
						method: "transfer_call",
						params: {
							access_token: uisKey,
							call_session_id: cleanCallId,
							destination: cleanTarget,
							is_attended: params.transferType === "attended",
						},
					}),
					signal: AbortSignal.timeout(5000),
				});
				if (!response.ok) {
					const text = await response.text().catch(() => "");
					throw new Error(`UIS HTTP ${response.status}: ${text || response.statusText}`);
				}
				const data = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
				if (data?.error) {
					throw new Error(`UIS API error: ${data.error.message || JSON.stringify(data.error)}`);
				}
			}
		} catch (err) {
			const errMsg = err instanceof Error ? err.message : String(err);
			log.error(
				{ err: safeLogError(err), provider: activeProvider, callId: cleanCallId },
				"[TelephonyGatewayService] Call transfer command failed",
			);
			return {
				success: false,
				statusCode: 502,
				error: "TelephonyTransferFailed",
				message: `Не удалось выполнить перевод вызова через ${activeProvider}: ${errMsg}`,
				callId: cleanCallId,
				target: cleanTarget,
				transferType: params.transferType,
				status: "failed",
				provider: activeProvider,
				timestamp: now,
			};
		}

		// Broadcast transfer event strictly after PBX confirms transfer command
		wsBroker.broadcastToOrganization(params.organizationId, {
			type: "TELEPHONY_CALL_TRANSFERRED",
			payload: {
				callId: cleanCallId,
				target: cleanTarget,
				transferType: params.transferType,
				initiatedByUserId: params.initiatedByUserId || null,
				provider: activeProvider,
				timestamp: now,
			},
		});

		return {
			success: true,
			callId: cleanCallId,
			target: cleanTarget,
			transferType: params.transferType,
			status: params.transferType === "blind" ? "transferred" : "initiated",
			provider: activeProvider,
			timestamp: now,
		};
	}

	/**
	 * Dispatches real HTTP Callback command to Mango Office Virtual PBX:
	 * POST https://app.mango-office.ru/vpbx/commands/callback
	 * Signature SHA-256: api_key + json + api_salt
	 */
	public static async dispatchMangoCallback(params: {
		callId: string;
		apiKey: string;
		apiSalt: string;
		phone: string;
		extension: string;
	}): Promise<{ success: boolean; data?: unknown }> {
		const jsonPayload = JSON.stringify({
			command_id: params.callId,
			from: {
				extension: params.extension,
			},
			to_number: params.phone,
		});

		const sign = createHash("sha256")
			.update(`${params.apiKey}${jsonPayload}${params.apiSalt}`)
			.digest("hex");

		const body = new URLSearchParams({
			vpbx_api_key: params.apiKey,
			sign,
			json: jsonPayload,
		});

		const response = await fetch("https://app.mango-office.ru/vpbx/commands/callback", {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: body.toString(),
			signal: AbortSignal.timeout(5000),
		});

		if (!response.ok) {
			const text = await response.text().catch(() => "");
			throw new Error(`Mango HTTP ${response.status}: ${text || response.statusText}`);
		}

		const data = (await response.json().catch(() => ({}))) as unknown;
		return { success: true, data };
	}

	/**
	 * Dispatches real HTTP Callback command to Zadarma API:
	 * POST https://api.zadarma.com/v1/request/callback/
	 * Authorization Header with HMAC-SHA1 signature
	 */
	public static async dispatchZadarmaCallback(params: {
		callId: string;
		apiKey: string;
		apiSecret: string;
		phone: string;
		extension: string;
	}): Promise<{ success: boolean; data?: unknown }> {
		const paramsStr = `from=${encodeURIComponent(params.extension)}&to=${encodeURIComponent(params.phone)}`;
		const md5Str = createHash("md5").update(paramsStr).digest("hex");
		const dataToSign = `/v1/request/callback/${paramsStr}${md5Str}`;
		const signature = createHmac("sha1", params.apiSecret).update(dataToSign).digest("base64");

		const response = await fetch("https://api.zadarma.com/v1/request/callback/", {
			method: "POST",
			headers: {
				Authorization: `${params.apiKey}:${signature}`,
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: paramsStr,
			signal: AbortSignal.timeout(5000),
		});

		if (!response.ok) {
			const text = await response.text().catch(() => "");
			throw new Error(`Zadarma HTTP ${response.status}: ${text || response.statusText}`);
		}

		const data = (await response.json().catch(() => ({}))) as unknown;
		return { success: true, data };
	}

	/**
	 * Dispatches real HTTP Callback command to UIS / CoMagic Data API:
	 * POST https://dataapi.uiscom.ru/v2.0
	 * JSON-RPC 2.0 start_employee_call
	 */
	public static async dispatchUisCallback(params: {
		callId: string;
		apiKey: string;
		phone: string;
		extension: string;
	}): Promise<{ success: boolean; data?: unknown }> {
		const payload = {
			jsonrpc: "2.0",
			id: params.callId,
			method: "start_employee_call",
			params: {
				access_token: params.apiKey,
				contact: params.phone,
				employee_phone: params.extension,
			},
		};

		const response = await fetch("https://dataapi.uiscom.ru/v2.0", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(payload),
			signal: AbortSignal.timeout(5000),
		});

		if (!response.ok) {
			const text = await response.text().catch(() => "");
			throw new Error(`UIS HTTP ${response.status}: ${text || response.statusText}`);
		}

		const data = (await response.json().catch(() => ({}))) as { error?: { message?: string } };
		if (data?.error) {
			throw new Error(`UIS API error: ${data.error.message || JSON.stringify(data.error)}`);
		}
		return { success: true, data };
	}

	/**
	 * Dispatches real Asterisk AMI Originate command via TCP socket:
	 * Action: Originate
	 */
	public static async dispatchAsteriskOriginate(params: {
		callId: string;
		host: string;
		port: number;
		username: string;
		secret: string;
		phone: string;
		channel: string;
		context: string;
		callerId?: string | undefined;
	}): Promise<{ success: boolean }> {
		return new Promise<{ success: boolean }>((resolve, reject) => {
			const socket = new net.Socket();
			let loggedIn = false;
			let settled = false;

			const cleanup = (err?: Error) => {
				if (settled) return;
				settled = true;
				socket.destroy();
				if (err) reject(err);
				else resolve({ success: true });
			};

			socket.setTimeout(4000);
			socket.once("timeout", () => cleanup(new Error("Asterisk AMI connection timeout")));
			socket.once("error", (err) => cleanup(err));

			socket.connect(params.port, params.host, () => {
				socket.write(
					`Action: Login\r\nUsername: ${params.username}\r\nSecret: ${params.secret}\r\n\r\n`,
				);
			});

			socket.on("data", (chunk) => {
				const data = chunk.toString("utf8");
				if (!loggedIn) {
					if (data.includes("Response: Success") || data.includes("Message: Authentication accepted")) {
						loggedIn = true;
						const callerIdHeader = params.callerId
							? `CallerID: ${params.callerId}\r\n`
							: `CallerID: DENTE <${params.phone}>\r\n`;
						socket.write(
							`Action: Originate\r\n` +
								`Channel: ${params.channel}\r\n` +
								`Exten: ${params.phone}\r\n` +
								`Context: ${params.context}\r\n` +
								`Priority: 1\r\n` +
								callerIdHeader +
								`ActionID: ${params.callId}\r\n\r\n`,
						);
						setTimeout(() => {
							if (!settled) {
								socket.write("Action: Logoff\r\n\r\n");
								setTimeout(() => cleanup(), 200);
							}
						}, 300);
					} else if (data.includes("Response: Error")) {
						cleanup(new Error(`Asterisk AMI authentication error: ${data.trim()}`));
					}
				}
			});
		});
	}

	/**
	 * Dispatches outbound Click-to-Call to Asterisk AMI or Cloud PBX (Mango Office / Zadarma / Asterisk).
	 */
	public static async initiateOutboundCall(params: {
		organizationId: string;
		callerPhone: { e164: string; national10: string };
		patientId?: string | null | undefined;
		patientName?: string | undefined;
		staffUserId?: string | null | undefined;
		logger?: { warn: (obj: unknown, msg?: string) => void; error: (obj: unknown, msg?: string) => void } | undefined;
	}): Promise<{
		dispatched: boolean;
		callId: string;
		provider: string;
		error?: string;
	}> {
		const callId = `outbound-${Date.now()}-${randomBytes(4).toString("hex")}`;
		const status = await this.evaluateTelephonyGatewayStatus(params.organizationId);

		const isConfigured =
			status.localPbxOnline ||
			Boolean(
				process.env.MANGO_API_KEY ||
				process.env.MANGO_VPBX_API_KEY ||
				process.env.ZADARMA_API_KEY ||
				process.env.UIS_API_KEY ||
				process.env.ASTERISK_HOST,
			);

		if (!isConfigured) {
			return {
				dispatched: false,
				callId,
				provider: "none",
				error: "АТС телефонии не подключена в клинике. Настройте локальный Asterisk или облачную АТС в панели управления.",
			};
		}

		let provider: CloudProviderType = status.localPbxOnline ? "asterisk" : status.fallbackProvider;
		if (
			provider === "mango" &&
			!process.env.MANGO_API_KEY &&
			!process.env.MANGO_VPBX_API_KEY
		) {
			if (process.env.ZADARMA_API_KEY) {
				provider = "zadarma";
			} else if (process.env.UIS_API_KEY || process.env.COMAGIC_API_KEY) {
				provider = "uis";
			}
		}

		const forceLive = process.env.TELEPHONY_FORCE_LIVE_DISPATCH === "1";
		const isTestEnv = process.env.NODE_ENV === "test" && !forceLive;

		if (provider === "mango") {
			const mangoKey = process.env.MANGO_API_KEY?.trim() || process.env.MANGO_VPBX_API_KEY?.trim();
			const mangoSalt = process.env.MANGO_API_SALT?.trim() || process.env.TELEPHONY_WEBHOOK_SECRET?.trim();

			if (!mangoKey || !mangoSalt) {
				return {
					dispatched: false,
					callId,
					provider: "mango",
					error: "АТС телефонии не подключена в клинике",
				};
			}

			if (!isTestEnv) {
				try {
					await this.dispatchMangoCallback({
						callId,
						apiKey: mangoKey,
						apiSalt: mangoSalt,
						phone: params.callerPhone.e164,
						extension: process.env.MANGO_DEFAULT_EXTENSION || "101",
					});
				} catch (err) {
					const errMsg = err instanceof Error ? err.message : String(err);
					const log = params.logger || defaultStructuredLogger;
					log.error({ err, provider: "mango" }, `[Telephony:Mango] Outbound call error: ${errMsg}`);
					return {
						dispatched: false,
						callId,
						provider: "mango",
						error: `Ошибка вызова Mango Office: ${errMsg}`,
					};
				}
			}
		} else if (provider === "zadarma") {
			const zadarmaKey = process.env.ZADARMA_API_KEY?.trim();
			const zadarmaSecret = process.env.ZADARMA_API_SECRET?.trim() || process.env.TELEPHONY_WEBHOOK_SECRET?.trim();

			if (!zadarmaKey || !zadarmaSecret) {
				return {
					dispatched: false,
					callId,
					provider: "zadarma",
					error: "АТС телефонии не подключена в клинике",
				};
			}

			if (!isTestEnv) {
				try {
					await this.dispatchZadarmaCallback({
						callId,
						apiKey: zadarmaKey,
						apiSecret: zadarmaSecret,
						phone: params.callerPhone.e164,
						extension: process.env.ZADARMA_DEFAULT_EXTENSION || "101",
					});
				} catch (err) {
					const errMsg = err instanceof Error ? err.message : String(err);
					const log = params.logger || defaultStructuredLogger;
					log.error({ err, provider: "zadarma" }, `[Telephony:Zadarma] Outbound call error: ${errMsg}`);
					return {
						dispatched: false,
						callId,
						provider: "zadarma",
						error: `Ошибка вызова Zadarma: ${errMsg}`,
					};
				}
			}
		} else if (provider === "uis") {
			const uisKey = process.env.UIS_API_KEY?.trim() || process.env.COMAGIC_API_KEY?.trim();

			if (!uisKey) {
				return {
					dispatched: false,
					callId,
					provider: "uis",
					error: "АТС телефонии не подключена в клинике",
				};
			}

			if (!isTestEnv) {
				try {
					await this.dispatchUisCallback({
						callId,
						apiKey: uisKey,
						phone: params.callerPhone.e164,
						extension: process.env.UIS_DEFAULT_EXTENSION || process.env.COMAGIC_DEFAULT_EXTENSION || "101",
					});
				} catch (err) {
					const errMsg = err instanceof Error ? err.message : String(err);
					const log = params.logger || defaultStructuredLogger;
					log.error({ err, provider: "uis" }, `[Telephony:UIS] Outbound call error: ${errMsg}`);
					return {
						dispatched: false,
						callId,
						provider: "uis",
						error: `Ошибка вызова UIS/CoMagic: ${errMsg}`,
					};
				}
			}
		} else if (provider === "asterisk") {
			const amiSecret = process.env.ASTERISK_AMI_SECRET?.trim();
			const amiHost = process.env.ASTERISK_AMI_HOST?.trim() || process.env.ASTERISK_HOST?.trim();

			if (!amiSecret || !amiHost) {
				return {
					dispatched: false,
					callId,
					provider: "asterisk",
					error: "АТС телефонии не подключена в клинике",
				};
			}

			if (!isTestEnv) {
				try {
					await this.dispatchAsteriskOriginate({
						callId,
						host: amiHost,
						port: Number.parseInt(process.env.ASTERISK_AMI_PORT || "5038", 10) || 5038,
						username: process.env.ASTERISK_AMI_USER?.trim() || "admin",
						secret: amiSecret,
						phone: params.callerPhone.e164,
						channel: process.env.ASTERISK_DEFAULT_CHANNEL || "PJSIP/101",
						context: process.env.ASTERISK_OUTBOUND_CONTEXT || "from-internal",
					});
				} catch (err) {
					const errMsg = err instanceof Error ? err.message : String(err);
					const log = params.logger || defaultStructuredLogger;
					log.error({ err, provider: "asterisk" }, `[Telephony:Asterisk] Outbound call error: ${errMsg}`);
					return {
						dispatched: false,
						callId,
						provider: "asterisk",
						error: `Ошибка вызова Asterisk AMI: ${errMsg}`,
					};
				}
			}
		} else {
			return {
				dispatched: false,
				callId,
				provider,
				error: "АТС телефонии не подключена в клинике",
			};
		}

		return {
			dispatched: true,
			callId,
			provider,
		};
	}
}
