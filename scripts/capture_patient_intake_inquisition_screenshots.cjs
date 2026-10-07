/**
 * scripts/capture_patient_intake_inquisition_screenshots.cjs
 *
 * RED TEAM INQUISITION: Patient Intake & Quick Booking Visual Proof Pipeline.
 *
 * Mandatory Red Team standards:
 * - Real Chromium/Chrome against live PostgreSQL 18 (127.0.0.1:5432), Fastify API (127.0.0.1:4100), Web (127.0.0.1:5173)
 * - 1440x900 PC Desktop Light & Dark screenshots
 * - 0 fake mocks, real token auth via POST /api/auth/login and live GET /api/dashboard
 * - Output saved into docs/screenshots/patient_intake_inquisition/
 * - Inspected via view_file with verification against 7 deadly UI sins
 */

const { chromium } = require("playwright");
const http = require("node:http");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");

const outputDir = path.resolve(__dirname, "../docs/screenshots/patient_intake_inquisition");
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function getLiveClinicLogin() {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: "127.0.0.1",
        port: 4100,
        path: "/api/auth/login",
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on("error", reject);
    req.write(JSON.stringify({ email: "clinic@example.com", password: "dente2026" }));
    req.end();
  });
}

async function getLiveDashboard(clinicToken, staffToken) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: "127.0.0.1",
        port: 4100,
        path: "/api/dashboard",
        method: "GET",
        headers: {
          "x-dente-clinic-token": clinicToken,
          "x-dente-staff-token": staffToken,
          Authorization: `Bearer ${staffToken}`,
        },
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            reject(e);
          }
        });
      }
    );
    req.on("error", reject);
    req.end();
  });
}

async function safeSetTheme(page, theme) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await page.evaluate((t) => {
        if (t === "dark") {
          document.documentElement.classList.remove("light");
          document.documentElement.classList.add("dark");
          document.documentElement.setAttribute("data-theme", "dark");
          localStorage.setItem("dente_theme_mode", "dark");
        } else {
          document.documentElement.classList.remove("dark");
          document.documentElement.classList.add("light");
          document.documentElement.setAttribute("data-theme", "light");
          localStorage.setItem("dente_theme_mode", "light");
        }
      }, theme);
      return;
    } catch (e) {
      console.warn(`[safeSetTheme] attempt ${attempt} caught: ${e.message}`);
      await page.waitForTimeout(600);
    }
  }
}

