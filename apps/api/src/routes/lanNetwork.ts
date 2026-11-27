/**
 * DENTE Dental CRM — LAN Network & Tablet QR Pairing Routes
 *
 * Exposes:
 * - GET  /api/network/lan-info: Real physical LAN IP discovery, adapter enumeration, pairing QR payload & AP isolation diagnostic
 * - POST /api/network/pair/generate: Generates cryptographically signed pairing token for doctor / assistant tablets
 * - POST /api/network/pair/verify: Validates scanned QR token and grants direct zero-config session tokens
 * - GET  /api/network/ping: Ultra-lightweight LAN connectivity heartbeat for tablets at dental chair
 */

import * as crypto from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import {
	definePublicRoute,
	defineStreamRoute,
} from "../core/routeFactories.js";
import { withTenantWriteCtx } from "../db/rls.js";
import { users } from "../db/schema.js";
import { authTokenSecret } from "../security/authSecret.js";
import { getRequestIdentity } from "../security/identity.js";
import { BoundedTtlMap } from "../lib/boundedTtlMap.js";
import {
	requireClinicalMutationContext,
	requireClinicalReadContext,
} from "../accessGuard.js";
import {
	browseMdnsDenteServers,
	getLanServerDiscoveryMetadata,
	getLocalLanAddresses,
	getPrimaryLanIp,
	getRankedLanInterfaces,
} from "../services/lanDiscoveryService.js";
import { getLanMeshService } from "../services/lanMeshService.js";
import {
	getLanMeshAutoJoinServiceForOrg,
	hasLanMeshAutoJoinServiceForOrg,
} from "../services/lanMeshAutoJoinService.js";
import { SyncGatewayService } from "../services/sync/syncGatewayService.js";
import { wsBroker } from "../services/websocketBroker.js";
import { signToken, verifyToken } from "../utils/cryptoHelper.js";
import {
	type MeshSyncExchangeResponse,
	type SyncMutationEntityKind,
	type SyncMutationEnvelope,
	type SyncMutationResult,
	computePayloadHash,
	lanMeshHandshakePayloadSchema,
	lanMeshRoleSchema,
	lanP2PMessageSchema,
	meshSyncExchangeRequestSchema,
	processMeshSyncExchange,
	queuedMeshMutationSchema,
} from "@dental/shared";

function normalizeMeshEntityKind(kind: string): SyncMutationEntityKind {
	const normalized = kind.toLowerCase().trim();
	if (normalized === "appointment") return "appointment";
	if (normalized === "visit") return "visit";
	if (
		normalized === "tooth_status" ||
		normalized === "odontogram" ||
		normalized === "odontogram_status" ||
		normalized === "odontogram_state"
	)
		return "odontogram_state";
	if (normalized === "payment" || normalized === "receipt") return "payment";
	if (normalized === "patient") return "patient";
	if (normalized === "invoice" || normalized === "patient_invoice") return "patient_invoice";
	if (normalized === "visit_diary" || normalized === "diary") return "visit_diary";
	if (normalized === "treatment_item" || normalized === "service") return "treatment_item";
	if (normalized === "clinical_task") return "clinical_task";
	if (normalized === "patient_administrative_profile") return "patient_administrative_profile";
	return "patient";
}

const pairRoleSchema = z.enum(["doctor", "assistant"]);

const generatePairSchema = z
	.object({
		role: pairRoleSchema.default("doctor"),
		organizationId: z.string().uuid().optional(),
		staffUserId: z.string().uuid().optional(),
		targetIp: z.string().ip({ version: "v4" }).optional(),
	})
	.strict();

const verifyPairSchema = z
	.object({
		token: z.string().min(1),
		pin: z.string().optional(),
		deviceName: z.string().optional(),
	})
	.strict();

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

const lanPairingPayloadSchema = z
	.object({
		type: z.literal("dente_lan_pairing"),
		role: z.enum(["doctor", "assistant"]).default("doctor"),
		organizationId: z.string(),
		staffUserId: z.string().optional(),
		serverId: z.string().optional(),
		nonce: z.string(),
		pin: z.string().optional(),
		issuedAt: z.number().optional(),
	})
	.strict();

export interface LanPairingPayload {
	type: "dente_lan_pairing";
	role: "doctor" | "assistant";
	organizationId: string;
	staffUserId?: string | undefined;
	serverId: string;
	nonce: string;
	pin: string;
	issuedAt: number;
}

export interface ActivePairingNonceEntry {
	nonce: string;
	role: "doctor" | "assistant";
	organizationId: string;
	staffUserId?: string | undefined;
	pin: string;
	expiresAt: number;
}

const DEFAULT_PAIRING_TTL_SECONDS = 15 * 60; // 15 minutes fresh pairing window
const AUTO_JOIN_ROUTE_MAX_FAILURES = 5;
const AUTO_JOIN_ROUTE_WINDOW_MS = 5 * 60 * 1000;

interface AutoJoinRouteRateLimitEntry {
	failedAttempts: number;
	lastFailedAt: number;
	lockedUntil: number;
}

const activePairingNonces = new BoundedTtlMap<string, ActivePairingNonceEntry>({
	maxEntries: 1024,
	ttlMs: DEFAULT_PAIRING_TTL_SECONDS * 1000,
});
const usedPairingNonces = new BoundedTtlMap<string, true>({
	maxEntries: 4096,
	ttlMs: DEFAULT_PAIRING_TTL_SECONDS * 1000,
});
const autoJoinRouteRateLimits = new BoundedTtlMap<string, AutoJoinRouteRateLimitEntry>({
	maxEntries: 2048,
	ttlMs: AUTO_JOIN_ROUTE_WINDOW_MS * 2,
});

