/**
 * networkShield.ts — Enterprise Network Shield & SOCKS5/HTTPS Proxy Router for AI & Speech Bridges.
 *
 * SQUAD BETA INVARIANTS:
 * 1. Centralized proxy resolution: evaluates USE_PROXY, GLOBAL_LLM_PROXY_URL, PROXY_URL, HTTPS_PROXY, HTTP_PROXY.
 * 2. Fallback SOCKS5 standard: defaults to socks5://dente_proxy:DenteSecureSocks2026!@62.84.100.97:1080 when proxy is enabled.
 * 3. WebSocket Proxy Agent: provides robust http.Agent / https.Agent wrapping via SocksClient (SOCKS4/5) and HTTP CONNECT (HTTP/HTTPS) with TLS upgrade.
 * 4. Credential Shielding: sanitizes and masks proxy credentials in all telemetry and diagnostics logs.
 * 5. Undici & Fetch integration: seamless dispatcher and proxied fetch for REST & WebSocket streaming.
 */

import { Buffer } from "node:buffer";
import * as http from "node:http";
import * as https from "node:https";
import * as net from "node:net";
import * as tls from "node:tls";
import { URL } from "node:url";
import { type SocksClientOptions, SocksClient } from "socks";
import type { Dispatcher } from "undici";
import {
	DEFAULT_FALLBACK_SOCKS5_PROXY,
	createProxiedDispatcher,
	createProxiedFetch,
	getGlobalProxyUrl,
	isProxyProtocolSupported,
	parseProxyUrl,
	type ParsedProxy,
	type ProxyDispatcherOptions,
	type ProxyProtocol,
} from "./proxyDispatcher.js";

export { DEFAULT_FALLBACK_SOCKS5_PROXY };

export interface NetworkShieldStatus {
	readonly enabled: boolean;
	readonly proxyUrlMasked: string | null;
	readonly protocol: ProxyProtocol | null;
	readonly host: string | null;
	readonly port: number | null;
	readonly hasAuth: boolean;
}

export interface NetworkShieldWsAgentOptions {
	readonly proxyUrl?: string | undefined;
	readonly timeoutMs?: number | undefined;
	readonly rejectUnauthorized?: boolean | undefined;
}

/**
 * Checks if the network proxy shield is explicitly or implicitly enabled via environment variables.
 */
export function isNetworkShieldEnabled(): boolean {
	const env = process.env;
	const useProxy = (env.USE_PROXY ?? "").trim().toLowerCase();
	if (["true", "1", "yes", "on"].includes(useProxy)) {
		return true;
	}
	if (["false", "0", "no", "off"].includes(useProxy)) {
		return false;
	}

	// If explicit proxy URLs are set in environment, shield is enabled
	return Boolean(
		env.GLOBAL_LLM_PROXY_URL?.trim() ||
			env.LLM_PROXY?.trim() ||
			env.PROXY_URL?.trim() ||
			env.HTTPS_PROXY?.trim() ||
			env.https_proxy?.trim() ||
			env.HTTP_PROXY?.trim() ||
			env.http_proxy?.trim() ||
			env.ALL_PROXY?.trim() ||
			env.all_proxy?.trim() ||
			env.SOCKS_PROXY?.trim() ||
			env.socks_proxy?.trim(),
	);
}

/**
 * Resolves the effective proxy URL taking into account USE_PROXY, GLOBAL_LLM_PROXY_URL,
 * provider-specific configs, and default fallback.
 */
export function resolveNetworkShieldProxyUrl(
	overrideUrl?: string,
): string | undefined {
	if (overrideUrl?.trim()) {
		return overrideUrl.trim();
	}

	const env = process.env;
	const useProxy = (env.USE_PROXY ?? "").trim().toLowerCase();

	// Explicit disable
	if (["false", "0", "no", "off"].includes(useProxy)) {
		return undefined;
	}

	// Explicit global proxy URL
	if (env.GLOBAL_LLM_PROXY_URL?.trim()) {
		return env.GLOBAL_LLM_PROXY_URL.trim();
	}

	// If USE_PROXY=true is set but no custom URL, use default fallback SOCKS5
	if (["true", "1", "yes", "on"].includes(useProxy)) {
		return (
			env.PROXY_URL?.trim() ||
			env.HTTPS_PROXY?.trim() ||
			env.HTTP_PROXY?.trim() ||
			env.LLM_PROXY?.trim() ||
			DEFAULT_FALLBACK_SOCKS5_PROXY
		);
	}

	// Check standard global proxy env variables
	return getGlobalProxyUrl();
}

/**
 * Masks credentials in proxy URL for safe logging and telemetry.
 * E.g. socks5://dente_proxy:DenteSecureSocks2026!@62.84.100.97:1080 -> socks5://dente_proxy:***@62.84.100.97:1080
 */
