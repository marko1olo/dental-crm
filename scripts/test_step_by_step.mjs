import { chromium } from "playwright";

async function run() {
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-web-security", "--use-gl=angle", "--enable-webgl"],
	});
	const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

	page.on("console", (m) => console.log(`[Browser Console] ${m.type()}: ${m.text()}`));
	page.on("pageerror", (e) => console.error("[Browser PageError]", e));

	await page.addInitScript(() => {
		localStorage.setItem("dente_clinic_token", "audit-token-clinic");
		localStorage.setItem("dente_staff_token", "audit-token-staff");
		localStorage.setItem("dente_active_role", "owner");
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ onboardingDismissed: true, onboardingStep: "done", version: 1 }));
		localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true, onboardingDismissed: true, onboardingStep: "done", version: 1 }));
	});

	await page.goto("http://127.0.0.1:5173/#imaging", { waitUntil: "domcontentloaded" });
	await page.waitForTimeout(1500);

	console.log("Opening 3D MPR modal...");
	const btn = page.locator("[data-testid='imaging-open-3d-mpr']");
	await btn.click();
	await page.waitForTimeout(1500);

	console.log("Clicking 'Демо-исследование'...");
	const demoBtn = page.locator("[data-testid='cbct-btn-load-demo-empty']");
	await demoBtn.click();

	console.log("Observing page state for 6 seconds...");
	for (let i = 1; i <= 6; i++) {
		await page.waitForTimeout(1000);
		const state = await page.evaluate(() => {
			const badge = document.querySelector("[data-testid='cbct-patient-metadata-badge']")?.textContent || "";
			const axial = !!document.querySelector("[data-testid='cbct-viewport-container-axial']");
			const empty = !!document.querySelector("[data-testid='cbct-empty-dropzone']");
			const bodyText = document.body.innerText;
			const loadMatch = bodyText.match(/Загрузка.*?(\d+)/i);
			return {
				second: i,
				hasAxial: axial,
				hasEmpty: empty,
				badge: badge.trim(),
				loadingProgress: loadMatch ? loadMatch[0] : "none",
			};
		});
		console.log(`[Second ${i}]`, state);
	}

	console.log("Capturing screenshot...");
	await page.screenshot({ path: "docs/screenshots/cbct_live/test_progress_6s.png", timeout: 5000 });
	console.log("Screenshot captured successfully!");

	await browser.close();
}

run().catch((e) => {
	console.error("[TEST FAILED]:", e);
	process.exit(1);
});
