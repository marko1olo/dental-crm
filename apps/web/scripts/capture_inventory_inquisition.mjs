import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const APP_BASE = "http://127.0.0.1:5173";
const PROOFS_DIR = path.join(process.cwd(), "apps/web/proofs/inventory");

if (!fs.existsSync(PROOFS_DIR)) {
	fs.mkdirSync(PROOFS_DIR, { recursive: true });
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function applyTheme(page, theme) {
	await page.evaluate((th) => {
		const isDark = th === "dark";
		document.documentElement.classList.remove(isDark ? "light" : "dark");
		document.documentElement.classList.add(th);
		document.documentElement.setAttribute("data-theme", th);
		document.documentElement.style.colorScheme = th;
		localStorage.setItem("dente_theme_mode", th);
		if (window.__useThemeStore) {
			window.__useThemeStore.getState().setThemeMode(th);
		}
	}, theme);
	await wait(600);
}

async function capture() {
	console.log("=== STARTING WAREHOUSE & NEGATIVE STOCK PLAYWRIGHT CAPTURE ===");

	const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
	const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
	const executablePath = fs.existsSync(edgePath)
		? edgePath
		: fs.existsSync(chromePath)
			? chromePath
			: undefined;

	const browser = await chromium.launch({
		headless: true,
		executablePath,
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
	});

	const context = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		deviceScaleFactor: 1,
	});

	const page = await context.newPage();
	page.on("pageerror", (err) => console.error("[BROWSER ERROR]:", err.message));

	try {
		console.log("[STEP 1] Navigating to http://127.0.0.1:5173/...");
		await page.goto(`${APP_BASE}/`, { waitUntil: "domcontentloaded", timeout: 30000 });
		await wait(2000);

		console.log("[STEP 2] Clicking 'Демо-тур' segmented button...");
		const demoTab = page.locator('button:has-text("Демо-тур")').first();
		await demoTab.click();
		await wait(1500);

		console.log("[STEP 3] Launching demo role via submit button...");
		const launchBtn = page.locator('button:has-text("Войти в демо-тур")').first();
		await launchBtn.click();
		console.log("[AUTH] Waiting for workspace navigation...");
		await wait(4000);

		// Close floating copilot if open
		await page.evaluate(() => {
			if (window.__denteCopilot && typeof window.__denteCopilot.close === "function") {
				window.__denteCopilot.close();
			}
		});

		console.log("[STEP 4] Clicking 'Склад' in navigation sidebar...");
		const invTab = page.locator('button:has-text("Склад"), a:has-text("Склад")').first();
		await invTab.click();
		await wait(3000);

		// --- 1. PC LIGHT - WAREHOUSE STOCK TABLE ---
		console.log("[STEP 5] Applying Light Theme & Capturing ☀️ PC Light Warehouse Stock Table...");
		await applyTheme(page, "light");
		await wait(1000);
		const stockTableLightPath = path.join(PROOFS_DIR, "01_inventory_stock_table_pc_light.png");
		await page.screenshot({ path: stockTableLightPath, fullPage: false });
		console.log(`[SAVED] ${stockTableLightPath}`);

		// --- 2. PC LIGHT - OPEN SHIFT BATCH DEDUCTION MODAL ---
		console.log("[STEP 6] Opening Shift Batch Deduction Modal...");
		const shiftModalBtn = page.locator('button:has-text("Смена (1 клик)"), [data-testid="btn-open-shift-batch-deduction"]').first();
		await shiftModalBtn.click();
		await wait(1500);

		await page.waitForSelector('[data-testid="shift-batch-deduction-modal"]', { timeout: 10000 });
		console.log("[MODAL] Shift Batch Modal is open.");

		// Switch to procedure tab to verify dynamic BOM tech map and soft overdraft
		const procedureTab = page.locator('[data-testid="tab-mode-procedure"]').first();
		if (await procedureTab.count() > 0 && await procedureTab.isVisible()) {
			console.log("[MODAL] Switching to Procedure / Visit tab...");
			await procedureTab.click();
			await wait(1000);
		}

		const modalLightPath = path.join(PROOFS_DIR, "02_shift_batch_modal_pc_light.png");
		await page.screenshot({ path: modalLightPath, fullPage: false });
		console.log(`[SAVED] ${modalLightPath}`);

		// --- 3. PC DARK - SHIFT BATCH DEDUCTION MODAL ---
		console.log("[STEP 7] Switching to 🌙 PC Dark & Capturing Modal...");
		await applyTheme(page, "dark");
		await wait(1000);
		const modalDarkPath = path.join(PROOFS_DIR, "03_shift_batch_modal_pc_dark.png");
		await page.screenshot({ path: modalDarkPath, fullPage: false });
		console.log(`[SAVED] ${modalDarkPath}`);

		// Close modal
		const closeBtn = page.locator('[data-testid="shift-batch-deduction-modal"] button[aria-label="Закрыть"]').first();
		if (await closeBtn.count() > 0 && await closeBtn.isVisible()) {
			await closeBtn.click();
			await wait(1000);
		} else {
			await page.keyboard.press("Escape");
			await wait(1000);
		}

		// --- 4. PC DARK - WAREHOUSE STOCK TABLE ---
		console.log("[STEP 8] Capturing 🌙 PC Dark Warehouse Stock Table...");
		const stockTableDarkPath = path.join(PROOFS_DIR, "04_inventory_stock_table_pc_dark.png");
		await page.screenshot({ path: stockTableDarkPath, fullPage: false });
		console.log(`[SAVED] ${stockTableDarkPath}`);

		console.log("=== ALL 4 SCREENSHOTS SUCCESSFULLY CAPTURED! ===");
	} catch (err) {
		console.error("[CAPTURE ERROR]:", err);
	} finally {
		await browser.close();
	}
}

capture();
