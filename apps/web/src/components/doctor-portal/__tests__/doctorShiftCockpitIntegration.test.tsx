import React from "react";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { renderToString } from "react-dom/server";
import { DoctorDesktopHeader } from "../../visit/DoctorDesktopHeader";
import { DoctorMobileShiftModal } from "../DoctorMobileShiftModal";
import { VisitTimer } from "../../visit/VisitTimer";
import {
	calculateDoctorShiftEarnings,
	filterDoctorShiftAppointments,
	SAMPLE_DOCTOR_SHIFT_APPOINTMENTS,
} from "@dental/shared";

describe("Doctor Shift Cockpit & Header Integration (THE HAMMER Standards)", () => {
	it("DoctorDesktopHeader: renders doctor bio, chair, live piece-rate earnings in exact integer kopecks", () => {
		const html = renderToString(
			<DoctorDesktopHeader
				doctorId="doc-1"
				doctorName="Д-р Смирнов Алексей Петрович"
				doctorSpecialty="Терапевт-ортопед"
				chairName="Кресло 1 (Терапия)"
				shiftDateIso="2026-08-29"
				appointments={SAMPLE_DOCTOR_SHIFT_APPOINTMENTS}
				onOpenCockpit={() => {}}
				onInitiateBatchSign={() => {}}
			/>,
		);

		// 1. Verify component mounted and rendered
		assert.ok(html.includes('data-testid="doctor-desktop-header"'));
		assert.ok(html.includes("Д-р Смирнов Алексей Петрович"));
		assert.ok(html.includes("Терапевт-ортопед"));
		assert.ok(html.includes("Кресло 1 (Терапия)"));

		// 2. Verify financial metrics block
		assert.ok(html.includes("Заработано (сделка %)"));
		assert.ok(html.includes('data-testid="doctor-header-earned-deal"'));
		assert.ok(html.includes("Выручка:"));
		assert.ok(html.includes("Вычет ЗТЛ/Мат:"));

		// 3. Verify action triggers
		assert.ok(html.includes('data-testid="doctor-header-cockpit-trigger-btn"'));
		assert.ok(html.includes("Рабочий стол врача"));

		// 4. Verify no cartoon emojis
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
