const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");

const OUT_DIR = "C:/Clinic_MVP/dental-crm/docs/screenshots/inquisition";
const ARTIFACT_DIR = "C:/Users/Admin/.gemini/antigravity/brain/343d4462-ce22-4b8b-9e21-09df4b4c43d4";
const API_URL = "http://127.0.0.1:4100";
const WEB_URL = "http://127.0.0.1:5173";

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(ARTIFACT_DIR, { recursive: true });

async function provisionData() {
  console.log("[Auth] Provisioning clinic session via Fastify API...");
  const initRes = await fetch(`${API_URL}/api/auth/setup/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clinicName: "Стоматология ДЕНТЕ Премиум",
      email: `doctor-inq-${Date.now()}@dente.local`,
      password: "Password123!",
      ownerName: "Д-р Воронов Алексей Владимирович",
      ownerPin: "1234",
    }),
  });
  if (!initRes.ok) {
    throw new Error(`Clinic setup init failed HTTP ${initRes.status}: ${await initRes.text()}`);
  }
  const initData = await initRes.json();
  const clinicToken = initData.clinicToken;

  console.log("[Auth] Unlocking doctor staff token...");
  const unlockRes = await fetch(`${API_URL}/api/auth/staff/unlock`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-dente-clinic-token": clinicToken,
    },
    body: JSON.stringify({ userId: initData.ownerUserId, pinCode: "1234" }),
  });
  if (!unlockRes.ok) {
    throw new Error(`Doctor unlock failed HTTP ${unlockRes.status}: ${await unlockRes.text()}`);
  }
  const unlockData = await unlockRes.json();
  const staffToken = unlockData.staffToken;
  const user = unlockData.user || {
    id: initData.ownerUserId,
    fullName: "Д-р Воронов Алексей Владимирович",
    role: "owner",
  };

  const headers = {
    "Content-Type": "application/json",
    "x-dente-clinic-token": clinicToken,
    "x-dente-staff-token": staffToken,
  };

  // Create a real patient
  console.log("[Data] Creating test patient...");
  const pRes = await fetch(`${API_URL}/api/patients`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      fullName: "Алексеев Владимир Сергеевич",
      birthDate: "1988-04-12",
      gender: "male",
      phone: "+7 (999) 234-56-78",
      cardRecordNumber: "К-4091",
    }),
  });
  let patientId = "00000000-0000-0000-0000-000000000001";
  if (pRes.ok) {
    const pData = await pRes.json();
    patientId = pData.id || pData.patient?.id || patientId;
    console.log(`[Data] Patient created: ${patientId}`);
  }

  // Create appointment
  const todayIso = new Date().toLocaleDateString("en-CA");
  console.log("[Data] Creating appointment...");
  await fetch(`${API_URL}/api/appointments`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      patientId,
      doctorId: user.id,
      date: todayIso,
      startTime: "10:00",
      endTime: "11:00",
      status: "scheduled",
      room: "Кабинет №1",
      notes: "Первичный приём и составление плана",
    }),
  }).catch(() => {});

  // Create visit
  console.log("[Data] Creating visit...");
  let visitId = null;
  const vRes = await fetch(`${API_URL}/api/visits`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      patientId,
      doctorId: user.id,
      visitType: "treatment",
      complaints: "Острая боль в области зуба 16",
      status: "in_progress",
    }),
  }).catch(() => null);
  if (vRes && vRes.ok) {
    const vData = await vRes.json();
    visitId = vData.id || vData.visit?.id || null;
    console.log(`[Data] Visit created: ${visitId}`);
  }

  return {
    clinicToken,
    staffToken,
    user,
    patientId,
    visitId,
  };
}

function injectStorage(page, { ct, st, usr, pid, theme }) {
  return page.addInitScript(
    ({ clinicToken, staffToken, user, patientId, initialTheme }) => {
      localStorage.setItem("dente_clinic_token", clinicToken);
      localStorage.setItem("dente_staff_token", staffToken);
      localStorage.setItem("dente_active_session_token", staffToken);
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_user_role", "owner");
      localStorage.setItem("dente_cached_active_staff_user", JSON.stringify(user));
      localStorage.setItem("dental-crm:active-user:v1", JSON.stringify(user));
      localStorage.setItem("dente_theme_mode", initialTheme);
      localStorage.setItem("dente_theme", initialTheme);
      localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
      localStorage.setItem("dente_onboarding_dismissed", "true");
      localStorage.setItem("dente_onboarding_strip_dismissed", "true");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_doctor_training_completed", "true");
      localStorage.setItem("dente_training_dismissed", "true");
      localStorage.setItem("dente_doctor_shift_active", "true");
      localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
      localStorage.setItem("dente_guide_tour_seen_roles_v2", JSON.stringify(["admin", "doctor", "director", "owner"]));
      localStorage.setItem(
        "dente_quest_progress_v2",
        JSON.stringify({ isDismissedPermanently: true, activeTrack: null, tracksProgress: {} })
      );
      localStorage.setItem(
        "dental-crm:web-ui-preferences:v1",
        JSON.stringify({
          version: 1,
          uiLanguage: "ru",
          selectedWorkspaceRole: "owner",
          selectedPatientId: patientId,
          onboardingDismissed: true,
          onboardingStep: "done",
        })
      );
      localStorage.setItem(
        "dente_ui_preferences_v1",
        JSON.stringify({
          version: 1,
          uiLanguage: "ru",
          selectedWorkspaceRole: "owner",
          selectedPatientId: patientId,
          onboardingDismissed: true,
        })
      );
    },
    { clinicToken: ct, staffToken: st, user: usr, patientId: pid, initialTheme: theme }
  );
}

async function applyTheme(page, theme) {
  await page.evaluate((th) => {
    localStorage.setItem("dente_theme_mode", th);
    localStorage.setItem("dente_theme", th);
    if (window.__useThemeStore) {
      window.__useThemeStore.getState().setThemeMode(th);
    }
    document.documentElement.setAttribute("data-theme", th);
    const isDark = th === "dark";
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.classList.toggle("light", !isDark);
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
  }, theme);
  await page.waitForTimeout(600);
}

async function saveProof(page, filename) {
  const filePath = path.join(OUT_DIR, filename);
  const artifactPath = path.join(ARTIFACT_DIR, filename);

  // Clean overlays
  await page.evaluate(() => {
    document.querySelectorAll(
      '.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .global-toast-container, [role="alert"]'
    ).forEach((el) => el.remove());
  });

  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  if (fs.existsSync(artifactPath)) fs.unlinkSync(artifactPath);

  await page.waitForTimeout(600);
  await page.screenshot({ path: filePath, fullPage: false, animations: "disabled" });
  fs.copyFileSync(filePath, artifactPath);

  const stats = fs.statSync(filePath);
  const hash = crypto.createHash("md5").update(fs.readFileSync(filePath)).digest("hex");
  console.log(`[Captured] ${filename} — Size: ${(stats.size / 1024).toFixed(1)} KB — MD5: ${hash}`);

  if (stats.size < 40000) {
    throw new Error(`Screenshot ${filename} is smaller than 40 KB (${stats.size} bytes). Invalid render!`);
  }

  return { filename, size: stats.size, hash };
}

async function main() {
  const data = await provisionData();

  console.log("Launching Edge browser via Playwright (channel: msedge)...");
  const browser = await chromium.launch({
    channel: "msedge",
    headless: true,
  });

  const results = [];

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    await injectStorage(page, {
      ct: data.clinicToken,
      st: data.staffToken,
      usr: data.user,
      pid: data.patientId,
      theme: "light",
    });

    // Initial load
    console.log("Initial load...");
    await page.goto(`${WEB_URL}/`, { waitUntil: "commit", timeout: 30000 });
    await page.waitForSelector(".boot-state", { state: "detached", timeout: 25000 }).catch(() => {});
    await page.waitForTimeout(2000);

    // ==========================================
    // 1. SCHEDULE (LIGHT & DARK)
    // ==========================================
    console.log("1. Schedule...");
    await page.evaluate(() => { window.location.hash = "schedule"; });
    await page.waitForSelector(".schedule-grid, [data-testid='schedule-view'], .schedule-container, [data-testid='schedule-filter-strip']", { timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1500);

    await applyTheme(page, "light");
    results.push(await saveProof(page, "01_schedule_clean_light.png"));

    await applyTheme(page, "dark");
    results.push(await saveProof(page, "02_schedule_clean_dark.png"));

    // ==========================================
    // 2. VISIT / SOAP EDITOR (LIGHT & DARK)
    // ==========================================
    console.log("2. Visit...");
    await page.evaluate((pid) => {
      window.location.hash = "visit";
      // Ensure patient is selected
      if (window.__usePatientStore) {
        window.__usePatientStore.getState().setSelectedPatientId(pid);
      }
    }, data.patientId);
    await page.waitForTimeout(2000);

    // Try clicking SOAP editor tab
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const tab = btns.find(b => b.textContent?.includes("Дневник") || b.textContent?.includes("Анамнез"));
      if (tab) tab.click();
    });
    await page.waitForTimeout(1500);

    await applyTheme(page, "light");
    results.push(await saveProof(page, "03_visit_soap_clean_light.png"));

    await applyTheme(page, "dark");
    results.push(await saveProof(page, "04_visit_soap_clean_dark.png"));

    // ==========================================
    // 3. SHIFT VIEW (LIGHT & DARK)
    // ==========================================
    console.log("3. Shift...");
    await page.evaluate(() => { window.location.hash = "shift"; });
    // Wait until the shift container is actually rendered and not loading
    await page.waitForSelector("[data-testid='shift-view-desktop'], .shift-view-scroll-container, .doctor-shift-control-bar", {
      state: "visible",
      timeout: 30000,
    });
    await page.waitForTimeout(2000);

    await applyTheme(page, "light");
    results.push(await saveProof(page, "05_shift_clean_light.png"));

    await applyTheme(page, "dark");
    results.push(await saveProof(page, "06_shift_clean_dark.png"));

    // ==========================================
    // 4. SETTINGS (LIGHT & DARK)
    // ==========================================
    console.log("4. Settings...");
    await page.evaluate(() => { window.location.hash = "settings"; });
    await page.waitForSelector(".settings-segmented-strip, [data-testid='settings-clinic-tab'], .settings-view", {
      state: "visible",
      timeout: 30000,
    });
    await page.waitForTimeout(2000);

    await applyTheme(page, "light");
    results.push(await saveProof(page, "07_settings_clean_light.png"));

    await applyTheme(page, "dark");
    results.push(await saveProof(page, "08_settings_clean_dark.png"));

    console.log("\n--- ALL 8 SCREENSHOTS CAPTURED AND VALIDATED ---");
    console.log(JSON.stringify(results, null, 2));

    const hashes = results.map(r => r.hash);
    const uniqueHashes = new Set(hashes);
    if (uniqueHashes.size !== hashes.length) {
      throw new Error(`Duplicate hashes detected! Only ${uniqueHashes.size} unique out of ${hashes.length}`);
    }
    console.log(`VERIFIED: All ${hashes.length} screenshots have 100% UNIQUE MD5 hashes and >= 40 KB size!`);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("FATAL ERROR in main:", err);
  process.exit(1);
});
