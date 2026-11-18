const { chromium } = require("playwright");

async function debugBoot() {
	console.log("=== Launching Chrome to inspect console logs ===");
	const browser = await chromium.launch({
		headless: true,
		executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

	const context = await browser.newContext({
		viewport: { width: 1440, height: 900 },
	});

	await context.addInitScript(() => {
		sessionStorage.setItem("dente:sw-controller-reload", "1");
		sessionStorage.setItem("dente_unlocked", "true");
		localStorage.setItem("dente_demo_showcase", "true");
		localStorage.setItem("dente_demo_mode", "true");
		localStorage.setItem("dente_onboarding_completed", "true");
		localStorage.setItem("dente_tour_completed", "true");
		localStorage.setItem("dente_tour_dismissed", "true");
		localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
		localStorage.setItem("dente_demo_banner_dismissed", "true");
		localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
		localStorage.setItem("dente_active_role", "doctor");
		localStorage.setItem("dental-crm:active-user:v1", JSON.stringify({
			id: "doc-1",
			fullName: "Д-р Воронов Алексей Владимирович",
			role: "doctor",
		}));
	});

	const page = await context.newPage();

	page.on("console", (msg) => {
		console.log(`[BROWSER ${msg.type().toUpperCase()}]:`, msg.text());
	});

	page.on("pageerror", (err) => {
		console.log(`[PAGE ERROR]:`, err.stack || err.message);
	});

	page.on("requestfailed", (req) => {
		console.log(`[NET FAILED]:`, req.method(), req.url(), req.failure()?.errorText);
	});

	console.log("Navigating to http://127.0.0.1:5173/?demo=true#patients ...");
	await page.goto("http://127.0.0.1:5173/?demo=true#patients", {
		waitUntil: "domcontentloaded",
		timeout: 15000,
	});

	console.log("Waiting 10 seconds to collect boot diagnostics...");
	await page.waitForTimeout(10000);

	const rootHtml = await page.evaluate(() => {
		const r = document.getElementById("root");
		return r ? r.innerHTML.slice(0, 300) : "NO ROOT";
	});
	console.log("Root content snippet:", rootHtml);

	await browser.close();
}

debugBoot().catch(console.error);
