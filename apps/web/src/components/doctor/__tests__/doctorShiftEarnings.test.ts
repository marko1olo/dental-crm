/**
 * doctorShiftEarnings.test.ts — Unit tests for Doctor Shift Earnings Chairside HUD.
 * Compliance: Engineering Rule 5 (SSR renderToString, Zero Kustarnyi-DOM, No Memory Leaks).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React, { createElement } from "react";
import { renderToString } from "react-dom/server";
import {
	calculateChairsideShiftEarnings,
	createSampleChairsideShiftAppointments,
} from "../doctorShiftEarnings.js";
import { DoctorShiftEarningsWidget } from "../DoctorShiftEarningsWidget.js";

describe("Doctor Workstation: Chairside Shift Earnings HUD", () => {
	it("1. Accurate net revenue calculation: Gross - Lab - Materials = Net Base * 25% = Accrual", () => {
		const appointments = createSampleChairsideShiftAppointments("doc-1", "Д-р Смирнов", "2026-09-25");

		const result = calculateChairsideShiftEarnings({
			appointments,
			doctorId: "doc-1",
			shiftDateIso: "2026-09-25",
			defaultCommissionPercent: 25,
		});

		assert.equal(result.patientsCompletedCount, 3, "3 completed patients");
		assert.equal(result.patientsInChairCount, 1, "1 patient in chair");

		// Total gross = 6k + 10k + 38k + 7.5k = 61 500 ₽ (6 150 000 kop)
		assert.equal(result.grossRevenueKop, 6150000);
		// Lab = 12 000 ₽ (1 200 000 kop)
		assert.equal(result.labCostKop, 1200000);
		// Materials = 600 + 1000 + 2000 + 500 = 4 100 ₽ (410 000 kop)
		assert.equal(result.materialsCostKop, 410000);
		// Net base = 61.5k - 12k - 4.1k = 45 400 ₽ (4 540 000 kop)
		assert.equal(result.netBaseRevenueKop, 4540000);
		// Doctor payout = 1350 + 2250 + 6000 + 2100 = 11 700 ₽ (1 170 000 kop)
		assert.equal(result.totalEarnedPayoutKop, 1170000);

		assert.ok(result.formattedEarnedPayout.includes("11") && result.formattedEarnedPayout.includes("700"));
		assert.ok(result.formulaExplanationRu.includes("Выручка"));
	});

	it("2. DoctorShiftEarningsWidget renders trigger button cleanly via SSR", () => {
		const html = renderToString(
			createElement(DoctorShiftEarningsWidget, {
				doctorId: "doc-1",
				doctorName: "Д-р Смирнов А. П.",
				shiftDateIso: "2026-09-25",
				commissionPercent: 25,
			}),
		);

		assert.ok(html.includes("data-testid=\"doctor-shift-earnings-widget\""), "Renders container");
		assert.ok(html.includes("data-testid=\"btn-toggle-shift-earnings-hud\""), "Renders toggle button");
		assert.ok(html.includes("11") && html.includes("700"), "Contains formatted earnings amount");
	});

	it("3. Isolated doctor filter: does not include appointments belonging to other doctors", () => {
		const appointments = createSampleChairsideShiftAppointments("doc-target", "Д-р Целевой", "2026-09-25");

		const result = calculateChairsideShiftEarnings({
			appointments,
			doctorId: "doc-other", // Requesting other doctor
			shiftDateIso: "2026-09-25",
		});

		assert.equal(result.patientsTotalCount, 0, "No appointments for other doctor");
		assert.equal(result.totalEarnedPayoutKop, 0);
	});
});
