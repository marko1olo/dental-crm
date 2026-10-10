import { randomInt } from "node:crypto";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import { WebSocket } from "ws";

/**
 * cloudRelayClient.ts — Фоновый агент локального сервера клиники для NAT Traversal.
 *
 * КАК ЭТО РАБОТАЕТ:
 * 1. Клиника находится за серым CGNAT провайдера без белого статического IP и без проброса портов.
 * 2. Этот агент при старте клиники открывает ИСХОДЯЩЕЕ WebSocket-соединение наружу на облачный VPS:
 *    wss://relay.yourdomain.com/edge?token=...&clinicId=...
 * 3. Сетевые экраны (firewalls) и CGNAT свободно пропускают исходящий TLS/TCP трафик.
 * 4. Агент поддерживает постоянный канал (keep-alive ping каждые 20 сек), не давая CGNAT-роутеру
 *    сбросить запись в таблице трансляции адресов.
 * 5. При обрыве интернета агент автоматически переподключается с экспоненциальным backoff.
 * 6. Когда зубной техник открывает заказ на портале, облачный шлюз шлет HTTP_REQUEST через этот туннель.
 *    Клиент выполняет запрос локально против Fastify клиники и отправляет ответ HTTP_RESPONSE назад.
 */

export interface CloudRelayConfig {
	readonly enabled: boolean;
	readonly relayUrl: string; // e.g. "wss://relay.clinic.ru/edge" или "ws://127.0.0.1:4050/edge"
	readonly authToken: string;
	readonly clinicId: string;
	readonly localBaseUrl?: string | undefined; // e.g. "http://127.0.0.1:3000"
	readonly reconnectInitialMs?: number | undefined; // default 1000
	readonly reconnectMaxMs?: number | undefined; // default 30000
	readonly pingIntervalMs?: number | undefined; // default 20000
}

export interface TunnelRequestPayload {
	readonly type: "HTTP_REQUEST";
	readonly id: string;
	readonly clinicId: string;
	readonly method: string;
	readonly url: string;
	readonly headers: Record<string, string>;
	readonly body?: string | null | undefined;
	readonly isBase64?: boolean | undefined;
}

export interface TunnelResponsePayload {
	readonly type: "HTTP_RESPONSE";
	readonly id: string;
	readonly statusCode: number;
	readonly headers?: Record<string, string> | undefined;
	readonly body?: string | null | undefined;
	readonly isBase64?: boolean | undefined;
}

/** Разрешенные маршруты для туннелирования техникам (защита от SSRF и обхода директорий) */
export const ALLOWED_TUNNEL_ROUTES: readonly { readonly path: string; readonly exact?: boolean }[] = [
	{ path: "/health", exact: true },
	{ path: "/api/clinical/dental-lab/presets", exact: true },
	{ path: "/api/portal/lab-order", exact: false },
	{ path: "/api/portal/scans", exact: false },
	{ path: "/api/portal/mock-storage", exact: false },
	{ path: "/api/public/booking", exact: false },
];

/** Обратная совместимость списка префиксов */
export const ALLOWED_TUNNEL_ROUTE_PREFIXES = ALLOWED_TUNNEL_ROUTES.map((r) => r.path);

/**
 * Строгая проверка разрешенных путей для защиты от 0-Day SSRF атак (/health/../../api/admin/users).
 */
export function isRouteAllowedForTunnel(urlPath: string): boolean {
	if (!urlPath || typeof urlPath !== "string") return false;
	const rawPath = urlPath.split("?")[0] || "/";
	let decodedPath: string;
	try {
		decodedPath = decodeURIComponent(rawPath);
	} catch {
		return false; // Malformed percent-encoding
	}

	// Нормализация POSIX-пути: схлопывает все /../ и /./
	const normalized = path.posix.normalize(decodedPath);
	if (normalized.includes("..") || !normalized.startsWith("/")) {
		return false; // Попытка directory traversal
	}

	return ALLOWED_TUNNEL_ROUTES.some((allowed) => {
		if (allowed.exact) {
			return normalized === allowed.path;
		}
		return normalized === allowed.path || normalized.startsWith(allowed.path + "/");
	});
}

