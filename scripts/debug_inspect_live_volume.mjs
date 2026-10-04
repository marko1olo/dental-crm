import { chromium } from "playwright";

async function main() {
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-web-security"],
	});
	const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

	await page.addInitScript(() => {
		localStorage.setItem("dente_clinic_token", "audit-token-clinic");
		localStorage.setItem("dente_staff_token", "audit-token-staff");
		localStorage.setItem("dente_active_role", "owner");
		localStorage.setItem("dente_demo_showcase", "true");
	});

	await page.goto("http://127.0.0.1:5173/#imaging");
	await page.waitForTimeout(2000);

	const openMprBtn = page.locator("[data-testid='imaging-open-3d-mpr']");
	await openMprBtn.waitFor({ state: "visible", timeout: 10000 });
	await openMprBtn.click({ force: true });
	await page.waitForTimeout(2000);

	const loadDemoBtn = page.locator("[data-testid='cbct-btn-load-demo-empty']");
	if (await loadDemoBtn.isVisible()) {
		await loadDemoBtn.click({ force: true });
		await page.waitForTimeout(3000);
	}

	const info = await page.evaluate(() => {
		const v = window.__cbctDemoVolume;
		return {
			hasVolume: !!v,
			origin: v?.originMm,
			dims: v?.dimensions,
			spacing: v?.spacingMm,
		};
	});
	console.log("Live Volume Info:", info);
	await browser.close();
}

main().catch(console.error);
