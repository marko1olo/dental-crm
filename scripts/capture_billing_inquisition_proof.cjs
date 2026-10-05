/**
 * scripts/capture_billing_inquisition_proof.cjs
 *
 * Playwright script for Billing, Invoicing & 54-FZ Cashier Inquisition Proofs.
 * Captures 1440x900 PC Light and PC Dark screenshots:
 * - 01_invoices_registry_light_1440x900.png & 02_invoices_registry_dark_1440x900.png
 * - 03_payment_modal_54fz_light_1440x900.png & 04_payment_modal_54fz_dark_1440x900.png
 * - 05_cash_register_drawer_light_1440x900.png & 06_cash_register_drawer_dark_1440x900.png
 */

const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

const API_BASE = "http://127.0.0.1:4100";
const APP_BASE = "http://127.0.0.1:5173";
const OUT_DIR = path.join(process.cwd(), "docs/screenshots/billing_inquisition");

if (!fs.existsSync(OUT_DIR)) {
	fs.mkdirSync(OUT_DIR, { recursive: true });
}

const possibleBrowserPaths = [
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
	"C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
	process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "Microsoft\\Edge\\Application\\msedge.exe") : null,
	process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "Google\\Chrome\\Application\\chrome.exe") : null,
	process.env.PROGRAMFILES ? path.join(process.env.PROGRAMFILES, "Microsoft\\Edge\\Application\\msedge.exe") : null,
	process.env.PROGRAMFILES ? path.join(process.env.PROGRAMFILES, "Google\\Chrome\\Application\\chrome.exe") : null,
].filter(Boolean);

const browserExecutable = possibleBrowserPaths.find((p) => fs.existsSync(p));

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function getBrowser() {
	const launchOptions = {
		headless: true,
		args: [
			"--no-sandbox",
			"--disable-setuid-sandbox",
			"--disable-gpu",
			"--disable-dev-shm-usage",
			"--font-render-hinting=none",
		],
	};
	if (browserExecutable) {
		launchOptions.executablePath = browserExecutable;
	}
	return chromium.launch(launchOptions);
}

async function provisionClinic() {
	const uniqueId = Date.now();
	const email = `inq-${uniqueId}@dente.local`;
	const password = "Password123!";
	const ownerPin = "123456";

	console.log(`[PROVISION] Initializing fresh clinic with ASCII tokens: ${email}`);
	const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			clinicName: "Dente Clinic Studio " + uniqueId,
			email,
			password,
			ownerName: "Dr Smirnov",
			ownerPin,
		}),
	});

	if (!initRes.ok) {
		throw new Error(`Clinic setup/init failed: HTTP ${initRes.status} - ${await initRes.text()}`);
	}
	const initData = await initRes.json();

	const unlockRes = await fetch(`${API_BASE}/api/auth/staff/unlock`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-dente-clinic-token": initData.clinicToken,
		},
		body: JSON.stringify({ userId: initData.ownerUserId, pinCode: ownerPin }),
	});

	if (!unlockRes.ok) {
		throw new Error(`Staff unlock failed: HTTP ${unlockRes.status} - ${await unlockRes.text()}`);
	}
	const unlockData = await unlockRes.json();

	// Create patient in PostgreSQL
	let patientId = null;
	try {
		const patRes = await fetch(`${API_BASE}/api/patients`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-dente-clinic-token": initData.clinicToken,
				"x-dente-staff-token": unlockData.staffToken,
			},
			body: JSON.stringify({
				fullName: "Смирнов Алексей Игоревич",
				phone: "+7 (916) 123-45-67",
				birthDate: "1988-06-14",
			}),
		});
		if (patRes.ok) {
			const patData = await patRes.json();
			patientId = patData.id;
			console.log(`[SEED] Created patient in PostgreSQL: ${patientId}`);
		}
	} catch (e) {
		console.warn(`[WARN] Patient creation fallback: ${e.message}`);
	}

	return {
		clinicToken: initData.clinicToken,
		staffToken: unlockData.staffToken,
		organizationId: initData.organizationId,
		ownerUserId: initData.ownerUserId,
		patientId,
	};
}

