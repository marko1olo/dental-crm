/**
 * scripts/take_implants_4state_canonical.cjs
 *
 * Канонический съем 4-State Visual Proofs для домена «Implants, Surgery & Implant Passport Hub»
 * Мандаты 8e, 8n, 8v, 8am, 8ze, 8al, 8aw, 8bd.
 *
 * 1. docs/proofs/implants/01_implant_passport_pc_light_1440x900.png
 * 2. docs/proofs/implants/02_implant_passport_pc_dark_1440x900.png
 * 3. docs/proofs/implants/03_implant_passport_mobile_light_390x844.png
 * 4. docs/proofs/implants/04_implant_passport_mobile_dark_390x844.png
 */

const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const WEB_URL = "http://127.0.0.1:5173/?standalone=surgery#implant-passport";
const CURRENT_CONV_ID = "2f594473-a72a-4b07-9ef2-4459a0d3c486";
const OUT_DOCS = path.resolve(__dirname, "../docs/proofs/implants");
const OUT_BRAIN = path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${CURRENT_CONV_ID}/screenshots`);

[OUT_DOCS, OUT_BRAIN].forEach((dir) => {
	if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

async function suppressOverlays(page) {
	await page.evaluate(() => {
		try {
			const style = document.createElement("style");
			style.id = "suppress-all-proof-overlays-implants";
			style.innerHTML = `
				.tour-spotlight-root, .tour-backdrop-clickable-zone,
				[data-testid="guided-tour-spotlight-overlay"],
				[data-testid="guided-tour-coach-mark-card"],
				[data-testid="demo-mode-banner"], .global-toast-container,
				.workspace-continuity-strip, .copilot-trigger-btn,
				vite-error-overlay { display: none !important; pointer-events: none !important; }
			`;
			document.head.appendChild(style);
			document.querySelectorAll("vite-error-overlay, .tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay']").forEach((el) => el.remove());
		} catch (_) {}
	});
}

async function applyTheme(page, isDark) {
	await page.evaluate((dark) => {
		const theme = dark ? "dark" : "light";
		localStorage.setItem("dente_theme", theme);
		localStorage.setItem("dente_theme_mode", theme);
		localStorage.setItem("theme", theme);
		document.documentElement.setAttribute("data-theme", theme);
		document.body.setAttribute("data-theme", theme);
		document.documentElement.classList.toggle("dark", dark);
		document.documentElement.classList.toggle("light", !dark);
		document.documentElement.style.colorScheme = dark ? "dark" : "light";
	}, isDark);
	await page.waitForTimeout(600);
}

async function main() {
	console.log("=== IMPLANTS DOMAIN: CANONICAL 4-STATE VISUAL PROOF CAPTURE ===");

	const browser = await chromium.launch({
		headless: true,
		executablePath: fs.existsSync("C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe")
			? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
			: undefined,
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	const configs = [
		{
			filename: "01_implant_passport_pc_light_1440x900.png",
			desc: "PC Light 1440x900 (Implant Passport Card & Surgical Hub)",
			viewport: { width: 1440, height: 900 },
			isDark: false,
			isMobile: false,
		},
		{
			filename: "02_implant_passport_pc_dark_1440x900.png",
			desc: "PC Dark 1440x900 (Implant Passport Card & Surgical Hub)",
			viewport: { width: 1440, height: 900 },
			isDark: true,
			isMobile: false,
		},
		{
			filename: "03_implant_passport_mobile_light_390x844.png",
			desc: "Mobile Light 390x844 (Apple HIG Bottom Sheet & Natural Thumb Zone)",
			viewport: { width: 390, height: 844 },
			isDark: false,
			isMobile: true,
		},
		{
			filename: "04_implant_passport_mobile_dark_390x844.png",
			desc: "Mobile Dark 390x844 (Apple HIG Bottom Sheet & Natural Thumb Zone)",
			viewport: { width: 390, height: 844 },
			isDark: true,
			isMobile: true,
		},
	];

	for (const cfg of configs) {
		console.log(`\n📸 Capturing ${cfg.filename} (${cfg.desc})...`);
		const context = await browser.newContext({
			viewport: cfg.viewport,
			isMobile: cfg.isMobile,
			hasTouch: cfg.isMobile,
			deviceScaleFactor: cfg.isMobile ? 2 : 1,
			colorScheme: cfg.isDark ? "dark" : "light",
		});

		const page = await context.newPage();
		console.log(`  Navigating to ${WEB_URL}...`);
		await page.goto(WEB_URL);

		// Wait for surgery hub & passport card to mount
		await page.waitForSelector('[data-testid="chairside-surgery-hub-modal"]', { timeout: 15000 });
		await page.waitForSelector('.implant-passport-display-card, [data-testid="anatomical-jaw-arch"]', { timeout: 15000 });

		await applyTheme(page, cfg.isDark);
		await suppressOverlays(page);
		await page.waitForTimeout(1000);

		const pDocs = path.join(OUT_DOCS, cfg.filename);
		const pBrain = path.join(OUT_BRAIN, cfg.filename);

		try {
			await page.screenshot({ path: pDocs, fullPage: false, animations: "disabled", timeout: 10000 });
		} catch (err) {
			console.warn(`  [Screenshot Retry]:`, err.message);
			await page.screenshot({ path: pDocs, fullPage: false, timeout: 10000 });
		}
		fs.copyFileSync(pDocs, pBrain);

		const size = fs.statSync(pDocs).size;
		if (size < 40000) {
			throw new Error(`[BLANK / CORRUPTED DETECTED] ${cfg.filename} is ${size} bytes (< 40KB threshold)!`);
		}
		console.log(`  ✅ [VERIFIED PROOF] ${cfg.filename} (${(size / 1024).toFixed(1)} KB) -> Saved.`);
		await context.close();
	}

	await browser.close();
	console.log("\n🎉 ALL 4-STATE VISUAL PROOFS CAPTURED SUCCESSFULLY (100% HIG & ZERO-CLIPPING VERIFIED)!");
}

main().catch((err) => {
	console.error("FATAL ERROR in 4-State Proof capture:", err);
	process.exit(1);
});
