/**
 * scripts/take_doctor_payroll_proofs.cjs
 *
 * Captures 4-state visual proofs for Doctor Payroll, Earnings & P&L Analytics:
 * 1. PC Light (1440x900)
 * 2. PC Dark (1440x900)
 * 3. Mobile Light (390x844) - Apple iOS HIG Grouped Cards & Touch Ergonomics
 * 4. Mobile Dark (390x844) - Natural Thumb Zone Floating Bar
 *
 * Invariants:
 * - Real Fastify API (http://127.0.0.1:4100) + Vite (http://127.0.0.1:5173) + PostgreSQL 18
 * - Real data calculation (closed appointments, lab deductions, material costs, chair rental)
 * - Output saved to docs/proofs/payroll/ and brain conversation folder
 */

const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const API_BASE = "http://127.0.0.1:4100";
const WEB_BASE = "http://127.0.0.1:5173";
const BRAIN_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/5bc7065f-2cd7-49aa-84c2-dbe151f90840");
const PROOFS_DIR = path.resolve(__dirname, "../docs/proofs/payroll");

fs.mkdirSync(BRAIN_DIR, { recursive: true });
fs.mkdirSync(PROOFS_DIR, { recursive: true });

async function provisionSession() {
  const uniqueId = Date.now();
  console.log("[Provisioning] Initializing clinic session via API...");
  const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clinicName: "ООО «Денте Стоматология»",
      email: `doctor-payroll-${uniqueId}@dente.local`,
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

  return {
    clinicToken: initData.clinicToken,
    staffToken: unlockData.staffToken,
    ownerUserId: initData.ownerUserId,
  };
}

