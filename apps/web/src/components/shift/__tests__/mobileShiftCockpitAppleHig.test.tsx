import assert from "node:assert/strict";
import { describe, it } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { ShiftMetricsHeader } from "../mobileCockpit/ShiftMetricsHeader";
import { ShiftActionsToolbar } from "../mobileCockpit/ShiftActionsToolbar";
import { MobileShiftCockpitUI } from "../mobileCockpit/MobileShiftCockpitUI";

const EMOJI_REGEX = /[\u{1F300}-\u{1F6FF}\u{1F900}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

function cleanSsrHtml(html: string): string {
	return html.replace(/<!--.*?-->/g, "").replace(/\u00a0/g, " ").replace(/\s+/g, " ");
}

describe("MobileShiftCockpit Apple iOS HIG & Anti-Desktop-Squeeze Invariants", () => {
	it("1. ShiftMetricsHeader: renders Grouped Card with 42 500 ₽ revenue, 3 channels and chair rental timer", () => {
		const rawHtml = renderToString(
			React.createElement(ShiftMetricsHeader, {
				isShiftOpen: true,
				onToggleShift: () => {},
				doctorName: "Д-р Смирнова Е.В.",
				doctorSpecialty: "Врач-стоматолог терапевт-ортопед",
				cabinetName: "Кабинет 1 (Основной)",
				totalRevenueRub: 42500,
				cashInDrawerRub: 15000,
				cardSumRub: 22500,
				sbpSumRub: 5000,
				doctorCommissionPct: 30,
				estimatedDoctorPayoutRub: 12750,
				elapsedTimeDisplay: "06:15:30",
				chairRentalTimerDisplay: "02:45",
				isChairRentalActive: true,
			}),
		);
		const html = cleanSsrHtml(rawHtml);

		// Grouped Card & Doctor Row
		assert.ok(html.includes("Смена врача"));
		assert.ok(html.includes("Открыта"));
		assert.ok(html.includes("Д-р Смирнова Е.В."));
		assert.ok(html.includes("Кабинет 1 (Основной)"));

		// Revenue Dominance
		assert.ok(html.includes("Выручка за день"));
		assert.ok(html.includes("42 500 ₽"));

		// 3 Channels Breakdown
		assert.ok(html.includes("Наличные"));
		assert.ok(html.includes("15 000 ₽"));
		assert.ok(html.includes("POS карты"));
		assert.ok(html.includes("22 500 ₽"));
		assert.ok(html.includes("СБП QR"));
		assert.ok(html.includes("5 000 ₽"));

		// Doctor Payout Strip
		assert.ok(html.includes("Начислено врачу (30%):"));
		assert.ok(html.includes("12 750 ₽"));

		// Timers: Shift and Chair Rental
		assert.ok(html.includes("06:15:30"));
		assert.ok(html.includes("Аренда: 02:45"));

		// Zero cartoon emojis
		assert.equal(
			EMOJI_REGEX.test(rawHtml),
			false,
			"ShiftMetricsHeader must contain zero emojis",
		);
	});

	it("2. ShiftActionsToolbar: renders full-width Natural Thumb Zone button 'Сдать смену и кассу' >= 52px", () => {
		const rawHtml = renderToString(
			React.createElement(ShiftActionsToolbar, {
				isShiftOpen: true,
				onToggleShift: () => {},
				isCashInSheetOpen: false,
				setIsCashInSheetOpen: () => {},
				isCashOutSheetOpen: false,
				setIsCashOutSheetOpen: () => {},
				isHandoverSheetOpen: false,
				setIsHandoverSheetOpen: () => {},
				cashInAmount: 0,
				setCashInAmount: () => {},
				cashInReason: "",
				setCashInReason: () => {},
				isSubmittingCashIn: false,
				cashOutMode: "full",
				setCashOutMode: () => {},
				isSubmittingCashOut: false,
				handleConfirmCashIn: () => {},
				handleConfirmCashOutAndZReport: () => {},
				handleConfirmHandoverShift: () => {},
				consumables: [],
			}),
		);
		const html = cleanSsrHtml(rawHtml);

		assert.ok(html.includes("Сдать смену и кассу"));
		assert.ok(html.includes("Внесение размена"));
		assert.ok(html.includes("Инкассация"));
		assert.ok(html.includes("mobile-shift-btn-primary-cta"));

		// Zero cartoon emojis
		assert.equal(
			EMOJI_REGEX.test(rawHtml),
			false,
			"ShiftActionsToolbar must contain zero emojis",
		);
	});

	it("3. MobileShiftCockpitUI: renders with safe-area padding-bottom to prevent navbar overlap", () => {
		const rawHtml = renderToString(
			React.createElement(MobileShiftCockpitUI, {
				doctorName: "Д-р Барабаш С.В.",
				totalRevenueRub: 50000,
				totalAppointmentsCount: 4,
				completedCount: 2,
				inChairCount: 1,
				consumables: [],
				handleAdjustConsumable: () => {},
				activePatientFilter: "all",
				setActivePatientFilter: () => {},
				filteredAppointments: [],
			}),
		);

		assert.ok(
			rawHtml.includes("padding-bottom:calc(88px + env(safe-area-inset-bottom, 16px))") ||
			rawHtml.includes("padding-bottom: calc(88px + env(safe-area-inset-bottom, 16px))"),
			"MobileShiftCockpitUI must have safe-area padding-bottom to clear mobile tab bar",
		);
		assert.ok(rawHtml.includes("mobile-shift-ui-container"));
		assert.ok(rawHtml.includes("Субаренда"));
	});
});
