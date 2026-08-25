/**
 * DENTE CRM — Local Clinic Server Discovery & Offline Failover Engine
 *
 * Automatically discovers local clinic server across LAN / Wi-Fi subnet:
 * 1. Probes mDNS / Local domain `dente-server.local:4100` and `clinic.local:4100`
 * 2. Probes loopback `127.0.0.1:4100` (when running on local server machine)
 * 3. Probes cached local server addresses from previous sessions
 * 4. Enables seamless failover to Local LAN API when Cloud internet drops
 */

import { logger } from "../../utils/logger";
import { isLocalOrLanHostname } from "../../utils/networkConnectivity";

export interface DiscoveredLanServer {
	serverName: string;
	serverId: string;
	baseUrl: string;
	apiPort: number;
	hostname: string;
	lanAddresses: string[];
	version: string;
	status: "online" | "degraded";
	latencyMs: number;
	discoveredAt: string;
}

export interface LanDiscoveryOptions {
	timeoutMs?: number;
	additionalCandidates?: string[];
	forceRefresh?: boolean;
}

export const DEFAULT_LAN_BEACON_PORT = 4101;
export const DEFAULT_LAN_PROBE_TIMEOUT_MS = 300;

/**
 * Интервалы динамического хартбита:
 * - ACTIVE: 4000 мс (3-5 сек) при обрыве связи или активном поиске микросервера
 * - IDLE: 45000 мс (30-60 сек) в фоновом стабильном режиме для экономии батареи
 */
export const HEARTBEAT_INTERVAL_ACTIVE_MS = 4000;
export const HEARTBEAT_INTERVAL_IDLE_MS = 45000;
export const HEARTBEAT_INTERVAL_LOW_BATTERY_MS = 120000; // 120 сек (ультра-тихий режим при батарее <= 15% и discharging)
export const LOW_BATTERY_THRESHOLD = 0.15; // 15%

export interface BatteryState {
	isSupported: boolean;
	level: number;
	charging: boolean;
	isLowBatteryDischarging: boolean;
}

/**
 * Проверка состояния аккумулятора устройства через navigator.getBattery
 */
export async function getBatteryState(): Promise<BatteryState> {
	if (
		typeof navigator === "undefined" ||
		typeof (navigator as unknown as { getBattery?: () => Promise<unknown> }).getBattery !== "function"
	) {
		return { isSupported: false, level: 1.0, charging: true, isLowBatteryDischarging: false };
	}
	try {
		const battery = await (navigator as unknown as {
			getBattery: () => Promise<{ level?: number; charging?: boolean }>;
		}).getBattery();
		const level = typeof battery?.level === "number" ? battery.level : 1.0;
		const charging = typeof battery?.charging === "boolean" ? battery.charging : true;
		const isLowBatteryDischarging = !charging && level <= LOW_BATTERY_THRESHOLD;
		return {
			isSupported: true,
			level,
			charging,
			isLowBatteryDischarging,
		};
	} catch {
		return { isSupported: false, level: 1.0, charging: true, isLowBatteryDischarging: false };
	}
}

const STORAGE_KEY_LAN_SERVER = "dente_lan_server_url";
const STORAGE_KEY_ACTIVE_BASE_URL = "dente_active_api_base_url";

function getStorage(): Storage | null {
	try {
		if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
		if (typeof globalThis !== "undefined" && (globalThis as unknown as { localStorage?: Storage }).localStorage) {
			return (globalThis as unknown as { localStorage: Storage }).localStorage;
		}
	} catch {}
	return null;
}

let cachedDiscoveredServer: DiscoveredLanServer | null = null;
let activeApiBaseUrl: string =
	getStorage()?.getItem(STORAGE_KEY_ACTIVE_BASE_URL) || "/api";

/**
 * Generates candidate IP addresses for common LAN clinic subnets.
 * Prioritizes standard static IP addresses assigned to clinic server gateways/desktops.
 * Probes standard clinic server ports (3000, 4100, 4101, 8080).
 */
