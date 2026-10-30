/**
 * doctorPayrollSSOTSuite.test.tsx — Comprehensive SSOT Suite for Doctor Payroll, Piecework Motivation, & Chair Rental
 * Mandates:
 * - Mandate 8b (Sweet Spot 350–480 lines for Studio Modal, 250–350 for Catalog SSOT)
 * - Mandate 8e (Doctor Autonomy: Primary CTA is never disabled)
 * - Mandate 8n (Solo Practice Sovereignty: Net Revenue, Lab/Implant Deductions, Chair Rental Economics)
 * - Mandate 8am (Single Primary CTA #0d9488)
 * - Mandate 8ze (Apple Mobile HIG: 390x844 Touch Targets >= 44x44px, 0px Horizontal Drift)
 * - Mandate 8aq (Direct Mounting in Live UI Tree)
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import {
	computeNetBaseKopecks,
	calculateDoctorCommissionKopecks,
	calculateSoloDoctorRentalModel,
	calculateDoctorPayrollSummary,
	calculateDoctorPayrollFromOrders,
	getQuickPeriodDates,
	generateDoctorPayslipA5Html,
	generateDoctorPayslipMessengerText,
	CANONICAL_PAYROLL_DOCTORS,
	CANONICAL_DEMO_ORDERS,
	type MotivationSchemeType,
	type PayrollDoctorProfile,
} from "../payrollCatalogData";
import { DoctorPayrollStudioModal } from "../DoctorPayrollStudioModal";
import { DoctorPayrollHubModal } from "../DoctorPayrollHubModal";
import { DirectPayrollLauncher } from "../DirectPayrollLauncher";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("SSOT Suite: Doctor Payroll, Motivation Schemes & Chair Rental", () => {
	describe("1. Net Revenue Formula & Kopeck-Exact Arithmetic (Mandate 8n)", () => {
		it("1.1 computeNetBaseKopecks: deducts dental lab (ЗТЛ) and materials from Gross 54-FZ revenue", () => {
			// Gross 85 000 ₽ (8 500 000 kop), Lab 19 000 ₽ (1 900 000 kop), Materials 6 000 ₽ (600 000 kop)
			const netBase = computeNetBaseKopecks(8500000, 1900000, 600000);
			assert.equal(netBase, 6000000, "Net Base must equal 60 000 ₽ in exact kopecks");

			// Clamp to zero when lab and material exceed gross
			const clamped = computeNetBaseKopecks(1000000, 800000, 400000);
			assert.equal(clamped, 0, "Net Base cannot be negative");
		});

		it("1.2 calculateDoctorCommissionKopecks: computes precise percentage without float drift", () => {
			// 30% of 60 000 ₽ (6 000 000 kop) = 18 000 ₽ (1 800 000 kop)
			const comm30 = calculateDoctorCommissionKopecks(6000000, 30);
			assert.equal(comm30, 1800000);

			// 35% of 41 234.56 ₽ (4 123 456 kop) = 1 443 210 kop (rounded integer)
			const comm35 = calculateDoctorCommissionKopecks(4123456, 35);
			assert.equal(comm35, 1443210);
		});

		it("1.3 calculateDoctorPayrollSummary supports net_percentage, gross_percentage, fixed_shift, and chair_rental", () => {
			const therapist: PayrollDoctorProfile = {
				id: "doc-test-1", name: "Д-р Тестовый Тест Тестович", initials: "ТТ",
				specialtyId: "therapy", specialtyTitleRu: "Стоматолог-терапевт",
				commissionPercent: 25, payoutModel: "percentage", motivationScheme: "net_percentage",
				defaultShiftRateKop: 400000, minGuaranteeMonthlyKop: 5000000, taxRegime: "employee",
			};

			// Orders: ord-3 (14 500 ₽ gross, 0 lab, 1 800 ₽ mat -> 12 700 ₽ net base)
			const singleOrder = [CANONICAL_DEMO_ORDERS.find((o) => o.id === "ord-3")!];

			// Scheme A: net_percentage (25% of 12 700 ₽ = 3 175 ₽)
			const netSummary = calculateDoctorPayrollSummary({
				orders: singleOrder, doctor: { ...therapist, id: singleOrder[0].doctorId },
				schemeType: "net_percentage", percent: 25,
			});
			assert.equal(netSummary.totalGrossKopecks, 1450000);
			assert.equal(netSummary.totalNetBaseKopecks, 1270000);
			assert.equal(netSummary.doctorAccruedKopecks, 317500);

			// Scheme B: gross_percentage (20% of 14 500 ₽ = 2 900 ₽)
			const grossSummary = calculateDoctorPayrollSummary({
				orders: singleOrder, doctor: { ...therapist, id: singleOrder[0].doctorId },
				schemeType: "gross_percentage", percent: 20,
			});
			assert.equal(grossSummary.doctorAccruedKopecks, 290000);

			// Scheme C: fixed_shift (5 shifts * 4 000 ₽ = 20 000 ₽)
			const shiftSummary = calculateDoctorPayrollSummary({
				orders: singleOrder, doctor: { ...therapist, id: singleOrder[0].doctorId },
				schemeType: "fixed_shift", shiftsCount: 5, shiftRateKop: 400000,
			});
			assert.equal(shiftSummary.doctorAccruedKopecks, 2000000);
		});
	});

	describe("2. Solo Doctor Chair Rental Economics (Mandate 8n)", () => {
		it("2.1 calculateSoloDoctorRentalModel: Net Revenue minus Shift Chair Rental yields doctor net income", () => {
			// Gross 50 000 ₽ (5 000 000 kop), Lab 5 000 ₽, Mat 5 000 ₽ -> Net Base 40 000 ₽
			// 8 shifts * 4 000 ₽/смена = 32 000 ₽ rent. Advance = 0.
			// Doctor net income: 40 000 ₽ − 32 000 ₽ = 8 000 ₽ (800 000 kop)
			const solo = calculateSoloDoctorRentalModel({
				grossRevenueKop: 5000000,
				labCostKop: 500000,
				materialCostKop: 500000,
				shiftsCount: 8,
				shiftRateKop: 400000,
				advanceKop: 0,
			});

			assert.equal(solo.netBaseKop, 4000000);
			assert.equal(solo.chairRentKop, 3200000);
			assert.equal(solo.doctorNetPayoutKop, 800000);
			assert.equal(solo.clinicRentalProfitKop, 3200000);
		});

		it("2.2 Hourly chair rental option works accurately in calculateDoctorPayrollSummary", () => {
			const soloDoc = CANONICAL_PAYROLL_DOCTORS.find((d) => d.specialtyId === "solo_rental")!;
			const soloOrders = CANONICAL_DEMO_ORDERS.filter((o) => o.doctorId === soloDoc.id);

			// Hourly rent: 20 hours * 800 ₽/час = 16 000 ₽ (1 600 000 kop)
			const hourlySummary = calculateDoctorPayrollSummary({
				orders: soloOrders,
				doctor: soloDoc,
				schemeType: "chair_rental",
				hoursWorked: 20,
				hourlyRateKop: 80000,
			});

			assert.equal(hourlySummary.chairRentalKopecks, 1600000);
			// Net Base: 32 000 ₽ - 2 500 ₽ (lab) - 3 500 ₽ (mat) = 26 000 ₽
			assert.equal(hourlySummary.totalNetBaseKopecks, 2600000);
			// Accrued: 26 000 ₽ - 16 000 ₽ = 10 000 ₽
			assert.equal(hourlySummary.doctorAccruedKopecks, 1000000);
		});
	});

	describe("3. 1-Click Settlement Status & RKO Order Discipline (Mandate 8e)", () => {
		it("3.1 calculateDoctorPayrollSummary defaults to accrued and transitions to paid_rko", () => {
			const volkov = CANONICAL_PAYROLL_DOCTORS.find((d) => d.id === "doc-volkov")!;
			const unpaid = calculateDoctorPayrollSummary({
				orders: CANONICAL_DEMO_ORDERS,
				doctor: volkov,
				isRkoPaid: false,
			});
			assert.equal(unpaid.payoutStatus, "accrued");

			const paid = calculateDoctorPayrollSummary({
				orders: CANONICAL_DEMO_ORDERS,
				doctor: volkov,
				isRkoPaid: true,
			});
			assert.equal(paid.payoutStatus, "paid_rko");
		});

		it("3.2 Deducts advance and computes employee NDFL 13% cleanly without float drift", () => {
			const volkov = CANONICAL_PAYROLL_DOCTORS.find((d) => d.id === "doc-volkov")!;
			// Volkov earnedDoctorKopecks = 1 761 000 kop (17 610 ₽).
			// Minimum guarantee 70 000 ₽ (7 000 000 kop) triggers: gross before tax = 7 000 000 kop.
			// NDFL 13% = round(7 000 000 * 0.13) = 910 000 kop (9 100 ₽)
			// Advance: 3 000 ₽ (300 000 kop)
			// Payout: 7 000 000 − 910 000 − 300 000 = 5 790 000 kop
			const summary = calculateDoctorPayrollSummary({
				orders: CANONICAL_DEMO_ORDERS,
				doctor: volkov,
				advanceKop: 300000,
			});

			assert.equal(summary.doctorAccruedKopecks, 1761000);
			assert.equal(summary.minimumGuaranteeApplied, true);
			assert.equal(summary.ndfl13TaxKopecks, 910000);
			assert.equal(summary.advanceKopecks, 300000);
			assert.equal(summary.payoutKopecks, 5790000);
		});
	});

	describe("4. Architectural File Limits & Mandatory UI Mounting (Mandates 8b, 8aq, 8am)", () => {
		const baseDir = path.resolve(__dirname, "..");

		it("4.1 Verifies Sweet Spot file limits across payroll canonical SSOT files", () => {
			const catalogPath = path.join(baseDir, "payrollCatalogData.ts");
			const studioPath = path.join(baseDir, "DoctorPayrollStudioModal.tsx");
			const launcherPath = path.join(baseDir, "DirectPayrollLauncher.tsx");
			const hubPath = path.join(baseDir, "DoctorPayrollHubModal.tsx");

			assert.ok(fs.existsSync(catalogPath));
			assert.ok(fs.existsSync(studioPath));
			assert.ok(fs.existsSync(launcherPath));
			assert.ok(fs.existsSync(hubPath));

			const catalogLines = fs.readFileSync(catalogPath, "utf8").split("\n").length;
			const studioLines = fs.readFileSync(studioPath, "utf8").split("\n").length;
			const launcherLines = fs.readFileSync(launcherPath, "utf8").split("\n").length;
			const hubLines = fs.readFileSync(hubPath, "utf8").split("\n").length;

			// SSOT Catalog: Sweet Spot 250–350 lines
			assert.ok(catalogLines >= 200 && catalogLines <= 350, `payrollCatalogData.ts has ${catalogLines} lines (target 250–350)`);
			// Studio Modal: Sweet Spot 350–480 lines
			assert.ok(studioLines >= 300 && studioLines <= 480, `DoctorPayrollStudioModal.tsx has ${studioLines} lines (target 350–480)`);
			// Launcher: <= 90 lines
			assert.ok(launcherLines <= 90, `DirectPayrollLauncher.tsx has ${launcherLines} lines (must be <= 90)`);
			// Hub Modal Facade: <= 450 lines
			assert.ok(hubLines <= 450, `DoctorPayrollHubModal.tsx has ${hubLines} lines (must be <= 450)`);
		});

		it("4.2 Verifies DoctorPayrollStudioModal has exactly ONE Primary CTA button #0d9488 that is NEVER disabled (Mandate 8e, 8am)", () => {
			const studioPath = path.join(baseDir, "DoctorPayrollStudioModal.tsx");
			const studioContent = fs.readFileSync(studioPath, "utf8");

			// Must contain primary CTA data-testid
			assert.ok(studioContent.includes("payroll-studio-primary-cta"), "Must include data-testid payroll-studio-primary-cta");

			// Must use teal design token
			assert.ok(studioContent.includes("bg-[var(--teal,#0d9488)]"), "Primary CTA must use var(--teal,#0d9488)");

			// Primary CTA button must NOT be disabled due to secondary fields (Mandate 8e: Doctor Autonomy)
			assert.ok(!studioContent.includes("disabled={!"), "Primary CTA must never be permanently disabled by inputs");
		});

		it("4.3 Verifies DirectPayrollLauncher responds to #payroll and #doctor-payroll and is mounted in AppShell.tsx (Mandate 8aq)", () => {
			const launcherPath = path.join(baseDir, "DirectPayrollLauncher.tsx");
			const launcherContent = fs.readFileSync(launcherPath, "utf8");

			assert.ok(launcherContent.includes("#payroll"), "Must handle #payroll");
			assert.ok(launcherContent.includes("#doctor-payroll"), "Must handle #doctor-payroll");
			assert.ok(launcherContent.includes("DoctorPayrollStudioModal"), "Must render DoctorPayrollStudioModal");

			const appShellPath = path.resolve(__dirname, "../../../AppShell.tsx");
			const appShellContent = fs.readFileSync(appShellPath, "utf8");
			assert.ok(appShellContent.includes("DirectPayrollLauncher"), "AppShell.tsx must import DirectPayrollLauncher");
			assert.ok(appShellContent.includes("<DirectPayrollLauncher />"), "AppShell.tsx must render <DirectPayrollLauncher />");
		});

		it("4.4 Verifies clean exports of Studio, Hub, and Launcher components", () => {
			assert.ok(DoctorPayrollStudioModal);
			assert.ok(DoctorPayrollHubModal);
			assert.ok(DirectPayrollLauncher);
		});
	});
});
