/**
 * networkShield.ts — Enterprise Network Shield & SOCKS5/HTTPS Proxy Router for AI & Speech Bridges.
 */

import { Buffer } from "node:buffer";
import * as http from "node:http";
import * as https from "node:https";
import * as net from "node:net";
import * as stream from "node:stream";
import * as tls from "node:tls";
import { URL } from "node:url";
import { type SocksClientOptions, SocksClient } from "socks";
import type { Dispatcher } from "undici";
import { createApiLogger, safeLogError } from "../../observability/logger.js";
import {
	DEFAULT_FALLBACK_SOCKS5_PROXY,
	createProxiedDispatcher,
	createProxiedFetch,
	getGlobalProxyUrl,
	parseProxyUrl,
	type ProxyDispatcherOptions,
	type ProxyProtocol,
} from "./proxyDispatcher.js";

const logger = createApiLogger("networkShield");

function resolveTlsServername(connOpts: http.ClientRequestArgs, targetHost: string): string {
	const candidateServername =
		"servername" in connOpts && typeof connOpts.servername === "string"
			? connOpts.servername
			: undefined;
	const candidateHost =
		typeof connOpts.host === "string" ? connOpts.host : undefined;
	return candidateServername || candidateHost || targetHost;
}

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

export function isNetworkShieldEnabled(): boolean {
	const env = process.env;
	const useProxy = (env.USE_PROXY ?? "").trim().toLowerCase();
	if (["true", "1", "yes", "on"].includes(useProxy)) {
		return true;
	}
	if (["false", "0", "no", "off"].includes(useProxy)) {
		return false;
	}

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

export function resolveNetworkShieldProxyUrl(
	overrideUrl?: string,
): string | undefined {
	if (overrideUrl?.trim()) {
		return overrideUrl.trim();
	}

	const env = process.env;
	const useProxy = (env.USE_PROXY ?? "").trim().toLowerCase();

	if (["false", "0", "no", "off"].includes(useProxy)) {
		return undefined;
	}

	if (env.GLOBAL_LLM_PROXY_URL?.trim()) {
		return env.GLOBAL_LLM_PROXY_URL.trim();
	}

	if (["true", "1", "yes", "on"].includes(useProxy)) {
		return (
			env.PROXY_URL?.trim() ||
			env.HTTPS_PROXY?.trim() ||
			env.HTTP_PROXY?.trim() ||
			env.LLM_PROXY?.trim() ||
			DEFAULT_FALLBACK_SOCKS5_PROXY
		);
	}

	return getGlobalProxyUrl();
}

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
		return proxyUrl.replace(
			/(:\/\/)([^:@\s]+):([^@\s]+)@/g,
			"$1$2:***@",
		);
	}
}

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

class NetworkShieldSocksAgent extends https.Agent {
	constructor(
		private readonly socksParsed: ReturnType<typeof parseProxyUrl> & object,
		private readonly socksTypeVal: 4 | 5,
		private readonly agentTimeout: number,
		private readonly tlsRejectUnauthorized: boolean,
	) {
		super({ timeout: agentTimeout });
	}

	override createConnection(
		connOpts: http.ClientRequestArgs,
		callback?: ((err: Error | null, stream: stream.Duplex) => void) | undefined,
	): stream.Duplex | undefined {
		const emitErr = (err: Error) => {
			if (callback) {
				(callback as (err: Error, stream?: stream.Duplex) => void)(err);
			}
		};
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
				host: this.socksParsed.host,
				port: this.socksParsed.port,
				type: this.socksTypeVal,
				...(this.socksParsed.username ? { userId: this.socksParsed.username } : {}),
				...(this.socksParsed.password ? { password: this.socksParsed.password } : {}),
			},
			command: "connect",
			destination: {
				host: targetHost,
				port: targetPort,
			},
			timeout: this.agentTimeout,
		};

		SocksClient.createConnection(socksOptions)
			.then((info) => {
				const socket = info.socket;

				if (!isSecure) {
					callback?.(null, socket);
					return;
				}

				const servername = resolveTlsServername(connOpts, targetHost);

				const tlsSocket = tls.connect({
					socket,
					host: targetHost,
					servername,
					rejectUnauthorized: this.tlsRejectUnauthorized,
					ALPNProtocols: ["http/1.1"],
				});

				const onSecureConnect = () => {
					tlsSocket.removeListener("error", onError);
					callback?.(null, tlsSocket);
				};

				const onError = (err: Error) => {
					tlsSocket.removeListener("secureConnect", onSecureConnect);
					try {
						socket.destroy();
					} catch (destroyErr) {
						logger.debug({ err: safeLogError(destroyErr) }, "SOCKS TLS error socket cleanup failed");
					}
					emitErr(err);
				};

				tlsSocket.once("secureConnect", onSecureConnect);
				tlsSocket.once("error", onError);
			})
			.catch((err) => {
				const errorInstance =
					err instanceof Error ? err : new Error(String(err));
				emitErr(errorInstance);
			});

		return undefined;
	}
}

