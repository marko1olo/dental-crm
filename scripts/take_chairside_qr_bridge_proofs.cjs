const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const CONV_ID = "291ba2c5-88ba-4a5c-8c96-cf17bd9c724a";
const API_BASE = "http://127.0.0.1:4100";
const WEB_BASE = "http://127.0.0.1:5173";
const OUT_DOCS = path.resolve(process.cwd(), "docs/proofs/photography");
const OUT_BRAIN = path.resolve(`C:/Users/Admin/.gemini/antigravity/brain/${CONV_ID}`);

[OUT_DOCS, OUT_BRAIN].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

async function saveProof(page, filename) {
  await page.waitForTimeout(800);
  const pDocs = path.join(OUT_DOCS, filename);
  const pBrain = path.join(OUT_BRAIN, filename);
  await page.screenshot({ path: pDocs, fullPage: false, animations: "disabled" });
  fs.copyFileSync(pDocs, pBrain);
  const size = fs.statSync(pDocs).size;
  console.log(`[Captured] ${filename} (${size} bytes) -> OK: ${size >= 20000}`);
  if (size < 20000) {
    throw new Error(`Screenshot ${filename} is too small (${size} bytes < 20KB)`);
  }
}

async function setTheme(page, theme) {
  try {
    await page.evaluate((th) => {
      const isDark = th === "dark";
      document.documentElement.setAttribute("data-theme", th);
      document.body.setAttribute("data-theme", th);
      document.documentElement.classList.toggle("dark", isDark);
      document.documentElement.classList.toggle("light", !isDark);
      document.body.classList.toggle("dark", isDark);
      document.body.classList.toggle("light", !isDark);
      document.documentElement.style.colorScheme = isDark ? "dark" : "light";
      try {
        localStorage.setItem("dente_theme_mode", th);
        localStorage.setItem("dente_theme", th);
      } catch (_) {}
    }, theme);
  } catch (_) {}
  await page.waitForTimeout(600);
}

async function provisionClinicalSession() {
  const uniqueId = Date.now();
  console.log(`[Provisioning] Initializing test session photo-${uniqueId}@dente-clinic.ru...`);

  const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clinicName: "Клиника ДЕНТЕ (Эстетическая стоматология)",
      email: `photo-proof-${uniqueId}@dente-clinic.ru`,
      password: "Password123!",
      ownerName: "Д-р Смирнова Екатерина Васильевна",
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

  // Seed Real Patient
  const pRes = await fetch(`${API_BASE}/api/patients`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      fullName: "Морозова Елена Дмитриевна",
      birthDate: "1992-04-12",
      gender: "female",
      phone: "+7 (922) 555-11-22",
      allergies: "Без отягощенного аллергоанамнеза",
      chronicDiseases: "Здорова",
    }),
  });

  if (!pRes.ok) {
    throw new Error(`Patient create failed: ${await pRes.text()}`);
  }
  const pData = await pRes.json();
  const patientId = pData.patient?.id || pData.id;
  console.log(`[Provisioning] Created patient: ${patientId}`);

  // Generate Photo Bridge Session
  const sessionRes = await fetch(`${API_BASE}/api/photo-bridge/session`, {
    method: "POST",
    headers,
    body: JSON.stringify({ patientId, presetId: "express_6_slots" }),
  });
  if (!sessionRes.ok) {
    throw new Error(`Photo bridge session failed: ${await sessionRes.text()}`);
  }
  const sessionData = await sessionRes.json();
  console.log(`[Provisioning] Created photo bridge token: ${sessionData.token}`);

  return {
    clinicToken: initData.clinicToken,
    organizationId: initData.organizationId,
    staffToken: unlockData.staffToken,
    ownerUserId: initData.ownerUserId,
    patientId,
    photoToken: sessionData.token,
  };
}

