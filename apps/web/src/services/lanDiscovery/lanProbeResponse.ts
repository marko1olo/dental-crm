import type { DiscoveredLanServer } from "./types";

export function createFallbackProbeServer(cleanBase: string, latencyMs: number): DiscoveredLanServer {
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

export function parseDiscoveredServerData(
	data: Record<string, unknown>,
	cleanBase: string,
	latencyMs: number,
): DiscoveredLanServer {
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
}
