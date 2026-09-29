/**
 * DENTE CRM — Zero-Admin Clinic LAN Mesh Auto-Join & PIN Pairing Service
 *
 * Provides zero-friction, cryptographically secure tablet/workstation onboarding:
 *
 * 1. Rotating 6-Digit Clinic Join PIN:
 *    - Cryptographically random 6-digit PIN (e.g. "849201")
 *    - Time-to-live expiration (default: 15 minutes) with automatic background rotation
 *    - 60-second grace window on previous PIN to eliminate race conditions while typing
 *
 * 2. Instant QR Pairing Payload:
 *    - Generates mobile QR URI: `dente://pair?ip=...&port=...&pin=...&clinicId=...&nodeId=...&token=...`
 *    - Generates HTTP fallback URL for browser tablets: `http://<ip>:<webPort>/?pair_pin=...&clinic_id=...`
 *    - Computes real multi-subnet broadcast IP addresses so any tablet on Wi-Fi or Ethernet can connect
 *
 * 3. Zero-Admin Mutual Authentication & Auto-Join:
 *    - Doctors or assistants entering the 6-digit PIN immediately obtain mutual auth credentials
 *    - Brute-force rate limiting: blocks IP after 5 consecutive failed attempts (5-minute cooldown)
 *    - Constant-time PIN verification preventing timing attacks
 *    - Automatically registers newly joined nodes into active LanMeshService topology
 */

import * as crypto from "node:crypto";
import {
	type LanMeshPeerSummary,
	type LanMeshRole,
	scanClinicSubnets,
	timingSafeStringEqual,
} from "@dental/shared";
import { getPrimaryLanIp } from "./lanDiscoveryService.js";
import { type LanMeshService, getLanMeshService } from "./lanMeshService.js";

// ─────────────────────────────────────────────────────────────────────────────
// 1. Types & Interfaces
// ─────────────────────────────────────────────────────────────────────────────

export interface ClinicJoinPinInfo {
	readonly pin: string;
	readonly clinicId: string;
	readonly masterNodeId: string;
	readonly masterIp: string;
	readonly apiPort: number;
	readonly webPort: number;
	readonly issuedAt: number;
	readonly expiresAt: number;
	readonly remainingSeconds: number;
	readonly qrPayload: string;
	readonly httpPairUrl: string;
	readonly token: string;
}

export interface JoinedNodeRecord {
	readonly nodeId: string;
	readonly clientName: string;
	readonly clientIp: string;
	readonly role: LanMeshRole;
	readonly appVersion: string;
	readonly schemaVersion: number | string;
	readonly joinedAt: string;
	readonly lastSeenAt: string;
	readonly meshToken: string;
}

export interface RateLimitEntry {
	failedAttempts: number;
	lastFailedAt: number;
	lockedUntil: number;
}

export interface JoinRequest {
	readonly pin: string;
	readonly clientIp?: string | undefined;
	readonly nodeId?: string | undefined;
	readonly clientName?: string | undefined;
	readonly role?: LanMeshRole | undefined;
	readonly appVersion?: string | undefined;
	readonly schemaVersion?: number | string | undefined;
	readonly port?: number | undefined;
}

export interface JoinSuccessResult {
	readonly success: true;
	readonly clinicId: string;
	readonly masterNodeId: string;
	readonly masterIp: string;
	readonly masterPort: number;
	readonly assignedNodeId: string;
	readonly assignedRole: LanMeshRole;
	readonly meshToken: string;
	readonly schemaVersion: number | string;
	readonly appVersion: string;
	readonly authorizedAt: string;
	readonly peers: LanMeshPeerSummary[];
}

export interface JoinFailureResult {
	readonly success: false;
	readonly error: "INVALID_PIN" | "PIN_EXPIRED" | "RATE_LIMITED" | "INVALID_REQUEST";
	readonly message: string;
	readonly retryAfterSeconds?: number | undefined;
}

export type JoinResult = JoinSuccessResult | JoinFailureResult;

export interface LanMeshAutoJoinConfig {
	readonly clinicId?: string | undefined;
	readonly masterNodeId?: string | undefined;
	readonly masterName?: string | undefined;
	readonly primaryIp?: string | undefined;
	readonly apiPort?: number | undefined;
	readonly webPort?: number | undefined;
	readonly pinTtlMs?: number | undefined;
	readonly graceTtlMs?: number | undefined;
	readonly secret?: string | undefined;
	readonly maxAttemptsPerWindow?: number | undefined;
	readonly rateLimitWindowMs?: number | undefined;
	readonly lanMeshService?: LanMeshService | undefined;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. LanMeshAutoJoinService Implementation
// ─────────────────────────────────────────────────────────────────────────────

export class LanMeshAutoJoinService {
	readonly clinicId: string;
	readonly masterNodeId: string;
	readonly masterName: string;
	readonly apiPort: number;
	readonly webPort: number;

