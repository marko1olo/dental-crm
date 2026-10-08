import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";

const outputDir = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\fd3e2e07-5136-480b-8cc2-354e91d8f2ae";

async function main() {
	if (!fs.existsSync(outputDir)) {
		fs.mkdirSync(outputDir, { recursive: true });
	}

	const browser = await chromium.launch({ channel: "msedge", headless: true });
	const context = await browser.newContext({
		viewport: { width: 1440, height: 900 },
		deviceScaleFactor: 1,
	});
	const page = await context.newPage();

	console.log("Navigating to preview page...");
	await page.goto("http://127.0.0.1:5173/warehouse_overview_preview.html", {
		waitUntil: "networkidle",
		timeout: 30000,
	});

	await page.waitForSelector('[data-testid="warehouse-catalog-view"]', { timeout: 10000 });
	await page.waitForTimeout(600);

	const themeBtn = page.locator('[data-testid="btn-toggle-theme"]');
	const openModalBtn = page.locator('[data-testid="btn-open-preview-deduction"]');

	// 1. Catalog PC Light
	const catalogLightPath = path.join(outputDir, "warehouse_catalog_pc_light.png");
	await page.screenshot({ path: catalogLightPath, fullPage: false });
	console.log("Captured:", catalogLightPath);

	// 2. Deduction Modal PC Light
	await openModalBtn.click();
	await page.waitForSelector('[data-testid="consumables-deduction-modal"]', { timeout: 5000 });
	await page.waitForTimeout(500);

	const modalLightPath = path.join(outputDir, "warehouse_deduction_modal_pc_light.png");
	await page.screenshot({ path: modalLightPath, fullPage: false });
	console.log("Captured:", modalLightPath);

	// Close modal in light mode
	const closeModalBtn = page.locator('[data-testid="btn-close-deduction-modal"]');
	await closeModalBtn.click();
	await page.waitForTimeout(400);

	// Switch to dark theme
	await themeBtn.click();
	await page.waitForTimeout(500);

	// 3. Catalog PC Dark
	const catalogDarkPath = path.join(outputDir, "warehouse_catalog_pc_dark.png");
	await page.screenshot({ path: catalogDarkPath, fullPage: false });
	console.log("Captured:", catalogDarkPath);

	// 4. Deduction Modal PC Dark
	await openModalBtn.click();
	await page.waitForSelector('[data-testid="consumables-deduction-modal"]', { timeout: 5000 });
	await page.waitForTimeout(500);

	const modalDarkPath = path.join(outputDir, "warehouse_deduction_modal_pc_dark.png");
	await page.screenshot({ path: modalDarkPath, fullPage: false });
	console.log("Captured:", modalDarkPath);

	// Close modal
	await closeModalBtn.click();
	await page.waitForTimeout(300);

	await browser.close();
	console.log("All screenshots successfully captured!");
}

main().catch((err) => {
	console.error("Error capturing screenshots:", err);
	process.exit(1);
});
