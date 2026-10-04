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

		// 1. Снимаем экран раздела CRM #imaging (Живой интерфейс клиники с сайдбаром)
		console.log("Navigating to #imaging...");
		await page.goto("http://127.0.0.1:5173/#imaging", { waitUntil: "domcontentloaded" });
		await page.waitForTimeout(2000);

		// Удаляем оверлеи онбординга если есть
		await page.evaluate(() => {
			document.querySelectorAll(".tour-spotlight-root, [data-testid='doctor-training-coach-mark-card'], [data-testid='guided-tour-spotlight-overlay']").forEach((el) => el.remove());
		});
		await page.waitForTimeout(500);

		await applyTheme("light");
		await page.screenshot({ path: path.join(outDir, "proof_01_imaging_hub_crm_light.png"), fullPage: false });
		console.log("Saved proof_01_imaging_hub_crm_light.png");

		await applyTheme("dark");
		await page.screenshot({ path: path.join(outDir, "proof_01_imaging_hub_crm_dark.png"), fullPage: false });
		console.log("Saved proof_01_imaging_hub_crm_dark.png");

		// 2. Открываем карточку пациента pat-1 и вкладку снимков
		console.log("Navigating to #patients...");
		await page.goto("http://127.0.0.1:5173/#patients", { waitUntil: "domcontentloaded" });
		await page.waitForTimeout(2000);

		// Кликаем по первому пациенту в таблице/списке
		const patientRow = page.locator("[data-testid^='patient-row-'], tr:has-text('Ковалёв'), [data-patient-id='pat-1']").first();
		if (await patientRow.isVisible()) {
			await patientRow.click();
			await page.waitForTimeout(1000);

			// Ищем таб "Снимки и КТ" / "Радиология"
			const radTab = page.locator("[data-testid='patient-tab-radiology'], button:has-text('Снимки'), button:has-text('Рентген')").first();
			if (await radTab.isVisible()) {
				await radTab.click();
				await page.waitForTimeout(1000);

				await applyTheme("light");
				await page.screenshot({ path: path.join(outDir, "proof_02_patient_card_radiology_crm_light.png"), fullPage: false });
				console.log("Saved proof_02_patient_card_radiology_crm_light.png");

				await applyTheme("dark");
				await page.screenshot({ path: path.join(outDir, "proof_02_patient_card_radiology_crm_dark.png"), fullPage: false });
				console.log("Saved proof_02_patient_card_radiology_crm_dark.png");
			}
		}

	} finally {
		await browser.close();
	}
}

main().catch((err) => {
	console.error("CAPTURE ERROR:", err);
	process.exit(1);
});
