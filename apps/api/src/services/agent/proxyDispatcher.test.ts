/**
 * proxyDispatcher.test.ts — Comprehensive Test Suite for SOCKS5 / HTTPS / HTTP Proxy Dispatcher.
 *
 * SQUAD IOTA VERIFICATION SUITE:
 * 1. Proxy URL Parsing: HTTP, HTTPS, SOCKS4, SOCKS4a, SOCKS5, SOCKS5h, with & without auth, encoded credentials.
 * 2. Protocol Validation: strict whitelist check for supported network schemes.
 * 3. Environment Fallback Hierarchy: provider-specific (OPENAI_PROXY, ANTHROPIC_PROXY, etc.) -> LLM_PROXY -> standard envs.
 * 4. Dispatcher Factory: generates undici ProxyAgent for HTTP/HTTPS and Agent with SocksClient connector for SOCKS.
 * 5. Fetch Factory & SDK Options: returns native Fetch wrapper and SDK config objects for all major LLM providers.
 * 6. SocksConnector Lifecycle: validates target resolution, port assignment, and SOCKS options structure.
 * 7. Live Mock Proxy Round-Trip: verifies end-to-end request dispatching through a local loopback proxy server.
 */

import assert from "node:assert";
import * as http from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, describe, test } from "node:test";
import { Agent, ProxyAgent } from "undici";
import {
	type ParsedProxy,
	createProxiedDispatcher,
	createProxiedFetch,
	createProxiedSdkOptions,
	createSocksConnector,
	getGlobalProxyUrl,
	isProxyProtocolSupported,
	parseProxyUrl,
} from "./proxyDispatcher.js";

