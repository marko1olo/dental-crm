const { chromium } = require("playwright");

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  await ctx.addInitScript(() => {
    localStorage.setItem("dente_clinic_token", "live-inquisition-clinic-token");
    localStorage.setItem("dente_staff_token", "live-inquisition-staff-token");
    localStorage.setItem("dente_active_role", "owner");
    localStorage.setItem("dente_theme_mode", "dark");
    localStorage.setItem("dente_active_patient_id", "pat-1");
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem(
      "dental-crm:web-ui-preferences:v1",
      JSON.stringify({
        version: 1,
        uiLanguage: "ru",
        selectedWorkspaceRole: "owner",
        selectedPatientId: "pat-1",
        onboardingDismissed: true,
        onboardingStep: "done",
      })
    );
  });

  const page = await ctx.newPage();

  page.on("pageerror", (err) => console.log("[PAGE ERROR]:", err.message, err.stack));
  page.on("console", (msg) => console.log(`[CONSOLE ${msg.type()}]:`, msg.text()));
  page.on("requestfailed", (req) => console.log("[REQ FAILED]:", req.url(), req.failure()?.errorText));
  page.on("response", (res) => {
    if (res.status() >= 400) console.log("[HTTP ERROR]:", res.status(), res.url());
  });

  console.log("Navigating to http://127.0.0.1:5173/?cbct=demo");
  try {
    await page.goto("http://127.0.0.1:5173/?cbct=demo", { waitUntil: "domcontentloaded", timeout: 20000 });
  } catch (e) {
    console.log("goto result:", e.message);
  }

  console.log("Waiting for React to mount and boot-state to disappear...");
  try {
    await page.waitForFunction(() => {
      const boot = document.querySelector(".boot-state");
      const title = document.querySelector(".boot-title");
      return !boot || document.querySelector('[data-testid="cbct-studio-modal"]') || document.querySelector("nav") || document.querySelector("header");
    }, { timeout: 35000 });
    console.log("React has mounted!");
  } catch (e) {
    console.log("Wait for mount timed out:", e.message);
  }

  await page.waitForTimeout(3000);
  const title = await page.title();
  const url = page.url();
  console.log("Current URL:", url, "Title:", title);

  const modal = await page.$('[data-testid="cbct-studio-modal"]');
  console.log("cbct-studio-modal present:", !!modal);

  const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 500));
  console.log("Body text preview:", bodyText);

  await page.screenshot({ path: "diagnose_cbct_url.png" });
  console.log("Screenshot saved to diagnose_cbct_url.png");

  await browser.close();
}

main().catch((err) => {
  console.error("FATAL ERROR CAUGHT:", err);
  const fs = require("node:fs");
  fs.writeFileSync("diagnose_error.txt", (err && err.stack) ? err.stack : String(err));
  process.exit(1);
});
