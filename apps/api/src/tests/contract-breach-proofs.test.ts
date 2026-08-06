/**
 * contract-breach-proofs.test.ts — HTTP-докази розходжень API між фронтом і сервером
 *
 * Кожен тест доводить існування дефекту ВИМІРЮВАННЯМ: app.inject() на живому сервері.
 * Структура: ДО (404/405) → виправлення → ПІСЛЯ (200/201).
 *
 * Відповідає звіту: API_DISCREPANCY_REPORT.md
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { createDenteApiApp } from "../server.js";

/**
 * КАТЕГОРІЯ A: Маршрут потрібен — фронт кличе, сервер не реалізував
 * Критичність: ВИСОКА (призводить до 404 у production)
 */

test("A1. POST /api/visits/quick — фронт кличе (useAppLogic.tsx:13904), сервера немає", async () => {
	const app = await createDenteApiApp({ skipMigrationWorker: true });

	const response = await app.inject({
		method: "POST",
		url: "/api/visits/quick",
		headers: {
			"content-type": "application/json",
			// Заголовки auth додамо після реалізації guard
		},
		payload: {},
	});

	// ДО виправлення: очікуємо 404
	assert.equal(
		response.statusCode,
		404,
		`ДО: POST /api/visits/quick має повертати 404, бо маршрут не реалізований. ` +
		`Отримано: ${response.statusCode}. Якщо це 200, дефект УЖЕ виправлено.`
	);

	await app.close();
});

test("A2. POST /api/egisz/send — фронт кличе (EgiszMonitor.tsx:164), сервера немає", async () => {
	const app = await createDenteApiApp({ skipMigrationWorker: true });

	const response = await app.inject({
		method: "POST",
		url: "/api/egisz/send",
		headers: { "content-type": "application/json" },
		payload: { patientId: "test", visitId: "test" },
	});

	assert.equal(
		response.statusCode,
		404,
		`ДО: POST /api/egisz/send має повертати 404. Отримано: ${response.statusCode}`
	);

	await app.close();
});

test("A3. GET /api/integrations/egisz-blank-permissions — фронт кличе, сервера немає", async () => {
	const app = await createDenteApiApp({ skipMigrationWorker: true });

	const response = await app.inject({
		method: "GET",
		url: "/api/integrations/egisz-blank-permissions",
	});

	assert.equal(
		response.statusCode,
		404,
		`ДО: GET /api/integrations/egisz-blank-permissions має повертати 404. Отримано: ${response.statusCode}`
	);

	await app.close();
});

test("A4. GET /api/integrations/yandex-calendar-syncs — фронт кличе, сервера немає", async () => {
	const app = await createDenteApiApp({ skipMigrationWorker: true });

	const response = await app.inject({
		method: "GET",
		url: "/api/integrations/yandex-calendar-syncs",
	});

	assert.equal(
		response.statusCode,
		404,
		`ДО: GET /api/integrations/yandex-calendar-syncs має повертати 404. Отримано: ${response.statusCode}`
	);

	await app.close();
});

test("A5. GET /api/clinic/workflows — фронт кличе (SettingsBpmnTab.tsx:39), сервера немає", async () => {
	const app = await createDenteApiApp({ skipMigrationWorker: true });

	const response = await app.inject({
		method: "GET",
		url: "/api/clinic/workflows",
	});

	assert.equal(
		response.statusCode,
		404,
		`ДО: GET /api/clinic/workflows має повертати 404. Отримано: ${response.statusCode}`
	);

	await app.close();
});

test("A6. POST /api/clinic/workflows/:id/toggle — фронт кличе, сервера немає", async () => {
	const app = await createDenteApiApp({ skipMigrationWorker: true });

	const response = await app.inject({
		method: "POST",
		url: "/api/clinic/workflows/test-workflow-id/toggle",
		headers: { "content-type": "application/json" },
	});

	assert.equal(
		response.statusCode,
		404,
		`ДО: POST /api/clinic/workflows/:id/toggle має повертати 404. Отримано: ${response.statusCode}`
	);

	await app.close();
});

test("A7. DELETE /api/clinic/workflows/:id — фронт кличе, сервера немає", async () => {
	const app = await createDenteApiApp({ skipMigrationWorker: true });

	const response = await app.inject({
		method: "DELETE",
		url: "/api/clinic/workflows/test-workflow-id",
	});

	assert.equal(
		response.statusCode,
		404,
		`ДО: DELETE /api/clinic/workflows/:id має повертати 404. Отримано: ${response.statusCode}`
	);

	await app.close();
});

