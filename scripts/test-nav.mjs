import { chromium } from "playwright";

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-gpu", "--proxy-server=direct://", "--proxy-bypass-list=*"]
});
const page = await browser.newPage();
page.on("console", msg => console.log("PAGE LOG:", msg.text()));
page.on("pageerror", err => console.log("PAGE ERROR:", err.message));
page.on("requestfailed", req => console.log("REQ FAILED:", req.url(), req.failure()?.errorText));

console.log("Navigating to http://127.0.0.1:5173/ ...");
try {
  const resp = await page.goto("http://127.0.0.1:5173/", { timeout: 10000 });
  console.log("Response status:", resp.status());
} catch (e) {
  console.error("GOTO ERROR:", e.message);
}
await browser.close();