function isPrivateOrLoopbackIp(rawIp: string): boolean {
	const ip = rawIp.trim().replace(/^::ffff:/i, "");
	if (!ip || ip === "127.0.0.1" || ip === "::1" || ip === "localhost") {
		return true;
	}
	if (ip.startsWith("127.") || ip.startsWith("10.") || ip.startsWith("192.168.") || ip.startsWith("169.254.")) {
		return true;
	}
	if (ip.startsWith("172.")) {
		const secondOctet = Number.parseInt(ip.split(".")[1] ?? "", 10);
		if (!Number.isNaN(secondOctet) && secondOctet >= 16 && secondOctet <= 31) {
			return true;
		}
	}
	const lower = ip.toLowerCase();
	return lower.startsWith("fc") || lower.startsWith("fd") || lower.startsWith("fe80:");
}

function checkAutoJoinRouteRateLimit(clientIp: string): { locked: boolean; retryAfterSeconds?: number | undefined } {
	const now = Date.now();
	const entry = autoJoinRouteRateLimits.get(clientIp);
	if (!entry) return { locked: false };
	if (entry.lockedUntil > now) {
		return {
			locked: true,
			retryAfterSeconds: Math.max(1, Math.ceil((entry.lockedUntil - now) / 1000)),
		};
	}
	if (now - entry.lastFailedAt > AUTO_JOIN_ROUTE_WINDOW_MS) {
		autoJoinRouteRateLimits.delete(clientIp);
	}
	return { locked: false };
}

function recordAutoJoinRouteFailure(clientIp: string): { locked: boolean; retryAfterSeconds?: number | undefined } {
	const now = Date.now();
	let entry = autoJoinRouteRateLimits.get(clientIp);
	if (!entry || (entry.lockedUntil <= now && now - entry.lastFailedAt > AUTO_JOIN_ROUTE_WINDOW_MS)) {
		entry = { failedAttempts: 0, lastFailedAt: now, lockedUntil: 0 };
		autoJoinRouteRateLimits.set(clientIp, entry);
	}
	entry.failedAttempts++;
	entry.lastFailedAt = now;
	if (entry.failedAttempts >= AUTO_JOIN_ROUTE_MAX_FAILURES) {
		entry.lockedUntil = now + AUTO_JOIN_ROUTE_WINDOW_MS;
		return {
			locked: true,
			retryAfterSeconds: Math.ceil(AUTO_JOIN_ROUTE_WINDOW_MS / 1000),
		};
	}
	return { locked: false };
}

function resetAutoJoinRouteRateLimit(clientIp: string): void {
	autoJoinRouteRateLimits.delete(clientIp);
}

export function clearAutoJoinRateLimitsForTest(): void {
	autoJoinRouteRateLimits.clear();
}

export function purgeExpiredPairingNonces(): void {
	activePairingNonces.pruneExpired();
	usedPairingNonces.pruneExpired();
	autoJoinRouteRateLimits.pruneExpired();
}

export function getActivePairingNoncesCount(): number {
	return activePairingNonces.size;
}

export function clearPairingNoncesForTest(): void {
	activePairingNonces.clear();
	usedPairingNonces.clear();
	autoJoinRouteRateLimits.clear();
}

function createPairingTokenRecord(options: {
	role: "doctor" | "assistant";
	organizationId: string;
	staffUserId?: string | undefined;
	serverId: string;
	targetIp: string;
	webPort: number;
}): {
	token: string;
	url: string;
	pin: string;
	nonce: string;
	expiresInSeconds: number;
	expiresAt: string;
} {
	purgeExpiredPairingNonces();
	const nonce = crypto.randomUUID();
	const pin = crypto.randomInt(1000, 10000).toString();
	const expiresAtMs = Date.now() + DEFAULT_PAIRING_TTL_SECONDS * 1000;

	activePairingNonces.set(nonce, {
		nonce,
		role: options.role,
		organizationId: options.organizationId,
		staffUserId: options.staffUserId,
		pin,
		expiresAt: expiresAtMs,
	});

	// Compact pairing token: 128-bit CSPRNG UUID nonce stored in server memory.
	// Generates a clean ~80-byte QR code for fast, high-contrast chairside scanning.
	const token = nonce;

	const url = `http://${options.targetIp}:${options.webPort}/?pair=${encodeURIComponent(token)}&role=${options.role}&pin=${pin}`;

	return {
		token,
		url,
		pin,
		nonce,
		expiresInSeconds: DEFAULT_PAIRING_TTL_SECONDS,
		expiresAt: new Date(expiresAtMs).toISOString(),
	};
}

