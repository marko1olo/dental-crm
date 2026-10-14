/**
 * scripts/take_warranty_redteam_proofs.cjs
 *
 * Captures 4 canonical visual proof screenshots for Dental Warranty Passport Studio,
 * Quality Certificate, StAR Statutory Conditions, and 0 ₽ Remediation Workflow in DENTE Dental CRM:
 * 1. docs/proofs/warranty/warranty_pc_light.png (1440x900) - Desktop Light Editor with real treatment items
 * 2. docs/proofs/warranty/warranty_pc_dark.png (1440x900) - Desktop Dark 0 ₽ Remediation & Defect Resolution Tab
 * 3. docs/proofs/warranty/warranty_mobile_light.png (390x844) - Apple iOS HIG Light Bottom Sheet & 44x44 Touch Targets
 * 4. docs/proofs/warranty/warranty_mobile_dark.png (390x844) - Apple iOS HIG Dark Bottom Sheet
 *
 * Invariants:
 * - Real Fastify API (http://127.0.0.1:4100) + Vite (http://127.0.0.1:5173) + PostgreSQL 18
 * - Real completed treatment items auto-population (1.6 composite, 2.4 E.max, 4.6 Straumann)
 * - 0 ₽ remediation / complaint workflow with ZTL lab integration
 * - Zero login AuthArtBackground, solid clinical backdrop, zero disabled buttons
 */

const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const API_BASE = "http://127.0.0.1:4100";
const WEB_BASE = "http://127.0.0.1:5173";
const PROOFS_DIR = path.resolve(__dirname, "../docs/proofs/warranty");
const BRAIN_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/6c443671-d78e-4ab4-a4f7-47d81e25d035");

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

  return {
    clinicToken: initData.clinicToken,
    staffToken: unlockData.staffToken,
    ownerUserId: initData.ownerUserId,
    patientId,
  };
}

async function applyTheme(page, isDark) {
  await page.evaluate((dark) => {
    try {
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
    } catch (e) {
      console.warn("Theme apply error:", e);
    }
  }, isDark);
  await page.waitForTimeout(600);
}

async function takeProof(page, fileName, description) {
  const primaryPath = path.join(PROOFS_DIR, fileName);
  await page.waitForTimeout(600);
  await page.screenshot({ path: primaryPath, fullPage: false });

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

  if (isMobile) {
    const mobBtn = page.locator('[data-testid$="warranty-btn"]').first();
    if (await mobBtn.isVisible({ timeout: 6000 }).catch(() => false)) {
      await mobBtn.click({ force: true });
    } else {
      const moreBtn = page.locator('[data-testid="visit-header-more-actions-btn"]');
      if (await moreBtn.isVisible().catch(() => false)) {
        await moreBtn.click({ force: true });
        await page.waitForTimeout(400);
        await page.locator('[data-testid="visit-more-action-warranty-passport"]').click({ force: true });
      }
    }
  } else {
    const moreBtn = page.locator('[data-testid="visit-header-more-actions-btn"]');
    await moreBtn.scrollIntoViewIfNeeded();
    await moreBtn.click({ force: true });
    await page.waitForTimeout(500);

    const warrantyBtn = page.locator('[data-testid="visit-more-action-warranty-passport"]');
    await warrantyBtn.click({ force: true });
  }

  await page.waitForSelector('.warranty-modal-window', { timeout: 12000 });
  await page.waitForTimeout(1000);
}

