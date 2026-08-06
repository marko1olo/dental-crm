/**
 * contract-breach-proofs.test.ts — ДОКАЗАТЕЛЬСТВА КОНТРАКТА «фронт зовёт ↔ сервер отвечает».
 *
 * ЧТО ЗДЕСЬ УТВЕРЖДАЕТСЯ И ПОЧЕМУ ИМЕННО ТАК.
 *
 * Первая редакция этого файла утверждала `statusCode === 404`, то есть была
 * ЗЕЛЁНОЙ, пока дефект жив, и краснела в момент починки. Это ловушка для
 * следующего: тест требовал, чтобы функция оставалась сломанной, и CI покраснел
 * бы на правильной работе. Полярность здесь исправлена — утверждается КОНТРАКТ:
 *
 *     адрес, который зовёт интерфейс, ОБЯЗАН обслуживаться сервером.
 *
 * То есть «ответ не 404 от отсутствия маршрута». Такая форма переживает починку:
 * сегодня она падает (маршрута нет), после реализации проходит, и переписывать
 * её не нужно.
 *
 * ПОЧЕМУ ИЗВЕСТНО-ОТСУТСТВУЮЩИЕ ПОМЕЧЕНЫ `todo`. Восемь маршрутов не существуют,
 * и реализовать их одной ходкой нельзя. Красный набор, который никто не может
 * починить сегодня, приучает игнорировать вывод — поэтому они помечены `todo`:
 * `node:test` не валит на них прогон, НО в момент, когда маршрут появится,
 * печатает отдельную строку о прошедшем `todo`-тесте. Это ровно тот сигнал,
 * который нужен: долг назван поимённо, снижение видно, рост виден тоже.
 * `skip` здесь хуже: он молчит и о долге, и о починке.
 *
 * ПОЧЕМУ ТЕЛО ЗАПРОСА ВСЕГДА ЗАДАНО. Измерено на этом файле: `POST` с
 * `content-type: application/json` и БЕЗ тела даёт 400
 * (`FST_ERR_CTP_EMPTY_JSON_BODY`) от разборщика тела — ДО маршрутизации, для
 * любого адреса, существующего или нет. Такое измерение о существовании
 * маршрута не говорит ничего. Поэтому тело задано везде, где задан заголовок.
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import type { InjectOptions } from "fastify";
import { createDenteApiApp } from "../server.js";
import { routeNotFoundMessage } from "../utils/routeNotFound.js";

/** Приложение без фоновых воркеров: нужна только таблица маршрутов. */
async function realApp() {
	return createDenteApiApp({
		startTelegramWorker: false,
		startCommunicationWorker: false,
		startMigrationWorker: false,
	});
}

/**
 * Отсутствие маршрута отличается от отказа охранника ТОЛЬКО так.
 *
 * Fastify на несовпадении и пути, и метода отвечает 404 с телом
 * `{"message":"Route POST:/api/x not found","error":"Not Found","statusCode":404}`.
 * Охранник тоже может ответить 404 (например, «запись не найдена»), но его тело
 * несёт доменный `error`, а не `Not Found` с текстом «Route … not found».
 * Различать обязательно: иначе тест примет отказ охранника за отсутствие
 * маршрута и наоборот.
 */
function routeIsUnserved(response: { statusCode: number; body: string }) {
	if (response.statusCode !== 404) return false;
	try {
		const parsed = JSON.parse(response.body) as { error?: unknown; message?: unknown };
		return parsed.error === "RouteNotFound" && parsed.message === routeNotFoundMessage;
	} catch {
		return false;
	}
}

async function assertRouteIsServed(
	method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
	url: string,
	payload?: Record<string, unknown>,
) {
	const app = await realApp();
	try {
		/*
		 * Опции собираются ОДНИМ объявленным объектом, а не условным спредом в
		 * аргументе. При `exactOptionalPropertyTypes: true` спред давал
		 * `payload?: {} | null`, что не сходится с `InjectPayload`, перегрузка
		 * `inject` разрешалась в цепочечную (`Chain`), и `response.statusCode`
		 * переставал существовать. Тип — не украшение: без него тест собирал
		 * цепочку вместо ответа и не проверял ничего.
		 */
		const options: InjectOptions = { method, url };
		if (payload !== undefined) {
			options.headers = { "content-type": "application/json" };
			options.payload = payload;
		}
		const response = await app.inject(options);
		assert.ok(
			!routeIsUnserved(response),
			`${method} ${url} не обслуживается сервером: ответ ${response.statusCode}, тело ${response.body.slice(0, 200)}. ` +
				"Этот адрес зовёт интерфейс, значит пользователь получает 404 на нажатие кнопки. " +
				"Отказ охранника (401/403) или доменный 404 этот тест ПРОХОДИТ — проверяется существование маршрута, а не доступ.",
		);
	} finally {
		await app.close();
	}
}

/* ═══ (A) МАРШРУТА НЕТ, А ФУНКЦИЯ НУЖНА ═══════════════════════════════════════
 *
 * У каждого адреса ниже есть и вызывающий в интерфейсе, и таблица в схеме базы.
 * Помечены `todo` до реализации — см. заголовок файла.
 */

test(
	"(A) POST /api/egisz/send — выгрузка в ЕГИСЗ, зовёт EgiszMonitor.tsx:164, таблица egisz_logs есть",
	{ todo: "маршрут не реализован; EgiszMonitor смонтирован в VisitOdontogramTab.tsx:139" },
	async () => {
		await assertRouteIsServed("POST", "/api/egisz/send", { patientId: "x", visitId: "x" });
	},
);

