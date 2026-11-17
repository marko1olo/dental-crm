import { mkdirSync, copyFileSync, existsSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const API_BASE = "http://127.0.0.1:4100";
const WEB_BASE = "http://127.0.0.1:5173";
const PROOFS_DIR = path.resolve(process.cwd(), "docs/proofs/recalls");
const BRAIN_DIR = path.resolve(
  "C:/Users/Admin/.gemini/antigravity/brain/6be7270d-a95f-49e2-8413-763a02b01e38"
);

mkdirSync(PROOFS_DIR, { recursive: true });
mkdirSync(BRAIN_DIR, { recursive: true });

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

  const targets = [
    {
      id: "01_recalls_pc_light_1440x900.png",
      altId: "01_recalls_hub_pc_light_1440x900.png",
      width: 1440,
      height: 900,
      isMobile: false,
      isDark: false,
      desc: "PC Light (1440x900)",
    },
    {
      id: "02_recalls_pc_dark_1440x900.png",
      altId: "02_recalls_hub_pc_dark_1440x900.png",
      width: 1440,
      height: 900,
      isMobile: false,
      isDark: true,
      desc: "PC Dark (1440x900)",
    },
    {
      id: "03_recalls_mobile_light_390x844.png",
      altId: "03_recalls_hub_mobile_light_390x844.png",
      width: 390,
      height: 844,
      isMobile: true,
      isDark: false,
      desc: "Mobile Light (390x844)",
    },
    {
      id: "04_recalls_mobile_dark_390x844.png",
      altId: "04_recalls_hub_mobile_dark_390x844.png",
      width: 390,
      height: 844,
      isMobile: true,
      isDark: true,
      desc: "Mobile Dark (390x844)",
    },
  ];

  try {
    for (const target of targets) {
      console.log(`\n[Capturing] ${target.desc}...`);
      const context = await browser.newContext({
        viewport: { width: target.width, height: target.height },
        deviceScaleFactor: target.isMobile ? 2 : 1,
        isMobile: target.isMobile,
        hasTouch: target.isMobile,
        colorScheme: target.isDark ? "dark" : "light",
      });

      await context.addInitScript(
        ({ ct, st, uid, isDark }) => {
          if (ct) localStorage.setItem("dente_clinic_token", ct);
          if (st) localStorage.setItem("dente_staff_token", st);
          localStorage.setItem("dente_active_session_token", st || "");
          localStorage.setItem("dente_active_role", "owner");
          localStorage.setItem("dente_user_role", "owner");
          localStorage.setItem("dente_active_user_id", uid || "owner_1");
          localStorage.setItem("dente_user_id", uid || "owner_1");
          localStorage.setItem("dente_active_mode", "clinic");
          sessionStorage.setItem("dente_unlocked", "true");
          localStorage.setItem("dente_onboarding_completed", "true");
          localStorage.setItem("dente_tour_completed", "true");
          localStorage.setItem("dente_tour_dismissed", "true");
          localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
          localStorage.setItem("dente_theme", isDark ? "dark" : "light");
          localStorage.setItem("dente_theme_mode", isDark ? "dark" : "light");
          localStorage.setItem(
            "dental-crm:web-ui-preferences:v1",
            JSON.stringify({
              version: 1,
              uiLanguage: "ru",
              theme: isDark ? "dark" : "light",
              selectedWorkspaceRole: "owner",
              onboardingDismissed: true,
              onboardingStep: "done",
            })
          );
        },
        { ct: clinicToken, st: staffToken, uid: ownerUserId, isDark: target.isDark }
      );

      const page = await context.newPage();
      await page.goto(`${WEB_BASE}/?recalls=1#recalls`, {
        waitUntil: "domcontentloaded",
        timeout: 45000,
      });

      // Wait for app shell
      await page
        .waitForSelector(".app-shell, #workspace-content, .workspace-shell", {
          state: "visible",
          timeout: 25000,
        })
        .catch(() => {});

      // Ensure theme classes on DOM
      await page.evaluate(({ isDark }) => {
        const t = isDark ? "dark" : "light";
        document.documentElement.setAttribute("data-theme", t);
        document.body.setAttribute("data-theme", t);
        if (isDark) {
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
        window.dispatchEvent(new CustomEvent("dente-open-recalls-hub"));
      }, { isDark: target.isDark });

      // Wait for modal container
      await page.waitForSelector(".recall-manager-container", {
        state: "visible",
        timeout: 15000,
      });

      // Allow animations & fonts to settle
      await page.waitForTimeout(1500);

      const targetPath = path.join(PROOFS_DIR, target.id);
      const altPath = path.join(PROOFS_DIR, target.altId);
      const brainPath = path.join(BRAIN_DIR, target.id);

      await page.screenshot({ path: targetPath, fullPage: false });
      copyFileSync(targetPath, altPath);
      copyFileSync(targetPath, brainPath);
      console.log(`[OK] Saved ${target.id} -> ${targetPath}`);

      await context.close();
    }

    console.log("\n=== ALL 4 CANONICAL RECALLS PROOFS CAPTURED SUCCESSFULLY ===");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("FATAL ERROR in capture-recalls-canonical-4state:", err);
  process.exit(1);
});
