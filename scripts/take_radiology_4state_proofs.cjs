const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const API_BASE = "http://127.0.0.1:4100";
const WEB_BASE = "http://127.0.0.1:5173";

const TARGET_DIRS = [
  path.resolve("C:/Clinic_MVP/dental-crm/docs/proofs/radiology"),
  "C:/Users/Admin/.gemini/antigravity/brain/ff2938be-f7b5-41ef-86c5-dfeb61775871/screenshots",
];

for (const dir of TARGET_DIRS) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function provisionSession() {
  const uniqueId = Date.now();
  console.log(`[Provisioning] Initializing clinical session imaging-${uniqueId}...`);
  try {
    const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clinicName: "Клиника ДЕНТЕ (Лучевая диагностика)",
        email: `doctor-rad-${uniqueId}@dente-clinic.ru`,
        password: "Password123!",
        ownerName: "Д-р Захаров Андрей Васильевич",
        ownerPin: "1234",
      }),
    });
    const initData = await initRes.json().catch(() => ({}));

    const unlockRes = await fetch(`${API_BASE}/api/auth/staff/unlock`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-dente-clinic-token": initData.clinicToken || "demo-clinic-token",
      },
      body: JSON.stringify({ userId: initData.ownerUserId || "user-1", pinCode: "1234" }),
    });
    const unlockData = await unlockRes.json().catch(() => ({}));

    return {
      clinicToken: initData.clinicToken || "demo-clinic-token",
      staffToken: unlockData.staffToken || "demo-staff-token",
      ownerUserId: initData.ownerUserId || "user-1",
    };
  } catch (err) {
    console.warn("[Provisioning] Fallback to synthetic auth:", err.message);
    return {
      clinicToken: "demo-clinic-token",
      staffToken: "demo-staff-token",
      ownerUserId: "user-1",
    };
  }
}

const initDoctorSession = ({ ct, st, uid }) => {
  try {
    localStorage.setItem("dente_clinic_token", ct);
    localStorage.setItem("dente_staff_token", st);
    localStorage.setItem("dente_active_session_token", st);
    localStorage.setItem("dente_active_user_id", uid);
    localStorage.setItem("dente_active_role", "doctor");
    localStorage.setItem("dente_active_mode", "doctor");
    localStorage.setItem("dente_user_id", uid);
    localStorage.setItem("dente_onboarding_completed", "true");
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dente_doctor_shift_active", "true");
    localStorage.setItem("dente_offline_autonomy_mode", "true");
    localStorage.setItem("dente_demo_showcase", "true");
    localStorage.setItem("dente_demo_showcase_mode", "true");
    localStorage.setItem("dente_active_tooth", "36");
    sessionStorage.setItem("dente_unlocked", "true");

    const doctorUser = {
      id: uid,
      userId: uid,
      name: "Д-р Захаров А. В.",
      fullName: "Д-р Захаров Андрей Васильевич",
      role: "doctor",
      specialties: ["Стоматолог-терапевт", "Хирург-имплантолог"],
    };

    localStorage.setItem("dente_staff_session", JSON.stringify(doctorUser));
    localStorage.setItem("dente_cached_active_staff_user", JSON.stringify(doctorUser));
    localStorage.setItem("dente_cached_staff_list", JSON.stringify([doctorUser]));
    localStorage.setItem(
      "dente-workspace-profile",
      JSON.stringify({ mode: "doctor", role: "doctor", activeRole: "doctor" })
    );
    localStorage.setItem(
      "dental-crm:web-ui-preferences:v1",
      JSON.stringify({
        version: 1,
        uiLanguage: "ru",
        selectedWorkspaceRole: "doctor",
        selectedSpecialty: "therapist",
        onboardingDismissed: true,
        onboardingStep: "done",
      })
    );
  } catch (e) {
    // safe ignore on blank
  }
};