	private readonly pinTtlMs: number;
	private readonly graceTtlMs: number;
	private readonly secret: string;
	private readonly maxAttemptsPerWindow: number;
	private readonly rateLimitWindowMs: number;
	private readonly meshService?: LanMeshService | undefined;

	private currentPin: string = "";
	private currentIssuedAt: number = 0;
	private currentExpiresAt: number = 0;
	private currentToken: string = "";

	private previousPin: string | null = null;
	private previousExpiresAt: number = 0;

	private rotationTimer: NodeJS.Timeout | null = null;
	private readonly rateLimits = new Map<string, RateLimitEntry>();
	private readonly joinedNodes = new Map<string, JoinedNodeRecord>();

	constructor(config: LanMeshAutoJoinConfig = {}) {
		this.clinicId = config.clinicId || process.env.DENTE_CLINIC_ID || "clinic-default";
		this.masterNodeId = config.masterNodeId || process.env.DENTE_NODE_ID || "node-server-primary";
		this.masterName = config.masterName || process.env.DENTE_SERVER_NAME || "DENTE CRM Clinic Server";
		this.apiPort = config.apiPort || Number.parseInt(process.env.API_PORT || "4100", 10);
		this.webPort = config.webPort || Number.parseInt(process.env.WEB_PORT || "5173", 10);

		this.pinTtlMs = config.pinTtlMs || 15 * 60 * 1000; // 15 minutes
		this.graceTtlMs = config.graceTtlMs || 60 * 1000; // 60 seconds grace on old PIN
		this.secret = config.secret || process.env.DENTE_MESH_SECRET || `dente-mesh-salt-${this.clinicId}`;
		this.maxAttemptsPerWindow = config.maxAttemptsPerWindow || 5;
		this.rateLimitWindowMs = config.rateLimitWindowMs || 5 * 60 * 1000; // 5 minutes
		this.meshService = config.lanMeshService;

		// Initialize first rotating PIN
		this.rotatePin(true);

		// Schedule periodic PIN auto-rotation
		this.rotationTimer = setInterval(() => {
			this.ensureValidPin();
		}, 30000);
	}

	/**
	 * Generates a cryptographically strong 6-digit PIN and signs the pairing token.
	 */
	rotatePin(force = false): ClinicJoinPinInfo {
		const now = Date.now();
		if (!force && now < this.currentExpiresAt) {
			return this.getActivePinInfo();
		}

		// Move current PIN to grace window
		if (this.currentPin) {
			this.previousPin = this.currentPin;
			this.previousExpiresAt = now + this.graceTtlMs;
		}

		// Generate uniform random 6-digit string: 100000 to 999999
		const rawNumber = crypto.randomInt(100000, 1000000);
		this.currentPin = rawNumber.toString();
		this.currentIssuedAt = now;
		this.currentExpiresAt = now + this.pinTtlMs;

		// Sign cryptographic pairing token
		this.currentToken = this.signPairingToken(this.currentPin, this.currentIssuedAt, this.currentExpiresAt);

		return this.getActivePinInfo();
	}

	/**
	 * Returns active PIN info, rotating automatically if expired.
	 */
	getActivePinInfo(targetIp?: string): ClinicJoinPinInfo {
		const now = Date.now();
		if (now >= this.currentExpiresAt || !this.currentPin) {
			this.rotatePin(true);
		}

		const ip = targetIp || this.resolveEffectivePrimaryIp();
		const remainingSeconds = Math.max(0, Math.ceil((this.currentExpiresAt - Date.now()) / 1000));

		// Mobile QR protocol URI: dente://pair?...
		const qrPayload = `dente://pair?ip=${encodeURIComponent(ip)}&port=${this.apiPort}&pin=${this.currentPin}&clinicId=${encodeURIComponent(this.clinicId)}&nodeId=${encodeURIComponent(this.masterNodeId)}&token=${encodeURIComponent(this.currentToken)}&exp=${this.currentExpiresAt}`;

		// Browser tablet direct link fallback: http://<ip>:<webPort>/?...
		const httpPairUrl = `http://${ip}:${this.webPort}/?pair_pin=${this.currentPin}&clinic_id=${encodeURIComponent(this.clinicId)}&master_ip=${encodeURIComponent(ip)}&api_port=${this.apiPort}`;

		return {
			pin: this.currentPin,
			clinicId: this.clinicId,
			masterNodeId: this.masterNodeId,
			masterIp: ip,
			apiPort: this.apiPort,
			webPort: this.webPort,
			issuedAt: this.currentIssuedAt,
			expiresAt: this.currentExpiresAt,
			remainingSeconds,
			qrPayload,
			httpPairUrl,
			token: this.currentToken,
		};
	}

