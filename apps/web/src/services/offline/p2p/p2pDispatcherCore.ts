import type {
	LanAssistantCitoEvent, LanChairStatusEvent, LanInvoiceTransferEvent, LanNodeRole, LanP2PMessage, StaffActionAuditEntry,
} from "@dental/shared";
import { getOrCreateClientId } from "../offlineSyncService";
import type {
	AnyP2PEventListener, AssistantCitoListener, ChairStatusListener, InvoiceTransferListener,
	LanP2PDispatcherConfig, LanP2PDispatcherStatus, StaffActionListener,
} from "./types";
import { broadcastViaChannel, closeP2PBroadcastChannel, createP2PBroadcastChannel } from "./p2pBroadcastChannel";
import { sendViaWebSocket } from "./p2pWebSocket";
import { recordSeenMessage, validateIncomingP2PMessage } from "./p2pEventValidators";
import { type ChairStatusBroadcastParams, buildChairStatusMessage } from "./p2pChairSync";
import { type AssistantCitoBroadcastParams, type InvoiceCashierBroadcastParams, buildAssistantCitoMessage, buildInvoiceCashierMessage } from "./p2pCitoNotifier";
import { buildPresencePingMessage, buildStaffActionMessage } from "./p2pAuditSigner";
import { relayMessageToPeers } from "./p2pPeerRelay";
import { P2PListenerRegistry } from "./p2pListenerRegistry";
import { P2PWebSocketManager } from "./p2pWebSocketManager";
import { bindP2PSubscriptions } from "./p2pSubscriptions";

export class LanP2PDispatcher {
	private static instance: LanP2PDispatcher | null = null;
	private nodeId: string;
	private nodeRole: LanNodeRole = "doctor_tablet";
	private nodeName = "Doctor Tablet Workstation";
	private organizationId = "default-org";
	private branchId?: string;
	private broadcastChannel: BroadcastChannel | null = null;
	private wsManager = new P2PWebSocketManager();
	private seenMessageIds = new Map<string, number>();
	private listeners = new P2PListenerRegistry();
	private subs = bindP2PSubscriptions(this.listeners);
	private totalSent = 0;
	private totalReceived = 0;
	private lastMessageIso: string | null = null;
	private customFetch?: typeof fetch;

	constructor(c?: LanP2PDispatcherConfig) {
		this.nodeId = c?.nodeId || getOrCreateClientId();
		if (c?.nodeRole) this.nodeRole = c.nodeRole;
		if (c?.nodeName) this.nodeName = c.nodeName;
		if (c?.organizationId) this.organizationId = c.organizationId;
		if (c?.branchId) this.branchId = c.branchId;
		if (c?.customWebSocketUrl !== undefined) this.wsManager.customWebSocketUrl = c.customWebSocketUrl;
		if (c?.fetchImpl) this.customFetch = c.fetchImpl;
		this.broadcastChannel = createP2PBroadcastChannel((d) => this.handleIncomingRawMessage(d, "broadcast_channel"));
	}

	public static getInstance(config?: LanP2PDispatcherConfig): LanP2PDispatcher {
		if (!LanP2PDispatcher.instance) LanP2PDispatcher.instance = new LanP2PDispatcher(config);
		else if (config) LanP2PDispatcher.instance.configure(config);
		return LanP2PDispatcher.instance;
	}

	public static resetInstanceForTesting(): void {
		if (LanP2PDispatcher.instance) { LanP2PDispatcher.instance.destroy(); LanP2PDispatcher.instance = null; }
	}

	public configure(c: LanP2PDispatcherConfig): void {
		if (c.nodeId) this.nodeId = c.nodeId;
		if (c.nodeRole) this.nodeRole = c.nodeRole;
		if (c.nodeName) this.nodeName = c.nodeName;
		if (c.organizationId) this.organizationId = c.organizationId;
		if (c.branchId !== undefined) this.branchId = c.branchId;
		if (c.customWebSocketUrl !== undefined) {
			this.wsManager.customWebSocketUrl = c.customWebSocketUrl;
			this.wsManager.reconnect(() => this.sendPresencePing(), (d) => this.handleIncomingRawMessage(d, "websocket"));
		}
		if (c.fetchImpl) this.customFetch = c.fetchImpl;
	}

