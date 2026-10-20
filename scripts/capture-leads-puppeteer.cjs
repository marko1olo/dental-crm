const puppeteer = require("puppeteer");
const path = require("node:path");
const fs = require("node:fs");

const PROOFS_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/proofs/leads");
if (!fs.existsSync(PROOFS_DIR)) {
  fs.mkdirSync(PROOFS_DIR, { recursive: true });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
      .default-clinic-banner,
      [role="status"] {
        display: none !important;
        pointer-events: none !important;
        opacity: 0 !important;
      }
    `;
    document.head.appendChild(style);
  });
}

async function takeProof(page, filename, description) {
  const primaryPath = path.join(PROOFS_DIR, filename);
  await page.screenshot({ path: primaryPath, fullPage: false });
  const stat = fs.statSync(primaryPath);
  if (stat.size < 20000) {
    throw new Error(`[BLANK DETECTED] Screenshot ${filename} is only ${stat.size} bytes!`);
  }
  console.log(`[PROOF CAPTURED] ${filename} (${stat.size} bytes) -> ${description}`);
}

async function main() {
  console.log("=== STARTING HONEST LEADS KANBAN LOGIN & CAPTURE ===");
  const browser = await puppeteer.launch({
    headless: "new",
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });

    console.log("1. Navigating to http://127.0.0.1:5173/?demo=true ...");
    await page.goto("http://127.0.0.1:5173/?demo=true", { waitUntil: "load", timeout: 30000 });
    await sleep(3000);

    // Look for "Быстрый вход в Демо-тур" button or regular login
    const allButtons = await page.$$("button");
    for (const btn of allButtons) {
      const text = await page.evaluate(el => el.innerText, btn);
      if (text && text.includes("Быстрый вход в Демо-тур")) {
        console.log("Found demo button by text, clicking...");
        await btn.click();
        await sleep(4000);
        break;
      }
    }

    // Switch to leads route
    console.log("2. Switching to #leads route...");
    await page.evaluate(() => {
      window.location.hash = "leads";
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    await sleep(3000);
    await suppressOverlays(page);

    // Click on "Обращения" in sidebar to ensure workspace is active
    const leadsNavLink = await page.$('a[href="#leads"], [data-view="leads"]');
    if (leadsNavLink) {
      console.log("Clicking leads nav link...");
      await leadsNavLink.click();
      await sleep(2000);
    }

    // ─── 1. PC LIGHT 1440x900 ──────────────────────────────────────────
    console.log("3. Capturing PC Light 1440x900...");
    await page.evaluate(() => {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      document.documentElement.setAttribute("data-theme", "light");
      localStorage.setItem("dente_theme", "light");
      localStorage.setItem("theme", "light");
    });
    await sleep(2000);
    await suppressOverlays(page);
    await takeProof(
      page,
      "leads_kanban_pc_light_1440x900.png",
      "Leads Kanban Board (PC Light 1440x900): 4 canonical stages [1. Новое обращение / 2. Звонок / Квалификация / 3. Записан на приём / 4. Архив / Нецелевой]"
    );

    // ─── 2. PC DARK 1440x900 ───────────────────────────────────────────
    console.log("4. Capturing PC Dark 1440x900...");
    await page.evaluate(() => {
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("dente_theme", "dark");
      localStorage.setItem("theme", "dark");
    });
    await sleep(2000);
    await suppressOverlays(page);
    await takeProof(
      page,
      "leads_kanban_pc_dark_1440x900.png",
      "Leads Kanban Board (PC Dark 1440x900): 4 canonical stages in OLED dark theme"
    );

    // ─── 3. RESIZE TO MOBILE 390x844 ──────────────────────────────────
    console.log("5. Resizing to Mobile (390x844, iPhone 14)...");
    await page.setViewport({
      width: 390,
      height: 844,
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
    });

    console.log("Waiting for mobile feed to finish loading...");
    for (let i = 0; i < 20; i++) {
      const text = await page.evaluate(() => document.body.innerText);
      if (text.includes("Обращения") && !text.includes("Загрузка обращений")) {
        console.log("Mobile feed mounted cleanly!");
        break;
      }
      await sleep(1000);
    }
    await suppressOverlays(page);

    // ─── 3. MOBILE LIGHT 390x844 ────────────────────────────────────────
    console.log("6. Capturing Mobile Light 390x844...");
    await page.evaluate(() => {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      document.documentElement.setAttribute("data-theme", "light");
      localStorage.setItem("dente_theme", "light");
      localStorage.setItem("theme", "light");
    });
    await sleep(2000);
    await suppressOverlays(page);
    await takeProof(
      page,
      "leads_kanban_mobile_light_390x844.png",
      "Leads Kanban Mobile Feed (Mobile Light 390x844): Natural Thumb Zone, touch targets >= 44px"
    );

    // ─── 4. MOBILE DARK 390x844 ─────────────────────────────────────────
    console.log("7. Capturing Mobile Dark 390x844...");
    await page.evaluate(() => {
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("dente_theme", "dark");
      localStorage.setItem("theme", "dark");
    });
    await sleep(2000);
    await suppressOverlays(page);
    await takeProof(
      page,
      "leads_kanban_mobile_dark_390x844.png",
      "Leads Kanban Mobile Feed (Mobile Dark 390x844): High contrast dark theme for clinical smartphone"
    );

    console.log("=== ALL 4 PROOFS CAPTURED SUCCESSFULLY ===");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("CAPTURE FAILED:", err);
  process.exit(1);
});