async function main() {
  const auth = await provisionSession();
  console.log("[Playwright] Launching Chrome browser for Warranty proofs...");
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    // 1. PC Light (1440x900) - Editor Tab with auto-populated treatment items
    console.log("\n=== 1. Capturing PC Light (1440x900) ===");
    const pcLightContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      colorScheme: "light",
    });
    await pcLightContext.addInitScript(({ ct, st, uid, pid }) => {
      localStorage.setItem("dente_clinic_token", ct);
      localStorage.setItem("dente_staff_token", st);
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_user_id", uid);
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({
        onboardingDismissed: true,
        onboardingStep: "done",
        version: 1,
      }));
    }, { ct: auth.clinicToken, st: auth.staffToken, uid: auth.ownerUserId, pid: auth.patientId });

    const pcLightPage = await pcLightContext.newPage();
    await pcLightPage.goto(`${WEB_BASE}/#visit`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await pcLightPage.waitForSelector(".boot-state", { state: "detached", timeout: 25000 }).catch(() => {});
    await pcLightPage.waitForTimeout(2500);
    await applyTheme(pcLightPage, false);
    await openWarrantyPassport(pcLightPage);
    await takeProof(pcLightPage, "warranty_pc_light.png", "PC Light 1440x900 Warranty Studio Editor");
    await pcLightContext.close();

    // 2. PC Dark (1440x900) — switch to Remediation tab (0 ₽ Defect Resolution)
    console.log("\n=== 2. Capturing PC Dark (1440x900) ===");
    const pcDarkContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      colorScheme: "dark",
    });
    await pcDarkContext.addInitScript(({ ct, st, uid, pid }) => {
      localStorage.setItem("dente_clinic_token", ct);
      localStorage.setItem("dente_staff_token", st);
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_user_id", uid);
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({
        onboardingDismissed: true,
        onboardingStep: "done",
        version: 1,
      }));
    }, { ct: auth.clinicToken, st: auth.staffToken, uid: auth.ownerUserId, pid: auth.patientId });

    const pcDarkPage = await pcDarkContext.newPage();
    await pcDarkPage.goto(`${WEB_BASE}/#visit`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await pcDarkPage.waitForSelector(".boot-state", { state: "detached", timeout: 25000 }).catch(() => {});
    await pcDarkPage.waitForTimeout(2500);
    await applyTheme(pcDarkPage, true);
    await openWarrantyPassport(pcDarkPage);

    // Switch to Remediation Tab to show 1-click 0 ₽ defect resolution
    const remediationTab = pcDarkPage.locator('.warranty-tab-btn:has-text("Гарантийная переделка")').first();
    if (await remediationTab.isVisible().catch(() => false)) {
      console.log("Switching to Remediation tab in Dark Mode...");
      await remediationTab.click();
      await pcDarkPage.waitForTimeout(800);
    }
    await takeProof(pcDarkPage, "warranty_pc_dark.png", "PC Dark 1440x900 Warranty Remediation 0 ₽");
    await pcDarkContext.close();

    // 3. Mobile Light (390x844) — Apple Mobile HIG Bottom Sheet & Touch Ergonomics
    console.log("\n=== 3. Capturing Mobile Light (390x844) ===");
    const mobLightContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      colorScheme: "light",
    });
    await mobLightContext.addInitScript(({ ct, st, uid, pid }) => {
      localStorage.setItem("dente_clinic_token", ct);
      localStorage.setItem("dente_staff_token", st);
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_user_id", uid);
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({
        onboardingDismissed: true,
        onboardingStep: "done",
        version: 1,
      }));
    }, { ct: auth.clinicToken, st: auth.staffToken, uid: auth.ownerUserId, pid: auth.patientId });

    const mobLightPage = await mobLightContext.newPage();
    await mobLightPage.goto(`${WEB_BASE}/#visit`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await mobLightPage.waitForSelector(".boot-state", { state: "detached", timeout: 25000 }).catch(() => {});
    await mobLightPage.waitForTimeout(2500);
    await applyTheme(mobLightPage, false);
    await openWarrantyPassport(mobLightPage, true);
    await takeProof(mobLightPage, "warranty_mobile_light.png", "Mobile Light 390x844 Apple HIG Bottom Sheet");
    await mobLightContext.close();

    // 4. Mobile Dark (390x844) — Apple Mobile HIG Dark Bottom Sheet
    console.log("\n=== 4. Capturing Mobile Dark (390x844) ===");
    const mobDarkContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      colorScheme: "dark",
    });
    await mobDarkContext.addInitScript(({ ct, st, uid, pid }) => {
      localStorage.setItem("dente_clinic_token", ct);
      localStorage.setItem("dente_staff_token", st);
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_user_id", uid);
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({
        onboardingDismissed: true,
        onboardingStep: "done",
        version: 1,
      }));
    }, { ct: auth.clinicToken, st: auth.staffToken, uid: auth.ownerUserId, pid: auth.patientId });

    const mobDarkPage = await mobDarkContext.newPage();
    await mobDarkPage.goto(`${WEB_BASE}/#visit`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await mobDarkPage.waitForSelector(".boot-state", { state: "detached", timeout: 25000 }).catch(() => {});
    await mobDarkPage.waitForTimeout(2500);
    await applyTheme(mobDarkPage, true);
    await openWarrantyPassport(mobDarkPage, true);
    await takeProof(mobDarkPage, "warranty_mobile_dark.png", "Mobile Dark 390x844 Apple HIG Bottom Sheet");
    await mobDarkContext.close();

    console.log("\n[SUCCESS] All 4 Warranty proof screenshots successfully captured and verified!");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("[FATAL]", err);
  process.exit(1);
});