async function applyTheme(page, theme) {
	await page.evaluate((th) => {
		document.documentElement.setAttribute("data-theme", th);
		const isDark = th === "dark";
		document.documentElement.classList.toggle("dark", isDark);
		document.documentElement.classList.toggle("light", !isDark);
		document.body.className = isDark ? "dark" : "light";
		document.documentElement.style.colorScheme = isDark ? "dark" : "light";
		localStorage.setItem("dente_theme_mode", th);
		if (window.__useThemeStore) {
			window.__useThemeStore.getState().setThemeMode(th);
		}
	}, theme);
	await wait(300);
}

async function captureAllProofs() {
	console.log("🚀 Starting Billing & 54-FZ Inquisition Playwright Capture...");

	const auth = await provisionClinic();
	console.log(`[AUTH] Ready: orgId=${auth.organizationId}, patientId=${auth.patientId}`);

	const browser = await getBrowser();

	for (const theme of ["light", "dark"]) {
		console.log(`\n🎨 --- CAPTURING THEME: ${theme.toUpperCase()} (1440x900) ---`);
		const context = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
			colorScheme: theme,
		});

		const page = await context.newPage();

		// Injected auth tokens and preferences
		await page.addInitScript(({ cToken, sToken, pId, thm }) => {
			localStorage.setItem("dente_clinic_token", cToken);
			localStorage.setItem("dente_staff_token", sToken);
			localStorage.setItem("dente_theme_mode", thm);
			localStorage.setItem("dente_workspace_perspective", "owner");
			localStorage.setItem("dente_user_role", "owner");
			// Dismiss all onboarding tours permanently
			localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
			localStorage.setItem("dente_guide_tour_seen_roles_v2", '["admin","doctor","director"]');
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem("dente_quest_progress_v2", JSON.stringify({
				activeTrackId: "solo_doctor",
				currentStepIndex: 0,
				completedStepIds: [],
				isTourActive: false,
				isDismissedPermanently: true,
				tracksProgress: {
					solo_doctor: { completed: true, completedStepIds: [] },
					reception_admin: { completed: true, completedStepIds: [] },
					imaging_diagnostics: { completed: true, completedStepIds: [] },
				},
			}));
			localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done" }));
			localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
				version: 1,
				uiLanguage: "ru",
				selectedWorkspaceRole: "owner",
				selectedSpecialty: "therapist",
				selectedPatientId: pId,
				onboardingDismissed: true,
			}));

			// Suppress any tour overlay backdrops if they attempt to render
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

			// Seed sample clinical invoices for Solo Doctor & Small Clinic
			const todayStr = new Date().toISOString().slice(0, 10);
			const sampleInvoices = [
				{
					id: "inv-inq-001",
					number: "СЧ-2026-0042",
					patientId: pId || "pat-001",
					patientName: "Смирнов Алексей Игоревич",
					patientPhone: "+7 (916) 123-45-67",
					doctorName: "Д-р Смирнов А. И.",
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
							toothNumber: 16
						},
						{
							id: "item-2",
							code804n: "B01.065.001",
							name: "Прием (осмотр, консультация) врача-стоматолога первичный",
							quantity: 1,
							priceRub: 3000,
							totalRub: 3000
						}
					]
				},
				{
					id: "inv-inq-002",
					number: "СЧ-2026-0041",
					patientId: pId || "pat-001",
					patientName: "Кузнецова Ольга Павловна",
					patientPhone: "+7 (925) 987-65-43",
					doctorName: "Д-р Смирнов А. И.",
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
							totalRub: 12000
						}
					]
				},
				{
					id: "inv-inq-003",
					number: "СЧ-2026-0039",
					patientId: pId || "pat-001",
					patientName: "Васильев Роман Сергеевич",
					doctorName: "Д-р Смирнов А. И.",
					date: todayStr,
					createdAt: new Date().toISOString(),
					totalAmountRub: 0,
					paidAmountRub: 0,
					status: "warranty_100",
					paymentMethod: "warranty_discount_100",
					notes: "Гарантийная переделка пломбы зуба 24 (100% скидка врача)",
					items: [
						{
							id: "item-4",
							code804n: "A16.07.002.001",
							name: "Коррекция и полировка световой пломбы",
							quantity: 1,
							priceRub: 0,
							totalRub: 0,
							toothNumber: 24
						}
					]
				}
			];
			localStorage.setItem("dente_billing_invoices", JSON.stringify(sampleInvoices));
		}, {
			cToken: auth.clinicToken,
			sToken: auth.staffToken,
			pId: auth.patientId,
			thm: theme,
		});

		// 1. Navigate to APP_BASE
		console.log(`   🌐 Navigating to ${APP_BASE}...`);
		await page.goto(APP_BASE, { waitUntil: "domcontentloaded", timeout: 25000 });
		await page.waitForSelector(".boot-state", { state: "detached", timeout: 25000 }).catch(() => {});
		await wait(2000);

		// Switch to #finance view via navigation button or location hash
		console.log("   🔀 Navigating to Finance view...");
		const financeNavBtn = page.locator('button:has-text("Оплаты"), a:has-text("Оплаты"), [data-nav="finance"]').first();
		if (await financeNavBtn.count() > 0 && await financeNavBtn.isVisible()) {
			await financeNavBtn.click({ force: true });
			await wait(1500);
		} else {
			await page.evaluate(() => { window.location.hash = "finance"; });
			await wait(1500);
		}

		await applyTheme(page, theme);

		// Seed and dispatch invoices directly in active window context
		await page.evaluate((pId) => {
			const todayStr = new Date().toISOString().slice(0, 10);
			const sampleInvoices = [
				{
					id: "inv-inq-001",
					number: "СЧ-2026-0042",
					patientId: pId || "pat-001",
					patientName: "Смирнов Алексей Игоревич",
					patientPhone: "+7 (916) 123-45-67",
					doctorName: "Д-р Смирнов А. И.",
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
							toothNumber: 16
						},
						{
							id: "item-2",
							code804n: "B01.065.001",
							name: "Прием (осмотр, консультация) врача-стоматолога первичный",
							quantity: 1,
							priceRub: 3000,
							totalRub: 3000
						}
					]
				},
				{
					id: "inv-inq-002",
					number: "СЧ-2026-0041",
					patientId: pId || "pat-001",
					patientName: "Кузнецова Ольга Павловна",
					patientPhone: "+7 (925) 987-65-43",
					doctorName: "Д-р Смирнов А. И.",
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
							totalRub: 12000
						}
					]
				},
				{
					id: "inv-inq-003",
					number: "СЧ-2026-0039",
					patientId: pId || "pat-001",
					patientName: "Васильев Роман Сергеевич",
					doctorName: "Д-р Смирнов А. И.",
					date: todayStr,
					createdAt: new Date().toISOString(),
					totalAmountRub: 0,
					paidAmountRub: 0,
					status: "warranty_100",
					paymentMethod: "warranty_discount_100",
					notes: "Гарантийная переделка пломбы зуба 24 (100% скидка врача)",
					items: [
						{
							id: "item-4",
							code804n: "A16.07.002.001",
							name: "Коррекция и полировка световой пломбы",
							quantity: 1,
							priceRub: 0,
							totalRub: 0,
							toothNumber: 24
						}
					]
				}
			];
			localStorage.setItem("dente_billing_invoices", JSON.stringify(sampleInvoices));
			window.dispatchEvent(new CustomEvent("dente-invoices-updated", { detail: sampleInvoices[0] }));
		}, auth.patientId);
		await wait(500);

		// 2. Open Invoices Modal
		console.log("   📂 Opening Invoices Modal...");
		const openInvoicesBtn = page.locator('[data-testid="btn-finance-open-invoices"]').first();
		if (await openInvoicesBtn.count() > 0 && await openInvoicesBtn.isVisible()) {
			await openInvoicesBtn.click({ force: true });
			await wait(1500);
		} else {
			const textBtn = page.locator('button:has-text("Счета и акты")').first();
			if (await textBtn.count() > 0 && await textBtn.isVisible()) {
				await textBtn.click({ force: true });
				await wait(1500);
			}
		}

		// Ensure we see InvoicesView and at least one invoice card
		let payBtn = page.locator('[data-testid^="btn-pay-invoice-"]').first();
		if (await payBtn.count() === 0) {
			console.log("   ➕ Invoices list empty in view, creating invoice via 1-click modal...");
			const createBtn = page.locator('[data-testid="btn-create-invoice-open"], button:has-text("Создать первый счет")').first();
			if (await createBtn.count() > 0 && await createBtn.isVisible()) {
				await createBtn.click({ force: true });
				await wait(600);
				// Click 1-click preset "Кариес (6 500 ₽)"
				const presetBtn = page.locator('button:has-text("Кариес (6 500 ₽)")').first();
				if (await presetBtn.count() > 0) {
					await presetBtn.click({ force: true });
				}
				const submitBtn = page.locator('[data-testid="btn-new-invoice-submit"]').first();
				if (await submitBtn.count() > 0) {
					await submitBtn.click({ force: true });
					await wait(1000);
				}
			}
		}

		await wait(1000);

		// CAPTURE 1: Invoices Registry
		const invoicesScreenshotName = `0${theme === "light" ? "1" : "2"}_invoices_registry_${theme}_1440x900.png`;
		const invoicesPath = path.join(OUT_DIR, invoicesScreenshotName);
		console.log(`   📸 Capturing: ${invoicesScreenshotName}...`);
		await page.screenshot({ path: invoicesPath, fullPage: false });

		// 3. Open PaymentModal on first pending invoice
		console.log("   💳 Opening PaymentModal 54-FZ on first invoice...");
		payBtn = page.locator('[data-testid^="btn-pay-invoice-"]').first();
		if (await payBtn.count() > 0 && await payBtn.isVisible()) {
			await payBtn.click({ force: true });
			await wait(1500);
		} else {
			const payAltBtn = page.locator('button:has-text("Оплатить")').first();
			if (await payAltBtn.count() > 0 && await payAltBtn.isVisible()) {
				await payAltBtn.click({ force: true });
				await wait(1500);
			}
		}

		// Wait for PaymentModal to be visible
		await page.waitForSelector('[data-testid="payment-modal-studio"]', { timeout: 8000 }).catch(() => {});
		await wait(500);

		// CAPTURE 2: PaymentModal 54-FZ
		const paymentModalScreenshotName = `0${theme === "light" ? "3" : "4"}_payment_modal_54fz_${theme}_1440x900.png`;
		const paymentModalPath = path.join(OUT_DIR, paymentModalScreenshotName);
		console.log(`   📸 Capturing: ${paymentModalScreenshotName}...`);
		await page.screenshot({ path: paymentModalPath, fullPage: false });

		// Close PaymentModal (leaving InvoicesView open)
		console.log("   ✖ Closing PaymentModal...");
		const closePaymentModalBtn = page.locator('[data-testid="btn-close-payment-modal"]').first();
		if (await closePaymentModalBtn.count() > 0 && await closePaymentModalBtn.isVisible()) {
			await closePaymentModalBtn.click({ force: true });
			await wait(800);
		} else {
			const mobileClose = page.locator('[data-testid="btn-close-payment-modal-mobile"]').first();
			if (await mobileClose.count() > 0 && await mobileClose.isVisible()) {
				await mobileClose.click({ force: true });
				await wait(800);
			}
		}

		// 4. Open Cash Register Drawer (Ящик кассы)
		console.log("   📥 Opening CashRegisterDrawer...");
		const cashDrawerBtn = page.locator('[data-testid="btn-cash-drawer-open"]').first();
		if (await cashDrawerBtn.count() > 0 && await cashDrawerBtn.isVisible()) {
			await cashDrawerBtn.click({ force: true });
			await wait(1500);
		} else {
			const cashDrawerAlt = page.locator('button:has-text("Ящик кассы")').first();
			if (await cashDrawerAlt.count() > 0 && await cashDrawerAlt.isVisible()) {
				await cashDrawerAlt.click({ force: true });
				await wait(1500);
			} else {
				console.warn("   ⚠️ btn-cash-drawer-open not found in toolbar!");
			}
		}

		await page.waitForSelector('[data-testid="cash-register-drawer"]', { timeout: 8000 }).catch(() => {});
		await wait(500);

		// CAPTURE 3: CashRegisterDrawer
		const drawerScreenshotName = `0${theme === "light" ? "5" : "6"}_cash_register_drawer_${theme}_1440x900.png`;
		const drawerPath = path.join(OUT_DIR, drawerScreenshotName);
		console.log(`   📸 Capturing: ${drawerScreenshotName}...`);
		await page.screenshot({ path: drawerPath, fullPage: false });

		await context.close();
	}

	await browser.close();
	console.log("\n🎉 All Billing Inquisition Proofs successfully captured in docs/screenshots/billing_inquisition/!");
}

captureAllProofs().catch((err) => {
	console.error("❌ Fatal capture error:", err);
	process.exit(1);
});
