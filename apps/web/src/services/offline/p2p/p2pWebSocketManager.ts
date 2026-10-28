import { closeP2PWebSocket, connectP2PWebSocket } from "./p2pWebSocket";

export class P2PWebSocketManager {
	public webSocket: WebSocket | null = null;
	public customWebSocketUrl: string | null = null;
	public isWsConnecting = false;
	private wsReconnectTimer: ReturnType<typeof setTimeout> | null = null;

	public connect(url: string, onOpen: () => void, onMessage: (data: unknown) => void): void {
		this.customWebSocketUrl = url;
		this.reconnect(onOpen, onMessage);
	}

	public disconnect(): void {
		if (this.wsReconnectTimer) {
			clearTimeout(this.wsReconnectTimer);
			this.wsReconnectTimer = null;
		}
		closeP2PWebSocket(this.webSocket);
		this.webSocket = null;
		this.isWsConnecting = false;
	}

	public reconnect(onOpen: () => void, onMessage: (data: unknown) => void): void {
		if (typeof WebSocket === "undefined" || !this.customWebSocketUrl || this.isWsConnecting) return;
		if (this.webSocket && this.webSocket.readyState === WebSocket.OPEN) return;

		this.isWsConnecting = true;
		this.webSocket = connectP2PWebSocket(
			this.customWebSocketUrl,
			{ onOpen: () => { this.isWsConnecting = false; onOpen(); }, onMessage },
			() => {
				this.isWsConnecting = false;
				this.webSocket = null;
				if (this.customWebSocketUrl && !this.wsReconnectTimer) {
					this.wsReconnectTimer = setTimeout(() => {
						this.wsReconnectTimer = null;
						this.reconnect(onOpen, onMessage);
					}, 3000);
					if (typeof (this.wsReconnectTimer as unknown as { unref?: () => void })?.unref === "function") {
						(this.wsReconnectTimer as unknown as { unref: () => void }).unref();
					}
				}
			},
		);
	}
}
