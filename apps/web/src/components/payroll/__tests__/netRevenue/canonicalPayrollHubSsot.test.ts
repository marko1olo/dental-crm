/**
 * canonicalPayrollHubSsot.test.ts — Verification of Canonical SSOT Payroll Hub & Kopeck Engine
 * Mandate 8b (Sweet Spot limits), Mandate 8e (Doctor Autonomy), Mandate 8n (Solo Practice Sovereignty).
 * Tests integer Net Revenue arithmetic, solo chair rental, assistant piecework, and 1-click settlement.
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
	calculateAssistantPiecework,
	calculateDoctorPayrollFromOrders,
	getQuickPeriodDates,
	generateDoctorPayslipA5Html,
	generateDoctorPayslipMessengerText,
	CANONICAL_PAYROLL_DOCTORS,
	CANONICAL_DEMO_ORDERS,
} from "../../payrollCatalogData";
import { DoctorPayrollHubModal } from "../../DoctorPayrollHubModal";
import { DirectPayrollLauncher } from "../../DirectPayrollLauncher";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("Canonical SSOT Payroll Hub & Kopeck-Exact Engine", () => {
	it("1.1 computeNetBaseKopecks: Gross − Lab − Materials = Net Base in exact kopecks", () => {
		// Gross 42 000 ₽ (4 200 000 kop), Lab 9 500 ₽ (950 000 kop), Materials 1 800 ₽ (180 000 kop)
		const netBase = computeNetBaseKopecks(4200000, 950000, 180000);
		assert.equal(netBase, 3070000, "Net base must equal 30 700 ₽ (3 070 000 kop)");

		// Zero negative base on excessive expenses
		const clampZero = computeNetBaseKopecks(500000, 400000, 200000);
		assert.equal(clampZero, 0, "Net base cannot drop below 0");
	});

	it("1.2 calculateDoctorCommissionKopecks: 20–35% commission on Net Base without float drift", () => {
		// 30% on 30 700 ₽ = 9 210 ₽ (921 000 kop)
		const fee30 = calculateDoctorCommissionKopecks(3070000, 30);
		assert.equal(fee30, 921000);

		// 25% on 14 500 ₽ − 1 800 ₽ = 12 700 ₽ (1 270 000 kop) -> 3 175 ₽ (317 500 kop)
		const fee25 = calculateDoctorCommissionKopecks(1270000, 25);
		assert.equal(fee25, 317500);

		// 35% on 41 000 ₽ (4 100 000 kop) -> 14 350 ₽ (1 435 000 kop)
		const fee35 = calculateDoctorCommissionKopecks(4100000, 35);
		assert.equal(fee35, 1435000);
	});

	it("1.3 calculateSoloDoctorRentalModel: Mandate 8n Solo Doctor 100% net profit minus chair rental", () => {
		// Gross 32 000 ₽, Lab 2 500 ₽, Materials 3 500 ₽ -> Net Base 26 000 ₽
		// Shifts: 5 shifts * 4 000 ₽ = 20 000 ₽ rent. Advance: 2 000 ₽.
		// Payout: 26 000 ₽ − 20 000 ₽ − 2 000 ₽ = 4 000 ₽
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
		// 10 shifts * 3 000 ₽ = 30 000 ₽
		// 15 hours * 400 ₽ = 6 000 ₽
		// 4 surgeries * 1 500 ₽ = 6 000 ₽
		// 20 x-rays * 200 ₽ = 4 000 ₽
		// Total: 46 000 ₽ (4 600 000 kop)
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

	it("1.5 calculateDoctorPayrollFromOrders: processes canonical demo orders cleanly", () => {
		const volkov = CANONICAL_PAYROLL_DOCTORS.find((d) => d.id === "doc-volkov")!;
		const calc = calculateDoctorPayrollFromOrders(CANONICAL_DEMO_ORDERS, volkov);

		assert.equal(calc.servicesCount, 2);
		assert.equal(calc.totalGrossKopecks, 8000000, "Gross is 38k + 42k = 80k ₽");
		assert.equal(calc.totalLabCostKopecks, 1800000, "Lab is 8.5k + 9.5k = 18k ₽");
		assert.equal(calc.totalMaterialCostKopecks, 330000, "Materials is 1.5k + 1.8k = 3.3k ₽");
		assert.equal(calc.totalNetBaseKopecks, 5870000, "Net base is 80k - 18k - 3.3k = 58.7k ₽");
		assert.equal(calc.commissionPercent, 30);
		assert.equal(calc.earnedDoctorKopecks, 1761000, "30% of 58 700 ₽ = 17 610 ₽");
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
		const volkov = CANONICAL_PAYROLL_DOCTORS.find((d) => d.id === "doc-volkov")!;
		const calc = calculateDoctorPayrollFromOrders(CANONICAL_DEMO_ORDERS, volkov);

		const html = generateDoctorPayslipA5Html(calc, volkov, "Стоматология DENTE");
		assert.ok(html.includes("РАСЧЕТНЫЙ ЛИСТОК ВРАЧА"));
		assert.ok(!html.includes("Форма Т-51"));
		assert.ok(html.includes("Главный бухгалтер:"));
		assert.ok(html.includes("Руководитель клиники:"));
		assert.ok(html.includes("Врач-специалист:"));

		const text = generateDoctorPayslipMessengerText(calc, volkov, "Стоматология DENTE");
		assert.ok(text.includes("Расчетный листок врача:"));
		assert.ok(text.includes("К ВЫПЛАТЕ:"));
	});

	it("3.1 Verifies Sweet Spot line limits for the new SSOT architecture (Mandate 8b)", () => {
		const baseDir = path.resolve(__dirname, "../..");
		const catalogPath = path.join(baseDir, "payrollCatalogData.ts");
		const hubPath = path.join(baseDir, "DoctorPayrollHubModal.tsx");
		const launcherPath = path.join(baseDir, "DirectPayrollLauncher.tsx");

		assert.ok(fs.existsSync(catalogPath));
		assert.ok(fs.existsSync(hubPath));
		assert.ok(fs.existsSync(launcherPath));

		const catalogLines = fs.readFileSync(catalogPath, "utf8").split("\n").length;
		const hubLines = fs.readFileSync(hubPath, "utf8").split("\n").length;
		const launcherLines = fs.readFileSync(launcherPath, "utf8").split("\n").length;

		assert.ok(catalogLines <= 350, `payrollCatalogData.ts has ${catalogLines} lines (must be <= 350)`);
		assert.ok(hubLines <= 450, `DoctorPayrollHubModal.tsx has ${hubLines} lines (must be <= 450)`);
		assert.ok(launcherLines <= 90, `DirectPayrollLauncher.tsx has ${launcherLines} lines (must be <= 90)`);
	});

	it("3.2 Verifies DirectPayrollLauncher is mounted in AppShell.tsx (Mandate 8aq)", () => {
		const appShellPath = path.resolve(__dirname, "../../../../AppShell.tsx");
		const appShellContent = fs.readFileSync(appShellPath, "utf8");

		assert.ok(appShellContent.includes("DirectPayrollLauncher"), "AppShell.tsx must import and mount DirectPayrollLauncher");
		assert.ok(appShellContent.includes("<DirectPayrollLauncher />"), "AppShell.tsx must render <DirectPayrollLauncher />");
	});

	it("3.3 Components export cleanly without errors", () => {
		assert.ok(DoctorPayrollHubModal);
		assert.ok(DirectPayrollLauncher);
	});
});
