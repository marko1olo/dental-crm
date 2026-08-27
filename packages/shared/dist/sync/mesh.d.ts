/**
 * DENTE CRM — Local Clinic Wi-Fi Mesh & Distributed CRDT Synchronization Engine
 *
 * Provides:
 * 1. Mathematical Vector Clocks (RFC causality tracking & monotonicity guarantees)
 * 2. Multi-party Conflict-Free Replicated Data Types (CRDTs):
 *    - Schedule / Appointments (Status precedence matrix, double-booking prevention, deterministic LWW)
 *    - Form 043/u & Medical Diarires (SOAP notes, multi-tooth & per-surface odontogram map CRDT)
 *    - Cash & Fiscal Operations (Kopeck-exact balance consistency, idempotent journal)
 * 3. LAN Wi-Fi Mesh Node Discovery & Peer-to-Peer Exchange Protocol
 * 4. 3-Tier Seamless Transition Manager (Autonomous Offline <-> LAN Local Mesh <-> Cloud PostgreSQL)
 */
import { type FieldConflictDetail, type LanAssistantCitoEvent, type LanChairStatus, type LanChairStatusEvent, type LanCitoCallReason, type LanCitoUrgency, type LanDiscoveryBeacon, type LanInvoiceTransferEvent, type LanInvoiceTransferItem, type LanMeshNode, type LanNodeRole, type LanP2PEventType, type LanP2PMessage, type MeshSyncExchangeRequest, type MeshSyncExchangeResponse, type SyncMutationEnvelope, type SyncTierMode, type VectorClock } from "./types.js";
/**
 * Creates a new Vector Clock initialized with an optional node ID and sequence.
 */
export declare function createVectorClock(nodeId?: string, initialSeq?: number): VectorClock;
/**
 * Increments the vector clock counter for a specific node ID monotonically.
 */
export declare function incrementVectorClock(clock: VectorClock, nodeId: string): VectorClock;
export type VectorClockComparison = "before" | "after" | "concurrent" | "identical";
/**
 * Compares two vector clocks to determine their causal relationship:
 * - "before": clockA happened strictly before clockB (clockA < clockB)
 * - "after": clockA happened strictly after clockB (clockA > clockB)
 * - "identical": clockA and clockB are identical
 * - "concurrent": clockA and clockB happened concurrently (conflict requires CRDT resolution)
 */
export declare function compareVectorClocks(clockA?: VectorClock, clockB?: VectorClock): VectorClockComparison;
/**
 * Merges two vector clocks by taking the pairwise maximum for every node ID.
 */
export declare function mergeVectorClocks(clockA?: VectorClock, clockB?: VectorClock): VectorClock;
/**
 * Returns true if dominator vector clock causally dominates or equals dominated clock.
 */
export declare function dominatesVectorClock(dominator?: VectorClock, dominated?: VectorClock): boolean;
/**
 * Formats vector clock into human-readable compact string representation (e.g. "tablet-1:3,rec-1:5").
 */
export declare function vectorClockToString(clock: VectorClock): string;
/**
 * Parses compact string representation back into a VectorClock.
 */
export declare function parseVectorClock(str: string): VectorClock;
export interface ScheduleAppointmentConflictInput {
    existingAppointment: Record<string, unknown> | null;
    incomingAppointment: Record<string, unknown>;
    existingClock?: VectorClock | undefined;
    incomingClock?: VectorClock | undefined;
    existingUpdatedAt?: string | undefined;
    incomingUpdatedAt: string;
    nodeId: string;
}
export interface ScheduleAppointmentConflictResult {
    resolvedAppointment: Record<string, unknown>;
    updatedClock: VectorClock;
    hasConflict: boolean;
    strategy: "created" | "lww" | "status_priority" | "merged";
    conflictDetails: FieldConflictDetail[];
}
export declare function resolveScheduleAppointmentCrdt(input: ScheduleAppointmentConflictInput): ScheduleAppointmentConflictResult;
export interface OdontogramToothState {
    toothNumber: number;
    statusCode: string;
    surfaces?: string[] | undefined;
    mobility?: number | undefined;
    notes?: string | undefined;
    updatedAt?: string | undefined;
}
export interface Form043DiaryConflictInput {
    existingDiary: Record<string, unknown> | null;
    incomingDiary: Record<string, unknown>;
    existingClock?: VectorClock | undefined;
    incomingClock?: VectorClock | undefined;
    existingUpdatedAt?: string | undefined;
    incomingUpdatedAt: string;
    nodeId: string;
}
export interface Form043DiaryConflictResult {
    resolvedDiary: Record<string, unknown>;
    updatedClock: VectorClock;
    hasConflict: boolean;
    strategy: "created" | "field_merge" | "lww";
    conflictDetails: FieldConflictDetail[];
}
/**
 * Merges two odontogram tooth lists non-destructively per tooth and per surface.
 */
