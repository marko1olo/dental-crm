const path = require("node:path");
const fs = require("node:fs");
const { chromium } = require("playwright");

const ARTIFACT_DIR = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\f9424327-8b9d-4660-941a-388e5437d79d";
const DOCS_DIR = "C:\\Clinic_MVP\\dental-crm\\docs\\screenshots\\telephony_inquisition";

for (const d of [ARTIFACT_DIR, DOCS_DIR]) {
	if (!fs.existsSync(d)) {
		fs.mkdirSync(d, { recursive: true });
	}
}

async function run() {
	console.log("Launching browser via msedge/chromium...");
	let browser;
	try {
		browser = await chromium.launch({ channel: "msedge", headless: true });
	} catch (err) {
		console.warn("msedge launch failed, falling back to chromium:", err.message);
		browser = await chromium.launch({ headless: true });
	}

	try {
		const context = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
		});
		const page = await context.newPage();

		const baseUrl = "http://127.0.0.1:5173/telephony_inquisition_preview.html";

		// ----------------------------------------------------------------------
		// 1. INCOMING CALL POPUP (PC LIGHT & PC DARK)
		// ----------------------------------------------------------------------
		console.log("Capturing 1. Incoming Call Popup (PC Light)...");
		await page.goto(`${baseUrl}?theme=light&view=popup`, {
			waitUntil: "networkidle",
			timeout: 15000,
		});
		await page.waitForSelector('[data-testid="capsule-expand-btn"]', { state: "visible", timeout: 8000 });
		await page.click('[data-testid="capsule-expand-btn"]');
		await page.waitForSelector('[data-testid="incoming-call-popup"]', { state: "visible", timeout: 8000 });
		await page.waitForTimeout(500);

		const popupLightDocs = path.join(DOCS_DIR, "01_incoming_call_popup_pc_light.png");
		const popupLightArt = path.join(ARTIFACT_DIR, "01_incoming_call_popup_pc_light.png");
		await page.screenshot({ path: popupLightDocs });
		fs.copyFileSync(popupLightDocs, popupLightArt);
		console.log("Saved:", popupLightDocs);

		console.log("Capturing 1. Incoming Call Popup (PC Dark)...");
		await page.goto(`${baseUrl}?theme=dark&view=popup`, {
			waitUntil: "networkidle",
			timeout: 15000,
		});
		await page.waitForSelector('[data-testid="capsule-expand-btn"]', { state: "visible", timeout: 8000 });
		await page.click('[data-testid="capsule-expand-btn"]');
		await page.waitForSelector('[data-testid="incoming-call-popup"]', { state: "visible", timeout: 8000 });
		await page.waitForTimeout(500);

		const popupDarkDocs = path.join(DOCS_DIR, "01_incoming_call_popup_pc_dark.png");
		const popupDarkArt = path.join(ARTIFACT_DIR, "01_incoming_call_popup_pc_dark.png");
		await page.screenshot({ path: popupDarkDocs });
		fs.copyFileSync(popupDarkDocs, popupDarkArt);
		console.log("Saved:", popupDarkDocs);

		// ----------------------------------------------------------------------
		// 2. INCOMING CALL PATIENT DRAWER (PC DARK & PC LIGHT)
		// ----------------------------------------------------------------------
		console.log("Capturing 2. Incoming Call Patient Drawer (PC Dark)...");
		await page.goto(`${baseUrl}?theme=dark&view=drawer`, {
			waitUntil: "networkidle",
			timeout: 15000,
		});
		await page.waitForSelector('[data-testid="telephony-patient-side-drawer"]', { state: "visible", timeout: 8000 });
		await page.waitForTimeout(500);

		const drawerDarkDocs = path.join(DOCS_DIR, "02_telephony_patient_drawer_pc_dark.png");
		const drawerDarkArt = path.join(ARTIFACT_DIR, "02_telephony_patient_drawer_pc_dark.png");
		await page.screenshot({ path: drawerDarkDocs });
		fs.copyFileSync(drawerDarkDocs, drawerDarkArt);
		console.log("Saved:", drawerDarkDocs);

		console.log("Capturing 2. Incoming Call Patient Drawer (PC Light)...");
		await page.goto(`${baseUrl}?theme=light&view=drawer`, {
			waitUntil: "networkidle",
			timeout: 15000,
		});
		await page.waitForSelector('[data-testid="telephony-patient-side-drawer"]', { state: "visible", timeout: 8000 });
		await page.waitForTimeout(500);

		const drawerLightDocs = path.join(DOCS_DIR, "02_telephony_patient_drawer_pc_light.png");
		const drawerLightArt = path.join(ARTIFACT_DIR, "02_telephony_patient_drawer_pc_light.png");
		await page.screenshot({ path: drawerLightDocs });
		fs.copyFileSync(drawerLightDocs, drawerLightArt);
		console.log("Saved:", drawerLightDocs);

		// ----------------------------------------------------------------------
		// 3. TELEPHONY SOFTPHONE ISLAND (PC LIGHT & PC DARK)
		// ----------------------------------------------------------------------
		console.log("Capturing 3. Telephony Softphone Island (PC Light)...");
		await page.goto(`${baseUrl}?theme=light&view=softphone`, {
			waitUntil: "networkidle",
			timeout: 15000,
		});
		await page.waitForSelector('[data-testid="telephony-floating-widget"]', { state: "visible", timeout: 8000 });
		await page.waitForTimeout(500);

		const softphoneLightDocs = path.join(DOCS_DIR, "03_telephony_softphone_island_pc_light.png");
		const softphoneLightArt = path.join(ARTIFACT_DIR, "03_telephony_softphone_island_pc_light.png");
		await page.screenshot({ path: softphoneLightDocs });
		fs.copyFileSync(softphoneLightDocs, softphoneLightArt);
		console.log("Saved:", softphoneLightDocs);

		console.log("Capturing 3. Telephony Softphone Island (PC Dark)...");
		await page.goto(`${baseUrl}?theme=dark&view=softphone`, {
			waitUntil: "networkidle",
			timeout: 15000,
		});
		await page.waitForSelector('[data-testid="telephony-floating-widget"]', { state: "visible", timeout: 8000 });
		await page.waitForTimeout(500);

		const softphoneDarkDocs = path.join(DOCS_DIR, "03_telephony_softphone_island_pc_dark.png");
		const softphoneDarkArt = path.join(ARTIFACT_DIR, "03_telephony_softphone_island_pc_dark.png");
		await page.screenshot({ path: softphoneDarkDocs });
		fs.copyFileSync(softphoneDarkDocs, softphoneDarkArt);
		console.log("Saved:", softphoneDarkDocs);

		console.log("ALL 6 INQUISITION PROOFS CAPTURED SUCCESSFULLY!");
	} finally {
		await browser.close();
	}
}

run().catch((err) => {
	console.error("Capture failed:", err);
	process.exit(1);
});
