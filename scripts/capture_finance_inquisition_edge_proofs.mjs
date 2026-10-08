/**
 * scripts/capture_finance_inquisition_edge_proofs.mjs
 *
 * Subagent 2: Chairside POS & Fiscal Inquisitor (Edge 1440x900 Proofs)
 * - Microsoft Edge ({ channel: 'msedge' })
 * - Viewport: 1440x900
 * - Targets:
 *   1. CashRegisterView PC Light (1440x900)
 *   2. CashRegisterView PC Dark (1440x900)
 *   3. PaymentModal Split & Deposit PC Light (1440x900)
 *   4. PaymentModal Split & Deposit PC Dark (1440x900)
 */

import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";

const API_BASE = "http://127.0.0.1:4100";
const WEB_BASE = "http://127.0.0.1:5173";
const OUT_DIR = path.resolve("screenshots");
const BRAIN_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/c0df7965-d390-40fe-8b62-36e2df177caf");

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(BRAIN_DIR, { recursive: true });

async function provisionSession() {
	const uniqueId = Date.now();
	console.log(`[Provisioning] Initializing test session fiscal-inquisitor-${uniqueId}@dente.ru...`);

	const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			clinicName: "ООО «Стоматология ДЕНТЕ Премиум»",
			email: `fiscal-inquisitor-${uniqueId}@dente.ru`,
			password: "Password123!",
			ownerName: "Д-р Смирнов Константин Павлович",
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
				fullName: "Кузнецов Дмитрий Анатольевич",
				birthDate: "1985-06-20",
				gender: "male",
				phone: "+7 (916) 555-44-33",
				balanceRub: 4500, // Pre-seeded deposit for 1-click debit verification
				allergies: "Без особенностей",
				chronicDiseases: "Нет",
			}),
		});
		if (pRes.ok) {
			const pData = await pRes.json();
			patientId = pData.patient?.id || pData.id || null;
			console.log(`[Provisioning] Seeded patient with deposit: ${patientId} (4500 ₽)`);

			const todayStr = new Date().toISOString().split("T")[0];
			await fetch(`${API_BASE}/api/appointments`, {
				method: "POST",
				headers,
				body: JSON.stringify({
					patientId,
					doctorId: initData.ownerUserId,
					chairId: "chair-1",
					startTime: `${todayStr}T10:00:00Z`,
					endTime: `${todayStr}T11:00:00Z`,
					status: "confirmed",
					notes: "Профессиональная гигиена и реставрация 46 зуба",
				}),
			}).catch(() => {});
		}
	} catch (e) {
		console.warn("[Provisioning] Data seed warning:", e.message);
	}

	return {
		clinicToken: initData.clinicToken,
		staffToken: unlockData.staffToken,
		ownerUserId: initData.ownerUserId,
		patientId,
	};
}

