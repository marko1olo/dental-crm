
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

// ─────────────────────────────────────────────────────────────────────────────

/**
 * Creates a validated Chair Status Change clinical event.
 */
export function createChairStatusEvent(params: {
	cabinetNumber: string | number;
	chairId: string;
	status: LanChairStatus;
	patientId?: string;
	patientName?: string;
	doctorId?: string;
	doctorName?: string;
	note?: string;
	updatedAt?: string;
}): LanChairStatusEvent {
	const updatedAt = params.updatedAt || new Date().toISOString();
	const event: LanChairStatusEvent = {
		cabinetNumber: params.cabinetNumber,
		chairId: params.chairId,
		status: params.status,
		patientId: params.patientId,
		patientName: params.patientName,
		doctorId: params.doctorId,
		doctorName: params.doctorName,
		note: params.note,
		updatedAt,
	};
	return lanChairStatusEventSchema.parse(event);
}

/**
 * Creates a validated CITO emergency assistant call event.
 */
export function createAssistantCitoEvent(params: {
	cabinetNumber: string | number;
	doctorId: string;
	doctorName: string;
	urgency?: LanCitoUrgency;
	reason?: LanCitoCallReason;
	customMessage?: string;
	callId?: string;
	calledAt?: string;
}): LanAssistantCitoEvent {
	const callId = params.callId || `cito-${generateUuidV7().slice(0, 18)}`;
	const calledAt = params.calledAt || new Date().toISOString();
	const event: LanAssistantCitoEvent = {
		callId,
		cabinetNumber: params.cabinetNumber,
		doctorId: params.doctorId,
		doctorName: params.doctorName,
		urgency: params.urgency || "cito_emergency",
		reason: params.reason || "anesthesia_aid",
		customMessage: params.customMessage,
		calledAt,
		status: "pending",
	};
	return lanAssistantCitoEventSchema.parse(event);
}

/**
 * Creates a validated Invoice Transfer to Cashier event.
 */
export function createInvoiceTransferEvent(params: {
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
}): LanInvoiceTransferEvent {
	const transferId = params.transferId || `inv-tx-${generateUuidV7().slice(0, 18)}`;
	const transferredAt = params.transferredAt || new Date().toISOString();

	// Calculate total amount in kopecks & rubles if not provided
	let calculatedKopecks = params.totalAmountKopecks;
	let calculatedRub = params.totalAmountRub;

	if (calculatedKopecks === undefined || calculatedRub === undefined) {
		let sumKop = 0;
		for (const item of params.items) {
			const itemKop =
				item.priceKopecks !== undefined
					? item.priceKopecks
					: Math.round(item.priceRub * 100);
			const qty = item.quantity || 1;
			const discountKop = item.discountRub ? Math.round(item.discountRub * 100) : 0;
			sumKop += Math.max(0, itemKop * qty - discountKop);
		}
		calculatedKopecks = sumKop;
		calculatedRub = sumKop / 100;
	}

	const event: LanInvoiceTransferEvent = {
		transferId,
		cabinetNumber: params.cabinetNumber,
		doctorId: params.doctorId,
		doctorName: params.doctorName,
		patientId: params.patientId,
		patientName: params.patientName,
		items: params.items,
		totalAmountRub: calculatedRub,
		totalAmountKopecks: calculatedKopecks,
		comments: params.comments,
		transferredAt,
		status: "waiting_payment",
	};

	return lanInvoiceTransferEventSchema.parse(event);
}

/**
 * Wraps a clinical event in a signed/hash-verified P2P broadcast message envelope.
 */
export function createLanP2PMessage<TPayload extends Record<string, unknown>>(params: {
	eventType: LanP2PEventType;
	senderNodeId: string;
	senderRole: LanNodeRole;
	senderName: string;
	organizationId: string;
	branchId?: string | undefined;
	payload: TPayload;
	vectorClock?: VectorClock | undefined;
	messageId?: string | undefined;
	sentAt?: string | undefined;
}): LanP2PMessage<TPayload> {
	const messageId =
		params.messageId ||
		`p2p-${generateUuidV7()}`;
	const sentAt = params.sentAt || new Date().toISOString();

	const signature = computePayloadHash({
		messageId,
		eventType: params.eventType,
		senderNodeId: params.senderNodeId,
		organizationId: params.organizationId,
		branchId: params.branchId,
		payload: params.payload,
		sentAt,
	});

	const message: LanP2PMessage<TPayload> = {
		messageId,
		eventType: params.eventType,
		senderNodeId: params.senderNodeId,
		senderRole: params.senderRole,
		senderName: params.senderName,
		organizationId: params.organizationId,
		branchId: params.branchId,
		sentAt,
		payload: params.payload,
		vectorClock: params.vectorClock,
		signature,
	};

	return lanP2PMessageSchema.parse(message) as LanP2PMessage<TPayload>;
}

/**
 * Validates an incoming P2P message and its signature.
 */
export function validateLanP2PMessage(
	raw: unknown,
	options?: { requireSignature?: boolean },
): {
	valid: boolean;
	error?: string;
	message?: LanP2PMessage;
} {
	const parsed = lanP2PMessageSchema.safeParse(raw);
	if (!parsed.success) {
		return { valid: false, error: parsed.error.message };
	}

	const msg = parsed.data;

	// Check payload is a non-null JSON object
	if (!msg.payload || typeof msg.payload !== "object" || Array.isArray(msg.payload)) {
		return { valid: false, error: "Invalid payload: must be a JSON object" };
	}

	const requireSig = options?.requireSignature ?? false;
	if (requireSig && (!msg.signature || typeof msg.signature !== "string" || !/^[0-9a-f]{64}$/i.test(msg.signature))) {
		return { valid: false, error: "Missing or invalid SHA-256 signature on LAN P2P message" };
	}

	if (msg.signature) {
		if (!/^[0-9a-f]{64}$/i.test(msg.signature)) {
			return { valid: false, error: "Malformed SHA-256 signature format" };
		}

		const expectedSignature = computePayloadHash({
			messageId: msg.messageId,
			eventType: msg.eventType,
			senderNodeId: msg.senderNodeId,
			organizationId: msg.organizationId,
			branchId: msg.branchId,
			payload: msg.payload,
			sentAt: msg.sentAt,
		});

		if (msg.signature !== expectedSignature) {
			return { valid: false, error: "Invalid P2P message SHA-256 signature mismatch" };
		}
	}

	return { valid: true, message: msg };
}

