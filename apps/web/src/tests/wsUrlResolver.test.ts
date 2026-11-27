import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
	resolveClinicFallbackWsUrl,
	resolveClinicWsUrl,
} from "../lib/wsUrlResolver";

describe("wsUrlResolver LAN & multi-origin WebSocket URL resolution", () => {
	it("resolves primary WS URL from window.location.host on LAN Vite dev without hardcoding localhost:4100", () => {
		const url = resolveClinicWsUrl("/api/ws/schedule", {
			envWsUrl: undefined,
			lanServerUrl: null,
			activeBaseUrl: null,
			location: {
				protocol: "http:",
				host: "192.168.1.44:5173",
				hostname: "192.168.1.44",
				port: "5173",
			},
		});
		assert.equal(url, "ws://192.168.1.44:5173/api/ws/schedule");

		const fallbackUrl = resolveClinicFallbackWsUrl("/api/ws/telephony", {
			envWsUrl: undefined,
			envApiOrigin: undefined,
			lanServerUrl: null,
			activeBaseUrl: null,
			location: {
				protocol: "http:",
				host: "192.168.1.44:5173",
				hostname: "192.168.1.44",
				port: "5173",
			},
		});
		assert.equal(fallbackUrl, "ws://192.168.1.44:4100/api/ws/telephony");
	});

	it("preserves wss:// scheme under HTTPS production and Vite HTTPS dev", () => {
		const prodUrl = resolveClinicWsUrl("/api/ws/telephony", {
			envWsUrl: undefined,
			lanServerUrl: null,
			activeBaseUrl: null,
			location: {
				protocol: "https:",
				host: "clinic.dente.ru",
				hostname: "clinic.dente.ru",
				port: "",
			},
		});
		assert.equal(prodUrl, "wss://clinic.dente.ru/api/ws/telephony");
	});

	it("prioritizes configured LAN server and active API base URL over window.location", () => {
		const fromLan = resolveClinicWsUrl("/api/ws/schedule", {
			envWsUrl: undefined,
			activeBaseUrl: null,
			lanServerUrl: "http://10.20.30.5:4100/",
			location: {
				protocol: "http:",
				host: "localhost:5173",
				hostname: "localhost",
				port: "5173",
			},
		});
		assert.equal(fromLan, "ws://10.20.30.5:4100/api/ws/schedule");

		const fromActiveBase = resolveClinicWsUrl("/api/ws/telephony", {
			envWsUrl: undefined,
			activeBaseUrl: "https://server.local:4443/api",
			lanServerUrl: "http://10.20.30.5:4100",
			location: null,
		});
		assert.equal(fromActiveBase, "wss://server.local:4443/api/ws/telephony");
	});

	it("normalizes VITE_WS_URL across different /api/ws/* paths", () => {
		const telephony = resolveClinicWsUrl("/api/ws/telephony", {
			envWsUrl: "ws://192.168.50.10:4100/api/ws/schedule",
		});
		assert.equal(telephony, "ws://192.168.50.10:4100/api/ws/telephony");

		const disabledFallback = resolveClinicFallbackWsUrl("/api/ws/telephony", {
			envWsUrl: "ws://192.168.50.10:4100/api/ws/schedule",
		});
		assert.equal(disabledFallback, "");
	});

	it("supports ?clinic_server query param and safely returns empty string in SSR", () => {
		const fromQuery = resolveClinicWsUrl("/api/ws/schedule", {
			envWsUrl: undefined,
			activeBaseUrl: null,
			lanServerUrl: null,
			location: {
				protocol: "http:",
				host: "localhost:5173",
				hostname: "localhost",
				port: "5173",
				search: "?clinic_server=http://192.168.88.20:4100",
			},
		});
		assert.equal(fromQuery, "ws://192.168.88.20:4100/api/ws/schedule");

		const ssrEmpty = resolveClinicWsUrl("/api/ws/schedule", {
			envWsUrl: undefined,
			activeBaseUrl: null,
			lanServerUrl: null,
			location: null,
		});
		assert.equal(ssrEmpty, "");
	});
});
