import {
	hmacSha256Hex,
	safeRandomBytesHex,
	timingSafeStringEqual,
} from "../hashing.js";
import {
	masterLeaseHeartbeatSchema,
	type MasterLeaseHeartbeat,
	lanMeshLeaseHeartbeatPacketSchema,
	type LanMeshLeaseHeartbeatPacket,
} from "./schemas.js";
import { normalizeSchemaVersion } from "./schemaCompatibility.js";

// ─────────────────────────────────────────────────────────────────────────────
// Lease Security & Master Heartbeat Cryptography (Layer 1)
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_LEASE_HEARTBEAT_INTERVAL_MS = 5000;
export const MISSED_HEARTBEATS_FAILOVER_THRESHOLD = 2;
export const DEFAULT_LEASE_FAILOVER_TIMEOUT_MS = 10000; // 2 * 5000ms threshold

export function getLeaseSigningPayload(params: {
	leaseId: string;
	clinicId: string;
	masterNodeId: string;
	term: number;
	issuedAt: number;
	expiresAt: number;
	schemaVersion: number | string;
	appVersion: string;
}): string {
	const normalizedSchema = normalizeSchemaVersion(params.schemaVersion);
	return `${params.leaseId}:${params.clinicId}:${params.masterNodeId}:${params.term}:${params.issuedAt}:${params.expiresAt}:${normalizedSchema}:${params.appVersion}`;
}

export function createMasterLeaseHeartbeat(params: {
	masterNodeId: string;
	clinicId: string;
	term: number;
	schemaVersion: number | string;
	appVersion: string;
	leaseDurationMs?: number | undefined;
	secret?: string | undefined;
	issuedAt?: number | undefined;
	leaseId?: string | undefined;
}): MasterLeaseHeartbeat {
	const leaseId = params.leaseId || `lease-${Date.now()}-${safeRandomBytesHex(4)}`;
	const issuedAt = params.issuedAt ?? Date.now();
	const leaseDurationMs = params.leaseDurationMs ?? DEFAULT_LEASE_HEARTBEAT_INTERVAL_MS;
	const expiresAt = issuedAt + leaseDurationMs;
	const secret = params.secret || `dente-mesh-secret-${params.clinicId}`;

	const signingPayload = getLeaseSigningPayload({
		leaseId,
		clinicId: params.clinicId,
		masterNodeId: params.masterNodeId,
		term: params.term,
		issuedAt,
		expiresAt,
		schemaVersion: params.schemaVersion,
		appVersion: params.appVersion,
	});

	const signature = hmacSha256Hex(secret, signingPayload);

	return {
		leaseId,
		masterNodeId: params.masterNodeId,
		clinicId: params.clinicId,
		term: params.term,
		issuedAt,
		expiresAt,
		leaseDurationMs,
		schemaVersion: params.schemaVersion,
		appVersion: params.appVersion,
		signature,
	};
}

export function verifyMasterLeaseHeartbeat(
	lease: MasterLeaseHeartbeat,
	options: {
		secret?: string | undefined;
		expectedClinicId?: string | undefined;
		now?: number | undefined;
		clockSkewToleranceMs?: number | undefined;
	} = {},
): { valid: boolean; reason?: string | undefined } {
	const parseRes = masterLeaseHeartbeatSchema.safeParse(lease);
	if (!parseRes.success) {
		return { valid: false, reason: "Malformed lease schema" };
	}

	const data = parseRes.data;

	if (options.expectedClinicId && data.clinicId !== options.expectedClinicId) {
		return {
			valid: false,
			reason: `Clinic mismatch: expected '${options.expectedClinicId}', got '${data.clinicId}'`,
		};
	}

	const secret = options.secret || `dente-mesh-secret-${data.clinicId}`;
	const expectedPayload = getLeaseSigningPayload(data);
	const expectedSignature = hmacSha256Hex(secret, expectedPayload);

	if (!timingSafeStringEqual(data.signature, expectedSignature)) {
		return { valid: false, reason: "Invalid cryptographic lease signature" };
	}

	const now = options.now ?? Date.now();
	const tolerance = options.clockSkewToleranceMs ?? 2000;
	if (now > data.expiresAt + tolerance) {
		return { valid: false, reason: `Lease expired at ${data.expiresAt} (current time: ${now})` };
	}

	return { valid: true };
}

/**
 * Creates a raw UDP broadcast/multicast lease heartbeat packet buffer.
 */
export function createMeshLeaseHeartbeatPacket(lease: MasterLeaseHeartbeat): Buffer {
	const packet: LanMeshLeaseHeartbeatPacket = {
		magic: "DENTE_MESH_LEASE",
		lease,
	};
	return Buffer.from(JSON.stringify(packet), "utf8");
}

/**
 * Parses and validates an incoming raw UDP lease heartbeat packet buffer.
 */
export function parseMeshLeaseHeartbeatPacket(buffer: Buffer | string): MasterLeaseHeartbeat | null {
	try {
		const rawString = typeof buffer === "string" ? buffer : buffer.toString("utf8");
		const parsedJson = JSON.parse(rawString);
		const result = lanMeshLeaseHeartbeatPacketSchema.safeParse(parsedJson);
		if (result.success) {
			return result.data.lease;
		}
	} catch {
		// Ignore malformed packets from other network services
	}
	return null;
}
