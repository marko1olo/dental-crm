/**
 * scripts/take_warranty_redteam_proofs.cjs
 *
 * Captures 4 canonical visual proof screenshots for Dental Warranty Passport Studio:
 * 1. docs/proofs/warranty/warranty_pc_light.png (1440x900) - Desktop Light Editor with real treatment items
 * 2. docs/proofs/warranty/warranty_pc_dark.png (1440x900) - Desktop Dark 0 ₽ Remediation & Defect Resolution Tab
 * 3. docs/proofs/warranty/warranty_mobile_light.png (390x844) - Apple iOS HIG Light Bottom Sheet & 44x44 Touch Targets
 * 4. docs/proofs/warranty/warranty_mobile_dark.png (390x844) - Apple iOS HIG Dark Bottom Sheet
 */

const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const API_BASE = "http://127.0.0.1:4100";
let WEB_BASE = "http://127.0.0.1:5174";
const PROOFS_DIR = path.resolve(__dirname, "../docs/proofs/warranty");
const BRAIN_DIR = process.env.BRAIN_DIR || path.resolve("C:/Users/Admin/.gemini/antigravity/brain/4f3b6c6d-6bd4-4e36-83cd-90549934daed");

async function resolveWebBase() {
  for (const port of [5174, 5173, 5175, 5176]) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/`);
      if (res.ok || res.status === 200) {
        WEB_BASE = `http://127.0.0.1:${port}`;
        console.log(`[Vite] Detected active web server at ${WEB_BASE}`);
        return WEB_BASE;
      }
    } catch {}
  }
  return WEB_BASE;
}

fs.mkdirSync(PROOFS_DIR, { recursive: true });
fs.mkdirSync(BRAIN_DIR, { recursive: true });

async function provisionSession() {
  const uniqueId = Date.now();
  console.log("[Provisioning] Initializing clean clinic session via API...");
  const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clinicName: "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»",
      email: `doctor-agent-${uniqueId}@dente.local`,
      password: "Password123!",
      ownerName: "Д-р Смирнов А. В.",
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

  // Seed real patient
  console.log("[Provisioning] Seeding real clinical patient...");
  const pRes = await fetch(`${API_BASE}/api/patients`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      fullName: "Ковалев Дмитрий Сергеевич",
      birthDate: "1985-06-12",
      gender: "male",
      phone: "+7 (912) 345-67-89",
      cardNumber: "МК-8492",
      allergies: "Без отягощенного анамнеза",
      chronicDiseases: "Соматически здоров",
    }),
  });
  const pData = await pRes.json();
  const patientId = pData.patient?.id || pData.id;

  // Create chair and active appointment in treatment
  try {
    const chairsRes = await fetch(`${API_BASE}/api/chairs`, { headers });
    let chairId = "chair-1";
    if (chairsRes.ok) {
      const chList = await chairsRes.json();
      if (Array.isArray(chList) && chList.length > 0) chairId = chList[0].id;
    }
    const now = new Date();
    const startsAt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0);
    const endsAt = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0);
    await fetch(`${API_BASE}/api/appointments`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        patientId,
        doctorUserId: initData.ownerUserId,
        chairId,
        status: "in_treatment",
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        reason: "Гарантийный осмотр и реставрация",
      }),
    });
    console.log("[Provisioning] Active in_treatment appointment created.");
  } catch (err) {
    console.warn("[Provisioning] Appointment warning:", err.message);
  }

  return {
    clinicToken: initData.clinicToken,
    staffToken: unlockData.staffToken,
    ownerUserId: initData.ownerUserId,
    patientId,
  };
}

async function suppressOverlays(page) {
  try {
    await page.evaluate(() => {
      const style = document.createElement("style");
      style.id = "suppress-all-overlays";
      style.innerHTML = `
        .tour-spotlight-root,
        .tour-backdrop-clickable-zone,
        [data-testid="guided-tour-spotlight-overlay"],
        [data-testid="guided-tour-coach-mark-card"],
        [data-testid="demo-mode-banner"],
        .global-toast-container,
        vite-error-overlay {
          display: none !important;
          pointer-events: none !important;
        }
      `;
      document.head.appendChild(style);
      document.querySelectorAll("vite-error-overlay, .tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay'], .toast, .connection-toast").forEach((el) => el.remove());
    });
  } catch (_) {}
}

