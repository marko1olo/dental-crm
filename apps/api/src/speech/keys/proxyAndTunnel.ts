import tls from "node:tls";
import http from "node:http";
import https from "node:https";
import { PassThrough } from "node:stream";
import { SocksClient } from "socks";
import type { RequestInfo, RequestInit } from "undici";
import {
	Agent,
	type Dispatcher,
	ProxyAgent,
	fetch as undiciFetch,
} from "undici";
import { ensureSshTunnel } from "../tunnel.js";
import {
	sanitizeProviderErrorMessage,
	speechProviderTimeoutMs,
} from "./keyHashing.js";

export class SpeechProviderRequestError extends Error {
	statusCode: number | null;
	retryable: boolean;
	rateLimited: boolean;
	timedOut: boolean;

	constructor(
		message: string,
		options: {
			statusCode?: number | null;
			retryable?: boolean;
			rateLimited?: boolean;
			timedOut?: boolean;
		} = {},
	) {
		super(sanitizeProviderErrorMessage(message));
		this.name = "SpeechProviderRequestError";
		this.statusCode = options.statusCode ?? null;
		this.retryable = Boolean(options.retryable);
		this.rateLimited = Boolean(options.rateLimited);
		this.timedOut = Boolean(options.timedOut);
	}
}

let cachedProxyAgent: Dispatcher | null = null;
export function getProxyAgent(): Dispatcher | null {
	const proxyUrl =
		process.env.GLOBAL_LLM_PROXY_URL?.trim() ||
		process.env.PROXY_URL?.trim() ||
		process.env.HTTPS_PROXY?.trim() ||
		process.env.HTTP_PROXY?.trim() ||
		process.env.LLM_PROXY?.trim() ||
		undefined;
	if (!proxyUrl) return null;
	if (!cachedProxyAgent) {
		try {
			if (proxyUrl.startsWith("socks")) {
				const parsed = new URL(proxyUrl);
				const proxyHost = parsed.hostname;
				const proxyPort = Number(parsed.port || 1080);
				const proxyType = proxyUrl.includes("socks4") ? 4 : 5;

				const socksProxyOpts: import("socks").SocksProxy = {
					host: proxyHost,
					port: proxyPort,
					type: proxyType as 4 | 5,
					...(parsed.username
						? { userId: decodeURIComponent(parsed.username) }
						: {}),
					...(parsed.password
						? { password: decodeURIComponent(parsed.password) }
						: {}),
				};

				cachedProxyAgent = new Agent({
					connect: (opts, callback) => {
						const destPort = opts.port
							? Number(opts.port)
							: opts.protocol === "https:"
								? 443
								: 80;
						const destHost = opts.host || "";

						SocksClient.createConnection(
							{
								proxy: socksProxyOpts,
								command: "connect",
								destination: {
									host: destHost,
									port: destPort,
								},
							},
							(err, info) => {
								if (err) {
									callback(err, null);
									return;
								}

								if (!info) {
									callback(
										new Error("SOCKS connection returned no info"),
										null,
									);
									return;
								}

								if (opts.protocol === "https:") {
									const tlsSocket = tls.connect(
										{
											socket: info.socket,
											servername: opts.servername || opts.host,
										},
										() => {
											callback(null, tlsSocket);
										},
									);

									tlsSocket.on("error", (tlsErr) => {
										callback(tlsErr, null);
									});
								} else {
									callback(null, info.socket);
								}
							},
						);
					},
				});
			} else {
				cachedProxyAgent = new ProxyAgent({ uri: proxyUrl });
			}
		} catch (err) {
			console.error(
				`[Proxy Agent] Failed to initialize ProxyAgent for ${proxyUrl}:`,
				err,
			);
		}
	}
	return cachedProxyAgent;
}

