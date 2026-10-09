import type { SchemaCompatibilityResult } from "./schemas.js";

// ─────────────────────────────────────────────────────────────────────────────
// 2. Schema & Protocol Version Negotiation Engine (Layer 1)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalizes a schemaVersion representation into a major integer number for safe compatibility checks.
 * Examples:
 *   - 42 -> 42
 *   - "42" -> 42
 *   - "2.4.1" -> 2
 *   - "schema_v12" -> 12
 */
export function normalizeSchemaVersion(version: number | string): number {
	if (typeof version === "number" && Number.isFinite(version)) {
		return Math.max(0, Math.floor(version));
	}
	if (typeof version === "string") {
		const match = version.match(/(\d+)/);
		if (match && match[1]) {
			const parsed = Number.parseInt(match[1], 10);
			if (Number.isFinite(parsed)) return parsed;
		}
	}
	return 0;
}

/**
 * Parses semantic version string "X.Y.Z" into [major, minor, patch].
 */
export function parseMeshSemver(versionStr: string): [number, number, number] {
	if (!versionStr || typeof versionStr !== "string") return [0, 0, 0];
	const parts = versionStr.replace(/^[^\d]*/, "").split(".");
	const major = Number.parseInt(parts[0] || "0", 10) || 0;
	const minor = Number.parseInt(parts[1] || "0", 10) || 0;
	const patch = Number.parseInt(parts[2] || "0", 10) || 0;
	return [major, minor, patch];
}

/**
 * Rigorously checks schema and version compatibility between two clinic nodes:
 * - If clinicId differs: complete rejection (isolation between independent practices).
 * - If schemaVersion differs: prevents database corruption by rejecting direct schema mutations
 *   and falling back to sync-deferred or read-only mode with a non-blocking alert badge.
 * - If appVersion differs by major version: prompts an upgrade warning while preserving read-only safety.
 */
export function verifyMeshSchemaCompatibility(
	local: { appVersion: string; schemaVersion: number | string; clinicId: string },
	remote: { appVersion: string; schemaVersion: number | string; clinicId: string },
): SchemaCompatibilityResult {
	// 1. Strict Clinic Multi-Tenant Isolation
	if (local.clinicId !== remote.clinicId) {
		return {
			compatible: false,
			syncAllowed: false,
			mode: "read_only",
			reason: `Clinic ID mismatch: local clinic is '${local.clinicId}', remote is '${remote.clinicId}'`,
			warningBadge: {
				code: "CLINIC_MISMATCH",
				title: "Другая клиника в сети",
				message: `Обнаружен компьютер клиники '${remote.clinicId}'. Синхронизация запрещена для защиты данных.`,
				level: "critical",
			},
		};
	}

	const localSchema = normalizeSchemaVersion(local.schemaVersion);
	const remoteSchema = normalizeSchemaVersion(remote.schemaVersion);

	// 2. Schema Compatibility Check
	if (localSchema !== remoteSchema) {
		const isRemoteAhead = remoteSchema > localSchema;
		return {
			compatible: false,
			syncAllowed: false,
			mode: "sync_deferred",
			reason: `Database schema mismatch: local schema v${localSchema} vs remote schema v${remoteSchema}`,
			warningBadge: {
				code: "INCOMPATIBLE_SCHEMA",
				title: "Несовпадение схемы базы данных",
				message: isRemoteAhead
					? `Узел сети имеет более новую схему БД (v${remoteSchema} против v${localSchema}). Мутации отложены во избежание повреждения базы данных. Обновите DENTE CRM.`
					: `Узел сети имеет устаревшую схему БД (v${remoteSchema} против v${localSchema}). Прямые мутации заблокированы для защиты целостности данных.`,
				level: "warning",
			},
		};
	}

	// 3. Application Version Semantic Compatibility Check
	const [localMajor, localMinor] = parseMeshSemver(local.appVersion);
	const [remoteMajor, remoteMinor] = parseMeshSemver(remote.appVersion);

	if (localMajor !== remoteMajor) {
		return {
			compatible: false,
			syncAllowed: false,
			mode: "read_only",
			reason: `Incompatible major application version: local v${local.appVersion} vs remote v${remote.appVersion}`,
			warningBadge: {
				code: "VERSION_MISMATCH",
				title: "Критическое несовпадение версий",
				message: `Версии приложений различаются (v${local.appVersion} и v${remote.appVersion}). Синхронизация переведена в безопасный режим чтения.`,
				level: "warning",
			},
		};
	}

	// Minor difference: compatible with mild notification if minor version differs
	if (localMinor !== remoteMinor) {
		return {
			compatible: true,
			syncAllowed: true,
			mode: "full_sync",
			reason: `Compatible schema v${localSchema}, minor application version delta (v${local.appVersion} vs v${remote.appVersion})`,
		};
	}

	return {
		compatible: true,
		syncAllowed: true,
		mode: "full_sync",
		reason: "Perfect schema and version match",
	};
}
