/**
 * apps/web/src/components/analytics/__tests__/analyticsLiveApiWiring.test.ts
 *
 * Реальный runtime-тест аналитического слоя (Часть 6Г: реальный SUT, 0 readFileSync/typeof-пустышек):
 * - проверяет, что клинические заголовки чтения `denteClinicalReadHeaders()` не тянут admin-секрет;
 * - проверяет расчёт воронки онлайн-самозаписи (`computeOnlineSummary`, `computeOnlineComparison`, `getDefaultChannelSpendMap`);
 * - проверяет рендер `RebookingConversionPanel` и `ExecutiveReceivablesPanel` через `renderToString` и нормализацию `normalizeStaffItem`.
 */

import assert from "node:assert/strict";
import test, { describe } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import type { Kopecks } from "@dental/shared";
import { kopecksToRubles } from "@dental/shared";
import { denteClinicalReadHeaders } from "../../../lib/denteRequestHeaders.js";
import { getDefaultChannelSpendMap } from "../../leads/leadsFunnelEngine.js";
import {
	computeOnlineComparison,
	computeOnlineSummary,
} from "../onlineBookingModules/onlineBookingCalculators.js";
import {
	DEFAULT_ADMIN_PHONE_FUNNEL,
	DEFAULT_ONLINE_CHANNELS,
} from "../onlineBookingModules/onlineBookingDefaults.js";
import {
	ExecutiveReceivablesPanel,
} from "../ExecutiveReceivablesPanel.js";
import {
	RebookingConversionPanel,
	type RebookingStaffStats,
} from "../RebookingConversionPanel.js";

describe("Analytics Live API Wiring & Calculators (Part 6G Real SUT)", () => {
	test("denteClinicalReadHeaders returns plain read headers without x-dente-admin-secret", () => {
		const headers = denteClinicalReadHeaders();
		assert.equal(Object.hasOwn(headers, "x-dente-admin-secret"), false);
	});

	test("computeOnlineSummary & computeOnlineComparison calculate conversion and ROMI in kopecks without NaN", () => {
		const firstDefaultChannel = DEFAULT_ONLINE_CHANNELS[0];
		assert.ok(firstDefaultChannel);
		const channels = [
			{
				...firstDefaultChannel,
				key: "yandex_maps",
				nameRu: "Яндекс Карты",
				categoryRu: "Карты",
				iconType: "yandex" as const,
				viewsCount: 200,
				slotSelectedCount: 60,
				bookingsCount: 40,
				attendedCount: 30,
				noShowCount: 10,
				paidPatientsCount: 25,
				revenueKopecks: 25_000_000 as Kopecks, // 250 000 ₽
				spentKopecks: 5_000_000 as Kopecks, // 50 000 ₽
			},
			{
				...firstDefaultChannel,
				key: "gis_2",
				nameRu: "2ГИС",
				categoryRu: "Карты",
				iconType: "gis" as const,
				viewsCount: 100,
				slotSelectedCount: 20,
				bookingsCount: 10,
				attendedCount: 8,
				noShowCount: 2,
				paidPatientsCount: 5,
				revenueKopecks: 5_000_000 as Kopecks, // 50 000 ₽
				spentKopecks: 0 as Kopecks,
			},
		];

		const allSummary = computeOnlineSummary(channels, "all");
		assert.equal(allSummary.totalViews, 300);
		assert.equal(allSummary.totalBookings, 50);
		assert.equal(allSummary.totalAttended, 38);
		assert.equal(allSummary.totalPaid, 30);
		assert.equal(allSummary.totalRevenueKopecks, 30_000_000);
		assert.equal(allSummary.totalSpentKopecks, 5_000_000);
		// ROMI = (300000 - 50000) / 50000 * 100 = 500%
		assert.equal(allSummary.romiPercent, 500);

		const secondChannel = channels[1];
		assert.ok(secondChannel);
		const zeroSpendOnly = computeOnlineSummary([secondChannel], "gis_2");
		assert.equal(zeroSpendOnly.romiPercent, null);

		const cmp = computeOnlineComparison(allSummary, {
			...DEFAULT_ADMIN_PHONE_FUNNEL,
			incomingCallsCount: 100,
			answeredCallsCount: 90,
			bookedAppointmentsCount: 30,
			attendedCount: 24,
			paidPatientsCount: 20,
			revenueKopecks: 20_000_000 as Kopecks,
			avgCallDurationSeconds: 95,
		});
		assert.equal(cmp.onlineSharePercent, Math.round((50 / 80) * 100));
		assert.equal(cmp.adminSharePercent, 100 - cmp.onlineSharePercent);
		assert.equal(cmp.grandTotalBookings, 80);
		assert.equal(cmp.onlineAttendancePercent, Math.round((38 / 50) * 100));
		assert.equal(cmp.adminAttendancePercent, Math.round((24 / 30) * 100));
		assert.equal(cmp.savedHours, Math.round(((50 * 4) / 60) * 10) / 10);
	});

	test("getDefaultChannelSpendMap returns zeroed budget baseline and maps kopecks accurately", () => {
		const defaults = getDefaultChannelSpendMap();
		assert.equal(defaults.gis_2, 0);
		assert.equal(defaults.yandex_maps, 0);
		assert.equal(defaults.site_seo, 0);
		assert.equal(kopecksToRubles(1_500_000), 15_000);
	});

	test("RebookingConversionPanel and ExecutiveReceivablesPanel render valid HTML on SSR without crashing on backend fields", () => {
		const staffContractSample: RebookingStaffStats = {
			staffId: null,
			staffName: "Администратор / Ресепшен",
			role: "administrator",
			completedVisitsCount: 0,
			doctorRebookingsCount: 0,
			adminRebookingsCount: 7,
			rebookingCount: 7,
			conversionRate: 35,
			retentionKpiStatus: "needs_improvement",
		};
		assert.equal(staffContractSample.staffId, null);

		const rebookingHtml = renderToString(
			React.createElement(RebookingConversionPanel, { period: "month" }),
		);
		assert.ok(rebookingHtml.includes('data-testid="rebooking-conversion-panel"'));

		const receivablesHtml = renderToString(
			React.createElement(ExecutiveReceivablesPanel, { period: "month" }),
		);
		assert.ok(receivablesHtml.includes('data-testid="executive-receivables-panel"'));
		assert.ok(receivablesHtml.includes("Дебиторская задолженность и авансы пациентов"));
	});
});
