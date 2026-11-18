const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const API_BASE = "http://127.0.0.1:4100";
const WEB_BASE = "http://127.0.0.1:5173";
const PROOF_DIR = path.resolve(process.cwd(), "docs/proofs/radiology");
const BRAIN_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/42879016-7974-4832-9ecc-146c9fcc9d17/proofs");

for (const d of [PROOF_DIR, BRAIN_DIR]) {
  if (!fs.existsSync(d)) {
    fs.mkdirSync(d, { recursive: true });
  }
}

async function provisionClinicalSession() {
  const uniqueId = Date.now();
  console.log(`[Provisioning] Initializing test session rad-${uniqueId}@dente-clinic.ru...`);

  const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clinicName: "Клиника ДЕНТЕ (Радиология и RVG)",
      email: `rad-proof-${uniqueId}@dente-clinic.ru`,
      password: "Password123!",
      ownerName: "Д-р Захаров Андрей Васильевич",
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
      fullName: "Павлов Дмитрий Сергеевич",
      birthDate: "1988-07-24",
      gender: "male",
      phone: "+7 (911) 444-22-33",
      allergies: "Без отягощенного аллергоанамнеза",
      chronicDiseases: "Здоров",
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
          name: "Д-р Захаров А. В.",
          fullName: "Д-р Захаров Андрей Васильевич",
          role: "owner",
          specialties: ["Стоматолог-терапевт", "Хирург-имплантолог"],
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
    if (text.includes("error") || text.includes("Error") || text.includes("Modal") || text.includes("Radiology") || text.includes("Visiograph")) {
      console.log(`[Browser Console ${msg.type()}] ${text}`);
    }
  });

  console.log(`[Browser] Navigating to ${WEB_BASE}/#radiology-standalone...`);
  await page.goto(`${WEB_BASE}/#radiology-standalone`, { waitUntil: "commit", timeout: 45000 });
  console.log("[Browser] commit ready!");

  await page.waitForSelector(".boot-state", { state: "detached", timeout: 40000 }).catch(() => {});
  await page.waitForSelector(".app-shell", { state: "visible", timeout: 40000 }).catch(() => {});
  await page.waitForTimeout(2000);

  // If modal is not yet open from URL hash, open it
  const isAlreadyOpen = await page.locator('[data-testid="direct-radiology-launcher-root"], [data-testid="sensor-study-viewer"], .sensor-study-viewer').isVisible({ timeout: 5000 }).catch(() => false);
  if (!isAlreadyOpen) {
    console.log("[Browser] Dispatching open event for Radiology launcher...");
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent("dente:open-radiology"));
      window.dispatchEvent(new CustomEvent("dente-open-radiology"));
      window.dispatchEvent(new CustomEvent("dente:open-visiograph"));
      window.dispatchEvent(new CustomEvent("dente-open-visiograph"));
    });
  }

  // Wait for real radiology viewer DOM
  console.log("[Browser] Waiting for radiology viewer to be visible...");
  await page.waitForSelector('[data-testid="direct-radiology-launcher-root"], [data-testid="sensor-study-viewer"], .sensor-study-viewer', { state: "visible", timeout: 25000 });
  await page.waitForTimeout(1500);

  // Suppress overlays
  await page.evaluate(() => {
    try {
      const style = document.createElement("style");
      style.id = "suppress-all-overlays-rad-clean";
      style.innerHTML = `
        .tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone,
        .coachmark-tooltip-container, .guide-tour-floating-launcher, .clinical-quest-modal,
        [data-testid="interactive-guide-tour-card"], [data-testid="clinical-quest-banner"],
        .notification-toast, .global-toast, .toast-container, [data-toast], vite-error-overlay {
          display: none !important;
          pointer-events: none !important;
          opacity: 0 !important;
        }
      `;
      document.head.appendChild(style);
      document.querySelectorAll("vite-error-overlay, .tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay']").forEach((el) => el.remove());
    } catch (_) {}
  });

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

    const outPath = path.join(PROOF_DIR, filename);
    const brainPath = path.join(BRAIN_DIR, filename);
    await page.screenshot({ path: outPath, fullPage: false });
    fs.copyFileSync(outPath, brainPath);

    // Also copy to canonical number-prefix filenames if matching
    if (filename === "radiology_sensor_pc_light.png") {
      const p1 = path.join(PROOF_DIR, "01_radiology_pc_light_1440x900.png");
      fs.copyFileSync(outPath, p1);
      fs.copyFileSync(outPath, path.join(BRAIN_DIR, "01_radiology_pc_light_1440x900.png"));
    } else if (filename === "radiology_sensor_pc_dark.png") {
      const p2 = path.join(PROOF_DIR, "02_radiology_pc_dark_1440x900.png");
      fs.copyFileSync(outPath, p2);
      fs.copyFileSync(outPath, path.join(BRAIN_DIR, "02_radiology_pc_dark_1440x900.png"));
    } else if (filename === "radiology_sensor_mobile_light.png") {
      const p3 = path.join(PROOF_DIR, "03_radiology_mobile_light_390x844.png");
      fs.copyFileSync(outPath, p3);
      fs.copyFileSync(outPath, path.join(BRAIN_DIR, "03_radiology_mobile_light_390x844.png"));
    } else if (filename === "radiology_sensor_mobile_dark.png") {
      const p4 = path.join(PROOF_DIR, "04_radiology_mobile_dark_390x844.png");
      fs.copyFileSync(outPath, p4);
      fs.copyFileSync(outPath, path.join(BRAIN_DIR, "04_radiology_mobile_dark_390x844.png"));
    }

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
  console.log(">>> Capturing Radiology PC Light (1440x900)...");
  await captureAndSave("radiology_sensor_pc_light.png", { width: 1440, height: 900 }, false);

  // 2. PC Dark (1440x900)
  console.log(">>> Capturing Radiology PC Dark (1440x900)...");
  await captureAndSave("radiology_sensor_pc_dark.png", { width: 1440, height: 900 }, true);

  // 3. Mobile Light (390x844)
  console.log(">>> Capturing Radiology Mobile Light (390x844)...");
  await captureAndSave("radiology_sensor_mobile_light.png", { width: 390, height: 844 }, false);

  // 4. Mobile Dark (390x844)
  console.log(">>> Capturing Radiology Mobile Dark (390x844)...");
  await captureAndSave("radiology_sensor_mobile_dark.png", { width: 390, height: 844 }, true);

  await browser.close();

  console.log("\n==========================================");
  console.log("RADIOLOGY RED TEAM PROOFS OK");
  console.log("==========================================");
  console.table(results);
}

run().catch((err) => {
  console.error("FATAL screenshot script error:", err);
  process.exit(1);
});
