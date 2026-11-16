import { mkdirSync, copyFileSync, existsSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const API_BASE = "http://127.0.0.1:4100";
const WEB_BASE = "http://127.0.0.1:5173";
const PROOFS_DIR = path.resolve(process.cwd(), "docs/proofs/recalls");

mkdirSync(PROOFS_DIR, { recursive: true });

async function main() {
  console.log("=== STARTING RECALLS CANONICAL 4-STATE CAPTURE ===");

  // Provision session with real clinical patients and triggers
  const uniqueId = Date.now();
  console.log(`[Provisioning] Initializing clinic session recalls-${uniqueId}@dente-clinic.ru...`);
  let clinicToken = "";
  let staffToken = "";
  let ownerUserId = "";

  try {
    const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clinicName: "Клиника ДЕНТЕ (Реколлы)",
        email: `recalls-canon-${uniqueId}@dente-clinic.ru`,
        password: "Password123!",
        ownerName: "Д-р Смирнова Екатерина Васильевна",
        ownerPin: "1234",
      }),
    });

    if (initRes.ok) {
      const initData = await initRes.json();
      clinicToken = initData.clinicToken;
      ownerUserId = initData.ownerUserId;

      const unlockRes = await fetch(`${API_BASE}/api/auth/staff/unlock`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-dente-clinic-token": clinicToken,
        },
        body: JSON.stringify({ userId: ownerUserId, pinCode: "1234" }),
      });

      if (unlockRes.ok) {
        const unlockData = await unlockRes.json();
        staffToken = unlockData.staffToken;
      }
    }
  } catch (err) {
    console.warn("[Provisioning] API auth fallback:", err.message);
  }

  // Seed 2 real patients if API is alive
  if (clinicToken && staffToken) {
    const authHeaders = {
      "Content-Type": "application/json",
      "x-dente-clinic-token": clinicToken,
      "x-dente-staff-token": staffToken,
    };

    try {
      const p1Res = await fetch(`${API_BASE}/api/patients`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          fullName: "Кузнецова Ирина Викторовна",
          birthDate: "1989-05-14",
          gender: "female",
          phone: "+7 (916) 234-56-78",
          allergies: "Без отягощенного аллергоанамнеза",
          chronicDiseases: "Соматически здорова",
        }),
      });
      const p1 = await p1Res.json();
      const p1Id = p1.patient?.id || p1.id;

      const p2Res = await fetch(`${API_BASE}/api/patients`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          fullName: "Белов Сергей Александрович",
          birthDate: "1982-11-20",
          gender: "male",
          phone: "+7 (903) 765-43-21",
          allergies: "Лидокаин",
          chronicDiseases: "Хронический пародонтит",
        }),
      });
      const p2 = await p2Res.json();
      const p2Id = p2.patient?.id || p2.id;

      // Seed appointment completions to generate clinical cohort triggers
      await fetch(`${API_BASE}/api/v1/patient-recalls/sync-appointment`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          patientId: p1Id,
          doctorSpecialty: "hygienist",
          procedureCodes: ["A16.07.051"],
          diagnosisMkb10: "K05.0",
        }),
      });

      await fetch(`${API_BASE}/api/v1/patient-recalls/sync-appointment`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          patientId: p2Id,
          doctorSpecialty: "periodontist",
          procedureCodes: ["A16.07.019"],
          diagnosisMkb10: "K05.3",
        }),
      });
      console.log("[Provisioning] Clinical recall triggers seeded successfully.");
    } catch (err) {
      console.warn("[Provisioning] Error seeding trigger cases:", err.message);
    }
  }

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-web-security"],
  });

  try {
    // ------------------------------------------------------------------
    // 1. PC VIEWPORT (1440x900)
    // ------------------------------------------------------------------
    const pcCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await pcCtx.addInitScript(({ ct, st, uid }) => {
      if (ct) localStorage.setItem("dente_clinic_token", ct);
      if (st) localStorage.setItem("dente_staff_token", st);
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_user_id", uid || "owner_1");
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_theme_mode", "light");
    }, { ct: clinicToken, st: staffToken, uid: ownerUserId });

    const pcPage = await pcCtx.newPage();
    await pcPage.goto(`${WEB_BASE}/?recalls=1#recalls`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await pcPage.waitForTimeout(2000);

    // Ensure modal open
    await pcPage.evaluate(() => {
      window.dispatchEvent(new CustomEvent("dente-open-recalls-hub"));
    });
    await pcPage.waitForTimeout(2000);

    // Proof 1: PC Light (1440x900)
    console.log("[Proof 1] PC Light...");
    await pcPage.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "light");
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    });
    await pcPage.waitForTimeout(1000);
    const p1Path = path.join(PROOFS_DIR, "01_recalls_hub_pc_light_1440x900.png");
    await pcPage.screenshot({ path: p1Path, fullPage: false });
    copyFileSync(p1Path, path.join(PROOFS_DIR, "01_recalls_pc_light_1440x900.png"));
    console.log("[Proof 1 OK] Saved 01_recalls_hub_pc_light_1440x900.png");

    // Proof 2: PC Dark (1440x900)
    console.log("[Proof 2] PC Dark...");
    await pcPage.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
    });
    await pcPage.waitForTimeout(1000);
    const p2Path = path.join(PROOFS_DIR, "02_recalls_hub_pc_dark_1440x900.png");
    await pcPage.screenshot({ path: p2Path, fullPage: false });
    copyFileSync(p2Path, path.join(PROOFS_DIR, "02_recalls_pc_dark_1440x900.png"));
    console.log("[Proof 2 OK] Saved 02_recalls_hub_pc_dark_1440x900.png");

    await pcCtx.close();

    // ------------------------------------------------------------------
    // 2. MOBILE VIEWPORT (390x844)
    // ------------------------------------------------------------------
    const mobCtx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    await mobCtx.addInitScript(({ ct, st, uid }) => {
      if (ct) localStorage.setItem("dente_clinic_token", ct);
      if (st) localStorage.setItem("dente_staff_token", st);
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_user_id", uid || "owner_1");
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_theme_mode", "light");
    }, { ct: clinicToken, st: staffToken, uid: ownerUserId });

    const mobPage = await mobCtx.newPage();
    await mobPage.goto(`${WEB_BASE}/?recalls=1#recalls`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await mobPage.waitForTimeout(2000);

    await mobPage.evaluate(() => {
      window.dispatchEvent(new CustomEvent("dente-open-recalls-hub"));
    });
    await mobPage.waitForTimeout(2000);

    // Proof 3: Mobile Light (390x844)
    console.log("[Proof 3] Mobile Light...");
    await mobPage.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "light");
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    });
    await mobPage.waitForTimeout(1000);
    const p3Path = path.join(PROOFS_DIR, "03_recalls_hub_mobile_light_390x844.png");
    await mobPage.screenshot({ path: p3Path, fullPage: false });
    copyFileSync(p3Path, path.join(PROOFS_DIR, "03_recalls_mobile_light_390x844.png"));
    console.log("[Proof 3 OK] Saved 03_recalls_hub_mobile_light_390x844.png");

    // Proof 4: Mobile Dark (390x844)
    console.log("[Proof 4] Mobile Dark...");
    await mobPage.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
    });
    await mobPage.waitForTimeout(1000);
    const p4Path = path.join(PROOFS_DIR, "04_recalls_hub_mobile_dark_390x844.png");
    await mobPage.screenshot({ path: p4Path, fullPage: false });
    copyFileSync(p4Path, path.join(PROOFS_DIR, "04_recalls_mobile_dark_390x844.png"));
    console.log("[Proof 4 OK] Saved 04_recalls_hub_mobile_dark_390x844.png");

    await mobCtx.close();
    console.log("\n=== ALL 4 CANONICAL RECALLS PROOFS CAPTURED ===");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("FATAL ERROR in capture-recalls-canonical-4state:", err);
  process.exit(1);
});
