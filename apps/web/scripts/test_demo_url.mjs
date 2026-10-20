import { chromium } from "playwright";

async function run() {
	const browser = await chromium.launch({
		channel: "msedge",
		headless: true,
	});
	const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

	page.on("console", (msg) => console.log("[BROWSER CONSOLE]:", msg.type(), msg.text()));
	page.on("pageerror", (err) => console.error("[BROWSER ERROR]:", err.message));

	console.log("Navigating to http://127.0.0.1:5173/?demo=true#visit...");
	await page.goto("http://127.0.0.1:5173/?demo=true#visit", { waitUntil: "domcontentloaded", timeout: 20000 });

	await page.evaluate(() => {
		localStorage.setItem("dente_demo_showcase", "true");
		localStorage.setItem("dente_active_view", "visit");
	});

	console.log("Waiting for app to hydrate...");
	try {
		await page.waitForSelector(".boot-subtitle", { state: "detached", timeout: 25000 });
		console.log("DentalWorkspace loaded and boot-subtitle detached!");
	} catch (e) {
		console.log("Wait for boot-subtitle timed out:", e.message);
	}
	await page.waitForTimeout(2000);

	const bodyText = await page.evaluate(() => document.body.innerText);
	console.log("Body innerText:", JSON.stringify(bodyText.slice(0, 300)));

	await browser.close();
}

run().catch((e) => {
	console.error(e);
	process.exit(1);
});
