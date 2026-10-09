
import {
	SOMATIC_SAFETY_FIELDS,
	isSomaticSafetyFieldOrRisk,
	mergeSomaticSafetyField,
} from "../crdt.js";
import { computePayloadHash, createCompositeIdempotencyKey, generateUuidV7 } from "../hashing.js";
import {
	type ConflictResolutionStrategy,
	type FieldConflictDetail,
	type LanAssistantCitoEvent,
	type LanChairStatus,
	type LanChairStatusEvent,
	type LanCitoCallReason,
	type LanCitoUrgency,
	type LanDiscoveryBeacon,
	type LanInvoiceTransferEvent,
	type LanInvoiceTransferItem,
	type LanMeshNode,
	type LanNodeRole,
	type LanP2PEventType,
	type LanP2PMessage,
	type MeshSyncExchangeRequest,
	type MeshSyncExchangeResponse,
	type MutationVector,
	type SyncMutationEnvelope,
	type SyncMutationResult,
	type SyncTierMode,
	type VectorClock,
	lanAssistantCitoEventSchema,
	lanChairStatusEventSchema,
	lanInvoiceTransferEventSchema,
	lanP2PMessageSchema,
} from "../types.js";
import { incrementVectorClock, mergeVectorClocks } from './vector-clock.js';

// ─────────────────────────────────────────────────────────────────────────────

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

export function resolveCashOperationCrdt(
	input: CashOperationConflictInput,
): CashOperationConflictResult {
	const {
		existingPayment,
		incomingPayment,
		existingClock = {},
		incomingClock = {},
		nodeId,
	} = input;

	const mergedClock = incrementVectorClock(
		mergeVectorClocks(existingClock, incomingClock),
		nodeId,
	);

	if (!existingPayment) {
		return {
			resolvedPayment: { ...incomingPayment },
			updatedClock: mergedClock,
			status: "applied",
			isDuplicate: false,
		};
	}

	// Idempotency check: same idempotencyKey or same paymentId
	if (
		existingPayment.idempotencyKey === incomingPayment.idempotencyKey ||
		existingPayment.paymentId === incomingPayment.paymentId
	) {
		// Fiscal status progression: fiscalized > draft
		const resolvedStatus =
			existingPayment.status === "fiscalized" ||
			incomingPayment.status === "fiscalized"
				? "fiscalized"
				: existingPayment.status === "refunded" ||
						incomingPayment.status === "refunded"
					? "refunded"
					: incomingPayment.status;

		return {
			resolvedPayment: {
				...existingPayment,
				...incomingPayment,
				status: resolvedStatus,
				fiscalDocNumber:
					existingPayment.fiscalDocNumber || incomingPayment.fiscalDocNumber,
			},
			updatedClock: mergedClock,
			status: "duplicate",
			isDuplicate: true,
		};
	}

	return {
		resolvedPayment: { ...incomingPayment },
		updatedClock: mergedClock,
		status: "conflict_resolved",
		isDuplicate: false,
	};
}

// ─────────────────────────────────────────────────────────────────────────────
