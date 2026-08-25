/**
 * DENTE CRM — Local Clinic LAN P2P WebSocket & BroadcastChannel Dispatcher
 *
 * Provides instantaneous (<50ms) peer-to-peer clinical event notifications across
 * doctor tablets, cabinet workstations and reception checkout desks:
 * 1. Chair status changes (patient seated, treatment in progress, ready for sanitization)
 * 2. Assistant emergency call CITO (urgent call to cabinet with audio/visual flash)
 * 3. Invoice transfer from doctor chair directly to reception checkout desk
 * 4. Dual-transport reliability: BroadcastChannel (same machine/tabs) + LAN WebSocket / HTTP relay (cross-device Wi-Fi)
 * 5. Deduplication and SHA-256 signature verification to prevent duplicate alerts
 */

import {
	type LanAssistantCitoEvent,
	type LanChairStatus,
	type LanChairStatusEvent,
	type LanCitoCallReason,
	type LanCitoUrgency,
	type LanInvoiceTransferEvent,
	type LanInvoiceTransferItem,
	type LanNodeRole,
	type LanP2PEventType,
	type LanP2PMessage,
	type VectorClock,
	createAssistantCitoEvent,
	createChairStatusEvent,
	createInvoiceTransferEvent,
	createLanP2PMessage,
	validateLanP2PMessage,
} from "@dental/shared";
import { logger } from "../../utils/logger";
import { lanMeshReplicationService } from "./lanMeshReplicationService";
import { getOrCreateClientId } from "./offlineSyncService";

export const BROADCAST_CHANNEL_NAME = "dente_lan_p2p_channel";

export interface LanP2PDispatcherConfig {
	nodeId?: string;
	nodeRole?: LanNodeRole;
	nodeName?: string;
	organizationId?: string;
	customWebSocketUrl?: string | null;
	fetchImpl?: typeof fetch;
}

export interface LanP2PDispatcherStatus {
	nodeId: string;
	nodeRole: LanNodeRole;
	nodeName: string;
	organizationId: string;
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

export type AnyP2PEventListener = (envelope: LanP2PMessage) => void;

export class LanP2PDispatcher {
	private static instance: LanP2PDispatcher | null = null;

	private nodeId: string;
	private nodeRole: LanNodeRole = "doctor_tablet";
	private nodeName = "Doctor Tablet Workstation";
	private organizationId = "default-org";

	private broadcastChannel: BroadcastChannel | null = null;
	private webSocket: WebSocket | null = null;
	private customWebSocketUrl: string | null = null;
	private isWsConnecting = false;
	private wsReconnectTimer: ReturnType<typeof setTimeout> | null = null;
	private seenMessageIds = new Map<string, number>();
	private readonly DEDUP_TTL_MS = 60_000; // 1 minute deduplication cache
	private readonly MAX_SEEN_MESSAGE_IDS = 5_000; // Hard LRU boundary against memory leaks / flood attack

	private chairStatusListeners = new Set<ChairStatusListener>();
	private assistantCitoListeners = new Set<AssistantCitoListener>();
	private invoiceTransferListeners = new Set<InvoiceTransferListener>();
	private anyEventListeners = new Set<AnyP2PEventListener>();

	private totalSent = 0;
	private totalReceived = 0;
	private lastMessageIso: string | null = null;
	private customFetch?: typeof fetch;

	constructor(config?: LanP2PDispatcherConfig) {
		this.nodeId = config?.nodeId || getOrCreateClientId();
		if (config?.nodeRole) this.nodeRole = config.nodeRole;
		if (config?.nodeName) this.nodeName = config.nodeName;
		if (config?.organizationId) this.organizationId = config.organizationId;
		if (config?.customWebSocketUrl !== undefined)
			this.customWebSocketUrl = config.customWebSocketUrl;
		if (config?.fetchImpl) this.customFetch = config.fetchImpl;

		this.initBroadcastChannel();
	}

	public static getInstance(config?: LanP2PDispatcherConfig): LanP2PDispatcher {
		if (!LanP2PDispatcher.instance) {
			LanP2PDispatcher.instance = new LanP2PDispatcher(config);
		} else if (config) {
			LanP2PDispatcher.instance.configure(config);
		}
		return LanP2PDispatcher.instance;
	}