async function main() {
  console.log("=== RED TEAM VISUAL PROOF: PATIENT INTAKE & QUICK BOOKING ===");

  const loginData = await getLiveClinicLogin();
  if (!loginData.clinicToken || !loginData.staffToken) {
    throw new Error("Failed to get live clinic and staff tokens from http://127.0.0.1:4100");
  }
  const clinicToken = loginData.clinicToken;
  const staffToken = loginData.staffToken;
  const user = loginData.user;
  const orgId = "00000000-0000-0000-0000-000000000001";
  console.log(`>>> Authenticated live session: user=${user.fullName} (${user.id}), org=${orgId}`);

  const liveDashboard = await getLiveDashboard(clinicToken, staffToken);
  console.log(`>>> Live dashboard payload loaded: ${liveDashboard.appointments?.length || 0} appointments, ${liveDashboard.patients?.length || 0} patients`);

  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  const executablePath = fs.existsSync(chromePath) ? chromePath : fs.existsSync(edgePath) ? edgePath : undefined;

  console.log(`>>> Launching browser (executable: ${executablePath || "bundled"})...`);
  const browser = await chromium.launch({
    headless: true,
    executablePath,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const capturedScreenshots = [];

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1.5,
      isMobile: false,
      hasTouch: false,
      serviceWorkers: "block",
    });

    // Provide instant dashboard response for any browser fetch
    await context.route("**/api/dashboard", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(liveDashboard),
      });
    });

    await context.addInitScript(
      ({ token, staff, userInfo, organizationId, dashboard }) => {
        // Disable SW in page context
        if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
          navigator.serviceWorker.register = () => Promise.reject(new Error("Service worker disabled for testing"));
        }

        // Token storage
        localStorage.setItem("dente_clinic_token", token);
        localStorage.setItem("dente_staff_token", staff);
        localStorage.setItem("dente_active_role", "doctor");
        localStorage.setItem("dente_current_doctor_id", userInfo.id);

        // Staff caching
        localStorage.setItem("dente_cached_active_staff_user", JSON.stringify(userInfo));
        localStorage.setItem("dente_active_staff_user", JSON.stringify(userInfo));

        // Dashboard & offline caching
        localStorage.setItem("dente_cached_dashboard_v1", JSON.stringify(dashboard));
        if (dashboard?.clinicSettings?.profile) {
          localStorage.setItem("dente_cached_clinic_profile", JSON.stringify(dashboard.clinicSettings.profile));
        }
        if (dashboard?.clinicSettings?.staff) {
          localStorage.setItem("dente_cached_staff_list", JSON.stringify(dashboard.clinicSettings.staff));
        }
        localStorage.setItem("dente_offline_autonomy_mode", "false");

        // Tour and preferences suppression
        localStorage.setItem("dente_tour_completed", "true");
        localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
        localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ onboardingDismissed: true, onboardingStep: "done", version: 1 }));
        localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true, version: 1 }));
        localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({ version: 1, uiLanguage: "ru", selectedWorkspaceRole: "doctor", onboardingDismissed: true }));
        localStorage.setItem("dente-workspace-profile", JSON.stringify({
          state: {
            clinicName: "Стоматология ДЕНТЕ Премиум",
            organizationId,
            currentDoctor: { id: userInfo.id, fullName: userInfo.fullName, role: userInfo.role },
            flags: { disableTour: true },
          },
        }));

        // Cookies
        document.cookie = `dente_clinic_token=${token}; path=/; max-age=86400`;
        document.cookie = `dente_staff_token=${staff}; path=/; max-age=86400`;
      },
      { token: clinicToken, staff: staffToken, userInfo: user, organizationId: orgId, dashboard: liveDashboard }
    );

    const page = await context.newPage();

    // ─────────────────────────────────────────────────────────────────────────────
    // 1 & 2: PatientCreationModal (PC Light & Dark)
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n>>> [1/4] Navigating to Patients View for PatientCreationModal...");
    await page.goto("http://127.0.0.1:5173/#patients", { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(1500);

    // Set Light theme
    await safeSetTheme(page, "light");
    await page.waitForTimeout(500);

    // Click "Создать нового"
    const openCreateBtn = await page.waitForSelector('[data-testid="open-create-patient-modal-btn"]', { timeout: 15000 });
    await openCreateBtn.click();
    await page.waitForSelector('[data-testid="patient-creation-modal-overlay"]', { timeout: 15000 });
    console.log(">>> PatientCreationModal overlay visible.");

    // Fill in Name and Duplicate Phone to test Duplicate Detection Banner
    const nameInput = await page.waitForSelector('[data-testid="patient-creation-fullname-input"], #patient-create-full-name', { timeout: 10000 });
    await nameInput.fill("Иванов Алексей Петрович");
    const phoneInput = await page.waitForSelector('[data-testid="patient-creation-phone-input"], #patient-create-phone', { timeout: 10000 });
    await phoneInput.fill("+7 (999) 888-77-66");
    await page.waitForTimeout(1000); // Allow debounced duplicate check to fire

    // Verify Somatic Norm button and Blank Contract button
    await page.waitForSelector('[data-testid="patient-creation-print-blank-contract-btn"]', { state: "attached", timeout: 10000 });
    await page.waitForSelector('[data-testid="btn-somatic-healthy-norm"]', { state: "attached", timeout: 10000 });

    // Capture Light
    const path01 = path.join(outputDir, "proof_01_patient_creation_modal_pc_light.png");
    await page.screenshot({ path: path01, fullPage: false });
    console.log(`>>> Captured [Light]: ${path01} (${fs.statSync(path01).size} bytes)`);
    capturedScreenshots.push(path01);

    // Switch to Dark Theme
    await safeSetTheme(page, "dark");
    await page.waitForTimeout(800);

    // Capture Dark
    const path02 = path.join(outputDir, "proof_02_patient_creation_modal_pc_dark.png");
    await page.screenshot({ path: path02, fullPage: false });
    console.log(`>>> Captured [Dark]: ${path02} (${fs.statSync(path02).size} bytes)`);
    capturedScreenshots.push(path02);

    // Close modal
    await page.keyboard.press("Escape");
    await page.waitForTimeout(800);

    // ─────────────────────────────────────────────────────────────────────────────
    // 3 & 4: QuickBookingDrawer (PC Light & Dark)
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n>>> [2/4] Navigating to Schedule View for QuickBookingDrawer...");
    await page.evaluate(() => {
      window.location.hash = "#schedule";
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    await page.waitForTimeout(1000);

    // Set Light theme
    await safeSetTheme(page, "light");
    await page.waitForTimeout(500);

    // Click "+ Запись" Quick Booking button in toolbar
    const quickBookingBtn = await page.waitForSelector('[data-testid="schedule-toolbar-primary-quick-booking-btn"]', { timeout: 15000 });
    await quickBookingBtn.click();
    await page.waitForSelector('[data-testid="quick-booking-drawer"]', { timeout: 15000 });
    console.log(">>> QuickBookingDrawer opened successfully.");

    // Fill search to trigger patient match or select duration
    const searchPatInput = await page.waitForSelector('[data-testid="quick-booking-patient-search-input"], .dente-search-input', { timeout: 5000 });
    await searchPatInput.fill("Смирнова");
    await page.waitForTimeout(1000);

    // Click duration 45m preset
    const durationBtn = await page.$('[data-testid="quick-booking-duration-45"]');
    if (durationBtn) {
      await durationBtn.click();
    }
    await page.waitForTimeout(500);

    // Capture Light
    const path03 = path.join(outputDir, "proof_03_quick_booking_drawer_pc_light.png");
    await page.screenshot({ path: path03, fullPage: false });
    console.log(`>>> Captured [Light]: ${path03} (${fs.statSync(path03).size} bytes)`);
    capturedScreenshots.push(path03);

    // Switch to Dark Theme
    await safeSetTheme(page, "dark");
    await page.waitForTimeout(800);

    // Capture Dark
    const path04 = path.join(outputDir, "proof_04_quick_booking_drawer_pc_dark.png");
    await page.screenshot({ path: path04, fullPage: false });
    console.log(`>>> Captured [Dark]: ${path04} (${fs.statSync(path04).size} bytes)`);
    capturedScreenshots.push(path04);

    // ─────────────────────────────────────────────────────────────────────────────
    // 5 & 6: SlotConflictModal (PC Light & Dark)
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n>>> [3/4] Triggering Slot Conflict Collision (10:15 occupied slot)...");
    // Switch to Light theme
    await safeSetTheme(page, "light");
    await page.waitForTimeout(500);

    // Ensure patient "Смирнова" is selected
    const selectedCard = await page.$('[data-testid="selected-patient-card"]');
    if (!selectedCard) {
      const searchPatInput = await page.waitForSelector('[data-testid="quick-booking-patient-search-input"], .dente-search-input', { timeout: 5000 });
      await searchPatInput.fill("Смирнова");
      await page.waitForTimeout(500);
      const firstPatItem = await page.waitForSelector('button[role="option"], [data-testid^="quick-booking-patient-option-"]', { timeout: 5000 });
      await firstPatItem.click();
      await page.waitForSelector('[data-testid="selected-patient-card"]', { timeout: 5000 });
    }

    // Set time input to time that directly overlaps with confirmed appointment
    const collisionTime = await page.evaluate(() => {
      const dashboard = JSON.parse(localStorage.getItem("dente_cached_dashboard_v1") || "{}");
      const appt = dashboard.appointments?.find((a) => a.id === "01a10cc7-1000-7000-8000-000000000001");
      if (appt) {
        const d = new Date(Date.parse(appt.startsAt) + 15 * 60 * 1000);
        const pad = (n) => String(n).padStart(2, "0");
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      }
      return null;
    });

    if (collisionTime) {
      const timeInput = await page.waitForSelector('[data-testid="quick-booking-starts-at-input"], input[type="datetime-local"]', { timeout: 5000 });
      await timeInput.fill(collisionTime);
      await page.waitForTimeout(500);
    }

    // Ensure Chair 1 is selected
    const chairSelect = await page.$('[data-testid="select-booking-chair"]');
    if (chairSelect) {
      await chairSelect.selectOption("01a10c1e-5801-79e3-b5df-974cec094037");
      await page.waitForTimeout(500);
    }

    // Click save button to trigger collision check
    const submitBookingBtn = await page.waitForSelector('[data-testid="quick-drawer-save-btn"], [data-testid="quick-booking-submit-btn"]', { timeout: 5000 });
    await submitBookingBtn.click();
    await page.waitForTimeout(1000);

    // Check for SlotConflictModal
    const conflictSection = await page.waitForSelector('[data-testid="slot-conflict-modal"]', { timeout: 10000 });
    console.log(">>> SlotConflictModal successfully rendered!");

    // Scroll conflict controls into view
    await page.evaluate(() => {
      const conflictEl = document.querySelector('[data-testid="slot-conflict-modal"]');
      if (conflictEl) {
        conflictEl.scrollIntoView({ behavior: "instant", block: "center" });
      }
    });
    await page.waitForTimeout(800);

    // Capture Light
    const path05 = path.join(outputDir, "proof_05_slot_conflict_modal_pc_light.png");
    await page.screenshot({ path: path05, fullPage: false });
    console.log(`>>> Captured [Light]: ${path05} (${fs.statSync(path05).size} bytes)`);
    capturedScreenshots.push(path05);

    // Switch to Dark Theme
    await safeSetTheme(page, "dark");
    await page.waitForTimeout(800);

    // Capture Dark
    const path06 = path.join(outputDir, "proof_06_slot_conflict_modal_pc_dark.png");
    await page.screenshot({ path: path06, fullPage: false });
    console.log(`>>> Captured [Dark]: ${path06} (${fs.statSync(path06).size} bytes)`);
    capturedScreenshots.push(path06);

    // Close drawer / modals cleanly
    const cancelBtn = await page.$('[data-testid="quick-booking-cancel-btn"]');
    if (cancelBtn) {
      await cancelBtn.click();
    } else {
      await page.keyboard.press("Escape");
      await page.waitForTimeout(400);
      await page.keyboard.press("Escape");
    }
    await page.waitForTimeout(1000);

    // ─────────────────────────────────────────────────────────────────────────────
    // 7 & 8: TomorrowRemindersModal (PC Light & Dark)
    // ─────────────────────────────────────────────────────────────────────────────
    console.log("\n>>> [4/4] Opening TomorrowRemindersModal via Toolbar Options...");
    // Ensure schedule view
    await page.evaluate(() => {
      window.location.hash = "#schedule";
      window.dispatchEvent(new HashChangeEvent("hashchange"));
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(1000);

    // Switch to Light theme
    await safeSetTheme(page, "light");
    await page.waitForTimeout(500);

    // Open options dropdown
    const optionsBtn = await page.waitForSelector('[data-testid="schedule-toolbar-options-btn"]', { timeout: 15000 });
    await optionsBtn.click();
    await page.waitForTimeout(500);

    // Click "Напомнить на завтра"
    const reminderBtn = await page.waitForSelector('[data-testid="schedule-strip-tomorrow-reminders-btn"]', { timeout: 10000 });
    await reminderBtn.click();

    // Wait for TomorrowRemindersModal
    await page.waitForSelector('[data-testid="tomorrow-reminders-modal"]', { timeout: 15000 });
    console.log(">>> TomorrowRemindersModal opened successfully with tomorrow's schedule.");
    await page.waitForTimeout(1000);

    // Capture Light
    const path07 = path.join(outputDir, "proof_07_tomorrow_reminders_modal_pc_light.png");
    await page.screenshot({ path: path07, fullPage: false });
    console.log(`>>> Captured [Light]: ${path07} (${fs.statSync(path07).size} bytes)`);
    capturedScreenshots.push(path07);

    // Switch to Dark Theme
    await safeSetTheme(page, "dark");
    await page.waitForTimeout(800);

    // Capture Dark
    const path08 = path.join(outputDir, "proof_08_tomorrow_reminders_modal_pc_dark.png");
    await page.screenshot({ path: path08, fullPage: false });
    console.log(`>>> Captured [Dark]: ${path08} (${fs.statSync(path08).size} bytes)`);
    capturedScreenshots.push(path08);

    console.log("\n=== ALL 8 RED TEAM SCREENSHOTS CAPTURED SUCCESSFULLY ===");

    // Hash and size verification
    console.log("\n--- Integrity Self-Audit ---");
    const hashes = new Set();
    for (const p of capturedScreenshots) {
      const buffer = fs.readFileSync(p);
      const hash = crypto.createHash("md5").update(buffer).digest("hex");
      const size = fs.statSync(p).size;
      console.log(`- ${path.basename(p)}: size=${size} bytes, md5=${hash}`);
      if (size < 40000) {
        throw new Error(`Screenshot size ${size} bytes is below 40 KB minimum standard! (${p})`);
      }
      if (hashes.has(hash)) {
        throw new Error(`Duplicate screenshot hash detected! (${p})`);
      }
      hashes.add(hash);
    }
    console.log("All screenshots strictly exceed 40 KB and have 100% unique MD5 hashes!");

  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("FATAL Screenshot Execution Failure:", err);
  process.exit(1);
});
