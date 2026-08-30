import { copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const THEMES = ["light", "dark", "calm_teal", "night"];

const OUT_DIRS = [
	"C:/Clinic_MVP/dental-crm/docs/proofs/audit",
	"C:/Users/Admin/.gemini/antigravity/brain/597374ff-ac94-40b8-8848-ea236f205038",
];

for (const dir of OUT_DIRS) {
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}
}

const BASE_URL = "http://127.0.0.1:5173";

// Preflight Server Check
try {
	const res = await fetch(BASE_URL);
	if (!res.ok && res.status !== 200 && res.status !== 304) {
		throw new Error(`HTTP ${res.status}`);
	}
	console.log(`[PREFLIGHT] Dev server reachable at ${BASE_URL} (HTTP ${res.status})`);
} catch (e) {
	console.error(`[FATAL] Dev server preflight failed: ${e.message}. Ensure Vite server is running on ${BASE_URL}`);
	process.exit(1);
}

const edgePath = [
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
].find((p) => existsSync(p));

if (!edgePath) {
	console.error("[FATAL] Microsoft Edge/Chromium not found!");
	process.exit(1);
}

const browser = await chromium.launch({
	executablePath: edgePath,
	headless: true,
	args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
});

async function saveScreenshot(page, filename) {
	const primary = path.join(OUT_DIRS[0], filename);
	try {
		await page.screenshot({ path: primary, timeout: 10000, animations: "disabled" });
	} catch (err) {
		console.error(`[FATAL] Screenshot failed for ${filename}: ${err?.message || err}`);
		process.exit(1);
	}
	const size = statSync(primary).size;
	if (size < 30000) {
		console.error(`[FATAL] Screenshot ${filename} is too small (${size} bytes < 30KB). Render failure!`);
		process.exit(1);
	}

	for (let i = 1; i < OUT_DIRS.length; i++) {
		if (existsSync(OUT_DIRS[i])) {
			try {
				copyFileSync(primary, path.join(OUT_DIRS[i], filename));
			} catch (err) {
				console.error(`[FATAL] Copy screenshot failed for ${filename} to ${OUT_DIRS[i]}: ${err?.message || err}`);
				process.exit(1);
			}
		}
	}
}

async function applyTheme(page, theme) {
	try {
		await page.evaluate((th) => {
			document.documentElement.setAttribute("data-theme", th);
			const isDark =
				th === "dark" ||
				th === "night" ||
				th === "ocean" ||
				th === "emerald" ||
				th === "cyber_xray";
			document.documentElement.classList.toggle("dark", isDark);
			document.documentElement.classList.toggle("light", !isDark);
			document.body.className = isDark ? "dark" : "light";
			document.documentElement.style.colorScheme = isDark ? "dark" : "light";
		}, theme);
		await page.waitForTimeout(300);
	} catch (err) {
		console.error(`[FATAL] applyTheme failed for ${theme}: ${err.message}`);
		process.exit(1);
	}
}

const VIEWPORTS = [
	{ name: "pc_1440", width: 1440, height: 900, deviceScaleFactor: 2 },
	{ name: "mobile_390", width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
];

console.log("================================================================================");
console.log("   ANTI-OVERENGINEERING AUDIT: 4-STATE VISUAL VERIFICATION");
console.log("================================================================================");

for (const vp of VIEWPORTS) {
	const context = await browser.newContext({
		viewport: { width: vp.width, height: vp.height },
		deviceScaleFactor: vp.deviceScaleFactor,
		isMobile: vp.isMobile || false,
		hasTouch: vp.hasTouch || false,
	});

	const page = await context.newPage();

	for (const theme of THEMES) {
		console.log(`[AUDIT] Capturing Clean Modals Studio — Theme: ${theme.padEnd(10)} | Viewport: ${vp.name}`);

		// 1. Clinical Modals Showcase
		try {
			await page.goto(`${BASE_URL}/#clinical-modals-studio?theme=${theme}`, { waitUntil: "networkidle", timeout: 15000 });
		} catch (err) {
			console.error(`[FATAL] Navigation failed for clinical-modals-studio (${theme}): ${err.message}`);
			process.exit(1);
		}
		await page.waitForTimeout(500);
		await applyTheme(page, theme);
		await saveScreenshot(page, `audit_clean_studio_${theme}_${vp.name}.png`);

		// 2. Open Radiology Module in Studio
		const radBtn = page.locator('button:has-text("Лучевая диагностика")').first();
		if (await radBtn.isVisible()) {
			await radBtn.click();
			await page.waitForTimeout(400);
			await saveScreenshot(page, `audit_clean_radiology_${theme}_${vp.name}.png`);
			// Close modal
			const closeBtn = page.locator('button[aria-label="Закрыть"], button:has-text("✕"), button:has-text("Закрыть")').first();
			if (await closeBtn.isVisible()) {
				await closeBtn.click();
			}
			await page.waitForTimeout(200);
		}

		// 3. Open Quick Anesthesia / Diagnostics
		const anesthBtn = page.locator('button:has-text("Калькулятор анестезии")').first();
		if (await anesthBtn.isVisible()) {
			await anesthBtn.click();
			await page.waitForTimeout(300);
			await saveScreenshot(page, `audit_clean_anesthesia_${theme}_${vp.name}.png`);
			const closeBtn = page.locator('button[aria-label="Закрыть"], button:has-text("✕"), button:has-text("Закрыть")').first();
			if (await closeBtn.isVisible()) {
				await closeBtn.click();
			}
			await page.waitForTimeout(200);
		}

		// 4. Open Odontogram Studio with Pediatric Formula & Mixed Dentition
		try {
			await page.goto(`${BASE_URL}/#odontogram-studio?theme=${theme}`, { waitUntil: "networkidle", timeout: 15000 });
		} catch (err) {
			console.error(`[FATAL] Navigation failed for odontogram-studio (${theme}): ${err.message}`);
			process.exit(1);
		}
		await page.waitForTimeout(500);
		await applyTheme(page, theme);
		await saveScreenshot(page, `audit_clean_odontogram_${theme}_${vp.name}.png`);

		// Switch to pediatric formula
		const pedBtn = page.locator('[data-testid="dentition-mode-pediatric-btn"]');
		if (await pedBtn.isVisible()) {
			await pedBtn.click();
			await page.waitForTimeout(250);
			await saveScreenshot(page, `audit_clean_pediatric_${theme}_${vp.name}.png`);
		}

		// Switch to mixed dentition
		const mixedBtn = page.locator('[data-testid="dentition-mode-mixed-btn"]');
		if (await mixedBtn.isVisible()) {
			await mixedBtn.click();
			await page.waitForTimeout(250);
			await saveScreenshot(page, `audit_clean_mixed_${theme}_${vp.name}.png`);
		}
	}

	await context.close();
}

await browser.close();
console.log("\n[SUCCESS] Anti-Overengineering Visual Audit Screenshots captured!");