/** Смещение системных часов клиники относительно NTP-времени облачного релея (CR2032 BIOS Clock Skew) */
let currentClockSkewOffsetMs = 0;

export function setNetworkClockSkewMs(skewMs: number): void {
	currentClockSkewOffsetMs = skewMs;
}

export function getNetworkClockSkewMs(): number {
	return currentClockSkewOffsetMs;
}

export function getCalibratedNow(): Date {
	return new Date(Date.now() + currentClockSkewOffsetMs);
}

export function loadCloudRelayConfigFromEnv(): CloudRelayConfig {
	const relayUrl = process.env.CLOUD_RELAY_URL || "";
	const authToken = process.env.CLOUD_RELAY_TOKEN || process.env.EDGE_AUTH_TOKEN || "dev-edge-relay-secret-token";
	const clinicId = process.env.CLOUD_RELAY_CLINIC_ID || process.env.CLINIC_ID || "default-clinic";
	const enabled =
		process.env.CLOUD_RELAY_ENABLED === "true" ||
		(Boolean(relayUrl) && process.env.CLOUD_RELAY_ENABLED !== "false");

	const port = process.env.PORT || "3000";
	const localBaseUrl = process.env.CLOUD_RELAY_LOCAL_API_URL || `http://127.0.0.1:${port}`;

	return {
		enabled,
		relayUrl,
		authToken,
		clinicId,
		localBaseUrl,
		reconnectInitialMs: 1000,
		reconnectMaxMs: 30000,
		pingIntervalMs: 20000,
	};
}

export class CloudRelayClient {
	private ws: WebSocket | null = null;
	private isRunning = false;
	private reconnectAttempts = 0;
	private missedPongs = 0;
	private reconnectTimer: NodeJS.Timeout | null = null;
	private pingTimer: NodeJS.Timeout | null = null;
	private lastConnectedAt: number | null = null;
	private lastError: string | null = null;
	private readonly config: CloudRelayConfig;
	private readonly app?: FastifyInstance | undefined;

	constructor(config: CloudRelayConfig, app?: FastifyInstance | undefined) {
		this.config = config;
		this.app = app;
	}

	public getStatus() {
		return {
			enabled: this.config.enabled,
			relayUrl: this.config.relayUrl,
			clinicId: this.config.clinicId,
			isConnected: Boolean(this.ws && this.ws.readyState === WebSocket.OPEN),
			reconnectAttempts: this.reconnectAttempts,
			lastConnectedAt: this.lastConnectedAt ? new Date(this.lastConnectedAt).toISOString() : null,
			lastError: this.lastError,
		};
	}

	public start(): void {
		if (!this.config.enabled || !this.config.relayUrl) {
			return;
		}
		this.isRunning = true;
		this.connect();
	}