	public static resetInstanceForTesting(): void {
		if (LanP2PDispatcher.instance) {
			LanP2PDispatcher.instance.destroy();
			LanP2PDispatcher.instance = null;
		}
	}

	public configure(config: LanP2PDispatcherConfig): void {
		if (config.nodeId) this.nodeId = config.nodeId;
		if (config.nodeRole) this.nodeRole = config.nodeRole;
		if (config.nodeName) this.nodeName = config.nodeName;
		if (config.organizationId) this.organizationId = config.organizationId;
		if (config.customWebSocketUrl !== undefined) {
			this.customWebSocketUrl = config.customWebSocketUrl;
			this.reconnectWebSocket();
		}
		if (config.fetchImpl) this.customFetch = config.fetchImpl;
	}

	// ─────────────────────────────────────────────────────────────────────────
	// TRANSPORT: BroadcastChannel
	// ─────────────────────────────────────────────────────────────────────────

	private initBroadcastChannel(): void {
		if (typeof BroadcastChannel !== "undefined") {
			try {
				this.broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
				this.broadcastChannel.onmessage = (event: MessageEvent) => {
					this.handleIncomingRawMessage(event.data, "broadcast_channel");
				};
				this.broadcastChannel.onmessageerror = (err) => {
					logger.warn("[LanP2PDispatcher] BroadcastChannel error", err);
				};
			} catch (err) {
				logger.warn("[LanP2PDispatcher] BroadcastChannel not supported or failed to init", err);
				this.broadcastChannel = null;
			}
		}
	}

	// ─────────────────────────────────────────────────────────────────────────
	// TRANSPORT: WebSocket (Local Microserver)
	// ─────────────────────────────────────────────────────────────────────────

	public connectWebSocket(url: string): void {
		this.customWebSocketUrl = url;
		this.reconnectWebSocket();
	}

	public disconnectWebSocket(): void {
		if (this.wsReconnectTimer) {
			clearTimeout(this.wsReconnectTimer);
			this.wsReconnectTimer = null;
		}
		if (this.webSocket) {
			try {
				this.webSocket.onclose = null;
				this.webSocket.onerror = null;
				this.webSocket.close();
			} catch {}
			this.webSocket = null;
		}
		this.isWsConnecting = false;
	}

	private reconnectWebSocket(): void {
		if (typeof WebSocket === "undefined") return;
		if (!this.customWebSocketUrl) return;
		if (this.isWsConnecting || (this.webSocket && this.webSocket.readyState === WebSocket.OPEN)) {
			return;
		}

		this.isWsConnecting = true;
		try {
			const ws = new WebSocket(this.customWebSocketUrl);
			this.webSocket = ws;

			ws.onopen = () => {
				this.isWsConnecting = false;
				logger.info(`[LanP2PDispatcher] WebSocket connected to ${this.customWebSocketUrl}`);
				// Register presence with local server
				this.sendPresencePing();
			};

			ws.onmessage = (event: MessageEvent) => {
				try {
					const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
					this.handleIncomingRawMessage(data, "websocket");
				} catch (err) {
					logger.warn("[LanP2PDispatcher] WebSocket parse error", err);
				}
			};

			ws.onerror = (err) => {
				logger.warn("[LanP2PDispatcher] WebSocket error", err);
			};

			ws.onclose = () => {
				this.isWsConnecting = false;
				this.webSocket = null;
				// Auto-reconnect after 3 seconds
				if (this.customWebSocketUrl && !this.wsReconnectTimer) {
					this.wsReconnectTimer = setTimeout(() => {
						this.wsReconnectTimer = null;
						this.reconnectWebSocket();
					}, 3000);
					if (typeof (this.wsReconnectTimer as unknown as { unref?: () => void })?.unref === "function") {
						(this.wsReconnectTimer as unknown as { unref: () => void }).unref();
					}
				}

			};
		} catch (err) {
			this.isWsConnecting = false;
			this.webSocket = null;
			logger.warn("[LanP2PDispatcher] Failed to create WebSocket connection", err);
		}
	}

