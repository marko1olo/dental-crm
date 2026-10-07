const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

async function provisionLiveSession() {
  const API_BASE = "http://127.0.0.1:4100";
  const uniqueId = Date.now();
  console.log("[Provisioning] Initializing live clinic session via /api/auth/setup/init...");

  const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clinicName: "Клиника ДЕНТЕ ЭМК Аудит",
      email: `doctor-emr-${uniqueId}@dente.local`,
      password: "Password123!",
      ownerName: "Д-р Смирнов Е. А.",
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
        fullName: "Иванова Марина Юрьевна",
        phone: "+7 (916) 234-56-78",
        birthDate: "1990-05-14",
        gender: "female",
        allergies: "Лидокаин, новокаин (отек Квинке)",
        notes: "Острая боль в области зуба 16, полость на жевательной поверхности",
      }),
    });

    if (pRes.ok) {
      const pData = await pRes.json();
      patientId = pData.patient?.id || pData.id || null;
      console.log(`[Provisioning] Seeded patient: ${patientId}`);

      const now = new Date();
      const startsAt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0);
      const endsAt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0);

      const aRes = await fetch(`${API_BASE}/api/appointments`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          patientId,
          doctorUserId: initData.ownerUserId,
          chairId: "chair-1",
          status: "in_treatment",
          startsAt: startsAt.toISOString(),
          endsAt: endsAt.toISOString(),
          reason: "Лечение кариеса зуба 16, анестезия Артикаин",
        }),
      });

      if (aRes.ok) {
        const aData = await aRes.json();
        appointmentId = aData.appointment?.id || aData.id || null;
        console.log(`[Provisioning] Seeded in_treatment appointment: ${appointmentId}`);
      }
    }
  } catch (errPat) {
    console.log("[Provisioning] Patient creation note:", errPat.message);
  }

  return {
    clinicToken: initData.clinicToken,
    staffToken: unlockData.staffToken,
    ownerUserId: initData.ownerUserId,
    patientId,
    appointmentId,
  };
}

