import { useCallback, useEffect, useRef, useState } from "react";

type WebSocketMessage = {
	type: string;
	payload: any;
};

export function useWebsocket(url: string) {
	const [isConnected, setIsConnected] = useState(false);
	const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
	const ws = useRef<WebSocket | null>(null);
	const reconnectTimeout = useRef<NodeJS.Timeout | null>(null);

	const connect = useCallback(() => {
		if (ws.current?.readyState === WebSocket.OPEN) return;

		ws.current = new WebSocket(url);

		ws.current.onopen = () => {
			setIsConnected(true);
		};

		ws.current.onmessage = (event) => {
			if (event.data === "PONG") return;
			try {
				const data: WebSocketMessage = JSON.parse(event.data);
				setLastMessage(data);
			} catch {
				// Silently ignore non-JSON frames
			}
		};

		ws.current.onclose = () => {
			setIsConnected(false);
			reconnectTimeout.current = setTimeout(connect, 3000);
		};

		ws.current.onerror = () => {
			ws.current?.close();
		};
	}, [url]);

	useEffect(() => {
		connect();

		const pingInterval = setInterval(() => {
			if (ws.current?.readyState === WebSocket.OPEN) {
				ws.current.send("PING");
			}
		}, 30000);

		return () => {
			clearInterval(pingInterval);
			if (reconnectTimeout.current) clearTimeout(reconnectTimeout.current);
			if (ws.current) {
				ws.current.onclose = null; // Prevent reconnect on intentional unmount
				ws.current.close();
			}
		};
	}, [connect]);

	const sendMessage = useCallback((type: string, payload: any) => {
		if (ws.current?.readyState === WebSocket.OPEN) {
			ws.current.send(JSON.stringify({ type, payload }));
		}
		// Silently drop message if socket not open — callers should handle reconnect state via isConnected
	}, []);

	return { isConnected, lastMessage, sendMessage };
}
