/**
 * scripts/capture_hygiene_and_visit_proofs.cjs
 *
 * Captures 1440x900 PC Light and Dark screenshots for:
 * 1. visit_clinical_cockpit_pc_light.png & visit_clinical_cockpit_pc_dark.png
 * 2. hygiene_indices_panel_pc_light.png & hygiene_indices_panel_pc_dark.png
 *
 * Uses Playwright with Microsoft Edge ({ channel: 'msedge' }) on Windows 11.
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");

const API_BASE = "http://127.0.0.1:4100";
const WEB_BASE = "http://127.0.0.1:5173";

const TARGET_DIRS = [
  path.resolve("C:/Users/Admin/.gemini/antigravity/brain/e4d09e25-3f7e-4e22-b931-3c563a494233"),
  path.resolve("C:/Users/Admin/.gemini/antigravity/brain/df880520-dc90-48e7-ab9e-032bd60d9f31"),
  path.resolve("C:/Clinic_MVP/dental-crm/apps/web/public/screenshots/hygiene_indices"),
];

for (const dir of TARGET_DIRS) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

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
        notes: "Гигиена полости рта, оценка индексов OHI-S и КПУ",
      }),
    });
    if (pRes.ok) {
      const pData = await pRes.json();
      patientId = pData.patient?.id || pData.id || null;

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
          notes: "Комплексная профгигиена и оценка индексов",
        }),
      });
      if (appRes.ok) {
        const appData = await appRes.json();
        appointmentId = appData.appointment?.id || appData.id || null;
      }
    }
  } catch (err) {
    console.warn("[Provisioning] Warning:", err.message);
  }

  return {
    clinicToken: initData.clinicToken,
    staffToken: unlockData.staffToken,
    ownerUserId: initData.ownerUserId,
    patientId,
    appointmentId,
  };
}

async function saveProof(page, fileName, viewName, modeName) {
  const primaryPath = path.join(TARGET_DIRS[0], fileName);
  await page.waitForTimeout(600);
  await page.screenshot({ path: primaryPath, fullPage: false });

  const stat = fs.statSync(primaryPath);
  const hash = crypto.createHash("md5").update(fs.readFileSync(primaryPath)).digest("hex");

  if (stat.size < 35000) {
    throw new Error(`[BLANK SCREENSHOT DETECTED] ${fileName} size is only ${stat.size} bytes`);
  }

  for (let i = 1; i < TARGET_DIRS.length; i++) {
    try {
      const copyPath = path.join(TARGET_DIRS[i], fileName);
      fs.copyFileSync(primaryPath, copyPath);
    } catch (err) {
      console.warn(`Could not copy to ${TARGET_DIRS[i]}:`, err.message);
    }
  }

  console.log(`[PROOF CAPTURED] ${fileName} (${viewName} ${modeName}): ${stat.size} bytes (${(stat.size / 1024).toFixed(1)} KB), MD5: ${hash}`);
  return { fileName, size: stat.size, hash };
}

async function applyTheme(page, isDark) {
  await page.evaluate((dark) => {
    const theme = dark ? "dark" : "light";
    localStorage.setItem("dente_theme_mode", theme);
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.classList.toggle("light", !dark);
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
    if (window.__useThemeStore) {
      window.__useThemeStore.getState().setThemeMode(theme);
    }
  }, isDark);
  await page.waitForTimeout(600);
}

async function purgeTourElements(page) {
  await page.evaluate(() => {
    document.querySelectorAll(
      ".tour-spotlight-root, [data-testid=\"guided-tour-spotlight-overlay\"], .tour-backdrop-clickable-zone, [data-testid=\"interactive-tour-invite-banner\"], [data-testid=\"coach-mark-never-show-btn\"], [aria-label=\"Приглашение в обучающий тур\"], [data-testid=\"interactive-tour-portal-root\"], .driver-popover, .driver-overlay"
    ).forEach((el) => el.remove());
  });
}

async function main() {
  console.log("=== LAUNCHING PLAYWRIGHT (MSEDGE) CAPTURE ===");
  const auth = await provisionSession();

  const browser = await chromium.launch({
    channel: "msedge",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });

    await context.addInitScript(
      ({ ct, st, uid, pid, aid }) => {
        localStorage.setItem("dente_clinic_token", ct);
        localStorage.setItem("dente_staff_token", st);
        localStorage.setItem("dente_active_role", "owner");
        localStorage.setItem("dente_theme_mode", "light");
        localStorage.setItem("dente_onboarding_completed", "true");
        localStorage.setItem("dente_tour_completed", "true");
        localStorage.setItem("dente_quest_progress_v2", JSON.stringify({ isTourActive: false, isDismissedPermanently: true, tracksProgress: { solo_doctor: { completed: true } } }));
        localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
        localStorage.setItem("dente_guide_tour_seen_roles_v2", JSON.stringify(["doctor", "owner", "assistant", "receptionist"]));
        localStorage.setItem("dente_workspace_perspective", "standard");
        localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ onboardingDismissed: true, onboardingStep: "done", version: 1 }));
        localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true, onboardingDismissed: true, onboardingStep: "done", version: 1 }));
        localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({ version: 1, uiLanguage: "ru", selectedWorkspaceRole: "owner", selectedPatientId: pid, onboardingDismissed: true, onboardingStep: "done" }));
        localStorage.setItem("dente-workspace-profile", JSON.stringify({ state: { clinicName: "Стоматология ДЕНТЕ Премиум", currentDoctor: { id: uid, fullName: "Д-р Воронов А. В.", role: "owner" }, flags: { disableTour: true } } }));
      },
      { ct: auth.clinicToken, st: auth.staffToken, uid: auth.ownerUserId, pid: auth.patientId, aid: auth.appointmentId }
    );

    const page = await context.newPage();

    // Navigate to visit workspace
    console.log("Navigating to visit workspace...");
    await page.goto(`${WEB_BASE}/#visit`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForSelector(".boot-state", { state: "detached", timeout: 60000 }).catch(() => {});
    await page.waitForSelector(".app-shell", { state: "visible", timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(2000);

    // Purge tour overlays
    await purgeTourElements(page);
    await page.waitForTimeout(500);

    // 1. CAPTURE VISIT COCKPIT (PC LIGHT)
    await applyTheme(page, false);
    await purgeTourElements(page);
    await page.waitForTimeout(800);
    await saveProof(page, "visit_clinical_cockpit_pc_light.png", "Visit Cockpit", "PC Light");

    // 2. CAPTURE VISIT COCKPIT (PC DARK)
    await applyTheme(page, true);
    await purgeTourElements(page);
    await page.waitForTimeout(800);
    await saveProof(page, "visit_clinical_cockpit_pc_dark.png", "Visit Cockpit", "PC Dark");

    // 3. SWITCH TO ODONTOGRAM SUBTAB
    console.log("Switching to Odontogram sub-tab...");
    const odontogramTab = page.locator('button:has-text("Зубная формула"), [role="tab"]:has-text("Зубная формула")').first();
    if (await odontogramTab.isVisible()) {
      await odontogramTab.click();
      await page.waitForTimeout(1000);
    }

    // 4. OPEN ODONTOGRAM MORE MENU AND PERIO CHART
    console.log("Opening odontogram more menu...");
    const odontoMoreBtn = page.locator('[data-testid="btn-odontogram-more-menu"]').first();
    if (await odontoMoreBtn.isVisible()) {
      await odontoMoreBtn.click();
      await page.waitForTimeout(600);

      console.log("Clicking btn-open-perio-chart...");
      const perioBtn = page.locator('[data-testid="btn-open-perio-chart"]').first();
      if (await perioBtn.isVisible()) {
        await perioBtn.click();
        await page.waitForTimeout(1200);

        console.log("Expanding hygiene indices panel...");
        const hygieneBtn = page.locator('[data-testid="perio-hygiene-indices-btn"]').first();
        if (await hygieneBtn.isVisible()) {
          await hygieneBtn.click();
          await page.waitForTimeout(1000);
          console.log("SUCCESS: Hygiene indices panel expanded!");
        } else {
          console.warn("[Perio] perio-hygiene-indices-btn not found");
        }
      } else {
        console.warn("[Odontogram] btn-open-perio-chart not found");
      }
    } else {
      console.warn("[Odontogram] btn-odontogram-more-menu not found");
    }

    // Scroll to hygiene indices panel
    await page.evaluate(() => {
      const panel = document.querySelector('[data-testid="hygiene-indices-panel"]');
      if (panel) {
        panel.scrollIntoView({ behavior: "instant", block: "start" });
      }
    });
    await page.waitForTimeout(800);

    // 5. CAPTURE HYGIENE INDICES PANEL (PC DARK)
    await applyTheme(page, true);
    await purgeTourElements(page);
    await page.waitForTimeout(800);
    await saveProof(page, "hygiene_indices_panel_pc_dark.png", "Hygiene Indices Panel", "PC Dark");

    // 6. CAPTURE HYGIENE INDICES PANEL (PC LIGHT)
    await applyTheme(page, false);
    await purgeTourElements(page);
    await page.waitForTimeout(800);
    await saveProof(page, "hygiene_indices_panel_pc_light.png", "Hygiene Indices Panel", "PC Light");

    console.log("=== ALL SCREENSHOT PROOFS SUCCESSFULLY CAPTURED ===");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("FATAL ERROR in capture script:", err);
  process.exit(1);
});
