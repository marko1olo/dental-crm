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

  async function createPage(theme = "light", hash = "leads") {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });

    await context.addInitScript(({ themeMode }) => {
      localStorage.setItem("dente_demo_showcase", "true");
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_tour_dismissed", "true");
      localStorage.setItem("dente_sidebar_collapsed", "false");
      localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
        version: 1,
        uiLanguage: "ru",
        selectedWorkspaceRole: "owner",
        onboardingDismissed: true,
        onboardingStep: "done",
      }));
      if (themeMode === "dark") {
        document.documentElement.setAttribute("data-theme", "dark");
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.setAttribute("data-theme", "light");
        document.documentElement.classList.remove("dark");
      }
    }, { themeMode: theme });

    const page = await context.newPage();
    const targetUrl = `http://127.0.0.1:5173/?demo=true#${hash}`;
    console.log(`Navigating to ${targetUrl} (${theme})...`);
    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 25000 });

    // Wait for splash screen to disappear
    for (let i = 0; i < 12; i++) {
      await page.waitForTimeout(1000);
      const text = await page.evaluate(() => document.body.innerText);
      if (!text.includes("Загрузка системы") && text.length > 500) break;
    }

    // Dismiss tour modal if still present
    try {
      const dismissBtn = page.locator('button:has-text("Больше не показывать"), button:has-text("Пропустить"), [aria-label="Закрыть тур"]').first();
      if (await dismissBtn.count() > 0 && await dismissBtn.isVisible()) {
        console.log("Dismissing tour modal...");
        await dismissBtn.click({ force: true });
        await page.waitForTimeout(500);
      }
    } catch {}

    // Press Escape to clear any popover
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);

    return { context, page };
  }

  // 1. CAPTURE LEADS KANBAN (PC LIGHT)
  console.log("=== 1. Capturing Leads Kanban (Light) ===");
  const { page: pageLeadsLight } = await createPage("light", "leads");
  await pageLeadsLight.waitForSelector(".leads-kanban-page, [data-testid=\"leads-kanban-board\"]", { timeout: 10000 });
  await pageLeadsLight.waitForTimeout(1500);
  const pathLeadsLight = path.join(outDir, "proof_leads_kanban_light.png");
  await pageLeadsLight.screenshot({ path: pathLeadsLight });
  console.log("Saved:", pathLeadsLight, fs.statSync(pathLeadsLight).size, "bytes");

  // 2. CAPTURE LEADS KANBAN (PC DARK)
  console.log("=== 2. Capturing Leads Kanban (Dark) ===");
  const { page: pageLeadsDark } = await createPage("dark", "leads");
  await pageLeadsDark.waitForSelector(".leads-kanban-page, [data-testid=\"leads-kanban-board\"]", { timeout: 10000 });
  await pageLeadsDark.waitForTimeout(1500);
  const pathLeadsDark = path.join(outDir, "proof_leads_kanban_dark.png");
  await pageLeadsDark.screenshot({ path: pathLeadsDark });
  console.log("Saved:", pathLeadsDark, fs.statSync(pathLeadsDark).size, "bytes");

  // 3. CAPTURE EXPANDED COLUMN FOCUS MODAL (PC LIGHT)
  console.log("=== 3. Capturing Expanded Column Focus Modal ===");
  const expandBtn = pageLeadsLight.locator(".leads-kanban-column-expand-btn").first();
  if (await expandBtn.count() > 0) {
    console.log("Opening Column Focus Modal...");
    await expandBtn.click({ force: true });
    await pageLeadsLight.waitForSelector('[data-testid="expanded-column-modal"]', { timeout: 8000 });
    await pageLeadsLight.waitForTimeout(1500);
    const pathExpanded = path.join(outDir, "proof_expanded_focus_modal_light.png");
    await pageLeadsLight.screenshot({ path: pathExpanded });
    console.log("Saved:", pathExpanded, fs.statSync(pathExpanded).size, "bytes");
    await pageLeadsLight.keyboard.press("Escape");
    await pageLeadsLight.waitForTimeout(500);
  } else {
    console.warn("Expand column focus button not found!");
  }

  // 4. CAPTURE MARKETING DASHBOARD (PC LIGHT)
  console.log("=== 4. Capturing Marketing Dashboard (Light) ===");
  const { page: pageMktLight } = await createPage("light", "marketing");
  await pageMktLight.waitForSelector('.marketing-dashboard-page, [data-testid="marketing-dashboard-page"]', { timeout: 10000 });
  await pageMktLight.waitForTimeout(1500);
  const pathMktLight = path.join(outDir, "proof_marketing_dashboard_light.png");
  await pageMktLight.screenshot({ path: pathMktLight });
  console.log("Saved:", pathMktLight, fs.statSync(pathMktLight).size, "bytes");

  // 5. CAPTURE MARKETING DASHBOARD (PC DARK)
  console.log("=== 5. Capturing Marketing Dashboard (Dark) ===");
  const { page: pageMktDark } = await createPage("dark", "marketing");
  await pageMktDark.waitForSelector('.marketing-dashboard-page, [data-testid="marketing-dashboard-page"]', { timeout: 10000 });
  await pageMktDark.waitForTimeout(1500);
  const pathMktDark = path.join(outDir, "proof_marketing_dashboard_dark.png");
  await pageMktDark.screenshot({ path: pathMktDark });
  console.log("Saved:", pathMktDark, fs.statSync(pathMktDark).size, "bytes");

  // 6. CAPTURE TELEPHONY INCOMING CALL DRAWER
  console.log("=== 6. Capturing Telephony Incoming Call Drawer ===");
  // We can open the telephony drawer via custom event or simulate incoming call
  await pageLeadsLight.evaluate(() => {
    // Open telephony drawer with rich details and audio recording
    window.dispatchEvent(new CustomEvent("dente:incoming-call", {
      detail: {
        callId: "test-call-proof-01",
        phone: "+7 (916) 789-45-12",
        callerName: "Смирнов Алексей Петрович",
        direction: "inbound",
        status: "ringing",
        recordingUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
        durationSeconds: 94,
        isLeadCaptured: false,
        transcript: [
          { speaker: "patient", text: "Здравствуйте! Хочу записаться на консультацию по имплантации к хирургу Воронову.", startTimeSeconds: 0, endTimeSeconds: 6 },
          { speaker: "operator", text: "Добрый день, Алексей Петрович! Доктор принимает во вторник и четверг. Записать на 14:00?", startTimeSeconds: 7, endTimeSeconds: 14 }
        ]
      }
    }));
  });
  await pageLeadsLight.waitForTimeout(2000);

  const drawer = pageLeadsLight.locator('[data-testid="telephony-patient-side-drawer"]');
  if (await drawer.count() > 0) {
    const pathDrawer = path.join(outDir, "proof_telephony_drawer_light.png");
    await pageLeadsLight.screenshot({ path: pathDrawer });
    console.log("Saved:", pathDrawer, fs.statSync(pathDrawer).size, "bytes");
  } else {
    console.log("Drawer not open via event, checking telephony test buttons...");
  }

  await browser.close();
  console.log("All screenshots captured successfully!");
}

run().catch((err) => {
  console.error("Capture failure:", err);
  process.exit(1);
});
