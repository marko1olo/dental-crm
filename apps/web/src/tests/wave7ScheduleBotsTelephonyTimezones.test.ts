import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
	extractWallTimePartsInTimeZone,
	getPeriodStartInTimeZone,
	shiftCalendarDay,
	todayDateKeyInTimeZone,
	tomorrowDateKeyInTimeZone,
	wallClockToUtcInTimeZone,
} from "@dental/shared";
import { ScheduleOptionsMenu } from "../components/schedule/toolbarModules/ScheduleOptionsMenu";
import { ScheduleMobileFilterChips } from "../components/schedule/mobile/ScheduleMobileFilterChips";
import { mapReservationsToMaintenanceBlocks } from "../components/schedule/grid/useScheduleTimeReservations";
import { launchMarketingCampaign } from "../components/marketing/launchCampaignService";
import { MarketingCampaignLaunchSection } from "../components/marketing/MarketingCampaignLaunchSection";

describe("Wave 7 Schedule, Bots, Telephony & Timezones Web Regression Suite", () => {
	it("1. Timezone calendar helpers resolve clinic day across UTC midnight boundary without OS TZ drift", () => {
		// 2026-06-30T15:30:00Z === 2026-07-01 01:30 in Asia/Vladivostok (UTC+10)
		const instant = new Date("2026-06-30T15:30:00.000Z");
		assert.equal(todayDateKeyInTimeZone("Asia/Vladivostok", instant), "2026-07-01");
		assert.equal(tomorrowDateKeyInTimeZone("Asia/Vladivostok", instant), "2026-07-02");
		assert.equal(todayDateKeyInTimeZone("Europe/Moscow", instant), "2026-06-30");
		assert.equal(shiftCalendarDay("2026-07-01", -1), "2026-06-30");

		const utcInstant = wallClockToUtcInTimeZone("2026-07-01", 9, 30, "Asia/Vladivostok");
		assert.ok(utcInstant);
		assert.equal(utcInstant.toISOString(), "2026-06-30T23:30:00.000Z");

		const wall = extractWallTimePartsInTimeZone(utcInstant, "Asia/Vladivostok");
		assert.deepEqual(wall, { dateKey: "2026-07-01", hours: 9, minutes: 30, hm: "09:30", weekday: 3 });

		const monthStart = getPeriodStartInTimeZone("month", "Asia/Vladivostok", instant);
		assert.equal(monthStart.toISOString(), "2026-06-30T14:00:00.000Z");
	});

	it("2. mapReservationsToMaintenanceBlocks expands 'Все кресла' across all chairs for QuickBooking slot finder", () => {
		const chairs = [
			{ id: "chair-1", name: "Кресло 1" },
			{ id: "chair-2", name: "Кресло 2" },
		];
		const blocks = mapReservationsToMaintenanceBlocks(
			[
				{
					id: "res-all",
					organizationId: "org-1",
					chairName: "Все кресла",
					reservationType: "meeting",
					startTime: "2026-07-10T12:00:00+03:00",
					endTime: "2026-07-10T13:00:00+03:00",
					bookingLocked: true,
					hatchingStyle: "diagonal_slate",
					note: "Планёрка",
					createdAt: "2026-07-01T00:00:00Z",
				},
			],
			chairs,
		);
		assert.equal(blocks.length, 2);
		assert.deepEqual(
			blocks.map((b) => b.chairId).sort(),
			["chair-1", "chair-2"],
		);
	});

	it("3. ScheduleMobileFilterChips suppresses multi-doctor/chair filter strip when isSoloDoctor=true", () => {
		const commonProps = {
			selectedDoctorId: null,
			selectedChairId: null,
			doctors: [
				{ id: "doc-1", fullName: "Др. Иванов" },
				{ id: "doc-2", fullName: "Др. Петров" },
			],
			chairs: [
				{ id: "ch-1", name: "Кресло 1" },
				{ id: "ch-2", name: "Кресло 2" },
			],
		};
		const soloHtml = renderToStaticMarkup(
			React.createElement(ScheduleMobileFilterChips, { ...commonProps, isSoloDoctor: true }),
		);
		assert.equal(soloHtml, "", "Solo-doctor mobile view must hide redundant filter chips");

		const fullHtml = renderToStaticMarkup(
			React.createElement(ScheduleMobileFilterChips, { ...commonProps, isSoloDoctor: false }),
		);
		assert.ok(fullHtml.includes("Все врачи и кабинеты"));
	});

	it("4. ScheduleOptionsMenu renders cleanly with clinic timezone and zero disabled options", () => {
		const html = renderToStaticMarkup(
			React.createElement(ScheduleOptionsMenu, {
				isOpen: true,
				onToggle: () => {},
				onClose: () => {},
				menuRef: { current: null },
				onSetDate: () => {},
				localNow: new Date("2026-06-30T15:30:00.000Z"),
				timezone: "Asia/Vladivostok",
				onSetStatusFilter: () => {},
				onOpenAddChair: () => {},
			}),
		);
		assert.ok(html.includes("Завтра"));
		assert.equal(/<button[^>]*disabled/i.test(html), false);
	});

	it("5. launchMarketingCampaign always uses scope='marketing' for promos (never bypasses 152-FZ via service scope)", async () => {
		const originalFetch = globalThis.fetch;
		const capturedRequests: Array<{ url: string; method?: string | undefined; body?: Record<string, unknown> | undefined }> = [];
		globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
			const url = String(input);
			const parsedBody = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : undefined;
			capturedRequests.push({ url, method: init?.method, body: parsedBody });
			if (url.endsWith("/api/communications/templates") && (!init?.method || init.method === "GET")) {
				return new Response(
					JSON.stringify({ templates: [{ id: "tpl-promo-1", title: "Профгигиена", channel: "sms" }] }),
					{ status: 200 },
				);
			}
			if (url.endsWith("/api/communications/campaigns")) {
				return new Response(JSON.stringify({ campaign: { id: "cmp-1" } }), { status: 200 });
			}
			if (url.endsWith("/api/communications/campaigns/cmp-1/launch")) {
				return new Response(JSON.stringify({ queued: 5, alreadyQueued: 0, matched: 5 }), { status: 200 });
			}
			return new Response(JSON.stringify({}), { status: 200 });
		}) as typeof fetch;

		try {
			const result = await launchMarketingCampaign({
				promo: {
					id: "promo-1",
					title: "Профгигиена",
					badge: "Хит",
					promoCode: "CLEAN",
					discountText: "-20%",
					category: "Гигиена",
					validUntil: "31.12.2026",
					status: "active",
					conditions: ["Первичным пациентам"],
					messageTemplate: "Приглашаем на гигиену",
					recommendedSegment: "no_visit_6m",
					stats: { reach: 0, bookings: 0, conversionPercent: 0, revenueRub: 0 },
				},
				channel: "sms",
				segmentId: "no_visit_6m",
				consentOnly: true,
				mutationHeaders: { Authorization: "Bearer test-token" },
			});
			assert.equal(result.ok, true);
			const campaignCreate = capturedRequests.find(
				(r) => r.url === "/api/communications/campaigns" && r.method === "POST",
			);
			assert.ok(campaignCreate?.body, "Must POST campaign payload");
			assert.equal(campaignCreate.body.scope, "marketing", "Promotional campaigns MUST preserve scope='marketing'");
		} finally {
			globalThis.fetch = originalFetch;
		}
	});

	it("6. MarketingCampaignLaunchSection renders explicit test recipient input instead of hardcoded fallback", () => {
		const html = renderToStaticMarkup(
			React.createElement(MarketingCampaignLaunchSection, {
				segments: [{ id: "no_visit_6m", name: "Не были > 6 мес", count: 12, description: "Пациенты без визита" }],
				selectedSegmentId: "no_visit_6m",
				onSelectSegment: () => {},
				consentOnly: true,
				onChangeConsentOnly: () => {},
				estimatedCostRub: "33.60",
				activeSegment: { id: "no_visit_6m", name: "Не были > 6 мес", count: 12, description: "Пациенты без визита" },
				channelRateRub: 2.8,
				isSending: false,
				testSent: false,
				testRecipient: "",
				onChangeTestRecipient: () => {},
				onLaunch: () => {},
				onTestSend: () => {},
			}),
		);
		assert.ok(html.includes('data-testid="input-test-recipient"'));
		assert.equal(html.includes("+79990000000"), false);
	});
});
