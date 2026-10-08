const path = require("node:path");
const fs = require("node:fs");
const { chromium } = require("playwright");

const ARTIFACT_DIR = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\87a9f3c7-6841-4589-8272-30c631a54c74";
const DOCS_DIR = "C:\\Clinic_MVP\\dental-crm\\docs\\screenshots\\warehouse";

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

		console.log("Navigating to preview at http://127.0.0.1:5174/warehouse_overview_preview.html...");
		await page.goto("http://127.0.0.1:5174/warehouse_overview_preview.html", {
			waitUntil: "domcontentloaded",
			timeout: 15000,
		});
		await page.waitForTimeout(1500);

		// 1. Switch to inventory tab (Light mode)
		console.log("1. Switching to tab-inventory (Light)...");
		await page.click('[data-testid="tab-inventory"]');
		await page.waitForSelector('[data-testid="warehouse-inventory-tab"]', { state: "visible" });
		await page.waitForTimeout(600);

		const invLightDocs = path.join(DOCS_DIR, "warehouse_inventory_pc_light.png");
		const invLightArtifact = path.join(ARTIFACT_DIR, "warehouse_inventory_pc_light.png");
		await page.screenshot({ path: invLightDocs });
		fs.copyFileSync(invLightDocs, invLightArtifact);
		console.log("Saved:", invLightDocs);

		// 2. Switch to Dark mode on inventory tab
		console.log("2. Switching to Dark mode...");
		await page.click('[data-testid="btn-toggle-theme"]');
		await page.waitForTimeout(600);

		const invDarkDocs = path.join(DOCS_DIR, "warehouse_inventory_pc_dark.png");
		const invDarkArtifact = path.join(ARTIFACT_DIR, "warehouse_inventory_pc_dark.png");
		await page.screenshot({ path: invDarkDocs });
		fs.copyFileSync(invDarkDocs, invDarkArtifact);
		console.log("Saved:", invDarkDocs);

		// 3. Switch back to Light mode
		console.log("3. Switching back to Light mode...");
		await page.click('[data-testid="btn-toggle-theme"]');
		await page.waitForTimeout(400);

		// 4. Open ConsumablesDeductionModal (BOM deduction modal)
		console.log("4. Opening ConsumablesDeductionModal...");
		await page.click('[data-testid="btn-open-preview-deduction"]');
		await page.waitForSelector('[data-testid="consumables-deduction-modal"]', { state: "visible" });
		await page.waitForTimeout(600);

		const modalLightDocs = path.join(DOCS_DIR, "consumables_deduction_modal_light.png");
		const modalLightArtifact = path.join(ARTIFACT_DIR, "consumables_deduction_modal_light.png");
		await page.screenshot({ path: modalLightDocs });
		fs.copyFileSync(modalLightDocs, modalLightArtifact);
		console.log("Saved:", modalLightDocs);

		// Close modal
		await page.click('[data-testid="btn-close-deduction-modal"]');
		await page.waitForTimeout(400);

		// 5. Switch to Catalog tab (Light)
		console.log("5. Switching to tab-catalog (Light)...");
		await page.click('[data-testid="tab-catalog"]');
		await page.waitForSelector('[data-testid="warehouse-catalog-view"]', { state: "visible" });
		await page.waitForTimeout(600);

		const catLightDocs = path.join(DOCS_DIR, "warehouse_catalog_pc_light.png");
		const catLightArtifact = path.join(ARTIFACT_DIR, "warehouse_catalog_pc_light.png");
		await page.screenshot({ path: catLightDocs });
		fs.copyFileSync(catLightDocs, catLightArtifact);
		console.log("Saved:", catLightDocs);

		// 6. Switch to Catalog tab (Dark)
		console.log("6. Switching to tab-catalog (Dark)...");
		await page.click('[data-testid="btn-toggle-theme"]');
		await page.waitForTimeout(600);

		const catDarkDocs = path.join(DOCS_DIR, "warehouse_catalog_pc_dark.png");
		const catDarkArtifact = path.join(ARTIFACT_DIR, "warehouse_catalog_pc_dark.png");
		await page.screenshot({ path: catDarkDocs });
		fs.copyFileSync(catDarkDocs, catDarkArtifact);
		console.log("Saved:", catDarkDocs);

		console.log("ALL INQUISITION PROOF SCREENSHOTS CAPTURED SUCCESSFULLY!");
	} catch (e) {
		console.error("Capture script error:", e);
		process.exit(1);
	} finally {
		await browser.close();
	}
}

run();
