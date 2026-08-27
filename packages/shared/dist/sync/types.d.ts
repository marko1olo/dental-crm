import { z } from "zod";
export declare const syncMutationEntityKindSchema: z.ZodEnum<["patient", "visit", "visit_diary", "payment", "patient_invoice", "appointment", "treatment_item", "clinical_task", "odontogram_state", "patient_administrative_profile"]>;
export type SyncMutationEntityKind = z.infer<typeof syncMutationEntityKindSchema>;
export declare const syncMutationActionSchema: z.ZodEnum<["create", "update", "delete", "upsert"]>;
export type SyncMutationAction = z.infer<typeof syncMutationActionSchema>;
export declare const fieldVectorEntrySchema: z.ZodObject<{
    updatedAt: z.ZodString;
    version: z.ZodOptional<z.ZodNumber>;
    authorId: z.ZodOptional<z.ZodString>;
    clientId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    updatedAt: string;
    version?: number | undefined;
    authorId?: string | undefined;
    clientId?: string | undefined;
}, {
    updatedAt: string;
    version?: number | undefined;
    authorId?: string | undefined;
    clientId?: string | undefined;
}>;
export type FieldVectorEntry = z.infer<typeof fieldVectorEntrySchema>;
export declare const mutationVectorSchema: z.ZodRecord<z.ZodString, z.ZodObject<{
    updatedAt: z.ZodString;
    version: z.ZodOptional<z.ZodNumber>;
    authorId: z.ZodOptional<z.ZodString>;
    clientId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    updatedAt: string;
    version?: number | undefined;
    authorId?: string | undefined;
    clientId?: string | undefined;
}, {
    updatedAt: string;
    version?: number | undefined;
    authorId?: string | undefined;
    clientId?: string | undefined;
}>>;
export type MutationVector = z.infer<typeof mutationVectorSchema>;
export declare const vectorClockSchema: z.ZodRecord<z.ZodString, z.ZodNumber>;
export type VectorClock = z.infer<typeof vectorClockSchema>;
export declare const syncMutationEnvelopeSchema: z.ZodObject<{
    mutationId: z.ZodString;
    idempotencyKey: z.ZodString;
    payloadHash: z.ZodString;
    entityKind: z.ZodEnum<["patient", "visit", "visit_diary", "payment", "patient_invoice", "appointment", "treatment_item", "clinical_task", "odontogram_state", "patient_administrative_profile"]>;
    entityId: z.ZodString;
    action: z.ZodEnum<["create", "update", "delete", "upsert"]>;
    payload: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    updatedAt: z.ZodString;
    mutationVector: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
        updatedAt: z.ZodString;
        version: z.ZodOptional<z.ZodNumber>;
        authorId: z.ZodOptional<z.ZodString>;
        clientId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        updatedAt: string;
        version?: number | undefined;
        authorId?: string | undefined;
        clientId?: string | undefined;
    }, {
        updatedAt: string;
        version?: number | undefined;
        authorId?: string | undefined;
        clientId?: string | undefined;
    }>>>;
    vectorClock: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodNumber>>;
    clientId: z.ZodOptional<z.ZodString>;
    authorUserId: z.ZodOptional<z.ZodString>;
    baseVersion: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    updatedAt: string;
    mutationId: string;
    idempotencyKey: string;
    payloadHash: string;
    entityKind: "payment" | "patient" | "visit" | "visit_diary" | "patient_invoice" | "appointment" | "treatment_item" | "clinical_task" | "odontogram_state" | "patient_administrative_profile";
    entityId: string;
    action: "create" | "update" | "delete" | "upsert";
    payload: Record<string, unknown>;
    clientId?: string | undefined;
    mutationVector?: Record<string, {
        updatedAt: string;
        version?: number | undefined;
        authorId?: string | undefined;
        clientId?: string | undefined;
    }> | undefined;
    vectorClock?: Record<string, number> | undefined;
    authorUserId?: string | undefined;
    baseVersion?: number | undefined;
}, {
    updatedAt: string;
    mutationId: string;
    idempotencyKey: string;
    payloadHash: string;
    entityKind: "payment" | "patient" | "visit" | "visit_diary" | "patient_invoice" | "appointment" | "treatment_item" | "clinical_task" | "odontogram_state" | "patient_administrative_profile";
    entityId: string;
    action: "create" | "update" | "delete" | "upsert";
    payload: Record<string, unknown>;
    clientId?: string | undefined;
    mutationVector?: Record<string, {
        updatedAt: string;
        version?: number | undefined;
        authorId?: string | undefined;
        clientId?: string | undefined;
    }> | undefined;
    vectorClock?: Record<string, number> | undefined;
    authorUserId?: string | undefined;
    baseVersion?: number | undefined;
}>;
export type SyncMutationEnvelope = z.infer<typeof syncMutationEnvelopeSchema>;
export declare const syncPushBatchRequestSchema: z.ZodObject<{
    syncBatchId: z.ZodString;
    clientId: z.ZodString;
    mutations: z.ZodArray<z.ZodObject<{
        mutationId: z.ZodString;
        idempotencyKey: z.ZodString;
        payloadHash: z.ZodString;
        entityKind: z.ZodEnum<["patient", "visit", "visit_diary", "payment", "patient_invoice", "appointment", "treatment_item", "clinical_task", "odontogram_state", "patient_administrative_profile"]>;
        entityId: z.ZodString;
        action: z.ZodEnum<["create", "update", "delete", "upsert"]>;
        payload: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        updatedAt: z.ZodString;
        mutationVector: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
            updatedAt: z.ZodString;
            version: z.ZodOptional<z.ZodNumber>;
            authorId: z.ZodOptional<z.ZodString>;
            clientId: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            updatedAt: string;
            version?: number | undefined;
            authorId?: string | undefined;
            clientId?: string | undefined;
        }, {
            updatedAt: string;
            version?: number | undefined;
            authorId?: string | undefined;
            clientId?: string | undefined;
        }>>>;
        vectorClock: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodNumber>>;
        clientId: z.ZodOptional<z.ZodString>;
        authorUserId: z.ZodOptional<z.ZodString>;
        baseVersion: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        updatedAt: string;
        mutationId: string;
        idempotencyKey: string;
        payloadHash: string;
        entityKind: "payment" | "patient" | "visit" | "visit_diary" | "patient_invoice" | "appointment" | "treatment_item" | "clinical_task" | "odontogram_state" | "patient_administrative_profile";
        entityId: string;
        action: "create" | "update" | "delete" | "upsert";
        payload: Record<string, unknown>;
        clientId?: string | undefined;
        mutationVector?: Record<string, {
            updatedAt: string;
            version?: number | undefined;
            authorId?: string | undefined;
            clientId?: string | undefined;
        }> | undefined;
        vectorClock?: Record<string, number> | undefined;
        authorUserId?: string | undefined;
        baseVersion?: number | undefined;
    }, {
        updatedAt: string;
        mutationId: string;
        idempotencyKey: string;
        payloadHash: string;
        entityKind: "payment" | "patient" | "visit" | "visit_diary" | "patient_invoice" | "appointment" | "treatment_item" | "clinical_task" | "odontogram_state" | "patient_administrative_profile";
        entityId: string;
        action: "create" | "update" | "delete" | "upsert";
        payload: Record<string, unknown>;
        clientId?: string | undefined;
        mutationVector?: Record<string, {
            updatedAt: string;
            version?: number | undefined;
            authorId?: string | undefined;
            clientId?: string | undefined;
        }> | undefined;
        vectorClock?: Record<string, number> | undefined;
        authorUserId?: string | undefined;
        baseVersion?: number | undefined;
    }>, "many">;
    sentAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    clientId: string;
    syncBatchId: string;
    mutations: {
        updatedAt: string;
        mutationId: string;
        idempotencyKey: string;
        payloadHash: string;
        entityKind: "payment" | "patient" | "visit" | "visit_diary" | "patient_invoice" | "appointment" | "treatment_item" | "clinical_task" | "odontogram_state" | "patient_administrative_profile";
        entityId: string;
        action: "create" | "update" | "delete" | "upsert";
        payload: Record<string, unknown>;
        clientId?: string | undefined;
        mutationVector?: Record<string, {
            updatedAt: string;
            version?: number | undefined;
            authorId?: string | undefined;
            clientId?: string | undefined;
        }> | undefined;
        vectorClock?: Record<string, number> | undefined;
        authorUserId?: string | undefined;
        baseVersion?: number | undefined;
    }[];
    sentAt: string;
}, {
    clientId: string;
    syncBatchId: string;
    mutations: {
        updatedAt: string;
        mutationId: string;
        idempotencyKey: string;
        payloadHash: string;
        entityKind: "payment" | "patient" | "visit" | "visit_diary" | "patient_invoice" | "appointment" | "treatment_item" | "clinical_task" | "odontogram_state" | "patient_administrative_profile";
        entityId: string;
        action: "create" | "update" | "delete" | "upsert";
        payload: Record<string, unknown>;
        clientId?: string | undefined;
        mutationVector?: Record<string, {
            updatedAt: string;
            version?: number | undefined;
            authorId?: string | undefined;
            clientId?: string | undefined;
        }> | undefined;
        vectorClock?: Record<string, number> | undefined;
        authorUserId?: string | undefined;
        baseVersion?: number | undefined;
    }[];
    sentAt: string;
}>;
export type SyncPushBatchRequest = z.infer<typeof syncPushBatchRequestSchema>;
export declare const conflictResolutionStrategySchema: z.ZodEnum<["field_merge", "lww", "crdt", "idempotent_replay", "status_priority", "rejected"]>;
export type ConflictResolutionStrategy = z.infer<typeof conflictResolutionStrategySchema>;
export declare const fieldConflictDetailSchema: z.ZodObject<{
    field: z.ZodString;
    clientValue: z.ZodUnknown;
    serverValue: z.ZodUnknown;
    resolvedValue: z.ZodUnknown;
    strategy: z.ZodEnum<["field_merge", "lww", "crdt", "idempotent_replay", "status_priority", "rejected"]>;
    winner: z.ZodEnum<["client", "server", "merged"]>;
    reason: z.ZodString;
}, "strip", z.ZodTypeAny, {
    reason: string;
    field: string;
    strategy: "rejected" | "field_merge" | "lww" | "crdt" | "idempotent_replay" | "status_priority";
    winner: "client" | "server" | "merged";
    clientValue?: unknown;
    serverValue?: unknown;
    resolvedValue?: unknown;
}, {
    reason: string;
    field: string;
    strategy: "rejected" | "field_merge" | "lww" | "crdt" | "idempotent_replay" | "status_priority";
    winner: "client" | "server" | "merged";
    clientValue?: unknown;
    serverValue?: unknown;
    resolvedValue?: unknown;
}>;
export type FieldConflictDetail = z.infer<typeof fieldConflictDetailSchema>;
export declare const syncMutationStatusSchema: z.ZodEnum<["applied", "duplicate", "merged", "conflict_resolved", "rejected"]>;
export type SyncMutationStatus = z.infer<typeof syncMutationStatusSchema>;
export declare const syncMutationResultSchema: z.ZodObject<{
    mutationId: z.ZodString;
    idempotencyKey: z.ZodString;
    status: z.ZodEnum<["applied", "duplicate", "merged", "conflict_resolved", "rejected"]>;
    entityKind: z.ZodEnum<["patient", "visit", "visit_diary", "payment", "patient_invoice", "appointment", "treatment_item", "clinical_task", "odontogram_state", "patient_administrative_profile"]>;
    entityId: z.ZodString;
    appliedAt: z.ZodString;
    mergedFields: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    conflictDetails: z.ZodOptional<z.ZodArray<z.ZodObject<{
        field: z.ZodString;
        clientValue: z.ZodUnknown;
        serverValue: z.ZodUnknown;
        resolvedValue: z.ZodUnknown;
        strategy: z.ZodEnum<["field_merge", "lww", "crdt", "idempotent_replay", "status_priority", "rejected"]>;
        winner: z.ZodEnum<["client", "server", "merged"]>;
        reason: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        reason: string;
        field: string;
        strategy: "rejected" | "field_merge" | "lww" | "crdt" | "idempotent_replay" | "status_priority";
        winner: "client" | "server" | "merged";
        clientValue?: unknown;
        serverValue?: unknown;
        resolvedValue?: unknown;
    }, {
        reason: string;
        field: string;
        strategy: "rejected" | "field_merge" | "lww" | "crdt" | "idempotent_replay" | "status_priority";
        winner: "client" | "server" | "merged";
        clientValue?: unknown;
        serverValue?: unknown;
        resolvedValue?: unknown;
    }>, "many">>;
    currentServerEntity: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    error: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "rejected" | "merged" | "applied" | "duplicate" | "conflict_resolved";
    mutationId: string;
    idempotencyKey: string;
    entityKind: "payment" | "patient" | "visit" | "visit_diary" | "patient_invoice" | "appointment" | "treatment_item" | "clinical_task" | "odontogram_state" | "patient_administrative_profile";
    entityId: string;
    appliedAt: string;
    error?: string | undefined;
    mergedFields?: string[] | undefined;
    conflictDetails?: {
        reason: string;
        field: string;
        strategy: "rejected" | "field_merge" | "lww" | "crdt" | "idempotent_replay" | "status_priority";
        winner: "client" | "server" | "merged";
        clientValue?: unknown;
        serverValue?: unknown;
        resolvedValue?: unknown;
    }[] | undefined;
    currentServerEntity?: Record<string, unknown> | undefined;
}, {
    status: "rejected" | "merged" | "applied" | "duplicate" | "conflict_resolved";
    mutationId: string;
    idempotencyKey: string;
    entityKind: "payment" | "patient" | "visit" | "visit_diary" | "patient_invoice" | "appointment" | "treatment_item" | "clinical_task" | "odontogram_state" | "patient_administrative_profile";
    entityId: string;
    appliedAt: string;
    error?: string | undefined;
    mergedFields?: string[] | undefined;
    conflictDetails?: {
        reason: string;
        field: string;
        strategy: "rejected" | "field_merge" | "lww" | "crdt" | "idempotent_replay" | "status_priority";
        winner: "client" | "server" | "merged";
        clientValue?: unknown;
        serverValue?: unknown;
        resolvedValue?: unknown;
    }[] | undefined;
    currentServerEntity?: Record<string, unknown> | undefined;
}>;
export type SyncMutationResult = z.infer<typeof syncMutationResultSchema>;
export declare const syncPushBatchResponseSchema: z.ZodObject<{
    syncBatchId: z.ZodString;
    processedCount: z.ZodNumber;
    appliedCount: z.ZodNumber;
    duplicateCount: z.ZodNumber;
    mergedCount: z.ZodNumber;
    rejectedCount: z.ZodNumber;
    results: z.ZodArray<z.ZodObject<{
        mutationId: z.ZodString;
        idempotencyKey: z.ZodString;
        status: z.ZodEnum<["applied", "duplicate", "merged", "conflict_resolved", "rejected"]>;
        entityKind: z.ZodEnum<["patient", "visit", "visit_diary", "payment", "patient_invoice", "appointment", "treatment_item", "clinical_task", "odontogram_state", "patient_administrative_profile"]>;
        entityId: z.ZodString;
        appliedAt: z.ZodString;
        mergedFields: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        conflictDetails: z.ZodOptional<z.ZodArray<z.ZodObject<{
            field: z.ZodString;
            clientValue: z.ZodUnknown;
            serverValue: z.ZodUnknown;
            resolvedValue: z.ZodUnknown;
            strategy: z.ZodEnum<["field_merge", "lww", "crdt", "idempotent_replay", "status_priority", "rejected"]>;
            winner: z.ZodEnum<["client", "server", "merged"]>;
            reason: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            reason: string;
            field: string;
            strategy: "rejected" | "field_merge" | "lww" | "crdt" | "idempotent_replay" | "status_priority";
            winner: "client" | "server" | "merged";
            clientValue?: unknown;
            serverValue?: unknown;
            resolvedValue?: unknown;
        }, {
            reason: string;
            field: string;
            strategy: "rejected" | "field_merge" | "lww" | "crdt" | "idempotent_replay" | "status_priority";
            winner: "client" | "server" | "merged";
            clientValue?: unknown;
            serverValue?: unknown;
            resolvedValue?: unknown;
        }>, "many">>;
        currentServerEntity: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        error: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        status: "rejected" | "merged" | "applied" | "duplicate" | "conflict_resolved";
        mutationId: string;
        idempotencyKey: string;
        entityKind: "payment" | "patient" | "visit" | "visit_diary" | "patient_invoice" | "appointment" | "treatment_item" | "clinical_task" | "odontogram_state" | "patient_administrative_profile";
        entityId: string;
        appliedAt: string;
        error?: string | undefined;
        mergedFields?: string[] | undefined;
        conflictDetails?: {
            reason: string;
            field: string;
            strategy: "rejected" | "field_merge" | "lww" | "crdt" | "idempotent_replay" | "status_priority";
            winner: "client" | "server" | "merged";
            clientValue?: unknown;
            serverValue?: unknown;
            resolvedValue?: unknown;
        }[] | undefined;
        currentServerEntity?: Record<string, unknown> | undefined;
    }, {
        status: "rejected" | "merged" | "applied" | "duplicate" | "conflict_resolved";
        mutationId: string;
        idempotencyKey: string;
        entityKind: "payment" | "patient" | "visit" | "visit_diary" | "patient_invoice" | "appointment" | "treatment_item" | "clinical_task" | "odontogram_state" | "patient_administrative_profile";
        entityId: string;
        appliedAt: string;
        error?: string | undefined;
        mergedFields?: string[] | undefined;
        conflictDetails?: {
            reason: string;
            field: string;
            strategy: "rejected" | "field_merge" | "lww" | "crdt" | "idempotent_replay" | "status_priority";
            winner: "client" | "server" | "merged";
            clientValue?: unknown;
            serverValue?: unknown;
            resolvedValue?: unknown;
        }[] | undefined;
        currentServerEntity?: Record<string, unknown> | undefined;
    }>, "many">;
    serverTime: z.ZodString;
}, "strip", z.ZodTypeAny, {
    syncBatchId: string;
    processedCount: number;
    appliedCount: number;
    duplicateCount: number;
    mergedCount: number;
    rejectedCount: number;
    results: {
        status: "rejected" | "merged" | "applied" | "duplicate" | "conflict_resolved";
        mutationId: string;
        idempotencyKey: string;
        entityKind: "payment" | "patient" | "visit" | "visit_diary" | "patient_invoice" | "appointment" | "treatment_item" | "clinical_task" | "odontogram_state" | "patient_administrative_profile";
        entityId: string;
        appliedAt: string;
        error?: string | undefined;
        mergedFields?: string[] | undefined;
        conflictDetails?: {
            reason: string;
            field: string;
            strategy: "rejected" | "field_merge" | "lww" | "crdt" | "idempotent_replay" | "status_priority";
            winner: "client" | "server" | "merged";
            clientValue?: unknown;
            serverValue?: unknown;
            resolvedValue?: unknown;
        }[] | undefined;
        currentServerEntity?: Record<string, unknown> | undefined;
    }[];
    serverTime: string;
}, {
    syncBatchId: string;
    processedCount: number;
    appliedCount: number;
    duplicateCount: number;
    mergedCount: number;
    rejectedCount: number;
    results: {
        status: "rejected" | "merged" | "applied" | "duplicate" | "conflict_resolved";
        mutationId: string;
        idempotencyKey: string;
        entityKind: "payment" | "patient" | "visit" | "visit_diary" | "patient_invoice" | "appointment" | "treatment_item" | "clinical_task" | "odontogram_state" | "patient_administrative_profile";
        entityId: string;
        appliedAt: string;
        error?: string | undefined;
        mergedFields?: string[] | undefined;
        conflictDetails?: {
            reason: string;
            field: string;
            strategy: "rejected" | "field_merge" | "lww" | "crdt" | "idempotent_replay" | "status_priority";
            winner: "client" | "server" | "merged";
            clientValue?: unknown;
            serverValue?: unknown;
            resolvedValue?: unknown;
        }[] | undefined;
        currentServerEntity?: Record<string, unknown> | undefined;
    }[];
    serverTime: string;
}>;
export type SyncPushBatchResponse = z.infer<typeof syncPushBatchResponseSchema>;
export declare const lanNodeRoleSchema: z.ZodEnum<["primary_server", "reception_workstation", "doctor_tablet", "autonomous_workstation", "diagnostics_pc"]>;
export type LanNodeRole = z.infer<typeof lanNodeRoleSchema>;
export declare const syncTierModeSchema: z.ZodEnum<["cloud_postgresql", "lan_local_mesh", "autonomous_offline"]>;
export type SyncTierMode = z.infer<typeof syncTierModeSchema>;
export declare const lanMeshNodeSchema: z.ZodObject<{
    nodeId: z.ZodString;
    role: z.ZodEnum<["primary_server", "reception_workstation", "doctor_tablet", "autonomous_workstation", "diagnostics_pc"]>;
    name: z.ZodString;
    baseUrl: z.ZodString;
    ipAddresses: z.ZodArray<z.ZodString, "many">;
    port: z.ZodNumber;
    lastSeenIso: z.ZodString;
    latencyMs: z.ZodOptional<z.ZodNumber>;
    vectorClock: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodNumber>>;
    status: z.ZodDefault<z.ZodEnum<["online", "busy", "degraded", "offline"]>>;
    organizationId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "online" | "busy" | "degraded" | "offline";
    name: string;
    port: number;
    nodeId: string;
    role: "primary_server" | "reception_workstation" | "doctor_tablet" | "autonomous_workstation" | "diagnostics_pc";
    baseUrl: string;
    ipAddresses: string[];
    lastSeenIso: string;
    organizationId?: string | undefined;
    vectorClock?: Record<string, number> | undefined;
    latencyMs?: number | undefined;
}, {
    name: string;
    port: number;
    nodeId: string;
    role: "primary_server" | "reception_workstation" | "doctor_tablet" | "autonomous_workstation" | "diagnostics_pc";
    baseUrl: string;
    ipAddresses: string[];
    lastSeenIso: string;
    status?: "online" | "busy" | "degraded" | "offline" | undefined;
    organizationId?: string | undefined;
    vectorClock?: Record<string, number> | undefined;
    latencyMs?: number | undefined;
}>;
export type LanMeshNode = z.infer<typeof lanMeshNodeSchema>;
export declare const lanDiscoveryBeaconSchema: z.ZodObject<{
    protocolVersion: z.ZodDefault<z.ZodString>;
    serverName: z.ZodString;
    serverId: z.ZodString;
    role: z.ZodEnum<["primary_server", "reception_workstation", "doctor_tablet", "autonomous_workstation", "diagnostics_pc"]>;
    baseUrl: z.ZodString;
    apiPort: z.ZodNumber;
    lanAddresses: z.ZodArray<z.ZodString, "many">;
    timestamp: z.ZodString;
    organizationId: z.ZodOptional<z.ZodString>;
    activeSyncTier: z.ZodDefault<z.ZodEnum<["cloud_postgresql", "lan_local_mesh", "autonomous_offline"]>>;
    signature: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    timestamp: string;
    role: "primary_server" | "reception_workstation" | "doctor_tablet" | "autonomous_workstation" | "diagnostics_pc";
    baseUrl: string;
    protocolVersion: string;
    serverName: string;
    serverId: string;
    apiPort: number;
    lanAddresses: string[];
    activeSyncTier: "cloud_postgresql" | "lan_local_mesh" | "autonomous_offline";
    signature?: string | undefined;
    organizationId?: string | undefined;
}, {
    timestamp: string;
    role: "primary_server" | "reception_workstation" | "doctor_tablet" | "autonomous_workstation" | "diagnostics_pc";
    baseUrl: string;
    serverName: string;
    serverId: string;
    apiPort: number;
    lanAddresses: string[];
    signature?: string | undefined;
    organizationId?: string | undefined;
    protocolVersion?: string | undefined;
    activeSyncTier?: "cloud_postgresql" | "lan_local_mesh" | "autonomous_offline" | undefined;
}>;
export type LanDiscoveryBeacon = z.infer<typeof lanDiscoveryBeaconSchema>;
export declare const meshSyncExchangeRequestSchema: z.ZodObject<{
    exchangeId: z.ZodString;
    senderNodeId: z.ZodString;
    senderRole: z.ZodEnum<["primary_server", "reception_workstation", "doctor_tablet", "autonomous_workstation", "diagnostics_pc"]>;
    senderVectorClock: z.ZodRecord<z.ZodString, z.ZodNumber>;
    mutations: z.ZodArray<z.ZodObject<{
        mutationId: z.ZodString;
        idempotencyKey: z.ZodString;
        payloadHash: z.ZodString;
        entityKind: z.ZodEnum<["patient", "visit", "visit_diary", "payment", "patient_invoice", "appointment", "treatment_item", "clinical_task", "odontogram_state", "patient_administrative_profile"]>;
        entityId: z.ZodString;
        action: z.ZodEnum<["create", "update", "delete", "upsert"]>;
        payload: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        updatedAt: z.ZodString;
        mutationVector: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
            updatedAt: z.ZodString;
            version: z.ZodOptional<z.ZodNumber>;
            authorId: z.ZodOptional<z.ZodString>;
            clientId: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            updatedAt: string;
            version?: number | undefined;
            authorId?: string | undefined;
            clientId?: string | undefined;
        }, {
            updatedAt: string;
            version?: number | undefined;
            authorId?: string | undefined;
            clientId?: string | undefined;
        }>>>;
        vectorClock: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodNumber>>;
        clientId: z.ZodOptional<z.ZodString>;
        authorUserId: z.ZodOptional<z.ZodString>;
        baseVersion: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        updatedAt: string;
        mutationId: string;
        idempotencyKey: string;
        payloadHash: string;
        entityKind: "payment" | "patient" | "visit" | "visit_diary" | "patient_invoice" | "appointment" | "treatment_item" | "clinical_task" | "odontogram_state" | "patient_administrative_profile";
        entityId: string;
        action: "create" | "update" | "delete" | "upsert";
        payload: Record<string, unknown>;
        clientId?: string | undefined;
        mutationVector?: Record<string, {
            updatedAt: string;
            version?: number | undefined;
            authorId?: string | undefined;
            clientId?: string | undefined;
        }> | undefined;
        vectorClock?: Record<string, number> | undefined;
        authorUserId?: string | undefined;
        baseVersion?: number | undefined;
    }, {
        updatedAt: string;
        mutationId: string;
        idempotencyKey: string;
        payloadHash: string;
        entityKind: "payment" | "patient" | "visit" | "visit_diary" | "patient_invoice" | "appointment" | "treatment_item" | "clinical_task" | "odontogram_state" | "patient_administrative_profile";
        entityId: string;
        action: "create" | "update" | "delete" | "upsert";
        payload: Record<string, unknown>;
        clientId?: string | undefined;
        mutationVector?: Record<string, {
            updatedAt: string;
            version?: number | undefined;
            authorId?: string | undefined;
            clientId?: string | undefined;
        }> | undefined;
        vectorClock?: Record<string, number> | undefined;
        authorUserId?: string | undefined;
        baseVersion?: number | undefined;
    }>, "many">;
    sentAt: z.ZodString;
    organizationId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    mutations: {
        updatedAt: string;
        mutationId: string;
        idempotencyKey: string;
        payloadHash: string;
        entityKind: "payment" | "patient" | "visit" | "visit_diary" | "patient_invoice" | "appointment" | "treatment_item" | "clinical_task" | "odontogram_state" | "patient_administrative_profile";
        entityId: string;
        action: "create" | "update" | "delete" | "upsert";
        payload: Record<string, unknown>;
        clientId?: string | undefined;
        mutationVector?: Record<string, {
            updatedAt: string;
            version?: number | undefined;
            authorId?: string | undefined;
            clientId?: string | undefined;
        }> | undefined;
        vectorClock?: Record<string, number> | undefined;
        authorUserId?: string | undefined;
        baseVersion?: number | undefined;
    }[];
    sentAt: string;
    exchangeId: string;
    senderNodeId: string;
    senderRole: "primary_server" | "reception_workstation" | "doctor_tablet" | "autonomous_workstation" | "diagnostics_pc";
    senderVectorClock: Record<string, number>;
    organizationId?: string | undefined;
}, {
    mutations: {
        updatedAt: string;
        mutationId: string;
        idempotencyKey: string;
        payloadHash: string;
        entityKind: "payment" | "patient" | "visit" | "visit_diary" | "patient_invoice" | "appointment" | "treatment_item" | "clinical_task" | "odontogram_state" | "patient_administrative_profile";
        entityId: string;
        action: "create" | "update" | "delete" | "upsert";
        payload: Record<string, unknown>;
        clientId?: string | undefined;
        mutationVector?: Record<string, {
            updatedAt: string;
            version?: number | undefined;
            authorId?: string | undefined;
            clientId?: string | undefined;
        }> | undefined;
        vectorClock?: Record<string, number> | undefined;
        authorUserId?: string | undefined;
        baseVersion?: number | undefined;
    }[];
    sentAt: string;
    exchangeId: string;
    senderNodeId: string;
    senderRole: "primary_server" | "reception_workstation" | "doctor_tablet" | "autonomous_workstation" | "diagnostics_pc";
    senderVectorClock: Record<string, number>;
    organizationId?: string | undefined;
}>;
export type MeshSyncExchangeRequest = z.infer<typeof meshSyncExchangeRequestSchema>;
export declare const meshSyncExchangeResponseSchema: z.ZodObject<{
    exchangeId: z.ZodString;
    responderNodeId: z.ZodString;
    responderVectorClock: z.ZodRecord<z.ZodString, z.ZodNumber>;
    processedMutationsCount: z.ZodNumber;
    appliedMutationsCount: z.ZodNumber;
    mergedMutationsCount: z.ZodNumber;
    duplicateMutationsCount: z.ZodNumber;
    returnMutations: z.ZodDefault<z.ZodArray<z.ZodObject<{
        mutationId: z.ZodString;
        idempotencyKey: z.ZodString;
        payloadHash: z.ZodString;
        entityKind: z.ZodEnum<["patient", "visit", "visit_diary", "payment", "patient_invoice", "appointment", "treatment_item", "clinical_task", "odontogram_state", "patient_administrative_profile"]>;
        entityId: z.ZodString;
        action: z.ZodEnum<["create", "update", "delete", "upsert"]>;
        payload: z.ZodRecord<z.ZodString, z.ZodUnknown>;
        updatedAt: z.ZodString;
        mutationVector: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodObject<{
            updatedAt: z.ZodString;
            version: z.ZodOptional<z.ZodNumber>;
            authorId: z.ZodOptional<z.ZodString>;
            clientId: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            updatedAt: string;
            version?: number | undefined;
            authorId?: string | undefined;
            clientId?: string | undefined;
        }, {
            updatedAt: string;
            version?: number | undefined;
            authorId?: string | undefined;
            clientId?: string | undefined;
        }>>>;
        vectorClock: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodNumber>>;
        clientId: z.ZodOptional<z.ZodString>;
        authorUserId: z.ZodOptional<z.ZodString>;
        baseVersion: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        updatedAt: string;
        mutationId: string;
        idempotencyKey: string;
        payloadHash: string;
        entityKind: "payment" | "patient" | "visit" | "visit_diary" | "patient_invoice" | "appointment" | "treatment_item" | "clinical_task" | "odontogram_state" | "patient_administrative_profile";
        entityId: string;
        action: "create" | "update" | "delete" | "upsert";
        payload: Record<string, unknown>;
        clientId?: string | undefined;
        mutationVector?: Record<string, {
            updatedAt: string;
            version?: number | undefined;
            authorId?: string | undefined;
            clientId?: string | undefined;
        }> | undefined;
        vectorClock?: Record<string, number> | undefined;
        authorUserId?: string | undefined;
        baseVersion?: number | undefined;
    }, {
        updatedAt: string;
        mutationId: string;
        idempotencyKey: string;
        payloadHash: string;
        entityKind: "payment" | "patient" | "visit" | "visit_diary" | "patient_invoice" | "appointment" | "treatment_item" | "clinical_task" | "odontogram_state" | "patient_administrative_profile";
        entityId: string;
        action: "create" | "update" | "delete" | "upsert";
        payload: Record<string, unknown>;
        clientId?: string | undefined;
        mutationVector?: Record<string, {
            updatedAt: string;
            version?: number | undefined;
            authorId?: string | undefined;
            clientId?: string | undefined;
        }> | undefined;
        vectorClock?: Record<string, number> | undefined;
        authorUserId?: string | undefined;
        baseVersion?: number | undefined;
    }>, "many">>;
    results: z.ZodArray<z.ZodObject<{
        mutationId: z.ZodString;
        idempotencyKey: z.ZodString;
        status: z.ZodEnum<["applied", "duplicate", "merged", "conflict_resolved", "rejected"]>;
        entityKind: z.ZodEnum<["patient", "visit", "visit_diary", "payment", "patient_invoice", "appointment", "treatment_item", "clinical_task", "odontogram_state", "patient_administrative_profile"]>;
        entityId: z.ZodString;
        appliedAt: z.ZodString;
        mergedFields: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        conflictDetails: z.ZodOptional<z.ZodArray<z.ZodObject<{
            field: z.ZodString;
            clientValue: z.ZodUnknown;
            serverValue: z.ZodUnknown;
            resolvedValue: z.ZodUnknown;
            strategy: z.ZodEnum<["field_merge", "lww", "crdt", "idempotent_replay", "status_priority", "rejected"]>;
            winner: z.ZodEnum<["client", "server", "merged"]>;
            reason: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            reason: string;
            field: string;
            strategy: "rejected" | "field_merge" | "lww" | "crdt" | "idempotent_replay" | "status_priority";
            winner: "client" | "server" | "merged";
            clientValue?: unknown;
            serverValue?: unknown;
            resolvedValue?: unknown;
        }, {
            reason: string;
            field: string;
            strategy: "rejected" | "field_merge" | "lww" | "crdt" | "idempotent_replay" | "status_priority";
            winner: "client" | "server" | "merged";
            clientValue?: unknown;
            serverValue?: unknown;
            resolvedValue?: unknown;
        }>, "many">>;
        currentServerEntity: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        error: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        status: "rejected" | "merged" | "applied" | "duplicate" | "conflict_resolved";
        mutationId: string;
        idempotencyKey: string;
        entityKind: "payment" | "patient" | "visit" | "visit_diary" | "patient_invoice" | "appointment" | "treatment_item" | "clinical_task" | "odontogram_state" | "patient_administrative_profile";
        entityId: string;
        appliedAt: string;
        error?: string | undefined;
        mergedFields?: string[] | undefined;
        conflictDetails?: {
            reason: string;
            field: string;
            strategy: "rejected" | "field_merge" | "lww" | "crdt" | "idempotent_replay" | "status_priority";
            winner: "client" | "server" | "merged";
            clientValue?: unknown;
            serverValue?: unknown;
            resolvedValue?: unknown;
        }[] | undefined;
        currentServerEntity?: Record<string, unknown> | undefined;
    }, {
        status: "rejected" | "merged" | "applied" | "duplicate" | "conflict_resolved";
        mutationId: string;
        idempotencyKey: string;
        entityKind: "payment" | "patient" | "visit" | "visit_diary" | "patient_invoice" | "appointment" | "treatment_item" | "clinical_task" | "odontogram_state" | "patient_administrative_profile";
        entityId: string;
        appliedAt: string;
        error?: string | undefined;
        mergedFields?: string[] | undefined;
        conflictDetails?: {
            reason: string;
            field: string;
            strategy: "rejected" | "field_merge" | "lww" | "crdt" | "idempotent_replay" | "status_priority";
            winner: "client" | "server" | "merged";
            clientValue?: unknown;
            serverValue?: unknown;
            resolvedValue?: unknown;
        }[] | undefined;
        currentServerEntity?: Record<string, unknown> | undefined;
    }>, "many">;
    responderTime: z.ZodString;
}, "strip", z.ZodTypeAny, {
    results: {
        status: "rejected" | "merged" | "applied" | "duplicate" | "conflict_resolved";
        mutationId: string;
        idempotencyKey: string;
        entityKind: "payment" | "patient" | "visit" | "visit_diary" | "patient_invoice" | "appointment" | "treatment_item" | "clinical_task" | "odontogram_state" | "patient_administrative_profile";
        entityId: string;
        appliedAt: string;
        error?: string | undefined;
        mergedFields?: string[] | undefined;
        conflictDetails?: {
            reason: string;
            field: string;
            strategy: "rejected" | "field_merge" | "lww" | "crdt" | "idempotent_replay" | "status_priority";
            winner: "client" | "server" | "merged";
            clientValue?: unknown;
            serverValue?: unknown;
            resolvedValue?: unknown;
        }[] | undefined;
        currentServerEntity?: Record<string, unknown> | undefined;
    }[];
    exchangeId: string;
    responderNodeId: string;
    responderVectorClock: Record<string, number>;
    processedMutationsCount: number;
    appliedMutationsCount: number;
    mergedMutationsCount: number;
    duplicateMutationsCount: number;
    returnMutations: {
        updatedAt: string;
        mutationId: string;
        idempotencyKey: string;
        payloadHash: string;
        entityKind: "payment" | "patient" | "visit" | "visit_diary" | "patient_invoice" | "appointment" | "treatment_item" | "clinical_task" | "odontogram_state" | "patient_administrative_profile";
        entityId: string;
        action: "create" | "update" | "delete" | "upsert";
        payload: Record<string, unknown>;
        clientId?: string | undefined;
        mutationVector?: Record<string, {
            updatedAt: string;
            version?: number | undefined;
            authorId?: string | undefined;
            clientId?: string | undefined;
        }> | undefined;
        vectorClock?: Record<string, number> | undefined;
        authorUserId?: string | undefined;
        baseVersion?: number | undefined;
    }[];
    responderTime: string;
}, {
    results: {
        status: "rejected" | "merged" | "applied" | "duplicate" | "conflict_resolved";
        mutationId: string;
        idempotencyKey: string;
        entityKind: "payment" | "patient" | "visit" | "visit_diary" | "patient_invoice" | "appointment" | "treatment_item" | "clinical_task" | "odontogram_state" | "patient_administrative_profile";
        entityId: string;
        appliedAt: string;
        error?: string | undefined;
        mergedFields?: string[] | undefined;
        conflictDetails?: {
            reason: string;
            field: string;
            strategy: "rejected" | "field_merge" | "lww" | "crdt" | "idempotent_replay" | "status_priority";
            winner: "client" | "server" | "merged";
            clientValue?: unknown;
            serverValue?: unknown;
            resolvedValue?: unknown;
        }[] | undefined;
        currentServerEntity?: Record<string, unknown> | undefined;
    }[];
    exchangeId: string;
    responderNodeId: string;
    responderVectorClock: Record<string, number>;
    processedMutationsCount: number;
    appliedMutationsCount: number;
    mergedMutationsCount: number;
    duplicateMutationsCount: number;
    responderTime: string;
    returnMutations?: {
        updatedAt: string;
        mutationId: string;
        idempotencyKey: string;
        payloadHash: string;
        entityKind: "payment" | "patient" | "visit" | "visit_diary" | "patient_invoice" | "appointment" | "treatment_item" | "clinical_task" | "odontogram_state" | "patient_administrative_profile";
        entityId: string;
        action: "create" | "update" | "delete" | "upsert";
        payload: Record<string, unknown>;
        clientId?: string | undefined;
        mutationVector?: Record<string, {
            updatedAt: string;
            version?: number | undefined;
            authorId?: string | undefined;
            clientId?: string | undefined;
        }> | undefined;
        vectorClock?: Record<string, number> | undefined;
        authorUserId?: string | undefined;
        baseVersion?: number | undefined;
    }[] | undefined;
}>;
export type MeshSyncExchangeResponse = z.infer<typeof meshSyncExchangeResponseSchema>;
export declare const lanChairStatusSchema: z.ZodEnum<["empty", "patient_seated", "treatment_in_progress", "ready_for_sanitization", "sanitizing", "sanitized"]>;
export type LanChairStatus = z.infer<typeof lanChairStatusSchema>;
export declare const lanChairStatusEventSchema: z.ZodObject<{
    cabinetNumber: z.ZodUnion<[z.ZodString, z.ZodNumber]>;
    chairId: z.ZodString;
    status: z.ZodEnum<["empty", "patient_seated", "treatment_in_progress", "ready_for_sanitization", "sanitizing", "sanitized"]>;
    patientId: z.ZodOptional<z.ZodString>;
    patientName: z.ZodOptional<z.ZodString>;
    doctorId: z.ZodOptional<z.ZodString>;
    doctorName: z.ZodOptional<z.ZodString>;
    updatedAt: z.ZodString;
    note: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "empty" | "patient_seated" | "treatment_in_progress" | "ready_for_sanitization" | "sanitizing" | "sanitized";
    updatedAt: string;
    chairId: string;
    cabinetNumber: string | number;
    patientId?: string | undefined;
    doctorId?: string | undefined;
    doctorName?: string | undefined;
    patientName?: string | undefined;
    note?: string | undefined;
}, {
    status: "empty" | "patient_seated" | "treatment_in_progress" | "ready_for_sanitization" | "sanitizing" | "sanitized";
    updatedAt: string;
    chairId: string;
    cabinetNumber: string | number;
    patientId?: string | undefined;
    doctorId?: string | undefined;
    doctorName?: string | undefined;
    patientName?: string | undefined;
    note?: string | undefined;
}>;
export type LanChairStatusEvent = z.infer<typeof lanChairStatusEventSchema>;
export declare const lanCitoUrgencySchema: z.ZodEnum<["normal", "urgent", "cito_emergency"]>;
export type LanCitoUrgency = z.infer<typeof lanCitoUrgencySchema>;
export declare const lanCitoCallReasonSchema: z.ZodEnum<["sterilization_instruments", "anesthesia_aid", "patient_unwell", "supplies_needed", "custom"]>;
export type LanCitoCallReason = z.infer<typeof lanCitoCallReasonSchema>;
export declare const lanAssistantCitoEventSchema: z.ZodObject<{
    callId: z.ZodString;
    cabinetNumber: z.ZodUnion<[z.ZodString, z.ZodNumber]>;
    urgency: z.ZodEnum<["normal", "urgent", "cito_emergency"]>;
    reason: z.ZodEnum<["sterilization_instruments", "anesthesia_aid", "patient_unwell", "supplies_needed", "custom"]>;
    customMessage: z.ZodOptional<z.ZodString>;
    doctorId: z.ZodString;
    doctorName: z.ZodString;
    calledAt: z.ZodString;
    status: z.ZodDefault<z.ZodEnum<["pending", "acknowledged", "resolved"]>>;
    acknowledgedBy: z.ZodOptional<z.ZodString>;
    acknowledgedAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "pending" | "acknowledged" | "resolved";
    reason: "custom" | "sterilization_instruments" | "anesthesia_aid" | "patient_unwell" | "supplies_needed";
    doctorId: string;
    doctorName: string;
    cabinetNumber: string | number;
    callId: string;
    urgency: "normal" | "urgent" | "cito_emergency";
    calledAt: string;
    customMessage?: string | undefined;
    acknowledgedBy?: string | undefined;
    acknowledgedAt?: string | undefined;
}, {
    reason: "custom" | "sterilization_instruments" | "anesthesia_aid" | "patient_unwell" | "supplies_needed";
    doctorId: string;
    doctorName: string;
    cabinetNumber: string | number;
    callId: string;
    urgency: "normal" | "urgent" | "cito_emergency";
    calledAt: string;
    status?: "pending" | "acknowledged" | "resolved" | undefined;
    customMessage?: string | undefined;
    acknowledgedBy?: string | undefined;
    acknowledgedAt?: string | undefined;
}>;
export type LanAssistantCitoEvent = z.infer<typeof lanAssistantCitoEventSchema>;
export declare const lanInvoiceTransferItemSchema: z.ZodObject<{
    name: z.ZodString;
    priceRub: z.ZodNumber;
    priceKopecks: z.ZodOptional<z.ZodNumber>;
    quantity: z.ZodDefault<z.ZodNumber>;
    toothNumber: z.ZodOptional<z.ZodNumber>;
    discountRub: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    name: string;
    quantity: number;
    priceRub: number;
    priceKopecks?: number | undefined;
    toothNumber?: number | undefined;
    discountRub?: number | undefined;
}, {
    name: string;
    priceRub: number;
    priceKopecks?: number | undefined;
    quantity?: number | undefined;
    toothNumber?: number | undefined;
    discountRub?: number | undefined;
}>;
export type LanInvoiceTransferItem = z.infer<typeof lanInvoiceTransferItemSchema>;
export declare const lanInvoiceTransferEventSchema: z.ZodObject<{
    transferId: z.ZodString;
    cabinetNumber: z.ZodUnion<[z.ZodString, z.ZodNumber]>;
    doctorId: z.ZodString;
    doctorName: z.ZodString;
    patientId: z.ZodString;
    patientName: z.ZodString;
    items: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        priceRub: z.ZodNumber;
        priceKopecks: z.ZodOptional<z.ZodNumber>;
        quantity: z.ZodDefault<z.ZodNumber>;
        toothNumber: z.ZodOptional<z.ZodNumber>;
        discountRub: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        quantity: number;
        priceRub: number;
        priceKopecks?: number | undefined;
        toothNumber?: number | undefined;
        discountRub?: number | undefined;
    }, {
        name: string;
        priceRub: number;
        priceKopecks?: number | undefined;
        quantity?: number | undefined;
        toothNumber?: number | undefined;
        discountRub?: number | undefined;
    }>, "many">;
    totalAmountRub: z.ZodNumber;
    totalAmountKopecks: z.ZodNumber;
    comments: z.ZodOptional<z.ZodString>;
    transferredAt: z.ZodString;
    status: z.ZodDefault<z.ZodEnum<["waiting_payment", "in_checkout", "paid", "cancelled"]>>;
}, "strip", z.ZodTypeAny, {
    status: "waiting_payment" | "in_checkout" | "paid" | "cancelled";
    patientId: string;
    items: {
        name: string;
        quantity: number;
        priceRub: number;
        priceKopecks?: number | undefined;
        toothNumber?: number | undefined;
        discountRub?: number | undefined;
    }[];
    totalAmountRub: number;
    doctorId: string;
    doctorName: string;
    cabinetNumber: string | number;
    patientName: string;
    transferId: string;
    totalAmountKopecks: number;
    transferredAt: string;
    comments?: string | undefined;
}, {
    patientId: string;
    items: {
        name: string;
        priceRub: number;
        priceKopecks?: number | undefined;
        quantity?: number | undefined;
        toothNumber?: number | undefined;
        discountRub?: number | undefined;
    }[];
    totalAmountRub: number;
    doctorId: string;
    doctorName: string;
    cabinetNumber: string | number;
    patientName: string;
    transferId: string;
    totalAmountKopecks: number;
    transferredAt: string;
    status?: "waiting_payment" | "in_checkout" | "paid" | "cancelled" | undefined;
    comments?: string | undefined;
}>;
export type LanInvoiceTransferEvent = z.infer<typeof lanInvoiceTransferEventSchema>;
export declare const lanP2PEventTypeSchema: z.ZodEnum<["chair_status_changed", "assistant_call_cito", "invoice_transferred_to_cashier", "peer_presence_ping", "custom_alert"]>;
export type LanP2PEventType = z.infer<typeof lanP2PEventTypeSchema>;
export declare const lanP2PMessageSchema: z.ZodObject<{
    messageId: z.ZodString;
    eventType: z.ZodEnum<["chair_status_changed", "assistant_call_cito", "invoice_transferred_to_cashier", "peer_presence_ping", "custom_alert"]>;
    senderNodeId: z.ZodString;
    senderRole: z.ZodEnum<["primary_server", "reception_workstation", "doctor_tablet", "autonomous_workstation", "diagnostics_pc"]>;
    senderName: z.ZodString;
    organizationId: z.ZodString;
    sentAt: z.ZodString;
    payload: z.ZodRecord<z.ZodString, z.ZodUnknown>;
    vectorClock: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodNumber>>;
    signature: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    organizationId: string;
    eventType: "chair_status_changed" | "assistant_call_cito" | "invoice_transferred_to_cashier" | "peer_presence_ping" | "custom_alert";
    payload: Record<string, unknown>;
    sentAt: string;
    senderNodeId: string;
    senderRole: "primary_server" | "reception_workstation" | "doctor_tablet" | "autonomous_workstation" | "diagnostics_pc";
    messageId: string;
    senderName: string;
    signature?: string | undefined;
    vectorClock?: Record<string, number> | undefined;
}, {
    organizationId: string;
    eventType: "chair_status_changed" | "assistant_call_cito" | "invoice_transferred_to_cashier" | "peer_presence_ping" | "custom_alert";
    payload: Record<string, unknown>;
    sentAt: string;
    senderNodeId: string;
    senderRole: "primary_server" | "reception_workstation" | "doctor_tablet" | "autonomous_workstation" | "diagnostics_pc";
    messageId: string;
    senderName: string;
    signature?: string | undefined;
    vectorClock?: Record<string, number> | undefined;
}>;
export type LanP2PMessage<TPayload = Record<string, unknown>> = Omit<z.infer<typeof lanP2PMessageSchema>, "payload"> & {
    payload: TPayload;
};
