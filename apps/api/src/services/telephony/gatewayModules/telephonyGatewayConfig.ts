import { randomBytes } from "node:crypto";
import * as net from "node:net";
import { eq } from "drizzle-orm";
import { withTenantCtx } from "../../../db/rls.js";
import { organizations } from "../../../db/schema.js";
import { BoundedTtlMap } from "../../../lib/boundedTtlMap.js";
import { createApiLogger, safeLogError } from "../../../observability/logger.js";

export interface TelephonyStructuredLogger {
	info(obj: unknown, msg?: string): void;
	warn(obj: unknown, msg?: string): void;
	error(obj: unknown, msg?: string): void;
}

const gatewayLogger = createApiLogger("telephonyGatewayService");
export const defaultStructuredLogger: TelephonyStructuredLogger = {
	info: (obj, msg) => gatewayLogger.info({ details: obj }, msg || ""),
	warn: (obj, msg) => gatewayLogger.warn({ details: obj }, msg || ""),
	error: (obj, msg) => gatewayLogger.error({ details: obj }, msg || ""),
};

export type TelephonyMode =
	| "local_webrtc_sip"
	| "cloud_webhooks"
	| "hybrid_active_fallback";
export type CloudProviderType = "mango" | "zadarma" | "uis" | "asterisk";

export interface LocalAsteriskPbxConfig {
	readonly host: string;
	readonly wsPort: number;
	readonly sipPort: number;
	readonly realm: string;
	readonly defaultExtension?: string | undefined;
	readonly stunServer?: string | undefined;
	readonly turnServer?: string | undefined;
	readonly turnUsername?: string | undefined;
	readonly turnCredential?: string | undefined;
}

export interface WebRtcSipCredentials {
	readonly wsServerUrl: string;
	readonly sipUri: string;
	readonly authorizationUser: string;
	readonly passwordToken: string;
	readonly realm: string;
	readonly displayName: string;
	readonly iceServers: Array<{
		urls: string;
		username?: string;
		credential?: string;
	}>;
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
	readonly event: string;
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

const forcedFailoverMap = new BoundedTtlMap<string, boolean>({
	maxEntries: 2000,
	ttlMs: 60 * 60_000,
});
const localPbxStatusCache = new BoundedTtlMap<
	string,
	{ online: boolean; latencyMs: number; expiresAt: number }
>({
	maxEntries: 2000,
	ttlMs: 60_000,
});

export function getDefaultAsteriskConfig(): LocalAsteriskPbxConfig {
	const host = process.env.ASTERISK_HOST || "192.168.1.10";
	const wsPort =
		Number.parseInt(process.env.ASTERISK_WS_PORT || "8089", 10) || 8089;
	const sipPort =
		Number.parseInt(process.env.ASTERISK_SIP_PORT || "5060", 10) || 5060;
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

export function generateWebRtcSipCredentials(params: {
	organizationId: string;
	userId: string;
	extension?: string | undefined;
	staffFullName?: string | undefined;
	config?: Partial<LocalAsteriskPbxConfig> | undefined;
}): WebRtcSipCredentials {
	const cfg = { ...getDefaultAsteriskConfig(), ...params.config };
	const extension = params.extension || cfg.defaultExtension || "101";
	const displayName = params.staffFullName || `Оператор ${extension}`;

	const token = randomBytes(16).toString("hex");
	const expiry = new Date(Date.now() + 86400000).toISOString();

	const wsServerUrl = `wss://${cfg.host}:${cfg.wsPort}/ws`;
	const sipUri = `sip:${extension}@${cfg.realm}`;

	const iceServers: Array<{
		urls: string;
		username?: string;
		credential?: string;
	}> = [{ urls: cfg.stunServer || "stun:stun.l.google.com:19302" }];

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

export async function evaluateTelephonyGatewayStatus(
	organizationId: string,
	config?: Partial<LocalAsteriskPbxConfig>,
): Promise<TelephonyGatewayStatus> {
	const cfg = { ...getDefaultAsteriskConfig(), ...config };
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

	let isForcedFailover = forcedFailoverMap.get(organizationId);
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
			forcedFailoverMap.set(organizationId, isForcedFailover);
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
			fallbackReason:
				"Local Asterisk PBX unreachable. Seamlessly routed to Cloud Webhook (Mango/Zadarma).",
		};
	}

	let localPbxOnline = process.env.PBX_FORCE_ONLINE === "1";
	let latencyMs = localPbxOnline ? 5 : 0;

	const cacheKey = `${cfg.host}:${cfg.wsPort}`;
	const cached = localPbxStatusCache.get(cacheKey);

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

		localPbxStatusCache.set(cacheKey, {
			online: localPbxOnline,
			latencyMs,
			expiresAt: Date.now() + 15000,
		});
	}

	const activeMode: TelephonyMode = localPbxOnline
		? "local_webrtc_sip"
		: "cloud_webhooks";

	return {
		organizationId,
		activeMode,
		primaryProvider: "asterisk_local",
		fallbackProvider: resolvedFallbackProvider,
		localPbxOnline,
		localPbxLatencyMs: latencyMs,
		cloudWebhookActive: true,
		lastEvaluatedAt: now,
		fallbackReason: localPbxOnline
			? null
			: "Local PBX offline. Cloud webhook failover active.",
	};
}

export async function setForcedFailover(
	organizationId: string,
	forceCloudFallback: boolean,
): Promise<void> {
	forcedFailoverMap.set(organizationId, forceCloudFallback);
	try {
		await withTenantCtx(organizationId, async (tx) => {
			const orgRows = await tx
				.select({ flags: organizations.workspaceFeatureFlags })
				.from(organizations)
				.where(eq(organizations.id, organizationId))
				.limit(1);
			const flags = (orgRows[0]?.flags as Record<string, unknown> | null) ?? {};
			const updatedFlags = {
				...flags,
				telephonyForcedFailover: forceCloudFallback,
			};
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

export function clearLocalPbxCache(): void {
	localPbxStatusCache.clear();
}

export function clearForcedFailoverCache(): void {
	forcedFailoverMap.clear();
	clearLocalPbxCache();
}
