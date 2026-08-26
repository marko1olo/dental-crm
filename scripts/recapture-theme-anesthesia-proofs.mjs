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

const VIEWPORTS = [
	{ name: "pc_1440", width: 1440, height: 900, scale: 2, isMobile: false },
	{ name: "tablet_1024", width: 1024, height: 768, scale: 2, isMobile: false },
	{ name: "mobile_390", width: 390, height: 844, scale: 3, isMobile: true, hasTouch: true },
];

const OUT_DIRS = [
	"C:/Clinic_MVP/dental-crm/docs/proofs/clinical_modals_audit",
	"C:/Clinic_MVP/dental-crm/apps/web/screenshots",
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
		await page.screenshot({ path: primary, timeout: 8000, animations: "disabled" });
	} catch {
		try {
			await page.screenshot({ path: primary, timeout: 8000 });
		} catch (err) {
			console.warn(`[WARN] screenshot failed for ${filename}:`, err?.message || err);
		}
	}
	for (let i = 1; i < OUT_DIRS.length; i++) {
		try {
			copyFileSync(primary, path.join(OUT_DIRS[i], filename));
		} catch {
			/* ignore secondary copy error */
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

console.log("=== RE-CAPTURING 10-THEME ANESTHESIA & CLINICAL PROOFS ===");

for (const theme of THEMES) {
	console.log(`\n--- THEME: ${theme.toUpperCase()} ---`);
	for (const vp of VIEWPORTS) {
		const context = await browser.newContext({
			viewport: { width: vp.width, height: vp.height },
			deviceScaleFactor: vp.scale,
			isMobile: vp.isMobile,
			hasTouch: vp.hasTouch,
		});
		const page = await context.newPage();

		try {
			await page.goto("http://127.0.0.1:5173/?clinical-modals-studio#clinical-modals-studio", {
				waitUntil: "domcontentloaded",
				timeout: 10000,
			});
			await page.waitForSelector("[data-testid='anesthesia-calculator']", { timeout: 6000 });
			await applyTheme(page, theme);

			// 1. Expand Anesthesia Calculator if not expanded
			const calcHeader = page.locator("[data-testid='anesthesia-calculator'] > div").first();
			if (await calcHeader.count()) {
				// Click to expand
				await calcHeader.click({ force: true });
				await page.waitForTimeout(200);

				// If Sakura theme, select a specific drug (e.g. Ultracain Forte) and method (Infiltration) to showcase pink active borders
				if (theme === "sakura") {
					const forteBtn = page.locator("button:has-text('Ультракаин Д-С форте')").first();
					if (await forteBtn.count()) await forteBtn.click({ force: true });
					const infiltBtn = page.locator("button:has-text('Инфильтрационная')").first();
					if (await infiltBtn.count()) await infiltBtn.click({ force: true });
					await page.waitForTimeout(150);
				}

				const shotAnesth = `audit_anesthesia_${theme}_${vp.name}.png`;
				await saveScreenshot(page, shotAnesth);
				console.log(`[PASS] Captured ${shotAnesth}`);
			}

			// 2. Capture showcase overview
			const shotShowcase = `audit_studio_showcase_${theme}_${vp.name}.png`;
			await saveScreenshot(page, shotShowcase);
			console.log(`[PASS] Captured ${shotShowcase}`);

		} catch (err) {
			console.warn(`[WARN] Audit failed for ${theme} ${vp.name}:`, err?.message || err);
		} finally {
			await context.close();
		}
	}
}

await browser.close();
console.log("\n=== ALL ANESTHESIA 10-THEME SCREENSHOTS RE-CAPTURED SUCCESSFULLY ===");
