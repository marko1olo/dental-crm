/**
 * DENTE Dental CRM — Doctor Payroll Studio & Net Revenue SSOT Test Suite
 * Compliance: Mandate 8b (Sweet Spot), Mandate 8e (Doctor Autonomy & 0 Disabled Buttons),
 * Mandate 8n (Solo Practice & Net Revenue = Gross − Lab − Materials), Mandate 8am (Single Primary CTA #0d9488),
 * Mandate 8ze (Apple Mobile HIG: 390x844 Touch Targets >= 44x44px, Natural Thumb Zone, 0px Horizontal Drift).
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
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
import { DirectPayrollLauncher } from "../DirectPayrollLauncher";
import { setRuntimeDemoMode } from "../../../lib/demoMode";
import { useDoctorPayrollTabData } from "../../../views/financeView/payrollTabModules/useDoctorPayrollTabData";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("SSOT Suite: Canonical Doctor Payroll Studio & Net Revenue Invariants", () => {
	const baseDir = path.resolve(__dirname, "..");

	describe("1. Net Revenue Formula & Kopeck-Exact Zero-Float Engine (Mandates 8e, 8n)", () => {
		it("1.1 computeNetBaseKopecks: strictly deducts dental lab (ЗТЛ) and materials from Gross 54-FZ revenue", () => {
			// Ортопедия: коронка 38 000 ₽ (3 800 000 коп), наряд ЗТЛ 8 500 ₽ (850 000 коп), слепок 1 500 ₽ (150 000 коп)
			const grossKop = 3800000;
			const labCostKop = 850000;
			const matCostKop = 150000;
			const netBaseKop = computeNetBaseKopecks(grossKop, labCostKop, matCostKop);

			// Net Base = 3 800 000 - 850 000 - 150 000 = 2 800 000 коп (28 000 ₽)
			assert.equal(netBaseKop, 2800000);
			assert.ok(netBaseKop < grossKop, "Net Base must be lower than gross revenue after lab deduction");
		});

		it("1.2 calculateDoctorCommissionKopecks: computes exact integer percentage without float drift", () => {
			const netBaseKop = 2800000;
			const percent = 30; // 30% ортопеду
			const doctorFeeKop = calculateDoctorCommissionKopecks(netBaseKop, percent);

			// 2 800 000 * 30% = 840 000 коп (8 400 ₽)
			assert.equal(doctorFeeKop, 840000);
			assert.equal(Number.isInteger(doctorFeeKop), true);
		});

		it("1.3 calculateDoctorPayrollSummary: verifies all clinical specialties (orthopedics 30%, therapy 25%, surgery 35%, hygiene 20%)", () => {
			const volkov = CANONICAL_PAYROLL_DOCTORS.find((d) => d.id === "doc-volkov")!;
			const sokolova = CANONICAL_PAYROLL_DOCTORS.find((d) => d.id === "doc-sokolova")!;
			const morozov = CANONICAL_PAYROLL_DOCTORS.find((d) => d.id === "doc-morozov")!;
			const smirnova = CANONICAL_PAYROLL_DOCTORS.find((d) => d.id === "doc-smirnova")!;

			const sumVolkov = calculateDoctorPayrollSummary({ orders: CANONICAL_DEMO_ORDERS, doctor: volkov });
			const sumSokolova = calculateDoctorPayrollSummary({ orders: CANONICAL_DEMO_ORDERS, doctor: sokolova });
			const sumMorozov = calculateDoctorPayrollSummary({ orders: CANONICAL_DEMO_ORDERS, doctor: morozov });
			const sumSmirnova = calculateDoctorPayrollSummary({ orders: CANONICAL_DEMO_ORDERS, doctor: smirnova });

			// Волков (ортопед): Gross 8 000 000 коп, ЗТЛ 1 800 000 коп, Мат 330 000 коп -> Net Base 5 870 000 коп
			assert.equal(sumVolkov.totalGrossKopecks, 8000000);
			assert.equal(sumVolkov.totalLabCostKopecks, 1800000);
			assert.equal(sumVolkov.totalNetBaseKopecks, 5870000);
			assert.equal(sumVolkov.doctorAccruedKopecks, 1761000);

			// Соколова (терапевт): Gross 2 230 000 коп, ЗТЛ 0, Мат 270 000 коп -> Net Base 1 960 000 коп
			assert.equal(sumSokolova.totalGrossKopecks, 2230000);
			assert.equal(sumSokolova.totalLabCostKopecks, 0);
			assert.equal(sumSokolova.totalNetBaseKopecks, 1960000);

			// Морозов (хирург): Gross 6 500 000 коп, Мат (Имплант) 2 400 000 коп -> Net Base 4 100 000 коп -> 35% = 1 435 000 коп
			assert.equal(sumMorozov.totalMaterialCostKopecks, 2400000);
			assert.equal(sumMorozov.doctorAccruedKopecks, 1435000);

			// Смирнова (гигиенист): Gross 650 000 коп -> 20% = 116 000 коп
			assert.equal(sumSmirnova.totalGrossKopecks, 650000);
		});

		it("1.4 calculateSoloDoctorRentalModel: Solo practitioner 100% net margin minus chair rental (Mandate 8n)", () => {
			const res = calculateSoloDoctorRentalModel({
				grossRevenueKop: 5000000,
				labCostKop: 800000,
				materialCostKop: 200000,
				shiftsCount: 10,
				shiftRateKop: 400000, // 4 000 ₽ за смену = 40 000 ₽ аренда кресла
				advanceKop: 500000, // 5 000 ₽ аванс
			});

			// Net Base = 5 000 000 - 800 000 - 200 000 = 4 000 000 коп (40 000 ₽)
			assert.equal(res.netBaseKop, 4000000);
			assert.equal(res.chairRentKop, 4000000);
			assert.equal(res.doctorNetPayoutKop, 0); // 40 000 - 40 000 = 0
			assert.equal(res.clinicRentalProfitKop, 4000000);
		});

		it("1.5 calculateAssistantPiecework: Assistant hourly and per-shift piecework with surgical and x-ray bonuses", () => {
			const res = calculateAssistantPiecework({
				shiftsCount: 15,
				shiftRateKop: 250000, // 2 500 ₽/смена = 37 500 ₽
				hoursCount: 0,
				hourlyRateKop: 0,
				surgicalAssistanceCount: 6,
				surgicalBonusKop: 50000, // 500 ₽/операция = 3 000 ₽
				xraysCount: 20,
				xrayBonusKop: 10000, // 100 ₽/снимок = 2 000 ₽
			});

			assert.equal(res.totalAssistantPayoutKop, 4250000); // 42 500 ₽
		});
	});

	describe("2. Quick Period Presets & Closed Settlements Registry (Mandate 8e, 8x)", () => {
		it("2.1 getQuickPeriodDates: generates shift, today, yesterday, current week, and month presets", () => {
			const shift = getQuickPeriodDates("shift");
			const yesterday = getQuickPeriodDates("yesterday");
			const week = getQuickPeriodDates("current_week");
			const month = getQuickPeriodDates("current_month");

			assert.equal(shift.labelRu, "Смена");
			assert.equal(yesterday.labelRu, "Вчера");
			assert.equal(week.labelRu, "Текущая неделя");
			assert.equal(month.labelRu, "Текущий месяц");
		});

		it("2.2 CANONICAL_CLOSED_PERIODS: contains verified settlement records with RKO receipts", () => {
			assert.ok(CANONICAL_CLOSED_PERIODS.length >= 3);
			for (const p of CANONICAL_CLOSED_PERIODS) {
				assert.ok(p.id);
				assert.ok(p.periodLabelRu);
				assert.ok(p.rkoReceiptNumber.startsWith("РКО-"));
				assert.equal(p.isPaidRko, true);
				assert.ok(p.grossKopecks > 0);
				assert.ok(p.payoutKopecks > 0);
			}
		});

		it("2.3 Payslip generators: excludes Soviet bureaucratic codes and provides clean A4/A5 and Messenger formats (Mandate 8x)", () => {
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

			// Soviet codes prohibition
			assert.ok(!htmlA5.includes("Форма Т-51"));
			assert.ok(!htmlA5.includes("КНД 1151078"));
			assert.ok(htmlA5.includes("РАСЧЕТНЫЙ ЛИСТОК ВРАЧА"));
			assert.ok(htmlA4.includes("РАСЧЕТНЫЙ ЛИСТОК ВРАЧА"));
			assert.ok(htmlA5.includes("Главный бухгалтер:"));
			assert.ok(htmlA5.includes("Руководитель клиники:"));
			assert.ok(htmlA5.includes("Врач-специалист:"));

			// Clean messenger text
			assert.ok(msgText.includes("Расчетный листок врача:"));
			assert.ok(msgText.includes("К ВЫПЛАТЕ:"));
		});
	});

	describe("3. Architecture, File Limits & UI Mounting Invariants (Mandates 8b, 8e, 8aq, 8am)", () => {
		it("3.1 Verifies Sweet Spot file limits across payroll canonical SSOT files", () => {
			const catalogPath = path.join(baseDir, "payrollCatalogData.ts");
			const studioPath = path.join(baseDir, "DoctorPayrollStudioModal.tsx");
			const launcherPath = path.join(baseDir, "DirectPayrollLauncher.tsx");
			const cssPath = path.join(baseDir, "styles/doctorPayrollStudio.css");

			assert.ok(fs.existsSync(catalogPath));
			assert.ok(fs.existsSync(studioPath));
			assert.ok(fs.existsSync(launcherPath));
			assert.ok(fs.existsSync(cssPath));

			const catalogLines = fs.readFileSync(catalogPath, "utf8").split("\n").length;
			const studioLines = fs.readFileSync(studioPath, "utf8").split("\n").length;
			const launcherLines = fs.readFileSync(launcherPath, "utf8").split("\n").length;
			const cssLines = fs.readFileSync(cssPath, "utf8").split("\n").length;

			// SSOT Catalog: Sweet Spot 300–380 lines (and <= 350 for old test compatibility)
			assert.ok(catalogLines >= 200 && catalogLines <= 350, `payrollCatalogData.ts has ${catalogLines} lines (target 300–350)`);
			// Studio Modal: Sweet Spot 400–480 lines
			assert.ok(studioLines >= 380 && studioLines <= 480, `DoctorPayrollStudioModal.tsx has ${studioLines} lines (target 400–480)`);
			// Launcher: Sweet Spot 60–80 lines
			assert.ok(launcherLines >= 55 && launcherLines <= 85, `DirectPayrollLauncher.tsx has ${launcherLines} lines (target 60–80)`);
			// Studio CSS: Sweet Spot 250–350 lines
			assert.ok(cssLines >= 250 && cssLines <= 350, `doctorPayrollStudio.css has ${cssLines} lines (target 250–350)`);
		});

		it("3.2 Verifies DoctorPayrollStudioModal has exactly ONE Primary CTA button #0d9488 that is NEVER disabled (Mandates 8e, 8am)", () => {
			const studioPath = path.join(baseDir, "DoctorPayrollStudioModal.tsx");
			const content = fs.readFileSync(studioPath, "utf8");

			assert.ok(content.includes('data-testid="payroll-studio-primary-cta"'));
			assert.ok(content.includes("bg-[var(--teal,#0d9488)]"));
			assert.ok(!content.includes("disabled={true}"));
			assert.ok(!content.includes("disabled={!"));
		});

		it("3.3 Verifies 3 SSOT tabs exist in DoctorPayrollStudioModal (Summary, Details, Closed Periods)", () => {
			const studioPath = path.join(baseDir, "DoctorPayrollStudioModal.tsx");
			const content = fs.readFileSync(studioPath, "utf8");

			assert.ok(content.includes('data-testid="payroll-tab-summary"'), "Must contain summary tab");
			assert.ok(content.includes('data-testid="payroll-tab-details"'), "Must contain details tab");
			assert.ok(content.includes('data-testid="payroll-tab-closed-periods"'), "Must contain closed periods tab");
			assert.ok(content.includes("Сводная ведомость врачей"));
			assert.ok(content.includes("Детализация по услугам и ЗТЛ"));
			assert.ok(content.includes("Закрытые периоды и выплаты"));
		});

		it("3.4 Verifies DirectPayrollLauncher is mounted in AppShell.tsx and administrative registries (Mandate 8aq)", () => {
			const appShellPath = path.resolve(__dirname, "../../../AppShell.tsx");
			const appShellContent = fs.readFileSync(appShellPath, "utf8");
			assert.ok(appShellContent.includes("DirectPayrollLauncher"), "AppShell.tsx must import DirectPayrollLauncher");
			assert.ok(appShellContent.includes("<DirectPayrollLauncher />"), "AppShell.tsx must render <DirectPayrollLauncher />");

			const registryPath = path.resolve(__dirname, "../../appLayout/modalsContainerModules/standalone/administrativeLaunchersRegistry.tsx");
			const registryContent = fs.readFileSync(registryPath, "utf8");
			assert.ok(registryContent.includes("DirectPayrollLauncher"), "administrativeLaunchersRegistry must include DirectPayrollLauncher");

			const specializedPath = path.resolve(__dirname, "../../appLayout/modalsContainerModules/standalone/SpecializedAdministrativeLaunchers.tsx");
			const specializedContent = fs.readFileSync(specializedPath, "utf8");
			assert.ok(specializedContent.includes("DirectPayrollLauncher"), "SpecializedAdministrativeLaunchers must include DirectPayrollLauncher");
		});

		it("3.5 Verifies clean exports of Studio and Launcher components", () => {
			assert.ok(DoctorPayrollStudioModal);
			assert.ok(DirectPayrollLauncher);
		});
	});

	describe("4. Production vs Demo Showcase Mode Isolation (Mandates 8wy, 8d pt 7, 8e)", () => {
		function TestPayrollHookConsumer({ doctorsList }: { doctorsList?: any }) {
			const data = useDoctorPayrollTabData({ doctorsList });
			return (
				<div data-testid="hook-info">
					<span data-testid="doc-count">{data.doctors.length}</span>
					<span data-testid="active-doc-id">{data.activeDoctor.id}</span>
					<span data-testid="active-doc-name">{data.activeDoctor.name}</span>
				</div>
			);
		}

		it("4.1 Mandate 8d pt 7: strictly 0 cartoon emojis in payrollCatalogData.ts and messenger text", () => {
			const emojiRegex = /[\u{1F300}-\u{1F9FF}]/u;
			const catalogPath = path.join(baseDir, "payrollCatalogData.ts");
			const catalogContent = fs.readFileSync(catalogPath, "utf8");

			assert.ok(!emojiRegex.test(catalogContent), "payrollCatalogData.ts must not contain any cartoon emojis");

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

			const messengerText = generateDoctorPayslipMessengerText(calcCompat, volkov, "Стоматология DENTE");
			assert.ok(!emojiRegex.test(messengerText), "Messenger text must not contain any cartoon emojis");
			assert.ok(messengerText.includes("[Расчетный листок]"), "Must include textual tag [Расчетный листок]");
			assert.ok(messengerText.includes("Выручка (54-ФЗ):"), "Must include textual marker Выручка (54-ФЗ):");
			assert.ok(messengerText.includes("ЗТЛ:"), "Must include textual marker ЗТЛ:");
			assert.ok(messengerText.includes("Материалы:"), "Must include textual marker Материалы:");
			assert.ok(messengerText.includes("ИТОГО К ВЫПЛАТЕ:"), "Must include textual marker ИТОГО К ВЫПЛАТЕ:");
		});

		it("4.2 Mandate 8wy: DoctorPayrollStudioModal in production mode strictly isolates mockups and shows honest Empty State", () => {
			setRuntimeDemoMode(false);
			try {
				const prodHtml = renderToString(<DoctorPayrollStudioModal isOpen={true} onClose={() => {}} />);

				// Zero mockup leakage
				assert.ok(!prodHtml.includes("ОРТ-2401"), "Production mode must not leak CANONICAL_DEMO_ORDERS ОРТ-2401");
				assert.ok(!prodHtml.includes("ХИР-3301"), "Production mode must not leak CANONICAL_DEMO_ORDERS ХИР-3301");
				assert.ok(!prodHtml.includes("Волков"), "Production mode must not leak CANONICAL_PAYROLL_DOCTORS Волков");
				assert.ok(!prodHtml.includes("РКО-09/26-1"), "Production mode must not leak CANONICAL_CLOSED_PERIODS");

				// Honest empty state
				assert.ok(prodHtml.includes("Нет закрытых нарядов за выбранный период"), "Production mode must show honest Empty State");
				assert.ok(prodHtml.includes("0 ₽"), "Production mode with no orders must show 0 ₽ payout");

				// Mandate 8e: Primary CTA button is never disabled
				assert.ok(prodHtml.includes('data-testid="payroll-studio-primary-cta"'), "Primary CTA button must exist");
				assert.ok(!prodHtml.includes("disabled"), "Buttons must never be disabled (Mandate 8e)");
			} finally {
				setRuntimeDemoMode(null);
			}
		});

		it("4.3 Mandate 8wy: DoctorPayrollStudioModal in demo showcase mode renders rich demonstration data", () => {
			setRuntimeDemoMode(true);
			try {
				const demoHtml = renderToString(<DoctorPayrollStudioModal isOpen={true} onClose={() => {}} />);

				assert.ok(demoHtml.includes("Волков"), "Demo mode must showcase canonical doctor Волков");
				assert.ok(!demoHtml.includes("Нет закрытых нарядов за выбранный период"), "Demo mode must not show empty state");
			} finally {
				setRuntimeDemoMode(null);
			}
		});

		it("4.4 Mandate 8wy: useDoctorPayrollTabData isolates default doctors between prod and demo modes", () => {
			// Production mode without doctorsList -> empty doctors list
			setRuntimeDemoMode(false);
			try {
				const prodHtml = renderToString(<TestPayrollHookConsumer />);
				assert.ok(prodHtml.includes('<span data-testid="doc-count">0</span>'), "Prod mode must return 0 doctors when none registered");
				assert.ok(prodHtml.includes("Врачи не зарегистрированы"), "Prod mode must provide honest placeholder for active doctor");

				// Explicit doctors list passed -> used as is
				const explicitHtml = renderToString(<TestPayrollHookConsumer doctorsList={[{ id: "doc-custom", name: "Д-р Тестовый", specialtyId: "therapy" }]} />);
				assert.ok(explicitHtml.includes('<span data-testid="doc-count">1</span>'), "Explicit doctors list must be respected");
				assert.ok(explicitHtml.includes("doc-custom"), "Active doctor must reflect custom doctor");
			} finally {
				setRuntimeDemoMode(null);
			}

			// Demo mode without doctorsList -> showcases DEFAULT_DOCTORS
			setRuntimeDemoMode(true);
			try {
				const demoHtml = renderToString(<TestPayrollHookConsumer />);
				assert.ok(demoHtml.includes('<span data-testid="doc-count">4</span>'), "Demo mode must default to 4 showcase doctors");
				assert.ok(demoHtml.includes("doc-1"), "Demo mode active doctor must be doc-1");
			} finally {
				setRuntimeDemoMode(null);
			}
		});
	});
});
