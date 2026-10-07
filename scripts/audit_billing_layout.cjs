/**
 * scripts/audit_billing_layout.cjs
 *
 * Real Live Session Playwright inquisition capture script for:
 * 1. CashboxView (#finance -> open cashbox modal / cash register ARM)
 * 2. InvoicesView / FinanceInvoicesModal (#invoices)
 * 3. RetailProductsModal (Showcase: Curaprox, Marvis, Waterpik, Gift Certificates)
 * 4. PaymentModal (1-Click checkout cockpit, quick cash bills, change HUD, 54-FZ tape)
 * 5. FiscalReceipt54FzModal (FFD 1.2 fiscalization, refund, 1C XML, act 804n, tax certificate)
 *
 * 4 States captured:
 * - PC Light (1440x900)
 * - PC Dark (1440x900)
 * - Mobile Light (390x844)
 * - Mobile Dark (390x844)
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const outputDir = path.resolve(__dirname, "../docs/screenshots/audit_billing");
if (!fs.existsSync(outputDir)) {
	fs.mkdirSync(outputDir, { recursive: true });
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function provisionLiveSession() {
	const API_BASE = "http://127.0.0.1:4100";
	const uniqueId = Date.now();
	console.log("[Provisioning] Initializing live clinic session on Fastify API 4100...");

	const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			clinicName: "Стоматология ДЕНТЕ Премиум",
			email: `cashier-audit-${uniqueId}@dente-crm.ru`,
			password: "Password123!",
			ownerName: "Д-р Воронов Алексей Владимирович",
			ownerPin: "1234",
		}),
	});

	if (!initRes.ok) {
		throw new Error(`Clinic setup failed: ${await initRes.text()}`);
	}
	const initData = await initRes.json();

	const unlockRes = await fetch(`${API_BASE}/api/auth/staff/unlock`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-dente-clinic-token": initData.clinicToken,
		},
		body: JSON.stringify({ userId: initData.ownerUserId, pinCode: "1234" }),
	});

	if (!unlockRes.ok) {
		throw new Error(`Staff unlock failed: ${await unlockRes.text()}`);
	}
	const unlockData = await unlockRes.json();

	const headers = {
		"Content-Type": "application/json",
		"x-dente-clinic-token": initData.clinicToken,
		"x-dente-staff-token": unlockData.staffToken,
	};

	let patientId = null;
	try {
		const pRes = await fetch(`${API_BASE}/api/patients`, {
			method: "POST",
			headers,
			body: JSON.stringify({
				fullName: "Ковалёв Роман Станиславович",
				phone: "+7 (999) 888-77-66",
				birthDate: "1988-04-12",
				gender: "male",
				allergies: "Лидокаин",
				notes: "Курс ортопедического лечения (коронки e.max, имплантация)",
			}),
		});
		if (pRes.ok) {
			const pData = await pRes.json();
			patientId = pData.patient?.id || pData.id || null;
			console.log(`[Provisioning] Created patient for billing: ${patientId}`);
		}
	} catch (e) {
		console.warn("[Provisioning] Patient creation note:", e.message);
	}

	return {
		clinicToken: initData.clinicToken,
		staffToken: unlockData.staffToken,
		ownerUserId: initData.ownerUserId,
		patientId,
	};
}

const viewports = [
	{ name: "pc", width: 1440, height: 900, isMobile: false },
	{ name: "mobile", width: 390, height: 844, isMobile: true, hasTouch: true },
];

const themes = ["light", "dark"];

async function main() {
	console.log("=== STARTING BILLING AUDIT PLAYWRIGHT SUITE ===");
	const auth = await provisionLiveSession();

	const browser = await chromium.launch({
		channel: "msedge",
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
	});

	try {
		for (const vp of viewports) {
			for (const theme of themes) {
				const label = `${vp.name}_${theme}`;
				console.log(`\n--- Capturing suite for: ${label} (${vp.width}x${vp.height}, theme=${theme}) ---`);

				const context = await browser.newContext({
					viewport: { width: vp.width, height: vp.height },
					isMobile: vp.isMobile,
					hasTouch: vp.hasTouch,
					colorScheme: theme,
				});

				// Inject live tokens and setup
				await context.addInitScript(
					({ ct, st, uid, pid, th }) => {
						localStorage.setItem("dente_clinic_token", ct);
						localStorage.setItem("dente_staff_token", st);
						localStorage.setItem("dente_active_role", "owner");
						localStorage.setItem("dente_user_role", "owner");
						localStorage.setItem("dente_workspace_perspective", "owner");
						localStorage.setItem("dente_theme_mode", th);
						localStorage.setItem("dente_onboarding_completed", "true");
						localStorage.setItem("dente_demo_showcase", "false");
						localStorage.setItem("dente_tour_completed", "true");
						localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
						localStorage.setItem("dente_guide_tour_seen_roles_v2", '["admin","doctor","director"]');
						localStorage.setItem(
							"dente_ui_preferences_v1",
							JSON.stringify({ onboardingDismissed: true, onboardingStep: "done", version: 1 }),
						);
						localStorage.setItem(
							"dental-crm:onboarding:v1",
							JSON.stringify({ dismissed: true, step: "done", completed: true, onboardingDismissed: true, onboardingStep: "done", version: 1 }),
						);
						localStorage.setItem(
							"dental-crm:web-ui-preferences:v1",
							JSON.stringify({ version: 1, uiLanguage: "ru", selectedWorkspaceRole: "owner", selectedPatientId: pid, onboardingDismissed: true, onboardingStep: "done" }),
						);
						localStorage.setItem(
							"dente-workspace-profile",
							JSON.stringify({
								state: {
									clinicName: "Стоматология ДЕНТЕ Премиум",
									currentDoctor: { id: uid, fullName: "Д-р Воронов Алексей Владимирович", role: "owner" },
									flags: { disableTour: true },
								},
							}),
						);

						// Seed sample invoices
						const todayStr = new Date().toISOString().slice(0, 10);
						const sampleInvoices = [
							{
								id: "inv-inq-001",
								number: "СЧ-2026-0042",
								patientId: pid || "pat-001",
								patientName: "Ковалёв Роман Станиславович",
								patientPhone: "+7 (999) 888-77-66",
								doctorName: "Д-р Воронов А. В.",
								date: todayStr,
								createdAt: new Date().toISOString(),
								totalAmountRub: 7500,
								paidAmountRub: 0,
								status: "issued",
								items: [
									{
										id: "item-1",
										code804n: "A16.07.002.001",
										name: "Восстановление зуба пломбой (светоотверждаемый композит)",
										quantity: 1,
										priceRub: 4500,
										totalRub: 4500,
										toothNumber: 16,
									},
									{
										id: "item-2",
										code804n: "B01.065.001",
										name: "Прием (осмотр, консультация) врача-стоматолога первичный",
										quantity: 1,
										priceRub: 3000,
										totalRub: 3000,
									},
								],
							},
							{
								id: "inv-inq-002",
								number: "СЧ-2026-0041",
								patientId: pid || "pat-001",
								patientName: "Кузнецова Ольга Павловна",
								patientPhone: "+7 (925) 987-65-43",
								doctorName: "Д-р Воронов А. В.",
								date: todayStr,
								createdAt: new Date().toISOString(),
								totalAmountRub: 12000,
								paidAmountRub: 12000,
								status: "paid",
								paymentMethod: "card_terminal",
								items: [
									{
										id: "item-3",
										code804n: "A16.07.025",
										name: "Профессиональная гигиена полости рта (AirFlow + ультразвук)",
										quantity: 1,
										priceRub: 12000,
										totalRub: 12000,
									},
								],
							},
						];
						localStorage.setItem("dente_billing_invoices", JSON.stringify(sampleInvoices));

						// Suppress tour spotlight overlay
						const style = document.createElement("style");
						style.textContent = `
							[data-testid="doctor-training-coach-mark-card"],
							[data-testid="guided-tour-spotlight-overlay"],
							.tour-spotlight-root,
							.tour-backdrop-clickable-zone {
								display: none !important;
								pointer-events: none !important;
							}
						`;
						document.head.appendChild(style);
					},
					{
						ct: auth.clinicToken,
						st: auth.staffToken,
						uid: auth.ownerUserId,
						pid: auth.patientId,
						th: theme,
					},
				);

				const page = await context.newPage();

				// 1. Initial navigation to root and wait for boot completion
				console.log(`[${label}] Navigating to app root and waiting for workspace ready...`);
				await page.goto("http://127.0.0.1:5173", { waitUntil: "domcontentloaded", timeout: 25000 });
				await page.waitForSelector(".boot-state", { state: "detached", timeout: 25000 }).catch(() => {});
				await wait(1500);

				// Force theme explicitly
				await page.evaluate((th) => {
					document.documentElement.setAttribute("data-theme", th);
					if (th === "dark") {
						document.documentElement.classList.add("dark");
						document.documentElement.classList.remove("light");
					} else {
						document.documentElement.classList.add("light");
						document.documentElement.classList.remove("dark");
					}
					document.body.className = th;
					document.documentElement.style.colorScheme = th;
				}, theme);
				await wait(300);

				// Navigate to Finance page
				console.log(`[${label}] Switching to Finance hash...`);
				await page.evaluate(() => { window.location.hash = "finance"; });
				await wait(1500);
				await page.waitForSelector(".finance-monolithic-toolbar, [data-testid='btn-finance-open-invoices']", { timeout: 20000 }).catch(() => {});
				await wait(500);

				// -------------------------------------------------------------
				// 1. SCREENSHOT: CashboxView (АРМ Кассы 54-ФЗ)
				// -------------------------------------------------------------
				console.log(`[${label}] Capturing 01_cashbox_view...`);
				const optionsBtn = page.locator('[data-testid="finance-toolbar-options-btn"]').first();
				if (await optionsBtn.count() > 0) {
					await optionsBtn.click({ force: true });
					await wait(400);
				}
				const cashboxMenuBtn = page.locator('[data-testid="btn-finance-open-cashbox"]').first();
				if (await cashboxMenuBtn.count() > 0) {
					await cashboxMenuBtn.click({ force: true });
					await wait(1000);
				}
				await page.waitForSelector('[data-testid="modal-finance-cashbox"], .cashbox-view', { timeout: 10000 }).catch(() => {});
				await wait(500);

				await page.screenshot({
					path: path.join(outputDir, `01_cashbox_view_${label}.png`),
					fullPage: false,
				});

				// -------------------------------------------------------------
				// 3. SCREENSHOT: RetailProductsModal (from open CashboxView click "Витрина товаров")
				// -------------------------------------------------------------
				console.log(`[${label}] Capturing 03_retail_products...`);
				const retailBtn = page.locator('[data-testid="btn-open-retail-showcase"]').first();
				if (await retailBtn.count() > 0) {
					await retailBtn.click({ force: true });
					await wait(800);
					await page.waitForSelector('[data-testid="retail-products-modal"]', { timeout: 8000 }).catch(() => {});
					await wait(400);
				}
				await page.screenshot({
					path: path.join(outputDir, `03_retail_products_${label}.png`),
					fullPage: false,
				});

				// Close retail modal
				const closeRetailBtn = page.locator('[data-testid="btn-close-retail-modal"]').first();
				if (await closeRetailBtn.count() > 0) {
					await closeRetailBtn.click({ force: true });
					await wait(400);
				}

				// -------------------------------------------------------------
				// 4. SCREENSHOT: PaymentModal (from open CashboxView click "Сплит / Терминал...")
				// -------------------------------------------------------------
				console.log(`[${label}] Capturing 04_payment_modal...`);
				const grossInput = page.locator('#gross-amount-input').first();
				if (await grossInput.count() > 0) {
					await grossInput.fill('7500');
					await wait(500);
				}
				const openPaymentBtn = page.locator('[data-testid="btn-open-payment-modal"]').first();
				if (await openPaymentBtn.count() > 0) {
					await openPaymentBtn.click({ force: true });
					await wait(1000);
					await page.waitForSelector('[data-testid="payment-modal-studio"]', { timeout: 8000 }).catch(() => {});
					await wait(600);
				}
				await page.screenshot({
					path: path.join(outputDir, `04_payment_modal_${label}.png`),
					fullPage: false,
				});

				// Close payment modal
				const closePayBtn = page.locator('[data-testid="btn-close-payment-modal"], [data-testid="btn-close-payment-modal-mobile"]').filter({ visible: true }).first();
				if (await closePayBtn.count() > 0) {
					await closePayBtn.click({ force: true });
					await wait(500);
				}

				// Close cashbox modal
				const closeCashboxBtn = page.locator('[data-testid="btn-close-cashbox-modal"]').first();
				if (await closeCashboxBtn.count() > 0) {
					await closeCashboxBtn.click({ force: true });
					await wait(500);
				}

				// -------------------------------------------------------------
				// 2. SCREENSHOT: InvoicesView / FinanceInvoicesModal (#invoices)
				// -------------------------------------------------------------
				console.log(`[${label}] Capturing 02_invoices_registry...`);
				const openInvoicesBtn = page.locator('[data-testid="btn-finance-open-invoices"]').first();
				if (await openInvoicesBtn.count() > 0 && await openInvoicesBtn.isVisible()) {
					await openInvoicesBtn.click({ force: true });
					await wait(1000);
				} else {
					await page.evaluate(() => { window.location.hash = "invoices"; });
					await wait(1000);
				}
				await page.waitForSelector('[data-testid="invoices-view-container"]', { timeout: 8000 }).catch(() => {});
				await wait(500);

				await page.screenshot({
					path: path.join(outputDir, `02_invoices_registry_${label}.png`),
					fullPage: false,
				});

				// Close invoices modal if open
				const closeInvoicesBtn = page.locator('[data-testid="btn-invoices-close"]').first();
				if (await closeInvoicesBtn.count() > 0 && await closeInvoicesBtn.isVisible()) {
					await closeInvoicesBtn.click({ force: true });
					await wait(400);
				}

				// -------------------------------------------------------------
				// 5. SCREENSHOT: FiscalReceipt54FzModal (открываем акт и фискализацию 54-ФЗ)
				// -------------------------------------------------------------
				console.log(`[${label}] Capturing 05_fiscal_receipt_modal...`);
				await page.evaluate(() => { window.location.hash = "finance"; });
				await wait(600);

				const optionsBtn2 = page.locator('[data-testid="finance-toolbar-options-btn"]').first();
				if (await optionsBtn2.count() > 0) {
					await optionsBtn2.click({ force: true });
					await wait(400);
				}
				const billingActBtn = page.locator('[data-testid="btn-finance-open-billing-act"]').first();
				if (await billingActBtn.count() > 0) {
					await billingActBtn.click({ force: true });
					await wait(1000);
				}

				const fiscalBtn = page.locator('[data-testid="btn-fiscalize-54fz"]').first();
				if (await fiscalBtn.count() > 0) {
					await fiscalBtn.click({ force: true });
					await wait(1000);
				}
				await page.waitForSelector('[data-testid="tab-1c-export"], [data-testid="header-offline-fiscal-queue-badge"]', { timeout: 8000 }).catch(() => {});
				await wait(500);

				await page.screenshot({
					path: path.join(outputDir, `05_fiscal_receipt_modal_${label}.png`),
					fullPage: false,
				});

				await context.close();
			}
		}

		console.log("=== BILLING AUDIT PLAYWRIGHT SUITE COMPLETE ===");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("FATAL ERROR IN PLAYWRIGHT SUITE:", err);
	process.exit(1);
});