export declare function mergeOdontogramTeethCrdt(existingTeeth?: OdontogramToothState[], incomingTeeth?: OdontogramToothState[]): OdontogramToothState[];
/**
 * 3-way Form 043/u and Medical Diary CRDT resolution.
 */
export declare function resolveForm043DiaryCrdt(input: Form043DiaryConflictInput): Form043DiaryConflictResult;
export interface CashPaymentRecord {
    paymentId: string;
    patientId: string;
    amountKopecks: number;
    paymentMethod: "cash" | "card" | "sbp" | "deposit" | "installment";
    status: "draft" | "fiscalized" | "refunded" | "voided";
    fiscalDocNumber?: string | undefined;
    idempotencyKey: string;
    createdAt: string;
}
export interface CashOperationConflictInput {
    existingPayment: CashPaymentRecord | null;
    incomingPayment: CashPaymentRecord;
    existingClock?: VectorClock | undefined;
    incomingClock?: VectorClock | undefined;
    nodeId: string;
}
export interface CashOperationConflictResult {
    resolvedPayment: CashPaymentRecord;
    updatedClock: VectorClock;
    status: "applied" | "duplicate" | "conflict_resolved";
    isDuplicate: boolean;
}
export declare function resolveCashOperationCrdt(input: CashOperationConflictInput): CashOperationConflictResult;
export declare function determineSyncTierMode(options: {
    hasCloudInternet: boolean;
    hasLanMicroserver: boolean;
    hasLocalMeshPeers: boolean;
}): SyncTierMode;
export declare function createLanDiscoveryBeacon(node: LanMeshNode, tier?: SyncTierMode): LanDiscoveryBeacon;
/**
 * Handles incoming peer-to-peer mesh sync exchange between workstations/tablets without internet.
 */
export declare function processMeshSyncExchange(localMutations: SyncMutationEnvelope[], request: MeshSyncExchangeRequest, localVectorClock: VectorClock, localNodeId: string): MeshSyncExchangeResponse;
/**
 * Creates a validated Chair Status Change clinical event.
 */
export declare function createChairStatusEvent(params: {
    cabinetNumber: string | number;
    chairId: string;
    status: LanChairStatus;
    patientId?: string;
    patientName?: string;
    doctorId?: string;
    doctorName?: string;
    note?: string;
    updatedAt?: string;
}): LanChairStatusEvent;
/**
 * Creates a validated CITO emergency assistant call event.
 */
export declare function createAssistantCitoEvent(params: {
    cabinetNumber: string | number;
    doctorId: string;
    doctorName: string;
    urgency?: LanCitoUrgency;
    reason?: LanCitoCallReason;
    customMessage?: string;
    callId?: string;
    calledAt?: string;
}): LanAssistantCitoEvent;
/**
 * Creates a validated Invoice Transfer to Cashier event.
 */
export declare function createInvoiceTransferEvent(params: {
    cabinetNumber: string | number;
    doctorId: string;
    doctorName: string;
    patientId: string;
    patientName: string;
    items: LanInvoiceTransferItem[];
    totalAmountRub?: number;
    totalAmountKopecks?: number;
    comments?: string;
    transferId?: string;
    transferredAt?: string;
}): LanInvoiceTransferEvent;
/**
 * Wraps a clinical event in a signed/hash-verified P2P broadcast message envelope.
 */
export declare function createLanP2PMessage<TPayload extends Record<string, unknown>>(params: {
    eventType: LanP2PEventType;
    senderNodeId: string;
    senderRole: LanNodeRole;
    senderName: string;
    organizationId: string;
    payload: TPayload;
    vectorClock?: VectorClock;
    messageId?: string;
    sentAt?: string;
}): LanP2PMessage<TPayload>;
/**
 * Validates an incoming P2P message and its signature.
 */
export declare function validateLanP2PMessage(raw: unknown, options?: {
    requireSignature?: boolean;
}): {
    valid: boolean;
    error?: string;
    message?: LanP2PMessage;
};