async function run() {
	const auth = await provisionSession();

	console.log("Launching Microsoft Edge browser ({ channel: 'msedge' })...");
	const browser = await chromium.launch({
		channel: "msedge",
		headless: true,
		args: ["--no-sandbox", "--disable-gpu", "--font-render-hinting=none", "--disable-dev-shm-usage"],
	});

	try {
		const context = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
			isMobile: false,
			hasTouch: false,
		});

		await context.addInitScript(
			({ ct, st, uid, pid }) => {
				localStorage.setItem("dente_clinic_token", ct);
				localStorage.setItem("dente_staff_token", st);
				localStorage.setItem(
					"dente_staff_session",
					JSON.stringify({
						userId: uid,
						name: "Д-р Смирнов Константин Павлович",
						fullName: "Д-р Смирнов Константин Павлович",
						role: "owner",
						specialties: ["Стоматолог-терапевт", "Ортопед"],
					})
				);
				localStorage.setItem(
					"dental-crm:web-ui-preferences:v1",
					JSON.stringify({
						version: 1,
						uiLanguage: "ru",
						selectedWorkspaceRole: "owner",
						selectedPatientId: pid,
						onboardingDismissed: true,
						onboardingStep: "done",
					})
				);
			},
			{
				ct: auth.clinicToken,
				st: auth.staffToken,
				uid: auth.ownerUserId,
				pid: auth.patientId,
			}
		);

		const page = await context.newPage();
		page.on("pageerror", (err) => console.log("[PAGE ERROR]:", err.message, err.stack));
		page.on("console", (msg) => {
			if (msg.type() === "error") console.log("[CONSOLE ERROR]:", msg.text());
		});
		page.on("response", (res) => {
			if (res.status() >= 400) console.log("[FAILED RES]:", res.status(), res.url());
		});

		console.log("Navigating to http://127.0.0.1:5173/#finance...");
		await page.goto(`${WEB_BASE}/#finance`, { waitUntil: "domcontentloaded", timeout: 45000 });
		await page.waitForSelector(".boot-state", { state: "detached", timeout: 45000 }).catch(() => {});
		await page.waitForSelector(".app-shell", { state: "visible", timeout: 30000 }).catch(() => {});
		await page.waitForTimeout(2000);

		// Helper to apply theme
		async function applyTheme(isDark) {
			await page.evaluate((dark) => {
				if (dark) {
					document.documentElement.setAttribute("data-theme", "dark");
					document.documentElement.classList.remove("light");
					document.documentElement.classList.add("dark");
					document.documentElement.style.colorScheme = "dark";
				} else {
					document.documentElement.setAttribute("data-theme", "light");
					document.documentElement.classList.remove("dark");
					document.documentElement.classList.add("light");
					document.documentElement.style.colorScheme = "light";
				}
			}, isDark);
			await page.waitForTimeout(500);
		}

		async function saveAndCopy(filename, desc) {
			const filePath = path.join(OUT_DIR, filename);
			const brainPath = path.join(BRAIN_DIR, filename);
			await page.screenshot({ path: filePath, fullPage: false });
			fs.copyFileSync(filePath, brainPath);
			const sizeKb = (fs.statSync(filePath).size / 1024).toFixed(1);
			console.log(`[Captured & Saved] ${filename} (${sizeKb} KB) -> ${desc}`);
		}

		// 1. Open CashRegisterView / Cashbox Modal
		console.log("Opening CashRegisterView modal via FinanceToolbar...");
		const optionsBtn = await page.waitForSelector('[data-testid="finance-toolbar-options-btn"]', { timeout: 10000 });
		await optionsBtn.click();
		await page.waitForTimeout(400);

		const cashboxBtn = await page.waitForSelector('[data-testid="btn-finance-open-cashbox"]', { timeout: 5000 });
		await cashboxBtn.click();
		await page.waitForTimeout(800);

		await page.waitForSelector('[data-testid="modal-finance-cashbox"]', { timeout: 10000 });
		await page.waitForSelector('#gross-amount-input, .cashbox-view', { timeout: 10000 });
		console.log("CashRegisterView modal is visible and ready!");

		// Fill in gross amount e.g. 8200 ₽
		const amountInput = await page.$('#gross-amount-input');
		if (amountInput) {
			await amountInput.fill("8200");
			await page.waitForTimeout(400);
		}

		// Screenshot 1: CashRegisterView PC Light
		await applyTheme(false);
		await saveAndCopy("cash_register_pc_light_1440x900.png", "CashRegisterView PC Light (1440x900)");

		// Screenshot 2: CashRegisterView PC Dark
		await applyTheme(true);
		await saveAndCopy("cash_register_pc_dark_1440x900.png", "CashRegisterView PC Dark (1440x900)");

		// 2. Open PaymentModal with Split & Deposit
		console.log("Opening PaymentModal from CashboxView via 'Сплит / Терминал...'...");
		const openPaymentModalBtn = await page.waitForSelector('[data-testid="btn-open-payment-modal"]', { timeout: 5000 });
		await openPaymentModalBtn.click();
		await page.waitForTimeout(800);

		await page.waitForSelector('[data-testid="payment-modal-studio"]', { timeout: 10000 });
		console.log("PaymentModal is visible!");

		// Ensure split tab is active
		const splitTab = await page.waitForSelector('[data-testid="tab-method-split"]', { timeout: 5000 });
		await splitTab.click();
		await page.waitForTimeout(400);

		// Fill in split tenders: e.g. 5000 card, leaving 3200 unallocated so remainder balancer button is clearly demonstrated!
		const cardSplitInput = await page.$('input[data-testid="input-split-card"]');
		if (cardSplitInput) {
			await cardSplitInput.fill("5000");
			await page.waitForTimeout(400);
		}

		// Screenshot 3: PaymentModal Split & Deposit PC Light
		await applyTheme(false);
		await saveAndCopy("payment_modal_split_deposit_pc_light_1440x900.png", "PaymentModal Split & Deposit PC Light (1440x900)");

		// Screenshot 4: PaymentModal Split & Deposit PC Dark
		await applyTheme(true);
		await saveAndCopy("payment_modal_split_deposit_pc_dark_1440x900.png", "PaymentModal Split & Deposit PC Dark (1440x900)");

		console.log("\n>>> ALL 4 EDGE 1440x900 PROOFS CAPTURED SUCCESSFULLY! <<<\n");
	} finally {
		await browser.close();
	}
}

run().catch((err) => {
	console.error("[FATAL ERROR] Edge screenshot capture failed:", err);
	process.exit(1);
});