class NetworkShieldHttpConnectAgent extends https.Agent {
	constructor(
		private readonly httpParsed: ReturnType<typeof parseProxyUrl> & object,
		private readonly authHeaderVal: string | undefined,
		private readonly agentTimeout: number,
		private readonly tlsRejectUnauthorized: boolean,
	) {
		super({ timeout: agentTimeout });
	}

	override createConnection(
		connOpts: http.ClientRequestArgs,
		callback?: ((err: Error | null, stream: stream.Duplex) => void) | undefined,
	): stream.Duplex | undefined {
		const emitErr = (err: Error) => {
			if (callback) {
				(callback as (err: Error, stream?: stream.Duplex) => void)(err);
			}
		};
		const targetHost = String(
			connOpts.host || connOpts.hostname || "localhost",
		);
		const targetPort = Number(connOpts.port || 443);
		const isSecure =
			connOpts.protocol === "https:" ||
			connOpts.protocol === "wss:" ||
			targetPort === 443;

		const req = http.request({
			host: this.httpParsed.host,
			port: this.httpParsed.port,
			method: "CONNECT",
			path: `${targetHost}:${targetPort}`,
			headers: {
				Host: `${targetHost}:${targetPort}`,
				...(this.authHeaderVal ? { "Proxy-Authorization": this.authHeaderVal } : {}),
			},
			timeout: this.agentTimeout,
		});

		req.on("connect", (res, socket, _head) => {
			if (res.statusCode !== 200) {
				emitErr(
					new Error(
						`Proxy CONNECT tunnel failed with status: ${res.statusCode} ${res.statusMessage || ""}`,
					),
				);
				return;
			}

			if (!isSecure) {
				callback?.(null, socket);
				return;
			}

			const servername = resolveTlsServername(connOpts, targetHost);

			const tlsSocket = tls.connect({
				socket,
				host: targetHost,
				servername,
				rejectUnauthorized: this.tlsRejectUnauthorized,
				ALPNProtocols: ["http/1.1"],
			});

			const onSecureConnect = () => {
				tlsSocket.removeListener("error", onError);
				callback?.(null, tlsSocket);
			};

			const onError = (err: Error) => {
				tlsSocket.removeListener("secureConnect", onSecureConnect);
				try {
					socket.destroy();
				} catch (destroyErr) {
					logger.debug({ err: safeLogError(destroyErr) }, "HTTP CONNECT TLS error socket cleanup failed");
				}
				emitErr(err);
			};

			tlsSocket.once("secureConnect", onSecureConnect);
			tlsSocket.once("error", onError);
		});

		req.on("error", (err) => emitErr(err));
		req.on("timeout", () => {
			req.destroy(new Error(`Proxy CONNECT connection timed out after ${this.agentTimeout}ms`));
		});
		req.end();

		return undefined;
	}
}

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

		return new NetworkShieldSocksAgent(parsed, socksType, timeout, rejectUnauthorized);
	}

	const authHeader = parsed.username
		? `Basic ${Buffer.from(
				`${parsed.username}:${parsed.password || ""}`,
			).toString("base64")}`
		: undefined;

	return new NetworkShieldHttpConnectAgent(parsed, authHeader, timeout, rejectUnauthorized);
}

let cachedWsAgent: https.Agent | http.Agent | null = null;
let cachedWsProxyUrl: string | null = null;

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
					} catch (destroyErr) {
						logger.debug({ err: safeLogError(destroyErr) }, "SOCKS probe socket cleanup failed");
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
			} catch (destroyErr) {
				logger.debug({ err: safeLogError(destroyErr) }, "HTTP CONNECT probe socket cleanup failed");
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

		req.on("error", (err: unknown) => {
			resolve({
				success: false,
				latencyMs: Date.now() - startTime,
				error: err instanceof Error ? err.message : String(err),
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
