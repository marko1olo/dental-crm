import { chromium } from "playwright";

async function main() {
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});
	const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

	page.on("pageerror", (err) => console.error("[Browser Page Error]", err.message));

	await page.addInitScript(() => {
		localStorage.setItem("dente_clinic_token", "audit-token-clinic");
		localStorage.setItem("dente_staff_token", "audit-token-staff");
		localStorage.setItem("dente_active_role", "owner");
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ onboardingDismissed: true, onboardingStep: "done", version: 1 }));
		localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true, onboardingDismissed: true, onboardingStep: "done", version: 1 }));
	});

	await page.goto("http://127.0.0.1:5173/#imaging", { waitUntil: "domcontentloaded" });
	await page.waitForTimeout(2000);

	// Remove any overlays
	await page.evaluate(() => {
		document.querySelectorAll(".tour-spotlight-root, [data-testid='doctor-training-coach-mark-card'], [data-testid='guided-tour-spotlight-overlay']").forEach((el) => el.remove());
	});

	// Trigger click directly in DOM
	const clickResult = await page.evaluate(() => {
		const btn = document.querySelector("[data-testid='imaging-open-3d-mpr']");
		if (btn) {
			btn.click();
			return true;
		}
		return false;
	});
	console.log("Click result:", clickResult);

	await page.waitForTimeout(2000);

	const modal = page.locator("[data-testid='cbct-studio-modal']");
	const isModalVisible = await modal.isVisible();
	console.log("Is modal visible:", isModalVisible);

	await page.screenshot({ path: "test_modal_click.png" });
	await browser.close();
}

main().catch(console.error);