	// ─────────────────────────────────────────────────────────────────────────
	// MESSAGE INGESTION & DISPATCH
	/**
	 * Records a seen message ID and bounds cache to MAX_SEEN_MESSAGE_IDS using LRU eviction.
	 */
	private recordSeenMessageId(messageId: string, now: number): void {
		if (this.seenMessageIds.has(messageId)) {
			this.seenMessageIds.delete(messageId);
		}
		this.seenMessageIds.set(messageId, now);

		// LRU eviction if size exceeds maximum bound
		if (this.seenMessageIds.size > this.MAX_SEEN_MESSAGE_IDS) {
			const excess = this.seenMessageIds.size - this.MAX_SEEN_MESSAGE_IDS;
			let removed = 0;
			for (const oldId of this.seenMessageIds.keys()) {
				this.seenMessageIds.delete(oldId);
				removed++;
				if (removed >= excess) break;
			}
		}
	}

	/**
	 * Receives and validates an incoming raw P2P message from any transport.
	 */
	public handleIncomingRawMessage(
		raw: unknown,
		sourceTransport: "broadcast_channel" | "websocket" | "http_peer" = "broadcast_channel",
	): boolean {
		const validation = validateLanP2PMessage(raw);
		if (!validation.valid || !validation.message) {
			logger.warn(`[LanP2PDispatcher] Rejected malformed message from ${sourceTransport}:`, validation.error);
			return false;
		}

		const msg = validation.message;

		// Filter out own messages
		if (msg.senderNodeId === this.nodeId) {
			return false;
		}

		// Filter by organization if specified (Strict cross-tenant isolation)
		if (this.organizationId) {
			if (!msg.organizationId || msg.organizationId !== this.organizationId) {
				logger.warn(`[LanP2PDispatcher] Rejected message from mismatched organization: expected '${this.organizationId}', got '${msg.organizationId}'`);
				return false;
			}
		}

		// Deduplication check with bounded LRU
		const now = Date.now();
		if (this.seenMessageIds.size > this.MAX_SEEN_MESSAGE_IDS / 2) {
			this.cleanupOldSeenIds(now);
		}

		if (this.seenMessageIds.has(msg.messageId)) {
			return false; // Already processed via another transport
		}
		this.recordSeenMessageId(msg.messageId, now);

		this.totalReceived++;
		this.lastMessageIso = new Date().toISOString();

		// Dispatch to typed listeners
		this.dispatchToListeners(msg);
		return true;
	}

	private dispatchToListeners(msg: LanP2PMessage): void {
		// 1. Any event listeners
		for (const listener of this.anyEventListeners) {
			try {
				listener(msg);
			} catch (err) {
				logger.error("[LanP2PDispatcher] Error in anyEventListener:", err);
			}
		}

		// 2. Event-type specific listeners
		switch (msg.eventType) {
			case "chair_status_changed": {
				const event = msg.payload as unknown as LanChairStatusEvent;
				for (const listener of this.chairStatusListeners) {
					try {
						listener(event, msg as LanP2PMessage<LanChairStatusEvent>);
					} catch (err) {
						logger.error("[LanP2PDispatcher] Error in chairStatusListener:", err);
					}
				}
				break;
			}
			case "assistant_call_cito": {
				const event = msg.payload as unknown as LanAssistantCitoEvent;
				for (const listener of this.assistantCitoListeners) {
					try {
						listener(event, msg as LanP2PMessage<LanAssistantCitoEvent>);
					} catch (err) {
						logger.error("[LanP2PDispatcher] Error in assistantCitoListener:", err);
					}
				}
				break;
			}
			case "invoice_transferred_to_cashier": {
				const event = msg.payload as unknown as LanInvoiceTransferEvent;
				for (const listener of this.invoiceTransferListeners) {
					try {
						listener(event, msg as LanP2PMessage<LanInvoiceTransferEvent>);
					} catch (err) {
						logger.error("[LanP2PDispatcher] Error in invoiceTransferListener:", err);
					}
				}
				break;
			}
			case "peer_presence_ping":
			case "custom_alert":
				break;
		}
	}

