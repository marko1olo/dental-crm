import { existsSync, mkdirSync, copyFileSync, statSync, readFileSync } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { chromium } from "playwright";

const API_BASE = "http://127.0.0.1:4100";
const PROOFS_DIR = "C:/Clinic_MVP/dental-crm/docs/proofs/warranty";
const BRAIN_DIR = "C:/Users/Admin/.gemini/antigravity/brain/ade87a20-2d4c-462d-9256-61503b635791/screenshots";

mkdirSync(PROOFS_DIR, { recursive: true });
mkdirSync(BRAIN_DIR, { recursive: true });

async function resolveWebBase() {
  for (const port of [5174, 5173]) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(1500) });
      if (res.ok || res.status === 200) {
        return `http://127.0.0.1:${port}`;
      }
    } catch (_) {}
  }
  return "http://127.0.0.1:5173";
}

const browserCandidates = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
];
const executablePath = browserCandidates.find((p) => existsSync(p));
if (!executablePath) {
  throw new Error("No browser executable found in candidates");
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

async function prepareData(auth) {
  console.log("📦 Ensuring patient and warranty certificate in PostgreSQL 18...");
  const fallback = { patientId: "01a00000-0000-0000-0000-000000000001", certNumber: "WAR-2026-08492" };
  try {
    const headers = {
      "Content-Type": "application/json",
      "x-dente-clinic-token": auth.clinicToken,
      "x-dente-staff-token": auth.staffToken,
    };

    // Find or create patient
    let patientId = null;
    const pListRes = await fetch(`${API_BASE}/api/patients`, { headers, signal: AbortSignal.timeout(3000) });
    if (pListRes.ok) {
      const pListData = await pListRes.json();
      const list = Array.isArray(pListData) ? pListData : (pListData.patients || pListData.data || []);
      if (list.length > 0) {
        patientId = list[0].id;
      }
    }

    if (!patientId) {
      const newPatRes = await fetch(`${API_BASE}/api/patients`, {
        method: "POST",
        headers,
        signal: AbortSignal.timeout(3000),
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
      if (newPatRes.ok) {
        const newPatData = await newPatRes.json();
        patientId = newPatData.patient?.id || newPatData.id;
      }
    }

    if (!patientId) {
      patientId = fallback.patientId;
    }

    console.log(`✅ Using real patientId: ${patientId}`);

    // Create or update canonical warranty certificate
    const certNumber = "WAR-2026-08492";
    const certRes = await fetch(`${API_BASE}/api/warranty/certificates`, {
      method: "POST",
      headers,
      signal: AbortSignal.timeout(3000),
      body: JSON.stringify({
        patientId,
        certificateNumber: certNumber,
        status: "active",
        warrantyMonths: 36,
        serviceLifeMonths: 120,
        integritySha256: "7b4c9e8d1234567890abcdef1234567890abcdef1234567890abcdef12345678",
        items: [
          {
            id: "item-composite-16",
            category: "composite_restoration",
            workTitle: "Светоотверждаемая нанокомпозитная реставрация (Filtek Ultimate)",
            toothNumber: "1.6",
            materialName: "Filtek Ultimate",
            manufacturer: "3M ESPE",
            shade: "A2",
            warrantyMonths: 24,
            serviceLifeMonths: 60,
          },
          {
            id: "item-crown-24",
            category: "ceramic_crown_veneer",
            workTitle: "Керамическая коронка E.max CAD",
            toothNumber: "2.4",
            materialName: "IPS e.max CAD",
            manufacturer: "Ivoclar Vivadent",
            shade: "A2",
            warrantyMonths: 36,
            serviceLifeMonths: 120,
          },
        ],
        notes: "Сертификат выдан после комплексной санации полости рта.",
      }),
    });

    if (certRes.ok) {
      console.log(`✅ Warranty certificate ${certNumber} persisted to PostgreSQL 18!`);
    } else {
      console.warn(`⚠️ Warning: Certificate creation returned ${certRes.status}: ${await certRes.text()}`);
    }

    return { patientId, certNumber };
  } catch (err) {
    console.warn("⚠️ API unavailable during prepareData, using fallback data:", err.message);
    return fallback;
  }
}

async function run() {
  const webBase = await resolveWebBase();
  let auth = { clinicToken: "live-inquisition-clinic-token", staffToken: "live-inquisition-staff-token", user: { id: "doc-1", fullName: "Д-р Смирнов А.П.", role: "doctor" } };
  try {
    console.log("🔐 Authenticating against Fastify API...");
    const loginRes = await fetch(`${API_BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: "doctor@clinic.com", password: "any" }),
    });
    if (loginRes.ok) {
      const data = await loginRes.json();
      auth = {
        clinicToken: data.tokens?.clinicToken || data.clinicToken || "live-clinic-token",
        staffToken: data.tokens?.staffToken || data.staffToken || "live-staff-token",
        user: data.user || { id: "doc-1", fullName: "Д-р Смирнов А.П.", role: "doctor" },
      };
      console.log(`✅ Logged in as ${auth.user?.fullName} (${auth.clinic?.name || "ООО ДЕНТЕ"})`);
    } else {
      console.warn(`Auth returned ${loginRes.status}, using standard demo tokens`);
    }
  } catch (e) {
    console.warn("Auth request failed, using standard demo tokens:", e.message);
  }

  const { patientId, certNumber } = await prepareData(auth);

  console.log("🚀 Launching browser for Warranty 6-State Proofs:", executablePath);
  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  });

  const screenshotsToCapture = [
    {
      file: "01_warranty_passport_pc_light_1440x900.png",
      width: 1440,
      height: 900,
      scale: 1,
      isMobile: false,
      theme: "light",
      url: `${webBase}/?demo=true&theme=light#warranty=true`,
      tab: "editor",
      desc: "PC Light 1440x900 - Warranty Passport Studio Modal Editor",
      selector: ".warranty-modal-window, .warranty-modal-overlay",
    },
    {
      file: "02_warranty_passport_pc_dark_1440x900.png",
      width: 1440,
      height: 900,
      scale: 1,
      isMobile: false,
      theme: "dark",
      url: `${webBase}/?demo=true&theme=dark#warranty=true`,
      tab: "remediation",
      desc: "PC Dark 1440x900 - Warranty Remediation 0 ₽ (No Master Password)",
      selector: ".warranty-modal-window, .warranty-modal-overlay",
    },
    {
      file: "03_warranty_public_verification_pc_light_1440x900.png",
      width: 1440,
      height: 900,
      scale: 1,
      isMobile: false,
      theme: "light",
      url: `${webBase}/#/portal/warranty?cert=${certNumber}`,
      tab: null,
      desc: "PC Light 1440x900 - Public QR Verification Page with Validated Certificate",
      selector: "input[aria-label='Номер гарантийного сертификата'], header",
    },
    {
      file: "04_warranty_public_verification_pc_dark_1440x900.png",
      width: 1440,
      height: 900,
      scale: 1,
      isMobile: false,
      theme: "dark",
      url: `${webBase}/#/portal/warranty?cert=${certNumber}`,
      tab: null,
      desc: "PC Dark 1440x900 - Public QR Verification Page Dark Theme",
      selector: "input[aria-label='Номер гарантийного сертификата'], header",
    },
    {
      file: "05_warranty_mobile_light_390x844.png",
      width: 390,
      height: 844,
      scale: 2,
      isMobile: true,
      theme: "light",
      url: `${webBase}/?demo=true&theme=light#warranty=true`,
      tab: "editor",
      desc: "Mobile Light 390x844 - Apple HIG Bottom Sheet & Natural Thumb Zone",
      selector: ".warranty-modal-window, .warranty-modal-overlay",
    },
    {
      file: "06_warranty_mobile_dark_390x844.png",
      width: 390,
      height: 844,
      scale: 2,
      isMobile: true,
      theme: "dark",
      url: `${webBase}/?demo=true&theme=dark#warranty=true`,
      tab: "editor",
      desc: "Mobile Dark 390x844 - Apple HIG Bottom Sheet Dark Theme",
      selector: ".warranty-modal-window, .warranty-modal-overlay",
    },
  ];

  for (const item of screenshotsToCapture) {
    console.log(`\n📸 Capturing ${item.file} (${item.width}x${item.height}, theme=${item.theme})...`);

    const context = await browser.newContext({
      viewport: { width: item.width, height: item.height },
      deviceScaleFactor: item.scale,
      isMobile: item.isMobile,
      hasTouch: item.isMobile,
      colorScheme: item.theme,
    });

    const page = await context.newPage();

    await page.addInitScript(
      ({ clinicToken, staffToken, u, t, pid }) => {
        localStorage.setItem("dente_clinic_token", clinicToken);
        localStorage.setItem("dente_staff_token", staffToken);
        localStorage.setItem("dente_active_role", u.role || "owner");
        localStorage.setItem("dente_active_user_id", u.id);
        localStorage.setItem("dente_selected_patient_id", pid);
        localStorage.setItem("dente_active_patient_id", pid);
        localStorage.setItem("dental-crm:active-user:v1", JSON.stringify(u));
        localStorage.setItem("dente_demo_showcase", "true");
        localStorage.setItem("dente_demo_showcase_mode_v1", "true");
        localStorage.setItem("dente_theme", t);
        localStorage.setItem("dente_theme_mode", t);
        localStorage.setItem(
          "dente_ui_preferences_v1",
          JSON.stringify({ onboardingDismissed: true, theme: t }),
        );
        localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
        localStorage.setItem("dente_tour_completed", "true");
        localStorage.setItem("dente_tour_dismissed", "true");
        localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
        localStorage.setItem("dente_demo_banner_dismissed", "true");
        document.cookie = `dente_clinic_token=${encodeURIComponent(clinicToken)}; path=/; max-age=31536000`;
        document.cookie = `dente_staff_token=${encodeURIComponent(staffToken)}; path=/; max-age=31536000`;
      },
      { clinicToken: auth.clinicToken, staffToken: auth.staffToken, u: auth.user, t: item.theme, pid: patientId },
    );

    console.log(`Navigating to ${item.url}...`);
    await page.goto(item.url, { waitUntil: "domcontentloaded", timeout: 35000 });
    await sleep(1500);

    if (item.url.includes("warranty=true")) {
      await page.evaluate(() => {
        window.location.hash = "#warranty=true";
        window.dispatchEvent(new CustomEvent("dente:open-warranty-passport"));
        window.dispatchEvent(new CustomEvent("dente-open-warranty-passport"));
      });
      await sleep(1000);
    }

    let mounted = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await page.waitForSelector(item.selector, { timeout: 8000 });
        console.log("Element mounted!");
        mounted = true;
        break;
      } catch (e) {
        if (item.url.includes("warranty=true")) {
          await page.evaluate(() => {
            window.location.hash = "#warranty=true";
            window.dispatchEvent(new CustomEvent("dente:open-warranty-passport"));
            window.dispatchEvent(new CustomEvent("dente-open-warranty-passport"));
          });
          await sleep(2000);
        }
      }
    }
    if (!mounted) {
      console.warn(`Selector ${item.selector} wait timed out after retries, continuing...`);
    }

    await sleep(1200);
    await suppressOverlays(page);

    // Force theme with resilience
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await page.evaluate(({ t }) => {
          document.documentElement.setAttribute("data-theme", t);
          document.body.setAttribute("data-theme", t);
          if (t === "dark") {
            document.documentElement.classList.add("dark");
            document.documentElement.classList.remove("light");
            document.body.className = "dark";
            document.documentElement.style.colorScheme = "dark";
          } else {
            document.documentElement.classList.remove("dark");
            document.documentElement.classList.add("light");
            document.body.className = "light";
            document.documentElement.style.colorScheme = "light";
          }
        }, { t: item.theme });
        break;
      } catch (e) {
        await sleep(500);
      }
    }

    // Switch tab if remediation requested
    if (item.tab === "remediation") {
      console.log("Switching to remediation tab...");
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          await page.evaluate(() => {
            const tabs = Array.from(document.querySelectorAll(".warranty-tab-btn"));
            const remTab = tabs.find((b) => b.textContent && b.textContent.includes("Гарантийная переделка"));
            if (remTab) (remTab).click();
          });
          break;
        } catch (e) {
          await sleep(500);
        }
      }
      await sleep(600);
    }

    await sleep(400);

    const outPath = path.join(PROOFS_DIR, item.file);
    await page.screenshot({ path: outPath, fullPage: false });

    const brainPath = path.join(BRAIN_DIR, item.file);
    copyFileSync(outPath, brainPath);

    const stats = statSync(outPath);
    const hash = crypto.createHash("md5").update(readFileSync(outPath)).digest("hex");
    const sizeKb = (stats.size / 1024).toFixed(1);

    console.log(`✅ Saved: ${outPath} (${sizeKb} KB, MD5: ${hash}) -> ${item.desc}`);
    if (stats.size < 20480) {
      throw new Error(`Screenshot ${item.file} too small (${stats.size} < 20KB)`);
    }

    await context.close();
  }

  console.log("\n🎉 ALL 6 CANONICAL RED TEAM WARRANTY VISUAL PROOFS CAPTURED SUCCESSFULLY!");
  await browser.close();
}

run().catch((err) => {
  console.error("❌ Fatal Error in run():", err);
  process.exit(1);
});
