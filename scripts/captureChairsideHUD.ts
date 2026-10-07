import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

async function run() {
  const screenshotDir = path.resolve(process.cwd(), "screenshots");
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  console.log("Launching Edge Playwright (channel: 'msedge')...");
  const browser = await chromium.launch({
    channel: "msedge",
    headless: true,
  });

  // 1. Capture Light Mode
  console.log("Creating Light context...");
  const lightContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: "light",
  });
  await lightContext.addInitScript(() => {
    localStorage.setItem("dente_theme", "light");
    localStorage.setItem("dente_theme_mode", "light");
  });

  const lightPage = await lightContext.newPage();
  console.log("Navigating to http://127.0.0.1:5173/?hud=open (Light)...");
  await lightPage.goto("http://127.0.0.1:5173/?hud=open", { waitUntil: "domcontentloaded" });
  await lightPage.waitForSelector('[data-testid="chairside-copilot-hud"]', { timeout: 10000 });
  await lightPage.evaluate(() => {
    document.documentElement.setAttribute("data-theme", "light");
    document.documentElement.classList.remove("dark");
    document.documentElement.classList.add("light");
  });
  await lightPage.waitForTimeout(1000);

  const lightPath = path.join(screenshotDir, "pc_light_chairside_hud.png");
  await lightPage.screenshot({ path: lightPath, fullPage: false });
  console.log(`Saved Light Screenshot: ${lightPath} (${fs.statSync(lightPath).size} bytes)`);
  await lightContext.close();

  // 2. Capture Dark Mode
  console.log("Creating Dark context...");
  const darkContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: "dark",
  });
  await darkContext.addInitScript(() => {
    localStorage.setItem("dente_theme", "dark");
    localStorage.setItem("dente_theme_mode", "dark");
  });

  const darkPage = await darkContext.newPage();
  console.log("Navigating to http://127.0.0.1:5173/?hud=open (Dark)...");
  await darkPage.goto("http://127.0.0.1:5173/?hud=open", { waitUntil: "domcontentloaded" });
  await darkPage.waitForSelector('[data-testid="chairside-copilot-hud"]', { timeout: 10000 });
  await darkPage.evaluate(() => {
    document.documentElement.setAttribute("data-theme", "dark");
    document.documentElement.classList.remove("light");
    document.documentElement.classList.add("dark");
  });
  await darkPage.waitForTimeout(1000);

  const darkPath = path.join(screenshotDir, "pc_dark_chairside_hud.png");
  await darkPage.screenshot({ path: darkPath, fullPage: false });
  console.log(`Saved Dark Screenshot: ${darkPath} (${fs.statSync(darkPath).size} bytes)`);
  await darkContext.close();

  await browser.close();
  console.log("All screenshots captured successfully!");
}

run().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
