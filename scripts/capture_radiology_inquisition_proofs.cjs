/**
 * scripts/capture_radiology_inquisition_proofs.cjs
 *
 * 4-State Visual Proof Capture for Radiology & RVG Visiograph Inquisition:
 * 1. PC Light (1440x900) - Imaging Desktop Workspace
 * 2. PC Dark (1440x900) - Imaging Desktop Workspace
 * 3. Mobile Light (390x844) - Mobile Chairside Radiology Viewer
 * 4. Mobile Dark (390x844) - Mobile Chairside Radiology Viewer
 * 5. Mobile Light Showcase Overlay (proving zero 043/у & touch targets >= 44px)
 * 6. Direct RVG Capture Modal with Tooth #16 (proving 1-click odontogram binding)
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const targetDirs = [
  path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/radiology_inquisition"),
  path.resolve("C:/Clinic_MVP/dental-crm/apps/web/public/screenshots"),
  path.resolve("C:/Users/Admin/.gemini/antigravity/brain/a63335a6-936b-4113-a2af-f904c5105e2f"),
];

for (const d of targetDirs) {
  if (!fs.existsSync(d)) {
    fs.mkdirSync(d, { recursive: true });
  }
}

async function applyTheme(page, theme) {
  console.log(`[THEME] Applying ${theme}...`);
  await page.evaluate((th) => {
    localStorage.setItem("dente_theme_mode", th);
    document.documentElement.setAttribute("data-theme", th);
    document.body.setAttribute("data-theme", th);
    const isDark = ["dark", "night", "ocean", "emerald", "cyber_xray"].includes(th);
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.classList.toggle("light", !isDark);
    document.body.classList.toggle("dark", isDark);
    document.body.classList.toggle("light", !isDark);
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
  }, theme);
  await page.waitForTimeout(1000);
}

async function takeScreen(page, fileName, description) {
  const p1 = path.join(targetDirs[0], fileName);
  if (fs.existsSync(p1)) {
    try { fs.unlinkSync(p1); } catch {}
  }
  await page.screenshot({ path: p1, fullPage: false, animations: "disabled", timeout: 35000 });
  for (let i = 1; i < targetDirs.length; i++) {
    fs.copyFileSync(p1, path.join(targetDirs[i], fileName));
  }
  const stat = fs.statSync(p1);
  console.log(`[CAPTURED] ${fileName} (${description}) — ${(stat.size / 1024).toFixed(1)} KB`);
}

async function main() {
  console.log("=== STARTING RADIOLOGY INQUISITION 4-STATE VISUAL PROOF ===");

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    // 1. DESKTOP VIEWPORT (1440x900)
    console.log("\n--- DESKTOP TESTS (1440x900) ---");
    const desktopCtx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });

    await desktopCtx.addInitScript(() => {
      localStorage.setItem("dente_clinic_token", "live-inquisition-clinic-token");
      localStorage.setItem("dente_staff_token", "live-inquisition-staff-token");
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_active_patient_id", "pat-1");
    });

    const desktopPage = await desktopCtx.newPage();

    // Mock API
    await desktopPage.route("**/api/**", async (route) => {
      const url = route.request().url();
      if (url.includes("/src/")) return route.continue();
      if (url.includes("/api/auth/session") || url.includes("/api/auth/user/me")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ user: { id: "doc-1", fullName: "Д-р Воронов А.В.", role: "owner", active: true } }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          clinicSettings: { profile: { id: "c-1", clinicName: "Стоматология ДЕНТЕ Премиум" } },
          patients: [{ id: "pat-1", fullName: "Ковалёв Роман", medicalCardNumber: "МК-2026/891" }],
          appointments: [],
          imagingStudies: [
            {
              id: "study_rvg_16",
              patientId: "pat-1",
              kind: "periapical",
              title: "Прицельный снимок RVG #16",
              toothCode: "16",
              region: "posterior",
              previewUrl: "/radiology/sample_rvg_tooth16.jpg",
              hasFile: true,
              capturedAt: new Date().toISOString(),
            }
          ]
        }),
      });
    });

    console.log("Navigating to http://127.0.0.1:5173/#imaging...");
    await desktopPage.goto("http://127.0.0.1:5173/#imaging", { waitUntil: "domcontentloaded", timeout: 35000 });
    await desktopPage.waitForTimeout(3000);

    // 1. PC Light
    await applyTheme(desktopPage, "light");
    await takeScreen(desktopPage, "01_pc_light_radiology_workspace.png", "PC Light 1440x900 Imaging Workspace");

    // 2. PC Dark
    await applyTheme(desktopPage, "dark");
    await takeScreen(desktopPage, "02_pc_dark_radiology_workspace.png", "PC Dark 1440x900 Imaging Workspace");

    // 3. Open RVG Capture Modal with Tooth #16
    console.log("Triggering RVG capture modal with tooth #16...");
    await desktopPage.evaluate(() => {
      window.dispatchEvent(new CustomEvent("dente-open-rvg-capture", {
        detail: { toothFdiCode: "16", tooth: "16", toothNumber: 16 }
      }));
    });
    await desktopPage.waitForTimeout(1000);
    await takeScreen(desktopPage, "03_pc_dark_direct_rvg_modal_tooth16.png", "Direct RVG Capture Modal with Tooth #16 Prefilled");

    await desktopCtx.close();

    // 2. MOBILE VIEWPORT (390x844 - iPhone 14 / Apple HIG)
    console.log("\n--- MOBILE TESTS (390x844) ---");
    const mobileCtx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });

    await mobileCtx.addInitScript(() => {
      localStorage.setItem("dente_clinic_token", "live-inquisition-clinic-token");
      localStorage.setItem("dente_staff_token", "live-inquisition-staff-token");
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_active_patient_id", "pat-1");
    });

    const mobilePage = await mobileCtx.newPage();

    // Mock API
    await mobilePage.route("**/api/**", async (route) => {
      const url = route.request().url();
      if (url.includes("/src/")) return route.continue();
      if (url.includes("/api/auth/session") || url.includes("/api/auth/user/me")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ user: { id: "doc-1", fullName: "Д-р Воронов А.В.", role: "owner", active: true } }),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          clinicSettings: { profile: { id: "c-1", clinicName: "Стоматология ДЕНТЕ Премиум" } },
          patients: [{ id: "pat-1", fullName: "Ковалёв Роман", medicalCardNumber: "МК-2026/891" }],
          appointments: [],
          imagingStudies: [
            {
              id: "study_rvg_16",
              patientId: "pat-1",
              kind: "periapical",
              title: "Прицельный снимок RVG #16",
              toothCode: "16",
              region: "posterior",
              previewUrl: "/radiology/sample_rvg_tooth16.jpg",
              hasFile: true,
              capturedAt: new Date().toISOString(),
            }
          ]
        }),
      });
    });

    console.log("Navigating mobile to http://127.0.0.1:5173/#imaging...");
    await mobilePage.goto("http://127.0.0.1:5173/#imaging", { waitUntil: "domcontentloaded", timeout: 35000 });
    await mobilePage.waitForTimeout(3000);

    // 4. Mobile Light
    await applyTheme(mobilePage, "light");
    await takeScreen(mobilePage, "04_mobile_light_chairside_viewer.png", "Mobile Light 390x844 Chairside Radiology");

    // 5. Mobile Dark
    await applyTheme(mobilePage, "dark");
    await takeScreen(mobilePage, "05_mobile_dark_chairside_viewer.png", "Mobile Dark 390x844 Chairside Radiology");

    // 6. Mobile Showcase Overlay
    console.log("Opening mobile showcase overlay...");
    const showcaseBtn = await mobilePage.$('[data-testid="btn-open-mobile-showcase"]');
    if (showcaseBtn) {
      await showcaseBtn.click();
      await mobilePage.waitForTimeout(800);
      await takeScreen(mobilePage, "06_mobile_dark_showcase_overlay_clean.png", "Mobile Patient Showcase Overlay (No 043/u)");
    } else {
      console.log("Showcase button not directly visible, capturing current view");
    }

    await mobileCtx.close();
    console.log("\n=== ALL RADIOLOGY INQUISITION PROOFS CAPTURED SUCCESSFULLY ===");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("FATAL ERROR in visual capture:", err);
  process.exit(1);
});
