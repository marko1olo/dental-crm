import { logger } from "../../utils/logger";
import { DEFAULT_LAN_PROBE_TIMEOUT_MS, type DiscoveredLanServer, type LanDiscoveryOptions } from "./types";
import { cachedDiscoveredServer, persistDiscoveredServer } from "./lanStorageState";
import { getLanDiscoveryCandidates, getPriorityLanDiscoveryCandidates } from "./lanCandidates";
import { createFallbackProbeServer, parseDiscoveredServerData } from "./lanProbeResponse";

export async function probeCandidateServer(
	baseUrl: string,
	timeoutMs = DEFAULT_LAN_PROBE_TIMEOUT_MS,
): Promise<DiscoveredLanServer | null> {
	if (typeof window === "undefined" || typeof fetch !== "function") return null;
	const startTime = typeof performance !== "undefined" ? performance.now() : Date.now();
	const cleanBase = baseUrl.replace(/\/+$/, "");
	let signal: AbortSignal | null = null;
	let timeoutId: ReturnType<typeof setTimeout> | null = null;

	if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
		try { signal = AbortSignal.timeout(timeoutMs); } catch {}
	}
	let controller: AbortController | null = null;
	if (!signal && typeof AbortController !== "undefined") {
		controller = new AbortController();
		timeoutId = setTimeout(() => controller?.abort(), timeoutMs);
		signal = controller.signal;
	}

	try {
		const res = await fetch(`${cleanBase}/api/health/discovery`, {
			method: "GET", cache: "no-store", headers: { "x-dente-client": "lan-discovery" }, signal: signal || null,
		});
		if (timeoutId) clearTimeout(timeoutId);
		if (!res.ok) {
			if (signal?.aborted) return null;
			const healthRes = await fetch(`${cleanBase}/api/health`, { method: "GET", cache: "no-store", signal: signal || null });
			if (!healthRes.ok) return null;
			const latencyMs = Math.max(1, Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - startTime));
			return createFallbackProbeServer(cleanBase, latencyMs);
		}
		const data = (await res.json()) as Record<string, unknown>;
		const latencyMs = Math.max(1, Math.round((typeof performance !== "undefined" ? performance.now() : Date.now()) - startTime));
		return parseDiscoveredServerData(data, cleanBase, latencyMs);
	} catch (err) {
		if (timeoutId) clearTimeout(timeoutId);
		logger.debug(`[LanDiscovery] Probe failed for ${baseUrl}:`, err);
		return null;
	}
}

export async function discoverLocalClinicServer(options: LanDiscoveryOptions = {}): Promise<DiscoveredLanServer | null> {
	if (cachedDiscoveredServer && !options.forceRefresh) return cachedDiscoveredServer;
	const timeoutMs = options.timeoutMs || DEFAULT_LAN_PROBE_TIMEOUT_MS;
	const priority = getPriorityLanDiscoveryCandidates(options.additionalCandidates);
	const priorityResults = await Promise.allSettled(priority.map((c) => probeCandidateServer(c, timeoutMs)));

	let bestServer: DiscoveredLanServer | null = null;
	for (const res of priorityResults) {
		if (res.status === "fulfilled" && res.value) {
			if (!bestServer || res.value.latencyMs < bestServer.latencyMs) bestServer = res.value;
		}
	}
	if (bestServer) { persistDiscoveredServer(bestServer); return bestServer; }

	const all = getLanDiscoveryCandidates(options.additionalCandidates);
	const remaining = all.filter((c) => !priority.includes(c));
	for (let i = 0; i < remaining.length; i += 16) {
		const batch = remaining.slice(i, i + 16);
		const results = await Promise.allSettled(batch.map((c) => probeCandidateServer(c, timeoutMs)));
		for (const res of results) {
			if (res.status === "fulfilled" && res.value) {
				if (!bestServer || res.value.latencyMs < bestServer.latencyMs) bestServer = res.value;
			}
		}
		if (bestServer) break;
	}
	if (bestServer) persistDiscoveredServer(bestServer);
	return bestServer;
}
