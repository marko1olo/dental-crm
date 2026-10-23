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

/** Время ожидания открытия сокета до переключения на резервный адрес. */
const OPEN_FALLBACK_TIMEOUT_MS = 4000;

export function useWebsocket(url: string, fallbackUrl?: string) {
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
	// Резервный адрес включается, когда основной не открывается (в dev-стенде
	// vite-прокси может быть поднят без ws-апгрейда). Как только резерв открылся,
	// он остаётся активным до конца жизни хука.
	const useFallbackUrl = useRef(false);
	const openGuardTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

	const connect = useCallback(() => {
		const targetUrl = useFallbackUrl.current && fallbackUrl ? fallbackUrl : url;
		if (!targetUrl) return;
		if (typeof WebSocket === "undefined") return;
		if (closedByUs.current) return;
		if (ws.current?.readyState === WebSocket.OPEN) return;
		if (ws.current?.readyState === WebSocket.CONNECTING) return;

		// Cancel any pending reconnect timers before initiating new connection
		if (reconnectTimeout.current) {
			clearTimeout(reconnectTimeout.current);
			reconnectTimeout.current = null;
		}

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

		const socket = new WebSocket(targetUrl);
		ws.current = socket;

		// Страховка от «висящего» рукопожатия: если сокет не открылся за
		// OPEN_FALLBACK_TIMEOUT_MS, а резервный адрес задан — переключаемся на
		// него (vite-прокси без ws:true принимает TCP, но апгрейда не делает).
		if (fallbackUrl && fallbackUrl !== targetUrl) {
			openGuardTimeout.current = setTimeout(() => {
				if (closedByUs.current) return;
				if (socket.readyState !== WebSocket.OPEN) {
					useFallbackUrl.current = true;
					try {
						socket.close();
					} catch {
						// ignore — реконнект планирует onclose
					}
				}
			}, OPEN_FALLBACK_TIMEOUT_MS);
		}

		socket.onopen = () => {
			if (closedByUs.current) return;
			if (openGuardTimeout.current) {
				clearTimeout(openGuardTimeout.current);
				openGuardTimeout.current = null;
			}
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
	}, [url, fallbackUrl]);

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
			if (openGuardTimeout.current) {
				clearTimeout(openGuardTimeout.current);
				openGuardTimeout.current = null;
			}
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
