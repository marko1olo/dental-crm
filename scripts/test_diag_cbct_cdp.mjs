import { chromium } from "playwright";
import fs from "node:fs";

async function main() {
  console.log("Launching browser...");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--enable-webgl", "--ignore-gpu-blocklist"]
  });

  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => {
    localStorage.setItem("dente_clinic_token", "live-inquisition-clinic-token");
    localStorage.setItem("dente_staff_token", "live-inquisition-staff-token");
    localStorage.setItem("dente_active_role", "owner");
    localStorage.setItem("dente_theme_mode", "dark");
    localStorage.setItem("dente_active_patient_id", "demo_cbct_patient");
    localStorage.setItem("dente_tour_completed", "true");
  });

  const page = await ctx.newPage();
  page.on("console", (m) => console.log("[CONSOLE]", m.type(), m.text()));
  page.on("pageerror", (e) => console.error("[PAGEERROR]", e.message));

  console.log("Navigating...");
  await page.goto("http://127.0.0.1:5173/?cbct=demo", { waitUntil: "domcontentloaded", timeout: 15000 });
  console.log("DOMContentLoaded reached!");

  // Wait 4 seconds for React hydration and modal
  await page.waitForTimeout(4000);

  const html = await page.content();
  console.log("HTML length:", html.length);
  console.log("Has cbct-studio-modal:", html.includes("cbct-studio-modal"));
  console.log("Has cbct-axial-canvas:", html.includes("cbct-axial-canvas"));
  console.log("Has fallback loading:", html.includes("AppLoadingState") || html.includes("Загрузка 3D КЛКТ"));

  const cdp = await ctx.newCDPSession(page);
  const { data } = await cdp.send("Page.captureScreenshot", { format: "png" });
  await cdp.detach();
  fs.writeFileSync("docs/screenshots/cbct_departments/diag_test.png", Buffer.from(data, "base64"));
  console.log("CDP Screenshot saved! Size:", fs.statSync("docs/screenshots/cbct_departments/diag_test.png").size);

  await browser.close();
}

main().catch(err => {
  console.error("ERROR:", err);
  process.exit(1);
});