	// ─────────────────────────────────────────────────────────────────────────
	// BROADCAST DISPATCH METHODS
	// ─────────────────────────────────────────────────────────────────────────

	/**
	 * Broadcasts a typed message envelope over all active local transports.
	 */
	public async broadcastMessage<TPayload extends Record<string, unknown>>(
		message: LanP2PMessage<TPayload>,
	): Promise<boolean> {
		this.totalSent++;
		this.lastMessageIso = new Date().toISOString();

		// Record own message ID in dedup cache
		this.recordSeenMessageId(message.messageId, Date.now());

		let broadcastSuccessful = false;

		// 1. Transport 1: BroadcastChannel
		if (this.broadcastChannel) {
			try {
				this.broadcastChannel.postMessage(message);
				broadcastSuccessful = true;
			} catch (err) {
				logger.warn("[LanP2PDispatcher] Failed to send via BroadcastChannel:", err);
			}
		}

		// 2. Transport 2: WebSocket
		if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
			try {
				this.webSocket.send(JSON.stringify(message));
				broadcastSuccessful = true;
			} catch (err) {
				logger.warn("[LanP2PDispatcher] Failed to send via WebSocket:", err);
			}
		}

		// 3. Transport 3: Direct HTTP P2P relay to known peers
		const knownPeers = lanMeshReplicationService.getKnownPeers();
		if (knownPeers.length > 0) {
			const fetchFn = this.customFetch || (typeof fetch !== "undefined" ? fetch : null);
			if (fetchFn) {
				for (const peer of knownPeers) {
					if (peer.nodeId === this.nodeId) continue;
					try {
						const url = `${peer.baseUrl}/api/lan/p2p/dispatch`;
						fetchFn(url, {
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify(message),
						}).catch(() => {
							// Non-blocking fire-and-forget peer relay
						});
						broadcastSuccessful = true;
					} catch {}
				}
			}
		}

		return broadcastSuccessful;
	}

	/**
	 * Broadcasts a Chair Status Change event.
	 */
	public async broadcastChairStatus(params: {
		cabinetNumber: string | number;
		chairId: string;
		status: LanChairStatus;
		patientId?: string;
		patientName?: string;
		doctorId?: string;
		doctorName?: string;
		note?: string;
		vectorClock?: VectorClock;
	}): Promise<LanP2PMessage<LanChairStatusEvent>> {
		const event = createChairStatusEvent(params);
		const message = createLanP2PMessage({
			eventType: "chair_status_changed",
			senderNodeId: this.nodeId,
			senderRole: this.nodeRole,
			senderName: this.nodeName,
			organizationId: this.organizationId,
			payload: event as unknown as Record<string, unknown>,
			...(params.vectorClock ? { vectorClock: params.vectorClock } : {}),
		}) as LanP2PMessage<LanChairStatusEvent>;

		await this.broadcastMessage(message);
		return message;
	}

	/**
	 * Broadcasts an Assistant CITO emergency call event.
	 */
	public async broadcastAssistantCitoCall(params: {
		cabinetNumber: string | number;
		doctorId: string;
		doctorName: string;
		urgency?: LanCitoUrgency;
		reason?: LanCitoCallReason;
		customMessage?: string;
		vectorClock?: VectorClock;
	}): Promise<LanP2PMessage<LanAssistantCitoEvent>> {
		const event = createAssistantCitoEvent(params);
		const message = createLanP2PMessage({
			eventType: "assistant_call_cito",
			senderNodeId: this.nodeId,
			senderRole: this.nodeRole,
			senderName: this.nodeName,
			organizationId: this.organizationId,
			payload: event as unknown as Record<string, unknown>,
			...(params.vectorClock ? { vectorClock: params.vectorClock } : {}),
		}) as LanP2PMessage<LanAssistantCitoEvent>;

		await this.broadcastMessage(message);
		return message;
	}