let cachedWsAgent: https.Agent | http.Agent | null = null;
export function getWsProxyAgent(): https.Agent | http.Agent | null {
	const proxyUrl =
		process.env.GLOBAL_LLM_PROXY_URL?.trim() ||
		process.env.PROXY_URL?.trim() ||
		process.env.HTTPS_PROXY?.trim() ||
		process.env.HTTP_PROXY?.trim() ||
		process.env.LLM_PROXY?.trim() ||
		undefined;
	if (!proxyUrl) return null;
	if (cachedWsAgent) return cachedWsAgent;

	type CustomAgentOptions = https.AgentOptions & {
		createConnection?: (
			options: http.ClientRequestArgs & { servername?: string },
			callback?: (err: Error | null, stream: import("node:stream").Duplex) => void,
		) => import("node:stream").Duplex | undefined;
	};

	try {
		const parsedProxy = new URL(proxyUrl);
		if (proxyUrl.startsWith("socks")) {
			const proxyType = proxyUrl.includes("socks4") ? 4 : 5;
			const proxyHost = parsedProxy.hostname;
			const proxyPort = Number(parsedProxy.port || 1080);

			const socksProxyConfig: import("socks").SocksProxy = {
				host: proxyHost,
				port: proxyPort,
				type: proxyType as 4 | 5,
				...(parsedProxy.username
					? { userId: decodeURIComponent(parsedProxy.username) }
					: {}),
				...(parsedProxy.password
					? { password: decodeURIComponent(parsedProxy.password) }
					: {}),
			};

			const socksAgentOpts: CustomAgentOptions = {
				createConnection: (
					options: http.ClientRequestArgs & { servername?: string },
					callback?: (err: Error | null, stream: import("node:stream").Duplex) => void,
				) => {
					const targetHost = options.host || options.hostname || "";
					const targetPort = Number(options.port || 443);

					SocksClient.createConnection(
						{
							proxy: socksProxyConfig,
							command: "connect",
							destination: {
								host: targetHost,
								port: targetPort,
							},
						},
						(err, info) => {
							if (err || !info) {
								if (callback) {
									callback(
										err || new Error("SOCKS connection failed"),
										info?.socket || new PassThrough(),
									);
								}
								return;
							}
							const tlsSocket = tls.connect(
								{
									socket: info.socket,
									servername: options.servername || targetHost,
								},
								() => {
									if (callback) callback(null, tlsSocket);
								},
							);
							tlsSocket.on("error", (tlsErr) => {
								if (callback) callback(tlsErr, tlsSocket);
							});
						},
					);
					return undefined;
				},
			};
			cachedWsAgent = new https.Agent(socksAgentOpts as https.AgentOptions);
		} else {
			// HTTP / HTTPS CONNECT tunneling agent
			const proxyHost = parsedProxy.hostname;
			const proxyPort = Number(
				parsedProxy.port || (parsedProxy.protocol === "https:" ? 443 : 8080),
			);
			const authHeader = parsedProxy.username
				? `Basic ${Buffer.from(`${decodeURIComponent(parsedProxy.username)}:${decodeURIComponent(parsedProxy.password || "")}`).toString("base64")}`
				: undefined;

			const httpAgentOpts: CustomAgentOptions = {
				createConnection: (
					options: http.ClientRequestArgs & { servername?: string },
					callback?: (err: Error | null, stream: import("node:stream").Duplex) => void,
				) => {
					const targetHost = options.host || options.hostname || "";
					const targetPort = Number(options.port || 443);

					const req = http.request({
						host: proxyHost,
						port: proxyPort,
						method: "CONNECT",
						path: `${targetHost}:${targetPort}`,
						headers: {
							Host: `${targetHost}:${targetPort}`,
							...(authHeader ? { "Proxy-Authorization": authHeader } : {}),
						},
					});

					req.on("connect", (res, socket, _head) => {
						if (res.statusCode !== 200) {
							if (callback) {
								callback(
									new Error(
										`Proxy CONNECT failed with status: ${res.statusCode}`,
									),
									socket,
								);
							}
							return;
						}
						const tlsSocket = tls.connect(
							{
								socket,
								servername: options.servername || targetHost,
							},
							() => {
								if (callback) callback(null, tlsSocket);
							},
						);
						tlsSocket.on("error", (tlsErr) => {
							if (callback) callback(tlsErr, tlsSocket);
						});
					});

					req.on("error", (err) => {
						if (callback) {
							callback(err, new PassThrough());
						}
					});
					req.end();
					return undefined;
				},
			};
			cachedWsAgent = new https.Agent(httpAgentOpts as https.AgentOptions);
		}
	} catch (err) {
		console.error(`[WS Proxy Agent] Failed to create WebSocket proxy agent:`, err);
		return null;
	}

	return cachedWsAgent;
}