async function runAudit() {
  const outDir = path.resolve(__dirname, "..", "docs", "screenshots", "audit_emr");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const auth = await provisionLiveSession();

  console.log("[Playwright] Launching Chrome executable...");
  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const capturedRegistry = [];

  async function setupPageAuthAndTheme(page, theme = "light") {
    await page.goto("http://127.0.0.1:5173/", { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.evaluate(
      ({ ct, st, uid, pid, th }) => {
        localStorage.setItem("dente_clinic_token", ct);
        localStorage.setItem("dente_staff_token", st);
        localStorage.setItem("dente_active_role", "owner");
        localStorage.setItem("dente_theme_mode", th);
        localStorage.setItem("dente_tour_completed", "true");
        localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
        localStorage.setItem("dente_guide_tour_seen_roles_v2", JSON.stringify(["admin", "doctor", "director"]));
        localStorage.setItem(
          "dente_quest_progress_v2",
          JSON.stringify({
            activeTrackId: "solo_doctor",
            currentStepIndex: 0,
            completedStepIds: [],
            isTourActive: false,
            isDismissedPermanently: true,
            tracksProgress: {
              solo_doctor: { completed: true, completedStepIds: [] },
              reception_admin: { completed: true, completedStepIds: [] },
              imaging_diagnostics: { completed: true, completedStepIds: [] },
            },
          })
        );
        localStorage.setItem(
          "dente_ui_preferences_v1",
          JSON.stringify({
            onboardingDismissed: true,
            onboardingStep: "done",
            version: 1,
          })
        );
        localStorage.setItem(
          "dental-crm:onboarding:v1",
          JSON.stringify({
            dismissed: true,
            step: "done",
            completed: true,
            onboardingDismissed: true,
            onboardingStep: "done",
            version: 1,
          })
        );
        localStorage.setItem(
          "dental-crm:web-ui-preferences:v1",
          JSON.stringify({
            version: 1,
            uiLanguage: "ru",
            selectedWorkspaceRole: "owner",
            selectedPatientId: pid,
            onboardingDismissed: true,
            onboardingStep: "done",
          })
        );
        localStorage.setItem(
          "dente-workspace-profile",
          JSON.stringify({
            state: {
              clinicName: "Клиника ДЕНТЕ ЭМК Аудит",
              currentDoctor: { id: uid, fullName: "Д-р Смирнов Е. А.", role: "owner" },
              flags: { disableTour: true },
            },
          })
        );
        document.documentElement.setAttribute("data-theme", th);
        if (th === "dark") {
          document.documentElement.classList.add("dark");
          document.documentElement.classList.remove("light");
        } else {
          document.documentElement.classList.remove("dark");
          document.documentElement.classList.add("light");
        }
      },
      {
        ct: auth.clinicToken,
        st: auth.staffToken,
        uid: auth.ownerUserId,
        pid: auth.patientId,
        th: theme,
      }
    );

    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => {
      const text = document.body.innerText || "";
      return !text.includes("Загрузка CRM") && (document.querySelector(".app-shell") || text.includes("ДЕНТЕ"));
    }, { timeout: 25000 });
    await page.waitForTimeout(1000);
  }

  async function applyTheme(page, theme) {
    await page.evaluate((th) => {
      document.documentElement.setAttribute("data-theme", th);
      if (th === "dark") {
        document.documentElement.classList.add("dark");
        document.documentElement.classList.remove("light");
      } else {
        document.documentElement.classList.remove("dark");
        document.documentElement.classList.add("light");
      }
      localStorage.setItem("dente_theme_mode", th);
      if (window.__useThemeStore) {
        window.__useThemeStore.getState().setThemeMode(th);
      }
    }, theme);
    await page.waitForTimeout(600);
  }

  async function takeProof(page, fileName, viewDesc) {
    const targetFile = path.join(outDir, fileName);
    // Dismiss any accidental tour overlays
    await page.evaluate(() => {
      document.querySelectorAll(
        '.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="guided-tour-invite-banner"]'
      ).forEach((el) => el.remove());
    }).catch(() => {});

    await page.waitForTimeout(600);
    try {
      await page.screenshot({ path: targetFile, fullPage: false, timeout: 15000, animations: "disabled" });
    } catch {
      await page.screenshot({ path: targetFile, fullPage: false, timeout: 15000 });
    }

    console.log(`[Captured] ${fileName} -> ${viewDesc}`);
    capturedRegistry.push({ fileName, viewDesc, targetFile });
  }

  // =========================================================================
  // 1. DESKTOP VIEWPORT (1440x900)
  // =========================================================================
  console.log("\n>>> DESKTOP SUITE (1440x900) <<<");
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
    isMobile: false,
    hasTouch: false,
  });
  const dPage = await desktopContext.newPage();
  await setupPageAuthAndTheme(dPage, "light");

  // Navigate to Visit view
  await dPage.evaluate(() => {
    window.location.hash = "visit";
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  });
  await dPage.waitForTimeout(1000);
  await dPage.waitForSelector("#visit, .visit-panel, [data-testid=\"visit-view\"]", { timeout: 20000 });
  await dPage.waitForTimeout(1200);

  // 1A. Visit EMK Desktop Light
  const emkTabBtn = await dPage.locator('[data-testid="visit-subtab-emk"], button.visit-subtab-btn:has-text("Дневник приёма")').first();
  if (await emkTabBtn.isVisible()) {
    await emkTabBtn.click({ force: true }).catch(() => {});
    await dPage.waitForTimeout(800);
  }
  await applyTheme(dPage, "light");
  await takeProof(dPage, "01_emr_desktop_light.png", "EMR Form 043/y Desktop Light");

  // 1B. Visit EMK Desktop Dark
  await applyTheme(dPage, "dark");
  await takeProof(dPage, "02_emr_desktop_dark.png", "EMR Form 043/y Desktop Dark");

  // 1C. Visit Odontogram Tab Desktop Light
  await applyTheme(dPage, "light");
  const odontoTabBtn = await dPage.locator('[data-testid="visit-subtab-odontogram"], button.visit-subtab-btn:has-text("Зубная формула")').first();
  if (await odontoTabBtn.isVisible()) {
    await odontoTabBtn.click({ force: true }).catch(() => {});
    await dPage.waitForTimeout(1200);
  }
  await takeProof(dPage, "03_odontogram_desktop_light.png", "Odontogram FDI in Visit Desktop Light");

  // 1D. Visit Odontogram Tab Desktop Dark
  await applyTheme(dPage, "dark");
  await takeProof(dPage, "04_odontogram_desktop_dark.png", "Odontogram FDI in Visit Desktop Dark");

  // 1E. Treatment Plans Desktop Light (Perspective: presentation)
  await applyTheme(dPage, "light");
  await dPage.evaluate(() => {
    window.location.hash = "visit";
    if (window.__usePerspectiveStore) {
      window.__usePerspectiveStore.getState().setPerspective("presentation");
    }
    localStorage.setItem("dente_workspace_perspective", "presentation");
    window.dispatchEvent(new CustomEvent("dente:set-perspective", { detail: { perspective: "presentation" } }));
  });
  await dPage.waitForTimeout(1500);
  await takeProof(dPage, "05_treatment_plan_desktop_light.png", "Treatment Plans 3-Tier Desktop Light");

  // 1F. Treatment Plans Desktop Dark
  await applyTheme(dPage, "dark");
  await takeProof(dPage, "06_treatment_plan_desktop_dark.png", "Treatment Plans 3-Tier Desktop Dark");

  await desktopContext.close();

  // =========================================================================
  // 2. MOBILE VIEWPORT (390x844)
  // =========================================================================
  console.log("\n>>> MOBILE SUITE (390x844) <<<");
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const mPage = await mobileContext.newPage();
  await setupPageAuthAndTheme(mPage, "light");

  // Navigate to Visit view
  await mPage.evaluate(() => {
    window.location.hash = "visit";
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  });
  await mPage.waitForTimeout(1200);
  await mPage.waitForSelector(".mobile-chairside-container, [data-testid=\"mobile-chairside-visit-workspace\"]", { timeout: 20000 });

  // 2A. Visit Workspace Mobile Light
  await applyTheme(mPage, "light");
  await takeProof(mPage, "07_emr_mobile_light.png", "Mobile Chairside EMR Workspace Light");

  // 2B. Visit Workspace Mobile Dark
  await applyTheme(mPage, "dark");
  await takeProof(mPage, "08_emr_mobile_dark.png", "Mobile Chairside EMR Workspace Dark");

  // 2C. Mobile Odontogram Step 2 (Exam & Quadrants) Light
  await applyTheme(mPage, "light");
  const step2Btn = await mPage.locator('[data-testid="mobile-chairside-workspace-step-exam"], button:has-text("2. Осмотр"), button:has-text("Осмотр")').first();
  if (await step2Btn.isVisible()) {
    await step2Btn.click({ force: true }).catch(() => {});
    await mPage.waitForTimeout(1000);
  }
  await takeProof(mPage, "09_odontogram_mobile_light.png", "Mobile Odontogram Quadrants Step Light");

  // 2D. Mobile Odontogram Step 2 Dark
  await applyTheme(mPage, "dark");
  await takeProof(mPage, "10_odontogram_mobile_dark.png", "Mobile Odontogram Quadrants Step Dark");

  await mobileContext.close();
  await browser.close();

  console.log(`\n[Audit Complete] ${capturedRegistry.length} screenshots saved to ${outDir}`);
}

runAudit().catch((err) => {
  console.error("[Audit Error]", err);
  process.exit(1);
});
