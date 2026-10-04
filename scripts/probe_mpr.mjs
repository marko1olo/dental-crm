import { chromium } from "playwright";

async function main() {
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});
	const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

	await page.addInitScript(() => {
		localStorage.setItem("dente_clinic_token", "audit-token-clinic");
		localStorage.setItem("dente_staff_token", "audit-token-staff");
		localStorage.setItem("dente_active_role", "owner");
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ onboardingDismissed: true, onboardingStep: "done", version: 1 }));
	});

	await page.goto("http://127.0.0.1:5173/#imaging", { waitUntil: "domcontentloaded" });
	await page.waitForTimeout(4000);

	console.log("Current URL:", page.url());
	const text = await page.evaluate(() => document.body.innerText.slice(0, 300));
	console.log("Body snippet:", text.replace(/\n+/g, " "));

	const mprBtnCount = await page.locator("[data-testid='imaging-open-3d-mpr']").count();
	console.log("mprBtnCount:", mprBtnCount);

	const allButtons = await page.evaluate(() => {
		return Array.from(document.querySelectorAll("button")).map((b) => ({
			testId: b.getAttribute("data-testid"),
			text: b.innerText.trim(),
			visible: b.offsetParent !== null,
		})).filter((b) => b.testId || b.text.includes("3D") || b.text.includes("КЛКТ") || b.text.includes("Снимки"));
	});
	console.log("Relevant buttons:", JSON.stringify(allButtons, null, 2));

	await page.screenshot({ path: "probe_imaging_page.png" });
	await browser.close();
}

main().catch(console.error);
