/**
 * proxyDispatcher.ts — SOCKS5 / HTTPS / HTTP Centralized Proxy Dispatcher for LLM Network Routing.
 *
 * SQUAD IOTA INVARIANTS:
 * 1. Multi-protocol bypass: Full support for HTTP, HTTPS, SOCKS4, SOCKS4a, SOCKS5, and SOCKS5h.
 * 2. Strict Authentication: Handles RFC-compliant user/password authentication in URLs and explicit headers.
 * 3. Undici & Fetch Integration: Provides native undici Dispatcher, custom proxied fetch, and provider SDK options.
 * 4. Provider-Specific Routing: Automatically resolves provider-specific env variables (OPENAI_PROXY, ANTHROPIC_PROXY,
 *    GROQ_PROXY, DEEPSEEK_PROXY, GOOGLE_PROXY, LLM_PROXY, HTTPS_PROXY, ALL_PROXY, SOCKS_PROXY).
 * 5. Resilient TLS Upgrade: For SOCKS proxies handling HTTPS targets, establishes SOCKS duplex stream and upgrades via TLS.
 */

import { Buffer } from "node:buffer";
import * as net from "node:net";
import * as tls from "node:tls";
import { URL } from "node:url";
import { type SocksClientOptions, SocksClient } from "socks";
import {
	Agent,
	type Dispatcher,
	ProxyAgent,
	buildConnector,
	fetch as undiciFetch,
} from "undici";

/** Supported proxy protocols */
export type ProxyProtocol =
	| "http"
	| "https"
	| "socks"
	| "socks4"
	| "socks4a"
	| "socks5"
	| "socks5h";

export interface ParsedProxy {
	readonly rawUrl: string;
	readonly protocol: ProxyProtocol;
	readonly host: string;
	readonly port: number;
	readonly username?: string | undefined;
	readonly password?: string | undefined;
	readonly auth?: string | undefined;
	readonly socksType?: (4 | 5) | undefined;
}

export interface ProxyDispatcherOptions {
	readonly proxyUrl?: string | undefined;
	readonly timeoutMs?: number | undefined;
	readonly keepAliveTimeoutMs?: number | undefined;
	readonly rejectUnauthorized?: boolean | undefined;
	readonly proxyTunnel?: boolean | undefined;
}

export interface ProxiedSdkOptions {
	readonly fetch?: typeof fetch | undefined;
	readonly dispatcher?: Dispatcher | undefined;
	readonly proxyUrl?: string | undefined;
	readonly requestOptions?: {
		readonly customHeaders?: Record<string, string> | undefined;
		readonly fetch?: typeof fetch | undefined;
	} | undefined;
	readonly [key: string]: unknown;
}

export type FetchInput = string | URL | globalThis.Request;

const SUPPORTED_PROTOCOLS = new Set<ProxyProtocol>([
	"http",
	"https",
	"socks",
	"socks4",
	"socks4a",
	"socks5",
	"socks5h",
]);

/**
 * Checks if a protocol string is supported by the proxy dispatcher.
 */
export function isProxyProtocolSupported(protocol: string): boolean {
	const normalized = protocol.replace(/:$/, "").toLowerCase() as ProxyProtocol;
	return SUPPORTED_PROTOCOLS.has(normalized);
}

/**
 * Resolves the active proxy URL from environment variables for a given provider or globally.
 */
export function getGlobalProxyUrl(provider?: string): string | undefined {
	const env = process.env;

	if (provider) {
		const providerKey = `${provider.toUpperCase()}_PROXY`;
		if (env[providerKey] && env[providerKey]?.trim()) {
			return env[providerKey]?.trim();
		}
	}

	// General LLM proxy overrides
	if (env.GLOBAL_LLM_PROXY_URL?.trim()) return env.GLOBAL_LLM_PROXY_URL.trim();
	if (env.LLM_PROXY_URL?.trim()) return env.LLM_PROXY_URL.trim();
	if (env.PROXY_URL?.trim()) return env.PROXY_URL.trim();
	if (env.LLM_PROXY?.trim()) return env.LLM_PROXY.trim();
	if (env.HTTPS_PROXY?.trim()) return env.HTTPS_PROXY.trim();
	if (env.https_proxy?.trim()) return env.https_proxy.trim();
	if (env.HTTP_PROXY?.trim()) return env.HTTP_PROXY.trim();
	if (env.http_proxy?.trim()) return env.http_proxy.trim();
	if (env.ALL_PROXY?.trim()) return env.ALL_PROXY.trim();
	if (env.all_proxy?.trim()) return env.all_proxy.trim();
	if (env.SOCKS_PROXY?.trim()) return env.SOCKS_PROXY.trim();
	if (env.socks_proxy?.trim()) return env.socks_proxy.trim();

	return undefined;
}