export async function registerLanNetworkRoutes(app: FastifyInstance): Promise<void> {
	/**
	 * GET /api/network/lan-info & /api/lan/status
	 * Returns verified physical LAN IPs (Ethernet / Wi-Fi), filtering out virtual adapters (WSL, Hyper-V, Docker).
	 * Handing out pairing tokens requires an authenticated clinic session on the server PC.
	 */
	const handleLanInfo = async ({
		request,
		reply,
	}: {
		request: FastifyRequest;
		reply: FastifyReply;
	}) => {
		const metadata = getLanServerDiscoveryMetadata();
		const rankedInterfaces = getRankedLanInterfaces();
		const activeLanAddresses = getLocalLanAddresses();
		const primaryIp = metadata.primaryIp;

		// Check session identity: guests receive network topology, but no doctor tokens
		const identity = getRequestIdentity(request);
		const isAuthenticated = identity.verified && Boolean(identity.organizationId);

		let pairingInfo: ReturnType<typeof createPairingTokenRecord> | null = null;
		if (isAuthenticated && identity.organizationId) {
			pairingInfo = createPairingTokenRecord({
				role: "doctor",
				organizationId: identity.organizationId,
				staffUserId: identity.userId ?? undefined,
				serverId: metadata.serverId,
				targetIp: primaryIp,
				webPort: metadata.webPort,
			});
		}

		return reply.send({
			ok: true,
			serverName: metadata.serverName,
			serverId: metadata.serverId,
			hostname: metadata.hostname,
			primaryIp,
			lanAddresses: activeLanAddresses,
			apiPort: metadata.apiPort,
			webPort: metadata.webPort,
			interfaces: rankedInterfaces,
			requiresAuth: !isAuthenticated,
			pairingToken: pairingInfo?.token ?? null,
			pairingUrl: pairingInfo?.url ?? null,
			pairingPin: pairingInfo?.pin ?? null,
			pairingRole: pairingInfo ? "doctor" : null,
			pairingExpiresInSeconds: pairingInfo?.expiresInSeconds ?? null,
			pairingExpiresAt: pairingInfo?.expiresAt ?? null,
			hotspotGuide: {
				title: "Включение мобильной точки доступа Windows (Hotspot)",
				apIsolationWarning: "Если планшет врача или ассистента подключен к Wi-Fi клиники, но страница не открывается, на роутере включена изоляция клиентов (AP Isolation / Station Separation).",
				solution: "Включите мобильную точку доступа прямо на компьютере сервера клиники, чтобы планшеты подключались напрямую без ограничений роутера.",
				steps: [
					{ step: 1, title: "Параметры мобильного хот-спота", description: "Нажмите Win+I -> 'Сеть и Интернет' -> 'Мобильный хот-спот' (или запустите 'ms-settings:network-mobilehotspot').", command: "ms-settings:network-mobilehotspot" },
					{ step: 2, title: "Включить раздачу Wi-Fi", description: "Включите тумблер 'Поделиться моим сетевым подключением'. Имя Wi-Fi сети и пароль отобразятся на экране." },
					{ step: 3, title: "Подключить планшет к хот-споту", description: "На iPad или планшете выберите Wi-Fi сеть компьютера сервера, введите пароль и отсканируйте обновленный QR-код." },
				],
			},
		});
	};

	definePublicRoute(app, {
		method: "GET",
		path: "/api/network/lan-info",
		handler: handleLanInfo,
	});
	definePublicRoute(app, {
		method: "GET",
		path: "/api/lan/status",
		handler: handleLanInfo,
	});

	/**
	 * POST /api/network/pair/generate & /api/lan/token
	 * Generates customized pairing token for doctor or assistant role.
	 * Requires authenticated clinic session. Validates targetIp against physical LAN interfaces.
	 */
	const handlePairGenerate = async ({
		request,
		reply,
	}: {
		request: FastifyRequest;
		reply: FastifyReply;
	}) => {
		const identity = getRequestIdentity(request);
		if (!identity.verified || !identity.organizationId) {
			return reply.code(401).send({
				error: "Unauthorized",
				message: "Для генерации QR-кода сопряжения требуется авторизованная сессия клиники.",
			});
		}

		const parseRes = generatePairSchema.safeParse(request.body);
		if (!parseRes.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректные параметры генерации QR-кода сопряжения.",
				details: parseRes.error.format(),
			});
		}

		const { role, organizationId: bodyOrgId, staffUserId, targetIp } = parseRes.data;
		if (bodyOrgId && bodyOrgId !== identity.organizationId) {
			return reply.code(403).send({
				error: "Forbidden",
				message: "Переданный organizationId не соответствует текущей организации клиники.",
			});
		}
		const metadata = getLanServerDiscoveryMetadata();
		const activeLanAddresses = getLocalLanAddresses();

		if (targetIp && !activeLanAddresses.includes(targetIp) && targetIp !== "127.0.0.1") {
			return reply.code(400).send({
				error: "InvalidTargetIp",
				message: `IP-адрес ${targetIp} не принадлежит сетевым интерфейсам сервера клиники. Допустимые адреса: ${activeLanAddresses.join(", ")}`,
			});
		}

		const selectedIp = targetIp || getPrimaryLanIp();
		const pairingInfo = createPairingTokenRecord({
			role,
			organizationId: identity.organizationId,
			staffUserId: staffUserId || (identity.userId ?? undefined),
			serverId: metadata.serverId,
			targetIp: selectedIp,
			webPort: metadata.webPort,
		});

		return reply.send({
			ok: true,
			role,
			pairingToken: pairingInfo.token,
			pairingUrl: pairingInfo.url,
			pairingPin: pairingInfo.pin,
			primaryIp: selectedIp,
			webPort: metadata.webPort,
			expiresInSeconds: pairingInfo.expiresInSeconds,
			expiresAt: pairingInfo.expiresAt,
		});
	};

	defineStreamRoute(app, {
		method: "POST",
		path: "/api/network/pair/generate",
		permission: "public",
		handler: handlePairGenerate,
	});
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/lan/token",
		permission: "public",
		handler: handlePairGenerate,
	});

	/**
	 * POST /api/network/pair/verify
	 * Validates the scanned pairing token from iPad/tablet with single-use nonce guarantee and optional PIN check.
	 */
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/network/pair/verify",
		permission: "public",
		handler: async ({ request, reply }) => {
		const parseRes = verifyPairSchema.safeParse(request.body);
		if (!parseRes.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Токен сопряжения обязателен.",
			});
		}

		const { token, pin, deviceName } = parseRes.data;
		purgeExpiredPairingNonces();

		if (usedPairingNonces.has(token)) {
			return reply.code(401).send({
				error: "PairingTokenExpiredOrUsed",
				message: "Данный QR-код уже был использован или срок его действия истек. Обновите QR-код на сервере.",
			});
		}

		let nonce = "";
		let orgId = "";
		let role: "doctor" | "assistant" = "doctor";
		let staffUserId: string | undefined = undefined;

		// 1. Direct high-entropy nonce lookup
		const directEntry = activePairingNonces.get(token);
		if (directEntry) {
			nonce = directEntry.nonce;
			orgId = directEntry.organizationId;
			role = directEntry.role;
			staffUserId = directEntry.staffUserId;
		} else {
			// 2. Fallback to signed JWT pairing payload
			const verified = verifyToken(token, authTokenSecret());
			const parsedPayload = lanPairingPayloadSchema.safeParse(verified);
			if (parsedPayload.success) {
				nonce = parsedPayload.data.nonce;
				orgId = parsedPayload.data.organizationId;
				role = parsedPayload.data.role;
				staffUserId = parsedPayload.data.staffUserId;
			}
		}

		if (nonce && usedPairingNonces.has(nonce)) {
			return reply.code(401).send({
				error: "PairingTokenExpiredOrUsed",
				message: "Данный QR-код уже был использован или срок его действия истек. Обновите QR-код на сервере.",
			});
		}

		if (!nonce || !orgId) {
			return reply.code(401).send({
				error: "InvalidPairingToken",
				message: "Недействительный или просроченный QR-код сопряжения. Обновите QR-код на сервере.",
			});
		}

		// Anti-Replay: Verify single-use nonce exists and has not expired
		const nonceEntry = activePairingNonces.get(nonce);
		if (!nonceEntry || nonceEntry.expiresAt <= Date.now()) {
			if (nonceEntry) activePairingNonces.delete(nonce);
			usedPairingNonces.set(nonce, true);
			return reply.code(401).send({
				error: "PairingTokenExpiredOrUsed",
				message: "Данный QR-код уже был использован или срок его действия истек. Обновите QR-код на сервере.",
			});
		}

		// Optional PIN verification check if client provides pin
		if (pin && pin.trim() !== nonceEntry.pin) {
			return reply.code(401).send({
				error: "InvalidPairingPin",
				message: "Неверный 4-значный ПИН-код подтверждения сопряжения.",
			});
		}

		// SINGLE-USE GUARANTEE: Invalidate nonce immediately so token can NEVER be reused!
		activePairingNonces.delete(nonce);
		usedPairingNonces.set(nonce, true);

		// Issue valid clinic token
		const clinicToken = signToken(
			{
				organizationId: orgId,
				role: "clinic",
				pairedDevice: deviceName || "Tablet Client",
			},
			authTokenSecret(),
			60 * 60 * 24 * 7, // 7 days persistent tablet link
		);

		// Lookup explicitly bound staff user only (never pick arbitrary first user)
		// and persist a CSPRNG sessionId so verifyActiveStaffSession accepts the paired staffToken.
		let matchedUser: { id: string; fullName: string; role: string } | null = null;
		let pairedSessionId: string | null = null;

		if (staffUserId) {
			const targetStaffId = staffUserId;
			const nextSessionId = crypto.randomUUID();
			const userWithSession = await withTenantWriteCtx(orgId, async (tx) => {
				const [user] = await tx
					.select({ id: users.id, fullName: users.fullName, role: users.role })
					.from(users)
					.where(
						and(
							eq(users.id, targetStaffId),
							eq(users.organizationId, orgId),
						),
					)
					.limit(1);
				if (!user) return null;
				await tx
					.update(users)
					.set({ currentSessionId: nextSessionId })
					.where(
						and(
							eq(users.id, user.id),
							eq(users.organizationId, orgId),
						),
					);
				return { user, sessionId: nextSessionId };
			});
			if (!userWithSession) {
				return reply.code(403).send({
					ok: false,
					error: "StaffUserNotFound",
					message: "Указанный сотрудник не найден в этой клинике.",
				});
			}
			matchedUser = userWithSession.user;
			pairedSessionId = userWithSession.sessionId;
		}

		// Issue signed staff token only for explicitly matched user with persisted CSPRNG sessionId
		const staffToken =
			matchedUser && pairedSessionId
				? signToken(
						{
							userId: matchedUser.id,
							fullName: matchedUser.fullName,
							role: matchedUser.role,
							organizationId: orgId,
							sessionId: pairedSessionId,
						},
						authTokenSecret(),
						60 * 60 * 12, // 12h shift
					)
				: null;

		return reply.send({
			ok: true,
			valid: true,
			role,
			organizationId: orgId,
			clinicToken,
			staffToken,
			user: matchedUser,
			pairedAt: new Date().toISOString(),
		});
	},
	});

	/**
	 * GET /api/network/ping
	 * Fast heartbeat endpoint to verify LAN latency and reachability from tablet.
	 */
	definePublicRoute(app, {
		method: "GET",
		path: "/api/network/ping",
		handler: async ({ reply }) => {
			return reply.send({
				ok: true,
				service: "dental-crm-lan",
				time: new Date().toISOString(),
			});
		},
	});

	/**
	 * GET /api/network/lan-mesh/handshake
	 * Fast HTTP probe endpoint to confirm active DENTE LAN node.
	 */
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/network/lan-mesh/handshake",
		permission: "public",
		handler: async ({ request, reply }) => {
			const context = await requireClinicalReadContext(request, reply, "lan mesh handshake read");
			if (!context) return;

			const meshService = getLanMeshService();
			const handshake = meshService.getTopology().createHandshakePayload();
			return reply.send({
				ok: true,
				nodeId: handshake.nodeId,
				clinicId: handshake.clinicId,
				role: handshake.role,
				appVersion: handshake.appVersion,
				schemaVersion: handshake.schemaVersion,
			});
		},
	});

	/**
	 * POST /api/network/lan-mesh/handshake
	 * Negotiates version and schema compatibility with remote clinic node.
	 */
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/network/lan-mesh/handshake",
		permission: "public",
		schema: {
			description: "LAN mesh handshake with mandatory RFC 9562 Idempotency-Key",
			headers: {
				type: "object",
				properties: {
					"idempotency-key": { type: "string" },
					"x-idempotency-key": { type: "string" },
					organizationid: { type: "string" },
					"x-organization-id": { type: "string" },
				},
			},
		},
		handler: async ({ request, reply }) => {
			const context = await requireClinicalMutationContext(request, reply, "lan mesh handshake");
			if (!context) return;

			const parseRes = lanMeshHandshakePayloadSchema.safeParse(request.body);
			if (!parseRes.success) {
				return reply.code(400).send({
					ok: false,
					error: "InvalidHandshakePayload",
					details: parseRes.error.format(),
				});
			}

			const meshService = getLanMeshService();
			const result = meshService.handleIncomingHandshake(parseRes.data);

			return reply.send({
				ok: result.ok,
				compatibility: result.compatibility,
				handshake: result.handshake,
			});
		},
	});

	/**
	 * GET /api/network/lan-mesh/status
	 * Returns current topology status, known peers, Master election, and offline queue status badge.
	 */
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/network/lan-mesh/status",
		permission: "public",
		handler: async ({ request, reply }) => {
			const context = await requireClinicalReadContext(request, reply, "lan mesh status");
			if (!context) return;

			const meshService = getLanMeshService();
			const badge = meshService.getStatusBadge();
			const topology = meshService.getTopology();

			return reply.send({
				ok: true,
				localNode: topology.createHandshakePayload(),
				masterNode: topology.getMasterNode(),
				peers: topology.getPeerSummaries(),
				statusBadge: badge,
			});
		},
	});

	/**
	 * POST /api/network/lan-mesh/mutations
	 * Accepts streaming mutations from satellite workstations to the Master and applies to PostgreSQL.
	 */
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/network/lan-mesh/mutations",
		permission: "public",
		handler: async ({ request, reply }) => {
		const context = await requireClinicalMutationContext(request, reply, "lan mesh mutations");
		if (!context) return;

		const parseRes = z
			.object({ mutations: z.array(queuedMeshMutationSchema).max(500) })
			.strict()
			.safeParse(request.body);
		if (!parseRes.success) {
			return reply.code(400).send({
				ok: false,
				error: "InvalidMutationPayload",
				message: "Expected valid 'mutations' array in request body.",
				details: parseRes.error.format(),
			});
		}

		const meshService = getLanMeshService();
		const badge = meshService.getStatusBadge();

		// Schema incompatibility guard: reject direct mutations if schema is incompatible
		if (badge.syncMode === "sync_deferred" || badge.syncMode === "read_only") {
			return reply.code(409).send({
				ok: false,
				error: "SchemaIncompatible",
				message: "Direct schema mutations rejected: schema mismatch prevents database corruption.",
				warningBadge: badge.warningBadge,
			});
		}

		const identity = getRequestIdentity(request);
		const orgId = context.organizationId;
		for (const m of parseRes.data.mutations) {
			if (isRecord(m.payload)) {
				const candidateOrgId = m.payload["organizationId"];
				if (typeof candidateOrgId === "string" && candidateOrgId.trim() && candidateOrgId.trim() !== orgId) {
					return reply.code(403).send({
						ok: false,
						error: "CrossTenantMutationDenied",
						message: "Запрещена синхронизация мутаций для другой организации.",
					});
				}
			}
		}

		// Transform QueuedMeshMutation to SyncMutationEnvelope
		const envelopes: SyncMutationEnvelope[] = parseRes.data.mutations.map((m) => {
			const payload: Record<string, unknown> = isRecord(m.payload)
				? m.payload
				: { value: m.payload };
			const action: "create" | "update" | "delete" =
				m.action === "delete" ? "delete" : m.action === "create" ? "create" : "update";
			return {
				mutationId: m.id,
				idempotencyKey: m.idempotencyKey,
				payloadHash: computePayloadHash(payload),
				entityKind: normalizeMeshEntityKind(m.entityKind),
				entityId: m.entityId,
				action,
				payload,
				updatedAt: new Date(m.timestamp).toISOString(),
				clientId: m.originNodeId,
			};
		});

		let appliedCount = 0;
		let duplicateCount = 0;
		let mergedCount = 0;
		let rejectedCount = 0;

		try {
			const pushResult = await SyncGatewayService.processPushBatch(
				orgId,
				{
					syncBatchId: `mesh-batch-${Date.now()}`,
					clientId: parseRes.data.mutations[0]?.originNodeId || "mesh-satellite",
					mutations: envelopes,
					sentAt: new Date().toISOString(),
				},
				identity.userId || undefined,
				{ logger: request.log },
			);
			appliedCount = pushResult.appliedCount;
			duplicateCount = pushResult.duplicateCount;
			mergedCount = pushResult.mergedCount;
			rejectedCount = pushResult.rejectedCount;
		} catch (dbErr) {
			request.log.error(
				{ dbErr },
				"[lanNetwork] Failed to persist mutations to Postgres; rejecting batch honestly instead of silent memory lie",
			);
			return reply.code(503).send({
				ok: false,
				persisted: false,
				error: "DatabasePersistenceFailed",
				message: "Не удалось сохранить мутации в PostgreSQL.",
				processedCount: parseRes.data.mutations.length,
				appliedCount: 0,
				duplicateCount: 0,
				mergedCount: 0,
				rejectedCount: parseRes.data.mutations.length,
				appliedAt: new Date().toISOString(),
			});
		}

		return reply.send({
			ok: rejectedCount === 0,
			persisted: true,
			processedCount: parseRes.data.mutations.length,
			appliedCount,
			duplicateCount,
			mergedCount,
			rejectedCount,
			appliedAt: new Date().toISOString(),
		});
	},
	});

	/**
	 * POST /api/sync/mesh/exchange
	 * P2P bidirectional mesh exchange between LAN workstations/tablets without Internet.
	 * Persists incoming mutations into PostgreSQL and returns updated vector clock + sync results.
	 */
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/sync/mesh/exchange",
		permission: "public",
		handler: async ({ request, reply }) => {
		const context = await requireClinicalMutationContext(request, reply, "lan mesh exchange");
		if (!context) return;

		const parseRes = meshSyncExchangeRequestSchema.safeParse(request.body);
		if (!parseRes.success) {
			return reply.code(400).send({
				ok: false,
				error: "InvalidMeshExchangePayload",
				message: "Invalid MeshSyncExchangeRequest body.",
				details: parseRes.error.format(),
			});
		}

		const reqData = parseRes.data;
		const identity = getRequestIdentity(request);
		const orgId = context.organizationId;
		if (reqData.organizationId && reqData.organizationId !== orgId) {
			return reply.code(403).send({
				ok: false,
				error: "CrossTenantMutationDenied",
				message: "Запрещён обмен мутациями mesh для другой организации.",
			});
		}
		const meshService = getLanMeshService();
		const responderNodeId = meshService.nodeId;
		const responderTime = new Date().toISOString();

		// 1. Process mutations through real SyncGatewayService
		let gatewayRes: Awaited<ReturnType<typeof SyncGatewayService.processPushBatch>> | null = null;
		if (reqData.mutations.length > 0) {
			try {
				gatewayRes = await SyncGatewayService.processPushBatch(
					orgId,
					{
						syncBatchId: reqData.exchangeId,
						clientId: reqData.senderNodeId,
						mutations: reqData.mutations,
						sentAt: reqData.sentAt,
					},
					identity.userId || undefined,
					{ logger: request.log },
				);
			} catch (dbErr) {
				request.log.error({ dbErr }, "[lanNetwork] Mesh exchange DB write failed");
				return reply.code(503).send({
					ok: false,
					persisted: false,
					error: "DatabasePersistenceFailed",
					message: "Сбой сохранения mesh-мутаций в PostgreSQL.",
					exchangeId: reqData.exchangeId,
					responderNodeId,
					responderVectorClock: reqData.senderVectorClock,
					processedMutationsCount: reqData.mutations.length,
					appliedMutationsCount: 0,
					mergedMutationsCount: 0,
					duplicateMutationsCount: 0,
					returnMutations: [],
					results: [],
					responderTime,
				});
			}
		}

		// 2. Build results matching MeshSyncExchangeResponse schema
		const results: SyncMutationResult[] = [];
		let appliedCount = 0;
		let duplicateCount = 0;
		let mergedCount = 0;

		if (gatewayRes) {
			appliedCount = gatewayRes.appliedCount;
			duplicateCount = gatewayRes.duplicateCount;
			mergedCount = gatewayRes.mergedCount;
			for (const res of gatewayRes.results) {
				results.push(res);
			}
		} else {
			// Fallback in-memory CRDT resolution if offline without DB
			const allVectors = meshService.getVectorClockEngine().getAllVectors();
			const localVectorClock: Record<string, number> = { [responderNodeId]: 1 };
			for (const v of allVectors) {
				for (const [nodeId, seq] of Object.entries(v.vectorClock)) {
					localVectorClock[nodeId] = Math.max(localVectorClock[nodeId] ?? 0, seq);
				}
			}
			const resolved = processMeshSyncExchange(
				[],
				reqData,
				localVectorClock,
				responderNodeId,
			);
			appliedCount = resolved.appliedMutationsCount;
			duplicateCount = resolved.duplicateMutationsCount;
			mergedCount = resolved.mergedMutationsCount;
			results.push(...resolved.results);
		}

		// Update vector clock
		const responderVectorClock = {
			...reqData.senderVectorClock,
			[responderNodeId]: (reqData.senderVectorClock[responderNodeId] || 0) + 1,
		};

		const responsePayload: MeshSyncExchangeResponse = {
			exchangeId: reqData.exchangeId,
			responderNodeId,
			responderVectorClock,
			processedMutationsCount: reqData.mutations.length,
			appliedMutationsCount: appliedCount,
			mergedMutationsCount: mergedCount,
			duplicateMutationsCount: duplicateCount,
			returnMutations: [],
			results,
			responderTime,
		};

		return reply.code(200).send(responsePayload);
	},
	});

	/**
	 * POST /api/lan/p2p/dispatch
	 * Peer-to-peer event dispatching between clinical workstations (chair status, CITO, invoice transfer).
	 */
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/lan/p2p/dispatch",
		permission: "public",
		handler: async ({ request, reply }) => {
		const context = await requireClinicalMutationContext(request, reply, "lan p2p dispatch");
		if (!context) return;

		const parseRes = lanP2PMessageSchema.safeParse(request.body);
		if (!parseRes.success) {
			return reply.code(400).send({
				ok: false,
				error: "InvalidP2PMessage",
				message: "Invalid LanP2PMessage payload structure.",
				details: parseRes.error.format(),
			});
		}

		const msg = parseRes.data;
		if (msg.organizationId && msg.organizationId !== context.organizationId) {
			return reply.code(403).send({
				ok: false,
				error: "CrossTenantDispatchDenied",
				message: "Запрещена отправка P2P-сообщений для другой организации.",
			});
		}
		const identity = getRequestIdentity(request);
		wsBroker.broadcastToOrganization(context.organizationId, {
			type: "LAN_P2P_EVENT",
			payload: {
				...msg,
				organizationId: context.organizationId,
				senderUserId: identity.userId ?? null,
			},
		});

		request.log.info(
			{
				messageId: msg.messageId,
				eventType: msg.eventType,
				senderNodeId: msg.senderNodeId,
				senderRole: msg.senderRole,
				organizationId: context.organizationId,
			},
			`[lanNetwork] Broadcast P2P LAN event to org WS clients: ${msg.eventType}`,
		);

		return reply.code(200).send({
			ok: true,
			broadcasted: true,
			messageId: msg.messageId,
			eventType: msg.eventType,
			receivedAt: new Date().toISOString(),
		});
	},
	});

	/**
	 * POST /api/network/lan-mesh/discover
	 * Triggers immediate UDP broadcast beacon and active subnet HTTP probe.
	 */
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/network/lan-mesh/discover",
		permission: "public",
		handler: async ({ request, reply }) => {
			const context = await requireClinicalMutationContext(request, reply, "lan mesh discover");
			if (!context) return;

			const meshService = getLanMeshService();
			meshService.broadcastBeacon();
			const [discovered, mdnsServers] = await Promise.all([
				meshService.probeSubnetHttp(),
				browseMdnsDenteServers(800),
			]);

			return reply.send({
				ok: true,
				discoveredEndpoints: discovered,
				mdnsServers,
				peers: meshService.getKnownPeers(),
				statusBadge: meshService.getStatusBadge(),
			});
		},
	});

	/**
	 * GET /api/network/mesh/auto-join/status
	 * Returns current 6-digit PIN, remaining expiration time, and QR pairing URI.
	 */
	defineStreamRoute(app, {
		method: "GET",
		path: "/api/network/mesh/auto-join/status",
		permission: "public",
		handler: async ({ request, reply }) => {
			const context = await requireClinicalReadContext(request, reply, "lan mesh auto-join status");
			if (!context) return;

			const autoJoin = getLanMeshAutoJoinServiceForOrg(context.organizationId);
			const status = autoJoin.getPairingStatus();
			return reply.send({
				ok: true,
				status,
			});
		},
	});

	/**
	 * POST /api/network/mesh/auto-join/rotate
	 * Forces rotation of the 6-digit PIN (requires authenticated clinic mutation context).
	 */
	defineStreamRoute(app, {
		method: "POST",
		path: "/api/network/mesh/auto-join/rotate",
		permission: "public",
		handler: async ({ request, reply }) => {
			const context = await requireClinicalMutationContext(
				request,
				reply,
				"lan mesh auto-join rotate",
			);
			if (!context) return;

			const autoJoin = getLanMeshAutoJoinServiceForOrg(context.organizationId);
			const pinInfo = autoJoin.rotatePin(true);
			return reply.send({
				ok: true,
				pinInfo,
			});
		},
	});

	/**
	 * POST /api/network/mesh/auto-join/verify
	 * Validates entered 6-digit PIN from doctor tablet or secondary computer,
	 * verifies mutual authentication, and joins the local clinic mesh.
	 */
	definePublicRoute(app, {
		method: "POST",
		path: "/api/network/mesh/auto-join/verify",
		schema: {
			description: "LAN mesh auto-join verify with mandatory RFC 9562 Idempotency-Key",
			headers: {
				type: "object",
				properties: {
					"idempotency-key": { type: "string" },
					"x-idempotency-key": { type: "string" },
					organizationid: { type: "string" },
					"x-organization-id": { type: "string" },
				},
			},
		},
		handler: async ({ request, reply }) => {
		const clientIp = request.ip || "127.0.0.1";
		const preCheckLimit = checkAutoJoinRouteRateLimit(clientIp);
		if (preCheckLimit.locked) {
			const retryAfter = preCheckLimit.retryAfterSeconds ?? 300;
			reply.header("Retry-After", String(retryAfter));
			return reply.code(429).send({
				ok: false,
				error: "RATE_LIMITED",
				message: `Превышено количество попыток сопряжения. Повторите через ${retryAfter} сек.`,
				retryAfterSeconds: retryAfter,
			});
		}

		const autoJoinVerifySchema = z
			.object({
				pin: z.string().min(6).max(6),
				organizationId: z.string().uuid().optional(),
				nodeId: z.string().optional(),
				clientName: z.string().optional(),
				role: lanMeshRoleSchema.optional(),
				appVersion: z.string().optional(),
				schemaVersion: z.union([z.number(), z.string()]).optional(),
				port: z.number().int().positive().optional(),
			})
			.strict();

		const parseRes = autoJoinVerifySchema.safeParse(request.body);
		if (!parseRes.success) {
			const failLimit = recordAutoJoinRouteFailure(clientIp);
			if (failLimit.locked) {
				const retryAfter = failLimit.retryAfterSeconds ?? 300;
				reply.header("Retry-After", String(retryAfter));
				return reply.code(429).send({
					ok: false,
					error: "RATE_LIMITED",
					message: `Превышено количество попыток сопряжения. Повторите через ${retryAfter} сек.`,
					retryAfterSeconds: retryAfter,
				});
			}
			return reply.code(400).send({
				ok: false,
				error: "InvalidRequest",
				message: "Некорректные параметры сопряжения. Ожидается 6-значный цифровой PIN.",
				details: parseRes.error.format(),
			});
		}

		const identity = getRequestIdentity(request);
		const envClinicId =
			process.env.DENTE_CLINIC_ID && z.string().uuid().safeParse(process.env.DENTE_CLINIC_ID).success
				? process.env.DENTE_CLINIC_ID
				: null;

		let orgId: string | null = null;

		if (identity.verified && identity.organizationId) {
			if (
				parseRes.data.organizationId &&
				parseRes.data.organizationId !== identity.organizationId
			) {
				const failLimit = recordAutoJoinRouteFailure(clientIp);
				if (failLimit.locked) {
					const retryAfter = failLimit.retryAfterSeconds ?? 300;
					reply.header("Retry-After", String(retryAfter));
					return reply.code(429).send({
						ok: false,
						error: "RATE_LIMITED",
						message: `Превышено количество попыток сопряжения. Повторите через ${retryAfter} сек.`,
						retryAfterSeconds: retryAfter,
					});
				}
				return reply.code(403).send({
					ok: false,
					error: "Forbidden",
					message: "Несоответствие организации клиники для сопряжения.",
				});
			}
			orgId = identity.organizationId;
		} else {
			// Unauthenticated LAN auto-join is restricted to private/loopback clinic subnet
			// and MUST NOT instantiate or enumerate arbitrary organizationId tenants.
			if (!isPrivateOrLoopbackIp(clientIp)) {
				const failLimit = recordAutoJoinRouteFailure(clientIp);
				if (failLimit.locked) {
					const retryAfter = failLimit.retryAfterSeconds ?? 300;
					reply.header("Retry-After", String(retryAfter));
					return reply.code(429).send({
						ok: false,
						error: "RATE_LIMITED",
						message: `Превышено количество попыток сопряжения. Повторите через ${retryAfter} сек.`,
						retryAfterSeconds: retryAfter,
					});
				}
				return reply.code(403).send({
					ok: false,
					error: "Forbidden",
					message: "Сопряжение по PIN доступно только из локальной сети клиники или с авторизованной сессией.",
				});
			}

			const requestedOrgId = parseRes.data.organizationId ?? null;
			if (requestedOrgId) {
				const isConfiguredLocalClinic = envClinicId !== null && requestedOrgId === envClinicId;
				const hasActivePairingSession = hasLanMeshAutoJoinServiceForOrg(requestedOrgId);
				if (!isConfiguredLocalClinic && !hasActivePairingSession) {
					const failLimit = recordAutoJoinRouteFailure(clientIp);
					if (failLimit.locked) {
						const retryAfter = failLimit.retryAfterSeconds ?? 300;
						reply.header("Retry-After", String(retryAfter));
						return reply.code(429).send({
							ok: false,
							error: "RATE_LIMITED",
							message: `Превышено количество попыток сопряжения. Повторите через ${retryAfter} сек.`,
							retryAfterSeconds: retryAfter,
						});
					}
					return reply.code(403).send({
						ok: false,
						error: "AutoJoinOrganizationNotActive",
						message: "Сопряжение для указанной организации не активировано на этом сервере.",
					});
				}
				orgId = requestedOrgId;
			} else if (envClinicId) {
				orgId = envClinicId;
			}
		}

		if (!orgId) {
			const failLimit = recordAutoJoinRouteFailure(clientIp);
			if (failLimit.locked) {
				const retryAfter = failLimit.retryAfterSeconds ?? 300;
				reply.header("Retry-After", String(retryAfter));
				return reply.code(429).send({
					ok: false,
					error: "RATE_LIMITED",
					message: `Превышено количество попыток сопряжения. Повторите через ${retryAfter} сек.`,
					retryAfterSeconds: retryAfter,
				});
			}
			return reply.code(400).send({
				ok: false,
				error: "OrganizationRequired",
				message: "Не указан корректный UUID организации клиники для сопряжения.",
			});
		}

		const autoJoin = getLanMeshAutoJoinServiceForOrg(orgId);
		const joinResult = autoJoin.verifyAndJoin({
			...parseRes.data,
			clientIp,
		});

		if (!joinResult.success) {
			const failLimit = recordAutoJoinRouteFailure(clientIp);
			const isRateLimited = joinResult.error === "RATE_LIMITED" || failLimit.locked;
			const statusCode = isRateLimited ? 429 : 403;
			const retryAfter = joinResult.retryAfterSeconds ?? failLimit.retryAfterSeconds;
			if (isRateLimited && retryAfter !== undefined) {
				reply.header("Retry-After", String(retryAfter));
			}
			return reply.code(statusCode).send({
				ok: false,
				error: isRateLimited ? "RATE_LIMITED" : joinResult.error,
				message: isRateLimited && !joinResult.retryAfterSeconds
					? `Превышено количество попыток сопряжения. Повторите через ${retryAfter ?? 300} сек.`
					: joinResult.message,
				retryAfterSeconds: retryAfter,
			});
		}

		resetAutoJoinRouteRateLimit(clientIp);
		return reply.send({
			ok: true,
			clinicToken: joinResult.clinicToken,
			join: joinResult,
		});
	},
	});
}

