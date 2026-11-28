/**
 * apps/web/src/components/analytics/__tests__/analyticsSSOTSuite.test.tsx (6G Live SUT)
 */

import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import {
	ANALYTICS_PERIOD_OPTIONS,
	createEmptyAnalyticsState,
	exportAnalyticsToCsv,
	fetchClinicAnalyticsSSOT,
	formatKopecksToRubles,
	getOccupancyStatus,
	getRebookingStatus,
} from "../analyticsCatalogData.js";
import { ExecutiveAnalyticsStudioModal } from "../ExecutiveAnalyticsStudioModal.js";
import * as AnalyticsBarrel from "../index.js";
import { setRuntimeDemoMode } from "../../../lib/demoMode.js";
import { resolveClinicRoute } from "../../../router/routeResolver";

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

test("1.4. createEmptyAnalyticsState возвращает честные нули без синтетических фальсификаций", () => {
	for (const opt of ANALYTICS_PERIOD_OPTIONS) {
		const data = createEmptyAnalyticsState(opt.key);
		assert.equal(data.period, opt.key);
		assert.equal(data.revenueKopecks, 0, "Empty state revenue must be exactly 0");
		assert.equal(data.averageCheckKopecks, 0, "Empty state average check must be 0");
		assert.equal(data.completedVisitsCount, 0, "Empty state visits must be 0");
		assert.equal(data.isEmpty, true, "Must flag isEmpty = true");

		const pb = data.paymentBreakdown;
		const sumMethods = pb.cashKopecks + pb.cardDmsKopecks + pb.sbpKopecks + pb.depositKopecks;
		assert.equal(sumMethods, 0, "Payment methods sum must strictly equal 0");
	}
});

test("1.5. [ANL-01] fetchClinicAnalyticsSSOT: ошибка сети выбрасывает исключение в проде и честный пустой стейт в демо", async () => {
	const originalFetch = globalThis.fetch;
	globalThis.fetch = (() => Promise.reject(new Error("Network offline"))) as typeof fetch;

	try {
		setRuntimeDemoMode(false);
		await assert.rejects(
			async () => {
				await fetchClinicAnalyticsSSOT("month");
			},
			{ message: "Network offline" },
			"In production mode, network error must throw to show retry banner",
		);

		setRuntimeDemoMode(true);
		const demoData = await fetchClinicAnalyticsSSOT("month");
		assert.ok(demoData, "Data must be returned in demo mode");
		assert.equal(demoData.isEmpty, true, "Empty state must be flagged isEmpty = true");
		assert.equal(demoData.revenueKopecks, 0, "Empty state revenue must be 0");
	} finally {
		setRuntimeDemoMode(null);
		globalThis.fetch = originalFetch;
	}
});

test("1.6. exportAnalyticsToCsv формирует валидный CSV с UTF-8 BOM и корректными секциями", () => {
	let blobContent = "";
	let downloadAttr = "";

	const prevBlob = globalThis.Blob;
	const prevUrl = globalThis.URL;
	const prevWindow = (globalThis as { window?: unknown }).window;
	const prevDocument = (globalThis as { document?: unknown }).document;

	class MockBlob {
		constructor(parts: BlobPart[]) {
			blobContent = parts.map((p) => String(p)).join("");
		}
	}

	(globalThis as { Blob: unknown }).Blob = MockBlob;
	(globalThis as { URL: unknown }).URL = {
		createObjectURL: () => "blob:test",
		revokeObjectURL: () => {},
	};
	(globalThis as { window?: unknown }).window = globalThis;
	(globalThis as { document?: unknown }).document = {
		createElement: () => ({
			setAttribute: (k: string, v: string) => {
				if (k === "download") downloadAttr = v;
			},
			click: () => {},
		}),
		body: {
			appendChild: () => {},
			removeChild: () => {},
		},
	};

	try {
		const emptyState = createEmptyAnalyticsState("month");
		exportAnalyticsToCsv(emptyState);

		assert.ok(blobContent.startsWith("\uFEFF"), "CSV must start with UTF-8 BOM");
		assert.ok(blobContent.includes("Управленческая аналитика"), "Must contain header");
		assert.ok(blobContent.includes("Структура оплат (касса)"), "Must contain payment section");
		assert.ok(blobContent.includes("Рейтинг врачей клиники"), "Must contain doctors rating");
		assert.ok(downloadAttr.includes("Dente_Analytics_month_"), "File name must include period");
	} finally {
		globalThis.Blob = prevBlob;
		globalThis.URL = prevUrl;
		(globalThis as { window?: unknown }).window = prevWindow;
		(globalThis as { document?: unknown }).document = prevDocument;
	}
});

test("2.1. ExecutiveAnalyticsStudioModal: Ровно 1 Primary CTA кнопка, 3 KPI карточки, 44x44 закрытие и 0 disabled кнопок", () => {
	const closedHtml = renderToStaticMarkup(
		React.createElement(ExecutiveAnalyticsStudioModal, {
			isOpen: false,
			onClose: () => {},
		}),
	);
	assert.equal(closedHtml, "");

	const html = renderToStaticMarkup(
		React.createElement(ExecutiveAnalyticsStudioModal, {
			isOpen: true,
			onClose: () => {},
			initialPeriod: "month",
		}),
	);

	const primaryButtons = html.match(/class="[^"]*primary-button[^"]*"/g) ?? [];
	assert.equal(primaryButtons.length, 1, "Must render strictly ONE primary-button CTA");
	assert.ok(primaryButtons[0]?.includes("bg-[var(--primary)]"));
	assert.ok(html.includes('data-testid="studio-primary-export-btn"'));

	assert.ok(html.includes('data-testid="kpi-card-revenue"'));
	assert.ok(html.includes('data-testid="kpi-card-chairs"'));
	assert.ok(html.includes('data-testid="kpi-card-average-check"'));
	assert.equal(html.includes('disabled=""'), false);

	assert.ok(html.includes('data-testid="studio-modal-close-btn"'));
	assert.ok(html.includes("min-h-[44px] min-w-[44px]"));
});

test("3.1. resolveClinicRoute & analytics barrel export: Реагирует на #executive-studio / #analytics и экспортирует SSOT", () => {
	assert.equal(resolveClinicRoute("", "#executive-studio").view, "analytics");
	assert.equal(resolveClinicRoute("", "#analytics").view, "analytics");
	assert.equal(resolveClinicRoute("?studio=analytics", "").view, "analytics");
	assert.equal(resolveClinicRoute("", "#executive-studio").studio, null);
	assert.strictEqual(AnalyticsBarrel.ExecutiveAnalyticsStudioModal, ExecutiveAnalyticsStudioModal);
	assert.strictEqual(AnalyticsBarrel.fetchClinicAnalyticsSSOT, fetchClinicAnalyticsSSOT);
});