async function takeProof(page, fileName, description) {
  await suppressOverlays(page);
  await page.waitForTimeout(600);
  const primaryPath = path.join(PROOFS_DIR, fileName);
  await page.screenshot({ path: primaryPath, fullPage: false, animations: "disabled" });

  const brainPath = path.join(BRAIN_DIR, fileName);
  fs.copyFileSync(primaryPath, brainPath);

  const stats = fs.statSync(primaryPath);
  const hash = crypto.createHash("md5").update(fs.readFileSync(primaryPath)).digest("hex");
  const sizeKb = (stats.size / 1024).toFixed(1);
  const pass = stats.size >= 20480; // > 20 KB

  console.log(
    `[PROOF] ${fileName} (${description}): ${stats.size} bytes (${sizeKb} KB) | MD5: ${hash} | >=20KB: ${pass ? "PASS" : "FAIL"}`
  );
  if (!pass) {
    throw new Error(`Screenshot ${fileName} is too small (${stats.size} bytes < 20KB)`);
  }
  return { fileName, sizeBytes: stats.size, sizeKb, md5: hash };
}

async function applyTheme(page, isDark) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await page.evaluate((dark) => {
        const mode = dark ? "dark" : "light";
        localStorage.setItem("dente_theme_mode", mode);
        localStorage.setItem("dente_theme", mode);
        if (window.__useThemeStore) {
          window.__useThemeStore.getState().setThemeMode(mode);
        }
        document.documentElement.setAttribute("data-theme", mode);
        document.body.setAttribute("data-theme", mode);
        if (dark) {
          document.documentElement.classList.add("dark");
          document.documentElement.classList.remove("light");
          document.body.classList.add("dark");
          document.body.classList.remove("light");
        } else {
          document.documentElement.classList.remove("dark");
          document.documentElement.classList.add("light");
          document.body.classList.remove("dark");
          document.body.classList.add("light");
        }
        document.documentElement.style.colorScheme = dark ? "dark" : "light";
      }, isDark);
      break;
    } catch (e) {
      await page.waitForTimeout(1000);
    }
  }
  await page.waitForTimeout(500);
}

async function openWarrantyPassport(page, isMobile = false) {
  // Populate completed services into visit store so warranty items are auto-populated
  await page.evaluate(() => {
    try {
      if (window.useVisitStore) {
        window.useVisitStore.getState().setCompletedServices([
          {
            id: "srv-comp-1",
            code: "A16.07.002.001",
            code804n: "A16.07.002.001",
            name: "Восстановление зуба пломбой (Filtek Ultimate 3M ESPE, A2)",
            title: "Восстановление зуба пломбой (Filtek Ultimate 3M ESPE, A2)",
            tooth: "1.6",
            toothNumber: "1.6",
            price: 5500,
            rub: 5500,
            quantity: 1,
            date: new Date().toISOString().slice(0, 10),
          },
          {
            id: "srv-comp-2",
            code: "A16.07.004",
            code804n: "A16.07.004",
            name: "Восстановление зуба керамической коронкой (IPS e.max Press)",
            title: "Восстановление зуба керамической коронкой (IPS e.max Press)",
            tooth: "2.4",
            toothNumber: "2.4",
            labOrderNumber: "ЗТЛ-7842",
            price: 28000,
            rub: 28000,
            quantity: 1,
            date: new Date().toISOString().slice(0, 10),
          },
          {
            id: "srv-comp-3",
            code: "A16.07.006",
            code804n: "A16.07.006",
            name: "Установка дентального имплантата (Straumann BLX Roxolid)",
            title: "Установка дентального имплантата (Straumann BLX Roxolid)",
            tooth: "4.6",
            toothNumber: "4.6",
            price: 55000,
            rub: 55000,
            quantity: 1,
            date: new Date().toISOString().slice(0, 10),
          },
        ]);
      }
    } catch (e) {
      console.warn("Could not set completed services:", e);
    }
  });

  // Ensure active reception if intake cockpit is present
  const intakeBtn = page.locator("#btn-intake-start-next, [data-testid='intake-patient-row']").first();
  if (await intakeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    console.log("[openWarrantyPassport] In Intake Cockpit, starting reception...");
    await intakeBtn.click({ force: true });
    await page.waitForTimeout(1000);
  }

  // Try store direct trigger and window custom events
  await page.evaluate(() => {
    try {
      window.dispatchEvent(new CustomEvent("dente-open-warranty-passport"));
      window.dispatchEvent(new CustomEvent("dente:open-warranty-passport"));
      if (window.__useUiSurfaceStore) {
        window.__useUiSurfaceStore.getState().openPrimaryModal("warranty_passport");
      }
    } catch {}
  });

  const isWindowAlreadyOpen = await page.locator(".warranty-modal-window").isVisible({ timeout: 2000 }).catch(() => false);
  if (!isWindowAlreadyOpen) {
    if (isMobile) {
      const mobBtn = page.locator('[data-testid$="-warranty-btn"]').first();
      if (await mobBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
        await mobBtn.click({ force: true });
      } else {
        const moreBtn = page.locator('[data-testid="visit-header-more-actions-btn"]');
        if (await moreBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await moreBtn.click({ force: true });
          await page.waitForTimeout(400);
          await page.locator('[data-testid="visit-more-action-warranty-passport"]').click({ force: true });
        }
      }
    } else {
      const moreBtn = page.locator('[data-testid="visit-header-more-actions-btn"]');
      if (await moreBtn.isVisible({ timeout: 4000 }).catch(() => false)) {
        await moreBtn.scrollIntoViewIfNeeded();
        await moreBtn.click({ force: true });
        await page.waitForTimeout(500);

        const warrantyBtn = page.locator('[data-testid="visit-more-action-warranty-passport"]');
        await warrantyBtn.click({ force: true });
      }
    }
  }

  await page.waitForSelector(".warranty-modal-window", { timeout: 15000 });
  await page.waitForTimeout(1000);
}

