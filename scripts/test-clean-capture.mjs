import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

page.on("console", (m) => console.log(`[CONSOLE ${m.type()}]:`, m.text()));
page.on("pageerror", (e) => console.log("[PAGE ERROR]:", e.message));

console.log("Navigating to http://127.0.0.1:5174/?demo=true#pricelist ...");
await page.goto("http://127.0.0.1:5174/?demo=true#pricelist", { waitUntil: "commit" });

let mounted = false;
for (let i = 0; i < 20; i++) {
	await page.waitForTimeout(1000);
	mounted = await page.evaluate(() => {
		const el = document.querySelector(".pricelist-studio-overlay, [data-testid='service-pricelist-studio-modal']");
		return !!el;
	});
	console.log(`[T+${i + 1}s] Mounted:`, mounted);
	if (mounted) break;
}

if (!mounted) {
	console.error("Not mounted within 20s!");
	await browser.close();
	process.exit(1);
}

console.log("Taking screenshot...");
await page.waitForTimeout(1000);
const testFile = path.resolve("test_pricelist_success.png");
await page.screenshot({ path: testFile, fullPage: false });
console.log(`Saved screenshot: ${testFile} (${fs.statSync(testFile).size} bytes)`);

await browser.close();
