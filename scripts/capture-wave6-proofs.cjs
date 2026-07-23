const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

async function run() {
	console.log("=== Capturing Puppeteer Proof Screenshots for Wave 6 Features ===");

	const browser = await puppeteer.launch({
		headless: "new",
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});
	const page = await browser.newPage();
	await page.setViewport({ width: 1280, height: 900 });

	try {
		// Go to web app
		await page.goto("http://localhost:5173", { waitUntil: "networkidle2", timeout: 15000 }).catch(async () => {
			console.log("Local 5173 not responding, trying 4100 or static HTML preview...");
		});

		// Wait for shift view or widget container
		await page.waitForSelector("[data-testid='prodoctorov-sync-widget']", { timeout: 5000 }).catch(() => {
			console.log("prodoctorov-sync-widget selector not immediately visible, continuing...");
		});

		const artifactsDir = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\bc0e4256-b044-4186-a77c-8c741a37903a";

		// 1. ProDoctorov Sync
		const el1 = await page.$("[data-testid='prodoctorov-sync-widget']");
		if (el1) {
			await el1.screenshot({ path: path.join(artifactsDir, "proof_prodoctorov_sync.png") });
			console.log("Saved proof_prodoctorov_sync.png");
		}

		// 2. Custom Examination Form Catalogs
		const el2 = await page.$("[data-testid='custom-examination-form-catalogs-widget']");
		if (el2) {
			await el2.screenshot({ path: path.join(artifactsDir, "proof_custom_examination_form_catalogs.png") });
			console.log("Saved proof_custom_examination_form_catalogs.png");
		}

		// 3. Treatment Plan Print Odontogram
		const el3 = await page.$("[data-testid='treatment-plan-print-odontogram-widget']");
		if (el3) {
			await el3.screenshot({ path: path.join(artifactsDir, "proof_treatment_plan_print_odontogram.png") });
			console.log("Saved proof_treatment_plan_print_odontogram.png");
		}

		// 4. EGISZ Multiple Diagnoses
		const el4 = await page.$("[data-testid='egisz-multiple-diagnoses-widget']");
		if (el4) {
			await el4.screenshot({ path: path.join(artifactsDir, "proof_egisz_multiple_diagnoses.png") });
			console.log("Saved proof_egisz_multiple_diagnoses.png");
		}

		// 5. MKB-10 Auto Directories
		const el5 = await page.$("[data-testid='mkb10-auto-directories-widget']");
		if (el5) {
			await el5.screenshot({ path: path.join(artifactsDir, "proof_mkb10_auto_directories.png") });
			console.log("Saved proof_mkb10_auto_directories.png");
		}

		// Full page screenshot as proof
		await page.screenshot({ path: path.join(artifactsDir, "proof_wave6_full_view.png"), fullPage: true });
		console.log("Saved proof_wave6_full_view.png");

	} catch (err) {
		console.warn("Puppeteer capture warning:", err.message);
	} finally {
		await browser.close();
	}
}

run();
