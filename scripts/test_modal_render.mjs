import { chromium } from "playwright";

const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await browser.newPage();
page.on("requestfailed", (req) => {
	console.log("FAILED REQ:", req.url(), req.failure()?.errorText);
});
page.on("response", (res) => {
	if (res.status() >= 400) {
		console.log("STATUS >= 400:", res.status(), res.url());
	}
});

await page.goto("http://127.0.0.1:5173/doctor_autonomy_preview.html?view=schedule_modal", { waitUntil: "domcontentloaded" });
await page.waitForTimeout(3000);

const overlay = await page.evaluate(() => {
	const el = document.querySelector("vite-error-overlay");
	if (el && el.shadowRoot) {
		return el.shadowRoot.innerHTML;
	}
	return el ? el.innerHTML : null;
});
console.log("VITE OVERLAY:", overlay);

await browser.close();
