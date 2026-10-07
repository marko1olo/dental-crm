const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

async function run() {
  const outDir = path.resolve(__dirname, "screenshots");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });

  const page = await context.newPage();

  console.log("Navigating to http://127.0.0.1:5173/?demo=true#leads ...");
  await page.goto("http://127.0.0.1:5173/?demo=true#leads", { waitUntil: "domcontentloaded", timeout: 25000 });

  // Wait for initial boot and splash screen disappearance
  console.log("Waiting for app mount and kanban loading...");
  await page.waitForFunction(() => {
    const text = document.body.innerText || "";
    return !text.includes("Загрузка системы") && !text.includes("Загрузка обращений") && text.includes("Воронка обращений");
  }, { timeout: 25000 });

  // Dismiss tour modal if visible
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll("button"));
    const dismiss = btns.find((b) => b.innerText.includes("Больше не показывать") || b.innerText.includes("Понятно, я сам") || b.innerText.includes("Пропустить"));
    if (dismiss) dismiss.click();
  });
  await page.keyboard.press("Escape");
  await page.waitForTimeout(1000);

  // 1. LEADS KANBAN LIGHT
  console.log("=== 1. Capturing Leads Kanban (Light) ===");
  await page.evaluate(() => {
    document.documentElement.setAttribute("data-theme", "light");
    document.documentElement.classList.remove("dark");
  });
  await page.waitForTimeout(500);
  const pathLeadsLight = path.join(outDir, "proof_leads_kanban_light.png");
  await page.screenshot({ path: pathLeadsLight });
  console.log("Saved Leads Light:", pathLeadsLight, fs.statSync(pathLeadsLight).size, "bytes");

  // 2. LEADS KANBAN DARK
  console.log("=== 2. Capturing Leads Kanban (Dark) ===");
  await page.evaluate(() => {
    document.documentElement.setAttribute("data-theme", "dark");
    document.documentElement.classList.add("dark");
  });
  await page.waitForTimeout(500);
  const pathLeadsDark = path.join(outDir, "proof_leads_kanban_dark.png");
  await page.screenshot({ path: pathLeadsDark });
  console.log("Saved Leads Dark:", pathLeadsDark, fs.statSync(pathLeadsDark).size, "bytes");

  // 3. EXPANDED COLUMN FOCUS MODAL
  console.log("=== 3. Capturing Expanded Focus Modal (Light) ===");
  await page.evaluate(() => {
    document.documentElement.setAttribute("data-theme", "light");
    document.documentElement.classList.remove("dark");
  });
  const expandBtn = page.locator(".leads-kanban-column-expand-btn").first();
  if (await expandBtn.count() > 0) {
    await expandBtn.click({ force: true });
    await page.waitForSelector('[data-testid="expanded-column-modal"]', { timeout: 8000 });
    await page.waitForTimeout(1000);
    const pathExpanded = path.join(outDir, "proof_expanded_focus_modal_light.png");
    await page.screenshot({ path: pathExpanded });
    console.log("Saved Expanded Modal:", pathExpanded, fs.statSync(pathExpanded).size, "bytes");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(600);
  }

  // 4. MARKETING DASHBOARD LIGHT
  console.log("=== 4. Capturing Marketing Dashboard (Light) ===");
  await page.evaluate(() => {
    document.documentElement.setAttribute("data-theme", "light");
    document.documentElement.classList.remove("dark");
    window.location.hash = "marketing";
  });
  await page.waitForTimeout(2000);
  // Ensure analytics tab is active if not already
  const analyticsTabBtn = page.locator('[data-testid="tab-nav-analytics"]');
  if (await analyticsTabBtn.count() > 0) {
    await analyticsTabBtn.click({ force: true });
    await page.waitForTimeout(1000);
  }
  const pathMktLight = path.join(outDir, "proof_marketing_dashboard_light.png");
  await page.screenshot({ path: pathMktLight });
  console.log("Saved Marketing Light:", pathMktLight, fs.statSync(pathMktLight).size, "bytes");

  // 5. MARKETING DASHBOARD DARK
  console.log("=== 5. Capturing Marketing Dashboard (Dark) ===");
  await page.evaluate(() => {
    document.documentElement.setAttribute("data-theme", "dark");
    document.documentElement.classList.add("dark");
  });
  await page.waitForTimeout(600);
  const pathMktDark = path.join(outDir, "proof_marketing_dashboard_dark.png");
  await page.screenshot({ path: pathMktDark });
  console.log("Saved Marketing Dark:", pathMktDark, fs.statSync(pathMktDark).size, "bytes");

  // 6. TELEPHONY INCOMING CALL DRAWER
  console.log("=== 6. Capturing Telephony Incoming Call Drawer (Light) ===");
  await page.evaluate(() => {
    document.documentElement.setAttribute("data-theme", "light");
    document.documentElement.classList.remove("dark");
  });
  await page.evaluate(() => {
    const store = window.__denteTelephonyStore;
    if (store) {
      store.setState({
        activeCall: {
          callId: "test-call-proof-final",
          phone: "+7 (916) 789-45-12",
          direction: "inbound",
          status: "connected",
          startedAt: new Date().toISOString(),
          callerName: "Смирнов Алексей Петрович",
          recordingUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
          durationSeconds: 94,
          isLeadCaptured: false,
          transcript: [
            { speaker: "patient", text: "Здравствуйте! Хочу записаться на консультацию по имплантации к хирургу Воронову.", startTimeSeconds: 0, endTimeSeconds: 6 },
            { speaker: "operator", text: "Добрый день, Алексей Петрович! Доктор принимает во вторник и четверг. Записать на 14:00?", startTimeSeconds: 7, endTimeSeconds: 14 }
          ]
        },
        isCallDrawerOpen: true,
      });
    }
  });
  await page.waitForTimeout(1500);
  const drawer = page.locator('[data-testid="telephony-patient-side-drawer"]');
  if (await drawer.count() > 0) {
    const pathDrawer = path.join(outDir, "proof_telephony_drawer_light.png");
    await page.screenshot({ path: pathDrawer });
    console.log("Saved Telephony Drawer:", pathDrawer, fs.statSync(pathDrawer).size, "bytes");
  } else {
    console.warn("Telephony drawer not found after store setState!");
  }

  await browser.close();
  console.log("ALL PROOF CAPTURES COMPLETED!");
}

run().catch((err) => {
  console.error("Capture failure:", err);
  process.exit(1);
});
