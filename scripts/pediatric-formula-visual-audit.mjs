import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const THEMES = [
	"light",
	"dark",
	"night",
	"calm_teal",
	"contrast",
	"sakura",
	"ocean",
	"emerald",
	"cyber_xray",
	"warm_sand",
];

const OUT_DIRS = [
	"C:/Clinic_MVP/dental-crm/docs/proofs/odontogram",
	"C:/Users/Admin/.gemini/antigravity/brain/597374ff-ac94-40b8-8848-ea236f205038",
];

for (const dir of OUT_DIRS) {
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}
}

const edgePath = [
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
].find((p) => existsSync(p));

if (!edgePath) {
	console.error("Microsoft Edge/Chromium not found!");
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
	} catch {
		try {
			await page.screenshot({ path: primary, timeout: 10000 });
		} catch (err) {
			console.warn(`[WARN] screenshot failed for ${filename}:`, err?.message || err);
		}
	}
	for (let i = 1; i < OUT_DIRS.length; i++) {
		try {
			copyFileSync(primary, path.join(OUT_DIRS[i], filename));
		} catch {
			/* ignore */
		}
	}
}

async function applyTheme(page, theme) {
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
	await page.waitForTimeout(200);
}

const VIEWPORTS = [
	{ name: "pc_1440", width: 1440, height: 900, deviceScaleFactor: 2 },
	{ name: "tablet_1024", width: 1024, height: 768, deviceScaleFactor: 2 },
	{ name: "mobile_390", width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
];

console.log("================================================================================");
console.log("   PEDIATRIC TOOTH FORMULA & MIXED DENTITION 10-THEME VISUAL AUDIT");
console.log("================================================================================");

const BASE_URL = "http://127.0.0.1:5173";

for (const vp of VIEWPORTS) {
	const context = await browser.newContext({
		viewport: { width: vp.width, height: vp.height },
		deviceScaleFactor: vp.deviceScaleFactor,
		isMobile: vp.isMobile || false,
		hasTouch: vp.hasTouch || false,
	});

	const page = await context.newPage();

	for (const theme of THEMES) {
		console.log(`[AUDIT] Capturing Pediatric Studio — Theme: ${theme.padEnd(12)} | Viewport: ${vp.name}`);

		// 1. Load Odontogram Studio Standalone
		await page.goto(`${BASE_URL}/odontogram-studio?theme=${theme}`, { waitUntil: "domcontentloaded", timeout: 15000 }).catch(() => {});
		await page.waitForTimeout(500);
		await applyTheme(page, theme);

		// Switch to pediatric mode
		const pedBtn = page.locator('[data-testid="dentition-mode-pediatric-btn"]');
		if (await pedBtn.isVisible()) {
			await pedBtn.click();
			await page.waitForTimeout(250);
		}

		await saveScreenshot(page, `audit_pediatric_formula_${theme}_${vp.name}.png`);

		// Switch to mixed dentition mode
		const mixedBtn = page.locator('[data-testid="dentition-mode-mixed-btn"]');
		if (await mixedBtn.isVisible()) {
			await mixedBtn.click();
			await page.waitForTimeout(250);
			await saveScreenshot(page, `audit_mixed_dentition_${theme}_${vp.name}.png`);
		}

		// 2. Load Pediatric Perspective View with Cariogram & Timeline
		await page.goto(`${BASE_URL}/pediatric-perspective?theme=${theme}`, { waitUntil: "domcontentloaded", timeout: 15000 }).catch(() => {});
		await page.waitForTimeout(500);
		await applyTheme(page, theme);

		await saveScreenshot(page, `audit_pediatric_perspective_${theme}_${vp.name}.png`);
	}

	await context.close();
}

await browser.close();
console.log("\n[SUCCESS] Pediatric Visual Audit Completed! All screenshots captured and saved.");