export function generateSubnetIpCandidates(
	baseSubnets: string[] = ["192.168.1", "192.168.0", "192.168.31", "192.168.100", "10.0.0"],
	ports: number[] = [3000, 4100, 4101],
): string[] {
	const priorityHostSuffixes = [1, 100, 200, 150, 250, 2, 10, 50, 88, 101, 155, 222];
	const candidates: string[] = [];

	for (const subnet of baseSubnets) {
		for (const suffix of priorityHostSuffixes) {
			for (const port of ports) {
				candidates.push(`http://${subnet}.${suffix}:${port}`);
			}
		}
	}
	return candidates;
}

/**
 * Returns list of LAN server candidate URLs to probe for local discovery
 */
export function getLanDiscoveryCandidates(additional: string[] = []): string[] {
	const candidates = new Set<string>();

	// 1. mDNS and local hostnames on standard ports (4100, 3000, 4101, 8080)
	const standardPorts = [4100, 3000, 4101, 8080];
	const localHosts = ["dente-server.local", "clinic.local", "127.0.0.1", "localhost"];

	for (const host of localHosts) {
		for (const port of standardPorts) {
			candidates.add(`http://${host}:${port}`);
		}
	}

	// 2. Previously cached LAN server URL
	const cached = getStorage()?.getItem(STORAGE_KEY_LAN_SERVER);
	if (cached) {
		try {
			const parsed = new URL(cached);
			candidates.add(parsed.origin);
		} catch {}
	}

	// 3. Current host if already in LAN subnet
	if (typeof window !== "undefined" && window.location) {
		const currentHost = window.location.hostname;
		if (isLocalOrLanHostname(currentHost) && currentHost !== "localhost" && currentHost !== "127.0.0.1") {
			for (const port of standardPorts) {
				candidates.add(`http://${currentHost}:${port}`);
			}
			// Infer current /24 subnet from hostname if IPv4
			if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(currentHost)) {
				const parts = currentHost.split(".");
				const currentSubnet = `${parts[0]}.${parts[1]}.${parts[2]}`;
				for (const url of generateSubnetIpCandidates([currentSubnet])) {
					candidates.add(url);
				}
			}
		}
	}

	// 4. Common clinic subnet candidate IPs
	for (const url of generateSubnetIpCandidates()) {
		candidates.add(url);
	}

	// 5. Additional candidate IPs from options
	for (const url of additional) {
		if (url) {
			try {
				const parsed = new URL(url.startsWith("http") ? url : `http://${url}`);
				candidates.add(parsed.origin);
			} catch {}
		}
	}

	return Array.from(candidates);
}

/**
 * Probes a candidate URL for DENTE Clinic Server discovery beacon
 * with fast non-blocking timeout (300ms by default) via AbortSignal.timeout.
 */
