/**
 * apps/web/src/components/analytics/__tests__/analyticsSSOTSuite.test.tsx
 *
 * Исчерпывающий тестовый набор управленческой аналитики и SSOT кассы 54-ФЗ.
 * Проверяет:
 * 1. Целочисленный расчет выручки и кассы без float-погрешностей.
 * 2. Загрузку кресел (норма 65–85%) и Recall.
 * 3. Детерминизм данных и отсутствие псевдонаучных моков/синусоид.
 * 4. Экспорт CSV с UTF-8 BOM.
 * 5. Ровно 1 Primary CTA кнопку #0d9488 на экране студии (Мандат 8am).
 * 6. Монтирование в живой UI: StandaloneLaunchers.tsx & AppShell.tsx (Мандат 8aq).
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
	ANALYTICS_PERIOD_OPTIONS,
	createDeterministicAnalyticsFallback,
	exportAnalyticsToCsv,
	fetchClinicAnalyticsSSOT,
	formatKopecksToRubles,
	getOccupancyStatus,
	getRebookingStatus,
} from "../analyticsCatalogData.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const analyticsDir = path.resolve(__dirname, "..");
const webSrcRoot = path.resolve(__dirname, "../../..");

test("1.1. formatKopecksToRubles преобразует целочисленные копейки в рубли с разделителем", () => {
	assert.equal(formatKopecksToRubles(0), "0 ₽");
	assert.equal(formatKopecksToRubles(100), "1 ₽");
	assert.match(formatKopecksToRubles(14500000), /145\s?000\s?₽/);
	assert.match(formatKopecksToRubles(362500000), /3\s?625\s?000\s?₽/);
});

test("1.2. getOccupancyStatus строго соблюдает стоматологическую норму 65–85%", () => {
	assert.equal(getOccupancyStatus(0), "low");
	assert.equal(getOccupancyStatus(64), "low");
	assert.equal(getOccupancyStatus(65), "optimal");
	assert.equal(getOccupancyStatus(75), "optimal");
	assert.equal(getOccupancyStatus(85), "optimal");
	assert.equal(getOccupancyStatus(86), "high");
	assert.equal(getOccupancyStatus(100), "high");
});

test("1.3. getRebookingStatus соблюдает целевой уровень повторной явки (Recall >= 70%)", () => {
	assert.equal(getRebookingStatus(40), "critical");
	assert.equal(getRebookingStatus(49), "critical");
	assert.equal(getRebookingStatus(50), "warning");
	assert.equal(getRebookingStatus(69), "warning");
	assert.equal(getRebookingStatus(70), "healthy");
	assert.equal(getRebookingStatus(85), "healthy");
});

test("1.4. createDeterministicAnalyticsFallback обеспечивает строгий баланс кассы и детерминизм", () => {
	for (const opt of ANALYTICS_PERIOD_OPTIONS) {
		const data = createDeterministicAnalyticsFallback(opt.key);
		assert.equal(data.period, opt.key);
		assert.ok(data.revenueKopecks > 0, "Revenue must be > 0");
		assert.ok(data.averageCheckKopecks > 0, "Average check must be > 0");
		assert.ok(data.completedVisitsCount > 0, "Visits must be > 0");
		assert.equal(data.totalChairsCount, 2, "Small clinic chairs must be 2");

		// Проверка кассового баланса: сумма способов оплат равна общей выручке
		const pb = data.paymentBreakdown;
		const sumMethods = pb.cashKopecks + pb.cardDmsKopecks + pb.sbpKopecks + pb.depositKopecks;
		assert.equal(sumMethods, data.revenueKopecks, "Payment methods sum must strictly equal total revenue");

		// Проверка процентов
		const sumPct = pb.methods.reduce((acc, m) => acc + m.percent, 0);
		assert.equal(sumPct, 100, "Payment percentages must sum to 100%");

		// Проверка детерминизма: два последовательных вызова возвращают одинаковые цифры
		const repeatData = createDeterministicAnalyticsFallback(opt.key);
		assert.equal(repeatData.revenueKopecks, data.revenueKopecks);
		assert.equal(repeatData.chairOccupancyPercent, data.chairOccupancyPercent);
	}
});

test("1.5. fetchClinicAnalyticsSSOT безопасно возвращает детерминированный fallback при сбое сети", async () => {
	const originalFetch = globalThis.fetch;
	(globalThis as any).fetch = () => Promise.reject(new Error("Network offline"));

	try {
		const data = await fetchClinicAnalyticsSSOT("month");
		assert.ok(data, "Data must be returned");
		assert.ok(data.revenueKopecks > 0, "Fallback revenue must be positive");
		assert.equal(data.isLiveApi, false, "Fallback must flag isLiveApi = false");
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test("1.6. exportAnalyticsToCsv формирует валидный CSV с UTF-8 BOM и корректными секциями", () => {
	let blobContent = "";
	let downloadAttr = "";

	(globalThis as any).Blob = class MockBlob {
		constructor(parts: string[]) {
			blobContent = parts.join("");
		}
	};
	(globalThis as any).URL = {
		createObjectURL: () => "blob:test",
		revokeObjectURL: () => {},
	};

	const originalWindow = (globalThis as any).window;
	(globalThis as any).window = globalThis;
	const originalDocument = globalThis.document;
	(globalThis as any).document = {
		createElement: (tag: string) => {
			return {
				setAttribute: (k: string, v: string) => {
					if (k === "download") downloadAttr = v;
				},
				click: () => {},
			};
		},
		body: {
			appendChild: () => {},
			removeChild: () => {},
		},
	};

	try {
		const fallback = createDeterministicAnalyticsFallback("month");
		exportAnalyticsToCsv(fallback);

		assert.ok(blobContent.startsWith("\uFEFF"), "CSV must start with UTF-8 BOM");
		assert.ok(blobContent.includes("DENTE CRM — УПРАВЛЕНЧЕСКАЯ АНАЛИТИКА"), "Must contain header");
		assert.ok(blobContent.includes("СТРУКТУРА ОПЛАТ (КАССА 54-ФЗ)"), "Must contain payment section");
		assert.ok(blobContent.includes("РЕЙТИНГ ВРАЧЕЙ КЛИНИКИ"), "Must contain doctors rating");
		assert.ok(downloadAttr.includes("Dente_Analytics_month_"), "File name must include period");
	} finally {
		(globalThis as any).window = originalWindow;
		globalThis.document = originalDocument;
	}
});

test("2.1. ExecutiveAnalyticsStudioModal: Ровно 1 Primary CTA кнопка #0d9488 на видимый экран (Мандат 8am)", () => {
	const modalPath = path.join(analyticsDir, "ExecutiveAnalyticsStudioModal.tsx");
	const code = readFileSync(modalPath, "utf8");

	// Ищем класс primary-button
	const primaryMatches = code.match(/className=["'][^"']*primary-button[^"']*["']/g) || [];
	assert.equal(primaryMatches.length, 1, "Must contain exactly ONE primary-button CTA");
	assert.ok(primaryMatches[0].includes("bg-[var(--teal,#0d9488)]"), "Primary button must use brand teal #0d9488");
	assert.ok(code.includes('data-testid="studio-primary-export-btn"'), "Primary button must have testid");
});

test("2.2. ExecutiveAnalyticsStudioModal: 3 доминантных KPI карточки и автономия врача (Мандат 8e)", () => {
	const modalPath = path.join(analyticsDir, "ExecutiveAnalyticsStudioModal.tsx");
	const code = readFileSync(modalPath, "utf8");

	assert.ok(code.includes('data-testid="kpi-card-revenue"'), "Revenue KPI card exists");
	assert.ok(code.includes('data-testid="kpi-card-chairs"'), "Chairs occupancy KPI card exists");
	assert.ok(code.includes('data-testid="kpi-card-average-check"'), "Average check & Recall KPI card exists");

	// Проверка Мандата 8e: кнопки никогда не disabled
	assert.ok(!code.includes("disabled={"), "No artificial button disabling permitted (Doctor Autonomy Mandate 8e)");
});

test("2.3. ExecutiveAnalyticsStudioModal: Сенсорный минимум закрытия >= 44x44px по Apple HIG", () => {
	const modalPath = path.join(analyticsDir, "ExecutiveAnalyticsStudioModal.tsx");
	const code = readFileSync(modalPath, "utf8");

	assert.ok(code.includes("min-h-[44px] min-w-[44px]"), "Close button must have 44x44px touch target on mobile");
	assert.ok(code.includes('data-testid="studio-modal-close-btn"'), "Close button must have testid");
});

test("3.1. DirectAnalyticsLauncher: Реагирует на hash #analytics, #dashboard, #executive-studio", () => {
	const launcherPath = path.join(analyticsDir, "DirectAnalyticsLauncher.tsx");
	const code = readFileSync(launcherPath, "utf8");

	assert.ok(code.includes('h === "#analytics"'), "Listens for #analytics");
	assert.ok(code.includes('h === "#dashboard"'), "Listens for #dashboard");
	assert.ok(code.includes('h === "#executive-studio"'), "Listens for #executive-studio");
	assert.ok(code.includes("dente-open-analytics"), "Listens for dente-open-analytics event");
	assert.ok(code.includes("dente:open-analytics"), "Listens for dente:open-analytics event");
});

test("3.2. DirectAnalyticsLauncher смонтирован в StandaloneLaunchers.tsx (Мандат 8aq)", () => {
	const launchersPath = path.join(
		webSrcRoot,
		"components/appLayout/modalsContainerModules/StandaloneLaunchers.tsx",
	);
	const code = readFileSync(launchersPath, "utf8");

	assert.ok(code.includes('from "../../analytics/DirectAnalyticsLauncher"'), "Must import DirectAnalyticsLauncher");
	assert.ok(code.includes("<DirectAnalyticsLauncher />"), "Must render DirectAnalyticsLauncher");
	assert.ok(code.includes('#analytics"'), "Must handle #analytics route");
	assert.ok(code.includes('#dashboard"'), "Must handle #dashboard route");
});

test("3.3. DirectAnalyticsLauncher смонтирован в AppShell.tsx (Мандат 8aq)", () => {
	const shellPath = path.join(webSrcRoot, "AppShell.tsx");
	const code = readFileSync(shellPath, "utf8");

	assert.ok(code.includes('from "./components/analytics/DirectAnalyticsLauncher"'), "Must import DirectAnalyticsLauncher");
	assert.ok(code.includes("<DirectAnalyticsLauncher />"), "Must render DirectAnalyticsLauncher");
});

test("3.4. index.ts реэкспортирует SSOT данные, Студию и Лаунчер", () => {
	const indexPath = path.join(analyticsDir, "index.ts");
	const code = readFileSync(indexPath, "utf8");

	assert.ok(code.includes('export * from "./analyticsCatalogData"'), "Exports analyticsCatalogData");
	assert.ok(code.includes('export * from "./ExecutiveAnalyticsStudioModal"'), "Exports ExecutiveAnalyticsStudioModal");
	assert.ok(code.includes('export * from "./DirectAnalyticsLauncher"'), "Exports DirectAnalyticsLauncher");
});
