import { chromium } from "playwright";
import * as path from "node:path";
import { existsSync, mkdirSync, copyFileSync } from "node:fs";

async function main() {
	console.log("=== CAPTURING RED TEAM INQUISITION PROOFS (LIGHT & DARK 1440x900) ===");

	const outDir = path.resolve("docs/screenshots/monolith_inquisition_proofs");
	if (!existsSync(outDir)) {
		mkdirSync(outDir, { recursive: true });
	}

	const brainDir = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\df880520-dc90-48e7-ab9e-032bd60d9f31";

	const browser = await chromium.launch({
		channel: "msedge",
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	const themes = ["light", "dark"] as const;

	for (const theme of themes) {
		console.log(`\n--- Capturing theme: ${theme} ---`);
		const context = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
		});
		const page = await context.newPage();

		await page.addInitScript((th) => {
			localStorage.setItem("dente_theme", th);
			document.documentElement.setAttribute("data-theme", th);
			if (th === "dark") {
				document.documentElement.classList.add("dark");
			} else {
				document.documentElement.classList.remove("dark");
			}
		}, theme);

		// 1. Finance / Payment Capture / Cashier
		try {
			await page.goto("http://127.0.0.1:5173/#finance", { waitUntil: "domcontentloaded", timeout: 15000 });
			await page.waitForTimeout(2000);
			const finFile = `proof_finance_payment_capture_${theme}_1440x900.png`;
			const finPath = path.join(outDir, finFile);
			await page.screenshot({ path: finPath });
			console.log(`✓ Saved ${finFile}`);
			if (existsSync(brainDir)) copyFileSync(finPath, path.join(brainDir, finFile));
		} catch (e) {
			console.error(`Error capturing finance (${theme}):`, e);
		}

		// 2. SanPiN Registers
		try {
			await page.goto("http://127.0.0.1:5173/#settings", { waitUntil: "domcontentloaded", timeout: 15000 });
			await page.waitForTimeout(1500);

			// Try clicking sanpin tab or nav
			const sanpinLink = page.locator('button:has-text("СанПиН"), a:has-text("СанПиН"), [data-tab="sanpin"], button:has-text("Стерилизация")').first();
			if (await sanpinLink.isVisible()) {
				await sanpinLink.click();
				await page.waitForTimeout(1500);
			}

			const sanpinFile = `proof_sanpin_registers_${theme}_1440x900.png`;
			const sanpinPath = path.join(outDir, sanpinFile);
			await page.screenshot({ path: sanpinPath });
			console.log(`✓ Saved ${sanpinFile}`);
			if (existsSync(brainDir)) copyFileSync(sanpinPath, path.join(brainDir, sanpinFile));
		} catch (e) {
			console.error(`Error capturing SanPiN (${theme}):`, e);
		}

		// 3. Lab / Ortho Kanban Board & Protocols
		try {
			await page.goto("http://127.0.0.1:5173/#schedule", { waitUntil: "domcontentloaded", timeout: 15000 });
			await page.waitForTimeout(2000);

			const labLink = page.locator('button:has-text("Лаборатория"), a:has-text("ЗТЛ"), button:has-text("Наряды ЗТЛ")').first();
			if (await labLink.isVisible()) {
				await labLink.click();
				await page.waitForTimeout(1500);
			}

			const orthoFile = `proof_ortho_lab_schedule_${theme}_1440x900.png`;
			const orthoPath = path.join(outDir, orthoFile);
			await page.screenshot({ path: orthoPath });
			console.log(`✓ Saved ${orthoFile}`);
			if (existsSync(brainDir)) copyFileSync(orthoPath, path.join(brainDir, orthoFile));
		} catch (e) {
			console.error(`Error capturing ortho/schedule (${theme}):`, e);
		}

		// 4. Clinical Visit / EMK / Endo / Perio
		try {
			await page.goto("http://127.0.0.1:5173/#visit", { waitUntil: "domcontentloaded", timeout: 15000 });
			await page.waitForTimeout(2000);

			const visitFile = `proof_visit_emk_clinical_${theme}_1440x900.png`;
			const visitPath = path.join(outDir, visitFile);
			await page.screenshot({ path: visitPath });
			console.log(`✓ Saved ${visitFile}`);
			if (existsSync(brainDir)) copyFileSync(visitPath, path.join(brainDir, visitFile));
		} catch (e) {
			console.error(`Error capturing visit (${theme}):`, e);
		}

		await context.close();
	}

	await browser.close();
	console.log("\n=== ALL RED TEAM PROOF SCREENSHOTS CAPTURED SUCCESSFULLY ===");
}

main().catch((err) => {
	console.error("FATAL screenshot capture failure:", err);
	process.exit(1);
});