describe("SQUAD IOTA — SOCKS5 / HTTPS Proxy Dispatcher & LLM Network Routing", () => {
	describe("1. Proxy Protocol Whitelist & Validation", () => {
		test("identifies supported protocols correctly", () => {
			assert.strictEqual(isProxyProtocolSupported("http"), true);
			assert.strictEqual(isProxyProtocolSupported("http:"), true);
			assert.strictEqual(isProxyProtocolSupported("https"), true);
			assert.strictEqual(isProxyProtocolSupported("https:"), true);
			assert.strictEqual(isProxyProtocolSupported("socks"), true);
			assert.strictEqual(isProxyProtocolSupported("socks:"), true);
			assert.strictEqual(isProxyProtocolSupported("socks4"), true);
			assert.strictEqual(isProxyProtocolSupported("socks4a"), true);
			assert.strictEqual(isProxyProtocolSupported("socks5"), true);
			assert.strictEqual(isProxyProtocolSupported("socks5h"), true);
			assert.strictEqual(isProxyProtocolSupported("SOCKS5:"), true);
		});

		test("rejects unsupported protocols", () => {
			assert.strictEqual(isProxyProtocolSupported("ftp"), false);
			assert.strictEqual(isProxyProtocolSupported("ws"), false);
			assert.strictEqual(isProxyProtocolSupported("wss"), false);
			assert.strictEqual(isProxyProtocolSupported("grpc"), false);
			assert.strictEqual(isProxyProtocolSupported("unknown"), false);
		});
	});

	describe("2. Proxy URL Parsing (parseProxyUrl)", () => {
		test("parses standard HTTP proxy URL", () => {
			const parsed = parseProxyUrl("http://proxy.clinic.local:8080");
			assert.ok(parsed);
			assert.strictEqual(parsed.protocol, "http");
			assert.strictEqual(parsed.host, "proxy.clinic.local");
			assert.strictEqual(parsed.port, 8080);
			assert.strictEqual(parsed.username, undefined);
			assert.strictEqual(parsed.password, undefined);
			assert.strictEqual(parsed.socksType, undefined);
		});

		test("parses HTTPS proxy URL with default port when unspecified", () => {
			const parsed = parseProxyUrl("https://secure-proxy.clinic.internal");
			assert.ok(parsed);
			assert.strictEqual(parsed.protocol, "https");
			assert.strictEqual(parsed.host, "secure-proxy.clinic.internal");
			assert.strictEqual(parsed.port, 443);
		});

		test("parses SOCKS5 proxy URL with basic authentication", () => {
			const parsed = parseProxyUrl("socks5://dente_agent:SecretPass99@192.168.1.100:1080");
			assert.ok(parsed);
			assert.strictEqual(parsed.protocol, "socks5");
			assert.strictEqual(parsed.host, "192.168.1.100");
			assert.strictEqual(parsed.port, 1080);
			assert.strictEqual(parsed.username, "dente_agent");
			assert.strictEqual(parsed.password, "SecretPass99");
			assert.strictEqual(parsed.auth, "dente_agent:SecretPass99");
			assert.strictEqual(parsed.socksType, 5);
		});

		test("parses SOCKS5h proxy with URL-encoded special characters in password", () => {
			const parsed = parseProxyUrl("socks5h://user:p%40ss%23123@proxy.tor:9050");
			assert.ok(parsed);
			assert.strictEqual(parsed.protocol, "socks5h");
			assert.strictEqual(parsed.host, "proxy.tor");
			assert.strictEqual(parsed.port, 9050);
			assert.strictEqual(parsed.username, "user");
			assert.strictEqual(parsed.password, "p@ss#123");
			assert.strictEqual(parsed.socksType, 5);
		});

		test("parses SOCKS4 and SOCKS4a proxies", () => {
			const parsedSocks4 = parseProxyUrl("socks4://10.0.0.5:1080");
			assert.ok(parsedSocks4);
			assert.strictEqual(parsedSocks4.protocol, "socks4");
			assert.strictEqual(parsedSocks4.host, "10.0.0.5");
			assert.strictEqual(parsedSocks4.port, 1080);
			assert.strictEqual(parsedSocks4.socksType, 4);

			const parsedSocks4a = parseProxyUrl("socks4a://agent@remote-socks.node:1080");
			assert.ok(parsedSocks4a);
			assert.strictEqual(parsedSocks4a.protocol, "socks4a");
			assert.strictEqual(parsedSocks4a.host, "remote-socks.node");
			assert.strictEqual(parsedSocks4a.username, "agent");
			assert.strictEqual(parsedSocks4a.socksType, 4);
		});

		test("defaults protocol to http:// if scheme is missing", () => {
			const parsed = parseProxyUrl("127.0.0.1:3128");
			assert.ok(parsed);
			assert.strictEqual(parsed.protocol, "http");
			assert.strictEqual(parsed.host, "127.0.0.1");
			assert.strictEqual(parsed.port, 3128);
		});

		test("returns null for empty, undefined, or invalid URLs", () => {
			assert.strictEqual(parseProxyUrl(undefined), null);
			assert.strictEqual(parseProxyUrl(""), null);
			assert.strictEqual(parseProxyUrl("   "), null);
			assert.strictEqual(parseProxyUrl("ftp://files.example.com:21"), null);
			assert.strictEqual(parseProxyUrl("http://"), null);
		});
	});

	describe("3. Environment Variable Resolution (getGlobalProxyUrl)", () => {
		const originalEnv = { ...process.env };

		before(() => {
			delete process.env.OPENAI_PROXY;
			delete process.env.ANTHROPIC_PROXY;
			delete process.env.GROQ_PROXY;
			delete process.env.DEEPSEEK_PROXY;
			delete process.env.GOOGLE_PROXY;
			delete process.env.LLM_PROXY;
			delete process.env.HTTPS_PROXY;
			delete process.env.https_proxy;
			delete process.env.HTTP_PROXY;
			delete process.env.http_proxy;
			delete process.env.ALL_PROXY;
			delete process.env.all_proxy;
			delete process.env.SOCKS_PROXY;
			delete process.env.socks_proxy;
		});

		after(() => {
			process.env = originalEnv;
		});

		test("resolves provider-specific proxy URL first", () => {
			process.env.OPENAI_PROXY = "socks5://127.0.0.1:1080";
			process.env.LLM_PROXY = "http://general.proxy:8080";

			const openaiProxy = getGlobalProxyUrl("openai");
			assert.strictEqual(openaiProxy, "socks5://127.0.0.1:1080");

			const groqProxy = getGlobalProxyUrl("groq");
			assert.strictEqual(groqProxy, "http://general.proxy:8080");

			delete process.env.OPENAI_PROXY;
			delete process.env.LLM_PROXY;
		});

		test("falls back through hierarchy: LLM_PROXY -> HTTPS_PROXY -> HTTP_PROXY -> ALL_PROXY -> SOCKS_PROXY", () => {
			process.env.SOCKS_PROXY = "socks5://127.0.0.1:9050";
			assert.strictEqual(getGlobalProxyUrl(), "socks5://127.0.0.1:9050");

			process.env.ALL_PROXY = "http://all.proxy:8080";
			assert.strictEqual(getGlobalProxyUrl(), "http://all.proxy:8080");

			process.env.HTTP_PROXY = "http://http.proxy:8080";
			assert.strictEqual(getGlobalProxyUrl(), "http://http.proxy:8080");

			process.env.HTTPS_PROXY = "http://https.proxy:8080";
			assert.strictEqual(getGlobalProxyUrl(), "http://https.proxy:8080");

			process.env.LLM_PROXY = "http://llm.proxy:8080";
			assert.strictEqual(getGlobalProxyUrl(), "http://llm.proxy:8080");

			delete process.env.LLM_PROXY;
			delete process.env.HTTPS_PROXY;
			delete process.env.HTTP_PROXY;
			delete process.env.ALL_PROXY;
			delete process.env.SOCKS_PROXY;

			assert.strictEqual(getGlobalProxyUrl(), undefined);
		});
	});

	describe("4. Dispatcher Factory (createProxiedDispatcher)", () => {
		test("returns null when no proxy is configured or provided", () => {
			const dispatcher = createProxiedDispatcher();
			assert.strictEqual(dispatcher, null);
		});

		test("creates undici ProxyAgent for HTTP/HTTPS proxy", () => {
			const dispatcher = createProxiedDispatcher("http://127.0.0.1:8080");
			assert.ok(dispatcher);
			assert.ok(dispatcher instanceof ProxyAgent);
		});

		test("creates undici ProxyAgent with auth headers for authenticated HTTP proxy", () => {
			const dispatcher = createProxiedDispatcher("http://admin:PassWord123@proxy.clinic:3128");
			assert.ok(dispatcher);
			assert.ok(dispatcher instanceof ProxyAgent);
		});

		test("creates undici Agent for SOCKS5 proxy", () => {
			const dispatcher = createProxiedDispatcher("socks5://127.0.0.1:1080");
			assert.ok(dispatcher);
			assert.ok(dispatcher instanceof Agent);
		});

		test("creates undici Agent for SOCKS4 proxy", () => {
			const dispatcher = createProxiedDispatcher("socks4://127.0.0.1:1080");
			assert.ok(dispatcher);
			assert.ok(dispatcher instanceof Agent);
		});
	});

	describe("5. Proxied Fetch Factory (createProxiedFetch)", () => {
		test("returns global fetch when no proxy is configured", () => {
			const fetchFn = createProxiedFetch();
			assert.strictEqual(fetchFn, globalThis.fetch);
		});

		test("returns a custom wrapped fetch function when proxy is specified", () => {
			const fetchFn = createProxiedFetch("http://127.0.0.1:8080");
			assert.notStrictEqual(fetchFn, globalThis.fetch);
			assert.strictEqual(typeof fetchFn, "function");
		});
	});

	describe("6. Provider SDK Options (createProxiedSdkOptions)", () => {
		test("returns empty object when no proxy is active", () => {
			const options = createProxiedSdkOptions("openai");
			assert.deepStrictEqual(options, {});
		});

		test("constructs OpenAI SDK options with proxied fetch and dispatcher", () => {
			const proxyUrl = "socks5://127.0.0.1:1080";
			const options = createProxiedSdkOptions("openai", proxyUrl);

			assert.ok(options.fetch);
			assert.ok(options.dispatcher);
			assert.strictEqual(options.proxyUrl, proxyUrl);
			assert.strictEqual(typeof options.fetch, "function");
		});

		test("constructs Anthropic SDK options", () => {
			const proxyUrl = "http://proxy.corp:8080";
			const options = createProxiedSdkOptions("anthropic", proxyUrl);

			assert.ok(options.fetch);
			assert.ok(options.dispatcher);
			assert.strictEqual(options.proxyUrl, proxyUrl);
		});

		test("constructs Groq & DeepSeek SDK options", () => {
			const proxyUrl = "socks5://127.0.0.1:1080";
			const groqOptions = createProxiedSdkOptions("groq", proxyUrl);
			assert.ok(groqOptions.fetch);
			assert.ok(groqOptions.dispatcher);

			const deepseekOptions = createProxiedSdkOptions("deepseek", proxyUrl);
			assert.ok(deepseekOptions.fetch);
			assert.ok(deepseekOptions.dispatcher);
		});

		test("constructs Google Gemini SDK options with requestOptions structure", () => {
			const proxyUrl = "http://proxy.corp:8080";
			const options = createProxiedSdkOptions("google", proxyUrl);

			assert.ok(options.fetch);
			assert.ok(options.dispatcher);
			assert.ok(options.requestOptions);
			assert.strictEqual(options.requestOptions?.fetch, options.fetch);
		});
	});

	describe("7. SOCKS Connector Construction (createSocksConnector)", () => {
		test("creates a valid undici connector callback function", () => {
			const parsed: ParsedProxy = {
				rawUrl: "socks5://user:pass@127.0.0.1:1080",
				protocol: "socks5",
				host: "127.0.0.1",
				port: 1080,
				username: "user",
				password: "pass",
				socksType: 5,
			};

			const connector = createSocksConnector(parsed, { timeoutMs: 5000 });
			assert.strictEqual(typeof connector, "function");
		});

		test("handles connection errors gracefully via connector callback", async () => {
			const parsed: ParsedProxy = {
				rawUrl: "socks5://127.0.0.1:59999",
				protocol: "socks5",
				host: "127.0.0.1",
				port: 59999, // Unused port to trigger connection error
				socksType: 5,
			};

			const connector = createSocksConnector(parsed, { timeoutMs: 500 });

			await new Promise<void>((resolve) => {
				connector(
					{
						hostname: "api.openai.com",
						port: "80",
						protocol: "http:",
					},
					(err, socket) => {
						assert.ok(err instanceof Error);
						assert.strictEqual(socket, null);
						resolve();
					},
				);
			});
		});
	});

	describe("8. Live Mock HTTP Proxy Round-Trip Dispatch", () => {
		let proxyServer: http.Server;
		let proxyPort: number;
		let receivedProxyRequests = 0;
		let dispatcherToClose: ProxyAgent | null = null;

		before(async () => {
			proxyServer = http.createServer((req, res) => {
				receivedProxyRequests += 1;
				res.writeHead(200, {
					"Content-Type": "application/json",
					"Connection": "close",
					"X-Proxied-By": "Dente-Mock-Proxy",
				});
				res.end(
					JSON.stringify({
						status: "ok",
						url: req.url,
						headers: req.headers,
					}),
				);
			});

			await new Promise<void>((resolve) => {
				proxyServer.listen(0, "127.0.0.1", () => {
					const addr = proxyServer.address() as AddressInfo;
					proxyPort = addr.port;
					resolve();
				});
			});
		});

		after(async () => {
			if (dispatcherToClose) {
				await dispatcherToClose.destroy();
			}
			proxyServer.closeAllConnections?.();
			await new Promise<void>((resolve) => {
				proxyServer.close(() => resolve());
			});
		});

		test("dispatches HTTP request through local proxy and receives response", async () => {
			const proxyUrl = `http://127.0.0.1:${proxyPort}`;
			const dispatcher = createProxiedDispatcher(proxyUrl, {
				proxyTunnel: false,
				keepAliveTimeoutMs: 100,
			}) as ProxyAgent;
			dispatcherToClose = dispatcher;

			const proxiedFetch = createProxiedFetch(dispatcher);

			const targetUrl = "http://api.mock-provider.com/v1/models";
			const res = await proxiedFetch(targetUrl, {
				method: "GET",
				headers: {
					Authorization: "Bearer test_token",
				},
			});

			assert.strictEqual(res.status, 200);
			assert.strictEqual(res.headers.get("x-proxied-by"), "Dente-Mock-Proxy");

			const body = (await res.json()) as { status: string; url: string };
			assert.strictEqual(body.status, "ok");
			assert.ok(receivedProxyRequests >= 1);
		});
	});
});
