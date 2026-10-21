const puppeteer = require("puppeteer");
const path = require("node:path");
const fs = require("node:fs");

const proofDir = path.resolve("C:/Clinic_MVP/dental-crm/docs/proofs/finance");
if (!fs.existsSync(proofDir)) {
  fs.mkdirSync(proofDir, { recursive: true });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log("=== CAPTURING CASH FLOW & RECEIPT PROOFS (4-STATE) ===");
  const webUrl = "http://127.0.0.1:5173";

  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const setupPage = async (page, isMobile, isDark) => {
      const width = isMobile ? 390 : 1440;
      const height = isMobile ? 844 : 900;
      await page.setViewport({ width, height, isMobile, hasTouch: isMobile });

      await page.evaluateOnNewDocument((dark) => {
        localStorage.setItem("dente_clinic_token", "demo-token");
        localStorage.setItem("dente_organization_id", "00000000-0000-0000-0000-000000000001");
        localStorage.setItem("dente_staff_token", "demo-token");
        localStorage.setItem("dente_active_session_token", "demo-token");
        localStorage.setItem("dente_active_user_id", "demo-user");
        localStorage.setItem("dente_user_id", "demo-user");
        localStorage.setItem("dente_active_role", "owner");
        localStorage.setItem("dente_user_role", "owner");
        localStorage.setItem("dente_active_mode", "clinic");
        sessionStorage.setItem("dente_unlocked", "true");
        sessionStorage.setItem("dente_chunk_reload_/", "1");
        localStorage.setItem("dente_onboarding_completed", "true");
        localStorage.setItem("dente_tour_completed", "true");
        localStorage.setItem("dente_demo_showcase", "true");
        const mode = dark ? "dark" : "light";
        localStorage.setItem("dente_theme_mode", mode);
        localStorage.setItem("dente_theme", mode);
        localStorage.setItem("theme", mode);
        localStorage.setItem(
          "dental-crm:web-ui-preferences:v1",
          JSON.stringify({ version: 1, uiLanguage: "ru", theme: mode, selectedWorkspaceRole: "owner", onboardingDismissed: true, onboardingStep: "done" })
        );
      }, isDark);
    };

    const suppressOverlays = async (page) => {
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
    };

    // ─── 1. PC LIGHT CASH FLOW (Внесение наличных в кассу) ───────────────
    console.log("1. Capturing PC Light Cash Flow In (1440x900)...");
    const page1 = await browser.newPage();
    await setupPage(page1, false, false);
    await page1.goto(`${webUrl}/?cashflow=in`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page1.waitForFunction(() => !document.querySelector(".boot-state") && !document.body.innerText.includes("Загрузка системы"), { timeout: 25000 }).catch(() => {});
    await page1.waitForSelector('[data-testid="cash-flow-modal"]', { timeout: 20000 });
    await suppressOverlays(page1);
    await page1.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "light");
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    });
    await sleep(800);
    const p1Path = path.join(proofDir, "pc_light_cash_flow_in.png");
    await page1.screenshot({ path: p1Path, fullPage: false });
    console.log(`[PROOF 1/5] Saved: ${p1Path} (${fs.statSync(p1Path).size} bytes)`);
    await page1.close();

    // ─── 2. PC DARK CASH FLOW (Инкассация / Выемка из кассы) ─────────────
    console.log("2. Capturing PC Dark Cash Flow Out (1440x900)...");
    const page2 = await browser.newPage();
    await setupPage(page2, false, true);
    await page2.goto(`${webUrl}/?cashflow=out`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page2.waitForFunction(() => !document.querySelector(".boot-state") && !document.body.innerText.includes("Загрузка системы"), { timeout: 25000 }).catch(() => {});
    await page2.waitForSelector('[data-testid="cash-flow-modal"]', { timeout: 20000 });
    await suppressOverlays(page2);
    await page2.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
    });
    await sleep(800);
    const p2Path = path.join(proofDir, "pc_dark_cash_flow_out.png");
    await page2.screenshot({ path: p2Path, fullPage: false });
    console.log(`[PROOF 2/5] Saved: ${p2Path} (${fs.statSync(p2Path).size} bytes)`);
    await page2.close();

    // ─── 3. MOBILE LIGHT CASH FLOW (390x844) ─────────────────────────────
    console.log("3. Capturing Mobile Light Cash Flow (390x844)...");
    const page3 = await browser.newPage();
    await setupPage(page3, true, false);
    await page3.goto(`${webUrl}/?cashflow=in`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page3.waitForFunction(() => !document.querySelector(".boot-state") && !document.body.innerText.includes("Загрузка системы"), { timeout: 25000 }).catch(() => {});
    await page3.waitForSelector('[data-testid="cash-flow-modal"]', { timeout: 20000 });
    await suppressOverlays(page3);
    await page3.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "light");
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    });
    await sleep(800);
    const p3Path = path.join(proofDir, "mobile_light_cash_flow.png");
    await page3.screenshot({ path: p3Path, fullPage: false });
    console.log(`[PROOF 3/5] Saved: ${p3Path} (${fs.statSync(p3Path).size} bytes)`);
    await page3.close();

    // ─── 4. MOBILE DARK CASH FLOW (390x844) ──────────────────────────────
    console.log("4. Capturing Mobile Dark Cash Flow (390x844)...");
    const page4 = await browser.newPage();
    await setupPage(page4, true, true);
    await page4.goto(`${webUrl}/?cashflow=out`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page4.waitForFunction(() => !document.querySelector(".boot-state") && !document.body.innerText.includes("Загрузка системы"), { timeout: 25000 }).catch(() => {});
    await page4.waitForSelector('[data-testid="cash-flow-modal"]', { timeout: 20000 });
    await suppressOverlays(page4);
    await page4.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
    });
    await sleep(800);
    const p4Path = path.join(proofDir, "mobile_dark_cash_flow.png");
    await page4.screenshot({ path: p4Path, fullPage: false });
    console.log(`[PROOF 4/5] Saved: ${p4Path} (${fs.statSync(p4Path).size} bytes)`);
    await page4.close();

    // ─── 5. PC LIGHT FISCAL RECEIPT (Кассовый чек без 54-ФЗ ФФД 1.2) ─────
    console.log("5. Capturing PC Light Fiscal Receipt (1440x900)...");
    const page5 = await browser.newPage();
    await setupPage(page5, false, false);
    await page5.goto(`${webUrl}/?receipt=1`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page5.waitForFunction(() => !document.querySelector(".boot-state") && !document.body.innerText.includes("Загрузка системы"), { timeout: 25000 }).catch(() => {});
    await page5.waitForSelector('.receipt-container, [data-testid="cash-receipt-modal"], .fixed', { timeout: 20000 });
    await suppressOverlays(page5);
    await page5.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "light");
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    });
    await sleep(800);
    const p5Path = path.join(proofDir, "pc_light_fiscal_receipt.png");
    await page5.screenshot({ path: p5Path, fullPage: false });
    console.log(`[PROOF 5/5] Saved: ${p5Path} (${fs.statSync(p5Path).size} bytes)`);
    await page5.close();

    console.log("=== ALL CASH FLOW & RECEIPT PROOFS CAPTURED SUCCESSFULLY ===");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("Capture error:", err);
  process.exit(1);
});
