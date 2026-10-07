/**
 * capture_marketing_telephony_proof.cjs
 *
 * Captures live visual proof on http://127.0.0.1:5173:
 * 1. Leads Kanban View (PC Light 1440x900)
 * 2. Leads Kanban View (PC Dark 1440x900)
 * 3. Expanded Column Focus Modal (PC Light 1440x900)
 * 4. Marketing Dashboard View (PC Light 1440x900)
 * 5. Marketing Dashboard View (PC Dark 1440x900)
 * 6. Telephony Incoming Call Drawer & Audio Player (PC Light 1440x900)
 */

const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

async function main() {
  const outDir = path.resolve(__dirname, "screenshots");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  console.log("1. Initializing clinic session from Fastify API...");
  const headers = { "Content-Type": "application/json" };
  const initRes = await fetch("http://127.0.0.1:4100/api/clinic/initialize", {
    method: "POST",
    headers,
    body: JSON.stringify({
      clinicName: "Стоматология ДЕНТЕ Маркетинг",
      ownerFullName: "Д-р Воронов А. В.",
      ownerEmail: "doctor-mkt@dente.ru",
      ownerPin: "1234",
    }),
  });
  const initData = await initRes.json();
  console.log("Clinic init status:", initRes.status);

  const unlockRes = await fetch("http://127.0.0.1:4100/api/auth/staff-unlock", {
    method: "POST",
    headers,
    body: JSON.stringify({
      clinicToken: initData.clinicToken,
      pin: "1234",
    }),
  });
  const unlockData = await unlockRes.json();
  console.log("Staff unlock status:", unlockRes.status);

  const authHeaders = {
    "Content-Type": "application/json",
    "x-clinic-token": initData.clinicToken,
    "Authorization": `Bearer ${unlockData.staffToken}`,
  };

  // Seed sample leads for rich kanban display
  try {
    console.log("Seeding sample leads...");
    const sampleLeads = [
      {
        name: "Екатерина Соколова",
        phone: "+7 (916) 345-67-89",
        source: "Яндекс.Директ (Имплантация)",
        notes: "Интересует имплантация Nobel Biocare жевательной группы, острая боль",
        status: "new",
        expectedRevenue: 145000,
      },
      {
        name: "Михаил Кузнецов",
        phone: "+7 (925) 789-01-23",
        source: "2ГИС Карты",
        notes: "Профгигиена AirFlow + консультация терапевта по кариесу 26",
        status: "contacted",
        expectedRevenue: 12500,
      },
      {
        name: "Анна Смирнова",
        phone: "+7 (903) 111-22-33",
        source: "ПроДокторов",
        notes: "Лечение пульпита 36 под микроскопом, запись к эндодонтисту",
        status: "consult_booked",
        expectedRevenue: 38000,
      },
    ];

    for (const lead of sampleLeads) {
      await fetch("http://127.0.0.1:4100/api/leads", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(lead),
      });
    }
  } catch (err) {
    console.warn("Leads seeding warning:", err.message);
  }

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  // Helper context setup
  async function createConfiguredContext(theme = "light") {
    const ctx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });

    await ctx.addInitScript(({ ct, st, themeMode }) => {
      localStorage.setItem("dente_clinic_token", ct);
      localStorage.setItem("dente_staff_token", st);
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_theme_mode", themeMode);
      localStorage.setItem("dente_onboarding_completed", "true");
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
    }, {
      ct: initData.clinicToken,
      st: unlockData.staffToken,
      themeMode: theme,
    });

    return ctx;
  }

  // 1. CAPTURE LEADS KANBAN (PC LIGHT)
  console.log("Capturing Leads Kanban (Light)...");
  const ctxLight = await createConfiguredContext("light");
  const pageLight = await ctxLight.newPage();
  await pageLight.goto("http://127.0.0.1:5173/#leads", { waitUntil: "networkidle", timeout: 25000 });
  await pageLight.waitForTimeout(2000);

  const leadsLightPath = path.join(outDir, "proof_leads_kanban_light.png");
  await pageLight.screenshot({ path: leadsLightPath, fullPage: false });
  console.log("Saved:", leadsLightPath, fs.statSync(leadsLightPath).size, "bytes");

  // 2. CAPTURE LEADS KANBAN (PC DARK)
  console.log("Capturing Leads Kanban (Dark)...");
  const ctxDark = await createConfiguredContext("dark");
  const pageDark = await ctxDark.newPage();
  await pageDark.goto("http://127.0.0.1:5173/#leads", { waitUntil: "networkidle", timeout: 25000 });
  await pageDark.waitForTimeout(2000);

  const leadsDarkPath = path.join(outDir, "proof_leads_kanban_dark.png");
  await pageDark.screenshot({ path: leadsDarkPath, fullPage: false });
  console.log("Saved:", leadsDarkPath, fs.statSync(leadsDarkPath).size, "bytes");

  // 3. CAPTURE EXPANDED COLUMN FOCUS MODAL (PC LIGHT)
  console.log("Capturing Expanded Column Focus Modal...");
  // Click first column expand focus button
  const expandBtn = pageLight.locator(".leads-kanban-column-expand-btn").first();
  if (await expandBtn.count() > 0) {
    await expandBtn.click();
    await pageLight.waitForSelector('[data-testid="expanded-column-modal"]', { timeout: 5000 });
    await pageLight.waitForTimeout(1000);
    const expandedPath = path.join(outDir, "proof_expanded_focus_modal_light.png");
    await pageLight.screenshot({ path: expandedPath, fullPage: false });
    console.log("Saved:", expandedPath, fs.statSync(expandedPath).size, "bytes");
    // Close modal
    await pageLight.keyboard.press("Escape");
    await pageLight.waitForTimeout(500);
  }

  // 4. CAPTURE MARKETING DASHBOARD (PC LIGHT)
  console.log("Capturing Marketing Dashboard (Light)...");
  await pageLight.goto("http://127.0.0.1:5173/#marketing", { waitUntil: "networkidle", timeout: 25000 });
  await pageLight.waitForTimeout(2000);

  const mktLightPath = path.join(outDir, "proof_marketing_dashboard_light.png");
  await pageLight.screenshot({ path: mktLightPath, fullPage: false });
  console.log("Saved:", mktLightPath, fs.statSync(mktLightPath).size, "bytes");

  // 5. CAPTURE MARKETING DASHBOARD (PC DARK)
  console.log("Capturing Marketing Dashboard (Dark)...");
  await pageDark.goto("http://127.0.0.1:5173/#marketing", { waitUntil: "networkidle", timeout: 25000 });
  await pageDark.waitForTimeout(2000);

  const mktDarkPath = path.join(outDir, "proof_marketing_dashboard_dark.png");
  await pageDark.screenshot({ path: mktDarkPath, fullPage: false });
  console.log("Saved:", mktDarkPath, fs.statSync(mktDarkPath).size, "bytes");

  // 6. CAPTURE TELEPHONY INCOMING CALL DRAWER
  console.log("Triggering Incoming Call Drawer in Telephony...");
  // Simulate telephony test event or open drawer via store
  await pageLight.evaluate(() => {
    // Dispatch simulated incoming call to telephony store if available
    const win = window;
    if (win.__DENTE_TEST_TRIGGER_CALL) {
      win.__DENTE_TEST_TRIGGER_CALL();
    } else {
      // Simulate synthetic call payload
      window.dispatchEvent(new CustomEvent("dente:incoming-call", {
        detail: {
          callId: "test-call-123",
          phone: "+7 (999) 888-77-66",
          callerName: "Смирнов Алексей Петрович",
          direction: "inbound",
          status: "ringing",
          recordingUrl: "https://www.w3schools.com/html/horse.mp3",
          durationSeconds: 42,
          isLeadCaptured: false,
          transcript: [
            { speaker: "patient", text: "Здравствуйте, хочу записаться на имплантацию к доктору Воронову", startTimeSeconds: 0, endTimeSeconds: 5 },
            { speaker: "operator", text: "Добрый день! С удовольствием подберу удобное время", startTimeSeconds: 6, endTimeSeconds: 12 },
          ]
        }
      }));
    }
  });
  await pageLight.waitForTimeout(1000);

  // If drawer is opened, capture it
  const drawer = pageLight.locator('[data-testid="telephony-patient-side-drawer"]');
  if (await drawer.count() > 0) {
    const telPath = path.join(outDir, "proof_telephony_drawer_light.png");
    await pageLight.screenshot({ path: telPath, fullPage: false });
    console.log("Saved:", telPath, fs.statSync(telPath).size, "bytes");
  } else {
    console.log("Drawer not open via event, checking if telephony drawer button or quick component exists");
  }

  await browser.close();
  console.log("Screenshot proof collection finished successfully!");
}

main().catch((err) => {
  console.error("Capture script error:", err);
  process.exit(1);
});
