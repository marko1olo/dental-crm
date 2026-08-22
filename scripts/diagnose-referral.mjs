import { chromium } from "playwright";

const browser = await chromium.launch({
  executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  headless: true
});
const page = await browser.newPage();
page.on("pageerror", (err) => console.error("PAGE_ERROR:", err.message, "\nSTACK:", err.stack));
page.on("console", (msg) => console.log("LOG:", msg.type(), msg.text()));
await page.goto("http://127.0.0.1:5173/#clinical-modals-studio");
await page.waitForTimeout(500);
const btn = page.locator("[data-testid=\"open-referral-057-modal-btn\"]");
await btn.click();
await page.waitForTimeout(1000);
await browser.close();
