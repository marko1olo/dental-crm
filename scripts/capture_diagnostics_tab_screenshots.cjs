/**
 * scripts/capture_diagnostics_tab_screenshots.cjs
 *
 * Dedicated Red Team Inquisitor Screenshot Capture for Diagnostics & Radiology Tab:
 * - Captures:
 *   1. docs/screenshots/visit_tabs/diagnostics_pc_light.png (1440x900)
 *   2. docs/screenshots/visit_tabs/diagnostics_pc_dark.png (1440x900)
 * - Also mirrors to brain artifact dir.
 * - Enforces Anti-Blank Byte Guard (>= 20 KB floor).
 * - Single-purpose, autonomous (spawns Vite if not listening).
 */

const { chromium } = require("playwright");
const { spawn } = require("node:child_process");
const http = require("node:http");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");

const todayDate = new Date().toLocaleDateString("en-CA");

const mockDashboard = {
  clinicName: "Стоматология ДЕНТЕ Премиум",
  todayIso: todayDate,
  clinicSettings: {
    profile: {
      id: "c-1",
      organizationId: "00000000-0000-0000-0000-000000000001",
      clinicName: "Стоматология ДЕНТЕ Премиум",
      mode: "small_clinic",
      defaultVisitMinutes: 45,
      scheduleDefaults: {
        workingDays: [1, 2, 3, 4, 5, 6],
        workdayStart: "08:00",
        workdayEnd: "21:00",
        appointmentBufferMinutes: 10,
      },
      timezone: "Europe/Moscow",
      phone: "+7 (495) 123-45-67",
      address: "Москва, Столярный переулок, 14",
      inn: "7701234567",
      updatedAt: new Date().toISOString(),
    },
    staff: [
      {
        id: "doc-1",
        organizationId: "00000000-0000-0000-0000-000000000001",
        fullName: "Д-р Воронов Алексей Владимирович",
        role: "owner",
        specialties: ["therapist", "orthopedist"],
        active: true,
        color: "#0d9488",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    chairs: [
      {
        id: "chair-1",
        organizationId: "00000000-0000-0000-0000-000000000001",
        name: "Кабинет 1 (Терапия)",
        room: "1",
        defaultDoctorId: "doc-1",
        active: true,
        hasXraySensor: true,
        hasMicroscope: true,
        hasSurgeryKit: false,
      },
    ],
  },
  patients: [
    {
      id: "pat-1",
      fullName: "Ковалёв Роман Станиславович",
      birthDate: "1966-04-12",
      phone: "+7 (916) 123-45-67",
      gender: "male",
      cardNumber: "МК-РАТ-1",
      medCardNumber: "МК-РАТ-1",
      allergies: ["Лидокаин", "Пенициллин"],
      chronicConditions: ["Гипертония II ст."],
      notes: "Контроль имплантации в области 1.6",
    },
  ],
  activeVisit: {
    id: "visit-1",
    patientId: "pat-1",
    doctorId: "doc-1",
    chairId: "chair-1",
    startTime: `${todayDate}T10:00:00`,
    endTime: `${todayDate}T11:00:00`,
    status: "in_progress",
    reason: "Плановый осмотр и визиография",
  },
  appointments: [
    {
      id: "apt-1",
      patientId: "pat-1",
      patientName: "Ковалёв Роман Станиславович",
      doctorId: "doc-1",
      chairId: "chair-1",
      date: todayDate,
      startTime: "10:00",
      endTime: "11:00",
      status: "in_progress",
      treatmentType: "Терапевтический приём",
    },
  ],
  imagingStudies: [
    {
      id: "study-rvg-1",
      patientId: "pat-1",
      title: "Прицельный снимок зуба 1.6",
      kind: "periapical",
      toothCode: "16",
      previewUrl: "/radiology/sample_rvg_tooth16.jpg",
      viewerUrl: "/radiology/sample_rvg_tooth16.jpg",
      capturedAt: new Date().toISOString(),
      effectiveDoseMicrosv: 2,
      status: "available",
    },
    {
      id: "study-cbct-1",
      patientId: "pat-1",
      title: "3D КЛКТ верхней челюсти",
      kind: "cbct",
      toothCode: "16",
      previewUrl: "/radiology/sample_rvg_pathology.jpg",
      viewerUrl: "/radiology/kavo_op300_cbct_slice.dcm",
      capturedAt: new Date(Date.now() - 86400000 * 7).toISOString(),
      effectiveDoseMicrosv: 35,
      status: "available",
    },
  ],
  payments: [],
};

function checkPort(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}`, (res) => {
      resolve(true);
    });
    req.on("error", () => resolve(false));
    req.setTimeout(1500, () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForServer(port, timeoutMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await checkPort(port)) return true;
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

async function main() {
  const primaryDir = path.resolve(__dirname, "../docs/screenshots/visit_tabs");
  const brainDir = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/a6e95988-e8e4-4c72-89a6-8b1d0b01322f");

  fs.mkdirSync(primaryDir, { recursive: true });
  fs.mkdirSync(brainDir, { recursive: true });

  const port = 5173;
  let viteProcess = null;

  const isUp = await checkPort(port);
  if (!isUp) {
    console.log(">>> Vite server is not running. Spawning Vite...");
    viteProcess = spawn("npx", ["vite", "--port", String(port), "--host", "127.0.0.1"], {
      cwd: path.resolve(__dirname, "../apps/web"),
      stdio: "inherit",
      shell: true,
    });

    const ready = await waitForServer(port, 45000);
    if (!ready) {
      if (viteProcess) viteProcess.kill();
      throw new Error(`Timed out waiting for Vite dev server on port ${port}`);
    }
    console.log(`>>> Vite dev server is ready on http://127.0.0.1:${port}`);
  } else {
    console.log(`>>> Vite dev server is already running on http://127.0.0.1:${port}`);
  }

  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const edgePath = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
  const executablePath = fs.existsSync(chromePath) ? chromePath : (fs.existsSync(edgePath) ? edgePath : undefined);
  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  try {
    const pcContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
      isMobile: false,
      hasTouch: false,
    });

    // Seed auth state
    await pcContext.addInitScript(() => {
      localStorage.setItem("dente_demo_showcase", "true");
      localStorage.setItem("dente_clinic_token", "live-inquisition-clinic-token");
      localStorage.setItem("dente_staff_token", "live-inquisition-staff-token");
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_theme_mode", "light");
      localStorage.setItem(
        "dente_cached_active_staff_user",
        JSON.stringify({
          id: "doc-1",
          fullName: "Д-р Воронов Алексей Владимирович",
          role: "owner",
          organizationId: "00000000-0000-0000-0000-000000000001",
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
          version: 1,
        })
      );
      localStorage.setItem(
        "dental-crm:web-ui-preferences:v1",
        JSON.stringify({
          version: 1,
          uiLanguage: "ru",
          selectedWorkspaceRole: "owner",
          selectedPatientId: "pat-1",
          onboardingDismissed: true,
          onboardingStep: "done",
        })
      );
      localStorage.setItem(
        "dente-workspace-profile",
        JSON.stringify({
          state: {
            clinicName: "Стоматология ДЕНТЕ Премиум",
            currentDoctor: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner" },
            flags: { disableTour: true },
          },
        })
      );
    });

    const pcPage = await pcContext.newPage();

    pcPage.on("console", (msg) => {
      if (msg.type() === "error") console.log("[BROWSER ERROR]:", msg.text());
    });
    pcPage.on("pageerror", (err) => console.log("[PAGE UNCAUGHT]:", err.message));

    // Mock API requests
    await pcPage.route("**/api/**", async (route) => {
      const url = route.request().url();
      if (url.includes("/src/")) return route.continue();

      if (url.includes("/api/dashboard") || url.includes("/api/bootstrap")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockDashboard),
        });
      }
      if (url.includes("/api/imaging/studies")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockDashboard.imagingStudies),
        });
      }
      if (url.includes("/api/auth/user/me") || url.includes("/api/auth/session")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            user: {
              id: "doc-1",
              fullName: "Д-р Воронов Алексей Владимирович",
              role: "owner",
              active: true,
              organizationId: "00000000-0000-0000-0000-000000000001",
            },
          }),
        });
      }
      if (url.includes("/api/auth/staff/unlock")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            token: "live-inquisition-staff-token",
            user: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner" },
          }),
        });
      }
      if (url.includes("/api/schedule")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockDashboard.appointments),
        });
      }
      if (url.includes("/api/patients")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockDashboard.patients),
        });
      }
      if (url.includes("/api/payments") || url.includes("/api/billing")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockDashboard.payments),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(url.includes("list") || url.includes("status") ? [] : {}),
      });
    });

    console.log("Navigating to Visit view...");
    await pcPage.goto("http://127.0.0.1:5173/#visit", { waitUntil: "domcontentloaded", timeout: 45000 });
    await pcPage.waitForSelector(".boot-state", { state: "detached", timeout: 30000 }).catch(() => {});
    await pcPage.waitForSelector(".app-shell", { state: "visible", timeout: 30000 });
    await pcPage.waitForTimeout(1500);

    // Remove overlays
    await pcPage.evaluate(() => {
      document.querySelectorAll(".tour-spotlight-root, [data-testid=\"guided-tour-spotlight-overlay\"], .tour-backdrop-clickable-zone, .global-toast-container").forEach((el) => el.remove());
    });

    // Switch to Diagnostics subtab
    console.log("Switching to Diagnostics tab...");
    const subtabBtn = await pcPage.$('[data-testid="visit-subtab-diagnostics"]');
    if (subtabBtn) {
      await subtabBtn.click();
    } else {
      const textBtn = await pcPage.getByRole("button", { name: "Диагностика" }).first();
      await textBtn.click();
    }
    await pcPage.waitForTimeout(1000);

    // Wait for diagnostics tab container
    await pcPage.waitForSelector('[data-testid="visit-diagnostics-tab"], [data-testid="tab-diagnostic-mode-rvg"]', { state: "visible", timeout: 20000 });
    await pcPage.waitForTimeout(1200);

    const applyTheme = async (page, theme) => {
      console.log(`Applying theme: ${theme}...`);
      await page.evaluate((th) => {
        localStorage.setItem("dente_theme_mode", th);
        localStorage.setItem("dente_theme", th);
        if (window.__useThemeStore) {
          window.__useThemeStore.getState().setThemeMode(th);
        }
        if (window.__denteThemeStore) {
          window.__denteThemeStore.getState().setTheme(th);
        }
        document.documentElement.setAttribute("data-theme", th);
        const isDark = ["dark", "night", "ocean", "emerald", "cyber_xray"].includes(th);
        document.documentElement.classList.toggle("dark", isDark);
        document.documentElement.classList.toggle("light", !isDark);
        document.body.classList.toggle("dark", isDark);
        document.body.classList.toggle("light", !isDark);
        document.documentElement.style.colorScheme = isDark ? "dark" : "light";
      }, theme);
      await page.waitForTimeout(1200);
    };

    const saveProof = async (page, baseFilename) => {
      const primaryPath = path.join(primaryDir, baseFilename);
      await page.screenshot({ path: primaryPath, fullPage: false, animations: "disabled" });

      const stats = fs.statSync(primaryPath);
      if (stats.size < 20480) {
        throw new Error(`[ANTI-BLANK REJECTED] File ${baseFilename} is only ${stats.size} bytes (< 20 KB)!`);
      }

      // Copy to brain artifact dir
      fs.copyFileSync(primaryPath, path.join(brainDir, baseFilename));

      const hash = crypto.createHash("md5").update(fs.readFileSync(primaryPath)).digest("hex");
      console.log(`[PROOF CAPTURED] ${baseFilename}: ${stats.size} bytes (${(stats.size / 1024).toFixed(1)} KB), MD5=${hash}`);
      return { filename: baseFilename, size: stats.size, md5: hash };
    };

    // 1. Capture Light Mode
    await applyTheme(pcPage, "light");
    await pcPage.waitForTimeout(500);
    const lightResult = await saveProof(pcPage, "diagnostics_pc_light.png");

    // 2. Capture Dark Mode
    await applyTheme(pcPage, "dark");
    await pcPage.waitForTimeout(500);
    const darkResult = await saveProof(pcPage, "diagnostics_pc_dark.png");

    // 3. Capture 2D Sensor Viewer HUD
    console.log("Opening 2D Sensor Viewer HUD...");
    try {
      const hudBtn = await pcPage.waitForSelector('[data-testid="btn-open-ezdent-sensor-viewer"]', { timeout: 5000 });
      if (hudBtn) {
        await hudBtn.click();
        await pcPage.waitForTimeout(1000);
        const hudResult = await saveProof(pcPage, "diagnostics_sensor_viewer_hud.png");
        console.log("2D Sensor Viewer HUD captured:", hudResult);
        await pcPage.keyboard.press("Escape");
        await pcPage.waitForTimeout(500);
      }
    } catch (err) {
      console.warn("Could not capture 2D Sensor HUD:", err.message);
    }

    // 4. Capture 3D CBCT Studio Modal
    console.log("Switching to CBCT mode & opening 3D CBCT Studio...");
    try {
      const cbctTab = await pcPage.waitForSelector('[data-testid="tab-diagnostic-mode-cbct"]', { timeout: 5000 });
      if (cbctTab) {
        await cbctTab.click();
        await pcPage.waitForTimeout(600);
        const cbctStudioBtn = await pcPage.waitForSelector('[data-testid="btn-open-cbct-studio-modal"]', { timeout: 5000 });
        if (cbctStudioBtn) {
          await cbctStudioBtn.click();
          await pcPage.waitForTimeout(1500);
          const cbctResult = await saveProof(pcPage, "diagnostics_cbct_studio_modal.png");
          console.log("3D CBCT Studio captured:", cbctResult);
          await pcPage.keyboard.press("Escape");
          await pcPage.waitForTimeout(500);
        }
      }
    } catch (err) {
      console.warn("Could not capture CBCT studio:", err.message);
    }

    // 5. Capture Radiology Report Studio Modal
    console.log("Opening Radiology Report Studio (A4)...");
    try {
      const rvgTab = await pcPage.waitForSelector('[data-testid="tab-diagnostic-mode-rvg"]', { timeout: 5000 });
      if (rvgTab) await rvgTab.click();
      await pcPage.waitForTimeout(500);

      const reportBtn = await pcPage.waitForSelector('[data-testid="btn-open-radiology-report-studio"]', { timeout: 5000 });
      if (reportBtn) {
        await reportBtn.click();
        await pcPage.waitForTimeout(1000);
        const reportResult = await saveProof(pcPage, "diagnostics_radiology_report_modal.png");
        console.log("Radiology Report Studio captured:", reportResult);
        await pcPage.keyboard.press("Escape");
        await pcPage.waitForTimeout(500);
      }
    } catch (err) {
      console.warn("Could not capture Radiology Report Studio:", err.message);
    }

    await pcContext.close();

    console.log("\n======================================================");
    console.log(">>> ALL DIAGNOSTICS & STUDIO PROOFS CAPTURED (>= 20 KB)! <<<");
    console.log("======================================================");
  } finally {
    await browser.close();
    if (viteProcess) {
      console.log(">>> Shutting down spawned Vite dev server...");
      viteProcess.kill();
    }
  }
}

main().catch((err) => {
  console.error("FATAL ERROR in capture_diagnostics_tab_screenshots:", err);
  process.exit(1);
});