/**
 * Parses and validates a proxy URL string into a structured ParsedProxy descriptor.
 */
export function parseProxyUrl(proxyUrl?: string): ParsedProxy | null {
	if (!proxyUrl || typeof proxyUrl !== "string") {
		return null;
	}

	const trimmed = proxyUrl.trim();
	if (!trimmed) {
		return null;
	}

	let urlToParse = trimmed;
	// If protocol is omitted, default to http://
	if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)) {
		urlToParse = `http://${trimmed}`;
	}

	let parsedUrl: URL;
	try {
		parsedUrl = new URL(urlToParse);
	} catch {
		return null;
	}

	const rawProtocol = parsedUrl.protocol.replace(/:$/, "").toLowerCase();
	if (!isProxyProtocolSupported(rawProtocol)) {
		return null;
	}

	const protocol = rawProtocol as ProxyProtocol;
	const host = parsedUrl.hostname;
	if (!host) {
		return null;
	}

	let port = parsedUrl.port ? Number.parseInt(parsedUrl.port, 10) : 0;
	if (!port || Number.isNaN(port) || port <= 0 || port > 65535) {
		if (protocol === "https") {
			port = 443;
		} else if (protocol === "http") {
			port = 80;
		} else {
			port = 1080; // SOCKS default
		}
	}

	const username = parsedUrl.username
		? decodeURIComponent(parsedUrl.username)
		: undefined;
	const password = parsedUrl.password
		? decodeURIComponent(parsedUrl.password)
		: undefined;

	let auth: string | undefined;
	if (username) {
		auth = password ? `${username}:${password}` : username;
	}

	let socksType: (4 | 5) | undefined;
	if (
		protocol === "socks4" ||
		protocol === "socks4a"
	) {
		socksType = 4;
	} else if (
		protocol === "socks5" ||
		protocol === "socks5h" ||
		protocol === "socks"
	) {
		socksType = 5;
	}

	return {
		rawUrl: trimmed,
		protocol,
		host,
		port,
		username,
		password,
		auth,
		socksType,
	};
}

/**
 * Creates an undici connector function for SOCKS proxies using the `socks` package,
 * supporting TLS upgrade for HTTPS targets.
 */
export function createSocksConnector(
	parsed: ParsedProxy,
	options?: {
		readonly timeoutMs?: number | undefined;
		readonly rejectUnauthorized?: boolean | undefined;
	},
): buildConnector.connector {
	const socksType: 4 | 5 = parsed.socksType ?? (parsed.protocol.startsWith("socks4") ? 4 : 5);
	const timeout = options?.timeoutMs ?? 30000;
	const rejectUnauthorized = options?.rejectUnauthorized ?? true;

	return function socksConnect(
		opts: buildConnector.Options,
		callback: buildConnector.Callback,
	): void {
		const targetHost = opts.hostname || opts.host || "localhost";
		const targetPort =
			Number(opts.port) || (opts.protocol === "https:" ? 443 : 80);
		const isHttps = opts.protocol === "https:";

		const socksOptions: SocksClientOptions = {
			proxy: {
				host: parsed.host,
				port: parsed.port,
				type: socksType,
				...(parsed.username ? { userId: parsed.username } : {}),
				...(parsed.password ? { password: parsed.password } : {}),
			},
			command: "connect",
			destination: {
				host: targetHost,
				port: targetPort,
			},
			timeout,
		};

		SocksClient.createConnection(socksOptions)
			.then((info) => {
				const socket = info.socket as net.Socket;

				if (!isHttps) {
					callback(null, socket);
					return;
				}

				// Upgrade to TLS for HTTPS target
				const tlsSocket = tls.connect({
					socket,
					host: targetHost,
					servername: opts.servername || opts.hostname || targetHost,
					rejectUnauthorized,
					ALPNProtocols: ["http/1.1"],
				});

				const onSecureConnect = () => {
					tlsSocket.removeListener("error", onError);
					callback(null, tlsSocket);
				};

				const onError = (err: Error) => {
					tlsSocket.removeListener("secureConnect", onSecureConnect);
					try {
						socket.destroy();
					} catch {
						// Socket cleanup
					}
					callback(err, null);
				};

				tlsSocket.once("secureConnect", onSecureConnect);
				tlsSocket.once("error", onError);
			})
			.catch((err) => {
				const errorInstance =
					err instanceof Error ? err : new Error(String(err));
				callback(errorInstance, null);
			});
	};
}

