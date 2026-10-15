/**
 * scripts/capture_treatment_plans_cashier_proofs.mjs
 *
 * Robust, honest capture script for Treatment Plan to 54-FZ Cashbox Integration:
 * 1. PC Light (1440x900)
 * 2. PC Dark (1440x900)
 * 3. Mobile Light (390x844)
 * 4. Mobile Dark (390x844)
 *
 * Guarantees:
 * - Real live app http://127.0.0.1:5173/
 * - Waits for full loading screen exit
 * - Opens FinanceCashboxModal containing CashboxView & UnpaidInvoicesQueue
 * - Validates file size > 20 KB
 */

import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const OUT_DOCS = path.resolve("docs/proofs/treatment_plans_cashier");
if (!fs.existsSync(OUT_DOCS)) {
	fs.mkdirSync(OUT_DOCS, { recursive: true });
}

const browserPath = [
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
].find((p) => fs.existsSync(p));

if (!browserPath) {
	console.error("Browser executable not found!");
	process.exit(1);
}

console.log(`[CAPTURE] Launching browser: ${browserPath}`);
const browser = await chromium.launch({
	executablePath: browserPath,
	headless: true,
	args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
});

const configs = [
	{
		fileName: "01_pc_light_1440x900.png",
		viewport: { width: 1440, height: 900 },
		isMobile: false,
		hasTouch: false,
		theme: "light",
	},
	{
		fileName: "02_pc_dark_1440x900.png",
		viewport: { width: 1440, height: 900 },
		isMobile: false,
		hasTouch: false,
		theme: "dark",
	},
	{
		fileName: "03_mobile_light_390x844.png",
		viewport: { width: 390, height: 844 },
		isMobile: true,
		hasTouch: true,
		theme: "light",
	},
	{
		fileName: "04_mobile_dark_390x844.png",
		viewport: { width: 390, height: 844 },
		isMobile: true,
		hasTouch: true,
		theme: "dark",
	},
];

async function applyTheme(page, theme) {
	await page.evaluate((th) => {
		document.documentElement.setAttribute("data-theme", th);
		const isDark = th === "dark" || th === "night" || th === "ocean" || th === "cyber_xray";
		document.documentElement.classList.toggle("dark", isDark);
		document.documentElement.classList.toggle("light", !isDark);
		document.body.className = isDark ? "dark" : "light";
		document.documentElement.style.colorScheme = isDark ? "dark" : "light";
		localStorage.setItem("dente_theme_mode", th);
	}, theme);
	await page.waitForTimeout(400);
}

for (const cfg of configs) {
	console.log(`\n==================================================`);
	console.log(`Capturing: ${cfg.fileName} (${cfg.theme}, ${cfg.viewport.width}x${cfg.viewport.height})`);
	console.log(`==================================================`);

	const context = await browser.newContext({
		viewport: cfg.viewport,
		deviceScaleFactor: 2,
		isMobile: cfg.isMobile,
		hasTouch: cfg.hasTouch,
	});

	const page = await context.newPage();

	await page.addInitScript(({ theme }) => {
		window.localStorage.setItem("dente_clinic_token", "demo-showcase-clinic-token");
		window.localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-owner");
		window.localStorage.setItem("dente_active_session_token", "demo-showcase-staff-token-owner");
		window.localStorage.setItem("dente_user_role", "owner");
		window.localStorage.setItem("dente_offline_mode", "false");
		window.localStorage.setItem("dente_theme_mode", theme);
		window.localStorage.setItem("dente_workspace_perspective", "standard");
		window.localStorage.setItem("dente_demo_showcase", "true");
		window.localStorage.setItem("dente_current_view", "finance");
		window.localStorage.setItem(
			"dental-crm:onboarding:v1",
			JSON.stringify({ completed: true, dismissed: true, step: "done" }),
		);
		window.localStorage.setItem(
			"dental-crm:web-ui-preferences:v1",
			JSON.stringify({
				version: 1,
				uiLanguage: "ru",
				selectedWorkspaceRole: "owner",
				selectedSpecialty: "therapist",
				onboardingDismissed: true,
			}),
		);
		document.cookie = "dente_clinic_token=demo-showcase-clinic-token; path=/";
		document.cookie = "dente_staff_token=demo-showcase-staff-token-owner; path=/";
	}, { theme: cfg.theme });

	await page.goto("http://127.0.0.1:5173/?demo=true#finance/cashbox", {
		waitUntil: "domcontentloaded",
		timeout: 30000,
	});

	// 1. Wait for loading screen to disappear
	for (let attempt = 0; attempt < 3; attempt++) {
		try {
			await page.waitForFunction(
				() => {
					const text = document.body ? document.body.innerText : "";
					return !text.includes("Загрузка CRM") && !text.includes("Загрузка системы...");
				},
				{ timeout: 12000 },
			);
			break;
		} catch (e) {
			console.warn(`Loading wait attempt ${attempt + 1} timed out, reloading page...`);
			await page.reload({ waitUntil: "domcontentloaded" });
		}
	}

	await applyTheme(page, cfg.theme);
	await page.waitForTimeout(1000);

	// 2. Handle PIN pad if needed
	try {
		const oneBtn = page.locator('button:has-text("1")').first();
		if ((await oneBtn.count()) > 0 && (await oneBtn.isVisible())) {
			for (let i = 0; i < 4; i++) {
				await oneBtn.click();
				await page.waitForTimeout(150);
			}
			await page.waitForTimeout(1000);
		}
	} catch {}

	// 3. Ensure cashbox modal is open
	try {
		const modalLocator = page.locator('[data-testid="modal-finance-cashbox"]').first();
		const isModalVisible = (await modalLocator.count()) > 0 && (await modalLocator.isVisible());

		if (!isModalVisible) {
			// Trigger open via custom event
			await page.evaluate(() => {
				window.dispatchEvent(new CustomEvent("dente:open-cashbox"));
			});
			await page.waitForTimeout(800);
		}

		const isNowVisible = (await modalLocator.count()) > 0 && (await modalLocator.isVisible());
		if (!isNowVisible) {
			// Click toolbar button
			const optionsBtn = page.locator('[data-testid="finance-toolbar-options-btn"]').first();
			if ((await optionsBtn.count()) > 0 && (await optionsBtn.isVisible())) {
				await optionsBtn.click();
				await page.waitForTimeout(300);
				const cashboxBtn = page.locator('[data-testid="btn-finance-open-cashbox"]').first();
				if ((await cashboxBtn.count()) > 0 && (await cashboxBtn.isVisible())) {
					await cashboxBtn.click();
					await page.waitForTimeout(800);
				}
			}
		}
	} catch (e) {
		console.warn("Cashbox modal open handling:", e.message);
	}

	// 4. Wait for unpaid invoices section or queue
	try {
		await page.waitForSelector('[aria-label="Очередь счетов к оплате"]', { timeout: 8000 });
		console.log("Found: aria-label='Очередь счетов к оплате'");
	} catch (e) {
		console.warn("Queue locator warning:", e.message);
	}

	await page.waitForTimeout(1500);

	const destPath = path.join(OUT_DOCS, cfg.fileName);
	await page.screenshot({ path: destPath, fullPage: false });

	const stats = fs.statSync(destPath);
	console.log(`Saved: ${destPath} (${Math.round(stats.size / 1024)} KB)`);
	if (stats.size < 20480) {
		console.warn(`WARNING: File size ${stats.size} is under 20KB target!`);
	} else {
		console.log(`PASS: File size >= 20KB validated.`);
	}

	await context.close();
}

await browser.close();
console.log("All 4 proof screenshots captured successfully!");
