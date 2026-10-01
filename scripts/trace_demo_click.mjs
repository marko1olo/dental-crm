import { chromium } from "playwright";

async function test() {
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
	});
	const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

	page.on("console", (m) => console.log(`[Browser Console] ${m.type()}: ${m.text()}`));
	page.on("pageerror", (e) => console.error("[Browser PageError]", e.message));

	await page.addInitScript(() => {
		localStorage.setItem("dente_clinic_token", "audit-token-clinic");
		localStorage.setItem("dente_staff_token", "audit-token-staff");
		localStorage.setItem("dente_active_role", "owner");
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ onboardingDismissed: true, onboardingStep: "done", version: 1 }));
		localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true, onboardingDismissed: true, onboardingStep: "done", version: 1 }));
	});

	await page.goto("http://127.0.0.1:5173/#imaging", { waitUntil: "domcontentloaded" });
	await page.waitForTimeout(1000);
	await page.locator('[data-testid="imaging-open-3d-mpr"]').click();
	await page.waitForTimeout(1000);

	console.log("Now clicking demo button...");
	const demoBtn = page.locator('[data-testid="cbct-btn-load-demo-empty"]');
	await demoBtn.click();
	console.log("Clicked! Now sampling every 200ms...");

	for (let i = 0; i < 20; i++) {
		await page.waitForTimeout(200);
		const state = await page.evaluate(() => {
			const badge = document.querySelector('[data-testid="cbct-patient-metadata-badge"]')?.textContent || "";
			const axial = !!document.querySelector('[data-testid="cbct-viewport-container-axial"]');
			const text = document.body.innerText;
			const loadMatch = text.match(/Загрузка.*?(\d+)/i);
			return {
				hasAxial: axial,
				badge: badge.trim(),
				statusSnippet: loadMatch ? loadMatch[0] : "none",
			};
		});
		console.log(`[Tick ${i} / ${i * 200}ms]:`, state);
		if (state.hasAxial) {
			console.log("Axial container appeared! Success!");
			break;
		}
	}

	await page.screenshot({ path: "docs/screenshots/cbct_live/test_trace_click.png" });
	console.log("Screenshot saved.");

	await browser.close();
}

test().catch(console.error);
