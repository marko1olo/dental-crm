const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const API_BASE = "http://127.0.0.1:4100";
const WEB_BASE = "http://127.0.0.1:5173";
const PROOF_DIR = path.resolve(process.cwd(), "docs/proofs/photography");

if (!fs.existsSync(PROOF_DIR)) {
  fs.mkdirSync(PROOF_DIR, { recursive: true });
}

async function provisionClinicalSession() {
  const uniqueId = Date.now();
  console.log(`[Provisioning] Initializing test session photo-${uniqueId}@dente-clinic.ru...`);

  const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clinicName: "Клиника ДЕНТЕ (Эстетическая стоматология)",
      email: `photo-proof-${uniqueId}@dente-clinic.ru`,
      password: "Password123!",
      ownerName: "Д-р Смирнова Екатерина Васильевна",
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

  // Seed Real Patient
  const pRes = await fetch(`${API_BASE}/api/patients`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      fullName: "Морозова Елена Дмитриевна",
      birthDate: "1992-04-12",
      gender: "female",
      phone: "+7 (922) 555-11-22",
      allergies: "Без отягощенного аллергоанамнеза",
      chronicDiseases: "Здорова",
    }),
  });

  if (!pRes.ok) {
    throw new Error(`Patient create failed: ${await pRes.text()}`);
  }
  const pData = await pRes.json();
  const patientId = pData.patient?.id || pData.id;
  console.log(`[Provisioning] Created patient: ${patientId}`);

  return {
    clinicToken: initData.clinicToken,
    organizationId: initData.organizationId,
    staffToken: unlockData.staffToken,
    ownerUserId: initData.ownerUserId,
    patientId,
  };
}