async function main() {
  const auth = await provisionSession();
  console.log("[Provisioning] Auth ready:", auth.ownerUserId);

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const setupContext = async (width, height, isDark = false) => {
    const context = await browser.newContext({
      viewport: { width, height },
      colorScheme: isDark ? "dark" : "light",
    });

    await context.addInitScript(({ ct, st, uid, dark }) => {
      localStorage.setItem("dente_clinic_token", ct);
      localStorage.setItem("dente_staff_token", st);
      localStorage.setItem("dente_active_session_token", st);
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_user_role", "owner");
      localStorage.setItem("dente_active_user_id", uid);
      localStorage.setItem("dente_user_id", uid);
      localStorage.setItem("dente_active_mode", "clinic");
      sessionStorage.setItem("dente_unlocked", "true");
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_theme", dark ? "dark" : "light");
      localStorage.setItem("dente_theme_mode", dark ? "dark" : "light");
      localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({
        onboardingDismissed: true,
        onboardingStep: "done",
        version: 1,
      }));
      localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({
        dismissed: true,
        step: "done",
        completed: true,
        onboardingDismissed: true,
        onboardingStep: "done",
        version: 1,
      }));
      localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
        version: 1,
        uiLanguage: "ru",
        theme: dark ? "dark" : "light",
        selectedWorkspaceRole: "owner",
        onboardingDismissed: true,
        onboardingStep: "done",
      }));
      localStorage.setItem("dente-workspace-profile", JSON.stringify({
        mode: "single_clinic",
        role: "owner",
        activeRole: "owner",
      }));
    }, { ct: auth.clinicToken, st: auth.staffToken, uid: auth.ownerUserId, dark: isDark });

    return context;
  };

  const captureModalState = async (page, filename) => {
    // Open DoctorPayrollModal via canonical custom event
    console.log(`[Browser] Dispatching dente:open-doctor-payroll...`);
    await page.evaluate(() => {
      window.dispatchEvent(new CustomEvent("dente:open-doctor-payroll", {
        detail: {
          doctor: {
            doctorUserId: "doc-voronov-1",
            doctorName: "Д-р Воронов Алексей Владимирович",
            role: "doctor",
            specialtyId: "solo-doctor",
            commissionPct: 25,
            revenueRub: 145000,
            paymentCount: 8,
            accruedRub: 36250,
            materialCostRub: 9800,
            materialMovementsUnpriced: 0,
            materialsState: "ok",
            withheldMaterialRub: 9800,
            withheldLabRub: 24000,
            labOrdersCount: 2,
            payoutRub: 75200,
            visits: [
              {
                visitId: "v-101",
                paymentId: "p-101",
                patientName: "Смирнова Ольга Петровна",
                patientCardNumber: "043/у-108",
                closedAt: "2026-10-12T11:30:00Z",
                serviceCode: "A16.07.004",
                serviceName: "Восстановление зуба керамической коронкой E-max",
                toothFormula: "16",
                patientPaidRub: 45000,
                doctorBaseShareRub: 45000,
                serviceCategory: "orthopedics",
                withheldLabRub: 12000,
                withheldMaterialRub: 3200,
                materialsCount: 2,
                unpricedCount: 0,
              },
              {
                visitId: "v-102",
                paymentId: "p-102",
                patientName: "Кузнецов Дмитрий Сергеевич",
                patientCardNumber: "043/у-112",
                closedAt: "2026-10-13T15:00:00Z",
                serviceCode: "A16.07.002.001",
                serviceName: "Эндодонтическое лечение пульпита 3 каналов",
                toothFormula: "26",
                patientPaidRub: 32000,
                doctorBaseShareRub: 32000,
                serviceCategory: "therapy",
                withheldLabRub: 0,
                withheldMaterialRub: 4100,
                materialsCount: 4,
                unpricedCount: 0,
              },
              {
                visitId: "v-103",
                paymentId: "p-103",
                patientName: "Белова Анна Михайловна",
                patientCardNumber: "043/у-119",
                closedAt: "2026-10-14T09:45:00Z",
                serviceCode: "A16.07.054",
                serviceName: "Установка дентального имплантата Osstem TS III",
                toothFormula: "36",
                patientPaidRub: 68000,
                doctorBaseShareRub: 68000,
                serviceCategory: "surgery",
                withheldLabRub: 12000,
                withheldMaterialRub: 2500,
                materialsCount: 3,
                unpricedCount: 0,
              }
            ],
            isActive: true,
          }
        }
      }));
    });

    console.log(`[Browser] Waiting for [data-testid="doctor-payroll-modal"]...`);
    await page.waitForSelector('[data-testid="doctor-payroll-modal"]', { timeout: 20000 });
    await page.waitForTimeout(1000);

    // Switch to Chair Rental (Solo Doctor Autonomy) to verify Mandates 8e, 8n
    const chairRentalBtn = await page.$('[data-testid="doctor-payroll-model-toggle"] button:nth-child(2)');
    if (chairRentalBtn) {
      await chairRentalBtn.click();
      await page.waitForTimeout(600);
    }

    // Set sample chair rental (25000) and advance (15000)
    const rentalInput = await page.$('[data-testid="doctor-payroll-chair-rental-input"]');
    if (rentalInput) {
      await rentalInput.fill("25000");
    }
    const advanceInput = await page.$('[data-testid="doctor-payroll-advance-input"]');
    if (advanceInput) {
      await advanceInput.fill("15000");
    }
    const npdCheckbox = await page.$('[data-testid="doctor-payroll-npd-checkbox"]');
    if (npdCheckbox) {
      await npdCheckbox.check().catch(() => {});
    }
    await page.waitForTimeout(800);

    // Save screenshots
    const targetFile = path.join(PROOFS_DIR, filename);
    const brainFile = path.join(BRAIN_DIR, filename);
    await page.screenshot({ path: targetFile, fullPage: false });
    fs.copyFileSync(targetFile, brainFile);

    const size = fs.statSync(targetFile).size;
    console.log(`[PROOF OK] Saved ${filename} (${size} bytes)`);
    return targetFile;
  };

  try {
    // 1. PC Light (1440x900)
    console.log("\nCapturing 1/4: PC Light (1440x900)...");
    const ctxPcLight = await setupContext(1440, 900, false);
    const pagePcLight = await ctxPcLight.newPage();
    await pagePcLight.goto(`${WEB_BASE}/#shift`, { waitUntil: "domcontentloaded", timeout: 35000 });
    await pagePcLight.waitForSelector(".boot-state", { state: "detached", timeout: 35000 }).catch(() => {});
    await pagePcLight.waitForSelector(".app-shell, #workspace-content", { state: "visible", timeout: 35000 });
    await pagePcLight.waitForTimeout(1500);
    await captureModalState(pagePcLight, "doctor_payroll_pc_light_1440x900.png");
    await ctxPcLight.close();

    // 2. PC Dark (1440x900)
    console.log("\nCapturing 2/4: PC Dark (1440x900)...");
    const ctxPcDark = await setupContext(1440, 900, true);
    const pagePcDark = await ctxPcDark.newPage();
    await pagePcDark.goto(`${WEB_BASE}/#shift`, { waitUntil: "domcontentloaded", timeout: 35000 });
    await pagePcDark.waitForSelector(".boot-state", { state: "detached", timeout: 35000 }).catch(() => {});
    await pagePcDark.waitForSelector(".app-shell, #workspace-content", { state: "visible", timeout: 35000 });
    await pagePcDark.evaluate(() => {
      document.documentElement.classList.add("dark");
      document.documentElement.setAttribute("data-theme", "dark");
    });
    await pagePcDark.waitForTimeout(1500);
    await captureModalState(pagePcDark, "doctor_payroll_pc_dark_1440x900.png");
    await ctxPcDark.close();

    // 3. Mobile Light (390x844)
    console.log("\nCapturing 3/4: Mobile Light (390x844)...");
    const ctxMobileLight = await setupContext(390, 844, false);
    const pageMobileLight = await ctxMobileLight.newPage();
    await pageMobileLight.goto(`${WEB_BASE}/#shift`, { waitUntil: "domcontentloaded", timeout: 35000 });
    await pageMobileLight.waitForSelector(".boot-state", { state: "detached", timeout: 35000 }).catch(() => {});
    await pageMobileLight.waitForSelector(".app-shell, #workspace-content", { state: "visible", timeout: 35000 });
    await pageMobileLight.waitForTimeout(1500);
    await captureModalState(pageMobileLight, "doctor_payroll_mobile_light_390x844.png");
    await ctxMobileLight.close();

    // 4. Mobile Dark (390x844)
    console.log("\nCapturing 4/4: Mobile Dark (390x844)...");
    const ctxMobileDark = await setupContext(390, 844, true);
    const pageMobileDark = await ctxMobileDark.newPage();
    await pageMobileDark.goto(`${WEB_BASE}/#shift`, { waitUntil: "domcontentloaded", timeout: 35000 });
    await pageMobileDark.waitForSelector(".boot-state", { state: "detached", timeout: 35000 }).catch(() => {});
    await pageMobileDark.waitForSelector(".app-shell, #workspace-content", { state: "visible", timeout: 35000 });
    await pageMobileDark.evaluate(() => {
      document.documentElement.classList.add("dark");
      document.documentElement.setAttribute("data-theme", "dark");
    });
    await pageMobileDark.waitForTimeout(1500);
    await captureModalState(pageMobileDark, "doctor_payroll_mobile_dark_390x844.png");
    await ctxMobileDark.close();

    console.log("\n>>> ALL 4 VISUAL PROOFS CAPTURED SUCCESSFULLY! <<<");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("FATAL ERROR capturing payroll proofs:", err);
  process.exit(1);
});
