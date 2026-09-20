import { useCallback, useEffect, useRef, useState } from "react";
import {
	DENTE_CLINIC_TOKEN_KEY,
	DENTE_STAFF_TOKEN_KEY,
	safeLocalStorageGetItem,
} from "../lib/safeLocalStorage";

type WebSocketMessage = {
	type: string;
	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	payload: any;
};

/** Первая задержка переподключения и потолок. */
const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30_000;

/**
 * Токены живут в localStorage под этими ключами — те же, что использует
 * остальной интерфейс.
 */
function readAuthPayload(): {
	clinicToken: string | null;
	staffToken: string | null;
} {
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
		if (!url) return;
		if (typeof WebSocket === "undefined") return;
		if (closedByUs.current) return;
		if (ws.current?.readyState === WebSocket.OPEN) return;
		if (ws.current?.readyState === WebSocket.CONNECTING) return;

		// Полная очистка предыдущего сокета (включая состояние CLOSING) перед созданием нового
		if (ws.current) {
			ws.current.onopen = null;
			ws.current.onmessage = null;
			ws.current.onerror = null;
			ws.current.onclose = null;
			try {
				ws.current.close();
			} catch (err: unknown) {
				console.warn("[useWebsocket] Error closing previous socket:", err);
			}
			ws.current = null;
		}

		const socket = new WebSocket(url);
		ws.current = socket;

		socket.onopen = () => {
			if (closedByUs.current) return;
			attempts.current = 0;
			setIsConnected(true);
			// Браузерный WebSocket не умеет ставить заголовки, а токен в
			// query-строке попал бы в журналы доступа и в историю браузера.
			// Поэтому авторизация идёт первым кадром: до неё сервер держит
			// соединение неподписанным и закрывает по таймауту.
			const { clinicToken, staffToken } = readAuthPayload();
			if (clinicToken || staffToken) {
				socket.send(
					JSON.stringify({
						type: "AUTH",
						payload: { clinicToken, staffToken },
					}),
				);
			}
		};

		socket.onmessage = (event) => {
			if (closedByUs.current) return;
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
			if (closedByUs.current) return;
			setIsConnected(false);
			attempts.current += 1;
			if (reconnectTimeout.current) {
				clearTimeout(reconnectTimeout.current);
				reconnectTimeout.current = null;
			}
			// При скрытой вкладке (document.hidden) не крутим быстрый цикл реконнекта на слабом CPU
			if (typeof document !== "undefined" && document.hidden) {
				return;
			}
			const delay = Math.min(
				RECONNECT_BASE_MS * 2 ** attempts.current,
				RECONNECT_MAX_MS,
			);
			// Джиттер ±20% для исключения thundering herd при одновременном реконнекте вкладок (без Math.random)
			let randomFraction = 0.5;
			if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
				const buf = new Uint32Array(1);
				crypto.getRandomValues(buf);
				randomFraction = buf[0]! / 0xffffffff;
			}
			const jitter = delay * 0.2 * (randomFraction - 0.5);
			const effectiveDelay = Math.max(RECONNECT_BASE_MS, Math.round(delay + jitter));
			reconnectTimeout.current = setTimeout(connect, effectiveDelay);
		};

		socket.onerror = () => {
			socket.close();
		};
	}, [url]);

	useEffect(() => {
		closedByUs.current = false;
		connect();

		const pingInterval = setInterval(() => {
			// Дропаем пинг при скрытой фоновой вкладке для экономии CPU старых ноутбуков
			if (typeof document !== "undefined" && document.hidden) {
				return;
			}
			if (ws.current?.readyState === WebSocket.OPEN) {
				ws.current.send("PING");
			}
		}, 30000);

		const handleVisibilityChange = () => {
			if (typeof document === "undefined" || document.hidden) return;
			// При возвращении во вкладку немедленно проверяем статус сокета
			if (ws.current?.readyState === WebSocket.OPEN) {
				ws.current.send("PING");
			} else if (!ws.current || ws.current.readyState === WebSocket.CLOSED) {
				attempts.current = 0;
				connect();
			}
		};

		if (typeof document !== "undefined") {
			document.addEventListener("visibilitychange", handleVisibilityChange);
		}

		return () => {
			closedByUs.current = true;
			clearInterval(pingInterval);
			if (typeof document !== "undefined") {
				document.removeEventListener("visibilitychange", handleVisibilityChange);
			}
			if (reconnectTimeout.current) {
				clearTimeout(reconnectTimeout.current);
				reconnectTimeout.current = null;
			}
			if (ws.current) {
				ws.current.onopen = null;
				ws.current.onmessage = null;
				ws.current.onerror = null;
				ws.current.onclose = null; // Prevent reconnect on intentional unmount
				try {
					ws.current.close();
				} catch (err: unknown) {
					console.warn("[useWebsocket] Error closing socket on unmount:", err);
				}
				ws.current = null;
			}
		};
	}, [connect]);

	// biome-ignore lint/suspicious/noExplicitAny: automated suppression
	const sendMessage = useCallback((type: string, payload: any) => {
		if (ws.current?.readyState === WebSocket.OPEN) {
			ws.current.send(JSON.stringify({ type, payload }));
		}
		// Silently drop message if socket not open — callers should handle reconnect state via isConnected
	}, []);

	return { isConnected, lastMessage, sendMessage };
}
