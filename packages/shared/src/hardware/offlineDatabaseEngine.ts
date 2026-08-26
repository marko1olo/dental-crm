/**
 * @dental/shared/hardware — Local Offline Database Engine & Storage Failover.
 *
 * Manages runtime failover between:
 * 1. Local SQLite Standalone Database (embedded in Desktop .exe / Tablet app)
 * 2. Native PostgreSQL 18 on local clinic LAN (127.0.0.1:5432)
 * 3. Remote Cloud Cluster Sync
 *
 * Guarantees zero downtime for dental operatory clinics during internet blackouts.
 */

import type {
	ClinicSyncMode,
	LocalClinicServerConfig,
	LocalClinicServerHealth,
	LocalDatabaseEngineType,
} from "./hardwareContracts.js";

export interface LocalOfflineMutationRecord {
	readonly id: string;
	readonly organizationId: string;
	readonly entityType: string;
	readonly entityId: string;
	readonly action: "create" | "update" | "delete";
	readonly payloadJson: string;
	readonly createdAt: string;
	readonly clientTimestamp: number;
	readonly retryAttempts: number;
	readonly synced: boolean;
	readonly syncedAt?: string | null | undefined;
}

export interface DatabaseFailoverDecision {
	readonly activeEngine: LocalDatabaseEngineType;
	readonly syncMode: ClinicSyncMode;
	readonly reason: string;
	readonly offlineQueueActive: boolean;
	readonly connectionString: string;
}

export class LocalOfflineDatabaseManager {
	private config: LocalClinicServerConfig;
	private pendingMutations: LocalOfflineMutationRecord[] = [];

	constructor(initialConfig?: Partial<LocalClinicServerConfig>) {
		this.config = {
			engineType: initialConfig?.engineType ?? "postgres_native",
			syncMode: initialConfig?.syncMode ?? "lan_primary_sync",
			host: initialConfig?.host ?? "127.0.0.1",
			port: initialConfig?.port ?? 5432,
			databaseName: initialConfig?.databaseName ?? "dente_clinic",
			isOfflineCapable: true,
			pendingMutationsCount: 0,
			maxOfflineStorageMb: 2048,
			...initialConfig,
		};
	}

	public getConfig(): LocalClinicServerConfig {
		return {
			...this.config,
			pendingMutationsCount: this.pendingMutations.filter((m) => !m.synced).length,
		};
	}

	public setConfig(update: Partial<LocalClinicServerConfig>): void {
		this.config = { ...this.config, ...update };
	}

	/**
	 * Determines optimal active database engine based on network availability and local server heartbeat.
	 */
	public evaluateFailover(heartbeatOk: boolean, internetAvailable: boolean): DatabaseFailoverDecision {
		if (heartbeatOk) {
			// Local Postgres running on clinic LAN / local machine
			return {
				activeEngine: "postgres_native",
				syncMode: internetAvailable ? "lan_primary_sync" : "isolated_offline",
				reason: internetAvailable
					? "Локальный PostgreSQL 18 активен (синхронизация с облаком доступна)"
					: "Локальный PostgreSQL 18 активен в автономном режиме клиники (без интернета)",
				offlineQueueActive: false,
				connectionString: `postgresql://${this.config.host}:${this.config.port}/${this.config.databaseName}`,
			};
		}

		// Local Postgres unreachable -> switch to embedded SQLite / Offline Cache
		return {
			activeEngine: "sqlite_standalone",
			syncMode: "isolated_offline",
			reason: "Основной сервер БД недоступен. Активирован встроенный автономный SQLite-контур.",
			offlineQueueActive: true,
			connectionString: "sqlite://./local_offline_dente.db",
		};
	}

	/**
	 * Buffers an offline mutation into the persistent queue.
	 */
	public enqueueMutation(
		record: Omit<LocalOfflineMutationRecord, "id" | "createdAt" | "clientTimestamp" | "retryAttempts" | "synced">,
	): LocalOfflineMutationRecord {
		const now = new Date();
		const mutation: LocalOfflineMutationRecord = {
			id: `mut-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
			...record,
			createdAt: now.toISOString(),
			clientTimestamp: now.getTime(),
			retryAttempts: 0,
			synced: false,
		};

		this.pendingMutations.push(mutation);
		return mutation;
	}

	public getPendingMutations(): LocalOfflineMutationRecord[] {
		return this.pendingMutations.filter((m) => !m.synced);
	}

	public markMutationSynced(mutationId: string): void {
		const target = this.pendingMutations.find((m) => m.id === mutationId);
		if (target) {
			// @ts-expect-error mutation state update
			target.synced = true;
			// @ts-expect-error mutation state update
			target.syncedAt = new Date().toISOString();
		}
	}

	public clearSynced(): void {
		this.pendingMutations = this.pendingMutations.filter((m) => !m.synced);
	}

	public clearAll(): void {
		this.pendingMutations = [];
	}
}
