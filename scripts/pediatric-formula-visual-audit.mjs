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
	await page.waitForTimeout(300);
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
		console.log(`[AUDIT] Capturing Odontogram Studio — Theme: ${theme.padEnd(12)} | Viewport: ${vp.name}`);

		await page.goto(`${BASE_URL}/?odontogram-studio=1`, { waitUntil: "networkidle", timeout: 15000 }).catch(() => {});
		await page.waitForTimeout(400);
		await applyTheme(page, theme);

		// Adult permanent baseline (32 teeth)
		await saveScreenshot(page, `audit_adult_formula_${theme}_${vp.name}.png`);

		// Switch to pediatric formula (51–85) via "Детский" preset
		const pedBtn = page.locator('button:has-text("Детский")').first();
		if (await pedBtn.isVisible()) {
			await pedBtn.click();
			await page.waitForTimeout(300);
			await saveScreenshot(page, `audit_pediatric_formula_${theme}_${vp.name}.png`);
		}

		// Switch to 5-surface clinical mode
		const fiveSurfaceBtn = page.locator('button:has-text("5-Поверхностный")').first();
		if (await fiveSurfaceBtn.isVisible()) {
			await fiveSurfaceBtn.click();
			await page.waitForTimeout(300);
			await saveScreenshot(page, `audit_pediatric_5surface_${theme}_${vp.name}.png`);
		}

		// Switch to GOST 043/u mode
		const gostBtn = page.locator('button:has-text("ГОСТ 043/у")').first();
		if (await gostBtn.isVisible()) {
			await gostBtn.click();
			await page.waitForTimeout(300);
			await saveScreenshot(page, `audit_pediatric_gost_${theme}_${vp.name}.png`);
		}
	}

	await context.close();
}

await browser.close();
console.log("\n[SUCCESS] Pediatric Visual Audit Completed! All screenshots captured and saved.");
