import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";

async function main() {
	const outDir = path.resolve("docs/screenshots/radiology_windows");
	if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
	});

	try {
		const ctx = await browser.newContext({
			viewport: { width: 1440, height: 900 },
			deviceScaleFactor: 1,
		});

		await ctx.addInitScript(() => {
			const todayDate = new Date().toLocaleDateString("en-CA");
			localStorage.setItem("dente_clinic_token", "audit-token-clinic");
			localStorage.setItem("dente_staff_token", "audit-token-staff");
			localStorage.setItem("dente_active_role", "owner");
			localStorage.setItem("dente_active_patient_id", "pat-1");
			localStorage.setItem("dente_onboarding_completed", "true");
			localStorage.setItem("dente_tour_completed", "true");
			localStorage.setItem(
				"dente_ui_preferences_v1",
				JSON.stringify({ onboardingDismissed: true, onboardingStep: "done", version: 1 })
			);
			localStorage.setItem(
				"dental-crm:onboarding:v1",
				JSON.stringify({ dismissed: true, step: "done", completed: true, onboardingDismissed: true, onboardingStep: "done", version: 1 })
			);
		});

		const page = await ctx.newPage();

		console.log("Navigating to #imaging...");
		await page.goto("http://127.0.0.1:5173/#imaging", { waitUntil: "domcontentloaded" });
		await page.waitForTimeout(1500);

		// Remove onboarding spotlight
		await page.evaluate(() => {
			document.querySelectorAll(".tour-spotlight-root, [data-testid='doctor-training-coach-mark-card'], [data-testid='guided-tour-spotlight-overlay']").forEach((el) => el.remove());
		});
		await page.waitForTimeout(400);

		// 1. Открываем Рентген-кабинет
		const radCabinetBtn = page.locator("[data-testid='imaging-open-radiology-module'], button:has-text('Рентген-кабинет')").first();
		await radCabinetBtn.click({ force: true });
		await page.waitForTimeout(800);

		// 2. Внутри кликаем на Визиограф & DICOM
		console.log("Clicking 'Визиограф & DICOM'...");
		const vdioBtn = page.locator("[data-testid='btn-open-sensor-study-viewer'], button:has-text('Визиограф & DICOM')").first();
		if (await vdioBtn.isVisible()) {
			await vdioBtn.click({ force: true });
			await page.waitForTimeout(1500);

			await page.screenshot({ path: path.join(outDir, "proof_04_live_crm_to_2d_viewer.png"), fullPage: false });
			console.log("Saved proof_04_live_crm_to_2d_viewer.png");
		}

	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("CAPTURE ERROR:", err);
	process.exit(1);
});
