import { chromium } from "playwright";

async function testLiveMessengers() {
	console.log("Launching Edge...");
	const browser = await chromium.launch({ channel: "msedge", headless: true });
	const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
	const page = await context.newPage();

	await page.addInitScript(() => {
		localStorage.setItem("dente_clinic_token", "live-clinic-token");
		localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-chief");
		localStorage.setItem("dente_active_role", "owner");
		localStorage.setItem("dente_cached_active_staff_user", JSON.stringify({
			id: "demo-doctor-chief",
			fullName: "Доктор Демо (Главный врач)",
			role: "owner",
			organizationId: "4a3420d1-6ffb-4459-bd8f-7f7087f5e191",
			email: "doctor@dente-demo.ru"
		}));
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_training_mode_completed", "true");
		localStorage.setItem("dente_training_active", "false");
		localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({
			onboardingDismissed: true,
			onboardingStep: "done",
			version: 1,
		}));
	});

	console.log("Navigating to http://127.0.0.1:5173/#settings/messengers...");
	await page.goto("http://127.0.0.1:5173/#settings/messengers", { waitUntil: "domcontentloaded" });
	await page.waitForTimeout(2000);

	// Click PIN quick login if visible
	const pinDemoBtn = page.getByRole("button", { name: /Войти как Доктор Демо/i });
	if ((await pinDemoBtn.count()) > 0) {
		console.log("Clicking PIN quick login button...");
		await pinDemoBtn.first().click();
		await page.waitForTimeout(3000);
	}

	// Quick check if demo tour popup is present
	const quickDemoBtn = page.getByRole("button", { name: /Быстрый вход в Демо-тур/i });
	if ((await quickDemoBtn.count()) > 0) {
		console.log("Clicking quick demo button...");
		await quickDemoBtn.click();
		await page.waitForTimeout(1000);
		const enterRoleBtn = page.getByRole("button", { name: /Войти в демо-тур/i });
		if ((await enterRoleBtn.count()) > 0) {
			await enterRoleBtn.click();
			await page.waitForTimeout(2000);
		}
	}

	// Switch hash to #settings/messengers
	await page.evaluate(() => {
		window.location.hash = "settings/messengers";
	});
	await page.waitForTimeout(2000);

	console.log("Current URL:", page.url());
	const cardCount = await page.locator("[data-testid='messengers-overview-card']").count();
	console.log("MessengersOverviewCard count:", cardCount);

	await page.screenshot({ path: "scripts/test_live_settings_messengers.png" });
	console.log("Saved scripts/test_live_settings_messengers.png");

	await browser.close();
}

testLiveMessengers().catch((err) => {
	console.error("Test failed:", err);
	process.exit(1);
});
