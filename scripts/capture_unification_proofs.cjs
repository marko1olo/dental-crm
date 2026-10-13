const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

async function provisionSession() {
  const API_BASE = "http://127.0.0.1:4100";
  const uniqueId = Date.now();
  console.log("[Provisioning] Initializing clinic session via API...");
  const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clinicName: "Стоматология ДЕНТЕ",
      email: `doctor-unif-${uniqueId}@dente.local`,
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

  // Create a patient with allergies and stop-factors to trigger the safety banner
  console.log("[Provisioning] Creating patient with allergy risk notes...");
  const patientRes = await fetch(`${API_BASE}/api/patients`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-dente-clinic-token": initData.clinicToken,
      "x-staff-token": unlockData.staffToken,
      "x-user-role": "owner",
    },
    body: JSON.stringify({
      fullName: "Иванов Иван Иванович",
      phone: "+7 (999) 111-22-33",
      gender: "male",
      notes: "Аллергия на пенициллин и НПВП (критический стоп-фактор). Кардиостимулятор (ЭКС).",
    }),
  });
  if (!patientRes.ok) {
    console.warn(`Patient creation status: ${patientRes.status} ${await patientRes.text()}`);
  } else {
    const pData = await patientRes.json();
    console.log(`[Provisioning] Patient created: ${pData.id || pData.fullName}`);
  }

  return {
    clinicToken: initData.clinicToken,
    staffToken: unlockData.staffToken,
    ownerUserId: initData.ownerUserId,
  };
}

