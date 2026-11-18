import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

page.on("console", (msg) => console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`));
page.on("pageerror", (err) => console.log(`[PAGE ERROR]: ${err.message}`));

console.log("Navigating to http://127.0.0.1:5173/?demo=true...");
await page.goto("http://127.0.0.1:5173/?demo=true", { waitUntil: "networkidle", timeout: 20000 }).catch((e) => console.log("Goto timeout:", e.message));

const html = await page.content();
console.log("HTML length:", html.length);
const rootText = await page.locator("#root").innerText().catch(() => "NO ROOT");
console.log("Root text preview:", rootText.slice(0, 300));

await browser.close();
