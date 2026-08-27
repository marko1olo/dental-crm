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
import type { ClinicSyncMode, LocalClinicServerConfig, LocalDatabaseEngineType } from "./hardwareContracts.js";
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
export declare class LocalOfflineDatabaseManager {
    private config;
    private pendingMutations;
    constructor(initialConfig?: Partial<LocalClinicServerConfig>);
    getConfig(): LocalClinicServerConfig;
    setConfig(update: Partial<LocalClinicServerConfig>): void;
    /**
     * Determines optimal active database engine based on network availability and local server heartbeat.
     */
    evaluateFailover(heartbeatOk: boolean, internetAvailable: boolean): DatabaseFailoverDecision;
    /**
     * Buffers an offline mutation into the persistent queue.
     */
    enqueueMutation(record: Omit<LocalOfflineMutationRecord, "id" | "createdAt" | "clientTimestamp" | "retryAttempts" | "synced">): LocalOfflineMutationRecord;
    getPendingMutations(): LocalOfflineMutationRecord[];
    markMutationSynced(mutationId: string): void;
    clearSynced(): void;
    clearAll(): void;
}
