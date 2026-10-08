/**
 * scripts/capture_documents_inquisition_proofs.mjs
 *
 * Subagent 4: Legal Documents & Statutory Consents Inquisitor
 * Captures authentic 1440x900 screenshots in Microsoft Edge ({ channel: 'msedge' }):
 *   1. 01_documents_catalog_pc_light.png
 *   2. 01_documents_catalog_pc_dark.png
 *   3. 02_tax_certificate_pc_light.png
 *   4. 02_tax_certificate_pc_dark.png
 */

import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";

const WEB_BASE = "http://127.0.0.1:5173";
const OUT_DIR = path.resolve("docs/screenshots/inquisition_docs");
const BRAIN_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/47dfa6e0-91bc-4b64-9600-8c293ee5ca48");

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(BRAIN_DIR, { recursive: true });

async function run() {
	console.log("Launching Microsoft Edge browser ({ channel: 'msedge' })...");
	const browser = await chromium.launch({
		channel: "msedge",
		headless: true,
		args: ["--no-sandbox", "--disable-gpu", "--font-render-hinting=none", "--disable-dev-shm-usage"],
	});

	try {
		const context = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
			isMobile: false,
			hasTouch: false,
		});

		const page = await context.newPage();

		async function captureScreen(urlParams, filename, desc) {
			const targetUrl = `${WEB_BASE}/documents_inquisition_preview.html?${urlParams}`;
			console.log(`\nNavigating to ${targetUrl}...`);
			await page.goto(targetUrl, { waitUntil: "networkidle", timeout: 30000 });
			await page.waitForSelector("[data-testid='documents-inquisition-preview-root']", { timeout: 15000 });
			await page.waitForTimeout(1500);

			const filePath = path.join(OUT_DIR, filename);
			const brainPath = path.join(BRAIN_DIR, filename);
			await page.screenshot({ path: filePath, fullPage: false });
			fs.copyFileSync(filePath, brainPath);
			const sizeKb = (fs.statSync(filePath).size / 1024).toFixed(1);
			console.log(`[Captured & Saved] ${filename} (${sizeKb} KB) -> ${desc}`);
			if (fs.statSync(filePath).size < 30000) {
				throw new Error(`Suspiciously small screenshot size: ${sizeKb} KB for ${filename}`);
			}
		}

		// 1. Каталог медицинских документов клиники (PC Light 1440x900)
		await captureScreen(
			"view=catalog&theme=light",
			"01_documents_catalog_pc_light.png",
			"Каталог медицинских документов клиники (PC Light 1440x900)"
		);

		// 2. Каталог медицинских документов клиники (PC Dark 1440x900)
		await captureScreen(
			"view=catalog&theme=dark",
			"01_documents_catalog_pc_dark.png",
			"Каталог медицинских документов клиники (PC Dark 1440x900)"
		);

		// 3. Справка для налогового вычета ФНС КНД 1151156 (PC Light 1440x900)
		await captureScreen(
			"view=tax_cert&theme=light",
			"02_tax_certificate_pc_light.png",
			"Справка для налогового вычета ФНС КНД 1151156 (PC Light 1440x900)"
		);

		// 4. Справка для налогового вычета ФНС КНД 1151156 (PC Dark 1440x900)
		await captureScreen(
			"view=tax_cert&theme=dark",
			"02_tax_certificate_pc_dark.png",
			"Справка для налогового вычета ФНС КНД 1151156 (PC Dark 1440x900)"
		);

		console.log("\n[SUCCESS] All 4 required Edge screenshots captured successfully!");
	} finally {
		await browser.close();
	}
}

run().catch((err) => {
	console.error("[FATAL ERROR]", err);
	process.exit(1);
});