async function run() {
  const auth = await provisionClinicalSession();

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--font-render-hinting=none"],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });

  await context.addInitScript(
    ({ ct, orgId, st, uid, pid }) => {
      localStorage.setItem("dente_clinic_token", ct);
      localStorage.setItem("dente_organization_id", orgId);
      localStorage.setItem("dente_staff_token", st);
      localStorage.setItem("dente_active_session_token", st);
      localStorage.setItem("dente_active_user_id", uid);
      localStorage.setItem("dente_user_id", uid);
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_user_role", "owner");
      localStorage.setItem("dente_active_mode", "clinic");
      sessionStorage.setItem("dente_unlocked", "true");
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_theme_mode", "light");

      localStorage.setItem(
        "dente-workspace-profile",
        JSON.stringify({
          mode: "network",
          role: "owner",
          activeRole: "owner",
        })
      );
      localStorage.setItem(
        "dente_staff_session",
        JSON.stringify({
          userId: uid,
          name: "Д-р Смирнова Е. В.",
          fullName: "Д-р Смирнова Екатерина Васильевна",
          role: "owner",
          specialties: ["Стоматолог-ортопед", "Стоматолог-терапевт"],
        })
      );
      localStorage.setItem(
        "dente_ui_preferences_v1",
        JSON.stringify({
          onboardingDismissed: true,
          onboardingStep: "done",
          onboardingDraftMode: false,
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
          onboardingDraftMode: false,
          version: 1,
        })
      );
      localStorage.setItem(
        "dental-crm:web-ui-preferences:v1",
        JSON.stringify({
          version: 1,
          uiLanguage: "ru",
          selectedWorkspaceRole: "owner",
          selectedSpecialty: "orthopedist",
          selectedPatientId: pid,
          onboardingDismissed: true,
          onboardingStep: "done",
          onboardingDraftMode: false,
          soundNotificationsMuted: false,
        })
      );
    },
    {
      ct: auth.clinicToken,
      orgId: auth.organizationId,
      st: auth.staffToken,
      uid: auth.ownerUserId,
      pid: auth.patientId,
    }
  );

  const page = await context.newPage();
  page.on("console", (msg) => {
    const text = msg.text();
    if (text.includes("error") || text.includes("Error") || text.includes("Modal") || text.includes("Photo")) {
      console.log(`[Browser Console ${msg.type()}] ${text}`);
    }
  });
  page.on("pageerror", (err) => console.log(`[Browser PageError] ${err.message}`));

  console.log(`[Browser] Navigating to ${WEB_BASE}/#patients...`);
  await page.goto(`${WEB_BASE}/#patients`, { waitUntil: "domcontentloaded", timeout: 35000 });
  console.log("[Browser] domcontentloaded ready!");

  await page.waitForSelector(".boot-state", { state: "detached", timeout: 35000 }).catch(() => {});
  await page.waitForSelector(".app-shell", { state: "visible", timeout: 35000 });
  console.log("[Browser] app-shell visible!");
  await page.waitForTimeout(2000);

  // 1. Click patient row to open PatientWorkspaceView
  console.log("[Browser] Searching for patient row...");
  await page.waitForSelector('.patient-row-chevron-btn, [data-testid^="patient-row-open-btn-"], article.patient-card-row', { timeout: 20000 });
  const rowBtn = page.locator('.patient-row-chevron-btn, [data-testid^="patient-row-open-btn-"]').first();
  console.log("[Browser] Clicking patient row to open PatientWorkspaceView...");
  await rowBtn.click();
  await page.waitForTimeout(1500);

  // 2. Open Clinical Photo Protocol Studio Modal via UI or direct event
  console.log("[Browser] Opening Clinical Photo Protocol Modal via UI...");
  const menuBtn = page.locator('[data-testid="btn-patient-docs-dms-menu"]');
  if (await menuBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    console.log("[Browser] Clicking Docs/DMS menu button...");
    await menuBtn.click();
    await page.waitForTimeout(400);

    const photoBtn = page.locator('[data-testid="patient-workspace-open-photo-protocol-btn"]');
    if (await photoBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      console.log("[Browser] Clicking Photo Protocol item in dropdown...");
      await photoBtn.click();
    } else {
      console.log("[Browser] Dropdown item not visible, dispatching dente-open-photo-protocol-modal...");
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent("dente-open-photo-protocol-modal"));
      });
    }
  } else {
    console.log("[Browser] Menu button not visible, dispatching dente-open-photo-protocol-modal...");
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent("dente-open-photo-protocol-modal"));
    });
  }

  // 3. Wait for real photo protocol modal DOM
  console.log("[Browser] Waiting for .photo-protocol-modal to be visible...");
  await page.waitForSelector(".photo-protocol-modal", { state: "visible", timeout: 20000 });
  await page.waitForTimeout(1500);

  async function applyTheme(isDark) {
    await page.evaluate((dark) => {
      const mode = dark ? "dark" : "light";
      localStorage.setItem("dente_theme_mode", mode);
      document.documentElement.setAttribute("data-theme", mode);
      document.body.setAttribute("data-theme", mode);
      document.documentElement.dataset.theme = mode;
      if (dark) {
        document.documentElement.classList.add("dark");
        document.documentElement.classList.remove("light");
        document.body.classList.add("dark");
        document.body.classList.remove("light");
        document.documentElement.style.colorScheme = "dark";
      } else {
        document.documentElement.classList.remove("dark");
        document.documentElement.classList.add("light");
        document.body.classList.remove("dark");
        document.body.classList.add("light");
        document.documentElement.style.colorScheme = "light";
      }
    }, isDark);
    await page.waitForTimeout(500);
  }

  const results = [];

  async function captureAndSave(filename, viewport, isDark) {
    await page.setViewportSize(viewport);
    await applyTheme(isDark);
    await page.waitForTimeout(800);

    // Verify modal is still visible
    const isModalVisible = await page.locator(".photo-protocol-modal").isVisible();
    if (!isModalVisible) {
      console.warn(`[WARN] .photo-protocol-modal was not visible before ${filename}, redispatching event...`);
      await page.evaluate(() => {
        window.dispatchEvent(new CustomEvent("dente-open-photo-protocol-modal"));
      });
      await page.waitForSelector(".photo-protocol-modal", { state: "visible", timeout: 10000 });
      await page.waitForTimeout(500);
    }

    const outPath = path.join(PROOF_DIR, filename);
    await page.screenshot({ path: outPath, fullPage: false });

    const stats = fs.statSync(outPath);
    const hash = crypto.createHash("md5").update(fs.readFileSync(outPath)).digest("hex");
    console.log(`[Proof] ${filename} saved: ${stats.size} bytes, MD5: ${hash}`);

    if (stats.size < 20480) {
      throw new Error(`Screenshot ${filename} is suspiciously small: ${stats.size} bytes (< 20KB)`);
    }

    results.push({
      file: filename,
      path: outPath,
      size: stats.size,
      md5: hash,
      theme: isDark ? "dark" : "light",
      viewport: `${viewport.width}x${viewport.height}`,
    });
  }

  // 1. PC Light (1440x900)
  console.log(">>> Capturing PC Light (1440x900)...");
  await captureAndSave("photo_protocol_pc_light.png", { width: 1440, height: 900 }, false);

  // 2. PC Dark (1440x900)
  console.log(">>> Capturing PC Dark (1440x900)...");
  await captureAndSave("photo_protocol_pc_dark.png", { width: 1440, height: 900 }, true);

  // 3. Mobile Light (390x844)
  console.log(">>> Capturing Mobile Light (390x844)...");
  await captureAndSave("photo_protocol_mobile_light.png", { width: 390, height: 844 }, false);

  // 4. Mobile Dark (390x844)
  console.log(">>> Capturing Mobile Dark (390x844)...");
  await captureAndSave("photo_protocol_mobile_dark.png", { width: 390, height: 844 }, true);

  await browser.close();

  console.log("\n==========================================");
  console.log("CLINICAL PHOTOGRAPHY RED TEAM PROOFS OK");
  console.log("==========================================");
  console.table(results);
}

run().catch((err) => {
  console.error("FATAL screenshot script error:", err);
  process.exit(1);
});