export async function fetchWithProviderTimeout(
	input: Parameters<typeof fetch>[0],
	init: Parameters<typeof fetch>[1] = {},
	timeoutMs = speechProviderTimeoutMs(),
): Promise<Response> {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);
	const dispatcher = getProxyAgent();
	try {
		if (!dispatcher) {
			return await fetch(input, {
				...init,
				signal: controller.signal,
			});
		}
		const undiciInit: RequestInit = {
			dispatcher,
			signal: controller.signal,
		};
		if (init.method) undiciInit.method = init.method;
		if (init.headers !== undefined) undiciInit.headers = init.headers as NonNullable<RequestInit["headers"]>;
		if (init.body !== undefined && init.body !== null) undiciInit.body = init.body as NonNullable<RequestInit["body"]>;

		const res = await undiciFetch(input as URL | RequestInfo, undiciInit);
		return res as Response;
	} catch (error) {
		if (error instanceof Error && error.name === "AbortError") {
			throw new SpeechProviderRequestError(
				`Источник распознавания не ответил за ${Math.round(timeoutMs / 1000)} сек.`,
				{
					retryable: true,
					timedOut: true,
				},
			);
		}

		// SOCKS5 Tunnel Fallback on Network/Connection Failures
		const isNetworkError =
			error instanceof Error &&
			(/fetch failed|network|econnreset|econnrefused|etimedout|timeout|socket|terminated|dns|enotfound/i.test(
				error.message,
			) ||
				error.message.includes("undici"));

		if (isNetworkError && !dispatcher) {
			console.log(
				`[Speech Fetch] Direct connection failed (${error.message}). Attempting SOCKS5 SSH Tunnel fallback...`,
			);
			const tunnelActive = await ensureSshTunnel();
			if (tunnelActive) {
				console.log(
					`[Speech Fetch] SSH Tunnel is active. Retrying request through SOCKS5 proxy on 127.0.0.1:1080...`,
				);
				const socksDispatcher = new Agent({
					connect: (opts, callback) => {
						const destPort = opts.port
							? Number(opts.port)
							: opts.protocol === "https:"
								? 443
								: 80;
						const destHost = opts.host || "";
						SocksClient.createConnection(
							{
								proxy: {
									host: "127.0.0.1",
									port: 1080,
									type: 5,
								},
								command: "connect",
								destination: {
									host: destHost,
									port: destPort,
								},
							},
							(socksErr, info) => {
								if (socksErr) {
									callback(socksErr, null);
								} else if (!info) {
									callback(
										new Error("SOCKS connection returned no info"),
										null,
									);
								} else if (opts.protocol === "https:") {
									const tlsSocket = tls.connect(
										{
											socket: info.socket,
											servername: opts.servername || opts.host,
										},
										() => {
											callback(null, tlsSocket);
										},
									);
									tlsSocket.on("error", (tlsErr) => {
										callback(tlsErr, null);
									});
								} else {
									callback(null, info.socket);
								}
							},
						);
					},
				});

				clearTimeout(timer);
				const retryController = new AbortController();
				const retryTimer = setTimeout(() => retryController.abort(), timeoutMs);
				const retryInit: RequestInit = {
					dispatcher: socksDispatcher,
					signal: retryController.signal,
				};
				if (init.method) retryInit.method = init.method;
				if (init.headers !== undefined) retryInit.headers = init.headers as NonNullable<RequestInit["headers"]>;
				if (init.body !== undefined && init.body !== null) retryInit.body = init.body as NonNullable<RequestInit["body"]>;

				try {
					const retryRes = await undiciFetch(input as URL | RequestInfo, retryInit);
					return retryRes as Response;
				} catch (retryError) {
					console.error(`[Speech Fetch] SOCKS5 retry also failed:`, retryError);
				} finally {
					clearTimeout(retryTimer);
				}
			}
		}
		throw error;
	} finally {
		clearTimeout(timer);
	}
}
