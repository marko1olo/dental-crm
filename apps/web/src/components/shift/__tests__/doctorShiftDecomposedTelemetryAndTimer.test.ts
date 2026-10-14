import React from "react";
import { describe, it } from "vitest";
import assert from "node:assert/strict";
import { renderToString, renderToStaticMarkup } from "react-dom/server";
import { useShiftRealtimeTelemetry } from "../useShiftRealtimeTelemetry";
import { useShiftFinancialSummary } from "../useShiftFinancialSummary";
import { ShiftTimerDisplay } from "../controlBarModules/ShiftTimerDisplay";
import { ChairStatusQuickToggle } from "../controlBarModules/ChairStatusQuickToggle";
import { DoctorShiftActionsMenu } from "../controlBarModules/DoctorShiftActionsMenu";
import { DoctorShiftControlBar } from "../DoctorShiftControlBar";

const EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

describe("Doctor Shift Realtime Telemetry, Timer & Chair Status (LOW-SPEC CHAIRSIDE)", () => {
	it("ShiftTimerDisplay: renders accessible timer with tabular-nums and zero emojis", () => {
		const html = renderToStaticMarkup(
			React.createElement(ShiftTimerDisplay, {
				isShiftOpen: true,
				initialSeconds: 3725, // 01:02:05
			}),
		);

		assert.ok(html.includes('role="timer"'), "Timer has accessibility role");
		assert.ok(html.includes("01:02:05"), "Timer displays formatted HH:MM:SS");
		assert.ok(!html.includes("NaN"), "Zero NaN artifacts in timer");
		assert.equal(EMOJI_REGEX.test(html), false, "Zero cartoon emojis in ShiftTimerDisplay");
	});

	it("ShiftTimerDisplay: returns null when shift is closed", () => {
		const html = renderToStaticMarkup(
			React.createElement(ShiftTimerDisplay, {
				isShiftOpen: false,
			}),
		);
		assert.equal(html, "", "Closed shift renders empty string without memory overhead");
	});

	it("ChairStatusQuickToggle: renders all 4 clinical chair statuses with touch ergonomics", () => {
		let chosenStatus = "free";
		const html = renderToStaticMarkup(
			React.createElement(ChairStatusQuickToggle, {
				currentStatus: "in_treatment",
				onChangeStatus: (s) => { chosenStatus = s; },
			}),
		);

		assert.ok(html.includes('data-testid="chair-status-quick-toggle"'));
		assert.ok(html.includes("Свободно"));
		assert.ok(html.includes("Приём"));
		assert.ok(html.includes("Дезинфекция"));
		assert.ok(html.includes("Кварцевание"));
		assert.ok(html.includes('aria-checked="true"'));
		assert.equal(EMOJI_REGEX.test(html), false, "Zero cartoon emojis in chair status toggle");
	});

	it("DoctorShiftActionsMenu: renders compact dropdown trigger and secondary actions", () => {
		const html = renderToStaticMarkup(
			React.createElement(DoctorShiftActionsMenu, {
				onHandoverShift: () => {},
				onPrintPreliminaryReport: () => {},
				onCallAssistant: () => {},
				onOpenT13Timesheet: () => {},
				isChairRental: false,
			}),
		);

		assert.ok(html.includes('data-testid="shift-actions-menu-trigger"'));
		assert.ok(html.includes("Ещё"));
		assert.equal(EMOJI_REGEX.test(html), false, "Zero cartoon emojis in action menu");
	});

	it("DoctorShiftControlBar: renders decomposed bar in salaried piece-rate mode with zero disabled buttons", () => {
		const html = renderToString(
			React.createElement(DoctorShiftControlBar, {
				isShiftOpen: true,
				onToggleShift: () => {},
				onOpenPayrollModal: () => {},
				financialMode: "piece_rate",
				shiftStats: {
					totalAppointments: 6,
					completedCount: 4,
					inProgressCount: 1,
					totalRevenueRub: 52000,
					doctorCommissionPct: 30,
					estimatedDoctorPayoutRub: 15600,
					hasActiveOvertime: false,
					shiftDurationSeconds: 7200,
				},
				chairStatus: "in_treatment",
				onChangeChairStatus: () => {},
			}),
		);

		assert.ok(html.includes("doctor-shift-control-bar"));
		assert.ok(html.includes("Рабочая смена врача открыта"));
		assert.ok(html.includes("Пациенты за смену"));
		assert.ok(html.includes("52\u00A0000") || html.includes("52 000"));
		assert.ok(html.includes("Гонорар врача (30%)"));
		assert.ok(html.includes("15\u00A0600") || html.includes("15 600"));

		// Verify 0 disabled buttons per Mandate 8e
		const buttonMatches = html.match(/<button[^>]*>/g) || [];
		for (const btn of buttonMatches) {
			assert.equal(/disabled(?=[>\s=])/.test(btn), false, `Button must NOT be disabled: ${btn}`);
		}
		assert.equal(EMOJI_REGEX.test(html), false, "Zero cartoon emojis in DoctorShiftControlBar");
	});

	it("DoctorShiftControlBar: renders in chair rental mode with rental deduction and net income", () => {
		const html = renderToString(
			React.createElement(DoctorShiftControlBar, {
				isShiftOpen: true,
				onToggleShift: () => {},
				onOpenPayrollModal: () => {},
				financialMode: "chair_rental",
				onChangeFinancialMode: () => {},
				chairRentalNetIncomeRub: 35000,
				chairRentalRentExpenseRub: 10000,
				shiftStats: {
					totalAppointments: 5,
					completedCount: 3,
					inProgressCount: 1,
					totalRevenueRub: 45000,
					doctorCommissionPct: 100,
					estimatedDoctorPayoutRub: 45000,
					hasActiveOvertime: false,
				},
			}),
		);

		assert.ok(html.includes("Субаренда кресла"));
		assert.ok(html.includes("Чистый доход (субаренда)"));
		assert.ok(html.includes("Условия аренды"));
		assert.ok(html.includes("10\u00A0000") || html.includes("10 000"));
		assert.ok(html.includes("35\u00A0000") || html.includes("35 000"));
		assert.equal(EMOJI_REGEX.test(html), false, "Zero cartoon emojis");
	});
});
