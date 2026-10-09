/**
 * DENTE CRM — Omni-Platform WebSocket Hub (Layer 2)
 *
 * Provides resilient WebSocket communication with exponential backoff, jitter,
 * token-based authentication frames, keepalive PING/PONG, and visibility/network reconnection.
 */

import { logger } from "../../utils/logger";
import type {
	OmniWebSocketOptions,
	OmniWebSocketClient,
} from "./types";

/**
 * Creates a resilient WebSocket connection with exponential backoff and jitter (Web Browser & PWA).
 * Automatically handles first-frame token authentication, PING/PONG keepalive, and network online recovery.
 */
export function createOmniWebSocket(
	url: string,
	options: OmniWebSocketOptions = {},
): OmniWebSocketClient {
	const baseMs = options.reconnectBaseMs ?? 1000;
	const maxMs = options.reconnectMaxMs ?? 30000;
	const pingInterval = options.pingIntervalMs ?? 25000;

	let socket: WebSocket | null = null;
	let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
	let pingTimer: ReturnType<typeof setInterval> | null = null;
	let attempts = 0;
	let explicitlyClosed = false;
	let connected = false;

	const connect = () => {
		if (typeof window === "undefined" || typeof WebSocket === "undefined") return;
		if (explicitlyClosed || !url) return;

		if (socket) {
			socket.onopen = null;
			socket.onmessage = null;
			socket.onerror = null;
			socket.onclose = null;
			try {
				socket.close();
			} catch (err: unknown) {
				logger.warn("[OmniPlatformAdapter] Error closing WebSocket on connect", err);
			}
			socket = null;
		}

		try {
			socket = new WebSocket(url);
		} catch (err: unknown) {
			logger.warn("[OmniPlatformAdapter] Failed to construct WebSocket:", err);
			scheduleReconnect();
			return;
		}

		socket.onopen = () => {
			attempts = 0;
			connected = true;

			// Send authentication frame if tokens exist
			const clinicToken = typeof localStorage !== "undefined" ? localStorage.getItem("dente_clinic_token") : null;
			const staffToken = typeof localStorage !== "undefined" ? localStorage.getItem("dente_staff_token") : null;
			if (clinicToken || staffToken) {
				try {
					socket?.send(
						JSON.stringify({
							type: "AUTH",
							payload: { clinicToken, staffToken },
						}),
					);
				} catch (err: unknown) {
					logger.warn("[OmniPlatformAdapter] Error sending AUTH frame over WebSocket", err);
				}
			}

			// Start ping keepalive
			if (pingInterval > 0) {
				pingTimer = setInterval(() => {
					if (typeof document !== "undefined" && document.hidden) return;
					if (socket?.readyState === WebSocket.OPEN) {
						socket.send("PING");
					}
				}, pingInterval);
			}

			options.onOpen?.();
		};

		socket.onmessage = (event) => {
			if (event.data === "PONG") return;
			try {
				const parsed = JSON.parse(event.data);
				if (parsed?.type === "AUTH_OK") return;
				options.onMessage?.(parsed);
			} catch {
				options.onMessage?.(event.data);
			}
		};

		socket.onerror = (e) => {
			options.onError?.(e);
		};

		socket.onclose = () => {
			connected = false;
			if (pingTimer) {
				clearInterval(pingTimer);
				pingTimer = null;
			}
			options.onClose?.();
			if (!explicitlyClosed) {
				scheduleReconnect();
			}
		};
	};

	const scheduleReconnect = () => {
		if (explicitlyClosed) return;
		// Skip reconnect polling while document is hidden to conserve CPU on low-spec laptops
		if (typeof document !== "undefined" && document.hidden) return;
		if (reconnectTimer) clearTimeout(reconnectTimer);

		// Full Jitter Exponential Backoff
		const exponential = Math.min(maxMs, baseMs * Math.pow(2, attempts));
		const factor = 0.5 + (Date.now() % 1000) / 2000;
		const delay = Math.max(100, Math.round(exponential * factor));
		attempts++;

		reconnectTimer = setTimeout(() => {
			connect();
		}, delay);
	};

	// Immediate reconnect when browser signals network online
	const handleOnline = () => {
		if (!connected && !explicitlyClosed) {
			attempts = 0;
			connect();
		}
	};

	// Reconnect or keepalive ping when user switches back to this tab
	const handleVisibilityChange = () => {
		if (typeof document === "undefined" || document.hidden) return;
		if (socket?.readyState === WebSocket.OPEN) {
			socket.send("PING");
		} else if (!connected && !explicitlyClosed) {
			attempts = 0;
			connect();
		}
	};

	if (typeof window !== "undefined") {
		window.addEventListener("online", handleOnline);
		if (typeof document !== "undefined") {
			document.addEventListener("visibilitychange", handleVisibilityChange);
		}
	}

	connect();

	return {
		get isConnected() {
			return connected && socket?.readyState === WebSocket.OPEN;
		},
		send(data: unknown): boolean {
			if (socket && socket.readyState === WebSocket.OPEN) {
				const payload = typeof data === "string" ? data : JSON.stringify(data);
				socket.send(payload);
				return true;
			}
			return false;
		},
		close() {
			explicitlyClosed = true;
			if (reconnectTimer) clearTimeout(reconnectTimer);
			if (pingTimer) clearInterval(pingTimer);
			if (typeof window !== "undefined") {
				window.removeEventListener("online", handleOnline);
				if (typeof document !== "undefined") {
					document.removeEventListener("visibilitychange", handleVisibilityChange);
				}
			}
			if (socket) {
				try {
					socket.close();
				} catch (err: unknown) {
					logger.warn("[OmniPlatformAdapter] Error closing WebSocket on disconnect", err);
				}
				socket = null;
			}
			connected = false;
		},
		reconnect() {
			explicitlyClosed = false;
			attempts = 0;
			connect();
		},
	};
}
