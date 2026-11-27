/**
 * DENTE Dental CRM — Doctor Payroll Studio & Net Revenue SSOT Test Suite
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";

import {
	computeNetBaseKopecks,
	calculateDoctorCommissionKopecks,
	calculateDoctorPayrollSummary,
	calculateSoloDoctorRentalModel,
	calculateAssistantPiecework,
	getQuickPeriodDates,
	generateDoctorPayslipA5Html,
	generateDoctorPayslipA4Html,
	generateDoctorPayslipMessengerText,
	CANONICAL_PAYROLL_DOCTORS,
	CANONICAL_DEMO_ORDERS,
	CANONICAL_CLOSED_PERIODS,
} from "../payrollCatalogData";
import { DoctorPayrollStudioModal } from "../DoctorPayrollStudioModal";
import { WorkspaceStudioOverlayHost } from "../../appLayout/WorkspaceStudioOverlayHost";
import { resolveClinicRoute } from "../../../router/routeResolver";
import { setRuntimeDemoMode } from "../../../lib/demoMode";
import { useDoctorPayrollTabData } from "../../../views/financeView/payrollTabModules/useDoctorPayrollTabData";

describe("SSOT Suite: Canonical Doctor Payroll Studio & Net Revenue Invariants", () => {
	describe("1. Net Revenue Formula & Kopeck-Exact Zero-Float Engine (Mandates 8e, 8n)", () => {
		it("1.1 computeNetBaseKopecks: strictly deducts dental lab (ЗТЛ) and materials from Gross revenue", () => {
			const grossKop = 3800000;
			const labCostKop = 850000;
			const matCostKop = 150000;
			const netBaseKop = computeNetBaseKopecks(grossKop, labCostKop, matCostKop);

			assert.equal(netBaseKop, 2800000);
			assert.ok(netBaseKop < grossKop, "Net Base must be lower than gross revenue after lab deduction");
		});

		it("1.2 calculateDoctorCommissionKopecks: computes exact integer percentage without float drift", () => {
			const doctorFeeKop = calculateDoctorCommissionKopecks(2800000, 30);
			assert.equal(doctorFeeKop, 840000);
			assert.equal(Number.isInteger(doctorFeeKop), true);
		});

		it("1.3 calculateDoctorPayrollSummary: verifies all clinical specialties", () => {
			const volkov = CANONICAL_PAYROLL_DOCTORS.find((d) => d.id === "doc-volkov")!;
			const sokolova = CANONICAL_PAYROLL_DOCTORS.find((d) => d.id === "doc-sokolova")!;
			const morozov = CANONICAL_PAYROLL_DOCTORS.find((d) => d.id === "doc-morozov")!;
			const smirnova = CANONICAL_PAYROLL_DOCTORS.find((d) => d.id === "doc-smirnova")!;

			const sumVolkov = calculateDoctorPayrollSummary({ orders: CANONICAL_DEMO_ORDERS, doctor: volkov });
			const sumSokolova = calculateDoctorPayrollSummary({ orders: CANONICAL_DEMO_ORDERS, doctor: sokolova });
			const sumMorozov = calculateDoctorPayrollSummary({ orders: CANONICAL_DEMO_ORDERS, doctor: morozov });
			const sumSmirnova = calculateDoctorPayrollSummary({ orders: CANONICAL_DEMO_ORDERS, doctor: smirnova });

			assert.equal(sumVolkov.totalGrossKopecks, 8000000);
			assert.equal(sumVolkov.totalLabCostKopecks, 1800000);
			assert.equal(sumVolkov.totalNetBaseKopecks, 5870000);
			assert.equal(sumVolkov.doctorAccruedKopecks, 1761000);
			assert.equal(sumSokolova.totalGrossKopecks, 2230000);
			assert.equal(sumSokolova.totalLabCostKopecks, 0);
			assert.equal(sumSokolova.totalNetBaseKopecks, 1960000);
			assert.equal(sumMorozov.totalMaterialCostKopecks, 2400000);
			assert.equal(sumMorozov.doctorAccruedKopecks, 1435000);
			assert.equal(sumSmirnova.totalGrossKopecks, 650000);
		});

		it("1.4 calculateSoloDoctorRentalModel: Solo practitioner 100% net margin minus chair rental", () => {
			const res = calculateSoloDoctorRentalModel({
				grossRevenueKop: 5000000,
				labCostKop: 800000,
				materialCostKop: 200000,
				shiftsCount: 10,
				shiftRateKop: 400000,
				advanceKop: 500000,
			});
			assert.equal(res.netBaseKop, 4000000);
			assert.equal(res.chairRentKop, 4000000);
			assert.equal(res.doctorNetPayoutKop, 0);
			assert.equal(res.clinicRentalProfitKop, 4000000);
		});

		it("1.5 calculateAssistantPiecework: Assistant hourly and per-shift piecework", () => {
			const res = calculateAssistantPiecework({
				shiftsCount: 15,
				shiftRateKop: 250000,
				hoursCount: 0,
				hourlyRateKop: 0,
				surgicalAssistanceCount: 6,
				surgicalBonusKop: 50000,
				xraysCount: 20,
				xrayBonusKop: 10000,
			});
			assert.equal(res.totalAssistantPayoutKop, 4250000);
		});
	});

	describe("2. Quick Period Presets & Closed Settlements Registry (Mandate 8e, 8x)", () => {
		it("2.1 getQuickPeriodDates: generates shift, today, yesterday, current week, and month presets", () => {
			assert.equal(getQuickPeriodDates("shift").labelRu, "Смена");
			assert.equal(getQuickPeriodDates("yesterday").labelRu, "Вчера");
			assert.equal(getQuickPeriodDates("current_week").labelRu, "Текущая неделя");
			assert.equal(getQuickPeriodDates("current_month").labelRu, "Текущий месяц");
		});

		it("2.2 CANONICAL_CLOSED_PERIODS: contains verified settlement records with RKO receipts", () => {
			assert.ok(CANONICAL_CLOSED_PERIODS.length >= 3);
			for (const p of CANONICAL_CLOSED_PERIODS) {
				assert.ok(p.id && p.periodLabelRu);
				assert.ok(p.rkoReceiptNumber.startsWith("РКО-"));
				assert.equal(p.isPaidRko, true);
				assert.ok(p.grossKopecks > 0 && p.payoutKopecks > 0);
			}
		});

		it("2.3 Payslip generators: excludes raw regulatory codes and provides clean A4/A5 and Messenger formats", () => {
			const volkov = CANONICAL_PAYROLL_DOCTORS.find((d) => d.id === "doc-volkov")!;
			const summary = calculateDoctorPayrollSummary({ orders: CANONICAL_DEMO_ORDERS, doctor: volkov });
			const calcCompat = {
				doctorId: summary.doctorId, doctorName: summary.doctorName, specialtyTitleRu: volkov.specialtyTitleRu,
				periodLabelRu: "Октябрь 2026", totalGrossKopecks: summary.totalGrossKopecks,
				totalLabCostKopecks: summary.totalLabCostKopecks, totalMaterialCostKopecks: summary.totalMaterialCostKopecks,
				totalNetBaseKopecks: summary.totalNetBaseKopecks, commissionPercent: volkov.commissionPercent,
				earnedDoctorKopecks: summary.doctorAccruedKopecks, chairRentalKopecks: summary.chairRentalKopecks,
				advanceKopecks: summary.advanceKopecks, minimumGuaranteeApplied: summary.minimumGuaranteeApplied,
				grossPayoutBeforeTaxKop: summary.doctorAccruedKopecks, ndfl13TaxKopecks: summary.ndfl13TaxKopecks,
				netPayoutToDoctorKopecks: summary.payoutKopecks, servicesCount: summary.servicesCount,
				isChairRental: false, payoutStatus: summary.payoutStatus,
			};

			const htmlA5 = generateDoctorPayslipA5Html(calcCompat, volkov, "Стоматология DENTE");
			const htmlA4 = generateDoctorPayslipA4Html(calcCompat, volkov, "Стоматология DENTE");
			const msgText = generateDoctorPayslipMessengerText(calcCompat, volkov, "Стоматология DENTE");

			assert.equal(htmlA5.includes("Форма Т-51"), false);
			assert.equal(htmlA5.includes("КНД 1151078"), false);
			assert.ok(htmlA5.includes("РАСЧЕТНЫЙ ЛИСТОК ВРАЧА"));
			assert.ok(htmlA4.includes("РАСЧЕТНЫЙ ЛИСТОК ВРАЧА"));
			assert.ok(msgText.includes("Расчетный листок врача:"));
			assert.ok(msgText.includes("Итого к выплате:"));
		});
	});

	describe("3. UI Mounting, Tabs, Primary CTA & Production Mode Isolation", () => {
		it("3.1 DoctorPayrollStudioModal renders 3 SSOT tabs, 1 Primary CTA in var(--primary) and 0 disabled buttons", () => {
			setRuntimeDemoMode(true);
			try {
				const html = renderToString(React.createElement(DoctorPayrollStudioModal, { isOpen: true, onClose: () => {} }));
				assert.ok(html.includes('data-testid="payroll-studio-primary-cta"'));
				assert.ok(html.includes("bg-[var(--primary)]"));
				assert.equal(/<button[^>]*\bdisabled\b/i.test(html), false);
				assert.ok(html.includes('data-testid="payroll-tab-summary"'));
				assert.ok(html.includes('data-testid="payroll-tab-details"'));
				assert.ok(html.includes('data-testid="payroll-tab-closed-periods"'));
				assert.ok(html.includes("Сводная ведомость врачей"));
				assert.ok(html.includes("Детализация по услугам и ЗТЛ"));
				assert.ok(html.includes("Закрытые периоды и выплаты"));
			} finally {
				setRuntimeDemoMode(false);
			}
		});

		it("3.2 Route resolver maps #payroll to doctor_payroll and OverlayHost is defined", () => {
			assert.equal(resolveClinicRoute("", "#payroll").studio?.kind, "doctor_payroll");
			assert.ok(DoctorPayrollStudioModal && WorkspaceStudioOverlayHost);
		});

		it("3.3 Strictly 0 cartoon emojis in catalog data and messenger output", () => {
			const emojiRegex = /[\u{1F300}-\u{1F9FF}]/u;
			assert.equal(emojiRegex.test(JSON.stringify(CANONICAL_PAYROLL_DOCTORS)), false);
			assert.equal(emojiRegex.test(JSON.stringify(CANONICAL_DEMO_ORDERS)), false);
			assert.equal(emojiRegex.test(JSON.stringify(CANONICAL_CLOSED_PERIODS)), false);

			const volkov = CANONICAL_PAYROLL_DOCTORS.find((d) => d.id === "doc-volkov")!;
			const summary = calculateDoctorPayrollSummary({ orders: CANONICAL_DEMO_ORDERS, doctor: volkov });
			const messengerText = generateDoctorPayslipMessengerText(
				{
					doctorId: summary.doctorId, doctorName: summary.doctorName, specialtyTitleRu: volkov.specialtyTitleRu,
					periodLabelRu: "Октябрь 2026", totalGrossKopecks: summary.totalGrossKopecks,
					totalLabCostKopecks: summary.totalLabCostKopecks, totalMaterialCostKopecks: summary.totalMaterialCostKopecks,
					totalNetBaseKopecks: summary.totalNetBaseKopecks, commissionPercent: volkov.commissionPercent,
					earnedDoctorKopecks: summary.doctorAccruedKopecks, chairRentalKopecks: summary.chairRentalKopecks,
					advanceKopecks: summary.advanceKopecks, minimumGuaranteeApplied: summary.minimumGuaranteeApplied,
					grossPayoutBeforeTaxKop: summary.doctorAccruedKopecks, ndfl13TaxKopecks: summary.ndfl13TaxKopecks,
					netPayoutToDoctorKopecks: summary.payoutKopecks, servicesCount: summary.servicesCount,
					isChairRental: false, payoutStatus: summary.payoutStatus,
				},
				volkov,
				"Стоматология DENTE",
			);
			assert.equal(emojiRegex.test(messengerText), false);
			assert.ok(messengerText.includes("[Расчетный листок]"));
		});

		it("3.4 Mandate 8wy: Production mode strictly isolates mockups and shows honest Empty State", () => {
			setRuntimeDemoMode(false);
			try {
				const prodHtml = renderToString(React.createElement(DoctorPayrollStudioModal, { isOpen: true, onClose: () => {} }));
				assert.equal(prodHtml.includes("ОРТ-2401"), false);
				assert.equal(prodHtml.includes("ХИР-3301"), false);
				assert.equal(prodHtml.includes("Волков"), false);
				assert.equal(prodHtml.includes("РКО-09/26-1"), false);
				assert.ok(prodHtml.includes("Нет закрытых нарядов за выбранный период"));
				assert.ok(prodHtml.includes("0 ₽"));
				assert.ok(prodHtml.includes('data-testid="payroll-studio-primary-cta"'));
				assert.equal(prodHtml.includes("disabled"), false);
			} finally {
				setRuntimeDemoMode(false);
			}
		});

		it("3.5 useDoctorPayrollTabData resolves custom doctors list cleanly", () => {
			function Consumer() {
				const data = useDoctorPayrollTabData({
					doctorsList: [{ id: "doc-custom", name: "Тестов А.В.", specialtyId: "therapist" }],
				});
				return React.createElement("span", { "data-testid": "doc-name" }, data.activeDoctor.name);
			}
			const html = renderToString(React.createElement(Consumer));
			assert.ok(html.includes("Тестов А.В."));
		});
	});
});
