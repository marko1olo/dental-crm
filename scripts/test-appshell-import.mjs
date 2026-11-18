import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
page.on("console", (m) => console.log(`[CONSOLE ${m.type()}]:`, m.text()));
page.on("pageerror", (e) => console.log("[PAGE ERROR]:", e.stack || e.message));
page.on("requestfailed", (r) => console.log("[REQ FAILED]:", r.url(), r.failure()?.errorText));

console.log("Navigating to http://127.0.0.1:5174/?demo=true#pricelist ...");
await page.goto("http://127.0.0.1:5174/?demo=true#pricelist", { waitUntil: "load" });
await page.waitForTimeout(5000);

const hasModal = await page.locator('[data-testid="service-pricelist-studio-modal"]').count();
console.log("Modal count on 5174:", hasModal);

await browser.close();
