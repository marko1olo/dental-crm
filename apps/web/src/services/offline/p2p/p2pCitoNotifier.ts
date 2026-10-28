import {
	type LanAssistantCitoEvent,
	type LanCitoCallReason,
	type LanCitoUrgency,
	type LanInvoiceTransferEvent,
	type LanInvoiceTransferItem,
	type LanNodeRole,
	type LanP2PMessage,
	type VectorClock,
	createAssistantCitoEvent,
	createInvoiceTransferEvent,
	createLanP2PMessage,
} from "@dental/shared";

export interface AssistantCitoBroadcastParams {
	cabinetNumber: string | number;
	doctorId: string;
	doctorName: string;
	urgency?: LanCitoUrgency;
	reason?: LanCitoCallReason;
	customMessage?: string;
	branchId?: string;
	vectorClock?: VectorClock;
}

export interface InvoiceCashierBroadcastParams {
	cabinetNumber: string | number;
	doctorId: string;
	doctorName: string;
	patientId: string;
	patientName: string;
	items: LanInvoiceTransferItem[];
	totalAmountRub?: number;
	totalAmountKopecks?: number;
	comments?: string;
	branchId?: string;
	vectorClock?: VectorClock;
}

export interface P2PNodeMeta {
	nodeId: string;
	nodeRole: LanNodeRole;
	nodeName: string;
	organizationId: string;
	defaultBranchId?: string;
}

export function buildAssistantCitoMessage(
	params: AssistantCitoBroadcastParams,
	meta: P2PNodeMeta,
): LanP2PMessage<LanAssistantCitoEvent> {
	const event = createAssistantCitoEvent(params);
	return createLanP2PMessage({
		eventType: "assistant_call_cito",
		senderNodeId: meta.nodeId,
		senderRole: meta.nodeRole,
		senderName: meta.nodeName,
		organizationId: meta.organizationId,
		branchId: params.branchId || meta.defaultBranchId,
		payload: event as unknown as Record<string, unknown>,
		...(params.vectorClock ? { vectorClock: params.vectorClock } : {}),
	}) as LanP2PMessage<LanAssistantCitoEvent>;
}

export function buildInvoiceCashierMessage(
	params: InvoiceCashierBroadcastParams,
	meta: P2PNodeMeta,
): LanP2PMessage<LanInvoiceTransferEvent> {
	const event = createInvoiceTransferEvent(params);
	return createLanP2PMessage({
		eventType: "invoice_transferred_to_cashier",
		senderNodeId: meta.nodeId,
		senderRole: meta.nodeRole,
		senderName: meta.nodeName,
		organizationId: meta.organizationId,
		branchId: params.branchId || meta.defaultBranchId,
		payload: event as unknown as Record<string, unknown>,
		...(params.vectorClock ? { vectorClock: params.vectorClock } : {}),
	}) as LanP2PMessage<LanInvoiceTransferEvent>;
}
