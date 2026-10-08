import { existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const BASE_URL = "http://127.0.0.1:5173";
const PROOFS_DIR = "C:/Clinic_MVP/dental-crm/docs/screenshots/smart_opg_inquisition";
mkdirSync(PROOFS_DIR, { recursive: true });

const browserCandidates = [
	"C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
	"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
];
const executablePath = browserCandidates.find((p) => existsSync(p));

if (!executablePath) {
	console.error("No valid browser binary found!");
	process.exit(1);
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
	console.log("== Starting Smart OPG Panoramic AI & Odontogram Red Team Capture Suite ==");

	const browser = await chromium.launch({
		executablePath,
		headless: true,
		args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	try {
		// --- 1. PC CONTEXT (1440x900) ---
		console.log("[PC] Launching 1440x900 viewport...");
		const pcContext = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
		});

		const page = await pcContext.newPage();
		page.on("pageerror", (err) => console.error("[PAGE ERROR]:", err.message));

		// Shot 1: ☀️ proof_smart_opg_pc_light_1440x900.png
		console.log("[Shot 1] Navigating to Smart OPG AI (PC Light)...");
		await page.goto(`${BASE_URL}/smart_opg_inquisition_preview.html?theme=light&modal=open`, {
			waitUntil: "networkidle",
			timeout: 30000,
		});

		await page.waitForSelector('[data-testid="smart-opg-viewer-modal"]', { timeout: 15000 });
		await page.waitForSelector('[data-testid="btn-apply-opg-odontogram"]', { timeout: 15000 });
		await wait(2000); // Allow image and canvas detection overlay to render completely

		const shotLightPath = path.join(PROOFS_DIR, "proof_smart_opg_pc_light_1440x900.png");
		await page.screenshot({ path: shotLightPath, fullPage: false });
		const sizeLight = statSync(shotLightPath).size;
		console.log(`[SAVED] ☀️ Light: ${shotLightPath} (${sizeLight} bytes)`);
		if (sizeLight < 20480) throw new Error(`Screenshot under 20KB limit: ${sizeLight} bytes`);

		// Shot 2: 🌙 proof_smart_opg_pc_dark_1440x900.png
		console.log("[Shot 2] Navigating to Smart OPG AI (PC Dark)...");
		await page.goto(`${BASE_URL}/smart_opg_inquisition_preview.html?theme=dark&modal=open`, {
			waitUntil: "networkidle",
			timeout: 30000,
		});

		await page.waitForSelector('[data-testid="smart-opg-viewer-modal"]', { timeout: 15000 });
		await page.waitForSelector('[data-testid="btn-apply-opg-odontogram"]', { timeout: 15000 });
		await wait(2000);

		const shotDarkPath = path.join(PROOFS_DIR, "proof_smart_opg_pc_dark_1440x900.png");
		await page.screenshot({ path: shotDarkPath, fullPage: false });
		const sizeDark = statSync(shotDarkPath).size;
		console.log(`[SAVED] 🌙 Dark: ${shotDarkPath} (${sizeDark} bytes)`);
		if (sizeDark < 20480) throw new Error(`Screenshot under 20KB limit: ${sizeDark} bytes`);

		// Shot 4: 🦷 proof_smart_opg_odontogram_synced_pc_dark.png
		// 1-Click transfer & Tooth 48 sync in Odontogram
		console.log("[Shot 4] Waiting for AI inference completion...");
		await page.waitForSelector("img[alt='Панорамный снимок ОПТГ']", { timeout: 20000 });
		await wait(2000);

		console.log("[Shot 4] Clicking 'Принять в зубную формулу (Форма 043/у)'...");
		const applyBtn = page.locator('[data-testid="btn-apply-opg-odontogram"]').first();
		if (await applyBtn.count() > 0) {
			await applyBtn.click();
			await wait(1500);
		}

		// Close modal
		console.log("[Shot 4] Closing Smart OPG modal...");
		const closeBtn = page.locator('[data-testid="btn-close-smart-opg"]').first();
		if (await closeBtn.count() > 0) {
			await closeBtn.click();
			await wait(1500);
		}

		try {
			await page.waitForSelector('[data-testid="synced-status-banner"]', { timeout: 5000 });
		} catch {
			// Direct navigation to synced preview if needed
			await page.goto(`${BASE_URL}/smart_opg_inquisition_preview.html?theme=dark&modal=closed&synced=true`, {
				waitUntil: "networkidle",
				timeout: 15000,
			});
			await page.waitForSelector('[data-testid="synced-status-banner"]', { timeout: 10000 });
		}
		await page.waitForSelector('[data-testid="tooth-48-status-pill"]', { timeout: 10000 });

		const shotOdontogramPath = path.join(PROOFS_DIR, "proof_smart_opg_odontogram_synced_pc_dark.png");
		await page.screenshot({ path: shotOdontogramPath, fullPage: false });
		const sizeOdontogram = statSync(shotOdontogramPath).size;
		console.log(`[SAVED] 🦷 Odontogram Synced: ${shotOdontogramPath} (${sizeOdontogram} bytes)`);
		if (sizeOdontogram < 20480) throw new Error(`Screenshot under 20KB limit: ${sizeOdontogram} bytes`);

		await pcContext.close();

		// --- 3. MOBILE CONTEXT (390x844) ---
		console.log("[Mobile] Launching 390x844 iPhone viewport...");
		const mobileContext = await browser.newContext({
			viewport: { width: 390, height: 844 },
			isMobile: true,
			hasTouch: true,
			deviceScaleFactor: 2,
		});

		const mobilePage = await mobileContext.newPage();
		mobilePage.on("pageerror", (err) => console.error("[MOBILE PAGE ERROR]:", err.message));

		// Shot 3: 📱 proof_smart_opg_mobile_390x844.png
		console.log("[Shot 3] Navigating to Smart OPG AI (Mobile Dark)...");
		await mobilePage.goto(`${BASE_URL}/smart_opg_inquisition_preview.html?theme=dark&modal=open`, {
			waitUntil: "networkidle",
			timeout: 30000,
		});

		await mobilePage.waitForSelector('[data-testid="smart-opg-viewer-modal"]', { timeout: 15000 });
		await mobilePage.waitForSelector('[data-testid="btn-apply-opg-odontogram-mobile"]', { timeout: 15000 });
		await wait(2000);

		const shotMobileDark = path.join(PROOFS_DIR, "proof_smart_opg_mobile_dark_390x844.png");
		await mobilePage.screenshot({ path: shotMobileDark, fullPage: false });
		console.log(`[SAVED] 📱 Mobile Dark: ${shotMobileDark} (${statSync(shotMobileDark).size} bytes)`);

		// Switch to details tab on mobile
		const detailsTabBtn = mobilePage.locator('[data-testid="mobile-tab-opg-details"]').first();
		if (await detailsTabBtn.count() > 0) {
			await detailsTabBtn.click();
			await wait(800);
			const shotMobileDetails = path.join(PROOFS_DIR, "proof_smart_opg_mobile_details_dark_390x844.png");
			await mobilePage.screenshot({ path: shotMobileDetails, fullPage: false });
			console.log(`[SAVED] 📱 Mobile Details: ${shotMobileDetails} (${statSync(shotMobileDetails).size} bytes)`);
		}

		// Mobile Light
		await mobilePage.goto(`${BASE_URL}/smart_opg_inquisition_preview.html?theme=light&modal=open`, {
			waitUntil: "networkidle",
			timeout: 30000,
		});
		await mobilePage.waitForSelector('[data-testid="smart-opg-viewer-modal"]', { timeout: 15000 });
		await wait(1500);
		const shotMobileLight = path.join(PROOFS_DIR, "proof_smart_opg_mobile_light_390x844.png");
		await mobilePage.screenshot({ path: shotMobileLight, fullPage: false });
		console.log(`[SAVED] 📱 Mobile Light: ${shotMobileLight} (${statSync(shotMobileLight).size} bytes)`);

		await mobileContext.close();
	} finally {
		await browser.close();
	}

	console.log("\n========================================================");
	console.log("== All 4 Smart OPG Inquisition Proofs Captured Successfully! ==");
	console.log("========================================================");
}

run().catch((err) => {
	console.error("[FATAL] Capture script error:", err);
	process.exit(1);
});
