const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

async function main() {
  const browser = await chromium.launch({
    headless: true,
    channel: "chrome",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });

    await ctx.addInitScript(() => {
      localStorage.setItem("dente_clinic_token", "live-inquisition-clinic-token");
      localStorage.setItem("dente_staff_token", "live-inquisition-staff-token");
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_theme_mode", "dark");
      localStorage.setItem("dente_active_patient_id", "pat-1");
      localStorage.setItem("dente_tour_completed", "true");
    });

    const page = await ctx.newPage();
    page.on("pageerror", (err) => console.log("[PAGE ERROR]:", err.message));
    page.on("response", (res) => {
      if (res.status() >= 400) console.log(`[HTTP ${res.status()}]:`, res.url());
    });
    page.on("console", (msg) => {
      if (msg.type() === "error") console.log("[CONSOLE ERROR]:", msg.text());
    });

    console.log("Navigating to http://127.0.0.1:5173/?cbct=demo...");
    await page.goto("http://127.0.0.1:5173/?cbct=demo", { waitUntil: "domcontentloaded", timeout: 45000 });

    console.log("Waiting for modal selector...");
    const modal = await page.waitForSelector('[data-testid="cbct-studio-modal"]', { timeout: 25000 }).catch(e => null);
    console.log("Modal visible?", !!modal);

    await page.waitForTimeout(4000);
    await page.screenshot({ path: "test_clean_run.png" });
    console.log("Saved test_clean_run.png!");
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