async function run() {
  const auth = await provisionClinicalSession();

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  });

  try {
    // ----------------------------------------------------
    // 1 & 2: PC 1440x900 (Chairside QR Bridge Modal)
    // ----------------------------------------------------
    console.log("\n--- 1. PC 1440x900 Context ---");
    const pcContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });

    await pcContext.addInitScript(
      ({ ct, orgId, st, uid }) => {
        localStorage.setItem("dente_clinic_token", ct);
        localStorage.setItem("dente_organization_id", orgId);
        localStorage.setItem("dente_staff_token", st);
        localStorage.setItem("dente_active_session_token", st);
        localStorage.setItem("dente_active_user_id", uid);
        localStorage.setItem("dente_user_id", uid);
        localStorage.setItem("dente_active_role", "owner");
        localStorage.setItem("dente_user_role", "owner");
        localStorage.setItem("dente_active_mode", "clinic");
        sessionStorage.setItem("dente_unlocked", "true");
        localStorage.setItem("dente_onboarding_completed", "true");
        localStorage.setItem("dente_tour_completed", "true");
        localStorage.setItem("dente_tour_dismissed", "true");
      },
      {
        ct: auth.clinicToken,
        orgId: auth.organizationId,
        st: auth.staffToken,
        uid: auth.ownerUserId,
      }
    );

    const pcPage = await pcContext.newPage();
    pcPage.on("console", (msg) => console.log("[PC LOG]:", msg.type(), msg.text()));

    const pcUrl = `${WEB_BASE}/#photo-qr`;
    console.log(`Navigating to ${pcUrl} ...`);
    await pcPage.goto(pcUrl, { waitUntil: "commit" });
    await pcPage.waitForTimeout(4000);

    console.log("Waiting for modal selector (timeout 45s)...");
    await pcPage.waitForSelector('[data-testid="chairside-photo-qr-bridge-modal"]', { state: "visible", timeout: 45000 });
    console.log("Modal found! Waiting for QR SVG...");
    await pcPage.waitForSelector('[data-testid="chairside-qr-code-svg"]', { state: "visible", timeout: 30000 });

    console.log(">>> 01_chairside_qr_modal_pc_light_1440x900.png");
    await setTheme(pcPage, "light");
    await saveProof(pcPage, "01_chairside_qr_modal_pc_light_1440x900.png");

    console.log(">>> 02_chairside_qr_modal_pc_dark_1440x900.png");
    await setTheme(pcPage, "dark");
    await saveProof(pcPage, "02_chairside_qr_modal_pc_dark_1440x900.png");

    // ----------------------------------------------------
    // 3 & 4: Mobile 390x844 (Doctor Smartphone Page)
    // ----------------------------------------------------
    console.log("\n--- 2. Mobile 390x844 Context ---");
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });

    const mobPage = await mobileContext.newPage();
    mobPage.on("console", (msg) => console.log("[MOB LOG]:", msg.type(), msg.text()));

    const mobUrl = `${WEB_BASE}/#photo-bridge?token=${auth.photoToken}`;
    console.log(`Navigating to ${mobUrl} ...`);
    await mobPage.goto(mobUrl, { waitUntil: "commit" });
    await mobPage.waitForTimeout(4000);

    console.log("Waiting for mobile page selector (timeout 45s)...");
    await mobPage.waitForSelector('[data-testid="mobile-photo-upload-page"]', { state: "visible", timeout: 45000 });
    await mobPage.waitForSelector('[data-testid="btn-mobile-take-photo"]', { state: "visible", timeout: 30000 });

    console.log(">>> 03_mobile_photo_upload_light_390x844.png");
    await setTheme(mobPage, "light");
    await saveProof(mobPage, "03_mobile_photo_upload_light_390x844.png");

    console.log(">>> 04_mobile_photo_upload_dark_390x844.png");
    await setTheme(mobPage, "dark");
    await saveProof(mobPage, "04_mobile_photo_upload_dark_390x844.png");

    console.log("\n==========================================");
    console.log("CHAIRSIDE PHOTO QR BRIDGE 4-STATE PROOFS OK!");
    console.log("==========================================");
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("FATAL proof script error:", err);
  process.exit(1);
});