	/**
	 * Verifies an entered 6-digit PIN from a doctor tablet or secondary computer,
	 * enforces rate limiting against brute force, and completes zero-admin mutual auth.
	 */
	verifyAndJoin(request: JoinRequest): JoinResult {
		const clientIp = request.clientIp?.trim() || "unknown";
		const rawPin = request.pin?.trim() || "";

		// 1. Basic format validation
		if (!rawPin || !/^\d{6}$/.test(rawPin)) {
			return {
				success: false,
				error: "INVALID_REQUEST",
				message: "PIN-код должен состоять ровно из 6 цифр.",
			};
		}

		// 2. Brute-force rate limiting check
		const now = Date.now();
		const rateLimit = this.getOrCreateRateLimit(clientIp);

		if (rateLimit.lockedUntil > now) {
			const retryAfter = Math.ceil((rateLimit.lockedUntil - now) / 1000);
			return {
				success: false,
				error: "RATE_LIMITED",
				message: `Превышено количество попыток. IP заблокирован. Повторите через ${retryAfter} сек.`,
				retryAfterSeconds: retryAfter,
			};
		}

		// 3. Constant-time PIN verification (Active PIN or Grace PIN)
		let pinValid = false;
		if (this.currentPin && now <= this.currentExpiresAt) {
			if (timingSafeStringEqual(rawPin, this.currentPin)) {
				pinValid = true;
			}
		}

		// Check previous PIN grace period (60s) if active PIN didn't match
		if (!pinValid && this.previousPin && now <= this.previousExpiresAt) {
			if (timingSafeStringEqual(rawPin, this.previousPin)) {
				pinValid = true;
			}
		}

		// 4. Handle invalid PIN
		if (!pinValid) {
			rateLimit.failedAttempts++;
			rateLimit.lastFailedAt = now;

			if (rateLimit.failedAttempts >= this.maxAttemptsPerWindow) {
				rateLimit.lockedUntil = now + this.rateLimitWindowMs;
				const retryAfter = Math.ceil(this.rateLimitWindowMs / 1000);
				return {
					success: false,
					error: "RATE_LIMITED",
					message: `Неверный PIN-код. Превышен лимит попыток. Доступ заблокирован на ${retryAfter} сек.`,
					retryAfterSeconds: retryAfter,
				};
			}

			return {
				success: false,
				error: "INVALID_PIN",
				message: `Неверный PIN-код или срок его действия истёк. Осталось попыток: ${this.maxAttemptsPerWindow - rateLimit.failedAttempts}`,
			};
		}

		// 5. Successful authentication: reset rate limit for this IP
		this.resetRateLimitForIp(clientIp);

		// 6. Assign node ID, role, and generate session mesh token
		const assignedNodeId = request.nodeId?.trim() || `tablet-${crypto.randomUUID().slice(0, 8)}`;
		const assignedRole: LanMeshRole = request.role || "doctor";
		const clientName = request.clientName?.trim() || `Doctor Tablet (${assignedNodeId})`;
		const appVersion = request.appVersion?.trim() || "2.4.0";
		const schemaVersion = request.schemaVersion ?? 182;
		const peerPort = request.port || this.apiPort;

		const meshToken = this.signPeerMeshToken(assignedNodeId, assignedRole, clientIp, now);

		// 7. Record joined node
		const record: JoinedNodeRecord = {
			nodeId: assignedNodeId,
			clientName,
			clientIp,
			role: assignedRole,
			appVersion,
			schemaVersion,
			joinedAt: new Date(now).toISOString(),
			lastSeenAt: new Date(now).toISOString(),
			meshToken,
		};
		this.joinedNodes.set(assignedNodeId, record);

		// 8. Register peer with LanMeshService topology manager if available
		const effectiveMeshService = this.meshService || this.tryGetGlobalMeshService();
		if (effectiveMeshService) {
			try {
				effectiveMeshService.getTopology().addOrUpdatePeer({
					nodeId: assignedNodeId,
					role: assignedRole,
					ip: clientIp !== "unknown" ? clientIp : "127.0.0.1",
					port: peerPort,
					appVersion,
					schemaVersion,
					lastSeen: now,
					status: "online",
				});
			} catch {
				// Best-effort topology registration
			}
		}

		const knownPeers = effectiveMeshService?.getKnownPeers() || [];

		return {
			success: true,
			clinicId: this.clinicId,
			masterNodeId: this.masterNodeId,
			masterIp: this.resolveEffectivePrimaryIp(),
			masterPort: this.apiPort,
			assignedNodeId,
			assignedRole,
			meshToken,
			schemaVersion,
			appVersion,
			authorizedAt: record.joinedAt,
			peers: knownPeers,
		};
	}