test("A8. POST /api/clinic/workflows — фронт кличе, сервера немає", async () => {
	const app = await createDenteApiApp({ skipMigrationWorker: true });

	const response = await app.inject({
		method: "POST",
		url: "/api/clinic/workflows",
		headers: { "content-type": "application/json" },
		payload: { name: "test", definition: "{}" },
	});

	assert.equal(
		response.statusCode,
		404,
		`ДО: POST /api/clinic/workflows має повертати 404. Отримано: ${response.statusCode}`
	);

	await app.close();
});

test("A9. POST /api/ai/visit-flow — фронт кличе (useVisitLogic.ts:1059), сервера немає", async () => {
	const app = await createDenteApiApp({ skipMigrationWorker: true });

	const response = await app.inject({
		method: "POST",
		url: "/api/ai/visit-flow",
		headers: { "content-type": "application/json" },
		payload: {},
	});

	assert.equal(
		response.statusCode,
		404,
		`ДО: POST /api/ai/visit-flow має повертати 404. Отримано: ${response.statusCode}`
	);

	await app.close();
});

/**
 * КАТЕГОРІЯ C: Розбіжність HTTP-методу
 * Критичність: СЕРЕДНЯ (405 Method Not Allowed)
 */

test("C1. PUT vs PATCH на /api/communications/templates/:id — фронт PUT, сервер PATCH", async () => {
	const app = await createDenteApiApp({ skipMigrationWorker: true });

	// Фронт відправляє PUT (useCommunicationsQueries.ts:18)
	const putResponse = await app.inject({
		method: "PUT",
		url: "/api/communications/templates/test-template-id",
		headers: { "content-type": "application/json" },
		payload: { name: "test" },
	});

	// Сервер очікує PATCH (communicationsOutbox.ts:276)
	const patchResponse = await app.inject({
		method: "PATCH",
		url: "/api/communications/templates/test-template-id",
		headers: { "content-type": "application/json" },
		payload: { name: "test" },
	});

	// ДО виправлення: PUT має давати 404/405, PATCH працює
	assert.ok(
		putResponse.statusCode === 404 || putResponse.statusCode === 405,
		`ДО: PUT має давати 404/405, отримано: ${putResponse.statusCode}. ` +
		`Якщо 200, дефект УЖЕ виправлено на сервері замість фронту.`
	);

	// PATCH має працювати (може бути 401 через auth, але не 404/405)
	assert.ok(
		patchResponse.statusCode !== 404 && patchResponse.statusCode !== 405,
		`PATCH має існувати (401/403 OK, але не 404/405). Отримано: ${patchResponse.statusCode}`
	);

	await app.close();
});

/**
 * КАТЕГОРІЯ D: Хибно-позитивні знахідки (інформаційні)
 * Ці маршрути ІСНУЮТЬ, census їх просто не розпізнав через префікси плагінів
 * або динамічні параметри action. Тести підтверджують, що вони працюють.
 */

test("D1. GET /api/inventory/:orgId/rules/:serviceId — ІСНУЄ (хибно-позитивна знахідка census)", async () => {
	const app = await createDenteApiApp({ skipMigrationWorker: true });

	const response = await app.inject({
		method: "GET",
		url: "/api/inventory/test-org/rules/test-service",
	});

	// Маршрут існує, може бути 401/403/404 (немає даних), але НЕ 404 від відсутності маршрута
	// Fastify 404 має body.error === 'Not Found', а наш 404 — інший error
	const notRouteMissing = response.statusCode !== 404 ||
		(response.json() as any)?.error !== "Not Found";

	assert.ok(
		notRouteMissing,
		`Маршрут має існувати. Якщо 404 з error="Not Found", він зник.`
	);

	await app.close();
});

test("D3. POST /api/communications/outbox/:id/cancel — ІСНУЄ як конкретний маршрут", async () => {
	const app = await createDenteApiApp({ skipMigrationWorker: true });

	const response = await app.inject({
		method: "POST",
		url: "/api/communications/outbox/test-id/cancel",
		headers: { "content-type": "application/json" },
	});

	const notRouteMissing = response.statusCode !== 404 ||
		(response.json() as any)?.error !== "Not Found";

	assert.ok(
		notRouteMissing,
		`Маршрут має існувати (фронт викликає через action-параметр).`
	);

	await app.close();
});

test("D5. POST /api/documents/:id/sign — ІСНУЄ як конкретний маршрут", async () => {
	const app = await createDenteApiApp({ skipMigrationWorker: true });

	const response = await app.inject({
		method: "POST",
		url: "/api/documents/test-doc-id/sign",
		headers: { "content-type": "application/json" },
	});

	const notRouteMissing = response.statusCode !== 404 ||
		(response.json() as any)?.error !== "Not Found";

	assert.ok(
		notRouteMissing,
		`Маршрут має існувати (фронт викликає через action-параметр).`
	);

	await app.close();
});
