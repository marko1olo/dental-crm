import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

console.log("Navigating to http://127.0.0.1:5174/?demo=true#pricelist ...");
await page.goto("http://127.0.0.1:5174/?demo=true#pricelist", { waitUntil: "commit" });

let mounted = false;
for (let i = 0; i < 20; i++) {
	await page.waitForTimeout(1000);
	mounted = await page.evaluate(() => {
		let el = document.querySelector(".pricelist-studio-overlay");
		if (!el) {
			window.dispatchEvent(new CustomEvent("dente-open-pricelist"));
			el = document.querySelector(".pricelist-studio-overlay");
		}
		return !!el;
	});
	console.log(`[T+${i + 1}s] Mounted: ${mounted}`);
	if (mounted) break;
}

if (!mounted) {
	console.error("Failed to mount pricelist studio!");
	await browser.close();
	process.exit(1);
}

console.log("Pricelist studio mounted! Taking test screenshot...");
await page.waitForTimeout(1000);
const testPath = path.resolve("test_pricelist_pc.png");
await page.screenshot({ path: testPath, fullPage: false });
console.log(`Screenshot saved to ${testPath}: ${fs.statSync(testPath).size} bytes`);

await browser.close();
