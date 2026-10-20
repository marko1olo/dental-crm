const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const API_BASE = "http://127.0.0.1:4100";
const WEB_BASE = "http://127.0.0.1:5173";

async function provisionClinicalSession() {
  const uniqueId = Date.now();
  console.log(`[Provisioning] Initializing test session patients-${uniqueId}@dente-clinic.ru...`);

  const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clinicName: "Клиника ДЕНТЕ (Реестр пациентов)",
      email: `patients-proof-${uniqueId}@dente-clinic.ru`,
      password: "Password123!",
      ownerName: "Д-р Смирнов Андрей Васильевич",
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

  // 1. Seed Parent Patient (Adult)
  const p1Res = await fetch(`${API_BASE}/api/patients`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      fullName: "Иванова Елена Сергеевна",
      birthDate: "1988-03-15",
      gender: "female",
      phone: "+7 (916) 111-22-33",
      allergies: "Пенициллин, Амоксициллин",
      chronicDiseases: "Хронический гастрит",
    }),
  });
  const p1Data = await p1Res.json();
  const parentId = p1Data.patient?.id || p1Data.id;

  // 2. Seed Minor Child Patient (<15 y/o, 8 years old)
  const p2Res = await fetch(`${API_BASE}/api/patients`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      fullName: "Иванов Артём Павлович",
      birthDate: "2018-06-10",
      gender: "male",
      phone: "+7 (916) 111-22-33", // Family phone
      allergies: "Без отягощенного аллергоанамнеза",
      chronicDiseases: "Соматически здоров",
    }),
  });
  const p2Data = await p2Res.json();
  const childId = p2Data.patient?.id || p2Data.id;

  // 3. Link 323-FZ Legal Representative Relationship
  try {
    await fetch(`${API_BASE}/api/patients/${childId}/relationships`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        relatedPatientId: parentId,
        relationshipType: "parent",
        isLegalRepresentative: true,
        canSignConsents: true,
        canViewMedicalRecord: true,
        documentProofNumber: "Свидетельство о рождении II-МЮ №458921",
        notes: "Мать (законный представитель ст. 64 СК РФ, 323-ФЗ)",
      }),
    });
  } catch (err) {
    console.warn("Failed to create relationship:", err.message);
  }

  // 4. Seed Namesake / Potential Duplicate
  await fetch(`${API_BASE}/api/patients`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      fullName: "Иванов Артём Павлович", // Duplicate to trigger duplicate detection
      birthDate: "2018-06-10",
      gender: "male",
      phone: "+7 (916) 111-22-33",
    }),
  });

  return {
    clinicToken: initData.clinicToken,
    staffToken: unlockData.staffToken,
    ownerUserId: initData.ownerUserId,
    parentId,
    childId,
  };
}

async function run() {
  const proofDir = path.resolve("C:/Clinic_MVP/dental-crm/docs/proofs/patients");
  if (!fs.existsSync(proofDir)) fs.mkdirSync(proofDir, { recursive: true });

  const auth = await provisionClinicalSession();
  console.log("[Provisioning] Auth ready, childId:", auth.childId);

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
    ({ ct, st, uid, cid }) => {
      localStorage.setItem("dente_clinic_token", ct);
      localStorage.setItem("dente_staff_token", st);
      localStorage.setItem("dente_active_session_token", st);
      localStorage.setItem("dente_active_user_id", uid);
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_active_mode", "clinic");
      sessionStorage.setItem("dente_unlocked", "true");
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dente_tour_completed", "true");

      localStorage.setItem(
        "dente_staff_session",
        JSON.stringify({
          userId: uid,
          name: "Д-р Смирнов А. В.",
          fullName: "Д-р Смирнов Андрей Васильевич",
          role: "owner",
          roleScope: "clinical_director",
        }),
      );
    },
    {
      ct: auth.clinicToken,
      st: auth.staffToken,
      uid: auth.ownerUserId,
      cid: auth.childId,
    },
  );

  const page = await context.newPage();
  await page.goto(`${WEB_BASE}/#patients`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);

  // Click on Patients nav item to ensure view is active
  try {
    const navItem = page.locator('a[href="#patients"]');
    if (await navItem.count() > 0) {
      await navItem.first().click();
      await page.waitForTimeout(1000);
    }
  } catch (e) {
    console.warn("Navigation click error:", e.message);
  }

  // Set Light Theme
  await page.evaluate(() => {
    document.documentElement.classList.remove("dark");
    document.documentElement.setAttribute("data-theme", "light");
    localStorage.setItem("theme", "light");
  });
  await page.waitForTimeout(1000);

  // 1. Proof 1: PC Light (1440x900) - Patients Registry Table
  const pcLightPath = path.join(proofDir, "patients_registry_pc_light.png");
  await page.screenshot({ path: pcLightPath, fullPage: false });
  console.log(`[Captured] ${pcLightPath} (${fs.statSync(pcLightPath).size} bytes)`);

  // Open Child Patient Card Modal
  await page.evaluate((childId) => {
    window.dispatchEvent(new CustomEvent("dente-open-patient-card-modal", { detail: { patientId: childId } }));
  }, auth.childId);
  await page.waitForTimeout(1500);

  // Switch to Dark Theme
  await page.evaluate(() => {
    document.documentElement.classList.add("dark");
    document.documentElement.setAttribute("data-theme", "dark");
    localStorage.setItem("theme", "dark");
  });
  await page.waitForTimeout(1000);

  // 2. Proof 2: PC Dark (1440x900) - Patients Registry with Child Patient Card Open
  const pcDarkPath = path.join(proofDir, "patients_registry_pc_dark.png");
  await page.screenshot({ path: pcDarkPath, fullPage: false });
  console.log(`[Captured] ${pcDarkPath} (${fs.statSync(pcDarkPath).size} bytes)`);

  // Switch to Mobile Viewport (390x844)
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(1000);

  // 3. Proof 3: Mobile Dark (390x844) - Patient Card & 323-FZ Legal Rep
  const mobileDarkPath = path.join(proofDir, "patient_card_mobile_dark.png");
  await page.screenshot({ path: mobileDarkPath, fullPage: false });
  console.log(`[Captured] ${mobileDarkPath} (${fs.statSync(mobileDarkPath).size} bytes)`);

  // Switch Mobile to Light Theme
  await page.evaluate(() => {
    document.documentElement.classList.remove("dark");
    document.documentElement.setAttribute("data-theme", "light");
    localStorage.setItem("theme", "light");
  });
  await page.waitForTimeout(1000);

  // 4. Proof 4: Mobile Light (390x844) - Patient Card & 323-FZ Legal Rep
  const mobileLightPath = path.join(proofDir, "patient_card_mobile_light.png");
  await page.screenshot({ path: mobileLightPath, fullPage: false });
  console.log(`[Captured] ${mobileLightPath} (${fs.statSync(mobileLightPath).size} bytes)`);

  await browser.close();

  // Validate all 4 screenshots exist and are > 40KB
  const files = [pcLightPath, pcDarkPath, mobileDarkPath, mobileLightPath];
  for (const f of files) {
    const stat = fs.statSync(f);
    const md5 = crypto.createHash("md5").update(fs.readFileSync(f)).digest("hex");
    console.log(`[Validation] ${path.basename(f)}: size=${stat.size} bytes, md5=${md5}`);
    if (stat.size < 40000) {
      throw new Error(`Screenshot ${path.basename(f)} is under 40KB (${stat.size} bytes)!`);
    }
  }

  console.log("All 4 screenshots captured and verified successfully!");
}

run().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
