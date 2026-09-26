import assert from "node:assert";
import { afterEach, beforeEach, describe, test } from "node:test";
import { WebSocket } from "ws";
import { RelayServer } from "../src/relayServer.js";
import type { TunnelHttpRequest, TunnelHttpResponse } from "../src/types.js";

describe("RelayServer (Cloud Relay & NAT Traversal)", () => {
	let server: RelayServer;
	let serverBaseUrl: string;
	const edgeSecret = "test-secret-edge-token-2026";
	const testClinicId = "clinic-spb-central";

	beforeEach(async () => {
		// Используем порт 0 для выделения свободного случайного порта операционной системой
		server = new RelayServer({
			port: 0,
			host: "127.0.0.1",
			edgeAuthToken: edgeSecret,
			defaultClinicId: testClinicId,
			requestTimeoutMs: 1500, // короткий таймаут для тестов
		});
		serverBaseUrl = await server.start();
	});

	afterEach(async () => {
		await server.stop();
	});

	test("GET /health возвращает статус шлюза и список подключенных клиник", async () => {
		const res = await fetch(`${serverBaseUrl}/health`);
		assert.strictEqual(res.status, 200);

		const data = (await res.json()) as {
			status: string;
			uptimeSeconds: number;
			connectedClinicsCount: number;
			connectedClinics: string[];
			activeRequestsCount: number;
		};

		assert.strictEqual(data.status, "degraded"); // без подключенных клиник
		assert.strictEqual(data.connectedClinicsCount, 0);
		assert.deepStrictEqual(data.connectedClinics, []);
		assert.strictEqual(data.activeRequestsCount, 0);
	});

	test("отклоняет подключение к /edge с неверным токеном (401 Unauthorized)", async () => {
		const wsUrl = `${serverBaseUrl.replace("http", "ws")}/edge?token=WRONG_TOKEN&clinicId=${testClinicId}`;

		await new Promise<void>((resolve, reject) => {
			const ws = new WebSocket(wsUrl);
			ws.on("open", () => {
				ws.close();
				reject(new Error("Подключение с неверным токеном не должно было открыться"));
			});
			ws.on("error", () => {
				// Ожидаемая ошибка подключения / 401
				resolve();
			});
			ws.on("unexpected-response", (_req, res) => {
				assert.strictEqual(res.statusCode, 401);
				resolve();
			});
		});
	});

	test("возвращает 503 Service Unavailable, если клиника офлайн", async () => {
		const res = await fetch(`${serverBaseUrl}/api/portal/lab-order/order-abc-123`);
		assert.strictEqual(res.status, 503);

		const body = (await res.json()) as { error: string; message: string; clinicId: string };
		assert.strictEqual(body.error, "ClinicOffline");
		assert.ok(body.message.includes("Локальный сервер клиники временно недоступен"));
		assert.strictEqual(body.clinicId, testClinicId);
	});

	test("успешно проксирует GET запрос зубного техника в подключенную клинику и возвращает ответ", async () => {
		const wsUrl = `${serverBaseUrl.replace("http", "ws")}/edge?token=${edgeSecret}&clinicId=${testClinicId}`;
		const edgeWs = new WebSocket(wsUrl);

		await new Promise<void>((resolve, reject) => {
			edgeWs.on("open", resolve);
			edgeWs.on("error", reject);
		});

		// Проверяем, что сервер видит подключение клиники
		assert.strictEqual(server.isClinicConnected(testClinicId), true);

		// Эмулируем обработку запроса локальным сервером клиники
		edgeWs.on("message", (raw) => {
			const msg = JSON.parse(raw.toString()) as TunnelHttpRequest;
			if (msg.type === "HTTP_REQUEST") {
				assert.strictEqual(msg.method, "GET");
				assert.ok(msg.url.includes("/api/portal/lab-order/token-xyz"));

				const reply: TunnelHttpResponse = {
					type: "HTTP_RESPONSE",
					id: msg.id,
					statusCode: 200,
					headers: {
						"content-type": "application/json",
						"x-clinic-source": "local-fastify",
					},
					body: JSON.stringify({
						orderId: "ord-777",
						patientName: "Иванов И.И.",
						toothFdi: "16",
						material: "ZrO2 Katana ML",
						status: "in_progress",
					}),
				};
				edgeWs.send(JSON.stringify(reply));
			}
		});

		// Зубной техник запрашивает портал через облачный шлюз
		const technicianRes = await fetch(`${serverBaseUrl}/api/portal/lab-order/token-xyz`);
		assert.strictEqual(technicianRes.status, 200);
		assert.strictEqual(technicianRes.headers.get("x-clinic-source"), "local-fastify");

		const orderData = (await technicianRes.json()) as {
			orderId: string;
			patientName: string;
			toothFdi: string;
			status: string;
		};
		assert.strictEqual(orderData.orderId, "ord-777");
		assert.strictEqual(orderData.patientName, "Иванов И.И.");
		assert.strictEqual(orderData.toothFdi, "16");
		assert.strictEqual(orderData.status, "in_progress");

		edgeWs.close();
	});

	test("успешно проксирует POST запрос зубного техника со сменяющимся статусом", async () => {
		const wsUrl = `${serverBaseUrl.replace("http", "ws")}/edge?token=${edgeSecret}&clinicId=${testClinicId}`;
		const edgeWs = new WebSocket(wsUrl);

		await new Promise<void>((resolve, reject) => {
			edgeWs.on("open", resolve);
			edgeWs.on("error", reject);
		});

		edgeWs.on("message", (raw) => {
			const msg = JSON.parse(raw.toString()) as TunnelHttpRequest;
			if (msg.type === "HTTP_REQUEST") {
				assert.strictEqual(msg.method, "POST");
				assert.ok(msg.url.includes("/api/portal/lab-order/token-xyz/status"));

				const parsedBody = JSON.parse(msg.body || "{}") as { status: string; labComments: string };
				assert.strictEqual(parsedBody.status, "shipped");
				assert.strictEqual(parsedBody.labComments, "Коронка отправлена курьером в клинику");

				const reply: TunnelHttpResponse = {
					type: "HTTP_RESPONSE",
					id: msg.id,
					statusCode: 200,
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ success: true, status: "shipped" }),
				};
				edgeWs.send(JSON.stringify(reply));
			}
		});

		const technicianRes = await fetch(`${serverBaseUrl}/api/portal/lab-order/token-xyz/status`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				status: "shipped",
				labComments: "Коронка отправлена курьером в клинику",
			}),
		});

		assert.strictEqual(technicianRes.status, 200);
		const resJson = (await technicianRes.json()) as { success: boolean; status: string };
		assert.strictEqual(resJson.success, true);
		assert.strictEqual(resJson.status, "shipped");

		edgeWs.close();
	});

	test("возвращает 504 Gateway Timeout, если локальный сервер клиники не ответил вовремя", async () => {
		const wsUrl = `${serverBaseUrl.replace("http", "ws")}/edge?token=${edgeSecret}&clinicId=${testClinicId}`;
		const edgeWs = new WebSocket(wsUrl);

		await new Promise<void>((resolve, reject) => {
			edgeWs.on("open", resolve);
			edgeWs.on("error", reject);
		});

		// Ничего не отвечаем на входящий запрос — эмулируем зависание локального сервера
		const res = await fetch(`${serverBaseUrl}/api/portal/lab-order/timeout-test`);
		assert.strictEqual(res.status, 504);

		const errBody = (await res.json()) as { error: string; message: string };
		assert.strictEqual(errBody.error, "GatewayTimeout");
		assert.ok(errBody.message.includes("Превышено время ожидания"));

		edgeWs.close();
	});
});
