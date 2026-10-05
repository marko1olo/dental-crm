const { mkdir } = require("node:fs/promises");
const path = require("node:path");
const { chromium } = require("playwright");

const CONV_ID = "e02712b1-0eab-4bd9-a2bb-0fb05b90a1dd";
const OUT_CONV = `C:/Users/Admin/.gemini/antigravity/brain/${CONV_ID}/screenshots`;
const OUT_DOCS = "C:/Clinic_MVP/dental-crm/docs/screenshots/inquisition_live";
const webBaseUrl = "http://127.0.0.1:5173";

async function saveBoth(page, filename) {
	await page.screenshot({ path: path.join(OUT_CONV, filename), fullPage: false, animations: "disabled", timeout: 15000 });
	await page.screenshot({ path: path.join(OUT_DOCS, filename), fullPage: false, animations: "disabled", timeout: 15000 });
	console.log(`[CAPTURED] ${filename}`);
}

async function run() {
	await mkdir(OUT_CONV, { recursive: true });
	await mkdir(OUT_DOCS, { recursive: true });

	console.log("Launching Edge/Chromium with deviceScaleFactor: 2...");
	const browser = await chromium.launch({
		channel: "msedge",
		headless: true,
	});

	// ==========================================
	// 1. BOT STUDIO WIZARD (3 States + Mobile)
	// ==========================================

	// 1.1 State 1: Channels (PC Light & Dark)
	console.log("--- 1.1 Bot Studio Channels (PC) ---");
	for (const theme of ["light", "dark"]) {
		const page = await browser.newPage({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 2,
		});
		await page.goto(`${webBaseUrl}/telegram_studio_preview.html?theme=${theme}&step=1`, {
			waitUntil: "networkidle",
			timeout: 30000,
		});
		await page.waitForSelector(".telegram-studio-root", { visible: true, timeout: 15000 });
		await page.waitForTimeout(600);
		await saveBoth(page, `proof_bot_studio_channels_pc_${theme}.png`);
		await page.close();
	}

	// 1.2 State 2: Plugins showcase (PC Light & Dark)
	console.log("--- 1.2 Bot Studio Plugins (PC) ---");
	for (const theme of ["light", "dark"]) {
		const page = await browser.newPage({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 2,
		});
		await page.goto(`${webBaseUrl}/telegram_studio_preview.html?theme=${theme}&step=3`, {
			waitUntil: "networkidle",
			timeout: 30000,
		});
		await page.waitForSelector(".bot-plugins-list", { visible: true, timeout: 15000 });
		await page.waitForTimeout(600);
		await saveBoth(page, `proof_bot_studio_plugins_pc_${theme}.png`);
		await page.close();
	}

	// 1.3 State 3: Live running bot + webhook badge + ZIP download (PC Light & Dark)
	console.log("--- 1.3 Bot Studio Live Webhook & ZIP (PC) ---");
	for (const theme of ["light", "dark"]) {
		const page = await browser.newPage({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 2,
		});
		await page.goto(`${webBaseUrl}/telegram_studio_preview.html?theme=${theme}&step=4`, {
			waitUntil: "networkidle",
			timeout: 30000,
		});
		await page.waitForSelector(".bot-launch-control-card", { visible: true, timeout: 15000 });
		await page.waitForTimeout(600);
		await saveBoth(page, `proof_bot_studio_live_pc_${theme}.png`);
		await page.close();
	}

	// 1.4 Bot Studio Mobile (390x844 Light & Dark)
	console.log("--- 1.4 Bot Studio Mobile ---");
	for (const theme of ["light", "dark"]) {
		const page = await browser.newPage({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
		});
		await page.goto(`${webBaseUrl}/telegram_studio_preview.html?theme=${theme}&step=1`, {
			waitUntil: "networkidle",
			timeout: 30000,
		});
		await page.waitForSelector(".telegram-studio-root", { visible: true, timeout: 15000 });
		await page.waitForTimeout(600);
		await saveBoth(page, `proof_bot_studio_mobile_${theme}.png`);
		await page.close();
	}

	// ==========================================
	// 2. CLINIC ONBOARDING & PRESETS
	// ==========================================

	// 2.1 State 1: 3-Click Scale Presets (PC Light & Dark)
	console.log("--- 2.1 Onboarding Sovereign Scale Presets (PC) ---");
	for (const theme of ["light", "dark"]) {
		const page = await browser.newPage({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 2,
		});
		await page.goto(`${webBaseUrl}/onboarding_presets_preview.html?theme=${theme}`, {
			waitUntil: "networkidle",
			timeout: 30000,
		});
		await page.waitForSelector('[data-testid="sovereign-presets-card"]', { visible: true, timeout: 15000 });
		await page.waitForTimeout(600);
		await saveBoth(page, `proof_clinic_onboarding_presets_pc_${theme}.png`);
		await page.close();
	}

	// 2.2 Onboarding Presets Mobile (390x844 Light & Dark)
	console.log("--- 2.2 Onboarding Sovereign Scale Presets (Mobile) ---");
	for (const theme of ["light", "dark"]) {
		const page = await browser.newPage({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
		});
		await page.goto(`${webBaseUrl}/onboarding_presets_preview.html?theme=${theme}`, {
			waitUntil: "networkidle",
			timeout: 30000,
		});
		await page.waitForSelector('[data-testid="sovereign-presets-card"]', { visible: true, timeout: 15000 });
		await page.waitForTimeout(600);
		await saveBoth(page, `proof_clinic_onboarding_presets_mobile_${theme}.png`);
		await page.close();
	}

	// 2.3 State 2: Spotlight Tour Active (PC Light & Dark)
	console.log("--- 2.3 Interactive Spotlight Tour (PC) ---");
	for (const theme of ["light", "dark"]) {
		const page = await browser.newPage({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 2,
		});
		await page.goto(`${webBaseUrl}/onboarding_presets_preview.html?theme=${theme}&tour=true`, {
			waitUntil: "networkidle",
			timeout: 30000,
		});
		// Wait for tour card to appear
		await page.waitForSelector('[data-testid="interactive-guide-tour-card"]', { visible: true, timeout: 15000 });
		await page.waitForTimeout(800);
		await saveBoth(page, `proof_spotlight_tour_pc_${theme}.png`);
		await page.close();
	}

	// ==========================================
	// 3. PRICELIST 804n SCANNER & MATCHING
	// ==========================================

	// 3.1 State 1: Upload & Paste Zone (PC Light & Dark)
	console.log("--- 3.1 Pricelist Scanner Upload & Paste Zone (PC) ---");
	for (const theme of ["light", "dark"]) {
		const page = await browser.newPage({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 2,
		});
		await page.goto(`${webBaseUrl}/pricelist_scanner_preview.html?theme=${theme}&mode=upload`, {
			waitUntil: "networkidle",
			timeout: 30000,
		});
		await page.waitForSelector(".pricelist-upload-area", { visible: true, timeout: 15000 });
		await page.waitForTimeout(600);
		await saveBoth(page, `proof_pricelist_scanner_upload_pc_${theme}.png`);
		await page.close();
	}

	// 3.2 State 2: Dual-Pane 804n Mapping Diff View (PC Light & Dark)
	console.log("--- 3.2 Pricelist 804n Semantic Diff Table (PC) ---");
	for (const theme of ["light", "dark"]) {
		const page = await browser.newPage({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 2,
		});
		await page.goto(`${webBaseUrl}/pricelist_scanner_preview.html?theme=${theme}&mode=diff`, {
			waitUntil: "networkidle",
			timeout: 30000,
		});
		await page.waitForSelector('[data-testid="pricelist-diff-container"]', { visible: true, timeout: 15000 });
		await page.waitForTimeout(600);
		await saveBoth(page, `proof_pricelist_mapping_diff_pc_${theme}.png`);
		await page.close();
	}

	// 3.3 Pricelist Diff Mobile (390x844 Light & Dark)
	console.log("--- 3.3 Pricelist 804n Semantic Diff Table (Mobile) ---");
	for (const theme of ["light", "dark"]) {
		const page = await browser.newPage({
			viewport: { width: 390, height: 844 },
			deviceScaleFactor: 2,
		});
		await page.goto(`${webBaseUrl}/pricelist_scanner_preview.html?theme=${theme}&mode=diff`, {
			waitUntil: "networkidle",
			timeout: 30000,
		});
		await page.waitForSelector('[data-testid="pricelist-diff-container"]', { visible: true, timeout: 15000 });
		await page.waitForTimeout(600);
		await saveBoth(page, `proof_pricelist_mapping_diff_mobile_${theme}.png`);
		await page.close();
	}

	await browser.close();
	console.log("All inquisition proofs captured successfully!");
}

run().catch((err) => {
	console.error("FATAL in capture suite:", err);
	process.exit(1);
});