export async function probeCandidateServer(
	baseUrl: string,
	timeoutMs = DEFAULT_LAN_PROBE_TIMEOUT_MS,
): Promise<DiscoveredLanServer | null> {
	if (typeof window === "undefined" || typeof fetch !== "function") {
		return null;
	}

	const startTime = typeof performance !== "undefined" ? performance.now() : Date.now();
	const cleanBase = baseUrl.replace(/\/+$/, "");
	const probeUrl = `${cleanBase}/api/health/discovery`;

	let signal: AbortSignal | null = null;
	let timeoutId: ReturnType<typeof setTimeout> | null = null;

	if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
		try {
			signal = AbortSignal.timeout(timeoutMs);
		} catch {
			// fallback to AbortController
		}
	}

	let controller: AbortController | null = null;
	if (!signal && typeof AbortController !== "undefined") {
		controller = new AbortController();
		timeoutId = setTimeout(() => controller?.abort(), timeoutMs);
		signal = controller.signal;
	}

	try {
		const response = await fetch(probeUrl, {
			method: "GET",
			cache: "no-store",
			headers: { "x-dente-client": "lan-discovery" },
			signal: signal || null,
		});

		if (timeoutId) clearTimeout(timeoutId);

		if (!response.ok) {
			if (signal?.aborted) return null;
			// Fast Fallback: check /api/health
			const healthUrl = `${cleanBase}/api/health`;
			const healthRes = await fetch(healthUrl, {
				method: "GET",
				cache: "no-store",
				signal: signal || null,
			});
			if (!healthRes.ok) return null;

			const latencyMs = Math.max(1, Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - startTime));
			return {
				serverName: "DENTE Dental CRM Server",
				serverId: "lan-fallback-server",
				baseUrl: cleanBase,
				apiPort: 4100,
				hostname: "dente-server.local",
				lanAddresses: [new URL(cleanBase).hostname],
				version: "0.1.0",
				status: "online",
				latencyMs,
				discoveredAt: new Date().toISOString(),
			};
		}

		const data = await response.json() as Record<string, unknown>;
		const endTime = typeof performance !== "undefined" ? performance.now() : Date.now();
		const latencyMs = Math.max(1, Math.round(endTime - startTime));

		return {
			serverName: String(data.serverName || "DENTE Dental CRM Server"),
			serverId: String(data.serverId || "lan-server"),
			baseUrl: cleanBase,
			apiPort: Number(data.apiPort) || 4100,
			hostname: String(data.hostname || "dente-server.local"),
			lanAddresses: Array.isArray(data.lanAddresses) ? (data.lanAddresses as string[]) : [new URL(cleanBase).hostname],
			version: String(data.version || "0.1.0"),
			status: data.status === "degraded" ? "degraded" : "online",
			latencyMs,
			discoveredAt: new Date().toISOString(),
		};
	} catch (err) {
		if (timeoutId) clearTimeout(timeoutId);
		logger.debug(`[LanDiscovery] Probe failed for ${baseUrl}:`, err);
		return null;
	}
}

/**
 * Discovers the active local clinic server across all candidate endpoints.
 * Executes non-blocking parallel probes across all candidate IP/mDNS endpoints.
 */
export async function discoverLocalClinicServer(
	options: LanDiscoveryOptions = {},
): Promise<DiscoveredLanServer | null> {
	if (cachedDiscoveredServer && !options.forceRefresh) {
		return cachedDiscoveredServer;
	}

	const candidates = getLanDiscoveryCandidates(options.additionalCandidates);
	const timeoutMs = options.timeoutMs || DEFAULT_LAN_PROBE_TIMEOUT_MS;

	const probePromises = candidates.map((candidate) => probeCandidateServer(candidate, timeoutMs));
	const results = await Promise.allSettled(probePromises);

	let bestServer: DiscoveredLanServer | null = null;

	for (const res of results) {
		if (res.status === "fulfilled" && res.value) {
			if (!bestServer || res.value.latencyMs < bestServer.latencyMs) {
				bestServer = res.value;
			}
		}
	}

	if (bestServer) {
		cachedDiscoveredServer = bestServer;
		try {
			getStorage()?.setItem(STORAGE_KEY_LAN_SERVER, bestServer.baseUrl);
		} catch {}
		logger.info(`[LanDiscovery] Found active Clinic LAN Server at ${bestServer.baseUrl} (${bestServer.latencyMs}ms)`);
	}

	return bestServer;
}

/**
 * Returns active API base URL for outgoing clinical requests.
 */
export function getActiveApiBaseUrl(): string {
	return activeApiBaseUrl;
}

/**
 * Sets active API base URL (e.g. switching between Cloud and Local LAN Server).
 */
export function setActiveApiBaseUrl(url: string): void {
	activeApiBaseUrl = url;
	try {
		getStorage()?.setItem(STORAGE_KEY_ACTIVE_BASE_URL, url);
	} catch {}
	if (typeof window !== "undefined") {
		try {
			window.dispatchEvent(new CustomEvent("dente:api-base-url-changed", { detail: { url } }));
		} catch {}
	}
}

/**
 * Returns true if the client is currently routed to the local fallback clinic server.
 */
export function isUsingLocalFallbackServer(): boolean {
	return activeApiBaseUrl !== "/api" && activeApiBaseUrl.includes("://");
}

/**
 * Automatically activates local LAN server failover when Cloud connection is offline.
 */
