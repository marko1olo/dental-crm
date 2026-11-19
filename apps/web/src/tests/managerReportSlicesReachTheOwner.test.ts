/**
 * ТРИ РАЗРЕЗА ОТЧЁТОВ ДОХОДЯТ ДО ВЛАДЕЛЬЦА КЛИНИКИ, А НЕ ТОЛЬКО СЧИТАЮТСЯ.
 * SSOT: ExecutiveDashboard и канонические разрезы аналитики.
 *
 * Запуск (из apps/web):
 *   node --import tsx --import ./testCssStub.mjs --test \
 *     src/tests/managerReportSlicesReachTheOwner.test.ts
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import {
	fetchReceivablesDetail,
	fetchReportsSummary,
	fetchScheduleLoad,
	fetchServiceSales,
	sliceRefusalText,
} from "../components/analytics/analyticsSlicesApi.js";

const webSrc = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const SESSION_HEADERS = {
	"x-dente-admin-secret": "секрет-периметра",
	"x-dente-clinic-token": "токен-кабинета",
	"x-dente-staff-token": "токен-сотрудника",
};

const PERIOD = { from: "2026-07-01", to: "2026-07-31" } as const;
const LOOKS_LIKE_AN_INSTANT = /T\d{2}(:|%3A)\d{2}|\dZ|%2B\d{2}(:|%3A)\d{2}/;

type CapturedRequest = { url: string; headers: unknown };

async function captureRequests(
	browserZone: string,
	body: unknown,
	run: () => Promise<unknown>,
): Promise<CapturedRequest[]> {
	const realFetch = globalThis.fetch;
	const zoneWasSet = Object.hasOwn(process.env, "TZ");
	const previousZone = process.env.TZ;
	const captured: CapturedRequest[] = [];

	process.env.TZ = browserZone;
	globalThis.fetch = (async (input: unknown, init?: { headers?: unknown }) => {
		captured.push({
			url: typeof input === "string" ? input : String(input),
			headers: init === undefined ? undefined : init.headers,
		});
		return new Response(JSON.stringify(body), {
			status: 200,
			headers: { "content-type": "application/json" },
		});
	}) as typeof globalThis.fetch;

	try {
		await run();
	} finally {
		globalThis.fetch = realFetch;
		if (zoneWasSet && previousZone !== undefined) process.env.TZ = previousZone;
		else delete process.env.TZ;
	}
	return captured;
}

const emptyServices = {
	rows: [],
	plannedTotalRub: 0,
	discountTotalRub: 0,
	note: "",
	isEmpty: true,
};
const emptyReceivables = {
	rows: [],
	totalDebtRub: 0,
	byBucket: {},
	prepayments: [],
	totalPrepaidRub: 0,
	note: "",
	isEmpty: true,
};
const emptySchedule = {
	cells: [],
	busiestWeekday: null,
	busiestHour: null,
	isEmpty: true,
};

function withoutComments(source: string): string {
	return source
		.replace(/\/\*[\s\S]*?\*\//g, " ")
		.split(/\r?\n/)
		.filter((line) => !line.trimStart().startsWith("//"))
		.join("\n");
}

describe("разрезы отчётов управляющего доходят до владельца", () => {
	test("каждый разрез уходит на свой адрес, календарной датой и без пояса браузера", async () => {
		const asked = async (zone: string) => {
			const requests: CapturedRequest[] = [];
			requests.push(
				...(await captureRequests(zone, emptyServices, () =>
					fetchServiceSales(PERIOD, SESSION_HEADERS),
				)),
			);
			requests.push(
				...(await captureRequests(zone, emptyReceivables, () =>
					fetchReceivablesDetail(SESSION_HEADERS),
				)),
			);
			requests.push(
				...(await captureRequests(zone, emptySchedule, () =>
					fetchScheduleLoad(PERIOD, SESSION_HEADERS),
				)),
			);
			return requests.map((request) => request.url);
		};

		const fromMoscow = await asked("Europe/Moscow");
		assert.deepEqual(
			fromMoscow,
			[
				"/api/reports/services?from=2026-07-01&to=2026-07-31",
				"/api/reports/receivables",
				"/api/reports/schedule-load?from=2026-07-01&to=2026-07-31",
			],
			"адрес разреза изменился или запрос перестал уходить: владелец снова не увидит этот разрез",
		);

		assert.equal(fromMoscow[1], "/api/reports/receivables");

		for (const zone of ["Asia/Kamchatka", "America/New_York"]) {
			assert.deepEqual(
				await asked(zone),
				fromMoscow,
				`запрос зависит от пояса браузера (${zone}): границы периода снова считает браузер, а пояс клиники знает только сервер`,
			);
		}
		for (const url of fromMoscow) {
			assert.ok(
				!LOOKS_LIKE_AN_INSTANT.test(url),
				`в адрес вернулось мгновение вместо календарной даты: ${url}`,
			);
		}
	});

	test("каждый запрос несёт заголовки охраны — без них клиника получает 403", async () => {
		const requests: CapturedRequest[] = [
			...(await captureRequests("Europe/Moscow", emptyServices, () =>
				fetchServiceSales(PERIOD, SESSION_HEADERS),
			)),
			...(await captureRequests("Europe/Moscow", emptyReceivables, () =>
				fetchReceivablesDetail(SESSION_HEADERS),
			)),
			...(await captureRequests("Europe/Moscow", emptySchedule, () =>
				fetchScheduleLoad(PERIOD, SESSION_HEADERS),
			)),
			...(await captureRequests(
				"Europe/Moscow",
				{ period: { from: "", to: "" } },
				() =>
					fetchReportsSummary(
						{ ...PERIOD, granularity: "day" },
						SESSION_HEADERS,
					),
			)),
		];

		assert.equal(
			requests.length,
			4,
			"ушло не четыре запроса — состав разрезов изменился",
		);
		for (const request of requests) {
			assert.deepEqual(
				request.headers,
				SESSION_HEADERS,
				`${request.url}: запрос ушёл без заголовков сеанса. Охрана accessGuard отвечает на такой 403, ` +
					"и раздел выглядит пустым, а не сломанным — локально этого не видно, потому что в .env " +
					"включены лазейки для чтения.",
			);
		}
	});

	test("канонический пульт ExecutiveDashboard монтирует 3 ключевых экрана руководителя", () => {
		const execSource = withoutComments(
			readFileSync(
				path.join(webSrc, "components", "analytics", "ExecutiveDashboard.tsx"),
				"utf8",
			),
		);

		assert.match(
			execSource,
			/<ExecutiveFinancialSummary\s/,
			"ExecutiveDashboard не монтирует финансовый пульт ExecutiveFinancialSummary",
		);
		assert.match(
			execSource,
			/<DoctorPayrollReport\s/,
			"ExecutiveDashboard не монтирует ведомость начислений DoctorPayrollReport",
		);
		assert.match(
			execSource,
			/<ChairOccupancyReport\s/,
			"ExecutiveDashboard не монтирует загрузку кресел ChairOccupancyReport",
		);
	});

	test("отказ сервера показан по-русски, с причиной и следующим шагом", () => {
		const readable = sliceRefusalText(
			"Список должников",
			"Даты периода не разобраны.",
		);
		assert.match(readable, /Список должников не построен/);
		assert.match(readable, /Даты периода не разобраны/);
		assert.match(
			readable,
			/Обновить/,
			"в отказе нет следующего шага — это код ответа русскими словами",
		);

		const technical = sliceRefusalText(
			"Разрез по услугам",
			"TypeError: Failed to fetch",
		);
		assert.ok(
			!technical.includes("Failed to fetch"),
			"техническая строка ушла на экран владельцу",
		);
		assert.match(technical, /сервер отказал без объяснения/);
		assert.match(technical, /Обновить/);

		assert.match(
			sliceRefusalText("Разрез загрузки", null),
			/сервер отказал без объяснения/,
		);
	});

	test("точка входа владельца на месте: канонический ExecutiveDashboard смонтирован в разделе аналитики", () => {
		const analyticsSubDashboards = withoutComments(
			readFileSync(
				path.join(webSrc, "pages", "analyticsDashboard", "AnalyticsSubDashboards.tsx"),
				"utf8",
			),
		);
		assert.match(
			analyticsSubDashboards,
			/import\s*\{\s*ExecutiveDashboard\s*\}\s*from\s*["'].*ExecutiveDashboard["']/,
			"AnalyticsSubDashboards.tsx больше не импортирует канонический ExecutiveDashboard",
		);
		assert.match(
			analyticsSubDashboards,
			/<ExecutiveDashboard\s/,
			"канонический ExecutiveDashboard больше не отрисовывается в разделе аналитики",
		);
		assert.match(
			analyticsSubDashboards,
			/analyticsSection === "reports"/,
			"раздел reports не перенаправлен на канонический ExecutiveDashboard",
		);
	});
});