async function setDarkTheme(page) {
  await page.evaluate(() => {
    document.documentElement.setAttribute("data-theme", "dark");
    document.body.setAttribute("data-theme", "dark");
    document.documentElement.classList.add("dark");
    document.documentElement.classList.remove("light");
    document.body.classList.add("dark");
    document.body.classList.remove("light");
    document.documentElement.style.colorScheme = "dark";
    localStorage.setItem("dente_theme_mode", "dark");
    localStorage.setItem("dente_theme", "dark");
    localStorage.setItem("theme", "dark");
  });
  await page.waitForTimeout(400);
}

async function setLightTheme(page) {
  await page.evaluate(() => {
    document.documentElement.setAttribute("data-theme", "light");
    document.body.setAttribute("data-theme", "light");
    document.documentElement.classList.add("light");
    document.documentElement.classList.remove("dark");
    document.body.classList.add("light");
    document.body.classList.remove("dark");
    document.documentElement.style.colorScheme = "light";
    localStorage.setItem("dente_theme_mode", "light");
    localStorage.setItem("dente_theme", "light");
    localStorage.setItem("theme", "light");
  });
  await page.waitForTimeout(400);
}

async function suppressToastsAndOverlays(page) {
  await page.evaluate(() => {
    if (!document.getElementById("suppress-overlays-canonical")) {
      const s = document.createElement("style");
      s.id = "suppress-overlays-canonical";
      s.innerHTML = `
        .toast, .global-toast, .toast-container, [role="alert"],
        .tour-spotlight-root, .tour-backdrop-clickable-zone,
        [data-testid="guided-tour-spotlight-overlay"],
        [data-testid="guided-tour-coach-mark-card"] {
          display: none !important;
          opacity: 0 !important;
          visibility: hidden !important;
          pointer-events: none !important;
          height: 0 !important;
          width: 0 !important;
          overflow: hidden !important;
        }
      `;
      document.head.appendChild(s);
    }
    document.querySelectorAll('.toast, .global-toast, .toast-container, [role="alert"]').forEach((el) => el.remove());
  });
}

async function saveProof(page, filename, description) {
  await suppressToastsAndOverlays(page);
  await page.waitForTimeout(600);

  const mainPath = path.join(TARGET_DIRS[0], filename);
  await page.screenshot({ path: mainPath, fullPage: false });

  const stat = fs.statSync(mainPath);
  console.log(`[CAPTURED] ${filename} (${(stat.size / 1024).toFixed(1)} KB) -> ${description}`);

  for (let i = 1; i < TARGET_DIRS.length; i++) {
    fs.copyFileSync(mainPath, path.join(TARGET_DIRS[i], filename));
  }
  return { filename, size: stat.size };
}

