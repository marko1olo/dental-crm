/**
 * scripts/themes_10_pc_inquisition_runner.cjs
 * Visual Inquisitor Suite: 10 Clinical DENTE Themes on PC (1440x900)
 *
 * 10 Clinical Themes:
 * 1. light (Светлая клиническая)
 * 2. dark (Тёмная)
 * 3. ocean (Морская глубина)
 * 4. sakura (Нежная сакура)
 * 5. emerald (Изумруд)
 * 6. cyber_xray (Кибер-КТ / Рентген)
 * 7. night (Глубокая ночь)
 * 8. warm_sand (Тёплый песок)
 * 9. calm_teal (Спокойный бирюзовый)
 * 10. contrast (Высокий контраст)
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");

const API_BASE = "http://127.0.0.1:4100";
const WEB_BASE = "http://127.0.0.1:5173";
const BRAIN_DIR = "C:/Users/Admin/.gemini/antigravity/brain/ab2efea1-9472-4107-91c3-faeecf38dcb1";
const OUT_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/themes_pc_inquisition");

const THEMES = [
  { id: "light", name: "Light (Светлая)", isDark: false },
  { id: "dark", name: "Dark (Тёмная)", isDark: true },
  { id: "ocean", name: "Ocean (Морская глубина)", isDark: true },
  { id: "sakura", name: "Sakura (Нежная сакура)", isDark: false },
  { id: "emerald", name: "Emerald (Изумруд)", isDark: true },
  { id: "cyber_xray", name: "Cyber X-Ray (Кибер-КТ / Рентген)", isDark: true },
  { id: "night", name: "Night (Глубокая ночь)", isDark: true },
  { id: "warm_sand", name: "Warm Sand (Тёплый песок)", isDark: false },
  { id: "calm_teal", name: "Calm Teal (Спокойный бирюзовый)", isDark: false },
  { id: "contrast", name: "Contrast (Высокий контраст)", isDark: false },
];

async function provisionSession() {
  const uniqueId = Date.now();
  console.log(`[Provisioning] Initializing test session themes-${uniqueId}@dente-clinic.ru...`);

  const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clinicName: "Стоматология ДЕНТЕ Премиум",
      email: `themes-${uniqueId}@dente-clinic.ru`,
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

  const headers = {
    "Content-Type": "application/json",
    "x-dente-clinic-token": initData.clinicToken,
    "x-dente-staff-token": unlockData.staffToken,
  };

  let patientId = null;

  try {
    const pRes = await fetch(`${API_BASE}/api/patients`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        fullName: "Ковалёв Роман Станиславович",
        birthDate: "1988-04-12",
        gender: "male",
        phone: "+7 (999) 888-77-66",
        allergies: "Бронхиальная астма, аллергия на латекс, кариес 36 зуба",
        chronicDiseases: "Хронический гастрит",
      }),
    });
    if (pRes.ok) {
      const pData = await pRes.json();
      patientId = pData.patient?.id || pData.id || null;
      console.log(`[Provisioning] Seeded patient: ${patientId}`);

      const todayStr = new Date().toISOString().split("T")[0];
      await fetch(`${API_BASE}/api/appointments`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          patientId,
          doctorId: initData.ownerUserId,
          chairId: "chair-1",
          startTime: `${todayStr}T10:00:00Z`,
          endTime: `${todayStr}T11:00:00Z`,
          status: "confirmed",
          notes: "Лечение глубокого кариеса 36 зуба",
        }),
      }).catch(() => {});
    }
  } catch (e) {
    console.warn("[Provisioning] Data seed warning:", e.message);
  }

  return {
    clinicToken: initData.clinicToken,
    staffToken: unlockData.staffToken,
    ownerUserId: initData.ownerUserId,
    patientId,
  };
}

async function run() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(BRAIN_DIR, { recursive: true });

  const auth = await provisionSession();
  const records = [];

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-gpu", "--font-render-hinting=none"],
  });

  const addAuthInitScript = async (ctx) =>
    ctx.addInitScript(
      ({ ct, st, uid, pid }) => {
        localStorage.setItem("dente_clinic_token", ct);
        localStorage.setItem("dente_staff_token", st);
        localStorage.setItem(
          "dente_staff_session",
          JSON.stringify({
            userId: uid,
            name: "Д-р Воронов Алексей Владимирович",
            fullName: "Д-р Воронов Алексей Владимирович",
            role: "owner",
            specialties: ["Стоматолог-терапевт", "Ортопед"],
          })
        );
        localStorage.setItem(
          "dental-crm:web-ui-preferences:v1",
          JSON.stringify({
            version: 1,
            uiLanguage: "ru",
            selectedWorkspaceRole: "owner",
            selectedPatientId: pid,
            onboardingDismissed: true,
            onboardingStep: "done",
          })
        );
        localStorage.setItem(
          "dente-workspace-profile",
          JSON.stringify({
            state: {
              clinicName: "Стоматология ДЕНТЕ Премиум",
              currentDoctor: { id: uid, fullName: "Д-р Воронов А. В.", role: "owner" },
              flags: { disableTour: true },
            },
          })
        );
      },
      {
        ct: auth.clinicToken,
        st: auth.staffToken,
        uid: auth.ownerUserId,
        pid: auth.patientId,
      }
    );

  async function applyTheme(page, themeObj) {
    await page.evaluate((t) => {
      localStorage.setItem("dente_theme_mode", t.id);
      document.documentElement.setAttribute("data-theme", t.id);
      document.documentElement.dataset.theme = t.id;
      if (t.isDark) {
        document.documentElement.classList.add("dark");
        document.documentElement.classList.remove("light");
        document.documentElement.style.colorScheme = "dark";
      } else {
        document.documentElement.classList.remove("dark");
        document.documentElement.classList.add("light");
        document.documentElement.style.colorScheme = "light";
      }
      if (window.__useThemeStore) {
        window.__useThemeStore.getState().setThemeMode(t.id);
      }
    }, themeObj);
    await page.waitForTimeout(800);
  }

  async function captureProof(page, filename, description) {
    const filePath = path.join(OUT_DIR, filename);
    const brainPath = path.join(BRAIN_DIR, filename);

    await page.waitForSelector(".boot-state", { state: "detached", timeout: 30000 }).catch(() => {});
    await page.waitForSelector(".app-shell", { state: "visible", timeout: 20000 }).catch(() => {});
    await page.waitForTimeout(1000);

    try {
      await page.screenshot({ path: filePath, fullPage: false, animations: "disabled", timeout: 15000 });
    } catch (e) {
      console.warn(`[Screenshot retry] ${filename}: ${e.message}`);
      await page.waitForTimeout(2000);
      await page.screenshot({ path: filePath, fullPage: false, timeout: 20000 });
    }
    fs.copyFileSync(filePath, brainPath);

    const stats = fs.statSync(filePath);
    const md5 = crypto.createHash("md5").update(fs.readFileSync(filePath)).digest("hex");

    const item = {
      filename,
      description,
      sizeBytes: stats.size,
      sizeKb: (stats.size / 1024).toFixed(1),
      md5,
      passSize: stats.size >= 40960,
    };
    records.push(item);
    console.log(`[Captured] ${filename} | ${description} | ${item.sizeKb} KB | MD5: ${md5} | >=40KB: ${item.passSize ? "PASS" : "FAIL"}`);
  }

  // Desktop context (1440x900)
  const pcContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
  });
  await addAuthInitScript(pcContext);
  const pcPage = await pcContext.newPage();

  // Navigate to visit and select Odontogram
  console.log("\n>>> Navigating to Visit Odontogram (1440x900) <<<\n");
  await pcPage.goto(`${WEB_BASE}/#visit`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await pcPage.waitForSelector(".boot-state", { state: "detached", timeout: 60000 });
  await pcPage.waitForSelector(".app-shell", { state: "visible", timeout: 30000 });
  await pcPage.waitForSelector(".visit-monolithic-header, [data-testid=\"visit-view\"]", { timeout: 20000 });

  // Select Odontogram tab
  await pcPage.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll("button, [role=\"tab\"]"));
    const odoTab = tabs.find((t) => t.textContent && (t.textContent.includes("Формула") || t.textContent.includes("Зубная формула")));
    if (odoTab) odoTab.click();
  });
  await pcPage.waitForTimeout(1500);

  // 1. Capture Odontogram in all 10 clinical themes
  console.log("=== CAPTURING ODONTOGRAM IN ALL 10 THEMES ===");
  for (let i = 0; i < THEMES.length; i++) {
    const theme = THEMES[i];
    const numStr = String(i + 1).padStart(2, "0");
    const filename = `${numStr}_odontogram_${theme.id}.png`;
    console.log(`\n--- Theme ${i + 1}/${THEMES.length}: ${theme.name} ---`);
    await applyTheme(pcPage, theme);
    await captureProof(pcPage, filename, `Одонтограмма — Тема ${theme.name} (1440x900)`);
  }

  // 2. Capture Schedule in dark themes to verify absence of white spots across modules
  console.log("\n=== CAPTURING SCHEDULE IN DARK THEMES (GLARE AUDIT) ===");
  await pcPage.evaluate(() => { window.location.hash = "schedule"; });
  await pcPage.waitForSelector(".schedule-filter-strip, .schedule-container", { timeout: 20000 });
  await pcPage.waitForTimeout(1000);

  const darkThemes = THEMES.filter((t) => t.isDark);
  for (let i = 0; i < darkThemes.length; i++) {
    const theme = darkThemes[i];
    const numStr = String(11 + i).padStart(2, "0");
    const filename = `${numStr}_schedule_${theme.id}.png`;
    console.log(`\n--- Schedule Dark Theme: ${theme.name} ---`);
    await applyTheme(pcPage, theme);
    await captureProof(pcPage, filename, `Расписание — Тёмная тема ${theme.name} (1440x900)`);
  }

  await pcContext.close();
  await browser.close();

  console.log("\n==================================================");
  console.log("10-THEMES PC INQUISITION AUDIT REPORT");
  console.log("==================================================");
  console.table(records);

  const hashes = new Set(records.map((r) => r.md5));
  const uniqueHashes = hashes.size === records.length;
  const allAbove40k = records.every((r) => r.sizeBytes >= 40960);

  console.log(`Total captured: ${records.length}`);
  console.log(`Unique MD5 hashes: ${uniqueHashes ? "YES (100% distinct screens)" : "FAIL"}`);
  console.log(`All files >= 40 KB: ${allAbove40k ? "PASS" : "FAIL"}`);

  if (!uniqueHashes || !allAbove40k || records.length < 15) {
    throw new Error("Themes inquisition runner failed criteria!");
  }
}

run().catch((err) => {
  console.error("Theme capture error:", err);
  process.exit(1);
});
