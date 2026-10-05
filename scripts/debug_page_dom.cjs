const { chromium } = require("playwright");

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
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

  page.on("pageerror", (err) => console.log("[PAGE ERROR]:", err.message, err.stack));
  page.on("console", (msg) => {
    if (msg.type() === "error" || msg.type() === "warning") {
      console.log(`[CONSOLE ${msg.type()}]:`, msg.text());
    }
  });

  console.log("Navigating to http://127.0.0.1:5173/?cbct=demo...");
  await page.goto("http://127.0.0.1:5173/?cbct=demo", { waitUntil: "domcontentloaded", timeout: 30000 });

  for (let s = 1; s <= 8; s++) {
    await page.waitForTimeout(1000);
    const info = await page.evaluate(() => {
      const modal = document.querySelector('[data-testid="cbct-studio-modal"]');
      const boot = document.querySelector(".boot-state");
      const dropzone = document.querySelector('[data-testid="cbct-empty-volume-dropzone"]');
      const canvas = document.querySelectorAll("canvas");
      const testids = Array.from(document.querySelectorAll("[data-testid]")).map(e => e.getAttribute("data-testid"));
      return {
        url: window.location.href,
        hasModal: !!modal,
        hasBoot: !!boot,
        bootText: boot ? boot.innerText : null,
        hasDropzone: !!dropzone,
        canvasCount: canvas.length,
        testids: testids.slice(0, 15),
      };
    });
    console.log(`[${s}s]`, JSON.stringify(info));
    if (info.hasModal) {
      console.log("FOUND MODAL!");
      break;
    }
  }

  await page.screenshot({ path: "debug_page_dom.png" });
  console.log("Screenshot saved.");
  await browser.close();
}

main().catch(console.error);
