import type { FieldConflictDetail, MutationVector, SyncMutationEntityKind } from "./types.js";
export interface MergeFieldLevelCrdtOptions {
    entityKind: SyncMutationEntityKind;
    entityId: string;
    serverEntity: Record<string, unknown> | null | undefined;
    serverVector?: MutationVector | null | undefined;
    clientPatch: Record<string, unknown>;
    clientVector?: MutationVector | null | undefined;
    clientUpdatedAt: string;
    serverUpdatedAt?: string | null | undefined;
    clientId?: string | undefined;
    authorUserId?: string | undefined;
}
export interface MergeFieldLevelCrdtResult<T = Record<string, unknown>> {
    mergedEntity: T;
    updatedVector: MutationVector;
    changedFields: string[];
    conflicts: FieldConflictDetail[];
    hasConflicts: boolean;
    strategy: "created" | "field_merge" | "lww" | "identical_noop";
}
export declare function setGlobalClockSkew(skewMs: number): void;
export declare function getGlobalClockSkew(): number;
export declare function calibrateClockSkew(serverIsoOrMs?: string | number | null | undefined, clientLocalTimeMs?: number | undefined): number;
export declare function getAdjustedNowMs(localTimeMs?: number): number;
export declare function getAdjustedNowIso(localTimeMs?: number): string;
export declare function resetGlobalClockSkew(): void;
/**
 * Deterministic Field-Level Last-Write-Wins (LWW) CRDT & Three-Way Merging.
 *
 * Guaranteed Invariants:
 * 1. Independent fields never clobber each other:
 *    - e.g., if Doctor edited `anamnesis` offline while Receptionist updated `phone` online,
 *      both `anamnesis` and `phone` are preserved!
 * 2. Same-field concurrent collisions are resolved deterministically using
 *    vector clocks / field timestamps (`mutationVector` / `updatedAt`).
 * 3. Idempotent: merging the exact same patch multiple times produces the exact same result.
 */
export declare function mergeFieldLevelCrdt<T extends Record<string, unknown>>(options: MergeFieldLevelCrdtOptions): MergeFieldLevelCrdtResult<T>;
