const path = require("node:path");
const fs = require("node:fs");
const { chromium } = require("playwright");

const ARTIFACT_DIR = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\e32e633d-4fb9-4447-8673-59be95d5530c";
const DOCS_DIR = "C:\\Clinic_MVP\\dental-crm\\docs\\screenshots\\inquisition_patients";

async function run() {
	if (!fs.existsSync(DOCS_DIR)) {
		fs.mkdirSync(DOCS_DIR, { recursive: true });
	}
	if (!fs.existsSync(ARTIFACT_DIR)) {
		fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
	}

	console.log("Launching Microsoft Edge ({ channel: 'msedge' })...");
	let browser;
	try {
		browser = await chromium.launch({ channel: "msedge", headless: true });
	} catch (err) {
		console.warn("msedge launch failed, falling back to default chromium:", err.message);
		browser = await chromium.launch({ headless: true });
	}

	try {
		const context = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
		});
		const page = await context.newPage();
		page.on("console", (msg) => {
			if (msg.type() === "error") console.log("PAGE ERROR LOG:", msg.text());
		});
		page.on("pageerror", (err) => console.error("PAGE UNCAUGHT ERROR:", err.message));

		const baseUrl = "http://127.0.0.1:5173/patients_inquisition_preview.html";

		// 1. Patients Registry (PC Light)
		console.log("1. Navigating to Patients Registry (PC Light)...");
		await page.goto(`${baseUrl}?theme=light&view=registry`, {
			waitUntil: "domcontentloaded",
			timeout: 20000,
		});
		await page.waitForSelector('[data-testid="preview-header-bar"]');
		await page.waitForTimeout(2000);

		const regLightDocs = path.join(DOCS_DIR, "01_patients_registry_pc_light.png");
		const regLightArtifact = path.join(ARTIFACT_DIR, "01_patients_registry_pc_light.png");
		await page.screenshot({ path: regLightDocs });
		fs.copyFileSync(regLightDocs, regLightArtifact);
		console.log("Saved:", regLightDocs);

		// 2. Patients Registry (PC Dark)
		console.log("2. Switching to Patients Registry (PC Dark)...");
		await page.click('[data-testid="btn-theme-dark"]');
		await page.waitForTimeout(1000);

		const regDarkDocs = path.join(DOCS_DIR, "01_patients_registry_pc_dark.png");
		const regDarkArtifact = path.join(ARTIFACT_DIR, "01_patients_registry_pc_dark.png");
		await page.screenshot({ path: regDarkDocs });
		fs.copyFileSync(regDarkDocs, regDarkArtifact);
		console.log("Saved:", regDarkDocs);

		// 3. Patient Card (PC Light)
		console.log("3. Navigating to Patient Card Modal (PC Light)...");
		await page.goto(`${baseUrl}?theme=light&view=card`, {
			waitUntil: "domcontentloaded",
			timeout: 20000,
		});
		await page.waitForSelector('[data-testid="preview-header-bar"]');
		await page.waitForTimeout(2000);

		const cardLightDocs = path.join(DOCS_DIR, "02_patient_card_pc_light.png");
		const cardLightArtifact = path.join(ARTIFACT_DIR, "02_patient_card_pc_light.png");
		await page.screenshot({ path: cardLightDocs });
		fs.copyFileSync(cardLightDocs, cardLightArtifact);
		console.log("Saved:", cardLightDocs);

		// 4. Patient Card (PC Dark)
		console.log("4. Navigating to Patient Card Modal (PC Dark)...");
		await page.goto(`${baseUrl}?theme=dark&view=card`, {
			waitUntil: "domcontentloaded",
			timeout: 20000,
		});
		await page.waitForTimeout(2000);

		const cardDarkDocs = path.join(DOCS_DIR, "02_patient_card_pc_dark.png");
		const cardDarkArtifact = path.join(ARTIFACT_DIR, "02_patient_card_pc_dark.png");
		await page.screenshot({ path: cardDarkDocs });
		fs.copyFileSync(cardDarkDocs, cardDarkArtifact);
		console.log("Saved:", cardDarkDocs);

		console.log("ALL PATIENTS INQUISITION PROOF SCREENSHOTS CAPTURED SUCCESSFULLY!");
	} catch (e) {
		console.error("CAPTURE ERROR:", e);
		process.exit(1);
	} finally {
		await browser.close();
	}
}

run();