	/**
	 * Returns full diagnostic pairing status including network interfaces and joined peers.
	 */
	getPairingStatus(): {
		clinicId: string;
		masterNodeId: string;
		masterName: string;
		primaryIp: string;
		apiPort: number;
		webPort: number;
		currentPin: string;
		expiresAt: string;
		remainingSeconds: number;
		qrPayload: string;
		httpPairUrl: string;
		activeSubnetsCount: number;
		joinedPeersCount: number;
		joinedPeers: JoinedNodeRecord[];
	} {
		const pinInfo = this.getActivePinInfo();
		const scanResult = scanClinicSubnets();

		return {
			clinicId: this.clinicId,
			masterNodeId: this.masterNodeId,
			masterName: this.masterName,
			primaryIp: pinInfo.masterIp,
			apiPort: this.apiPort,
			webPort: this.webPort,
			currentPin: pinInfo.pin,
			expiresAt: new Date(pinInfo.expiresAt).toISOString(),
			remainingSeconds: pinInfo.remainingSeconds,
			qrPayload: pinInfo.qrPayload,
			httpPairUrl: pinInfo.httpPairUrl,
			activeSubnetsCount: scanResult.clinicSubnets.length,
			joinedPeersCount: this.joinedNodes.size,
			joinedPeers: Array.from(this.joinedNodes.values()),
		};
	}

	getJoinedNodes(): JoinedNodeRecord[] {
		return Array.from(this.joinedNodes.values());
	}

	revokeNode(nodeId: string): boolean {
		return this.joinedNodes.delete(nodeId);
	}

	resetAllRateLimits(): void {
		this.rateLimits.clear();
	}

	stop(): void {
		if (this.rotationTimer) {
			clearInterval(this.rotationTimer);
			this.rotationTimer = null;
		}
	}

	// ─────────────────────────────────────────────────────────────────────────
	// Private Helper Methods
	// ─────────────────────────────────────────────────────────────────────────

	private ensureValidPin(): void {
		if (Date.now() >= this.currentExpiresAt || !this.currentPin) {
			this.rotatePin(true);
		}
	}

	private resolveEffectivePrimaryIp(): string {
		try {
			const scanResult = scanClinicSubnets();
			if (scanResult.primaryIp && scanResult.primaryIp !== "127.0.0.1") {
				return scanResult.primaryIp;
			}
		} catch {
			// Fall through
		}
		const fallback = getPrimaryLanIp();
		return fallback && fallback !== "127.0.0.1" ? fallback : "127.0.0.1";
	}

	private signPairingToken(pin: string, issuedAt: number, expiresAt: number): string {
		const payload = `${this.clinicId}:${this.masterNodeId}:${pin}:${issuedAt}:${expiresAt}`;
		const hmac = crypto.createHmac("sha256", this.secret);
		hmac.update(payload);
		const sig = hmac.digest("hex").slice(0, 32);
		return `pair-${issuedAt}-${sig}`;
	}

	private signPeerMeshToken(nodeId: string, role: string, ip: string, timestamp: number): string {
		const payload = `mesh_auth:${this.clinicId}:${nodeId}:${role}:${ip}:${timestamp}`;
		const hmac = crypto.createHmac("sha256", this.secret);
		hmac.update(payload);
		return `mesh_token_${timestamp}_${hmac.digest("hex").slice(0, 32)}`;
	}

	private getOrCreateRateLimit(ip: string): RateLimitEntry {
		let entry = this.rateLimits.get(ip);
		if (!entry) {
			entry = { failedAttempts: 0, lastFailedAt: 0, lockedUntil: 0 };
			this.rateLimits.set(ip, entry);
		}

		// Reset failures if outside window and not locked
		const now = Date.now();
		if (entry.lockedUntil <= now && now - entry.lastFailedAt > this.rateLimitWindowMs) {
			entry.failedAttempts = 0;
		}

		return entry;
	}

	private resetRateLimitForIp(ip: string): void {
		this.rateLimits.delete(ip);
	}

	private tryGetGlobalMeshService(): LanMeshService | null {
		try {
			return getLanMeshService();
		} catch {
			return null;
		}
	}
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Singleton Accessor
// ─────────────────────────────────────────────────────────────────────────────

let globalAutoJoinService: LanMeshAutoJoinService | null = null;

export function getLanMeshAutoJoinService(config?: LanMeshAutoJoinConfig): LanMeshAutoJoinService {
	if (!globalAutoJoinService) {
		globalAutoJoinService = new LanMeshAutoJoinService(config);
	}
	return globalAutoJoinService;
}

export function resetLanMeshAutoJoinServiceForTest(): void {
	if (globalAutoJoinService) {
		globalAutoJoinService.stop();
		globalAutoJoinService = null;
	}
}
