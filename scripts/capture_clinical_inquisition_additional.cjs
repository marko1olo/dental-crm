/**
 * scripts/capture_clinical_inquisition_additional.cjs
 * Captures live screenshots for:
 * 1. Odontogram / Зубная формула (#visit -> tab "Зубная формула и Дневник")
 * 2. SanPiN / Стерилизация (#scanner)
 * 3. Inventory / Склад (#inventory)
 * Across PC (1440x900) & Mobile (390x844) in Light & Dark modes.
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");

const API_BASE = "http://127.0.0.1:4100";
const WEB_BASE = "http://127.0.0.1:5173";
const OUT_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/inquisition_redteam_multitheme");

async function provisionSession() {
  const uniqueId = Date.now();
  console.log(`[Auth Provisioning] Initializing test clinic audit-${uniqueId}@dente-clinic.ru...`);

  const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clinicName: "Стоматология ДЕНТЕ Премиум",
      email: `audit-${uniqueId}@dente-clinic.ru`,
      password: "Password123!",
      ownerName: "Д-р Воронов Алексей Владимирович",
      ownerPin: "1234",
    }),
  });

  if (!initRes.ok) {
    throw new Error(`Clinic setup failed: ${await initRes.text()}`);
  }
  const initData = await initRes.json();

  const unlockRes = await fetch(`${API_BASE}/api/auth/staff/unlock`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-dente-clinic-token": initData.clinicToken,
    },
    body: JSON.stringify({ userId: initData.ownerUserId, pinCode: "1234" }),
  });

  if (!unlockRes.ok) {
    throw new Error(`Staff unlock failed: ${await unlockRes.text()}`);
  }
  const unlockData = await unlockRes.json();

  const headers = {
    "Content-Type": "application/json",
    "x-dente-clinic-token": initData.clinicToken,
    "x-dente-staff-token": unlockData.staffToken,
  };

  let patientId = null;
  let appointmentId = null;

  try {
    const pRes = await fetch(`${API_BASE}/api/patients`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        fullName: "Ковалёв Роман Станиславович",
        phone: "+7 (999) 888-77-66",
        birthDate: "1988-04-12",
        gender: "male",
        notes: "Лечение кариеса 36, пульпит 16",
      }),
    });
    if (pRes.ok) {
      const pData = await pRes.json();
      patientId = pData.patient?.id || pData.id || null;
      console.log(`[Provisioning] Seeded patient: ${patientId}`);

      const todayStr = new Date().toISOString().split("T")[0];
      const appRes = await fetch(`${API_BASE}/api/appointments`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          patientId,
          doctorId: initData.ownerUserId,
          chairId: "chair-1",
          startTime: `${todayStr}T10:00:00Z`,
          endTime: `${todayStr}T11:00:00Z`,
          status: "confirmed",
          notes: "Лечение глубокого кариеса 36 зуба",
        }),
      });
      if (appRes.ok) {
        const appData = await appRes.json();
        appointmentId = appData.appointment?.id || appData.id || null;
        console.log(`[Provisioning] Seeded appointment: ${appointmentId}`);
      }
    }
  } catch (err) {
    console.log("[Provisioning] Warning:", err.message);
  }

  return {
    clinicToken: initData.clinicToken,
    staffToken: unlockData.staffToken,
    ownerUserId: initData.ownerUserId,
    patientId,
    appointmentId,
  };
}

async function run() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const auth = await provisionSession();

  console.log("[Chrome] Launching Playwright browser...");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const viewsToCapture = [
    {
      id: "odontogram",
      route: "visit",
      label: "Зубная формула / Odontogram",
      prepare: async (page) => {
        // Ensure visit loaded
        await page.waitForTimeout(1000);
        await page.evaluate(() => {
          const tabs = Array.from(document.querySelectorAll("button, [role=\"tab\"]"));
          const formulaTab = tabs.find((t) => t.textContent && (t.textContent.includes("Зубная формула") || t.textContent.includes("Формула") || t.textContent.includes("формула")));
          if (formulaTab) formulaTab.click();
        });
        await page.waitForTimeout(1500);
      },
    },
    {
      id: "sanpin",
      route: "scanner",
      label: "СанПиН / Журналы стерилизации",
      prepare: async (page) => {
        await page.waitForTimeout(1000);
      },
    },
    {
      id: "inventory",
      route: "inventory",
      label: "Склад / Inventory",
      prepare: async (page) => {
        await page.waitForTimeout(1000);
      },
    },
  ];

  const themes = [
    { id: "light", isDark: false },
    { id: "dark", isDark: true },
  ];

  for (const vp of [{ name: "pc", isMobile: false }, { name: "mobile", isMobile: true }]) {
    console.log(`\n====================================================================`);
    console.log(`STARTING ADDITIONAL CAPTURE FOR VIEWPORT: ${vp.name.toUpperCase()}`);
    console.log(`====================================================================\n`);

    const context = await browser.newContext({
      viewport: vp.isMobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
      deviceScaleFactor: vp.isMobile ? 2 : 1,
      isMobile: vp.isMobile,
      hasTouch: vp.isMobile,
    });

    await context.addInitScript(
      ({ ct, st, uid, pid, aid }) => {
        localStorage.setItem("dente_clinic_token", ct);
        localStorage.setItem("dente_staff_token", st);
        localStorage.setItem("dente_active_role", "owner");
        localStorage.setItem("dente_theme_mode", "light");
        localStorage.setItem("dente_onboarding_completed", "true");
        localStorage.setItem("dente_workspace_perspective", "standard");
        localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ onboardingDismissed: true, onboardingStep: "done", version: 1 }));
        localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true, onboardingDismissed: true, onboardingStep: "done", version: 1 }));
        localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({ version: 1, uiLanguage: "ru", selectedWorkspaceRole: "owner", selectedPatientId: pid, onboardingDismissed: true, onboardingStep: "done" }));
        localStorage.setItem("dente-workspace-profile", JSON.stringify({ state: { clinicName: "Стоматология ДЕНТЕ Премиум", currentDoctor: { id: uid, fullName: "Д-р Воронов А. В.", role: "owner" }, flags: { disableTour: true } } }));
      },
      { ct: auth.clinicToken, st: auth.staffToken, uid: auth.ownerUserId, pid: auth.patientId, aid: auth.appointmentId }
    );

    const page = await context.newPage();

    // Initial load on schedule
    await page.goto(`${WEB_BASE}/#schedule`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForSelector(".boot-state", { state: "detached", timeout: 60000 }).catch(() => {});
    await page.waitForSelector(".app-shell", { state: "visible", timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1500);

    for (const view of viewsToCapture) {
      console.log(`>>> Capturing: ${view.label} (${vp.name}) <<<`);

      await page.evaluate((r) => { window.location.hash = r; }, view.route);
      await page.waitForTimeout(1500);

      if (view.prepare) {
        await view.prepare(page);
      }

      for (const th of themes) {
        await page.emulateMedia({ colorScheme: th.isDark ? "dark" : "light" });
        await page.evaluate(({ mode, dark }) => {
          localStorage.setItem("dente_theme_mode", mode);
          document.documentElement.setAttribute("data-theme", mode);
          document.documentElement.dataset.theme = mode;
          document.documentElement.classList.toggle("dark", dark);
          document.documentElement.classList.toggle("light", !dark);
          document.documentElement.style.colorScheme = dark ? "dark" : "light";
          if (window.__useThemeStore) {
            window.__useThemeStore.getState().setThemeMode(mode);
          }
        }, { mode: th.id, dark: th.isDark });
        await page.waitForTimeout(600);

        const filename = `${view.id}_${th.id}_${vp.name}.png`;
        const filePath = path.join(OUT_DIR, filename);

        await page.screenshot({ path: filePath, fullPage: false });

        const stats = fs.statSync(filePath);
        const md5 = crypto.createHash("md5").update(fs.readFileSync(filePath)).digest("hex");
        console.log(`[CAPTURED] ${filename} | Size: ${(stats.size / 1024).toFixed(2)} KB | MD5: ${md5}`);
      }
    }

    await context.close();
  }

  await browser.close();
  console.log("\n[SUCCESS] All additional clinical screens recaptured with seeded appointments!");
}

run().catch((err) => {
  console.error("[FATAL ERROR]:", err);
  process.exit(1);
});
