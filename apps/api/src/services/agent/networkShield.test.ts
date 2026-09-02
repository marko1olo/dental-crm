import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
	DEFAULT_FALLBACK_SOCKS5_PROXY,
	getNetworkShieldStatus,
	getNetworkShieldWsAgent,
	isNetworkShieldEnabled,
	maskProxyUrl,
	resolveNetworkShieldProxyUrl,
} from "./networkShield.js";

describe("NetworkShield Proxy & Agent Configuration", () => {
	const originalEnv = { ...process.env };

	beforeEach(() => {
		process.env = { ...originalEnv };
		delete process.env.USE_PROXY;
		delete process.env.GLOBAL_LLM_PROXY_URL;
		delete process.env.PROXY_URL;
		delete process.env.HTTPS_PROXY;
		delete process.env.HTTP_PROXY;
		delete process.env.LLM_PROXY;
		delete process.env.ALL_PROXY;
		delete process.env.SOCKS_PROXY;
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	it("correctly determines proxy disabled when no env vars are set", () => {
		assert.equal(isNetworkShieldEnabled(), false);
		assert.equal(resolveNetworkShieldProxyUrl(), undefined);
		const status = getNetworkShieldStatus();
		assert.equal(status.enabled, false);
		assert.equal(status.proxyUrlMasked, null);
	});

	it("enables default SOCKS5 proxy when USE_PROXY=true without custom URL", () => {
		process.env.USE_PROXY = "true";
		assert.equal(isNetworkShieldEnabled(), true);
		assert.equal(
			resolveNetworkShieldProxyUrl(),
			DEFAULT_FALLBACK_SOCKS5_PROXY,
		);
		const status = getNetworkShieldStatus();
		assert.equal(status.enabled, true);
		assert.equal(status.protocol, "socks5");
		assert.equal(status.host, "62.84.100.97");
		assert.equal(status.port, 1080);
		assert.equal(status.hasAuth, true);
		assert.ok(status.proxyUrlMasked?.includes("***"));
		assert.ok(!status.proxyUrlMasked?.includes("DenteSecureSocks2026!"));
	});

	it("respects custom GLOBAL_LLM_PROXY_URL override", () => {
		const customProxy = "socks5://custom_user:custom_pass@10.0.0.1:9050";
		process.env.GLOBAL_LLM_PROXY_URL = customProxy;

		assert.equal(isNetworkShieldEnabled(), true);
		assert.equal(resolveNetworkShieldProxyUrl(), customProxy);
		const status = getNetworkShieldStatus();
		assert.equal(status.enabled, true);
		assert.equal(status.host, "10.0.0.1");
		assert.equal(status.port, 9050);
		assert.equal(status.protocol, "socks5");
		assert.ok(status.proxyUrlMasked?.includes("custom_user:***@10.0.0.1:9050"));
	});

	it("masks passwords in HTTP and SOCKS proxy URLs", () => {
		const maskedSocks = maskProxyUrl("socks5://admin:secret123@proxy.local:1080");
		assert.equal(maskedSocks, "socks5://admin:***@proxy.local:1080");

		const maskedHttp = maskProxyUrl("http://corp_user:p@ssw0rd!@192.168.1.1:8080");
		assert.equal(maskedHttp, "http://corp_user:***@192.168.1.1:8080/");
	});

	it("returns a WebSocket agent when proxy is configured", () => {
		process.env.GLOBAL_LLM_PROXY_URL = "socks5://dente_proxy:DenteSecureSocks2026!@62.84.100.97:1080";
		const agent = getNetworkShieldWsAgent();
		assert.ok(agent !== null);
	});
});
