import crypto from "node:crypto";
import type { IncomingMessage } from "node:http";
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from "fastify";
import { WebSocket, WebSocketServer } from "ws";
import type {
	PendingRequest,
	RelayHealthStatus,
	RelayServerOptions,
	TunnelHttpRequest,
	TunnelHttpResponse,
	TunnelMessage,
} from "./types.js";

/** Заголовки уровня соединения (hop-by-hop), которые нельзя проксировать */
const HOP_BY_HOP_HEADERS = new Set([
	"connection",
	"keep-alive",
	"proxy-authenticate",
	"proxy-authorization",
	"te",
	"trailer",
	"transfer-encoding",
	"upgrade",
	"host",
]);

export class RelayServer {
	private readonly app: FastifyInstance;
	private wss: WebSocketServer | null = null;
	private readonly edgeSockets = new Map<string, WebSocket>();
	private readonly pendingRequests = new Map<string, PendingRequest>();
	private readonly options: Required<RelayServerOptions>;
	private readonly startTime = Date.now();
	private isRunning = false;

	constructor(options: RelayServerOptions) {
		this.options = {
			port: options.port ?? 4050,
			host: options.host ?? "0.0.0.0",
			edgeAuthToken: options.edgeAuthToken,
			defaultClinicId: options.defaultClinicId ?? "default-clinic",
			requestTimeoutMs: options.requestTimeoutMs ?? 30000,
			maxPayloadBytes: options.maxPayloadBytes ?? 10 * 1024 * 1024,
		};

		this.app = Fastify({
			logger: false,
			bodyLimit: this.options.maxPayloadBytes,
		});

		this.setupRoutes();
	}

	public getFastifyApp(): FastifyInstance {
		return this.app;
	}

	public getConnectedClinics(): string[] {
		return Array.from(this.edgeSockets.keys());
	}

	public isClinicConnected(clinicId?: string): boolean {
		const target = clinicId || this.options.defaultClinicId;
		const ws = this.edgeSockets.get(target);
		return Boolean(ws && ws.readyState === WebSocket.OPEN);
	}

	private setupRoutes(): void {
		// 1. Health-check шлюза
		this.app.get("/health", async (_req: FastifyRequest, reply: FastifyReply) => {
			const connected = this.getConnectedClinics();
			const status: RelayHealthStatus = {
				status: connected.length > 0 ? "ok" : "degraded",
				uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000),
				connectedClinicsCount: connected.length,
				connectedClinics: connected,
				activeRequestsCount: this.pendingRequests.size,
			};
			return reply.status(200).send(status);
		});