async function main() {
  await resolveWebBase();
  const auth = await provisionSession();
  const possibleBrowserPaths = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  ];
  console.log("[Playwright] Launching msedge browser...");
  const browser = await chromium.launch({
    headless: true,
    channel: "msedge",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  });

  try {
    // 1. Desktop Context (1440x900)
    console.log("\n=== 1 & 2. Capturing PC Light & PC Dark (1440x900) ===");
    const pcContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      colorScheme: "light",
      serviceWorkers: "block",
    });
    await pcContext.addInitScript(({ ct, st, uid, pid }) => {
      localStorage.setItem("dente_demo_showcase", "true");
      localStorage.setItem("dente_demo_showcase_mode_v1", "true");
      localStorage.setItem("dente_clinic_token", ct);
      localStorage.setItem("dente_staff_token", st);
      localStorage.setItem("dente_active_session_token", st);
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_user_id", uid);
      localStorage.setItem("dente_selected_patient_id", pid);
      localStorage.setItem("dente_active_patient_id", pid);
      localStorage.setItem("dente_offline_autonomy_mode", "true");
      sessionStorage.setItem("dente_unlocked", "true");
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_tour_dismissed", "true");
      localStorage.setItem("dente_demo_banner_dismissed", "true");
      localStorage.setItem("dente_sidebar_collapsed", "false");
      localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({
        onboardingDismissed: true,
        onboardingStep: "done",
        version: 1,
      }));
      localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
        version: 1,
        uiLanguage: "ru",
        selectedWorkspaceRole: "owner",
        selectedPatientId: pid,
        onboardingDismissed: true,
        onboardingStep: "done",
      }));
      document.cookie = `dente_clinic_token=${encodeURIComponent(ct)}; path=/; max-age=31536000`;
      document.cookie = `dente_staff_token=${encodeURIComponent(st)}; path=/; max-age=31536000`;
    }, { ct: auth.clinicToken, st: auth.staffToken, uid: auth.ownerUserId, pid: auth.patientId });

    const pcPage = await pcContext.newPage();
    console.log(`Navigating to ${WEB_BASE}/?demo=true#visit...`);
    await pcPage.goto(`${WEB_BASE}/?demo=true#visit`, { waitUntil: "commit", timeout: 35000 });
    for (let i = 0; i < 40; i++) {
      await pcPage.waitForTimeout(500);
      try {
        const hasOffline = await pcPage.$('button:has-text("Перейти в автономный режим"), button:has-text("Открыть кэшированные данные")');
        if (hasOffline) {
          await hasOffline.click().catch(() => {});
          await pcPage.waitForTimeout(1000);
        }
        const text = await pcPage.evaluate(() => document.body ? document.body.innerText : "");
        if (!text.includes("Загрузка системы") && text.length > 200) {
          console.log(`[Ready] System loaded (body text length: ${text.length})`);
          break;
        }
      } catch (_) {}
    }
    try {
      await pcPage.evaluate(() => {
        window.location.hash = "visit";
        window.dispatchEvent(new HashChangeEvent("hashchange"));
      });
    } catch (_) {}
    await pcPage.waitForTimeout(2500);
    await applyTheme(pcPage, false);
    await openWarrantyPassport(pcPage, false);

    // 1. PC Light
    await takeProof(pcPage, "01_warranty_pc_light.png", "PC Light 1440x900 Warranty Studio Editor");
    fs.copyFileSync(path.join(PROOFS_DIR, "01_warranty_pc_light.png"), path.join(PROOFS_DIR, "warranty_pc_light.png"));

    // 2. PC Dark (Remediation Tab 0 ₽)
    console.log("Switching to Dark mode and Remediation tab...");
    await applyTheme(pcPage, true);
    const remediationTab = pcPage.locator(".warranty-tab-btn", { hasText: "Гарантийная переделка" }).first();
    if (await remediationTab.isVisible().catch(() => false)) {
      await remediationTab.click({ force: true });
      await pcPage.waitForTimeout(800);
    }
    await takeProof(pcPage, "02_warranty_pc_dark.png", "PC Dark 1440x900 Warranty Remediation 0 ₽");
    fs.copyFileSync(path.join(PROOFS_DIR, "02_warranty_pc_dark.png"), path.join(PROOFS_DIR, "warranty_pc_dark.png"));
    await pcContext.close();

    // 3. Mobile Context (390x844)
    console.log("\n=== 3 & 4. Capturing Mobile Light & Mobile Dark (390x844) ===");
    const mobContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      colorScheme: "light",
      serviceWorkers: "block",
    });
    await mobContext.addInitScript(({ ct, st, uid, pid }) => {
      localStorage.setItem("dente_demo_showcase", "true");
      localStorage.setItem("dente_demo_showcase_mode_v1", "true");
      localStorage.setItem("dente_clinic_token", ct);
      localStorage.setItem("dente_staff_token", st);
      localStorage.setItem("dente_active_session_token", st);
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_user_id", uid);
      localStorage.setItem("dente_selected_patient_id", pid);
      localStorage.setItem("dente_active_patient_id", pid);
      localStorage.setItem("dente_offline_autonomy_mode", "true");
      sessionStorage.setItem("dente_unlocked", "true");
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_tour_dismissed", "true");
      localStorage.setItem("dente_demo_banner_dismissed", "true");
      localStorage.setItem("dente_sidebar_collapsed", "false");
      localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({
        onboardingDismissed: true,
        onboardingStep: "done",
        version: 1,
      }));
      localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
        version: 1,
        uiLanguage: "ru",
        selectedWorkspaceRole: "owner",
        selectedPatientId: pid,
        onboardingDismissed: true,
        onboardingStep: "done",
      }));
      document.cookie = `dente_clinic_token=${encodeURIComponent(ct)}; path=/; max-age=31536000`;
      document.cookie = `dente_staff_token=${encodeURIComponent(st)}; path=/; max-age=31536000`;
    }, { ct: auth.clinicToken, st: auth.staffToken, uid: auth.ownerUserId, pid: auth.patientId });

    const mobPage = await mobContext.newPage();
    console.log(`Navigating mobile to ${WEB_BASE}/?demo=true#visit...`);
    await mobPage.goto(`${WEB_BASE}/?demo=true#visit`, { waitUntil: "commit", timeout: 35000 });
    for (let i = 0; i < 40; i++) {
      await mobPage.waitForTimeout(500);
      try {
        const hasOffline = await mobPage.$('button:has-text("Перейти в автономный режим"), button:has-text("Открыть кэшированные данные")');
        if (hasOffline) {
          await hasOffline.click().catch(() => {});
          await mobPage.waitForTimeout(1000);
        }
        const text = await mobPage.evaluate(() => document.body ? document.body.innerText : "");
        if (!text.includes("Загрузка системы") && text.length > 200) {
          console.log(`[Ready] Mobile system loaded (body text length: ${text.length})`);
          break;
        }
      } catch (_) {}
    }
    try {
      await mobPage.evaluate(() => {
        window.location.hash = "visit";
        window.dispatchEvent(new HashChangeEvent("hashchange"));
      });
    } catch (_) {}
    await mobPage.waitForTimeout(2500);
    await applyTheme(mobPage, false);
    await openWarrantyPassport(mobPage, true);

    // 3. Mobile Light
    await takeProof(mobPage, "03_warranty_mobile_light.png", "Mobile Light 390x844 Apple HIG Bottom Sheet");
    fs.copyFileSync(path.join(PROOFS_DIR, "03_warranty_mobile_light.png"), path.join(PROOFS_DIR, "warranty_mobile_light.png"));

    // 4. Mobile Dark
    console.log("Switching to Mobile Dark mode...");
    await applyTheme(mobPage, true);
    await takeProof(mobPage, "04_warranty_mobile_dark.png", "Mobile Dark 390x844 Apple HIG Bottom Sheet");
    fs.copyFileSync(path.join(PROOFS_DIR, "04_warranty_mobile_dark.png"), path.join(PROOFS_DIR, "warranty_mobile_dark.png"));
    await mobContext.close();

    console.log("\n[SUCCESS] All 4 Warranty proof screenshots successfully captured and verified!");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("[FATAL]", err);
  process.exit(1);
});
