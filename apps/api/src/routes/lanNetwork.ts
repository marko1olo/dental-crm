/**
 * DENTE Dental CRM — LAN Network & Tablet QR Pairing Routes
 *
 * Exposes:
 * - GET  /api/network/lan-info: Real physical LAN IP discovery, adapter enumeration, pairing QR payload & AP isolation diagnostic
 * - POST /api/network/pair/generate: Generates cryptographically signed pairing token for doctor / assistant tablets
 * - POST /api/network/pair/verify: Validates scanned QR token and grants direct zero-config session tokens
 * - GET  /api/network/ping: Ultra-lightweight LAN connectivity heartbeat for tablets at dental chair
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { resolveOrganizationId } from "../accessGuard.js";
import { db } from "../db/client.js";
import { eq } from "drizzle-orm";
import { withSuperuserBypass, withTenantCtx } from "../db/rls.js";
import { organizations, users } from "../db/schema.js";
import { authTokenSecret } from "../security/authSecret.js";
import {
	getLanServerDiscoveryMetadata,
	getLocalLanAddresses,
	getPrimaryLanIp,
	getRankedLanInterfaces,
} from "../services/lanDiscoveryService.js";
import { signToken, verifyToken } from "../utils/cryptoHelper.js";

const pairRoleSchema = z.enum(["doctor", "assistant"]);

const generatePairSchema = z.object({
	role: pairRoleSchema.default("doctor"),
	organizationId: z.string().optional(),
	staffUserId: z.string().optional(),
	targetIp: z.string().optional(),
});

const verifyPairSchema = z.object({
	token: z.string().min(1),
	deviceName: z.string().optional(),
});

export interface LanPairingPayload {
	type: "dente_lan_pairing";
	role: "doctor" | "assistant";
	organizationId: string;
	staffUserId?: string | undefined;
	serverId: string;
	issuedAt: number;
}

const DEFAULT_PAIRING_TTL_SECONDS = 15 * 60; // 15 minutes fresh pairing window

export async function registerLanNetworkRoutes(app: FastifyInstance): Promise<void> {
	/**
	 * GET /api/network/lan-info
	 * Returns verified physical LAN IPs (Wi-Fi / Ethernet), filtering out virtual adapters (WSL, Hyper-V, Docker).
	 * Generates real connection URLs and guides for AP Isolation troubleshooting.
	 */
	app.get("/api/network/lan-info", async (request: FastifyRequest, reply: FastifyReply) => {
		const metadata = getLanServerDiscoveryMetadata();
		const rankedInterfaces = getRankedLanInterfaces();
		const activeLanAddresses = getLocalLanAddresses();
		const primaryIp = metadata.primaryIp;

		// Resolve organization context if token or cookie present
		let orgId = await resolveOrganizationId(request);
		if (!orgId) {
			// Find default primary organization if single-clinic / solo-doctor
			const defaultOrg = await withSuperuserBypass(async (tx) => {
				const orgList = await tx.select({ id: organizations.id }).from(organizations).limit(1);
				return orgList[0]?.id;
			});
			orgId = defaultOrg || "00000000-0000-0000-0000-000000000001";
		}

		// Generate fresh signed pairing token for immediate doctor QR pairing
		const pairingToken = signToken(
			{
				type: "dente_lan_pairing",
				role: "doctor",
				organizationId: orgId,
				serverId: metadata.serverId,
				issuedAt: Date.now(),
			} satisfies LanPairingPayload,
			authTokenSecret(),
			DEFAULT_PAIRING_TTL_SECONDS,
		);

		const pairingUrl = `http://${primaryIp}:${metadata.webPort}/?pair=${encodeURIComponent(pairingToken)}`;

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
			pairingToken,
			pairingUrl,
			pairingRole: "doctor",
			pairingExpiresInSeconds: DEFAULT_PAIRING_TTL_SECONDS,
			pairingExpiresAt: new Date(Date.now() + DEFAULT_PAIRING_TTL_SECONDS * 1000).toISOString(),
			hotspotGuide: {
				title: "Включение мобильной точки доступа Windows (Hotspot)",
				apIsolationWarning:
					"Если планшет врача или ассистента подключен к Wi-Fi клиники, но страница не открывается, на роутере включена изоляция клиентов (AP Isolation / Station Separation).",
				solution:
					"Включите мобильную точку доступа прямо на компьютере сервера клиники в 1 клик, чтобы планшеты подключались напрямую без ограничений роутера.",
				steps: [
					{
						step: 1,
						title: "Параметры мобильного хот-спота",
						description:
							"Нажмите Win+I -> 'Сеть и Интернет' -> 'Мобильный хот-спот' (или запустите 'ms-settings:network-mobilehotspot').",
						command: "ms-settings:network-mobilehotspot",
					},
					{
						step: 2,
						title: "Включить раздачу Wi-Fi",
						description:
							"Включите тумблер 'Поделиться моим сетевым подключением'. Имя Wi-Fi сети и пароль отобразятся на экране.",
					},
					{
						step: 3,
						title: "Подключить планшет к хот-споту",
						description:
							"На iPad или планшете выберите Wi-Fi сеть компьютера сервера, введите пароль и отсканируйте обновленный QR-код.",
					},
				],
			},
		});
	});

	/**
	 * POST /api/network/pair/generate
	 * Generates customized pairing token for doctor or assistant role.
	 */
	app.post("/api/network/pair/generate", async (request: FastifyRequest, reply: FastifyReply) => {
		const parseRes = generatePairSchema.safeParse(request.body);
		if (!parseRes.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Некорректные параметры генерации QR-кода сопряжения.",
				details: parseRes.error.format(),
			});
		}

		const { role, organizationId, staffUserId, targetIp } = parseRes.data;
		const metadata = getLanServerDiscoveryMetadata();
		const primaryIp = targetIp || getPrimaryLanIp();

		let resolvedOrgId = organizationId || (await resolveOrganizationId(request));
		if (!resolvedOrgId) {
			const defaultOrg = await withSuperuserBypass(async (tx) => {
				const orgList = await tx.select({ id: organizations.id }).from(organizations).limit(1);
				return orgList[0]?.id;
			});
			resolvedOrgId = defaultOrg || "00000000-0000-0000-0000-000000000001";
		}

		const pairingToken = signToken(
			{
				type: "dente_lan_pairing",
				role,
				organizationId: resolvedOrgId,
				staffUserId,
				serverId: metadata.serverId,
				issuedAt: Date.now(),
			} satisfies LanPairingPayload,
			authTokenSecret(),
			DEFAULT_PAIRING_TTL_SECONDS,
		);

		const pairingUrl = `http://${primaryIp}:${metadata.webPort}/?pair=${encodeURIComponent(pairingToken)}&role=${role}`;

		return reply.send({
			ok: true,
			role,
			pairingToken,
			pairingUrl,
			primaryIp,
			webPort: metadata.webPort,
			expiresInSeconds: DEFAULT_PAIRING_TTL_SECONDS,
			expiresAt: new Date(Date.now() + DEFAULT_PAIRING_TTL_SECONDS * 1000).toISOString(),
		});
	});

	/**
	 * POST /api/network/pair/verify
	 * Validates the scanned pairing token from iPad/tablet and yields ready-to-use auth session tokens.
	 */
	app.post("/api/network/pair/verify", async (request: FastifyRequest, reply: FastifyReply) => {
		const parseRes = verifyPairSchema.safeParse(request.body);
		if (!parseRes.success) {
			return reply.code(400).send({
				error: "ValidationError",
				message: "Токен сопряжения обязателен.",
			});
		}

		const { token, deviceName } = parseRes.data;
		const verified = verifyToken(token, authTokenSecret());

		if (!verified || verified.type !== "dente_lan_pairing") {
			return reply.code(401).send({
				error: "InvalidPairingToken",
				message: "Недействительный или просроченный QR-код сопряжения. Обновите QR-код на сервере.",
			});
		}

		const payload = verified as unknown as LanPairingPayload;
		const orgId = payload.organizationId;
		const role = payload.role || "doctor";

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

		// Lookup target user or first active doctor/assistant for the role
		let matchedUser: { id: string; fullName: string; role: string } | null = null;

		if (payload.staffUserId) {
			const [user] = await withTenantCtx(orgId, async (tx) => {
				return tx
					.select({ id: users.id, fullName: users.fullName, role: users.role })
					.from(users)
					.where(eq(users.id, payload.staffUserId!))
					.limit(1);
			});
			if (user) matchedUser = user;
		}

		if (!matchedUser) {
			const [fallbackUser] = await withTenantCtx(orgId, async (tx) => {
				return tx
					.select({ id: users.id, fullName: users.fullName, role: users.role })
					.from(users)
					.where(eq(users.role, role === "assistant" ? "assistant" : "doctor"))
					.limit(1);
			});
			if (fallbackUser) matchedUser = fallbackUser;
		}

		// Generate staff token for 1-click autonomy (no manual login required)
		const staffToken = matchedUser
			? signToken(
					{
						userId: matchedUser.id,
						fullName: matchedUser.fullName,
						role: matchedUser.role,
						organizationId: orgId,
						sessionId: `paired_${Date.now()}`,
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
	});

	/**
	 * GET /api/network/ping
	 * Fast heartbeat endpoint to verify LAN latency and reachability from tablet.
	 */
	app.get("/api/network/ping", async (_request: FastifyRequest, reply: FastifyReply) => {
		return reply.send({
			ok: true,
			service: "dental-crm-lan",
			time: new Date().toISOString(),
		});
	});
}