export async function switchApiToLocalLanServer(): Promise<boolean> {
	const server = await discoverLocalClinicServer({ forceRefresh: true });
	if (server) {
		const targetApiUrl = `${server.baseUrl}/api`;
		setActiveApiBaseUrl(targetApiUrl);
		logger.info(`[LanDiscovery] Switched API endpoint to Local Clinic Server: ${targetApiUrl}`);
		return true;
	}
	return false;
}

/**
 * Resets active API endpoint back to standard Cloud API.
 */
export function resetApiToCloud(): void {
	setActiveApiBaseUrl("/api");
	logger.info("[LanDiscovery] Restored API endpoint to Cloud / Default Proxy");
}

/**
 * Creates a resilient fetch wrapper that automatically switches to local LAN server
 * if remote Cloud API is unreachable due to network outage or connection error.
 */
export function createLanFailoverFetch(
	baseFetch: typeof fetch = typeof fetch !== "undefined" ? fetch : (() => Promise.reject(new Error("fetch undefined"))) as unknown as typeof fetch,
): typeof fetch {
	return (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
		try {
			const res = await baseFetch(input, init);
			// При успешном ответе сообщаем менеджеру хартбита о доступности облака
			lanHeartbeatManager.setCloudReachable(true);
			return res;
		} catch (networkErr) {
			const urlStr =
				typeof input === "string"
					? input
					: input instanceof URL
						? input.toString()
						: (input as Request).url;

			const isLocalOrLan =
				urlStr.startsWith("/") ||
				isLocalOrLanHostname(new URL(urlStr, "http://localhost").hostname);

			if (urlStr.startsWith("/api") || !isLocalOrLan) {
				logger.warn(
					"[LanDiscovery] Cloud request failed, switching to fast LAN discovery heartbeat...",
					networkErr,
				);
				lanHeartbeatManager.setCloudReachable(false);
				const discovered = await discoverLocalClinicServer({ forceRefresh: true });
				if (discovered) {
					const targetUrl = urlStr.startsWith("/api")
						? `${discovered.baseUrl}${urlStr}`
						: urlStr.replace(/^https?:\/\/[^/]+/, discovered.baseUrl);
					logger.info(
						`[LanDiscovery] Retrying request on local clinic server: ${targetUrl}`,
					);
					setActiveApiBaseUrl(`${discovered.baseUrl}/api`);
					return await baseFetch(targetUrl, init);
				}
			}
			throw networkErr;
		}
	}) as typeof fetch;
}

export interface LanHeartbeatState {
	isRunning: boolean;
	currentIntervalMs: number;
	lastDiscoveredServer: DiscoveredLanServer | null;
	isCloudReachable: boolean;
}

/**
 * Менеджер динамического адаптивного хартбита LAN Discovery:
 * - 3–5 сек (4000 мс) при обрыве интернета, ошибках сети и событиях window.offline;
 * - 30–60 сек (45000 мс) в стабильном фоновом режиме для сбережения аккумулятора.
 */
export class LanDiscoveryHeartbeatManager {
	private static instance: LanDiscoveryHeartbeatManager | null = null;
	private timerId: ReturnType<typeof setTimeout> | null = null;
	private isRunning = false;
	private currentIntervalMs = HEARTBEAT_INTERVAL_IDLE_MS;
	private isCloudReachable = true;
	private isLowBatteryDischarging = false;
	private listeners = new Set<(server: DiscoveredLanServer | null) => void>();

	public static getInstance(): LanDiscoveryHeartbeatManager {
		if (!LanDiscoveryHeartbeatManager.instance) {
			LanDiscoveryHeartbeatManager.instance = new LanDiscoveryHeartbeatManager();
		}
		return LanDiscoveryHeartbeatManager.instance;
	}

	public start(): void {
		if (this.isRunning) return;
		this.isRunning = true;
		this.initNetworkListeners();
		void this.initBatteryListener();
		this.scheduleNextTick(0);
	}

	public stop(): void {
		this.isRunning = false;
		if (this.timerId) {
			clearTimeout(this.timerId);
			this.timerId = null;
		}
	}

