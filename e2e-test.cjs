const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

async function run() {
	const browser = await chromium.launch({
		headless: true,
		channel: "chrome",
		args: ["--no-sandbox"],
	});

	const page = await browser.newPage();

	page.on("pageerror", (error) => {
		console.error(`PAGE_ERROR: ${error.message}`);
	});

	page.on("console", (msg) => {
		if (msg.type() === "error") {
			console.error(`CONSOLE_ERROR: ${msg.text()}`);
		}
	});

	try {
		console.log("Navigating to http://127.0.0.1:5173...");
		await page.goto("http://127.0.0.1:5173", { waitUntil: "networkidle" });

		console.log("Filling user login form (demo bypass)...");
		// AuthHub defaults to UserLogin which allows doctor@clinic.com bypass
		await page.fill('input[type="email"]', "doctor@clinic.com");
		await page.fill('input[type="password"]', "anypassword");

		console.log("Clicking login...");
		const [loginResponse] = await Promise.all([
			page.waitForResponse("**/api/auth/login"),
			page.click('button[type="submit"]'),
		]);
		console.log("Login response status:", loginResponse.status());

		console.log("Waiting for app to load...");
		await page.waitForLoadState("networkidle");
		await page.waitForTimeout(2000);

		try {
			const onboardingBtn = page.locator('text="Сначала осмотреться"');
			if (await onboardingBtn.isVisible({ timeout: 2000 })) {
				console.log("Dismissing onboarding...");
				await onboardingBtn.click();
				await page.waitForTimeout(1000);
			}
		} catch (e) {}

		const scratchDir =
			"C:\\\\Users\\\\Admin\\\\.gemini\\\\antigravity\\\\brain\\\\a4816d4c-324b-4377-a1a5-7447446ea0af\\\\scratch";

		async function navTo(viewId, label) {
			// Find link by href exact match if it uses hash routing
			const link = page.locator(`a[href="#/${viewId}"]`).first();
			let isVis = await link.isVisible({ timeout: 1000 }).catch(() => false);

			if (!isVis) {
				// fallback: check if it doesn't have the slash
				const fallbackLink = page.locator(`a[href="#${viewId}"]`).first();
				isVis = await fallbackLink
					.isVisible({ timeout: 1000 })
					.catch(() => false);
				if (isVis) {
					console.log(`Navigating to ${label}...`);
					await fallbackLink.click();
				} else {
					console.log(`Skipping ${label} (not in nav for this role/mode)`);
					return false;
				}
			} else {
				console.log(`Navigating to ${label}...`);
				await link.click();
			}

			await page.waitForLoadState("networkidle");
			await page.waitForTimeout(2000);

			const errorBoundary = page.locator(
				'[class*="error-boundary"], [class*="error-screen"]',
			);
			const hasError = await errorBoundary
				.isVisible({ timeout: 1000 })
				.catch(() => false);
			if (hasError) {
				console.warn(`WARNING: ${label} rendered error boundary!`);
			}
			return true;
		}

		console.log("Taking dashboard screenshot...");
		await page.screenshot({ path: path.join(scratchDir, "dashboard.png") });

		if (await navTo("shift", "Смена"))
			await page.screenshot({ path: path.join(scratchDir, "shift.png") });
		if (await navTo("schedule", "Записи"))
			await page.screenshot({ path: path.join(scratchDir, "schedule.png") });
		if (await navTo("patients", "Пациенты"))
			await page.screenshot({ path: path.join(scratchDir, "patients.png") });
		if (await navTo("imaging", "Снимки"))
			await page.screenshot({ path: path.join(scratchDir, "imaging.png") });
		if (await navTo("documents", "Документы"))
			await page.screenshot({ path: path.join(scratchDir, "documents.png") });
		if (await navTo("finance", "Оплаты"))
			await page.screenshot({ path: path.join(scratchDir, "finance.png") });
		if (await navTo("analytics", "Аналитика"))
			await page.screenshot({ path: path.join(scratchDir, "analytics.png") });
		if (await navTo("communications", "Связь"))
			await page.screenshot({
				path: path.join(scratchDir, "communications.png"),
			});
		if (await navTo("inventory", "Склад"))
			await page.screenshot({ path: path.join(scratchDir, "inventory.png") });
		if (await navTo("scanner", "Стерилизация"))
			await page.screenshot({ path: path.join(scratchDir, "scanner.png") });
		if (await navTo("leads", "Обращения"))
			await page.screenshot({ path: path.join(scratchDir, "leads.png") });
		if (await navTo("marketing", "Маркетинг"))
			await page.screenshot({ path: path.join(scratchDir, "marketing.png") });
		if (await navTo("settings", "Настройки"))
			await page.screenshot({ path: path.join(scratchDir, "settings.png") });

		console.log("SUCCESS: All steps completed.");
	} catch (err) {
		console.error(`SCRIPT_ERROR: ${err.message}`);
	} finally {
		await browser.close();
	}
}

run();
