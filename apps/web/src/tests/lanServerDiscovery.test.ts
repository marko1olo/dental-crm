/**
 * DENTE CRM — LAN Server Discovery & Failover Unit Suite
 */

import assert from "node:assert/strict";
import test from "node:test";
import {
	discoverLocalClinicServer,
	getActiveApiBaseUrl,
	getLanDiscoveryCandidates,
	isUsingLocalFallbackServer,
	probeCandidateServer,
	resetApiToCloud,
	setActiveApiBaseUrl,
	switchApiToLocalLanServer,
	type DiscoveredLanServer,
} from "../services/lanDiscovery/lanServerDiscovery";

test("Local Clinic Server Discovery & Offline Failover Suite", async (t) => {
	// Mock window & localStorage in Node environment
	const mockStorage: Record<string, string> = {};
	globalThis.localStorage = {
		getItem: (k: string) => mockStorage[k] ?? null,
		setItem: (k: string, v: string) => { mockStorage[k] = v; },
		removeItem: (k: string) => { delete mockStorage[k]; },
		clear: () => { for (const k of Object.keys(mockStorage)) delete mockStorage[k]; },
		length: 0,
		key: () => null,
	};

	globalThis.window = {
		location: { hostname: "dente-server.local", origin: "http://dente-server.local:4100" },
		dispatchEvent: () => true,
	} as unknown as Window & typeof globalThis;

	t.afterEach(() => {
		resetApiToCloud();
		globalThis.localStorage.clear();
	});

	await t.test("1. getLanDiscoveryCandidates: includes mDNS, loopback, and local subnet domains", () => {
		const candidates = getLanDiscoveryCandidates(["192.168.1.55"]);
		assert.ok(Array.isArray(candidates));
		assert.ok(candidates.includes("http://dente-server.local:4100"));
		assert.ok(candidates.includes("http://clinic.local:4100"));
		assert.ok(candidates.includes("http://127.0.0.1:4100"));
		assert.ok(candidates.includes("http://192.168.1.55"));
	});

	await t.test("2. probeCandidateServer: correctly parses /api/health/discovery payload", async () => {
		// Mock fetch
		globalThis.fetch = (async (url: string) => {
			if (url.includes("/api/health/discovery")) {
				return {
					ok: true,
					status: 200,
					json: async () => ({
						serverName: "DENTE Dental CRM Server",
						serverId: "clinic-server-uuid-001",
						apiPort: 4100,
						hostname: "dente-server.local",
						lanAddresses: ["192.168.1.150"],
						version: "0.1.0",
						status: "online",
					}),
				};
			}
			return { ok: false, status: 404 };
		}) as unknown as typeof fetch;

		const result = await probeCandidateServer("http://dente-server.local:4100", 1000);
		assert.ok(result);
		assert.equal(result.serverName, "DENTE Dental CRM Server");
		assert.equal(result.serverId, "clinic-server-uuid-001");
		assert.equal(result.hostname, "dente-server.local");
		assert.equal(result.status, "online");
		assert.ok(result.latencyMs >= 1);
	});

	await t.test("3. probeCandidateServer: safely returns null on connection failure", async () => {
		globalThis.fetch = (async () => {
			throw new Error("Connection refused (ECONNREFUSED)");
		}) as unknown as typeof fetch;

		const result = await probeCandidateServer("http://192.168.1.99:4100", 200);
		assert.equal(result, null);
	});

	await t.test("4. discoverLocalClinicServer: probes candidates and selects healthy server", async () => {
		globalThis.fetch = (async (url: string) => {
			if (url.includes("127.0.0.1")) {
				return {
					ok: true,
					status: 200,
					json: async () => ({
						serverName: "DENTE Local Test Server",
						serverId: "local-01",
						apiPort: 4100,
						hostname: "localhost",
						lanAddresses: ["127.0.0.1"],
						status: "online",
					}),
				};
			}
			throw new Error("Timeout");
		}) as unknown as typeof fetch;

		const server = await discoverLocalClinicServer({ forceRefresh: true });
		assert.ok(server);
		assert.equal(server.serverId, "local-01");
		assert.equal(globalThis.localStorage.getItem("dente_lan_server_url"), "http://127.0.0.1:4100");
	});

	await t.test("5. Endpoint switching: active API switches between Cloud and Local LAN Server", async () => {
		assert.equal(getActiveApiBaseUrl(), "/api");
		assert.equal(isUsingLocalFallbackServer(), false);

		setActiveApiBaseUrl("http://dente-server.local:4100/api");
		assert.equal(getActiveApiBaseUrl(), "http://dente-server.local:4100/api");
		assert.equal(isUsingLocalFallbackServer(), true);

		resetApiToCloud();
		assert.equal(getActiveApiBaseUrl(), "/api");
		assert.equal(isUsingLocalFallbackServer(), false);
	});

	await t.test("6. switchApiToLocalLanServer: automatically discovers and activates failover", async () => {
		globalThis.fetch = (async (url: string) => {
			if (url.includes("dente-server.local")) {
				return {
					ok: true,
					status: 200,
					json: async () => ({
						serverName: "DENTE Clinic LAN Server",
						serverId: "clinic-main",
						apiPort: 4100,
						hostname: "dente-server.local",
						lanAddresses: ["192.168.1.100"],
						status: "online",
					}),
				};
			}
			throw new Error("Unreachable");
		}) as unknown as typeof fetch;

		const success = await switchApiToLocalLanServer();
		assert.equal(success, true);
		assert.equal(getActiveApiBaseUrl(), "http://dente-server.local:4100/api");
		assert.equal(isUsingLocalFallbackServer(), true);
	});
});
