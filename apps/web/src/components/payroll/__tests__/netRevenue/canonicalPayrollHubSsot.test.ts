/**
 * canonicalPayrollHubSsot.test.ts — Verification of Canonical SSOT Payroll Hub & Kopeck Engine
 * Mandate 8b, Mandate 8e, Mandate 8n, Mandate 8aq (WorkspaceStudioOverlayHost + routeResolver).
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import {
	computeNetBaseKopecks,
	calculateDoctorCommissionKopecks,
	calculateSoloDoctorRentalModel,
	calculateAssistantPiecework,
	calculateDoctorPayrollFromOrders,
	calculateDoctorPayrollSummary,
	getQuickPeriodDates,
	generateDoctorPayslipA5Html,
	generateDoctorPayslipMessengerText,
	CANONICAL_PAYROLL_DOCTORS,
	CANONICAL_DEMO_ORDERS,
} from "../../payrollCatalogData";
import { calculateOrderNetAndFee } from "../../doctorPayrollModalUtils";
import { DoctorPayrollStudioModal } from "../../DoctorPayrollStudioModal";
import { WorkspaceStudioOverlayHost } from "../../../appLayout/WorkspaceStudioOverlayHost";
import { resolveClinicRoute } from "../../../../router/routeResolver";

describe("Canonical SSOT Payroll Hub & Kopeck-Exact Engine", () => {
	it("1.1 computeNetBaseKopecks: Gross − Lab − Materials = Net Base in exact kopecks", () => {
		const netBase = computeNetBaseKopecks(4200000, 950000, 180000);
		assert.equal(netBase, 3070000, "Net base must equal 30 700 ₽ (3 070 000 kop)");

		const clampZero = computeNetBaseKopecks(500000, 400000, 200000);
		assert.equal(clampZero, 0, "Net base cannot drop below 0");
	});

	it("1.2 calculateDoctorCommissionKopecks: 20–35% commission on Net Base without float drift", () => {
		assert.equal(calculateDoctorCommissionKopecks(3070000, 30), 921000);
		assert.equal(calculateDoctorCommissionKopecks(1270000, 25), 317500);
		assert.equal(calculateDoctorCommissionKopecks(4100000, 35), 1435000);
	});

	it("1.3 calculateSoloDoctorRentalModel: Mandate 8n Solo Doctor 100% net profit minus chair rental", () => {
		const rentalRes = calculateSoloDoctorRentalModel({
			grossRevenueKop: 3200000,
			labCostKop: 250000,
			materialCostKop: 350000,
			shiftsCount: 5,
			shiftRateKop: 400000,
			advanceKop: 200000,
		});

		assert.equal(rentalRes.netBaseKop, 2600000);
		assert.equal(rentalRes.chairRentKop, 2000000);
		assert.equal(rentalRes.advanceKop, 200000);
		assert.equal(rentalRes.doctorNetPayoutKop, 400000);
		assert.equal(rentalRes.clinicRentalProfitKop, 2000000);
	});

	it("1.4 calculateAssistantPiecework: hourly and per-shift piecework with surgical & x-ray bonuses", () => {
		const ast = calculateAssistantPiecework({
			shiftsCount: 10,
			shiftRateKop: 300000,
			hoursCount: 15,
			hourlyRateKop: 40000,
			surgicalAssistanceCount: 4,
			surgicalBonusKop: 150000,
			xraysCount: 20,
			xrayBonusKop: 20000,
		});

		assert.equal(ast.totalAssistantPayoutKop, 4600000);
	});

	it("1.5 calculateDoctorPayrollFromOrders matches calculateDoctorPayrollSummary & per-row calculateOrderNetAndFee", () => {
		const volkov = CANONICAL_PAYROLL_DOCTORS.find((d) => d.id === "doc-volkov");
		assert.ok(volkov);
		const calc = calculateDoctorPayrollFromOrders(CANONICAL_DEMO_ORDERS, volkov);
		const summary = calculateDoctorPayrollSummary({
			orders: CANONICAL_DEMO_ORDERS,
			doctor: volkov,
		});

		assert.equal(calc.servicesCount, 2);
		assert.equal(calc.totalGrossKopecks, 8000000);
		assert.equal(calc.totalLabCostKopecks, 1800000);
		assert.equal(calc.totalMaterialCostKopecks, 330000);
		assert.equal(calc.totalNetBaseKopecks, 5870000);
		assert.equal(calc.earnedDoctorKopecks, 1761000);
		assert.equal(summary.doctorAccruedKopecks, calc.earnedDoctorKopecks);

		const volkovOrders = CANONICAL_DEMO_ORDERS.filter((o) => o.doctorId === volkov.id);
		const sumRowFees = volkovOrders.reduce(
			(acc, o) => acc + calculateOrderNetAndFee(o, volkov, null).fee,
			0,
		);
		assert.equal(sumRowFees, summary.doctorAccruedKopecks);
	});

	it("1.6 getQuickPeriodDates: generates today, yesterday, current week, and current month", () => {
		const today = getQuickPeriodDates("today");
		assert.equal(today.startIso, today.endIso);
		assert.equal(today.labelRu, "Сегодня");

		const month = getQuickPeriodDates("current_month");
		assert.ok(month.startIso.endsWith("-01"));
		assert.equal(month.labelRu, "Текущий месяц");
	});

	it("2.1 Payslip generators exclude Soviet bureaucratic codes and include clean A5 / messenger formats", () => {
		const volkov = CANONICAL_PAYROLL_DOCTORS.find((d) => d.id === "doc-volkov");
		assert.ok(volkov);
		const calc = calculateDoctorPayrollFromOrders(CANONICAL_DEMO_ORDERS, volkov);

		const html = generateDoctorPayslipA5Html(calc, volkov, "Стоматология DENTE");
		assert.ok(html.includes("РАСЧЕТНЫЙ ЛИСТОК ВРАЧА"));
		assert.ok(!html.includes("Форма Т-51"));
		assert.ok(html.includes("Главный бухгалтер:"));
		assert.ok(html.includes("Руководитель клиники:"));
		assert.ok(html.includes("Врач-специалист:"));

		const text = generateDoctorPayslipMessengerText(calc, volkov, "Стоматология DENTE");
		assert.ok(text.includes("Расчетный листок врача:"));
		assert.ok(text.toLowerCase().includes("к выплате:"));
	});

	it("3.1 Payroll Studio resolves in 3-shell routeResolver and renders cleanly via SSR", () => {
		const route = resolveClinicRoute("", "#payroll");
		assert.equal(route.studio?.kind, "doctor_payroll");

		const modalHtml = renderToString(
			React.createElement(DoctorPayrollStudioModal, {
				isOpen: true,
				onClose: () => {},
				orders: [...CANONICAL_DEMO_ORDERS],
			}),
		);
		assert.ok(modalHtml.includes('data-testid="doctor-payroll-studio-modal"'));
		assert.ok(modalHtml.includes('data-testid="payroll-studio-primary-cta"'));
		assert.ok(!modalHtml.includes("Форма Т-51"));
		assert.ok(WorkspaceStudioOverlayHost);
	});
});