export function maskProxyUrl(proxyUrl: string | undefined): string | null {
	if (!proxyUrl || typeof proxyUrl !== "string") {
		return null;
	}

	try {
		const parsed = new URL(
			/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(proxyUrl)
				? proxyUrl
				: `http://${proxyUrl}`,
		);
		if (parsed.password) {
			parsed.password = "***";
		}
		return parsed.toString();
	} catch {
		// Regex fallback for non-standard URI schemes
		return proxyUrl.replace(
			/(:\/\/)([^:@\s]+):([^@\s]+)@/g,
			"$1$2:***@",
		);
	}
}

/**
 * Returns a structured diagnostics summary of the active network shield.
 */
export function getNetworkShieldStatus(
	overrideUrl?: string,
): NetworkShieldStatus {
	const resolvedUrl = resolveNetworkShieldProxyUrl(overrideUrl);
	const enabled = isNetworkShieldEnabled() || Boolean(resolvedUrl);

	if (!enabled || !resolvedUrl) {
		return {
			enabled: false,
			proxyUrlMasked: null,
			protocol: null,
			host: null,
			port: null,
			hasAuth: false,
		};
	}

	const parsed = parseProxyUrl(resolvedUrl);
	if (!parsed) {
		return {
			enabled: false,
			proxyUrlMasked: maskProxyUrl(resolvedUrl),
			protocol: null,
			host: null,
			port: null,
			hasAuth: false,
		};
	}

	return {
		enabled: true,
		proxyUrlMasked: maskProxyUrl(resolvedUrl),
		protocol: parsed.protocol,
		host: parsed.host,
		port: parsed.port,
		hasAuth: Boolean(parsed.username || parsed.password),
	};
}

/**
 * Creates an https.Agent or http.Agent configured for WebSocket tunneling over SOCKS4/SOCKS5 or HTTP/HTTPS proxy.
 */
