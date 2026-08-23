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

const STORAGE_KEY_LAN_SERVER = "dente_lan_server_url";
const STORAGE_KEY_ACTIVE_BASE_URL = "dente_active_api_base_url";

let cachedDiscoveredServer: DiscoveredLanServer | null = null;
let activeApiBaseUrl: string = typeof window !== "undefined"
	? localStorage.getItem(STORAGE_KEY_ACTIVE_BASE_URL) || "/api"
	: "/api";

/**
 * Generates candidate IP addresses for common LAN clinic subnets.
 * Prioritizes standard static IP addresses assigned to clinic server gateways/desktops.
 */
export function generateSubnetIpCandidates(
	baseSubnets: string[] = ["192.168.1", "192.168.0", "192.168.31", "10.0.0"],
): string[] {
	const priorityHostSuffixes = [1, 100, 200, 150, 250, 2, 10, 50, 88, 101, 155, 222];
	const candidates: string[] = [];

	for (const subnet of baseSubnets) {
		for (const suffix of priorityHostSuffixes) {
			candidates.push(`http://${subnet}.${suffix}:4100`);
		}
	}
	return candidates;
}

/**
 * Returns list of LAN server candidate URLs to probe for local discovery
 */
export function getLanDiscoveryCandidates(additional: string[] = []): string[] {
	const candidates = new Set<string>();

	// 1. mDNS and local hostnames
	candidates.add("http://dente-server.local:4100");
	candidates.add("http://clinic.local:4100");
	candidates.add("http://127.0.0.1:4100");
	candidates.add("http://localhost:4100");

	// 2. Previously cached LAN server URL
	if (typeof window !== "undefined") {
		const cached = localStorage.getItem(STORAGE_KEY_LAN_SERVER);
		if (cached) {
			try {
				const parsed = new URL(cached);
				candidates.add(parsed.origin);
			} catch {}
		}
	}

	// 3. Current host if already in LAN subnet
	if (typeof window !== "undefined" && window.location) {
		const currentHost = window.location.hostname;
		if (isLocalOrLanHostname(currentHost) && currentHost !== "localhost" && currentHost !== "127.0.0.1") {
			candidates.add(`http://${currentHost}:4100`);
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
 */
export async function probeCandidateServer(
	baseUrl: string,
	timeoutMs = 1500,
): Promise<DiscoveredLanServer | null> {
	if (typeof window === "undefined" || typeof fetch !== "function") {
		return null;
	}

	const startTime = typeof performance !== "undefined" ? performance.now() : Date.now();
	const cleanBase = baseUrl.replace(/\/+$/, "");
	const probeUrl = `${cleanBase}/api/health/discovery`;

	try {
		const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
		const timeoutId = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

		const response = await fetch(probeUrl, {
			method: "GET",
			cache: "no-store",
			headers: { "x-dente-client": "lan-discovery" },
			signal: controller ? controller.signal : null,
		});

		if (timeoutId) clearTimeout(timeoutId);

		if (!response.ok) {
			// Fallback: check /api/health
			const healthUrl = `${cleanBase}/api/health`;
			const healthRes = await fetch(healthUrl, {
				method: "GET",
				cache: "no-store",
				signal: controller ? controller.signal : null,
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
		logger.debug(`[LanDiscovery] Probe failed for ${baseUrl}:`, err);
		return null;
	}
}

/**
 * Discovers the active local clinic server across all candidate endpoints.
 */
export async function discoverLocalClinicServer(
	options: LanDiscoveryOptions = {},
): Promise<DiscoveredLanServer | null> {
	if (cachedDiscoveredServer && !options.forceRefresh) {
		return cachedDiscoveredServer;
	}

	const candidates = getLanDiscoveryCandidates(options.additionalCandidates);
	const timeoutMs = options.timeoutMs || 1500;

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
		if (typeof window !== "undefined") {
			try {
				localStorage.setItem(STORAGE_KEY_LAN_SERVER, bestServer.baseUrl);
			} catch {}
		}
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
	if (typeof window !== "undefined") {
		try {
			localStorage.setItem(STORAGE_KEY_ACTIVE_BASE_URL, url);
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