test(
	"(A) GET /api/integrations/egisz-blank-permissions — зовёт EgiszBlankPermissionsWidget.tsx:105, таблица egisz_blank_permissions есть",
	{ todo: "маршрут не реализован; виджет смонтирован в SettingsView.tsx:1945" },
	async () => {
		await assertRouteIsServed("GET", "/api/integrations/egisz-blank-permissions");
	},
);

test(
	"(A) GET /api/integrations/yandex-calendar-syncs — зовёт YandexCalendarSyncsWidget.tsx:260, таблица yandex_calendar_syncs есть",
	{ todo: "маршрут не реализован; виджет смонтирован в SettingsView.tsx:1946" },
	async () => {
		await assertRouteIsServed("GET", "/api/integrations/yandex-calendar-syncs");
	},
);

test(
	"(A) GET /api/clinic/workflows — зовёт SettingsBpmnTab.tsx:39",
	{ todo: "маршрут не реализован; вкладка смонтирована в SettingsView.tsx:1861, таблицы clinic_workflows в схеме НЕТ — нужна миграция" },
	async () => {
		await assertRouteIsServed("GET", "/api/clinic/workflows");
	},
);

test(
	"(A) POST /api/clinic/workflows/:id/toggle — зовёт SettingsBpmnTab.tsx:77",
	{ todo: "маршрут не реализован; ИЗМЕРЕНО: прежний 400 давал разборщик тела на пустом теле, а не маршрут" },
	async () => {
		await assertRouteIsServed("POST", "/api/clinic/workflows/00000000-0000-0000-0000-000000000000/toggle", {});
	},
);

test(
	"(A) DELETE /api/clinic/workflows/:id — зовёт SettingsBpmnTab.tsx:114",
	{ todo: "маршрут не реализован" },
	async () => {
		await assertRouteIsServed("DELETE", "/api/clinic/workflows/00000000-0000-0000-0000-000000000000");
	},
);

test(
	"(A) POST /api/clinic/workflows — зовёт SettingsBpmnTab.tsx:144",
	{ todo: "маршрут не реализован" },
	async () => {
		await assertRouteIsServed("POST", "/api/clinic/workflows", { name: "x", definition: "{}" });
	},
);

test(
	"(A) POST /api/ai/visit-flow — зовёт useVisitLogic.ts:1059, оркестратор ai/visitFlowOrchestrator.ts есть",
	{ todo: "маршрут не реализован при существующем оркестраторе" },
	async () => {
		await assertRouteIsServed("POST", "/api/ai/visit-flow", {});
	},
);

/* ═══ (C) МАРШРУТ ЕСТЬ, МЕТОД БЫЛ НАПИСАН ИНАЧЕ ══════════════════════════════
 *
 * Интерфейс звал PUT, сервер объявляет PATCH (communicationsOutbox.ts:276).
 * Правлен ФРОНТ: у серверного PATCH есть другие живые клиенты, а менять метод
 * работающего маршрута значит сломать их.
 */

test("(C) PATCH /api/communications/templates/:id обслуживается — метод, которым теперь зовёт интерфейс", async () => {
	await assertRouteIsServed(
		"PATCH",
		"/api/communications/templates/00000000-0000-0000-0000-000000000000",
		{ name: "x" },
	);
});

test("(C) PUT на тот же адрес НЕ обслуживается — доказательство, что прежний вызов уходил в никуда", async () => {
	const app = await realApp();
	try {
		const response = await app.inject({
			method: "PUT",
			url: "/api/communications/templates/00000000-0000-0000-0000-000000000000",
			headers: { "content-type": "application/json" },
			payload: { name: "x" },
		});
		assert.ok(
			routeIsUnserved(response),
			`PUT обязан быть необслуженным: сервер держит только PATCH. Получено ${response.statusCode}, тело ${response.body.slice(0, 300)}. ` +
				"Если PUT вдруг обслуживается, кто-то добавил его на сервере, и правку фронта надо пересмотреть.",
		);
	} finally {
		await app.close();
	}
});

test("(C) PUT /api/communications/settings ЗАКОННЫЙ — соседний PUT в том же файле фронта трогать было нельзя", async () => {
	await assertRouteIsServed("PUT", "/api/communications/settings", {});
});

/* ═══ (D) ЛОЖНЫЕ СРАБАТЫВАНИЯ ПЕРЕПИСИ ═══════════════════════════════════════
 *
 * Эти адреса перепись назвала мёртвыми, а они живые. Тесты закрепляют разбор:
 * префикс плагина и динамический сегмент действия — не дефекты.
 */

test("(D) GET /api/inventory/:orgId/rules/:serviceId живой — перепись слепа на префикс плагина", async () => {
	await assertRouteIsServed("GET", "/api/inventory/00000000-0000-0000-0000-000000000000/rules/00000000-0000-0000-0000-000000000000");
});

test("(D) POST /api/communications/outbox/:id/cancel живой — интерфейс зовёт его через переменную действия", async () => {
	await assertRouteIsServed("POST", "/api/communications/outbox/00000000-0000-0000-0000-000000000000/cancel", {});
});

test("(D) POST /api/documents/:id/sign живой — интерфейс зовёт его через переменную действия", async () => {
	await assertRouteIsServed("POST", "/api/documents/00000000-0000-0000-0000-000000000000/sign", {});
});