export function createNetworkShieldWsAgent(
	options?: NetworkShieldWsAgentOptions,
): https.Agent | http.Agent | null {
	const resolvedUrl = resolveNetworkShieldProxyUrl(options?.proxyUrl);
	if (!resolvedUrl) {
		return null;
	}

	const parsed = parseProxyUrl(resolvedUrl);
	if (!parsed) {
		return null;
	}

	const timeout = options?.timeoutMs ?? 30000;
	const rejectUnauthorized = options?.rejectUnauthorized ?? true;

	if (parsed.protocol.startsWith("socks")) {
		const socksType: 4 | 5 =
			parsed.socksType ?? (parsed.protocol.startsWith("socks4") ? 4 : 5);

		const agentOptions: any = {
			timeout,
			createConnection: (connOpts: Record<string, unknown>, callback: (err: Error | null, socket?: net.Socket | tls.TLSSocket | null) => void) => {
				const targetHost = String(
					connOpts.host || connOpts.hostname || "localhost",
				);
				const targetPort = Number(connOpts.port || 443);
				const isSecure =
					connOpts.protocol === "https:" ||
					connOpts.protocol === "wss:" ||
					targetPort === 443;

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
						const socket = info.socket;

						if (!isSecure) {
							callback(null, socket);
							return;
						}

						const servername =
							(connOpts.servername as string | undefined) ||
							(connOpts.host as string | undefined) ||
							targetHost;

						const tlsSocket = tls.connect({
							socket,
							host: targetHost,
							servername,
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
								// cleanup
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
			},
		};

		return new https.Agent(agentOptions);
	}

	// HTTP / HTTPS CONNECT tunneling agent
	const authHeader = parsed.username
		? `Basic ${Buffer.from(
				`${parsed.username}:${parsed.password || ""}`,
			).toString("base64")}`
		: undefined;

	const agentOptions: any = {
		timeout,
		createConnection: (connOpts: Record<string, unknown>, callback: (err: Error | null, socket?: net.Socket | tls.TLSSocket | null) => void) => {
			const targetHost = String(
				connOpts.host || connOpts.hostname || "localhost",
			);
			const targetPort = Number(connOpts.port || 443);
			const isSecure =
				connOpts.protocol === "https:" ||
				connOpts.protocol === "wss:" ||
				targetPort === 443;

			const req = http.request({
				host: parsed.host,
				port: parsed.port,
				method: "CONNECT",
				path: `${targetHost}:${targetPort}`,
				headers: {
					Host: `${targetHost}:${targetPort}`,
					...(authHeader ? { "Proxy-Authorization": authHeader } : {}),
				},
				timeout,
			});

			req.on("connect", (res, socket, _head) => {
				if (res.statusCode !== 200) {
					callback(
						new Error(
							`Proxy CONNECT tunnel failed with status: ${res.statusCode} ${res.statusMessage || ""}`,
						),
						null,
					);
					return;
				}

				if (!isSecure) {
					callback(null, socket);
					return;
				}

				const servername =
					(connOpts.servername as string | undefined) ||
					(connOpts.host as string | undefined) ||
					targetHost;

				const tlsSocket = tls.connect({
					socket,
					host: targetHost,
					servername,
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
						// cleanup
					}
					callback(err, null);
				};

				tlsSocket.once("secureConnect", onSecureConnect);
				tlsSocket.once("error", onError);
			});

			req.on("error", (err) => callback(err, null));
			req.on("timeout", () => {
				req.destroy(new Error(`Proxy CONNECT connection timed out after ${timeout}ms`));
			});
			req.end();
		},
	};

	return new https.Agent(agentOptions);
}

let cachedWsAgent: https.Agent | http.Agent | null = null;
let cachedWsProxyUrl: string | null = null;

/**
 * Returns a cached or newly initialized WebSocket agent according to current environment proxy configuration.
 */
export function getNetworkShieldWsAgent(
	overrideUrl?: string,
): https.Agent | http.Agent | null {
	const resolvedUrl = resolveNetworkShieldProxyUrl(overrideUrl);
	if (!resolvedUrl) {
		cachedWsAgent = null;
		cachedWsProxyUrl = null;
		return null;
	}

	if (cachedWsAgent && cachedWsProxyUrl === resolvedUrl) {
		return cachedWsAgent;
	}

	cachedWsAgent = createNetworkShieldWsAgent({ proxyUrl: resolvedUrl });
	cachedWsProxyUrl = resolvedUrl;
	return cachedWsAgent;
}

/**
 * Returns an undici Dispatcher for REST LLM/Speech calls via the network shield proxy.
 */
export function getNetworkShieldDispatcher(
	overrideUrl?: string,
	options?: ProxyDispatcherOptions,
): Dispatcher | null {
	const resolvedUrl = resolveNetworkShieldProxyUrl(overrideUrl);
	if (!resolvedUrl) {
		return null;
	}
	return createProxiedDispatcher(resolvedUrl, options);
}

/**
 * Returns a proxied fetch function conforming to the standard Fetch API.
 */
export function getNetworkShieldFetch(
	overrideUrl?: string,
	options?: ProxyDispatcherOptions,
): typeof fetch {
	const resolvedUrl = resolveNetworkShieldProxyUrl(overrideUrl);
	if (!resolvedUrl) {
		return globalThis.fetch;
	}
	return createProxiedFetch(resolvedUrl, options);
}

/**
 * Probes proxy connectivity by attempting a lightweight TCP handshake through the configured proxy.
 */
export async function probeProxyConnectivity(
	proxyUrl?: string,
	timeoutMs = 5000,
): Promise<{ success: boolean; latencyMs: number; error?: string }> {
	const resolvedUrl = resolveNetworkShieldProxyUrl(proxyUrl);
	if (!resolvedUrl) {
		return {
			success: false,
			latencyMs: 0,
			error: "No proxy URL configured",
		};
	}

	const parsed = parseProxyUrl(resolvedUrl);
	if (!parsed) {
		return {
			success: false,
			latencyMs: 0,
			error: `Unsupported or invalid proxy URL: ${maskProxyUrl(resolvedUrl)}`,
		};
	}

	const startTime = Date.now();

	return new Promise((resolve) => {
		const targetHost = "generativelanguage.googleapis.com";
		const targetPort = 443;

		if (parsed.protocol.startsWith("socks")) {
			const socksType: 4 | 5 =
				parsed.socksType ?? (parsed.protocol.startsWith("socks4") ? 4 : 5);

			SocksClient.createConnection({
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
				timeout: timeoutMs,
			})
				.then((info) => {
					const latencyMs = Date.now() - startTime;
					try {
						info.socket.destroy();
					} catch {
						// ignore
					}
					resolve({ success: true, latencyMs });
				})
				.catch((err) => {
					resolve({
						success: false,
						latencyMs: Date.now() - startTime,
						error: err instanceof Error ? err.message : String(err),
					});
				});
			return;
		}

		// HTTP CONNECT probe
		const authHeader = parsed.username
			? `Basic ${Buffer.from(
					`${parsed.username}:${parsed.password || ""}`,
				).toString("base64")}`
			: undefined;

		const req = http.request({
			host: parsed.host,
			port: parsed.port,
			method: "CONNECT",
			path: `${targetHost}:${targetPort}`,
			headers: {
				Host: `${targetHost}:${targetPort}`,
				...(authHeader ? { "Proxy-Authorization": authHeader } : {}),
			},
			timeout: timeoutMs,
		});

		req.on("connect", (res, socket) => {
			const latencyMs = Date.now() - startTime;
			try {
				socket.destroy();
			} catch {
				// ignore
			}
			if (res.statusCode === 200) {
				resolve({ success: true, latencyMs });
			} else {
				resolve({
					success: false,
					latencyMs,
					error: `Proxy returned HTTP ${res.statusCode} ${res.statusMessage || ""}`,
				});
			}
		});

		req.on("error", (err) => {
			resolve({
				success: false,
				latencyMs: Date.now() - startTime,
				error: err.message,
			});
		});

		req.on("timeout", () => {
			req.destroy();
			resolve({
				success: false,
				latencyMs: Date.now() - startTime,
				error: `Proxy connection probe timed out after ${timeoutMs}ms`,
			});
		});

		req.end();
	});
}