	public setCloudReachable(reachable: boolean): void {
		const prev = this.isCloudReachable;
		this.isCloudReachable = reachable;
		this.recalculateInterval();
		if (!reachable && this.isRunning) {
			this.scheduleNextTick(0);
		}
	}

	public setLowBatteryState(isLow: boolean): void {
		this.isLowBatteryDischarging = isLow;
		this.recalculateInterval();
	}

	public async checkBatteryStatus(): Promise<boolean> {
		const state = await getBatteryState();
		this.setLowBatteryState(state.isLowBatteryDischarging);
		return this.isLowBatteryDischarging;
	}

	private recalculateInterval(): void {
		if (!this.isCloudReachable) {
			this.setInterval(HEARTBEAT_INTERVAL_ACTIVE_MS);
		} else if (this.isLowBatteryDischarging) {
			this.setInterval(HEARTBEAT_INTERVAL_LOW_BATTERY_MS);
		} else {
			this.setInterval(HEARTBEAT_INTERVAL_IDLE_MS);
		}
	}

	public setInterval(intervalMs: number): void {
		this.currentIntervalMs = intervalMs;
		if (this.isRunning && this.timerId) {
			clearTimeout(this.timerId);
			this.scheduleNextTick(this.currentIntervalMs);
		}
	}

	public getInterval(): number {
		return this.currentIntervalMs;
	}

	public getState(): LanHeartbeatState & { isLowBatteryDischarging: boolean } {
		return {
			isRunning: this.isRunning,
			currentIntervalMs: this.currentIntervalMs,
			lastDiscoveredServer: cachedDiscoveredServer,
			isCloudReachable: this.isCloudReachable,
			isLowBatteryDischarging: this.isLowBatteryDischarging,
		};
	}

	public onServerChanged(listener: (server: DiscoveredLanServer | null) => void): () => void {
		this.listeners.add(listener);
		return () => this.listeners.delete(listener);
	}

	private initNetworkListeners(): void {
		if (typeof window === "undefined") return;

		window.addEventListener("online", () => {
			logger.info("[LanDiscovery] Network online event received — restoring idle/battery heartbeat");
			this.setCloudReachable(true);
			this.scheduleNextTick(0);
		});

		window.addEventListener("offline", () => {
			logger.info("[LanDiscovery] Network offline event received — activating fast LAN discovery");
			this.setCloudReachable(false);
		});
	}

	private async initBatteryListener(): Promise<void> {
		if (
			typeof navigator === "undefined" ||
			typeof (navigator as unknown as { getBattery?: () => Promise<unknown> }).getBattery !== "function"
		) {
			return;
		}
		try {
			const battery = await (navigator as unknown as {
				getBattery: () => Promise<{
					level?: number;
					charging?: boolean;
					addEventListener?: (type: string, listener: () => void) => void;
				}>;
			}).getBattery();
			if (!battery) return;

			const update = () => {
				void this.checkBatteryStatus();
			};

			if (typeof battery.addEventListener === "function") {
				battery.addEventListener("levelchange", update);
				battery.addEventListener("chargingchange", update);
			}
			await this.checkBatteryStatus();
		} catch (err) {
			logger.debug("[LanDiscovery] Battery API listener skipped", err);
		}
	}

	private scheduleNextTick(delayMs: number): void {
		if (!this.isRunning) return;
		if (this.timerId) clearTimeout(this.timerId);

		this.timerId = setTimeout(async () => {
			try {
				const prevServerId = cachedDiscoveredServer?.serverId;
				const server = await discoverLocalClinicServer({ forceRefresh: true });
				if (server?.serverId !== prevServerId) {
					for (const l of this.listeners) {
						try {
							l(server);
						} catch (err) {
							logger.error("[LanDiscovery] Listener error", err);
						}
					}
				}
			} catch (err) {
				logger.debug("[LanDiscovery] Heartbeat tick failed", err);
			} finally {
				if (this.isRunning) {
					this.scheduleNextTick(this.currentIntervalMs);
				}
			}
		}, delayMs);
	}
}

export const lanHeartbeatManager = LanDiscoveryHeartbeatManager.getInstance();