	public connectWebSocket(url: string): void { this.wsManager.connect(url, () => this.sendPresencePing(), (d) => this.handleIncomingRawMessage(d, "websocket")); }
	public disconnectWebSocket(): void { this.wsManager.disconnect(); }

	public handleIncomingRawMessage(raw: unknown, src: "broadcast_channel" | "websocket" | "http_peer" = "broadcast_channel"): boolean {
		const msg = validateIncomingP2PMessage({ raw, sourceTransport: src, currentNodeId: this.nodeId, organizationId: this.organizationId, branchId: this.branchId, seenMap: this.seenMessageIds });
		if (!msg) return false;
		this.totalReceived++;
		this.lastMessageIso = new Date().toISOString();
		this.listeners.dispatch(msg);
		return true;
	}

	public async broadcastMessage<TPayload extends Record<string, unknown>>(m: LanP2PMessage<TPayload>): Promise<boolean> {
		this.totalSent++;
		this.lastMessageIso = new Date().toISOString();
		recordSeenMessage(this.seenMessageIds, m.messageId);
		let ok = broadcastViaChannel(this.broadcastChannel, m);
		if (sendViaWebSocket(this.wsManager.webSocket, m)) ok = true;
		if (relayMessageToPeers(m, this.nodeId, this.customFetch)) ok = true;
		return ok;
	}

	private get meta() { return { nodeId: this.nodeId, nodeRole: this.nodeRole, nodeName: this.nodeName, organizationId: this.organizationId, defaultBranchId: this.branchId }; }
	public async broadcastChairStatus(p: ChairStatusBroadcastParams): Promise<LanP2PMessage<LanChairStatusEvent>> { const m = buildChairStatusMessage(p, this.meta); await this.broadcastMessage(m); return m; }
	public async broadcastAssistantCitoCall(p: AssistantCitoBroadcastParams): Promise<LanP2PMessage<LanAssistantCitoEvent>> { const m = buildAssistantCitoMessage(p, this.meta); await this.broadcastMessage(m); return m; }
	public async broadcastInvoiceToCashier(p: InvoiceCashierBroadcastParams): Promise<LanP2PMessage<LanInvoiceTransferEvent>> { const m = buildInvoiceCashierMessage(p, this.meta); await this.broadcastMessage(m); return m; }
	public async broadcastStaffAction(a: StaffActionAuditEntry, b?: string): Promise<LanP2PMessage<StaffActionAuditEntry>> { const m = buildStaffActionMessage(a, b, this.meta); await this.broadcastMessage(m); return m; }
	public sendPresencePing(): void { sendViaWebSocket(this.wsManager.webSocket, buildPresencePingMessage(this.meta)); }

	public onChairStatusChange(l: ChairStatusListener): () => void { return this.subs.onChairStatusChange(l); }
	public onAssistantCitoCall(l: AssistantCitoListener): () => void { return this.subs.onAssistantCitoCall(l); }
	public onInvoiceTransferredToCashier(l: InvoiceTransferListener): () => void { return this.subs.onInvoiceTransferredToCashier(l); }
	public onStaffActionTelemetry(l: StaffActionListener): () => void { return this.subs.onStaffActionTelemetry(l); }
	public onAnyEvent(l: AnyP2PEventListener): () => void { return this.subs.onAnyEvent(l); }

	public getStatus(): LanP2PDispatcherStatus {
		const isBcActive = this.broadcastChannel !== null;
		const isWsActive = this.wsManager.webSocket !== null && this.wsManager.webSocket.readyState === WebSocket.OPEN;
		return {
			nodeId: this.nodeId, nodeRole: this.nodeRole, nodeName: this.nodeName, organizationId: this.organizationId, branchId: this.branchId,
			isBroadcastChannelActive: isBcActive, isWebSocketConnected: isWsActive, activeTransportCount: (isBcActive ? 1 : 0) + (isWsActive ? 1 : 0),
			totalSentMessages: this.totalSent, totalReceivedMessages: this.totalReceived, lastMessageIso: this.lastMessageIso,
		};
	}

	public destroy(): void {
		this.disconnectWebSocket();
		closeP2PBroadcastChannel(this.broadcastChannel);
		this.broadcastChannel = null;
		this.listeners.clear();
		this.seenMessageIds.clear();
	}
}

export const lanP2PDispatcher = LanP2PDispatcher.getInstance();