		// 2. Обработка всех остальных входящих HTTP-запросов (зубные техники, лаборатории)
		this.app.all("/*", async (req: FastifyRequest, reply: FastifyReply) => {
			// Пропускаем технические пути
			if (req.url === "/health" || req.url.startsWith("/edge")) {
				return;
			}

			// Определяем ID клиники: query -> header -> default
			const query = req.query as Record<string, string> | undefined;
			const clinicId =
				query?.clinicId ||
				(req.headers["x-clinic-id"] as string) ||
				this.options.defaultClinicId;

			const edgeSocket = this.edgeSockets.get(clinicId);
			if (!edgeSocket || edgeSocket.readyState !== WebSocket.OPEN) {
				return reply.status(503).send({
					error: "ClinicOffline",
					message:
						"Локальный сервер клиники временно недоступен (обрыв интернет-соединения). Запрос не может быть доставлен.",
					clinicId,
				});
			}

			// Формируем уникальный ID запроса
			const requestId = crypto.randomUUID();

			// Копируем и фильтруем заголовки
			const forwardedHeaders: Record<string, string> = {};
			for (const [k, v] of Object.entries(req.headers)) {
				if (v !== undefined && !HOP_BY_HOP_HEADERS.has(k.toLowerCase())) {
					forwardedHeaders[k.toLowerCase()] = Array.isArray(v) ? v.join(", ") : String(v);
				}
			}
			forwardedHeaders["x-forwarded-for"] = req.ip;
			forwardedHeaders["x-forwarded-proto"] = req.protocol;
			forwardedHeaders["x-relay-request-id"] = requestId;

			// Подготовка тела
			let bodyStr: string | null = null;
			let isBase64 = false;

			if (req.body !== undefined && req.body !== null) {
				if (Buffer.isBuffer(req.body)) {
					bodyStr = req.body.toString("base64");
					isBase64 = true;
				} else if (typeof req.body === "string") {
					bodyStr = req.body;
				} else {
					bodyStr = JSON.stringify(req.body);
				}
			}

			const tunnelReq: TunnelHttpRequest = {
				type: "HTTP_REQUEST",
				id: requestId,
				clinicId,
				method: req.method,
				url: req.raw.url || req.url,
				headers: forwardedHeaders,
				body: bodyStr,
				isBase64,
			};

			try {
				const response = await this.dispatchTunnelRequest(edgeSocket, tunnelReq);

				// Передаем заголовки ответа обратно
				if (response.headers) {
					for (const [hk, hv] of Object.entries(response.headers)) {
						if (!HOP_BY_HOP_HEADERS.has(hk.toLowerCase())) {
							reply.header(hk, hv);
						}
					}
				}

				reply.status(response.statusCode);

				if (!response.body) {
					return reply.send();
				}

				if (response.isBase64) {
					const buffer = Buffer.from(response.body, "base64");
					return reply.send(buffer);
				}

				return reply.send(response.body);
			} catch (err: unknown) {
				const error = err as Error;
				if (error.message === "TIMEOUT") {
					return reply.status(504).send({
						error: "GatewayTimeout",
						message:
							"Превышено время ожидания ответа от локального сервера клиники (Таймаут 30 сек).",
					});
				}
				if (error.message === "DISCONNECTED") {
					return reply.status(503).send({
						error: "ClinicDisconnected",
						message:
							"Связь с локальным сервером клиники оборвалась во время обработки запроса.",
					});
				}
				return reply.status(502).send({
					error: "BadGateway",
					message: `Ошибка туннелирования: ${error.message}`,
				});
			}
		});
	}

	private dispatchTunnelRequest(
		ws: WebSocket,
		request: TunnelHttpRequest,
	): Promise<TunnelHttpResponse> {
		return new Promise((resolve, reject) => {
			const timer = setTimeout(() => {
				this.pendingRequests.delete(request.id);
				reject(new Error("TIMEOUT"));
			}, this.options.requestTimeoutMs);

			this.pendingRequests.set(request.id, {
				id: request.id,
				clinicId: request.clinicId,
				resolve,
				reject,
				timer,
				startedAt: Date.now(),
				method: request.method,
				url: request.url,
			});

			try {
				ws.send(JSON.stringify(request));
			} catch (sendErr) {
				clearTimeout(timer);
				this.pendingRequests.delete(request.id);
				reject(sendErr);
			}
		});
	}

	public async start(): Promise<string> {
		await this.app.listen({ port: this.options.port, host: this.options.host });
		this.isRunning = true;

		// Создаем WebSocketServer, привязанный к HTTP-серверу Fastify
		this.wss = new WebSocketServer({
			noServer: true,
			maxPayload: this.options.maxPayloadBytes,
		});

		const rawServer = this.app.server;

		rawServer.on("upgrade", (request: IncomingMessage, socket, head) => {
			const url = new URL(request.url || "/", `http://${request.headers.host || "localhost"}`);

			if (url.pathname === "/edge") {
				// Аутентификация исходящего подключения из клиники
				const token =
					url.searchParams.get("token") ||
					request.headers["x-edge-token"] ||
					(request.headers.authorization?.startsWith("Bearer ")
						? request.headers.authorization.slice(7)
						: null);

				if (!token || token !== this.options.edgeAuthToken) {
					socket.write("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n");
					socket.destroy();
					return;
				}

				const clinicId = url.searchParams.get("clinicId") || this.options.defaultClinicId;

				this.wss?.handleUpgrade(request, socket, head, (ws) => {
					this.handleEdgeConnection(ws, clinicId);
				});
			} else {
				socket.destroy();
			}
		});

		const address = rawServer.address();
		const resolvedPort = typeof address === "object" && address ? address.port : this.options.port;
		return `http://${this.options.host}:${resolvedPort}`;
	}

	private handleEdgeConnection(ws: WebSocket, clinicId: string): void {
		// Если старое соединение этой клиники уже есть — закрываем его
		const existing = this.edgeSockets.get(clinicId);
		if (existing && existing.readyState === WebSocket.OPEN) {
			existing.close(1000, "Новое подключение клиники вытеснило предыдущее");
		}

		this.edgeSockets.set(clinicId, ws);

		ws.on("message", (raw: Buffer | string) => {
			try {
				const str = raw.toString();
				const msg = JSON.parse(str) as TunnelMessage;

				if (msg.type === "PONG") {
					// Heartbeat подтверждение
					return;
				}

				if (msg.type === "PING") {
					// Ответ на пинг от клиники
					ws.send(JSON.stringify({ type: "PONG", timestamp: Date.now() }));
					return;
				}

				if (msg.type === "HTTP_RESPONSE") {
					const pending = this.pendingRequests.get(msg.id);
					if (pending) {
						clearTimeout(pending.timer);
						this.pendingRequests.delete(msg.id);
						pending.resolve(msg);
					}
					return;
				}

				if (msg.type === "EDGE_HELLO") {
					// Приветствие и регистрация версии локального Fastify
					return;
				}
			} catch (_e) {
				// Игнорируем некорректный JSON
			}
		});

		ws.on("close", () => {
			if (this.edgeSockets.get(clinicId) === ws) {
				this.edgeSockets.delete(clinicId);
			}
			// Отклоняем только незавершенные запросы ЭТОЙ клиники, не затрагивая остальные
			for (const [id, pending] of this.pendingRequests.entries()) {
				if (pending.clinicId === clinicId) {
					clearTimeout(pending.timer);
					this.pendingRequests.delete(id);
					pending.reject(new Error("DISCONNECTED"));
				}
			}
		});

		ws.on("error", () => {
			ws.close();
		});

		// Отправляем приветственное подтверждение
		ws.send(JSON.stringify({ type: "PONG", timestamp: Date.now() }));
	}

	public async stop(): Promise<void> {
		this.isRunning = false;

		// Отклоняем все ожидающие запросы
		for (const [id, pending] of this.pendingRequests.entries()) {
			clearTimeout(pending.timer);
			this.pendingRequests.delete(id);
			pending.reject(new Error("SERVER_STOPPED"));
		}

		// Закрываем сокеты клиник
		for (const ws of this.edgeSockets.values()) {
			try {
				ws.close(1001, "Шлюз выключается");
			} catch (_e) {}
		}
		this.edgeSockets.clear();

		if (this.wss) {
			this.wss.close();
			this.wss = null;
		}

		await this.app.close();
	}
}