/**
 * Creates an undici Dispatcher for the specified proxy URL.
 * Returns null if no proxy URL is provided or discovered in environment variables.
 */
export function createProxiedDispatcher(
	proxyUrl?: string,
	options?: ProxyDispatcherOptions,
): Dispatcher | null {
	const resolvedUrl = proxyUrl?.trim() || options?.proxyUrl?.trim() || getGlobalProxyUrl();
	if (!resolvedUrl) {
		return null;
	}

	const parsed = parseProxyUrl(resolvedUrl);
	if (!parsed) {
		return null;
	}

	// HTTP / HTTPS Proxy: Use undici ProxyAgent
	if (parsed.protocol === "http" || parsed.protocol === "https") {
		const proxyAgentOptions: ProxyAgent.Options = {
			uri: parsed.rawUrl,
		};

		if (options?.proxyTunnel !== undefined) {
			proxyAgentOptions.proxyTunnel = options.proxyTunnel;
		}

		if (parsed.username && parsed.password) {
			const token = Buffer.from(
				`${parsed.username}:${parsed.password}`,
			).toString("base64");
			proxyAgentOptions.token = `Basic ${token}`;
			proxyAgentOptions.headers = {
				"Proxy-Authorization": `Basic ${token}`,
			};
		}

		if (options?.keepAliveTimeoutMs) {
			proxyAgentOptions.keepAliveTimeout = options.keepAliveTimeoutMs;
		}

		return new ProxyAgent(proxyAgentOptions);
	}

	// SOCKS4 / SOCKS5 Proxy: Use undici Agent with custom Socks connector
	const socksConnector = createSocksConnector(parsed, {
		timeoutMs: options?.timeoutMs,
		rejectUnauthorized: options?.rejectUnauthorized,
	});

	return new Agent({
		connect: socksConnector,
		keepAliveTimeout: options?.keepAliveTimeoutMs ?? 10000,
	});
}

/**
 * Creates a proxied fetch function conforming to the standard Fetch API.
 * If no proxy is configured, returns standard global fetch.
 */
export function createProxiedFetch(
	proxyOrDispatcher?: string | Dispatcher,
	options?: ProxyDispatcherOptions,
): typeof fetch {
	let dispatcher: Dispatcher | null = null;
	if (proxyOrDispatcher && typeof proxyOrDispatcher !== "string") {
		dispatcher = proxyOrDispatcher;
	} else {
		dispatcher = createProxiedDispatcher(proxyOrDispatcher, options);
	}

	if (!dispatcher) {
		return globalThis.fetch;
	}

	const customFetch = (async (
		input: FetchInput,
		init?: RequestInit,
	): Promise<Response> => {
		const undiciInit = {
			...init,
			dispatcher,
		};
		return (await undiciFetch(
			input as string | URL,
			undiciInit as never,
		)) as unknown as Response;
	}) as typeof fetch;

	return customFetch;
}

/**
 * Constructs provider-specific SDK options for LLM clients (OpenAI, Anthropic, Groq, Google, DeepSeek).
 */
export function createProxiedSdkOptions(
	provider: string,
	proxyUrl?: string,
	options?: ProxyDispatcherOptions,
): ProxiedSdkOptions {
	const normalizedProvider = provider.toLowerCase().trim();
	const resolvedProxy =
		proxyUrl?.trim() ||
		options?.proxyUrl?.trim() ||
		getGlobalProxyUrl(normalizedProvider);

	if (!resolvedProxy) {
		return {};
	}

	const dispatcher = createProxiedDispatcher(resolvedProxy, options);
	if (!dispatcher) {
		return {};
	}

	const proxiedFetch = createProxiedFetch(dispatcher, options);

	switch (normalizedProvider) {
		case "openai":
			return {
				fetch: proxiedFetch,
				dispatcher,
				proxyUrl: resolvedProxy,
			};

		case "anthropic":
			return {
				fetch: proxiedFetch,
				dispatcher,
				proxyUrl: resolvedProxy,
			};

		case "groq":
			return {
				fetch: proxiedFetch,
				dispatcher,
				proxyUrl: resolvedProxy,
			};

		case "google":
			return {
				fetch: proxiedFetch,
				dispatcher,
				proxyUrl: resolvedProxy,
				requestOptions: {
					customHeaders: {},
					fetch: proxiedFetch,
				},
			};

		case "deepseek":
			return {
				fetch: proxiedFetch,
				dispatcher,
				proxyUrl: resolvedProxy,
			};

		default:
			return {
				fetch: proxiedFetch,
				dispatcher,
				proxyUrl: resolvedProxy,
			};
	}
}
