const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");

async function provisionLiveSession() {
  const API_BASE = "http://127.0.0.1:4100";
  const uniqueId = Date.now();
  console.log("[Provisioning] Setting up authenticated clinic session on live API...");

  const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clinicName: "Стоматология ДЕНТЕ Премиум",
      email: `chief-${uniqueId}@dente-clinic.ru`,
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

  try {
    const pRes = await fetch(`${API_BASE}/api/patients`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        fullName: "Ковалёв Роман Станиславович",
        phone: "+7 (999) 888-77-66",
        birthDate: "1988-04-12",
        gender: "male",
        notes: "Бронхиальная астма, аллергия на латекс",
      }),
    });
    if (pRes.ok) {
      const pData = await pRes.json();
      patientId = pData.patient?.id || pData.id || null;
      console.log(`[Provisioning] Seeded patient: ${patientId}`);

      try {
        const todayStr = new Date().toISOString().split("T")[0];
        await fetch(`${API_BASE}/api/appointments`, {
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
        console.log("[Provisioning] Seeded today appointment");
      } catch (errAppt) {
        console.log("[Provisioning] Appointment note:", errAppt.message);
      }
    }
  } catch (errPat) {
    console.log("[Provisioning] Patient note:", errPat.message);
  }

  return {
    clinicToken: initData.clinicToken,
    staffToken: unlockData.staffToken,
    ownerUserId: initData.ownerUserId,
    patientId,
  };
}