	/**
	 * Broadcasts an Invoice Transfer to Reception Cashier desk event.
	 */
	public async broadcastInvoiceToCashier(params: {
		cabinetNumber: string | number;
		doctorId: string;
		doctorName: string;
		patientId: string;
		patientName: string;
		items: LanInvoiceTransferItem[];
		totalAmountRub?: number;
		totalAmountKopecks?: number;
		comments?: string;
		vectorClock?: VectorClock;
	}): Promise<LanP2PMessage<LanInvoiceTransferEvent>> {
		const event = createInvoiceTransferEvent(params);
		const message = createLanP2PMessage({
			eventType: "invoice_transferred_to_cashier",
			senderNodeId: this.nodeId,
			senderRole: this.nodeRole,
			senderName: this.nodeName,
			organizationId: this.organizationId,
			payload: event as unknown as Record<string, unknown>,
			...(params.vectorClock ? { vectorClock: params.vectorClock } : {}),
		}) as LanP2PMessage<LanInvoiceTransferEvent>;

		await this.broadcastMessage(message);
		return message;
	}

	/**
	 * Sends a lightweight presence ping over WebSocket.
	 */
	public sendPresencePing(): void {
		const message = createLanP2PMessage({
			eventType: "peer_presence_ping",
			senderNodeId: this.nodeId,
			senderRole: this.nodeRole,
			senderName: this.nodeName,
			organizationId: this.organizationId,
			payload: {
				status: "online",
				pingedAt: new Date().toISOString(),
			},
		});
		if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN) {
			this.webSocket.send(JSON.stringify(message));
		}
	}

	// ─────────────────────────────────────────────────────────────────────────
	// SUBSCRIPTION REGISTRATION
	// ─────────────────────────────────────────────────────────────────────────

	public onChairStatusChange(listener: ChairStatusListener): () => void {
		this.chairStatusListeners.add(listener);
		return () => {
			this.chairStatusListeners.delete(listener);
		};
	}

	public onAssistantCitoCall(listener: AssistantCitoListener): () => void {
		this.assistantCitoListeners.add(listener);
		return () => {
			this.assistantCitoListeners.delete(listener);
		};
	}

	public onInvoiceTransferredToCashier(listener: InvoiceTransferListener): () => void {
		this.invoiceTransferListeners.add(listener);
		return () => {
			this.invoiceTransferListeners.delete(listener);
		};
	}

	public onAnyEvent(listener: AnyP2PEventListener): () => void {
		this.anyEventListeners.add(listener);
		return () => {
			this.anyEventListeners.delete(listener);
		};
	}

	// ─────────────────────────────────────────────────────────────────────────
	// DIAGNOSTICS & CLEANUP
	// ─────────────────────────────────────────────────────────────────────────

	public getStatus(): LanP2PDispatcherStatus {
		const isBcActive = this.broadcastChannel !== null;
		const isWsActive = this.webSocket !== null && this.webSocket.readyState === WebSocket.OPEN;
		const transportCount = (isBcActive ? 1 : 0) + (isWsActive ? 1 : 0);

		return {
			nodeId: this.nodeId,
			nodeRole: this.nodeRole,
			nodeName: this.nodeName,
			organizationId: this.organizationId,
			isBroadcastChannelActive: isBcActive,
			isWebSocketConnected: isWsActive,
			activeTransportCount: transportCount,
			totalSentMessages: this.totalSent,
			totalReceivedMessages: this.totalReceived,
			lastMessageIso: this.lastMessageIso,
		};
	}

	private cleanupOldSeenIds(now: number): void {
		for (const [id, time] of this.seenMessageIds.entries()) {
			if (now - time > this.DEDUP_TTL_MS) {
				this.seenMessageIds.delete(id);
			}
		}
	}

	public destroy(): void {
		this.disconnectWebSocket();
		if (this.broadcastChannel) {
			try {
				this.broadcastChannel.close();
			} catch {}
			this.broadcastChannel = null;
		}
		this.chairStatusListeners.clear();
		this.assistantCitoListeners.clear();
		this.invoiceTransferListeners.clear();
		this.anyEventListeners.clear();
		this.seenMessageIds.clear();
	}
}

export const lanP2PDispatcher = LanP2PDispatcher.getInstance();