	public stop(): void {
		this.isRunning = false;
		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer);
			this.reconnectTimer = null;
		}
		if (this.pingTimer) {
			clearInterval(this.pingTimer);
			this.pingTimer = null;
		}
		if (this.ws) {
			try {
				this.ws.close(1000, "Клиент клиники остановлен");
			} catch (err) {
				const msg = `[CloudRelay] Error closing WebSocket on stop: ${String(err)}`;
				if (this.app?.log) this.app.log.debug(msg);
				else console.debug(msg);
			}
			this.ws = null;
		}
	}

	private connect(): void {
		if (!this.isRunning) return;

		const separator = this.config.relayUrl.includes("?") ? "&" : "?";
		const fullUrl = `${this.config.relayUrl}${separator}token=${encodeURIComponent(this.config.authToken)}&clinicId=${encodeURIComponent(this.config.clinicId)}`;

		try {
			this.ws = new WebSocket(fullUrl);

			this.ws.on("open", () => {
				this.reconnectAttempts = 0;
				this.missedPongs = 0;
				this.lastConnectedAt = Date.now();
				this.lastError = null;

				// Приветствие и регистрация клиники
				this.sendMessage({
					type: "EDGE_HELLO",
					clinicId: this.config.clinicId,
					appVersion: "0.1.0",
				});

				this.startHeartbeat();
			});

			this.ws.on("message", (raw: Buffer | string) => {
				this.handleMessage(raw.toString()).catch((err) => {
					this.lastError = String(err);
				});
			});

			this.ws.on("close", () => {
				this.stopHeartbeat();
				this.scheduleReconnect();
			});

			this.ws.on("error", (err: Error) => {
				this.lastError = err.message;
				if (this.ws) {
					try {
						this.ws.close();
					} catch (closeErr) {
						const msg = `[CloudRelay] Error closing WebSocket after error: ${String(closeErr)}`;
						if (this.app?.log) this.app.log.debug(msg);
						else console.debug(msg);
					}
				}
			});
		} catch (err: unknown) {
			this.lastError = (err as Error).message;
			this.scheduleReconnect();
		}
	}

	private startHeartbeat(): void {
		this.stopHeartbeat();
		this.missedPongs = 0;
		this.pingTimer = setInterval(() => {
			if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

			if (this.missedPongs >= 2) {
				// 4G Silent Deadlock: 2 пропущенных PONG подряд — обрыв полуоткрытого TCP сокета
				this.lastError = "HEARTBEAT_TIMEOUT: 2 consecutive missed PONGs from cloud relay";
				try {
					this.ws.terminate();
				} catch (termErr) {
					const msg = `[CloudRelay] Error terminating unresponsive WebSocket: ${String(termErr)}`;
					if (this.app?.log) this.app.log.warn(msg);
					else console.warn(msg);
				}
				return;
			}

			this.missedPongs++;
			this.sendMessage({ type: "PING", timestamp: Date.now() });
		}, this.config.pingIntervalMs ?? 20000);
	}

	private stopHeartbeat(): void {
		if (this.pingTimer) {
			clearInterval(this.pingTimer);
			this.pingTimer = null;
		}
	}

	private scheduleReconnect(): void {
		if (!this.isRunning) return;
		if (this.reconnectTimer) return;

		const initialMs = this.config.reconnectInitialMs ?? 1000;
		const maxMs = this.config.reconnectMaxMs ?? 30000;
		const delay = Math.min(initialMs * Math.pow(1.5, this.reconnectAttempts), maxMs) + randomInt(0, 500);

		this.reconnectAttempts++;

		this.reconnectTimer = setTimeout(() => {
			this.reconnectTimer = null;
			this.connect();
		}, delay);
	}

	private sendMessage(msg: Record<string, unknown>): void {
		if (this.ws && this.ws.readyState === WebSocket.OPEN) {
			this.ws.send(JSON.stringify(msg));
		}
	}

	private async handleMessage(rawText: string): Promise<void> {
		let message: Record<string, unknown>;
		try {
			message = JSON.parse(rawText) as Record<string, unknown>;
		} catch (_e) {
			return;
		}

		if (message.type === "PING") {
			this.sendMessage({ type: "PONG", timestamp: Date.now() });
			return;
		}

		if (message.type === "PONG") {
			this.missedPongs = 0;
			// Калибровка часов (CR2032 BIOS Clock Skew)
			if (typeof message.timestamp === "number") {
				const localNow = Date.now();
				const serverTime = message.timestamp;
				setNetworkClockSkewMs(serverTime - localNow);
			}
			return;
		}

		if (message.type === "HTTP_REQUEST") {
			const req = message as unknown as TunnelRequestPayload;
			await this.processTunnelRequest(req);
		}
	}

	private async processTunnelRequest(req: TunnelRequestPayload): Promise<void> {
		// Защита от SSRF: проверяем, что запрошенный путь входит в список разрешенных для лабораторий
		if (!isRouteAllowedForTunnel(req.url)) {
			const forbiddenResponse: TunnelResponsePayload = {
				type: "HTTP_RESPONSE",
				id: req.id,
				statusCode: 403,
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					error: "ForbiddenTunnelRoute",
					message:
						"Доступ через туннель разрешен только к порталу зуботехнической лаборатории.",
				}),
			};
			this.sendMessage(forbiddenResponse as unknown as Record<string, unknown>);
			return;
		}

		try {
			let statusCode = 500;
			let responseHeaders: Record<string, string> = { "content-type": "application/json" };
			let responseBody: string | null = null;
			let isBase64 = false;

			if (this.app) {
				// Прямое быстрое локальное внедрение в Fastify без сетевого сокета
				const injectOptions: {
					method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
					url: string;
					headers?: Record<string, string>;
					payload?: string | Buffer;
				} = {
					method: req.method as "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
					url: req.url,
					headers: req.headers,
				};

				if (req.body) {
					injectOptions.payload = req.isBase64
						? Buffer.from(req.body, "base64")
						: req.body;
				}

				const res = await this.app.inject(injectOptions);
				statusCode = res.statusCode;

				for (const [k, v] of Object.entries(res.headers)) {
					if (v !== undefined) {
						responseHeaders[k] = Array.isArray(v) ? v.join(", ") : String(v);
					}
				}

				responseBody = res.body;
			} else {
				// Запасной вариант через fetch на локальный порт
				const targetUrl = new URL(req.url, this.config.localBaseUrl || "http://127.0.0.1:3000").toString();
				const fetchOptions: RequestInit = {
					method: req.method,
					headers: req.headers,
				};

				if (req.body && req.method !== "GET" && req.method !== "HEAD") {
					fetchOptions.body = req.isBase64
						? Buffer.from(req.body, "base64")
						: req.body;
				}

				const res = await fetch(targetUrl, fetchOptions);
				statusCode = res.status;

				responseHeaders = {};
				res.headers.forEach((val, key) => {
					responseHeaders[key] = val;
				});

				const contentType = res.headers.get("content-type") || "";
				if (
					contentType.includes("image/") ||
					contentType.includes("octet-stream") ||
					contentType.includes("model/")
				) {
					const arrayBuffer = await res.arrayBuffer();
					responseBody = Buffer.from(arrayBuffer).toString("base64");
					isBase64 = true;
				} else {
					responseBody = await res.text();
				}
			}

			const reply: TunnelResponsePayload = {
				type: "HTTP_RESPONSE",
				id: req.id,
				statusCode,
				headers: responseHeaders,
				body: responseBody,
				isBase64,
			};

			this.sendMessage(reply as unknown as Record<string, unknown>);
		} catch (err: unknown) {
			const error = err as Error;
			const errorReply: TunnelResponsePayload = {
				type: "HTTP_RESPONSE",
				id: req.id,
				statusCode: 502,
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					error: "LocalExecutionError",
					message: `Ошибка обработки запроса локальным Fastify: ${error.message}`,
				}),
			};
			this.sendMessage(errorReply as unknown as Record<string, unknown>);
		}
	}
}

let activeClientInstance: CloudRelayClient | null = null;

export function getActiveCloudRelayClient(): CloudRelayClient | null {
	return activeClientInstance;
}

export function startCloudRelayClient(app?: FastifyInstance, configOverride?: Partial<CloudRelayConfig>): CloudRelayClient {
	if (activeClientInstance) {
		activeClientInstance.stop();
	}
	const baseConfig = loadCloudRelayConfigFromEnv();
	const config = { ...baseConfig, ...configOverride };
	activeClientInstance = new CloudRelayClient(config, app);
	activeClientInstance.start();
	return activeClientInstance;
}

export function stopCloudRelayClient(): void {
	if (activeClientInstance) {
		activeClientInstance.stop();
		activeClientInstance = null;
	}
}