async function main() {
  console.log("=== CAPTURING RED TEAM UI UNIFICATION PROOFS ===");
  const auth = await provisionSession();

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const repoProofDir = "C:\\Clinic_MVP\\dental-crm\\docs\\proofs\\redteam_ui_unification";
  if (!fs.existsSync(repoProofDir)) fs.mkdirSync(repoProofDir, { recursive: true });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });

  await context.addInitScript(({ ct, st, uid }) => {
    localStorage.setItem("dente_clinic_token", ct);
    localStorage.setItem("dente_staff_token", st);
    localStorage.setItem("dente_active_role", "owner");
    localStorage.setItem("dente_user_id", uid);
    localStorage.setItem("dente_onboarding_completed", "true");
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dente_tour_dismissed", "true");
    localStorage.setItem("dente_sidebar_collapsed", "false");
    localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({
      onboardingDismissed: true,
      onboardingStep: "done",
      version: 1,
    }));
    localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({
      dismissed: true,
      step: "done",
      completed: true,
      version: 1,
    }));
    localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
      version: 1,
      uiLanguage: "ru",
      selectedWorkspaceRole: "owner",
      onboardingDismissed: true,
      onboardingStep: "done",
    }));
    localStorage.setItem(
      "dente-workspace-profile",
      JSON.stringify({
        mode: "owner",
        role: "owner",
        activeRole: "owner",
      })
    );
    document.documentElement.setAttribute("data-theme", "light");
    document.documentElement.classList.remove("dark");
  }, { ct: auth.clinicToken, st: auth.staffToken, uid: auth.ownerUserId });

  const page = await context.newPage();
  console.log("Navigating to http://127.0.0.1:5173/#patients...");
  await page.goto("http://127.0.0.1:5173/#patients", { waitUntil: "domcontentloaded", timeout: 30000 });

  await page.waitForSelector(".boot-state", { state: "detached", timeout: 25000 }).catch(() => {});
  await page.waitForTimeout(2000);

  // Dismiss any tour/toast if present
  try {
    const dismissBtn = page.locator('button:has-text("Пропустить"), [aria-label="Закрыть тур"]').first();
    if (await dismissBtn.count() > 0 && await dismissBtn.isVisible()) {
      await dismissBtn.click({ force: true });
      await page.waitForTimeout(400);
    }
  } catch {}

  // Wait for patient row
  console.log("Selecting patient in registry...");
  const patientRow = page.locator('[data-testid^="patient-row-"]').first();
  await patientRow.waitFor({ state: "visible", timeout: 15000 });
  await patientRow.click();
  await page.waitForTimeout(1000);

  // Wait for safety banner in details panel
  console.log("Waiting for safety banner in details panel...");
  await page.waitForSelector('[data-testid="patient-allergy-safety-banner"]', { timeout: 15000 });
  await page.waitForTimeout(600);

  // 1. patients_registry_pc_light.png
  console.log("Capturing 1/4: patients_registry_pc_light.png...");
  await page.evaluate(() => {
    document.documentElement.setAttribute("data-theme", "light");
    document.body.setAttribute("data-theme", "light");
    document.documentElement.classList.remove("dark");
    document.body.classList.remove("dark");
    document.documentElement.style.colorScheme = "light";
  });
  await page.waitForTimeout(800);
  const regLightPath = path.join(repoProofDir, "patients_registry_pc_light.png");
  await page.screenshot({ path: regLightPath });
  console.log(`✓ Saved: ${regLightPath} (${fs.statSync(regLightPath).size} bytes)`);

  // 2. patients_registry_pc_dark.png
  console.log("Capturing 2/4: patients_registry_pc_dark.png...");
  await page.evaluate(() => {
    document.documentElement.setAttribute("data-theme", "dark");
    document.body.setAttribute("data-theme", "dark");
    document.documentElement.classList.add("dark");
    document.body.classList.add("dark");
    document.documentElement.style.colorScheme = "dark";
  });
  await page.waitForTimeout(800);
  const regDarkPath = path.join(repoProofDir, "patients_registry_pc_dark.png");
  await page.screenshot({ path: regDarkPath });
  console.log(`✓ Saved: ${regDarkPath} (${fs.statSync(regDarkPath).size} bytes)`);

  // Open PatientCardModal via row more actions
  console.log("Opening PatientCardModal...");
  const moreBtn = page.locator('[data-testid^="patient-row-more-btn-"]').first();
  await moreBtn.click();
  await page.waitForTimeout(400);

  const passportCardBtn = page.locator('button:has-text("Паспортная карточка")').first();
  await passportCardBtn.click();
  await page.waitForTimeout(1000);

  await page.waitForSelector('[data-testid="patient-card-modal"]', { timeout: 10000 });
  console.log("PatientCardModal opened!");

  // Switch to "Документы" tab
  console.log("Switching to 'Документы' tab...");
  const docTabBtn = page.locator('[data-testid="tab-patient-documents"]').first();
  await docTabBtn.click();
  await page.waitForTimeout(1000);

  await page.waitForSelector('[data-testid="patient-documents-tab"]', { timeout: 10000 });
  await page.waitForSelector('[data-testid="btn-fast-vector-print-hub"]', { timeout: 10000 });
  await page.waitForTimeout(600);

  // 3. patient_documents_tab_pc_dark.png
  console.log("Capturing 3/4: patient_documents_tab_pc_dark.png...");
  const docDarkPath = path.join(repoProofDir, "patient_documents_tab_pc_dark.png");
  await page.screenshot({ path: docDarkPath });
  console.log(`✓ Saved: ${docDarkPath} (${fs.statSync(docDarkPath).size} bytes)`);

  // 4. patient_documents_tab_pc_light.png
  console.log("Capturing 4/4: patient_documents_tab_pc_light.png...");
  await page.evaluate(() => {
    document.documentElement.setAttribute("data-theme", "light");
    document.body.setAttribute("data-theme", "light");
    document.documentElement.classList.remove("dark");
    document.body.classList.remove("dark");
    document.documentElement.style.colorScheme = "light";
  });
  await page.waitForTimeout(800);
  const docLightPath = path.join(repoProofDir, "patient_documents_tab_pc_light.png");
  await page.screenshot({ path: docLightPath });
  console.log(`✓ Saved: ${docLightPath} (${fs.statSync(docLightPath).size} bytes)`);

  await browser.close();
  console.log("=== ALL 4 PROOFS CAPTURED SUCCESSFULLY ===");
}

main().catch((err) => {
  console.error("FATAL ERROR in main:", err);
  process.exit(1);
});
