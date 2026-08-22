/**
 * DENTE CRM — Network Connectivity & Health-Check RTT Monitor
 *
 * Детекция сетевых состояний:
 * - «🟢 Онлайн (Облако)»
 * - «🟡 Локальная сеть клиники (LAN/Wi-Fi)»
 * - «🟠 Автономный офлайн»
 *
 * Автоматический перехват online/offline событий и измерение задержки RTT.
 */

import { logger } from "./logger";

export type ConnectivityMode = "cloud_online" | "lan_online" | "offline";

export interface NetworkState {
	mode: ConnectivityMode;
	label: string;
	badgeClass: "cloud" | "lan" | "offline";
	rttMs: number | null;
	lastCheckedAt: string | null;
	isOnline: boolean;
	isLan: boolean;
}

export const NETWORK_STATE_LABELS: Record<ConnectivityMode, string> = {
	cloud_online: "🟢 Онлайн (Облако)",
	lan_online: "🟡 Локальная сеть клиники (LAN/Wi-Fi)",
	offline: "🟠 Автономный офлайн",
};

export const INITIAL_NETWORK_STATE: NetworkState = {
	mode: "cloud_online",
	label: NETWORK_STATE_LABELS.cloud_online,
	badgeClass: "cloud",
	rttMs: null,
	lastCheckedAt: null,
	isOnline: true,
	isLan: false,
};

/**
 * Определение, является ли хост локальным или узлом локальной сети клиники
 */
export function isLocalOrLanHostname(hostname: string): boolean {
	const host = hostname.toLowerCase().trim();
	if (!host) return false;

	if (
		host === "localhost" ||
		host === "127.0.0.1" ||
		host === "::1" ||
		host === "[::1]" ||
		host.endsWith(".local") ||
		host.endsWith(".lan") ||
		host === "clinic.local"
	) {
		return true;
	}

	// 10.0.0.0 – 10.255.255.255
	if (host.startsWith("10.")) return true;

	// 192.168.0.0 – 192.168.255.255
	if (host.startsWith("192.168.")) return true;

	// 172.16.0.0 – 172.31.255.255
	const match172 = host.match(/^172\.(\d+)\./);
	if (match172 && match172[1]) {
		const secondOctet = Number.parseInt(match172[1], 10);
		if (secondOctet >= 16 && secondOctet <= 31) {
			return true;
		}
	}

	return false;
}

export interface PingOptions {
	pingUrl?: string | undefined;
	timeoutMs?: number | undefined;
}

/**
 * Измерение Round-Trip Time (RTT) пинга к API
 */
export async function measureNetworkRtt(
	options: PingOptions = {},
): Promise<{ ok: boolean; rttMs: number | null }> {
	const pingUrl = options.pingUrl || "/api/health";
	const timeoutMs = options.timeoutMs || 4000;

	if (typeof window === "undefined" || typeof fetch !== "function") {
		return { ok: true, rttMs: 1 };
	}

	const start = typeof performance !== "undefined" ? performance.now() : Date.now();

	try {
		const controller =
			typeof AbortController !== "undefined" ? new AbortController() : null;
		const timeoutId = controller
			? setTimeout(() => controller.abort(), timeoutMs)
			: null;

		const init: RequestInit = {
			method: "HEAD",
			cache: "no-store",
			headers: { "x-dente-ping": "rtt-probe" },
			signal: controller ? controller.signal : null,
		};

		const response = await fetch(pingUrl, init).catch(async () => {
			// If HEAD is not supported, try GET with light headers
			const getInit: RequestInit = {
				method: "GET",
				cache: "no-store",
				headers: { "x-dente-ping": "rtt-probe" },
				signal: controller ? controller.signal : null,
			};
			return await fetch(pingUrl, getInit);
		});

		if (timeoutId) clearTimeout(timeoutId);

		const end = typeof performance !== "undefined" ? performance.now() : Date.now();
		const rttMs = Math.max(1, Math.round(end - start));

		return {
			ok: response.ok || response.status < 500,
			rttMs,
		};
	} catch (err) {
		logger.debug("[NetworkConnectivity] Ping failed", err);
		return { ok: false, rttMs: null };
	}
}

/**
 * Полное определение текущего сетевого состояния
 */
export async function determineNetworkConnectivity(
	options: PingOptions = {},
): Promise<NetworkState> {
	const nowIso = new Date().toISOString();

	// 1. Быстрая проверка браузерного флага offline
	if (typeof navigator !== "undefined" && navigator.onLine === false) {
		return {
			mode: "offline",
			label: NETWORK_STATE_LABELS.offline,
			badgeClass: "offline",
			rttMs: null,
			lastCheckedAt: nowIso,
			isOnline: false,
			isLan: false,
		};
	}

	// 2. Пинг сервера и замер задержки RTT
	const pingResult = await measureNetworkRtt(options);

	if (!pingResult.ok) {
		return {
			mode: "offline",
			label: NETWORK_STATE_LABELS.offline,
			badgeClass: "offline",
			rttMs: null,
			lastCheckedAt: nowIso,
			isOnline: false,
			isLan: false,
		};
	}

	// 3. Классификация LAN vs Cloud
	const currentHost =
		typeof window !== "undefined" && window.location
			? window.location.hostname
			: "localhost";

	const isLan = isLocalOrLanHostname(currentHost);
	const mode: ConnectivityMode = isLan ? "lan_online" : "cloud_online";

	return {
		mode,
		label: NETWORK_STATE_LABELS[mode],
		badgeClass: isLan ? "lan" : "cloud",
		rttMs: pingResult.rttMs,
		lastCheckedAt: nowIso,
		isOnline: true,
		isLan,
	};
}

/**
 * Создание реактивного монитора сети с подпиской на события и периодическим опросом
 */
export function createNetworkMonitor(
	callback: (state: NetworkState) => void,
	intervalMs: number = 30000,
	options: PingOptions = {},
): () => void {
	let timerId: ReturnType<typeof setInterval> | null = null;
	let disposed = false;

	const runCheck = async () => {
		if (disposed) return;
		try {
			const state = await determineNetworkConnectivity(options);
			if (!disposed) callback(state);
		} catch (err) {
			logger.error("[NetworkMonitor] Check error", err);
		}
	};

	const onOnline = () => {
		void runCheck();
	};

	const onOffline = () => {
		if (!disposed) {
			callback({
				mode: "offline",
				label: NETWORK_STATE_LABELS.offline,
				badgeClass: "offline",
				rttMs: null,
				lastCheckedAt: new Date().toISOString(),
				isOnline: false,
				isLan: false,
			});
		}
	};

	const onVisibilityChange = () => {
		if (
			typeof document !== "undefined" &&
			document.visibilityState === "visible"
		) {
			void runCheck();
		}
	};

	if (typeof window !== "undefined") {
		window.addEventListener("online", onOnline);
		window.addEventListener("offline", onOffline);
		if (typeof document !== "undefined") {
			document.addEventListener("visibilitychange", onVisibilityChange);
		}
	}

	// Первичный запуск
	void runCheck();

	// Периодический пинг
	if (intervalMs > 0) {
		timerId = setInterval(() => void runCheck(), intervalMs);
	}

	return () => {
		disposed = true;
		if (timerId) clearInterval(timerId);
		if (typeof window !== "undefined") {
			window.removeEventListener("online", onOnline);
			window.removeEventListener("offline", onOffline);
			if (typeof document !== "undefined") {
				document.removeEventListener("visibilitychange", onVisibilityChange);
			}
		}
	};
}
