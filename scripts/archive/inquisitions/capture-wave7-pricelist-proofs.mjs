/**
 * scripts/capture-wave7-pricelist-proofs.mjs
 * Red Team Wave 7 Visual Proof Pipeline: Service Catalog & Pricelist Studio (4-State Proof).
 *
 * 1. docs/proofs/pricelist/01_pricelist_pc_light.png (1440x900)
 * 2. docs/proofs/pricelist/02_pricelist_pc_dark.png (1440x900)
 * 3. docs/proofs/pricelist/03_pricelist_mobile_light.png (390x844)
 * 4. docs/proofs/pricelist/04_pricelist_mobile_dark.png (390x844)
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { chromium } from "playwright";

const BRAIN_DIR = "C:/Users/Admin/.gemini/antigravity/brain/5e4f0cae-e2a5-447e-9a70-fb9c14428ca3";
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

	// Mirror to brain dir and docs screenshots dir
	fs.copyFileSync(proofPath, path.join(BRAIN_DIR, fileName));
	fs.copyFileSync(proofPath, path.join(SCREENSHOTS_DIR, fileName));

	const aliasName = fileName.replace(/^\d+_/, "");
	if (aliasName !== fileName) {
		fs.copyFileSync(proofPath, path.join(PROOFS_DIR, aliasName));
		fs.copyFileSync(proofPath, path.join(BRAIN_DIR, aliasName));
		fs.copyFileSync(proofPath, path.join(SCREENSHOTS_DIR, aliasName));
	}

	if (buf.length < 30 * 1024) {
		console.warn(`WARNING: File size ${sizeKb} KB is below 30 KB`);
	}
	return { path: proofPath, sizeKb, hash };
}

async function main() {
	const webBase = "http://127.0.0.1:5174";
	console.log(`[Pricelist Proof] Target URL: ${webBase}`);

	const browser = await chromium.launch({
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	try {
		// 1. Desktop States (1440x900)
		console.log("\n--- Phase 1: PC Desktop Pricelist Studio (1440x900) ---");
		const pcContext = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
			isMobile: false,
			hasTouch: false,
		});
		const pcPage = await pcContext.newPage();
		pcPage.on("console", (msg) => console.log(`[PC Console] ${msg.type()}: ${msg.text()}`));
		pcPage.on("pageerror", (err) => console.error(`[PC Error]: ${err.message}`));

		console.log(`  -> Navigating to ${webBase}/?demo=true#pricelist...`);
		await pcPage.goto(`${webBase}/?demo=true#pricelist`, { waitUntil: "commit" });

		console.log("  -> Waiting for Pricelist Studio Modal to appear...");
		await pcPage.waitForSelector('[data-testid="service-pricelist-studio-modal"], .pricelist-studio-modal, .pricelist-studio-overlay', {
			timeout: 30000,
			state: "visible",
		});
		console.log("  -> Pricelist Studio Modal is mounted and visible!");
		await pcPage.waitForTimeout(1000);

		// PC Light
		console.log("  -> Switching to Light theme...");
		await setTheme(pcPage, "light", false);
		await captureProof(pcPage, "01_pricelist_pc_light.png");

		// PC Dark
		console.log("  -> Switching to Dark theme...");
		await setTheme(pcPage, "dark", true);
		await captureProof(pcPage, "02_pricelist_pc_dark.png");

		await pcContext.close();

		// 2. Mobile States (390x844)
		console.log("\n--- Phase 2: Mobile Pricelist Studio (390x844) ---");
		const mobileContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
			isMobile: true,
			hasTouch: true,
		});
		const mobilePage = await mobileContext.newPage();
		mobilePage.on("console", (msg) => console.log(`[Mobile Console] ${msg.type()}: ${msg.text()}`));
		mobilePage.on("pageerror", (err) => console.error(`[Mobile Error]: ${err.message}`));

		console.log(`  -> Navigating to ${webBase}/?demo=true#pricelist on Mobile...`);
		await mobilePage.goto(`${webBase}/?demo=true#pricelist`, { waitUntil: "commit" });

		console.log("  -> Waiting for Mobile Pricelist Studio Modal to appear...");
		await mobilePage.waitForSelector('[data-testid="service-pricelist-studio-modal"], .pricelist-studio-modal, .pricelist-studio-overlay', {
			timeout: 30000,
			state: "visible",
		});
		console.log("  -> Mobile Pricelist Studio Modal is mounted and visible!");
		await mobilePage.waitForTimeout(1000);

		// Mobile Light
		console.log("  -> Switching to Mobile Light theme...");
		await setTheme(mobilePage, "light", false);
		await captureProof(mobilePage, "03_pricelist_mobile_light.png");

		// Mobile Dark
		console.log("  -> Switching to Mobile Dark theme...");
		await setTheme(mobilePage, "dark", true);
		await captureProof(mobilePage, "04_pricelist_mobile_dark.png");

		await mobileContext.close();

		console.log("\n[VICTORY] All 4 Pricelist Visual Proofs captured successfully!");
	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("[FATAL ERROR]:", err);
	process.exit(1);
});
