const path = require("node:path");
const fs = require("node:fs");
const { chromium } = require("playwright");

const ARTIFACT_DIR = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\e32e633d-4fb9-4447-8673-59be95d5530c";
const DOCS_DIR = "C:\\Clinic_MVP\\dental-crm\\docs\\screenshots\\inquisition_patients";

async function setCrmTheme(page, theme) {
	await page.evaluate((th) => {
		if (window.__useThemeStore) {
			window.__useThemeStore.getState().setThemeMode(th);
		}
		document.documentElement.setAttribute("data-theme", th);
		document.documentElement.dataset.theme = th;
		document.body.setAttribute("data-theme", th);
		document.body.dataset.theme = th;
		if (th === "dark") {
			document.documentElement.classList.add("dark");
			document.documentElement.classList.remove("light");
		} else {
			document.documentElement.classList.add("light");
			document.documentElement.classList.remove("dark");
		}
		localStorage.setItem("dente_theme_mode", th);
	}, theme);
	await page.waitForTimeout(1000);
}

async function run() {
	if (!fs.existsSync(DOCS_DIR)) fs.mkdirSync(DOCS_DIR, { recursive: true });
	if (!fs.existsSync(ARTIFACT_DIR)) fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

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

		const baseUrl = "http://127.0.0.1:5173/?demo=true";

		console.log("1. Navigating to Live CRM Patients Registry (PC Light)...");
		await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
		await page.waitForTimeout(4000);

		// Switch to #patients and ensure light theme
		await page.evaluate(() => {
			window.location.hash = "#patients";
			window.dispatchEvent(new HashChangeEvent("hashchange"));
		});
		await page.waitForTimeout(2000);
		await setCrmTheme(page, "light");

		// Verify patient rows exist
		await page.waitForSelector(".patient-row", { timeout: 10000 });
		console.log("Patient rows loaded in live CRM!");

		// Click the first patient row to make sure it's active
		await page.locator(".patient-row").first().click();
		await page.waitForTimeout(1000);

		// Save 1: Patients Registry (PC Light)
		const regLightDocs = path.join(DOCS_DIR, "01_patients_registry_pc_light.png");
		const regLightArtifact = path.join(ARTIFACT_DIR, "01_patients_registry_pc_light.png");
		await page.screenshot({ path: regLightDocs });
		fs.copyFileSync(regLightDocs, regLightArtifact);
		console.log("Saved Live Proof:", regLightDocs);

		// 2. Patients Registry (PC Dark)
		console.log("2. Switching to Live CRM Patients Registry (PC Dark)...");
		await setCrmTheme(page, "dark");

		const regDarkDocs = path.join(DOCS_DIR, "01_patients_registry_pc_dark.png");
		const regDarkArtifact = path.join(ARTIFACT_DIR, "01_patients_registry_pc_dark.png");
		await page.screenshot({ path: regDarkDocs });
		fs.copyFileSync(regDarkDocs, regDarkArtifact);
		console.log("Saved Live Proof:", regDarkDocs);

		// 3. Open PatientCardModal (PC Light)
		console.log("3. Opening Patient Card Modal (PC Light)...");
		await setCrmTheme(page, "light");

		// Click more actions button in details panel, then click "Медицинская карта"
		const moreBtn = page.locator('[data-testid="patient-card-more-actions-btn"]');
		if (await moreBtn.count() > 0) {
			await moreBtn.click();
			await page.waitForTimeout(500);
			const openCardBtn = page.locator('[data-testid="open-patient-card-modal-btn"]');
			if (await openCardBtn.count() > 0) {
				await openCardBtn.click();
			} else {
				await page.locator('.patient-row-more-btn').first().click();
				await page.waitForTimeout(500);
				await page.locator('button:has-text("Медицинская карта")').first().click();
			}
		} else {
			await page.locator('.patient-row-more-btn').first().click();
			await page.waitForTimeout(500);
			await page.locator('button:has-text("Медицинская карта")').first().click();
		}

		await page.waitForTimeout(1500);
		await page.waitForSelector('[role="dialog"]', { timeout: 10000 });
		console.log("PatientCardModal opened in live CRM!");

		const cardLightDocs = path.join(DOCS_DIR, "02_patient_card_pc_light.png");
		const cardLightArtifact = path.join(ARTIFACT_DIR, "02_patient_card_pc_light.png");
		await page.screenshot({ path: cardLightDocs });
		fs.copyFileSync(cardLightDocs, cardLightArtifact);
		console.log("Saved Live Proof:", cardLightDocs);

		// 4. Patient Card Modal (PC Dark)
		console.log("4. Switching Patient Card Modal to PC Dark...");
		await setCrmTheme(page, "dark");

		const cardDarkDocs = path.join(DOCS_DIR, "02_patient_card_pc_dark.png");
		const cardDarkArtifact = path.join(ARTIFACT_DIR, "02_patient_card_pc_dark.png");
		await page.screenshot({ path: cardDarkDocs });
		fs.copyFileSync(cardDarkDocs, cardDarkArtifact);
		console.log("Saved Live Proof:", cardDarkDocs);

		console.log("ALL REAL LIVE CRM PATIENTS PROOFS CAPTURED SUCCESSFULLY!");
	} catch (e) {
		console.error("CAPTURE ERROR:", e);
		process.exit(1);
	} finally {
		await browser.close();
	}
}

run();
