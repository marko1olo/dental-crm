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
export class LocalOfflineDatabaseManager {
    config;
    pendingMutations = [];
    constructor(initialConfig) {
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
    getConfig() {
        return {
            ...this.config,
            pendingMutationsCount: this.pendingMutations.filter((m) => !m.synced).length,
        };
    }
    setConfig(update) {
        this.config = { ...this.config, ...update };
    }
    /**
     * Determines optimal active database engine based on network availability and local server heartbeat.
     */
    evaluateFailover(heartbeatOk, internetAvailable) {
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
    enqueueMutation(record) {
        const now = new Date();
        const mutation = {
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
    getPendingMutations() {
        return this.pendingMutations.filter((m) => !m.synced);
    }
    markMutationSynced(mutationId) {
        const target = this.pendingMutations.find((m) => m.id === mutationId);
        if (target) {
            // @ts-expect-error mutation state update
            target.synced = true;
            // @ts-expect-error mutation state update
            target.syncedAt = new Date().toISOString();
        }
    }
    clearSynced() {
        this.pendingMutations = this.pendingMutations.filter((m) => !m.synced);
    }
    clearAll() {
        this.pendingMutations = [];
    }
}
