import React from "react";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderToString } from "react-dom/server";
import { DoctorShiftControlBar } from "../../shift/DoctorShiftControlBar";
import { DoctorMobileShiftModal } from "../DoctorMobileShiftModal";
import { VisitTimer } from "../../visit/VisitTimer";
import {
	calculateDoctorShiftEarnings,
	filterDoctorShiftAppointments,
	SAMPLE_DOCTOR_SHIFT_APPOINTMENTS,
} from "@dental/shared";

describe("Doctor Shift Cockpit & Header Integration (THE HAMMER Standards)", () => {
	it("DoctorShiftControlBar: renders shift admission, piece-rate earnings summary without barriers", () => {
		const html = renderToString(
			<DoctorShiftControlBar
				isShiftOpen={true}
				onToggleShift={() => {}}
				onOpenPayrollModal={() => {}}
				shiftStats={{
					totalAppointments: 8,
					completedCount: 5,
					inProgressCount: 1,
					totalRevenueRub: 45000,
					doctorCommissionPct: 25,
					estimatedDoctorPayoutRub: 11250,
					hasActiveOvertime: false,
				}}
			/>,
		);

		// 1. Verify component mounted and rendered
		assert.ok(html.includes("doctor-shift-control-bar"));
		assert.ok(html.includes("Рабочая смена врача открыта"));
		assert.ok(html.includes("Пациенты за смену"));

		// 2. Verify financial metrics block
		assert.ok(html.includes("Гонорар врача"));

		// 3. Verify no cartoon emojis
		assert.ok(!html.includes("🔥"));
		assert.ok(!html.includes("👑"));
		assert.ok(!html.includes("✨"));
		assert.ok(!html.includes("🔩"));
		assert.ok(!html.includes("❌"));
		assert.ok(!html.includes("🌀"));
	});

	it("DoctorMobileShiftModal: renders full shift cockpit with EMR batch signing and piece-rate breakdown", () => {
		const html = renderToString(
			<DoctorMobileShiftModal
				isOpen={true}
				onClose={() => {}}
				initialDoctorId="doc-1"
				initialDoctorName="Д-р Смирнов Алексей Петрович"
				initialDoctorSpecialty="Терапевт-ортопед"
				initialShiftDateIso="2026-08-29"
				initialAppointments={SAMPLE_DOCTOR_SHIFT_APPOINTMENTS}
			/>,
		);

		// 1. Verify modal container
		assert.ok(html.includes('data-testid="doctor-mobile-shift-modal"'));
		assert.ok(html.includes("Заработано за смену (сделка %)"));
		assert.ok(html.includes("Д-р Смирнов Алексей Петрович"));

		// 2. Status chips & 1-click filters
		assert.ok(html.includes("Все"));
		assert.ok(html.includes("В кресле"));
		assert.ok(html.includes("Завершен"));

		// 3. Batch 043/u signing action
		assert.ok(html.includes('data-testid="sign-all-043u-btn"'));
	});

	it("VisitTimer: safely protects against NaN and malformed timestamps", () => {
		// Valid ISO date
		const validHtml = renderToString(<VisitTimer createdAt="2026-08-29T10:00:00.000Z" />);
		assert.ok(validHtml.includes('role="timer"'));
		assert.ok(!validHtml.includes("NaN"));

		// Invalid string date
		const invalidHtml = renderToString(<VisitTimer createdAt="invalid-date-format" />);
		assert.strictEqual(invalidHtml, "");

		// Null/undefined
		const nullHtml = renderToString(<VisitTimer createdAt={null} />);
		assert.strictEqual(nullHtml, "");
	});

	it("doctorShiftEngine: validates exact mathematical piece-rate calculation without floating-point drift", () => {
		const filtered = filterDoctorShiftAppointments(
			SAMPLE_DOCTOR_SHIFT_APPOINTMENTS,
			"doc-1",
			"2026-08-29",
		);
		const earnings = calculateDoctorShiftEarnings(filtered, "doc-1", "2026-08-29", 25);

		// Integer assertions
		assert.ok(Number.isInteger(earnings.grossRevenueKop));
		assert.ok(Number.isInteger(earnings.totalLabDeductionsKop));
		assert.ok(Number.isInteger(earnings.totalMaterialDeductionsKop));
		assert.ok(Number.isInteger(earnings.netDealBaseKop));
		assert.ok(Number.isInteger(earnings.totalEarnedDealKop));

		// Verified expected totals (6,660,000 gross with all shift visits)
		assert.strictEqual(earnings.grossRevenueKop, 6660000);
		assert.strictEqual(earnings.totalLabDeductionsKop, 800000);
		assert.strictEqual(earnings.totalMaterialDeductionsKop, 460000);
		assert.strictEqual(earnings.netDealBaseKop, 5400000);
		assert.strictEqual(earnings.totalEarnedDealKop, 1150000);
	});
});
