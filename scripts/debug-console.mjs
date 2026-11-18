import { chromium } from "playwright";

const browser = await chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-gpu"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on("console", msg => console.log("LOG:", msg.type(), msg.text()));
page.on("pageerror", err => console.log("PAGEERROR:", err.message));

await page.goto("http://127.0.0.1:5173/?standalone=orthopedics#orthopedics", { waitUntil: "commit" });
await page.waitForTimeout(4000);
const rootHtml = await page.evaluate(() => document.getElementById("root")?.innerHTML?.slice(0, 300) || "NO_ROOT");
console.log("ROOT HTML:", rootHtml);
await browser.close();
