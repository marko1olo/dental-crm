/**
 * scripts/audit_cashier_payroll_layout.cjs
 *
 * Playwright visual audit capture script for:
 * 1. Cashier Shifts & 54-FZ Cash Register ARM (CashShiftWidget, ShiftCloseZReportModal, CashRegisterModal)
 * 2. Doctor Piece-Rate Payroll & T-51 Statutory Pay Sheet (DoctorPayoutDashboard, DoctorPayrollModal, DoctorPieceRateCalculatorSection)
 * 3. 100% Doctor Warranty Discounts & Mobile Payout Wallet (PaymentCapture, DoctorPayoutMobileWallet)
 *
 * Captures 4 states: PC Light (1440x900), PC Dark (1440x900), Mobile Light (390x844), Mobile Dark (390x844).
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const outputDirs = [
	path.resolve(__dirname, "../docs/screenshots/audit_cashier_payroll"),
	path.resolve("C:/Users/Admin/.gemini/antigravity/brain/d5458772-cea5-45fe-9b05-2a284dd8ffec"),
];

for (const dir of outputDirs) {
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}
}

async function saveScreenshot(page, filename) {
	for (const dir of outputDirs) {
		const targetPath = path.join(dir, filename);
		await page.screenshot({ path: targetPath, fullPage: false });
		const stats = fs.statSync(targetPath);
		console.log(`>>> Saved [${filename}]: ${targetPath} (${stats.size} bytes)`);
	}
}

async function main() {
	console.log("=== CAPTURING RED TEAM 3 LIVE AUDIT SCREENSHOTS ===");

	const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
	const executablePath = fs.existsSync(chromePath) ? chromePath : undefined;

	console.log(`>>> Launching browser (executable: ${executablePath || "bundled"})...`);
	const browser = await chromium.launch({
		headless: true,
		executablePath,
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	try {
		async function createConfiguredContext(isMobile, theme) {
			const viewport = isMobile
				? { width: 390, height: 844 }
				: { width: 1440, height: 900 };

			const context = await browser.newContext({
				viewport,
				deviceScaleFactor: 2,
				isMobile: !!isMobile,
				hasTouch: !!isMobile,
			});

			await context.addInitScript(({ selectedTheme }) => {
				localStorage.setItem("dente_clinic_token", "live-inquisition-clinic-token");
				localStorage.setItem("dente_staff_token", "live-inquisition-staff-token");
				localStorage.setItem("dente_active_role", "owner");
				localStorage.setItem("dente_demo_showcase", "true");
				localStorage.setItem("dente_tour_completed", "true");
				localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
				localStorage.setItem(
					"dente_guide_tour_seen_roles_v2",
					JSON.stringify(["admin", "doctor", "director", "owner"]),
				);
				localStorage.setItem(
					"dente_theme_mode",
					selectedTheme,
				);
				document.documentElement.setAttribute("data-theme", selectedTheme);
				document.documentElement.classList.toggle("dark", selectedTheme === "dark");
			}, { selectedTheme: theme });

			return context;
		}

		// ═════════════════════════════════════════════════════════════════════════
		// 1. АРМ КАССЫ И ВИДЖЕТ СМЕНЫ (CashShiftWidget)
		// ═════════════════════════════════════════════════════════════════════════
		console.log("\n>>> [1/8] Capturing Cash Shift Widget & Cashier ARM...");
		for (const theme of ["light", "dark"]) {
			// PC
			{
				const ctx = await createConfiguredContext(false, theme);
				const page = await ctx.newPage();
				await page.goto(
					`http://127.0.0.1:5173/cashier_payroll_preview.html?view=cash_shift&theme=${theme}`,
					{ waitUntil: "networkidle", timeout: 30000 },
				);
				await page.waitForSelector(".cash-shift-container", { visible: true, timeout: 15000 });
				await page.waitForTimeout(600);
				await saveScreenshot(page, `01_cashier_shift_arm_pc_${theme}.png`);
				await ctx.close();
			}
			// Mobile
			{
				const ctx = await createConfiguredContext(true, theme);
				const page = await ctx.newPage();
				await page.goto(
					`http://127.0.0.1:5173/cashier_payroll_preview.html?view=cash_shift&theme=${theme}`,
					{ waitUntil: "networkidle", timeout: 30000 },
				);
				await page.waitForSelector(".cash-shift-container", { visible: true, timeout: 15000 });
				await page.waitForTimeout(600);
				await saveScreenshot(page, `01_cashier_shift_arm_mobile_${theme}.png`);
				await ctx.close();
			}
		}

		// ═════════════════════════════════════════════════════════════════════════
		// 2. МОДАЛКА ЗАКРЫТИЯ СМЕНЫ И Z-ОТЧЕТА 54-ФЗ (ShiftCloseZReportModal)
		// ═════════════════════════════════════════════════════════════════════════
		console.log("\n>>> [2/8] Capturing 54-FZ Shift Close Z-Report Modal...");
		for (const theme of ["light", "dark"]) {
			// PC
			{
				const ctx = await createConfiguredContext(false, theme);
				const page = await ctx.newPage();
				await page.goto(
					`http://127.0.0.1:5173/cashier_payroll_preview.html?view=z_report&theme=${theme}`,
					{ waitUntil: "networkidle", timeout: 30000 },
				);
				await page.waitForSelector('[data-testid="shift-close-zreport-modal"]', { visible: true, timeout: 15000 });
				await page.waitForTimeout(600);
				await saveScreenshot(page, `02_cashier_z_report_modal_pc_${theme}.png`);
				await ctx.close();
			}
			// Mobile
			{
				const ctx = await createConfiguredContext(true, theme);
				const page = await ctx.newPage();
				await page.goto(
					`http://127.0.0.1:5173/cashier_payroll_preview.html?view=z_report&theme=${theme}`,
					{ waitUntil: "networkidle", timeout: 30000 },
				);
				await page.waitForSelector('[data-testid="shift-close-zreport-modal"]', { visible: true, timeout: 15000 });
				await page.waitForTimeout(600);
				await saveScreenshot(page, `02_cashier_z_report_modal_mobile_${theme}.png`);
				await ctx.close();
			}
		}

		// ═════════════════════════════════════════════════════════════════════════
		// 3. МОДАЛКА КАССОВОГО ЯЩИКА И АППАРАТА (CashRegisterModal)
		// ═════════════════════════════════════════════════════════════════════════
		console.log("\n>>> [3/8] Capturing Cash Register & Drawer Modal...");
		for (const theme of ["light", "dark"]) {
			// PC
			{
				const ctx = await createConfiguredContext(false, theme);
				const page = await ctx.newPage();
				await page.goto(
					`http://127.0.0.1:5173/cashier_payroll_preview.html?view=cash_register&theme=${theme}`,
					{ waitUntil: "networkidle", timeout: 30000 },
				);
				await page.waitForSelector('[data-testid="cash-register-modal"]', { visible: true, timeout: 15000 });
				await page.waitForTimeout(600);
				await saveScreenshot(page, `03_cash_register_drawer_modal_pc_${theme}.png`);
				await ctx.close();
			}
			// Mobile
			{
				const ctx = await createConfiguredContext(true, theme);
				const page = await ctx.newPage();
				await page.goto(
					`http://127.0.0.1:5173/cashier_payroll_preview.html?view=cash_register&theme=${theme}`,
					{ waitUntil: "networkidle", timeout: 30000 },
				);
				await page.waitForSelector('[data-testid="cash-register-modal"]', { visible: true, timeout: 15000 });
				await page.waitForTimeout(600);
				await saveScreenshot(page, `03_cash_register_drawer_modal_mobile_${theme}.png`);
				await ctx.close();
			}
		}

		// ═════════════════════════════════════════════════════════════════════════
		// 4. ДЕСКТОПНАЯ ВЕДОМОСТЬ ВЫПЛАТ ВРАЧАМ (DoctorPayoutDashboard)
		// ═════════════════════════════════════════════════════════════════════════
		console.log("\n>>> [4/8] Capturing Doctor Payout Dashboard (Live #analytics)...");
		for (const theme of ["light", "dark"]) {
			const ctx = await createConfiguredContext(false, theme);
			const page = await ctx.newPage();

			// Mock /api/billing/payouts so DoctorPayoutDashboard renders completely populated
			await page.route("**/api/billing/payouts*", async (route) => {
				const mockData = {
					scope: "all",
					isEmpty: false,
					methodNote: "Расчёт по кассовому методу IDENT с удержанием ЗТЛ и защитой расходников Уровня 1",
					period: {
						from: "2026-10-01T00:00:00.000Z",
						to: "2026-10-31T23:59:59.000Z",
					},
					rows: [
						{
							doctorUserId: "doc-sokolov-01",
							doctorName: "Д-р Соколов А. В.",
							role: "Стоматолог-терапевт, ортопед",
							isActive: true,
							revenueRub: 348000,
							paymentCount: 14,
							materialCostRub: 2800,
							materialMovements: 14,
							materialMovementsUnpriced: 0,
							materialsState: "counted",
							labCostRub: 14000,
							labOrdersCount: 2,
							withheldLabRub: 14000,
							commissionPct: 40,
							materialDeductionPct: 25,
							labDeductionPct: 100,
							rateEffectiveFrom: "2026-10-01",
							rateRowCount: 1,
							state: "computed",
							accruedRub: 139200,
							withheldMaterialRub: 700,
							payoutRub: 124500,
							note: "Согласованная ставка 40% с удержанием ЗТЛ и материалов Ур. 2",
							visits: [
								{
									visitId: "v-01",
									appointmentId: "app-01",
									paidAt: "2026-10-05T11:00:00.000Z",
									visitDate: "2026-10-05",
									patientId: "pat-01",
									patientName: "Ковалёв Роман Станиславович",
									medicalCardNumber: "043/у-102",
									revenueRub: 38000,
									paymentCount: 1,
									services: [
										{
											id: "srv-1",
											title: "Протезирование зуба коронкой из диоксида циркония e.max",
											order804nCode: "A16.07.006.002",
											toothCode: "16",
											priceRub: 32000,
											quantity: 1,
										},
									],
									materials: [
										{
											id: "mat-1",
											name: "Салфетки нагрудные (клиника)",
											quantity: 1,
											unit: "шт",
											unitCostRub: 4.5,
											totalCostRub: 4.5,
											isOverheadConsumable: true,
											coveredByClinic: true,
										},
									],
								},
							],
							labOrders: [
								{
									id: "lab-01",
									orderNumber: "ЗТЛ-2026-101",
									toothFdi: "16",
									restorationType: "Коронка цирконий Multi-Layer",
									material: "Katana",
									patientName: "Ковалёв Роман Станиславович",
									status: "ready_in_clinic",
									completedAt: "2026-10-04T12:00:00.000Z",
									priceRub: 14000,
									withheldRub: 14000,
									deductionPct: 100,
								},
							],
						},
					],
					totals: {
						revenueRub: 348000,
						paymentCount: 14,
						attributableRevenueRub: 348000,
						unattributedRevenueRub: 0,
						materialCostRub: 2800,
						labCostRub: 14000,
						accruedRub: 139200,
						withheldMaterialRub: 700,
						withheldLabRub: 14000,
						payoutRub: 124500,
						doctorsCounted: 1,
						doctorsWithoutRate: 0,
					},
					limitations: [
						"Расходники Уровня 1 защищены ст. 129 ТК РФ (салфетки, валики, перчатки оплачены 100% клиникой).",
					],
				};
				await route.fulfill({
					status: 200,
					contentType: "application/json",
					body: JSON.stringify(mockData),
				});
			});

			await page.goto(
				`http://127.0.0.1:5173/cashier_payroll_preview.html?view=doctor_payout_dashboard&theme=${theme}`,
				{ waitUntil: "networkidle", timeout: 30000 },
			);
			await page.waitForSelector("table.ops-table", {
				timeout: 15000,
			});
			await page.waitForTimeout(600);

			// Expand doctor row to show drill-down with transparent formula
			const expandBtn = page.locator('button:has-text("Детализация"), .ops-drilldown-toggle').first();
			if (await expandBtn.isVisible()) {
				await expandBtn.click();
				await page.waitForTimeout(600);
			}

			await saveScreenshot(page, `04_doctor_payout_dashboard_pc_${theme}.png`);
			await ctx.close();
		}

		// ═════════════════════════════════════════════════════════════════════════
		// 5. ОФИЦИАЛЬНАЯ ВЕДОМОСТЬ Т-51 / РАСЧЕТ ВРАЧА (DoctorPayrollModal)
		// ═════════════════════════════════════════════════════════════════════════
		console.log("\n>>> [5/8] Capturing Doctor Payroll T-51 Modal...");
		for (const theme of ["light", "dark"]) {
			// PC
			{
				const ctx = await createConfiguredContext(false, theme);
				const page = await ctx.newPage();
				await page.goto(
					`http://127.0.0.1:5173/cashier_payroll_preview.html?view=doctor_payroll_t51&theme=${theme}`,
					{ waitUntil: "networkidle", timeout: 30000 },
				);
				await page.waitForSelector('[data-testid="doctor-payroll-modal"]', { visible: true, timeout: 15000 });
				await page.waitForTimeout(600);
				await saveScreenshot(page, `05_doctor_payroll_t51_modal_pc_${theme}.png`);
				await ctx.close();
			}
			// Mobile
			{
				const ctx = await createConfiguredContext(true, theme);
				const page = await ctx.newPage();
				await page.goto(
					`http://127.0.0.1:5173/cashier_payroll_preview.html?view=doctor_payroll_t51&theme=${theme}`,
					{ waitUntil: "networkidle", timeout: 30000 },
				);
				await page.waitForSelector('[data-testid="doctor-payroll-modal"]', { visible: true, timeout: 15000 });
				await page.waitForTimeout(600);
				await saveScreenshot(page, `05_doctor_payroll_t51_modal_mobile_${theme}.png`);
				await ctx.close();
			}
		}

		// ═════════════════════════════════════════════════════════════════════════
		// 6. КАЛЬКУЛЯТОР СДЕЛЬНОЙ ОПЛАТЫ И МОТИВАЦИИ (DoctorPieceRateCalculatorSection)
		// ═════════════════════════════════════════════════════════════════════════
		console.log("\n>>> [6/8] Capturing Doctor Piece-Rate Calculator Section...");
		for (const theme of ["light", "dark"]) {
			const ctx = await createConfiguredContext(false, theme);
			const page = await ctx.newPage();
			await page.goto(
				`http://127.0.0.1:5173/cashier_payroll_preview.html?view=piece_rate_calculator&theme=${theme}`,
				{ waitUntil: "networkidle", timeout: 30000 },
			);
			await page.waitForSelector('[data-testid="doctor-piece-rate-calculator-section"]', { visible: true, timeout: 15000 });
			await page.waitForTimeout(600);
			await saveScreenshot(page, `06_doctor_piece_rate_calculator_pc_${theme}.png`);
			await ctx.close();
		}

		// ═════════════════════════════════════════════════════════════════════════
		// 7. МОБИЛЬНЫЙ КОШЕЛЕК ВЫПЛАТ ВРАЧА (DoctorPayoutMobileWallet - 390x844)
		// ═════════════════════════════════════════════════════════════════════════
		console.log("\n>>> [7/8] Capturing Doctor Payout Mobile Wallet...");
		for (const theme of ["light", "dark"]) {
			const ctx = await createConfiguredContext(true, theme);
			const page = await ctx.newPage();
			await page.goto(
				`http://127.0.0.1:5173/cashier_payroll_preview.html?view=mobile_wallet&theme=${theme}`,
				{ waitUntil: "networkidle", timeout: 30000 },
			);
			await page.waitForSelector(".doctor-wallet-container", { visible: true, timeout: 15000 });
			await page.waitForTimeout(600);
			await saveScreenshot(page, `07_doctor_payout_mobile_wallet_${theme}.png`);
			await ctx.close();
		}

		// ═════════════════════════════════════════════════════════════════════════
		// 8. ПРИМЕНЕНИЕ 100% ГАРАНТИЙНОЙ СКИДКИ ВРАЧА (PaymentCapture)
		// ═════════════════════════════════════════════════════════════════════════
		console.log("\n>>> [8/8] Capturing 100% Doctor Warranty Discount & 0.00 Rub Check...");
		for (const theme of ["light", "dark"]) {
			// PC
			{
				const ctx = await createConfiguredContext(false, theme);
				const page = await ctx.newPage();
				await page.goto(
					`http://127.0.0.1:5173/cashier_payroll_preview.html?view=warranty_discount&theme=${theme}`,
					{ waitUntil: "networkidle", timeout: 30000 },
				);
				await page.waitForTimeout(600);

				// Expand discount accordion if present
				await page.evaluate(() => {
					document.querySelectorAll("details").forEach((d) => {
						d.open = true;
					});
				});
				await page.waitForTimeout(400);

				// Click 100% Warranty button
				const warrantyBtn = page.locator('[data-testid="btn-doctor-discount-warranty"]').first();
				if (await warrantyBtn.isVisible()) {
					await warrantyBtn.click();
					await page.waitForTimeout(600);
				}

				await saveScreenshot(page, `08_guarantee_100_discount_pc_${theme}.png`);
				await ctx.close();
			}
			// Mobile
			{
				const ctx = await createConfiguredContext(true, theme);
				const page = await ctx.newPage();
				await page.goto(
					`http://127.0.0.1:5173/cashier_payroll_preview.html?view=warranty_discount&theme=${theme}`,
					{ waitUntil: "networkidle", timeout: 30000 },
				);
				await page.waitForTimeout(600);

				// Expand discount accordion on mobile
				await page.evaluate(() => {
					document.querySelectorAll("details").forEach((d) => {
						d.open = true;
					});
				});
				await page.waitForTimeout(400);

				// Click 100% Warranty button on mobile
				const warrantyBtn = page.locator('[data-testid="btn-doctor-discount-warranty"]').first();
				if (await warrantyBtn.isVisible()) {
					await warrantyBtn.click();
					await page.waitForTimeout(600);
				}

				await saveScreenshot(page, `08_guarantee_100_discount_mobile_${theme}.png`);
				await ctx.close();
			}
		}

		console.log("\n=======================================================");
		console.log(">>> ALL RED TEAM 3 AUDIT SCREENSHOTS CAPTURED CLEANLY! <<<");
		console.log("=======================================================");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("Fatal error during capture:", err);
	process.exit(1);
});
