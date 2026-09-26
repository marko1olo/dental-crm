import assert from "node:assert";
import type { IncomingMessage } from "node:http";
import { createServer, type Server } from "node:http";
import { afterEach, beforeEach, describe, test } from "node:test";
import Fastify from "fastify";
import { WebSocket, WebSocketServer } from "ws";
import {
	CloudRelayClient,
	getCalibratedNow,
	getNetworkClockSkewMs,
	isRouteAllowedForTunnel,
	setNetworkClockSkewMs,
	type TunnelRequestPayload,
	type TunnelResponsePayload,
} from "../cloudRelayClient.js";

describe("CloudRelayClient (Clinic Edge NAT Traversal)", () => {
	let httpServer: Server;
	let wss: WebSocketServer;
	let relayPort: number;
	let serverWs: WebSocket | null = null;
	let client: CloudRelayClient | null = null;

	const testSecret = "relay-secret-pass-2026";
	const testClinicId = "clinic-petrogradskaya";

	beforeEach(async () => {
		// Создаем mock облачного релея на локальном сервере
		httpServer = createServer();
		wss = new WebSocketServer({ noServer: true });

		httpServer.on("upgrade", (req: IncomingMessage, socket, head) => {
			const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
			const token = url.searchParams.get("token");

			if (token !== testSecret) {
				socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
				socket.destroy();
				return;
			}

			wss.handleUpgrade(req, socket, head, (ws) => {
				serverWs = ws;
				wss.emit("connection", ws, req);
			});
		});

		await new Promise<void>((resolve) => {
			httpServer.listen(0, "127.0.0.1", () => {
				const addr = httpServer.address();
				relayPort = typeof addr === "object" && addr ? addr.port : 0;
				resolve();
			});
		});
	});

	afterEach(async () => {
		if (client) {
			client.stop();
			client = null;
		}
		if (serverWs) {
			serverWs.close();
			serverWs = null;
		}
		wss.close();
		await new Promise<void>((resolve) => httpServer.close(() => resolve()));
	});

	describe("isRouteAllowedForTunnel (SSRF & Security Isolation)", () => {
		test("разрешает доступ только к порталу ЗТЛ и публичным пресетам", () => {
			assert.strictEqual(isRouteAllowedForTunnel("/api/portal/lab-order/token-123"), true);
			assert.strictEqual(isRouteAllowedForTunnel("/api/portal/lab-order/token-123/status"), true);
			assert.strictEqual(isRouteAllowedForTunnel("/api/portal/scans/upload"), true);
			assert.strictEqual(isRouteAllowedForTunnel("/api/clinical/dental-lab/presets"), true);
			assert.strictEqual(isRouteAllowedForTunnel("/health"), true);
		});

		test("строго блокирует доступ к внутренним клиническим, административным и финансовым роутам", () => {
			assert.strictEqual(isRouteAllowedForTunnel("/api/admin/users"), false);
			assert.strictEqual(isRouteAllowedForTunnel("/api/billing/payments"), false);
			assert.strictEqual(isRouteAllowedForTunnel("/api/patients"), false);
			assert.strictEqual(isRouteAllowedForTunnel("/api/clinical/odontogram"), false);
			assert.strictEqual(isRouteAllowedForTunnel("/api/settings/admin"), false);
		});

		test("0-Day SSRF: блокирует обход каталогов (Path Traversal / Directory Traversal)", () => {
			assert.strictEqual(isRouteAllowedForTunnel("/health/../../api/admin/users"), false);
			assert.strictEqual(isRouteAllowedForTunnel("/health/%2e%2e/api/admin/users"), false);
			assert.strictEqual(isRouteAllowedForTunnel("/health/%2e%2e/%2e%2e/api/admin/users"), false);
			assert.strictEqual(isRouteAllowedForTunnel("/api/portal/lab-order/../../api/admin/users"), false);
			assert.strictEqual(isRouteAllowedForTunnel("/api/portal/scans/../../system/passwd"), false);
			assert.strictEqual(isRouteAllowedForTunnel("/api/portal/mock-storage/../.."), false);
			assert.strictEqual(isRouteAllowedForTunnel("/health/evil"), false);
			assert.strictEqual(isRouteAllowedForTunnel("/api/clinical/dental-lab/presets/evil"), false);
			assert.strictEqual(isRouteAllowedForTunnel("//api/admin/users"), false);
			assert.strictEqual(isRouteAllowedForTunnel("malformed%XX/test"), false);
		});
	});

	describe("Подключение и Heartbeat", () => {
		test("успешно подключается к релею и отправляет EDGE_HELLO", async () => {
			let receivedHello = false;

			const helloPromise = new Promise<void>((resolve) => {
				wss.on("connection", (ws) => {
					ws.on("message", (raw) => {
						const msg = JSON.parse(raw.toString()) as { type: string; clinicId: string };
						if (msg.type === "EDGE_HELLO" && msg.clinicId === testClinicId) {
							receivedHello = true;
							resolve();
						}
					});
				});
			});

			client = new CloudRelayClient({
				enabled: true,
				relayUrl: `ws://127.0.0.1:${relayPort}/edge`,
				authToken: testSecret,
				clinicId: testClinicId,
				reconnectInitialMs: 100,
			});

			client.start();

			await helloPromise;
			assert.strictEqual(receivedHello, true);
			assert.strictEqual(client.getStatus().isConnected, true);
		});

		test("отвечает PONG на входящий PING от релея", async () => {
			client = new CloudRelayClient({
				enabled: true,
				relayUrl: `ws://127.0.0.1:${relayPort}/edge`,
				authToken: testSecret,
				clinicId: testClinicId,
			});

			client.start();

			const ws = await new Promise<WebSocket>((resolve) => {
				wss.on("connection", (socket) => resolve(socket));
			});

			const pongPromise = new Promise<boolean>((resolve) => {
				ws.on("message", (raw) => {
					const msg = JSON.parse(raw.toString()) as { type: string };
					if (msg.type === "PONG") {
						resolve(true);
					}
				});
			});

			ws.send(JSON.stringify({ type: "PING", timestamp: Date.now() }));
			const gotPong = await pongPromise;
			assert.strictEqual(gotPong, true);
		});

		test("4G Silent Deadlock: обрывает зависший сокет (terminate) после 2 пропущенных PONG", async () => {
			client = new CloudRelayClient({
				enabled: true,
				relayUrl: `ws://127.0.0.1:${relayPort}/edge`,
				authToken: testSecret,
				clinicId: testClinicId,
				pingIntervalMs: 50,
			});

			client.start();

			await new Promise<WebSocket>((resolve) => {
				wss.on("connection", (socket) => resolve(socket));
			});

			// Сервер намеренно НЕ шлет PONG на входящие PING от клиента
			// Ждем 2 интервала пинга + запас (180мс)
			await new Promise((r) => setTimeout(r, 180));

			const status = client.getStatus();
			assert.ok(
				status.lastError?.includes("HEARTBEAT_TIMEOUT: 2 consecutive missed PONGs"),
				`Ожидалась ошибка HEARTBEAT_TIMEOUT, получено: ${status.lastError}`,
			);
		});

		test("CR2032 BIOS Clock Skew: калибрует сетевое смещение времени при получении PONG с timestamp", async () => {
			setNetworkClockSkewMs(0);
			assert.strictEqual(getNetworkClockSkewMs(), 0);

			client = new CloudRelayClient({
				enabled: true,
				relayUrl: `ws://127.0.0.1:${relayPort}/edge`,
				authToken: testSecret,
				clinicId: testClinicId,
			});

			client.start();

			const ws = await new Promise<WebSocket>((resolve) => {
				wss.on("connection", (socket) => resolve(socket));
			});

			// Сервер шлет PONG с опережающим временем (+2 часа)
			const simulatedServerTime = Date.now() + 7200000;
			ws.send(JSON.stringify({ type: "PONG", timestamp: simulatedServerTime }));

			// Ждем 50мс на обработку PONG клиентом
			await new Promise((r) => setTimeout(r, 50));

			const skew = getNetworkClockSkewMs();
			assert.ok(Math.abs(skew - 7200000) < 1000, `Смещение должно быть ~7200000 мс, получено: ${skew}`);

			const calibratedNow = getCalibratedNow();
			const diff = calibratedNow.getTime() - Date.now();
			assert.ok(Math.abs(diff - 7200000) < 1000, `Откалиброванное время должно опережать локальное на ~2 часа`);
		});
	});

	describe("Обработка туннелированных запросов Fastify", () => {
		test("выполняет локальный Fastify инжект и отправляет HTTP_RESPONSE", async () => {
			const mockFastify = Fastify({ logger: false });

			mockFastify.get("/api/portal/lab-order/:token", async (req, reply) => {
				const params = req.params as { token: string };
				return reply.status(200).send({
					orderId: "ord-888",
					token: params.token,
					toothFdi: "24",
					material: "e.max Press",
				});
			});

			client = new CloudRelayClient(
				{
					enabled: true,
					relayUrl: `ws://127.0.0.1:${relayPort}/edge`,
					authToken: testSecret,
					clinicId: testClinicId,
				},
				mockFastify,
			);

			client.start();

			const ws = await new Promise<WebSocket>((resolve) => {
				wss.on("connection", (socket) => resolve(socket));
			});

			const responsePromise = new Promise<TunnelResponsePayload>((resolve) => {
				ws.on("message", (raw) => {
					const msg = JSON.parse(raw.toString()) as TunnelResponsePayload;
					if (msg.type === "HTTP_RESPONSE" && msg.id === "req-101") {
						resolve(msg);
					}
				});
			});

			const testRequest: TunnelRequestPayload = {
				type: "HTTP_REQUEST",
				id: "req-101",
				clinicId: testClinicId,
				method: "GET",
				url: "/api/portal/lab-order/valid-technician-token",
				headers: { accept: "application/json" },
			};

			ws.send(JSON.stringify(testRequest));
			const response = await responsePromise;

			assert.strictEqual(response.statusCode, 200);
			const bodyObj = JSON.parse(response.body || "{}") as { orderId: string; toothFdi: string };
			assert.strictEqual(bodyObj.orderId, "ord-888");
			assert.strictEqual(bodyObj.toothFdi, "24");

			await mockFastify.close();
		});

		test("блокирует попытку доступа к запрещенному роуту с кодом 403 Forbidden", async () => {
			client = new CloudRelayClient({
				enabled: true,
				relayUrl: `ws://127.0.0.1:${relayPort}/edge`,
				authToken: testSecret,
				clinicId: testClinicId,
			});

			client.start();

			const ws = await new Promise<WebSocket>((resolve) => {
				wss.on("connection", (socket) => resolve(socket));
			});

			const forbiddenPromise = new Promise<TunnelResponsePayload>((resolve) => {
				ws.on("message", (raw) => {
					const msg = JSON.parse(raw.toString()) as TunnelResponsePayload;
					if (msg.type === "HTTP_RESPONSE" && msg.id === "attack-req") {
						resolve(msg);
					}
				});
			});

			// Попытка дернуть административный роут через туннель
			ws.send(
				JSON.stringify({
					type: "HTTP_REQUEST",
					id: "attack-req",
					clinicId: testClinicId,
					method: "GET",
					url: "/api/admin/financial-ledger",
					headers: {},
				}),
			);

			const reply = await forbiddenPromise;
			assert.strictEqual(reply.statusCode, 403);
			assert.ok(reply.body?.includes("ForbiddenTunnelRoute"));
		});

		test("0-Day SSRF: блокирует обход пути (/health/../../api/admin/users) в туннеле с кодом 403 Forbidden", async () => {
			client = new CloudRelayClient({
				enabled: true,
				relayUrl: `ws://127.0.0.1:${relayPort}/edge`,
				authToken: testSecret,
				clinicId: testClinicId,
			});

			client.start();

			const ws = await new Promise<WebSocket>((resolve) => {
				wss.on("connection", (socket) => resolve(socket));
			});

			const forbiddenPromise = new Promise<TunnelResponsePayload>((resolve) => {
				ws.on("message", (raw) => {
					const msg = JSON.parse(raw.toString()) as TunnelResponsePayload;
					if (msg.type === "HTTP_RESPONSE" && msg.id === "traversal-attack-req") {
						resolve(msg);
					}
				});
			});

			// Попытка 0-day SSRF через относительный путь
			ws.send(
				JSON.stringify({
					type: "HTTP_REQUEST",
					id: "traversal-attack-req",
					clinicId: testClinicId,
					method: "GET",
					url: "/health/../../api/admin/users",
					headers: {},
				}),
			);

			const reply = await forbiddenPromise;
			assert.strictEqual(reply.statusCode, 403);
			assert.ok(reply.body?.includes("ForbiddenTunnelRoute"));
		});
	});
});