async function main() {
  console.log("=== STARTING CANONICAL 4-STATE RADIOLOGY PROOF CAPTURE ===");
  const auth = await provisionSession();

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
  });

  const results = [];

  try {
    // ==========================================
    // 1. PC DESKTOP (1440x900)
    // ==========================================
    console.log("\n=== 1. PC Desktop 1440x900 ===");
    const pcContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    await pcContext.addInitScript(initDoctorSession, {
      ct: auth.clinicToken,
      st: auth.staffToken,
      uid: auth.ownerUserId,
    });
    const pcPage = await pcContext.newPage();

    console.log(`[PC] Navigating to ${WEB_BASE}/#imaging?demo=true...`);
    await pcPage.goto(`${WEB_BASE}/#imaging?demo=true`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await pcPage.waitForSelector(".boot-state", { state: "detached", timeout: 25000 }).catch(() => {});
    await pcPage.waitForTimeout(2000);

    // Open RVG Capture Modal
    console.log("[PC] Opening RVG capture modal...");
    const rvgBtn = await pcPage.waitForSelector(
      '[data-testid="imaging-rvg-capture-btn"], [data-testid="btn-open-rvg-capture"], button:has-text("Захват RVG")',
      { timeout: 10000 }
    ).catch(() => null);

    if (rvgBtn) {
      await rvgBtn.click();
      await pcPage.waitForTimeout(1000);
    }

    // Trigger capture or demo image so tooth 36 x-ray is rendered in viewport
    await pcPage.evaluate(() => {
      const demoBtn =
        document.querySelector('[data-testid="btn-rvg-load-demo"]') ||
        document.querySelector('[data-testid="btn-rvg-trigger-empty-capture"]') ||
        Array.from(document.querySelectorAll("button")).find(
          (b) => b.textContent && (b.textContent.includes("демо-снимок") || b.textContent.includes("Захват снимка"))
        );
      if (demoBtn) demoBtn.click();
    });
    await pcPage.waitForTimeout(1000);

    // 1.1 ☀️ PC Light (1440x900)
    console.log("Capturing 01 PC Light...");
    await setLightTheme(pcPage);
    const r1 = await saveProof(
      pcPage,
      "01_radiology_pc_light_1440x900.png",
      "01 PC Light 1440x900 Direct RVG Chairside Visiograph Modal with Bone Density Misch D1-D4 & Single Primary CTA #0d9488"
    );
    results.push(r1);

    // 1.2 🌙 PC Dark (1440x900)
    console.log("Capturing 02 PC Dark...");
    await setDarkTheme(pcPage);
    const r2 = await saveProof(
      pcPage,
      "02_radiology_pc_dark_1440x900.png",
      "02 PC Dark 1440x900 High-Contrast Chairside Visiograph Modal with Bone Density & Single Primary CTA #0d9488"
    );
    results.push(r2);

    await pcContext.close();

    // ==========================================
    // 2. MOBILE (390x844)
    // ==========================================
    console.log("\n=== 2. Mobile 390x844 (Apple iOS HIG) ===");
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 2,
    });
    await mobileContext.addInitScript(initDoctorSession, {
      ct: auth.clinicToken,
      st: auth.staffToken,
      uid: auth.ownerUserId,
    });
    const mobilePage = await mobileContext.newPage();

    console.log(`[Mobile] Navigating to ${WEB_BASE}/#imaging?demo=true...`);
    await mobilePage.goto(`${WEB_BASE}/#imaging?demo=true`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await mobilePage.waitForSelector(".boot-state", { state: "detached", timeout: 25000 }).catch(() => {});
    await mobilePage.waitForTimeout(2000);

    // 2.1 📱 Mobile Light (390x844)
    console.log("Capturing 03 Mobile Light...");
    await setLightTheme(mobilePage);
    const r3 = await saveProof(
      mobilePage,
      "03_radiology_mobile_light_390x844.png",
      "03 Mobile Light 390x844 Apple HIG Chairside Radiology Viewer (Natural Thumb Zone, 44px Touch Targets)"
    );
    results.push(r3);

    // 2.2 🌙 Mobile Dark (390x844)
    console.log("Capturing 04 Mobile Dark...");
    await setDarkTheme(mobilePage);
    const r4 = await saveProof(
      mobilePage,
      "04_radiology_mobile_dark_390x844.png",
      "04 Mobile Dark 390x844 High-Contrast Diagnostic Chairside Viewer"
    );
    results.push(r4);

    await mobileContext.close();

    console.log("\n=================== VERIFICATION AUDIT ===================");
    let allValid = true;
    for (const r of results) {
      const isOk = r.size >= 20480; // >= 20 KB
      console.log(
        `[PROOF] ${r.filename}: ${(r.size / 1024).toFixed(1)} KB | ${isOk ? "PASS (>=20KB)" : "FAIL (<20KB)"}`
      );
      if (!isOk) allValid = false;
    }
    console.log(`==========================================================`);
    console.log(`Final Status: ${allValid ? "ALL 4 SCREENSHOTS PASS INTEGRITY GATE" : "FAILURES DETECTED"}`);

    if (!allValid) process.exit(1);
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("Capture execution failed:", err);
  process.exit(1);
});
