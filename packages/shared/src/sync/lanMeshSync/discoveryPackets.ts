import {
	type LanMeshRole,
	type LanMeshDiscoveryBeaconPayload,
	lanMeshDiscoveryBeaconPayloadSchema,
} from "./schemas.js";

// ─────────────────────────────────────────────────────────────────────────────
// 5. Zero-Conf Peer Discovery Beacon Generator (Layer 2)
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_MESH_UDP_PORT = 4101;
export const DEFAULT_MESH_HTTP_PORTS = [4100, 4101, 4102, 4103, 4104, 4105] as const;

/**
 * Creates a raw UDP broadcast/multicast discovery beacon buffer.
 */
export function createMeshDiscoveryBeacon(params: {
	nodeId: string;
	clinicId: string;
	role: LanMeshRole;
	ip: string;
	port: number;
	appVersion: string;
	schemaVersion: number | string;
	timestamp?: number;
}): Buffer {
	const beaconPayload: LanMeshDiscoveryBeaconPayload = {
		magic: "DENTE_MESH_BEACON",
		protocolVersion: "2.0.0",
		nodeId: params.nodeId,
		clinicId: params.clinicId,
		role: params.role,
		ip: params.ip,
		port: params.port,
		appVersion: params.appVersion,
		schemaVersion: params.schemaVersion,
		timestamp: params.timestamp ?? Date.now(),
	};
	return Buffer.from(JSON.stringify(beaconPayload), "utf8");
}

/**
 * Parses and validates an incoming raw UDP beacon buffer.
 */
export function parseMeshDiscoveryBeacon(buffer: Buffer | string): LanMeshDiscoveryBeaconPayload | null {
	try {
		const rawString = typeof buffer === "string" ? buffer : buffer.toString("utf8");
		const parsedJson = JSON.parse(rawString);
		const result = lanMeshDiscoveryBeaconPayloadSchema.safeParse(parsedJson);
		if (result.success) {
			return result.data;
		}
	} catch {
		// Ignore malformed packets from other network services
	}
	return null;
}
