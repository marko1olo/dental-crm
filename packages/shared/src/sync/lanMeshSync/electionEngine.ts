import type { LanMeshRole, LanMeshNodeStatus } from "./schemas.js";
import { normalizeSchemaVersion } from "./schemaCompatibility.js";

// ─────────────────────────────────────────────────────────────────────────────
// 3. Dynamic Master Election & Role Hierarchy (Layer 1)
// ─────────────────────────────────────────────────────────────────────────────

export interface PeerElectionCandidate {
	nodeId: string;
	role: LanMeshRole;
	schemaVersion: number | string;
	lastSeen: number;
	status: LanMeshNodeStatus;
	uptimeMs?: number;
}

/**
 * Deterministically elects or identifies the Master node among active peers:
 * 1. An explicitly configured 'master' node currently online always wins.
 * 2. If multiple nodes claim 'master', tie-break by highest schema version, then lowest nodeId.
 * 3. If no 'master' exists, an 'admin' node is eligible, or the node with lowest nodeId.
 */
export function electMasterNode<T extends PeerElectionCandidate>(
	candidates: T[],
	options: { allowTemporaryConsensus?: boolean } = {},
): T | null {
	const activeCandidates = candidates.filter(
		(c) => c.status === "online" || c.status === "read_only" || c.status === "sync_deferred",
	);

	if (activeCandidates.length === 0) return null;

	// 1. Filter nodes designated as 'master'
	const masters = activeCandidates.filter((c) => c.role === "master");
	if (masters.length > 0) {
		return masters.sort((a, b) => {
			const schemaA = normalizeSchemaVersion(a.schemaVersion);
			const schemaB = normalizeSchemaVersion(b.schemaVersion);
			if (schemaA !== schemaB) return schemaB - schemaA; // Highest schema first
			return a.nodeId.localeCompare(b.nodeId); // Deterministic tie-break
		})[0]!;
	}

	// 2. Filter nodes designated as 'admin'
	const admins = activeCandidates.filter((c) => c.role === "admin");
	if (admins.length > 0) {
		return admins.sort((a, b) => {
			const schemaA = normalizeSchemaVersion(a.schemaVersion);
			const schemaB = normalizeSchemaVersion(b.schemaVersion);
			if (schemaA !== schemaB) return schemaB - schemaA;
			return a.nodeId.localeCompare(b.nodeId);
		})[0]!;
	}

	// 3. Dynamic consensus failover: all active satellites participate
	if (options.allowTemporaryConsensus) {
		return activeCandidates.sort((a, b) => {
			const schemaA = normalizeSchemaVersion(a.schemaVersion);
			const schemaB = normalizeSchemaVersion(b.schemaVersion);
			if (schemaA !== schemaB) return schemaB - schemaA;
			return a.nodeId.localeCompare(b.nodeId);
		})[0]!;
	}

	// 4. If no master or admin server is online and consensus failover not enabled, return null (satellites buffer offline)
	return null;
}

/**
 * Instant consensus election among satellites when the primary Master is dead.
 * Requirement: highest schema version + lowest nodeId becomes the temporary active Master.
 */
export function electConsensusMasterNode<T extends PeerElectionCandidate>(candidates: T[]): T | null {
	return electMasterNode(candidates, { allowTemporaryConsensus: true });
}