async function runAudit() {
  const outDir = path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/visit_toolbar_proof");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const brainDir = path.resolve(
    "C:/Users/Admin/.gemini/antigravity/brain/6d815c86-c779-4f38-bbd1-0f0abe81c076"
  );
  if (!fs.existsSync(brainDir)) {
    fs.mkdirSync(brainDir, { recursive: true });
  }

  const auth = await provisionLiveSession();

  console.log("[Playwright] Launching Chrome executable...");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const capturedRegistry = [];

  async function configurePage(page, theme) {
    await page.waitForLoadState("domcontentloaded");
    await page.evaluate(
      ({ ct, st, uid, pid, th }) => {
        localStorage.setItem("dente_clinic_token", ct);
        localStorage.setItem("dente_staff_token", st);
        localStorage.setItem("dente_active_role", "owner");
        localStorage.setItem("dente_theme_mode", th);
        localStorage.setItem("dente_onboarding_completed", "true");
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
              clinicName: "Стоматология ДЕНТЕ Премиум",
              currentDoctor: { id: uid, fullName: "Д-р Воронов А. В.", role: "owner" },
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
        if (window.__useThemeStore) {
          window.__useThemeStore.getState().setThemeMode(th);
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
  }

  const addAuthInitScript = (ctx) =>
    ctx.addInitScript(
      ({ ct, st, uid, pid }) => {
        localStorage.setItem("dente_clinic_token", ct);
        localStorage.setItem("dente_staff_token", st);
        localStorage.setItem("dente_active_role", "owner");
        localStorage.setItem("dente_theme_mode", "light");
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
              clinicName: "Стоматология ДЕНТЕ Премиум",
              currentDoctor: { id: uid, fullName: "Д-р Воронов А. В.", role: "owner" },
              flags: { disableTour: true },
            },
          })
        );
      },
      {
        ct: auth.clinicToken,
        st: auth.staffToken,
        uid: auth.ownerUserId,
        pid: auth.patientId,
      }
    );

  async function takeProof(page, fileName, viewName, modeName) {
    const targetFile = path.join(outDir, fileName);
    const brainFile = path.join(brainDir, fileName);

    await page.waitForSelector(".boot-state", { state: "detached", timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1000);
    await page.screenshot({ path: targetFile, fullPage: false });

    fs.copyFileSync(targetFile, brainFile);

    const stats = fs.statSync(targetFile);
    const hash = crypto.createHash("md5").update(fs.readFileSync(targetFile)).digest("hex");

    capturedRegistry.push({
      fileName,
      view: viewName,
      mode: modeName,
      sizeBytes: stats.size,
      sizeKb: (stats.size / 1024).toFixed(1),
      md5: hash,
      path: targetFile,
      passSize: stats.size >= 40960,
    });

    console.log(
      `[Captured] ${fileName} (${viewName} ${modeName}): ${stats.size} bytes (${(stats.size / 1024).toFixed(1)} KB), MD5: ${hash}`
    );
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
  await addAuthInitScript(desktopContext);
  const dPage = await desktopContext.newPage();

  // 1A. Visit EMK Desktop Light
  await dPage.goto("http://127.0.0.1:5173/#visit", { waitUntil: "domcontentloaded", timeout: 60000 });
  await dPage.waitForSelector(".boot-state", { state: "detached", timeout: 60000 });
  await dPage.waitForSelector(".app-shell", { state: "visible", timeout: 30000 });
  await configurePage(dPage, "light");
  await dPage.waitForTimeout(1500);

  // Click EMK Tab in VisitMainTabs to ensure VisitEmkTab is visible
  const emkTabBtn = await dPage.locator('button[role="tab"]:has-text("043/у"), button[role="tab"]:has-text("ЭМК")').first();
  if (await emkTabBtn.isVisible()) {
    await emkTabBtn.click();
    console.log("[Visit] Clicked EMK 043/у tab");
  }
  await dPage.waitForSelector('[data-testid="emk-tier1-quick-soap-bar"]', { timeout: 10000 }).catch(() => {});
  await dPage.waitForTimeout(1000);
  await takeProof(dPage, "proof_01_visit_toolbar_desktop_light.png", "Visit Toolbar", "Desktop Light");

  // 1B. Visit Protocols Dropdown Open Desktop Light
  const menuBtnLight = dPage.locator('[data-testid="btn-toggle-extra-soap-menu"]').first();
  if (await menuBtnLight.isVisible()) {
    await menuBtnLight.click();
    await dPage.waitForTimeout(600);
    await takeProof(dPage, "proof_03_visit_protocols_menu_open_light.png", "Visit Protocols Menu Open", "Desktop Light");
    // Close menu by clicking again
    await menuBtnLight.click();
    await dPage.waitForTimeout(400);
  }

  // 1C. Visit EMK Desktop Dark
  await configurePage(dPage, "dark");
  await dPage.waitForTimeout(1000);
  await takeProof(dPage, "proof_02_visit_toolbar_desktop_dark.png", "Visit Toolbar", "Desktop Dark");

  // 1D. Visit Protocols Dropdown Open Desktop Dark
  const menuBtnDark = dPage.locator('[data-testid="btn-toggle-extra-soap-menu"]').first();
  if (await menuBtnDark.isVisible()) {
    await menuBtnDark.click();
    await dPage.waitForTimeout(600);
    await takeProof(dPage, "proof_04_visit_protocols_menu_open_dark.png", "Visit Protocols Menu Open", "Desktop Dark");
    await menuBtnDark.click();
    await dPage.waitForTimeout(400);
  }

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
  await addAuthInitScript(mobileContext);
  const mPage = await mobileContext.newPage();

  // 2A. Visit EMK Mobile Light
  await mPage.goto("http://127.0.0.1:5173/#visit", { waitUntil: "domcontentloaded", timeout: 60000 });
  await mPage.waitForSelector(".boot-state", { state: "detached", timeout: 60000 });
  await mPage.waitForSelector(".app-shell", { state: "visible", timeout: 30000 });
  await configurePage(mPage, "light");
  await mPage.waitForTimeout(1500);

  const mEmkTabBtn = await mPage.locator('button[role="tab"]:has-text("043/у"), button[role="tab"]:has-text("ЭМК")').first();
  if (await mEmkTabBtn.isVisible()) {
    await mEmkTabBtn.click();
    console.log("[Visit Mobile] Clicked EMK tab");
  }
  await mPage.waitForSelector('[data-testid="emk-tier1-quick-soap-bar"]', { timeout: 10000 }).catch(() => {});
  await mPage.waitForTimeout(1000);
  await takeProof(mPage, "proof_05_visit_toolbar_mobile_light.png", "Visit Toolbar", "Mobile Light");

  // 2B. Visit EMK Mobile Dark
  await configurePage(mPage, "dark");
  await mPage.waitForTimeout(1000);
  await takeProof(mPage, "proof_06_visit_toolbar_mobile_dark.png", "Visit Toolbar", "Mobile Dark");

  await mobileContext.close();
  await browser.close();

  console.log("\n==================================================");
  console.log("VISIT TOOLBAR RED TEAM PROOF SUMMARY");
  console.log("==================================================");
  console.table(capturedRegistry);
}

runAudit().catch((err) => {
  console.error("Audit capture error:", err);
  process.exit(1);
});
