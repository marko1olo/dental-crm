const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const proofDir = path.resolve("C:/Clinic_MVP/dental-crm/docs/proofs/finance");
if (!fs.existsSync(proofDir)) {
  fs.mkdirSync(proofDir, { recursive: true });
}

async function suppressOverlays(page) {
  await page.evaluate(() => {
    const style = document.createElement("style");
    style.id = "suppress-all-tour-overlays";
    style.innerHTML = `
      .tour-spotlight-root,
      .tour-backdrop-clickable-zone,
      [data-testid="guided-tour-spotlight-overlay"],
      [data-testid="guided-tour-coach-mark-card"],
      .shepherd-element,
      .toast,
      [data-testid="toast-container"] {
        display: none !important;
        pointer-events: none !important;
        opacity: 0 !important;
      }
    `;
    document.head.appendChild(style);
  });
}

async function triggerPaymentModal(page) {
  await page.evaluate(() => {
    window.dispatchEvent(
      new CustomEvent("dente:open-payment-modal", {
        detail: {
          patientId: "pat-1",
          patientName: "Михайлов Артем Евгеньевич",
          patientPhone: "+7 (926) 345-67-89",
          amountRub: 14500,
          defaultMethod: "cash",
        },
      })
    );
  });
}

(async () => {
  console.log("=== CAPTURING RED TEAM 4-STATE PAYMENT MODAL PROOFS ===");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  });

  try {
    // ─── 1. PC CONTEXT (1440x900) ──────────────────────────────────────────
    console.log("Setting up PC context (1440x900)...");
    const pcContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await pcContext.addInitScript(() => {
      localStorage.setItem("dente_clinic_token", "audit-token-clinic");
      localStorage.setItem("dente_staff_token", "audit-token-staff");
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_demo_showcase", "true");
      localStorage.setItem("theme", "light");
      localStorage.setItem("dente_theme", "light");
      localStorage.setItem("dente_theme_mode", "light");
      sessionStorage.setItem("dente_chunk_reload_/", "1");
    });

    const pcPage = await pcContext.newPage();
    console.log("Navigating PC to http://127.0.0.1:5173/?demo=true#cashbox ...");
    await pcPage.goto("http://127.0.0.1:5173/?demo=true#cashbox", { waitUntil: "domcontentloaded", timeout: 30000 });
    await pcPage.waitForFunction(() => !document.body.innerText.includes("Загрузка CRM"), { timeout: 30000 }).catch(() => {});
    await pcPage.waitForTimeout(2000);
    await suppressOverlays(pcPage);

    console.log("Triggering payment modal on PC...");
    await triggerPaymentModal(pcPage);
    await pcPage.waitForSelector(".payment-modal, [data-testid='payment-modal-studio']", { timeout: 10000 });
    await pcPage.waitForTimeout(1000);

    // 1. PC Light
    console.log("Capturing PC Light (1440x900)...");
    await pcPage.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "light");
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      localStorage.setItem("dente_theme", "light");
      localStorage.setItem("dente_theme_mode", "light");
    });
    await pcPage.waitForTimeout(600);
    const pcLightPath = path.join(proofDir, "01_payment_modal_pc_light.png");
    await pcPage.screenshot({ path: pcLightPath, fullPage: false });
    fs.copyFileSync(pcLightPath, path.join(proofDir, "studio_payment_modal_pc_light.png"));
    console.log(`[1/4 PROOF] Saved: ${pcLightPath} (${fs.statSync(pcLightPath).size} bytes)`);

    // 2. PC Dark
    console.log("Capturing PC Dark (1440x900)...");
    await pcPage.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
      localStorage.setItem("dente_theme", "dark");
      localStorage.setItem("dente_theme_mode", "dark");
    });
    await pcPage.waitForTimeout(600);
    const pcDarkPath = path.join(proofDir, "02_payment_modal_pc_dark.png");
    await pcPage.screenshot({ path: pcDarkPath, fullPage: false });
    fs.copyFileSync(pcDarkPath, path.join(proofDir, "studio_payment_modal_pc_dark.png"));
    console.log(`[2/4 PROOF] Saved: ${pcDarkPath} (${fs.statSync(pcDarkPath).size} bytes)`);

    // ─── 2. MOBILE VIEWPORT (390x844) ON SAME LIVE SESSION ────────────────────
    console.log("Switching to Mobile viewport (390x844)...");
    await pcPage.setViewportSize({ width: 390, height: 844 });
    await pcPage.reload({ waitUntil: "domcontentloaded" });
    await pcPage.waitForFunction(() => !document.body.innerText.includes("Загрузка CRM"), { timeout: 30000 }).catch(() => {});
    await pcPage.waitForTimeout(2000);
    await suppressOverlays(pcPage);
    await triggerPaymentModal(pcPage);
    await pcPage.waitForSelector(".payment-modal, [data-testid='payment-modal-studio']", { timeout: 15000 });
    await pcPage.waitForTimeout(1000);

    // 3. Mobile Light
    console.log("Capturing Mobile Light (390x844)...");
    await pcPage.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "light");
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      localStorage.setItem("dente_theme", "light");
      localStorage.setItem("dente_theme_mode", "light");
    });
    await pcPage.waitForTimeout(600);
    const mobileLightPath = path.join(proofDir, "03_payment_modal_mobile_light.png");
    await pcPage.screenshot({ path: mobileLightPath, fullPage: false });
    fs.copyFileSync(mobileLightPath, path.join(proofDir, "studio_payment_modal_mobile_light.png"));
    console.log(`[3/4 PROOF] Saved: ${mobileLightPath} (${fs.statSync(mobileLightPath).size} bytes)`);

    // 4. Mobile Dark
    console.log("Capturing Mobile Dark (390x844)...");
    await pcPage.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
      localStorage.setItem("dente_theme", "dark");
      localStorage.setItem("dente_theme_mode", "dark");
    });
    await pcPage.waitForTimeout(600);
    const mobileDarkPath = path.join(proofDir, "04_payment_modal_mobile_dark.png");
    await pcPage.screenshot({ path: mobileDarkPath, fullPage: false });
    fs.copyFileSync(mobileDarkPath, path.join(proofDir, "studio_payment_modal_mobile_dark.png"));
    console.log(`[4/4 PROOF] Saved: ${mobileDarkPath} (${fs.statSync(mobileDarkPath).size} bytes)`);

    await pcContext.close();
    console.log("=== SUCCESS: ALL 4 PAYMENT PROOFS CAPTURED ===");
  } finally {
    await browser.close();
  }
})();
