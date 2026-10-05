const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");
const os = require("node:os");

async function main() {
  const tempProfile = fs.mkdtempSync(path.join(os.tmpdir(), "pw-chrome-"));

  const context = await chromium.launchPersistentContext(tempProfile, {
    headless: true,
    channel: "chrome",
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();

    page.on("pageerror", (err) => console.log("[PAGE ERROR]:", err.message));
    page.on("response", (res) => {
      if (res.status() >= 400) console.log(`[HTTP ${res.status()}]:`, res.url());
    });
    page.on("console", (msg) => {
      if (msg.type() === "error") console.log("[CONSOLE ERROR]:", msg.text());
      else if (msg.text().includes("cbct") || msg.text().includes("Dente")) console.log("[CONSOLE]:", msg.text());
    });

    await page.addInitScript(() => {
      localStorage.setItem("dente_clinic_token", "live-inquisition-clinic-token");
      localStorage.setItem("dente_staff_token", "live-inquisition-staff-token");
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_theme_mode", "dark");
      localStorage.setItem("dente_active_patient_id", "pat-1");
      localStorage.setItem("dente_tour_completed", "true");
    });

    console.log("Navigating to http://127.0.0.1:5173/?cbct=demo...");
    await page.goto("http://127.0.0.1:5173/?cbct=demo", { waitUntil: "domcontentloaded", timeout: 20000 });

    console.log("Waiting for boot state to clear...");
    await page.waitForFunction(() => !document.querySelector(".boot-state"), { timeout: 25000 }).catch(e => {
      console.log("Boot state did not disappear within 25s");
    });

    await page.waitForTimeout(2000);
    const url = page.url();
    const title = await page.title();
    console.log("Page ready. URL:", url, "Title:", title);

    const modal = await page.$('[data-testid="cbct-studio-modal"]');
    console.log("cbct-studio-modal visible:", !!modal);

    const testIds = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("[data-testid]")).map(el => el.getAttribute("data-testid")).slice(0, 20);
    });
    console.log("Found data-testids:", testIds);

    await page.screenshot({ path: "test_quick_screen.png" });
    console.log("Screenshot test_quick_screen.png saved successfully!");

  } finally {
    await context.close().catch(() => {});
    try { fs.rmSync(tempProfile, { recursive: true, force: true }); } catch {}
  }
}

main().catch(err => {
  console.error("FATAL:", err);
  process.exit(1);
});
