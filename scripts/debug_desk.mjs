import { chromium } from "playwright";

async function check() {
	const loginRes = await fetch("http://127.0.0.1:4100/api/auth/clinic/login", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email: "clinic@example.com", password: "dente2026" }),
	});
	const { clinicToken } = await loginRes.json();
	console.log("Got clinicToken:", clinicToken.slice(0, 15));

	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
	});
	const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
	await context.addInitScript((token) => {
		localStorage.setItem("dente_clinic_token", token);
		localStorage.setItem("dente_staff_token", token);
		localStorage.setItem("dente_demo_showcase", "true");
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
	}, clinicToken);

	const page = await context.newPage();
	page.on("console", (msg) => console.log("PAGE LOG:", msg.type(), msg.text()));
	page.on("response", (resp) => {
		if (resp.url().includes("/api/bots")) {
			console.log("BOT API RESP:", resp.url(), resp.status());
		}
	});

	await page.goto("http://127.0.0.1:5173/#communications", { waitUntil: "domcontentloaded" });
	await page.waitForTimeout(2000);

	const authBtn = await page.$("button.auth-demo-btn");
	if (authBtn) {
		console.log("Found auth demo btn, clicking...");
		await authBtn.click();
		await page.waitForTimeout(2000);
	}

	const botInboxTab = page.locator('[data-testid="communications-tab-bot-inbox"]');
	if (await botInboxTab.isVisible()) {
		console.log("Clicking tab...");
		await botInboxTab.click();
		await page.waitForTimeout(2000);
	}

	const firstConv = page.locator('[data-testid^="conv-item-"]').first();
	if (await firstConv.isVisible()) {
		console.log("Clicking first conv...");
		await firstConv.click();
		await page.waitForTimeout(2000);
	}

	const innerText = await page.evaluate(
		() => document.querySelector('[data-testid="omnichannel-operator-desk"]')?.innerText,
	);
	console.log("Desk innerText snippet:", innerText?.slice(0, 300));

	await browser.close();
}

check().catch(console.error);
