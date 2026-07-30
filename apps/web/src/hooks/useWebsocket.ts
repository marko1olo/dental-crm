import { useCallback, useEffect, useRef, useState } from "react";
import { safeLocalStorageGetItem, DENTE_CLINIC_TOKEN_KEY, DENTE_STAFF_TOKEN_KEY } from "../lib/safeLocalStorage";

type WebSocketMessage = {
	type: string;
	payload: any;
};

/** Первая задержка переподключения и потолок. */
const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30_000;

/**
 * Токены живут в localStorage под этими ключами — те же, что использует
 * остальной интерфейс.
 */
function readAuthPayload(): { clinicToken: string | null; staffToken: string | null } {
	return {
		clinicToken: safeLocalStorageGetItem(DENTE_CLINIC_TOKEN_KEY),
		staffToken: safeLocalStorageGetItem(DENTE_STAFF_TOKEN_KEY),
	};
}

export function useWebsocket(url: string) {
	const [isConnected, setIsConnected] = useState(false);
	const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
	const ws = useRef<WebSocket | null>(null);
	const reconnectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
	// Счётчик неудач для экспоненциального отступа. Раньше переподключение шло
	// жёстко каждые 3 секунды: пока эндпоинта вообще не существовало, каждая
	// вкладка непрерывно долбила сервер пятью сокетами сразу — около сотни
	// проваленных рукопожатий в минуту и столько же строк ошибок в консоли.
	const attempts = useRef(0);
	const closedByUs = useRef(false);

	const connect = useCallback(() => {
		if (ws.current?.readyState === WebSocket.OPEN) return;
		if (ws.current?.readyState === WebSocket.CONNECTING) return;

		const socket = new WebSocket(url);
		ws.current = socket;

		socket.onopen = () => {
			attempts.current = 0;
			setIsConnected(true);
			// Браузерный WebSocket не умеет ставить заголовки, а токен в
			// query-строке попал бы в журналы доступа и в историю браузера.
			// Поэтому авторизация идёт первым кадром: до неё сервер держит
			// соединение неподписанным и закрывает по таймауту.
			const { clinicToken, staffToken } = readAuthPayload();
			if (clinicToken || staffToken) {
				socket.send(JSON.stringify({ type: "AUTH", payload: { clinicToken, staffToken } }));
			}
		};

		socket.onmessage = (event) => {
			if (event.data === "PONG") return;
			try {
				const data: WebSocketMessage = JSON.parse(event.data);
				// AUTH_OK — служебное подтверждение подписки, наверх не отдаём.
				if (data?.type === "AUTH_OK") return;
				setLastMessage(data);
			} catch {
				// Silently ignore non-JSON frames
			}
		};

		socket.onclose = () => {
			setIsConnected(false);
			if (closedByUs.current) return;
			const delay = Math.min(RECONNECT_BASE_MS * 2 ** attempts.current, RECONNECT_MAX_MS);
			attempts.current += 1;
			reconnectTimeout.current = setTimeout(connect, delay);
		};

		socket.onerror = () => {
			socket.close();
		};
	}, [url]);

	useEffect(() => {
		closedByUs.current = false;
		connect();

		const pingInterval = setInterval(() => {
			if (ws.current?.readyState === WebSocket.OPEN) {
				ws.current.send("PING");
			}
		}, 30000);

		return () => {
			closedByUs.current = true;
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
