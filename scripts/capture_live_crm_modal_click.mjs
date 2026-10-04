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
			localStorage.setItem(
				"dental-crm:web-ui-preferences:v1",
				JSON.stringify({
					version: 1,
					uiLanguage: "ru",
					selectedWorkspaceRole: "owner",
					selectedPatientId: "pat-1",
					onboardingDismissed: true,
					onboardingStep: "done",
				})
			);
		});

		const page = await ctx.newPage();

		async function applyTheme(theme) {
			await page.evaluate((th) => {
				localStorage.setItem("dente_theme_mode", th);
				if (window.__useThemeStore) {
					window.__useThemeStore.getState().setThemeMode(th);
				}
				document.documentElement.setAttribute("data-theme", th);
				const isDark = ["dark", "night", "ocean", "emerald", "cyber_xray"].includes(th);
				document.documentElement.classList.toggle("dark", isDark);
				document.documentElement.classList.toggle("light", !isDark);
				document.documentElement.style.colorScheme = isDark ? "dark" : "light";
			}, theme);
			await page.waitForTimeout(400);
		}

		console.log("Navigating to #imaging...");
		await page.goto("http://127.0.0.1:5173/#imaging", { waitUntil: "domcontentloaded" });
		await page.waitForTimeout(1500);

		// Remove onboarding spotlight
		await page.evaluate(() => {
			document.querySelectorAll(".tour-spotlight-root, [data-testid='doctor-training-coach-mark-card'], [data-testid='guided-tour-spotlight-overlay']").forEach((el) => el.remove());
		});
		await page.waitForTimeout(400);

		// Кликаем по кнопке «Рентген-кабинет»
		console.log("Clicking 'Рентген-кабинет' in CRM...");
		const radCabinetBtn = page.locator("[data-testid='imaging-open-radiology-module'], button:has-text('Рентген-кабинет')").first();
		await radCabinetBtn.click({ force: true });
		await page.waitForTimeout(1000);

		// Снимаем скриншот модалки «Рентген-кабинет» открытой прямо поверх живой CRM DENTE!
		await applyTheme("light");
		await page.screenshot({ path: path.join(outDir, "proof_03_radiology_module_over_crm_light.png"), fullPage: false });
		console.log("Saved proof_03_radiology_module_over_crm_light.png");

		await applyTheme("dark");
		await page.screenshot({ path: path.join(outDir, "proof_03_radiology_module_over_crm_dark.png"), fullPage: false });
		console.log("Saved proof_03_radiology_module_over_crm_dark.png");

	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("CAPTURE ERROR:", err);
	process.exit(1);
});
