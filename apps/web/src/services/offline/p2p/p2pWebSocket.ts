import { logger } from "../../../utils/logger";

export interface P2PWebSocketHandlers {
	onOpen: () => void;
	onMessage: (data: unknown) => void;
}

export function connectP2PWebSocket(
	url: string,
	handlers: P2PWebSocketHandlers,
	onClose: () => void,
): WebSocket | null {
	if (typeof WebSocket === "undefined") return null;

	try {
		const ws = new WebSocket(url);
		ws.onopen = () => {
			logger.info(`[LanP2PDispatcher] WebSocket connected to ${url}`);
			handlers.onOpen();
		};
		ws.onmessage = (event: MessageEvent) => {
			try {
				const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
				handlers.onMessage(data);
			} catch (err) {
				logger.warn("[LanP2PDispatcher] WebSocket parse error", err);
			}
		};
		ws.onerror = (err) => {
			logger.warn("[LanP2PDispatcher] WebSocket error", err);
		};
		ws.onclose = () => {
			onClose();
		};
		return ws;
	} catch (err) {
		logger.warn("[LanP2PDispatcher] Failed to create WebSocket connection", err);
		return null;
	}
}

export function sendViaWebSocket(ws: WebSocket | null, payload: unknown): boolean {
	if (ws && ws.readyState === WebSocket.OPEN) {
		try {
			ws.send(JSON.stringify(payload));
			return true;
		} catch (err) {
			logger.warn("[LanP2PDispatcher] Failed to send via WebSocket:", err);
		}
	}
	return false;
}

export function closeP2PWebSocket(ws: WebSocket | null): void {
	if (!ws) return;
	try {
		ws.onclose = null;
		ws.onerror = null;
		ws.close();
	} catch (err: unknown) {
		logger.warn("[LanP2PDispatcher] Error closing WebSocket on disconnect", err);
	}
}
