const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const targetDirs = [
  path.resolve("docs/screenshots/inquisition_live"),
  "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\7163d440-04b2-4e8d-af83-1c337dc30c09\\screenshots",
];

for (const dir of targetDirs) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const inqContent = fs.readFileSync(path.resolve("scripts/take_inquisition_live_screenshots.cjs"), "utf8");
const todayDate = new Date().toLocaleDateString("en-CA");
const match = inqContent.match(/const mockDashboard = (\{[\s\S]*?\n\};)/);
let mockDashboard = {};
if (match) {
  mockDashboard = eval("(" + match[1].replace(/;$/, "") + ")");
}

async function captureAll() {
  console.log("[Playwright] Launching Chrome executable...");
  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  await context.addInitScript(() => {
    localStorage.setItem("dente_clinic_token", "mock-clinic-token-12345");
    localStorage.setItem("dente_staff_token", "mock-staff-token-67890");
    localStorage.setItem("dente_active_user_id", "doc-1");
    localStorage.setItem("dente_active_role", "owner");
    localStorage.setItem("dente_active_mode", "clinic");
    sessionStorage.setItem("dente_unlocked", "true");
    localStorage.setItem("dente_theme_mode", "light");
    localStorage.setItem("dente_theme", "light");
    localStorage.setItem("theme", "light");
    localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({
      onboardingDismissed: true,
      onboardingStep: "done",
      onboardingDraftMode: false,
      version: 1,
    }));
    localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({
      dismissed: true,
      step: "done",
      completed: true,
      onboardingDismissed: true,
      onboardingStep: "done",
      onboardingDraftMode: false,
      version: 1,
    }));
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dente_tour_dismissed", "true");
    localStorage.setItem("dente:tour:v1", JSON.stringify({ completed: true, dismissed: true }));
  });

  const page = await context.newPage();

  await page.route("**/api/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/src/")) return route.continue();
    if (url.includes("/api/dashboard")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard) });
    }
    if (url.includes("/api/auth/user/me") || url.includes("/api/auth/session")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner", active: true, organizationId: "00000000-0000-0000-0000-000000000001" },
        }),
      });
    }
    if (url.includes("/api/auth/staff/unlock")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, token: "mock-staff-token", user: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner" } }),
      });
    }
    if (url.includes("/api/schedule")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard.appointments) });
    }
    if (url.includes("/api/patients")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard.patients) });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
  });

  async function getActiveDevPort() {
    for (const port of [5174, 5173, 5175, 5176]) {
      try {
        const res = await fetch(`http://127.0.0.1:${port}`);
        if (res.ok) return port;
      } catch (_) {}
    }
    return 5174;
  }

  const activePort = await getActiveDevPort();
  console.log(`Navigating to http://127.0.0.1:${activePort}/#visit...`);
  await page.goto(`http://127.0.0.1:${activePort}/#visit`, { waitUntil: "domcontentloaded", timeout: 30000 });

  console.log("Waiting for boot to finish...");
  await page.waitForSelector(".boot-state", { state: "detached", timeout: 30000 }).catch(() => {});
  await page.waitForSelector(".app-shell", { state: "visible", timeout: 30000 });
  for (let i = 0; i < 20; i++) {
    const isBoot = await page.evaluate(() => Boolean(document.querySelector(".boot-state"))).catch(() => true);
    if (!isBoot) break;
    await page.waitForTimeout(500);
  }

  // Remove potential tour overlays
  await page.evaluate(() => {
    document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone').forEach((el) => el.remove());
  });

  const testProtocolData = {
    procedureId: "proc-k021-caries-dentin",
    procedureName: "К02.1 Кариес дентина (глубокий кариес)",
    categoryKey: "therapy",
    categoryName: "Терапия",
    matchedIcd10: "K02.1",
    tooth: 16,
    toothNumber: 16,
    patch: {
      complaint: "Кратковременные ноющие боли в зубе 16 от термических (холодное, горячее) раздражителей, быстро проходящие после устранения причины.",
      anamnesis: "Зуб 16 ранее не лечен. Полость появилась несколько месяцев назад, боли усилились за последнюю неделю.",
      objectiveStatus: "Зуб 16: на окклюзионной поверхности глубокая кариозная полость, выполненная пигментированным размягченным дентином. Зондирование дна слабо болезненно. Перкуссия безболезненна.",
      treatmentPlan: "Анестезия инфильтрационная Sol. Ultracaini 4% 1.7 ml. Препарирование кариозной полости зуба 16, медикаментозная обработка 2% хлоргексидином. Наложение изолирующей прокладки, бондинг-система, пломбирование светоотверждаемым композитом. Шлифовка, полировка.",
      recommendations: "Соблюдение гигиены полости рта. Щадящая диета 2 часа. Контрольный осмотр через 6 месяцев.",
      diagnosis: "K02.1 Кариес дентина (глубокий кариес)",
    },
    toothState: "treatment",
    applied: false,
    alternatives: [
      { id: "alt-1", procedureName: "К02.0 Кариес эмали (стадия белого пятна)", matchedIcd10: "K02.0" },
      { id: "alt-2", procedureName: "К04.0 Острый пульпит", matchedIcd10: "K04.0" },
      { id: "alt-3", procedureName: "К02.2 Кариес цемента", matchedIcd10: "K02.2" },
    ],
    totalCatalogProtocols: 1142,
  };

  const sampleMessages = [
    {
      kind: "text",
      id: "msg-user-1",
      role: "user",
      text: "Глубокий кариес 16, заполни карту приёма",
      timestamp: Date.now() - 5000,
    },
    {
      kind: "text",
      id: "msg-assistant-1",
      role: "assistant",
      text: "На основе SSOT-каталога клинических протоколов (1 142 шаблона СтАР/Минздрав) подобран оптимальный протокол для зуба 16:",
      timestamp: Date.now() - 2000,
    },
    {
      kind: "tool",
      callId: "call-proto-1",
      name: "apply_clinical_protocol",
      status: "done",
      result: testProtocolData,
    },
  ];

  async function setAppTheme(theme) {
    console.log(`Setting theme: ${theme}`);
    await page.evaluate((th) => {
      localStorage.setItem("dente_theme_mode", th);
      localStorage.setItem("dente_theme", th);
      localStorage.setItem("theme", th);
      if (window.__useThemeStore) {
        window.__useThemeStore.getState().setThemeMode(th);
      }
      document.documentElement.setAttribute("data-theme", th);
      document.body.setAttribute("data-theme", th);
      const isDark = ["dark", "night", "ocean", "emerald", "cyber_xray"].includes(th);
      document.documentElement.classList.toggle("dark", isDark);
      document.documentElement.classList.toggle("light", !isDark);
      document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    }, theme);
    await page.waitForTimeout(500);
  }

  for (const theme of ["light", "dark"]) {
    await setAppTheme(theme);

    // 1. Скриншот Copilot Drawer с карточкой предложения протокола (1 142 протокола)
    console.log(`[1] Capturing Copilot Drawer (${theme})...`);
    await page.evaluate((msgs) => {
      if (window.__denteCopilot) {
        window.__denteCopilot.open();
        window.__denteCopilot.setMessages(msgs);
        window.__denteCopilot.setActiveTab("chat");
      }
    }, sampleMessages);

    await page.waitForSelector('[data-testid="copilot-clinical-protocol-card"]', { state: "visible", timeout: 10000 });
    await page.evaluate(() => {
      const card = document.querySelector('[data-testid="copilot-clinical-protocol-card"]');
      const btn = card ? card.querySelector('[data-testid="btn-apply-protocol-1click"]') : null;
      if (btn) {
        btn.scrollIntoView({ behavior: "instant", block: "nearest" });
      } else if (card) {
        card.scrollIntoView({ behavior: "instant", block: "end" });
      }
    });
    await page.waitForTimeout(800);

    for (const dir of targetDirs) {
      await page.screenshot({
        path: path.join(dir, `copilot_drawer_protocol_card_${theme}.png`),
        fullPage: false,
      });
    }

    // Закрываем Drawer
    await page.evaluate(() => {
      if (window.__denteCopilot) {
        window.__denteCopilot.close();
      }
    });
    await page.waitForTimeout(500);

    // 2. Скриншот Chairside Copilot HUD с бейджем протокола 1 142
    console.log(`[2] Capturing Chairside Copilot HUD (${theme})...`);
    await page.evaluate(() => {
      if (window.__denteCopilot) {
        window.__denteCopilot.openHud();
      }
    });

    await page.waitForSelector('[data-testid="chairside-copilot-hud"]', { state: "visible", timeout: 10000 });
    await page.evaluate(() => {
      const badge = document.querySelector('[data-testid="chairside-catalog-protocol-badge"]');
      if (badge) badge.scrollIntoView({ behavior: "instant", block: "center" });
    });
    await page.waitForTimeout(800);

    for (const dir of targetDirs) {
      await page.screenshot({
        path: path.join(dir, `chairside_hud_protocol_matched_${theme}.png`),
        fullPage: false,
      });
    }

    // Закрываем HUD
    await page.evaluate(() => {
      if (window.__denteCopilot) {
        window.__denteCopilot.closeHud();
      }
    });
    await page.waitForSelector('[data-testid="chairside-copilot-hud"]', { state: "detached", timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(500);

    // 3. Скриншот модалки каталога 1 142 клинических протоколов
    console.log(`[3] Capturing Clinical Protocols Catalog Modal (${theme})...`);
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("dente:open-protocols-catalog", {
          detail: {
            tooth: 16,
            query: "кариес дентина",
            category: "therapy",
          },
        })
      );
    });

    await page.waitForSelector('[data-testid="clinical-protocols-catalog-modal"]', { state: "visible", timeout: 10000 });
    await page.waitForTimeout(800);

    for (const dir of targetDirs) {
      await page.screenshot({
        path: path.join(dir, `clinical_protocols_catalog_1142_${theme}.png`),
        fullPage: false,
      });
    }

    // Закрываем модалку кликом на кнопку закрытия и ждём закрытия
    const closeBtn = await page.$('[data-testid="btn-close-protocols-catalog-modal"]');
    if (closeBtn) {
      await closeBtn.click();
    } else {
      await page.keyboard.press("Escape");
    }
    await page.waitForSelector('[data-testid="clinical-protocols-catalog-modal"]', { state: "detached", timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(500);
  }

  await browser.close();
  console.log("All screenshots successfully captured!");
}

captureAll().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
