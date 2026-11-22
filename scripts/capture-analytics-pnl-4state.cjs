/**
 * scripts/capture-analytics-pnl-4state.cjs — Domain 31 Visual Proofs
 *
 * 1. 01_analytics_pnl_pc_light_1440x900.png
 * 2. 02_analytics_pnl_pc_dark_1440x900.png
 * 3. 03_analytics_pnl_mobile_light_390x844.png
 * 4. 04_analytics_pnl_mobile_dark_390x844.png
 * 5. 05_managerial_pnl_modal_pc_light_1440x900.png
 * 6. 06_managerial_pnl_modal_pc_dark_1440x900.png
 */

const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const BRAIN_ID = "72750686-ac5b-4af2-b253-54412e21705e";
const OUT_DOCS = path.resolve(__dirname, "../docs/proofs/analytics_pnl");
const OUT_BRAIN = path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${BRAIN_ID}`);

[OUT_DOCS, OUT_BRAIN].forEach((dir) => {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

async function saveProof(page, filename) {
	await page.waitForTimeout(800);
	const pDocs = path.join(OUT_DOCS, filename);
	const pBrain = path.join(OUT_BRAIN, filename);

	await page.screenshot({ path: pDocs, fullPage: false, animations: "disabled" });
	fs.copyFileSync(pDocs, pBrain);

	const size = fs.statSync(pDocs).size;
	console.log(`[CAPTURED] ${filename}: ${(size / 1024).toFixed(1)} KB -> saved to docs & brain.`);
	if (size < 25000) {
		throw new Error(`Screenshot ${filename} is too small (${size} bytes)`);
	}
}

async function suppressOverlays(page) {
	await page.evaluate(() => {
		const style = document.createElement("style");
		style.id = "suppress-all-overlays";
		style.innerHTML = `
			.tour-spotlight-root, .tour-backdrop-clickable-zone,
			[data-testid="guided-tour-spotlight-overlay"],
			[data-testid="guided-tour-coach-mark-card"],
			[data-testid="demo-mode-banner"], .global-toast-container,
			.boot-state, #boot-screen, .app-boot-container,
			vite-error-overlay { display: none !important; pointer-events: none !important; }
		`;
		document.head.appendChild(style);
	}).catch(() => {});
}

async function setTheme(page, theme) {
	await page.evaluate((th) => {
		document.documentElement.setAttribute("data-theme", th);
		document.body.setAttribute("data-theme", th);
		if (th === "dark") {
			document.documentElement.classList.add("dark");
			document.documentElement.classList.remove("light");
			document.body.classList.add("dark");
			document.body.classList.remove("light");
		} else {
			document.documentElement.classList.remove("dark");
			document.documentElement.classList.add("light");
			document.body.classList.remove("dark");
			document.body.classList.add("light");
		}
		document.documentElement.style.colorScheme = th;
		localStorage.setItem("dente_theme", th);
		localStorage.setItem("dente_theme_mode", th);
		localStorage.setItem("theme", th);
		window.dispatchEvent(new Event("themechange"));
	}, theme).catch(() => {});
	await suppressOverlays(page);
	await page.waitForTimeout(500);
}

async function main() {
	const baseUrl = `http://127.0.0.1:5173`;
	console.log(`=== 4-State Proof: Launching Analytics P&L on ${baseUrl} ===`);

	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	const initStorage = () => {
		localStorage.setItem("dente_demo_mode", "true");
		localStorage.setItem("dente_demo_showcase", "true");
		localStorage.setItem("dente_clinic_token", "live-inquisition-clinic-token");
		localStorage.setItem("dente_staff_token", "live-inquisition-staff-token");
		localStorage.setItem("dente_active_session_token", "live-inquisition-staff-token");
		localStorage.setItem("dente_organization_id", "demo-org-1");
		localStorage.setItem("dente_user_id", "doc-owner-1");
		localStorage.setItem("dente_user_name", "Д-р Воронов Алексей Владимирович");
		localStorage.setItem("dente_user_role", "owner");
		localStorage.setItem("dente_active_role", "owner");
		localStorage.setItem("dente_role", "owner");
		localStorage.setItem("dente_perspective", "management");
		sessionStorage.setItem("dente_unlocked", "true");
		sessionStorage.setItem("dente_executive_tab", "financial");
		localStorage.setItem("dente_executive_tab", "financial");
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_tour_dismissed", "true");
		localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
		localStorage.setItem("dente_demo_banner_dismissed", "true");
	};

	try {
		// --- 1. PC Light & Dark (1440x900) - Executive Analytics & PnL ---
		for (const theme of ["light", "dark"]) {
			console.log(`\n>>> Capturing PC ${theme.toUpperCase()} (1440x900) <<<`);
			const context = await browser.newContext({
				viewport: { width: 1440, height: 900 },
				deviceScaleFactor: 1,
				colorScheme: theme,
			});
			await context.addInitScript(initStorage);
			const page = await context.newPage();

			await page.goto(`${baseUrl}/?demo=true&analytics=1#analytics`, { waitUntil: "domcontentloaded", timeout: 45000 });
			await page.waitForTimeout(2000);
			await setTheme(page, theme);

			const filename = theme === "light"
				? "01_analytics_pnl_pc_light_1440x900.png"
				: "02_analytics_pnl_pc_dark_1440x900.png";
			await saveProof(page, filename);
			await context.close();
		}

		// --- 2. Mobile Light & Dark (390x844) - Executive Analytics & PnL ---
		for (const theme of ["light", "dark"]) {
			console.log(`\n>>> Capturing Mobile ${theme.toUpperCase()} (390x844) <<<`);
			const context = await browser.newContext({
				viewport: { width: 390, height: 844 },
				isMobile: true,
				hasTouch: true,
				deviceScaleFactor: 2,
				colorScheme: theme,
			});
			await context.addInitScript(initStorage);
			const page = await context.newPage();

			await page.goto(`${baseUrl}/?demo=true&analytics=1#analytics`, { waitUntil: "domcontentloaded", timeout: 45000 });
			await page.waitForTimeout(2000);
			await setTheme(page, theme);

			const filename = theme === "light"
				? "03_analytics_pnl_mobile_light_390x844.png"
				: "04_analytics_pnl_mobile_dark_390x844.png";
			await saveProof(page, filename);
			await context.close();
		}

		// --- 3. PC Light & Dark (1440x900) - Managerial P&L Modal ---
		for (const theme of ["light", "dark"]) {
			console.log(`\n>>> Capturing Managerial P&L Modal PC ${theme.toUpperCase()} <<<`);
			const context = await browser.newContext({
				viewport: { width: 1440, height: 900 },
				deviceScaleFactor: 1,
				colorScheme: theme,
			});
			await context.addInitScript(initStorage);
			const page = await context.newPage();

			await page.goto(`${baseUrl}/?demo=true#finance`, { waitUntil: "domcontentloaded", timeout: 45000 });
			await page.waitForTimeout(2000);
			await setTheme(page, theme);

			const optBtn = page.locator('[data-testid="finance-toolbar-options-btn"]').first();
			if (await optBtn.isVisible()) {
				await optBtn.click();
				await page.waitForTimeout(400);
				const pnlItem = page.locator('[role="menuitem"]:has-text("Управленческий P&L")').first();
				if (await pnlItem.isVisible()) {
					await pnlItem.click();
					await page.waitForTimeout(1000);
				}
			}

			const filename = theme === "light"
				? "05_managerial_pnl_modal_pc_light_1440x900.png"
				: "06_managerial_pnl_modal_pc_dark_1440x900.png";
			await saveProof(page, filename);
			await context.close();
		}

		console.log("\n=== ALL 4-STATE VISUAL PROOFS SUCCESSFULLY CAPTURED! ===");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("[FATAL ERROR]:", err);
	process.exit(1);
});
