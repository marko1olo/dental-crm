import { chromium } from "playwright";

async function main() {
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
	});
	const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
	await ctx.addInitScript(() => {
		localStorage.setItem("dente_clinic_token", "demo-showcase-token-owner");
		localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-owner");
		localStorage.setItem("dente_active_session_token", "demo-showcase-staff-token-owner");
		localStorage.setItem("dente_active_role", "owner");
		localStorage.setItem("dente_user_role", "owner");
		localStorage.setItem("dente_demo_mode", "true");
		localStorage.setItem("dente_demo_showcase", "true");
		sessionStorage.setItem("dente_unlocked", "true");
		localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true, step: "done" }));
		localStorage.setItem("dental-crm:active-user:v1", JSON.stringify({ id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner" }));
	});

	const page = await ctx.newPage();
	console.log("Navigating to standalone patient card on 5173...");
	await page.goto("http://127.0.0.1:5173/?demo=true&patient_modal=1#patient-card", { waitUntil: "commit" });
	await page.waitForTimeout(3000);

	const offlineBtn = await page.$('.boot-offline-action-button, button:has-text("Перейти в автономный режим")');
	if (offlineBtn) {
		console.log("Found offline button, clicking...");
		await offlineBtn.click();
		await page.waitForTimeout(2000);
	}

	const modal = await page.waitForSelector(
		"[data-testid='patient-card-modal'], [data-testid='patient-studio-modal'], [data-testid='patient-card-standalone-root']",
		{ state: "attached", timeout: 15000 },
	).catch(() => null);

	console.log("Patient card modal detected:", Boolean(modal));

	// Click family tab
	console.log("Clicking family tab...");
	const familyTab = page.locator("[data-testid='tab-patient-family']").first();
	if (await familyTab.count() > 0) {
		await familyTab.click();
		await page.waitForTimeout(1000);
		console.log("Clicked family tab!");

		const openWallet = page.locator("[data-testid='widget-open-family-wallet-btn']").first();
		if (await openWallet.count() > 0) {
			console.log("Clicking open wallet button...");
			await openWallet.click();
			await page.waitForTimeout(1000);

			const walletModal = await page.waitForSelector("[data-testid='family-wallet-modal']", { state: "visible", timeout: 10000 }).catch(() => null);
			console.log("Family wallet modal visible:", Boolean(walletModal));

			// Check tabs in family wallet modal
			const tabs = await page.evaluate(() => {
				const buttons = Array.from(document.querySelectorAll("[data-testid^='tab-family-wallet-']"));
				return buttons.map((b) => ({ id: b.getAttribute("data-testid"), text: b.textContent?.trim() }));
			});
			console.log("Family wallet tabs:", tabs);
		} else {
			console.log("Wallet open button not found in family tab");
		}
	} else {
		console.log("Family tab not found");
	}

	await browser.close();
}

main().catch(console.error);
