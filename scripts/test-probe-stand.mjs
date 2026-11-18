import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on("console", (m) => console.log("LOG:", m.text()));
page.on("pageerror", (e) => console.error("ERR:", e.message));

console.log("Navigating to http://127.0.0.1:5173/?stand=pricelist#pricelist ...");
await page.goto("http://127.0.0.1:5173/?stand=pricelist#pricelist", { waitUntil: "commit", timeout: 20000 });
console.log("Committed! Waiting for React root to mount...");
await page.waitForFunction(() => {
	const root = document.querySelector("#root");
	return root && root.children.length > 0;
}, null, { timeout: 45000 });
console.log("Root mounted!");

const count = await page.locator('[data-testid="service-pricelist-studio-modal"], .pricelist-studio-modal').count();
console.log("Modal count:", count);
if (count > 0) {
	await page.screenshot({ path: "scratch/pricelist_test_proof.png" });
	console.log("Screenshot taken to scratch/pricelist_test_proof.png!");
} else {
	const body = await page.locator("body").innerHTML();
	console.log("Body HTML snippet:", body.slice(0, 500));
}
await browser.close();
