import { chromium } from "playwright";

async function test() {
	const browser = await chromium.launch({
		channel: "msedge",
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox", "--enable-webgl", "--ignore-gpu-blocklist"],
	});
	const page = await browser.newPage();
	page.on("console", (msg) => console.log(`[CONSOLE ${msg.type()}]`, msg.text()));
	page.on("pageerror", (err) => console.error("[PAGEERROR]", err));

	console.log("Navigating to http://127.0.0.1:5173/?cbct=demo ...");
	await page.goto("http://127.0.0.1:5173/?cbct=demo");
	await page.waitForTimeout(5000);

	const html = await page.content();
	console.log("Has modal:", html.includes("cbct-studio-modal"));
	console.log("Has error overlay:", html.includes("vite-error-overlay"));
	if (html.includes("vite-error-overlay")) {
		const errorText = await page.locator("vite-error-overlay").innerText().catch(() => "unknown");
		console.log("Vite error:", errorText);
	}
	await page.screenshot({ path: "docs/screenshots/adaptivity/diagnostic_cbct_demo.png" });
	console.log("Saved diagnostic screenshot: docs/screenshots/adaptivity/diagnostic_cbct_demo.png");
	await browser.close();
}

test().catch(console.error);
