import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { chromium } from "playwright";

const BRAIN_DIR = "C:/Users/Admin/.gemini/antigravity/brain/e48c63ac-450a-4577-a8bf-4babbd82e8aa";
const PROOFS_DIR = path.resolve(process.cwd(), "docs/proofs/pricelist");
const SCREENSHOTS_DIR = path.resolve(process.cwd(), "docs/screenshots/pricelist");

for (const d of [BRAIN_DIR, PROOFS_DIR, SCREENSHOTS_DIR]) {
	if (!fs.existsSync(d)) {
		fs.mkdirSync(d, { recursive: true });
	}
}

async function setTheme(page, themeId, isDark) {
	await page.evaluate(
		({ themeId, isDark }) => {
			document.documentElement.setAttribute("data-theme", themeId);
			document.documentElement.classList.toggle("dark", isDark);
			document.documentElement.classList.toggle("light", !isDark);
			document.documentElement.style.colorScheme = isDark ? "dark" : "light";
			if (window.__useThemeStore) {
				window.__useThemeStore.getState().setThemeMode(themeId);
			}
			localStorage.setItem("dente_theme_mode", themeId);
		},
		{ themeId, isDark }
	);
	await page.waitForTimeout(600);
}

async function captureProof(page, fileName) {
	const proofPath = path.join(PROOFS_DIR, fileName);
	await page.waitForTimeout(600);
	await page.screenshot({ path: proofPath, fullPage: false });

	const buf = fs.readFileSync(proofPath);
	const sizeKb = (buf.length / 1024).toFixed(1);
	const hash = crypto.createHash("md5").update(buf).digest("hex");
	console.log(`  -> Captured: ${fileName} (${sizeKb} KB, md5: ${hash.slice(0, 8)})`);

	fs.copyFileSync(proofPath, path.join(BRAIN_DIR, fileName));
	fs.copyFileSync(proofPath, path.join(SCREENSHOTS_DIR, fileName));

	if (buf.length < 30 * 1024) {
		console.warn(`WARNING: ${fileName} size is small: ${sizeKb} KB`);
	}
	return { path: proofPath, sizeKb, hash };
}

const browser = await chromium.launch({ headless: true });

// 1. PC (1440x900)
console.log("\n=== Phase 1: PC 1440x900 ===");
const pcPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await pcPage.goto("http://127.0.0.1:5174/?demo=true#pricelist", { waitUntil: "load", timeout: 60000 });
await pcPage.waitForSelector(".pricelist-studio-overlay", { timeout: 30000 });
await pcPage.waitForTimeout(1000);

console.log("Switching to PC Light...");
await setTheme(pcPage, "light", false);
await captureProof(pcPage, "01_pricelist_pc_light.png");

console.log("Switching to PC Dark...");
await setTheme(pcPage, "dark", true);
await captureProof(pcPage, "02_pricelist_pc_dark.png");

await pcPage.close();

// 2. Mobile (390x844)
console.log("\n=== Phase 2: Mobile 390x844 ===");
const mobilePage = await browser.newPage({
	viewport: { width: 390, height: 844 },
	deviceScaleFactor: 2,
	isMobile: true,
	hasTouch: true,
});
await mobilePage.goto("http://127.0.0.1:5174/?demo=true#pricelist", { waitUntil: "load", timeout: 60000 });
await mobilePage.waitForSelector(".pricelist-studio-overlay", { timeout: 30000 });
await mobilePage.waitForTimeout(1000);

console.log("Switching to Mobile Light...");
await setTheme(mobilePage, "light", false);
await captureProof(mobilePage, "03_pricelist_mobile_light.png");

console.log("Switching to Mobile Dark...");
await setTheme(mobilePage, "dark", true);
await captureProof(mobilePage, "04_pricelist_mobile_dark.png");

await mobilePage.close();
await browser.close();

console.log("\n[VICTORY] All 4 Visual Proofs captured successfully!");
