/**
 * DENTE CRM — LAN Server Discovery & Failover Unit Suite
 */

import assert from "node:assert/strict";
import test from "node:test";
import {
	createLanFailoverFetch,
	DEFAULT_LAN_BEACON_PORT,
	DEFAULT_LAN_PROBE_TIMEOUT_MS,
	discoverLocalClinicServer,
	generateSubnetIpCandidates,
	getActiveApiBaseUrl,
	getLanDiscoveryCandidates,
	HEARTBEAT_INTERVAL_ACTIVE_MS,
	HEARTBEAT_INTERVAL_IDLE_MS,
	isUsingLocalFallbackServer,
	lanHeartbeatManager,
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
		lanHeartbeatManager.stop();
		lanHeartbeatManager.setCloudReachable(true);
		lanHeartbeatManager.setInterval(HEARTBEAT_INTERVAL_IDLE_MS);
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
			if (url.includes("127.0.0.1:4100")) {
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
			if (url.includes("dente-server.local:4100")) {
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

	await t.test("7. createLanFailoverFetch: transparently reroutes cloud requests to local server when WAN is down", async () => {
		let callCount = 0;
		const mockBaseFetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
			callCount++;
			const url = String(input);
			if (url.startsWith("/api/patients") && callCount === 1) {
				// Simulate WAN cloud outage on first request
				throw new TypeError("Failed to fetch (Cloud WAN Offline)");
			}
			if (url.includes("/api/health/discovery")) {
				return {
					ok: true,
					status: 200,
					json: async () => ({
						serverName: "DENTE Local Microserver",
						serverId: "lan-micro-01",
						apiPort: 4100,
						hostname: "dente-server.local",
						lanAddresses: ["192.168.1.200"],
						status: "online",
					}),
				};
			}
			if (url.startsWith("http://dente-server.local:4100/api/patients")) {
				return {
					ok: true,
					status: 200,
					json: async () => ({
						success: true,
						patients: [{ id: "pat-1", fullName: "Иванов Иван" }],
					}),
				};
			}
			return { ok: false, status: 404 };
		}) as unknown as typeof fetch;

		const resilientFetch = createLanFailoverFetch(mockBaseFetch);
		const response = await resilientFetch("/api/patients", { method: "GET" });
		assert.ok(response.ok);
		const data = await response.json() as { success: boolean; patients: unknown[] };
		assert.equal(data.success, true);
		assert.equal(data.patients.length, 1);
		assert.equal(isUsingLocalFallbackServer(), true);
	});

	await t.test("8. generateSubnetIpCandidates: generates standard ports 4100 and beacon port 4101", () => {
		const candidates = generateSubnetIpCandidates(["192.168.5"], [4100, DEFAULT_LAN_BEACON_PORT]);
		assert.ok(candidates.length > 0);
		assert.ok(candidates.includes(`http://192.168.5.1:4100`));
		assert.ok(candidates.includes(`http://192.168.5.1:${DEFAULT_LAN_BEACON_PORT}`));
		assert.ok(candidates.includes(`http://192.168.5.100:4100`));
	});

	await t.test("9. Event notification: dispatches dente:api-base-url-changed on failover", async () => {
		let receivedEventDetail: { url: string } | null = null;
		globalThis.window.dispatchEvent = ((evt: CustomEvent<{ url: string }>) => {
			if (evt.type === "dente:api-base-url-changed") {
				receivedEventDetail = evt.detail;
			}
			return true;
		}) as unknown as typeof window.dispatchEvent;

		setActiveApiBaseUrl("http://192.168.1.100:4100/api");
		assert.ok(receivedEventDetail);
		assert.equal((receivedEventDetail as { url: string })?.url, "http://192.168.1.100:4100/api");
	});

	await t.test("10. Fast non-blocking subnet probe: respects 300ms timeout via AbortSignal", async () => {
		globalThis.fetch = ((_url: string | URL | Request, init?: RequestInit) => {
			return new Promise((resolve, reject) => {
				const signal = init?.signal;
				if (signal?.aborted) {
					return reject(new DOMException("The operation was aborted", "AbortError"));
				}
				const timer = setTimeout(() => {
					resolve({ ok: false, status: 504 });
				}, 1000);

				signal?.addEventListener("abort", () => {
					clearTimeout(timer);
					reject(new DOMException("The operation was aborted", "AbortError"));
				});
			});
		}) as unknown as typeof fetch;

		const startTime = Date.now();
		const result = await probeCandidateServer("http://192.168.1.254:4100", 100);
		const elapsed = Date.now() - startTime;

		assert.equal(result, null);
		assert.ok(elapsed < 300, `Probe must abort rapidly around 100ms without freezing, took ${elapsed}ms`);
	});

	await t.test("11. Dynamic heartbeat & battery conservation: adapts interval between 4s (active) and 45s (idle)", () => {
		lanHeartbeatManager.stop();
		assert.equal(lanHeartbeatManager.getInterval(), HEARTBEAT_INTERVAL_IDLE_MS);

		// When cloud drops, switch to fast 4s interval
		lanHeartbeatManager.setCloudReachable(false);
		assert.equal(lanHeartbeatManager.getInterval(), HEARTBEAT_INTERVAL_ACTIVE_MS);
		assert.equal(lanHeartbeatManager.getState().isCloudReachable, false);

		// When cloud is restored, switch back to 45s idle interval for battery savings
		lanHeartbeatManager.setCloudReachable(true);
		assert.equal(lanHeartbeatManager.getInterval(), HEARTBEAT_INTERVAL_IDLE_MS);
		assert.equal(lanHeartbeatManager.getState().isCloudReachable, true);
	});
});

