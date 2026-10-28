import type {
	LanAssistantCitoEvent,
	LanChairStatusEvent,
	LanInvoiceTransferEvent,
	LanNodeRole,
	LanP2PMessage,
	StaffActionAuditEntry,
} from "@dental/shared";

export const BROADCAST_CHANNEL_NAME = "dente_lan_p2p_channel";

export interface LanP2PDispatcherConfig {
	nodeId?: string;
	nodeRole?: LanNodeRole;
	nodeName?: string;
	organizationId?: string;
	branchId?: string;
	customWebSocketUrl?: string | null;
	fetchImpl?: typeof fetch;
}

export interface LanP2PDispatcherStatus {
	nodeId: string;
	nodeRole: LanNodeRole;
	nodeName: string;
	organizationId: string;
	branchId?: string | undefined;
	isBroadcastChannelActive: boolean;
	isWebSocketConnected: boolean;
	activeTransportCount: number;
	totalSentMessages: number;
	totalReceivedMessages: number;
	lastMessageIso: string | null;
}

export type ChairStatusListener = (
	event: LanChairStatusEvent,
	envelope: LanP2PMessage<LanChairStatusEvent>,
) => void;

export type AssistantCitoListener = (
	event: LanAssistantCitoEvent,
	envelope: LanP2PMessage<LanAssistantCitoEvent>,
) => void;

export type InvoiceTransferListener = (
	event: LanInvoiceTransferEvent,
	envelope: LanP2PMessage<LanInvoiceTransferEvent>,
) => void;

export type StaffActionListener = (
	event: StaffActionAuditEntry,
	envelope: LanP2PMessage<StaffActionAuditEntry>,
) => void;

export type AnyP2PEventListener = (envelope: LanP2PMessage) => void;
