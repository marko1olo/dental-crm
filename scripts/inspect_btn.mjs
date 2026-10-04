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
	await page.waitForTimeout(3000);

	const info = await page.evaluate(() => {
		const btn = document.querySelector("[data-testid='imaging-open-3d-mpr']");
		if (!btn) return { found: false };
		const style = window.getComputedStyle(btn);
		const rect = btn.getBoundingClientRect();
		return {
			found: true,
			display: style.display,
			visibility: style.visibility,
			opacity: style.opacity,
			rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
			parentDisplay: btn.parentElement ? window.getComputedStyle(btn.parentElement).display : null,
			classes: btn.className,
		};
	});

	console.log("Btn computed info:", JSON.stringify(info, null, 2));
	await browser.close();
}

main().catch(console.error);
