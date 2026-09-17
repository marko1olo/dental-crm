/**
 * scripts/capture_theme_visits_finance_proofs.mjs
 * Red Team Visual Inquisitor Suite: Visits & Financials Multi-Theme Proofs (1440x900)
 *
 * Focus themes:
 * 1. warm_sand (Warm Sand / Тёплый песок) - light
 * 2. calm_teal (Calm Teal / Спокойный бирюзовый) - light
 * 3. emerald (Emerald / Изумруд) - dark
 * 4. sakura (Sakura / Нежная сакура) - light
 */

import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";

const API_BASE = "http://127.0.0.1:4100";
const WEB_BASE = "http://127.0.0.1:5173";
const OUT_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/themes_visits_finance");
const BRAIN_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/daaacb52-06df-4e5d-b00d-6477b1917966");

const THEMES = [
  { id: "warm_sand", name: "Warm Sand (Тёплый песок)", isDark: false },
  { id: "calm_teal", name: "Calm Teal (Спокойный бирюзовый)", isDark: false },
  { id: "emerald", name: "Emerald (Изумруд)", isDark: true },
  { id: "sakura", name: "Sakura (Нежная сакура)", isDark: false },
];

async function provisionSession() {
  const uniqueId = Date.now();
  console.log(`[Provisioning] Initializing test session theme-audit-${uniqueId}@dente.ru...`);

  const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clinicName: "Стоматология ДЕНТЕ Премиум",
      email: `theme-audit-${uniqueId}@dente.ru`,
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
          notes: "Лечение глубокого кариеса 36 зуба, стандартная анестезия",
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
    args: ["--no-sandbox", "--disable-gpu", "--font-render-hinting=none", "--disable-dev-shm-usage"],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
  });

  await context.addInitScript(
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

  let page = await context.newPage();

  async function ensurePage() {
    if (page.isClosed()) {
      console.log("[ensurePage] Page was closed, creating new page...");
      page = await context.newPage();
    }
    return page;
  }

  async function applyTheme(p, t) {
    await p.evaluate((themeObj) => {
      localStorage.setItem("dente_theme_mode", themeObj.id);
      document.documentElement.setAttribute("data-theme", themeObj.id);
      document.documentElement.dataset.theme = themeObj.id;
      if (themeObj.isDark) {
        document.documentElement.classList.add("dark");
        document.documentElement.classList.remove("light");
        document.documentElement.style.colorScheme = "dark";
      } else {
        document.documentElement.classList.remove("dark");
        document.documentElement.classList.add("light");
        document.documentElement.style.colorScheme = "light";
      }
      if (window.__useThemeStore) {
        window.__useThemeStore.getState().setThemeMode(themeObj.id);
      }
    }, t);
    await p.waitForTimeout(600);
  }

  async function captureProof(p, filename, description) {
    const filePath = path.join(OUT_DIR, filename);
    const brainPath = path.join(BRAIN_DIR, filename);

    await p.waitForSelector(".boot-state", { state: "detached", timeout: 30000 }).catch(() => {});
    await p.waitForSelector(".app-shell", { state: "visible", timeout: 20000 }).catch(() => {});
    await p.waitForTimeout(800);

    try {
      await p.screenshot({ path: filePath, fullPage: false, animations: "disabled", timeout: 15000 });
    } catch (e) {
      console.warn(`[Screenshot retry] ${filename}: ${e.message}`);
      await p.waitForTimeout(2000);
      await p.screenshot({ path: filePath, fullPage: false, timeout: 20000 });
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
    console.log(`[Captured] ${filename} | ${item.sizeKb} KB | MD5: ${md5} | >=40KB: ${item.passSize ? "PASS" : "FAIL"}`);
  }

  // Initial navigation
  console.log("\n>>> Booting Application at 1440x900 <<<\n");
  await page.goto(`${WEB_BASE}/#visit`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector(".boot-state", { state: "detached", timeout: 60000 });
  await page.waitForSelector(".app-shell", { state: "visible", timeout: 30000 });
  await page.waitForTimeout(1500);

  for (let idx = 0; idx < THEMES.length; idx++) {
    const theme = THEMES[idx];
    const prefix = String(idx * 3 + 1).padStart(2, "0");
    const prefixFin = String(idx * 3 + 2).padStart(2, "0");
    const prefixModal = String(idx * 3 + 3).padStart(2, "0");

    console.log(`\n========================================`);
    console.log(`>>> PROCESSING THEME: ${theme.name} (${theme.id}) <<<`);
    console.log(`========================================`);

    const p = await ensurePage();

    // 1. VisitView in current theme
    await p.goto(`${WEB_BASE}/#visit`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await p.waitForTimeout(500);
    await applyTheme(p, theme);
    await p.waitForSelector(".visit-monolithic-header, [data-testid=\"visit-view\"], .visit-shell-container", { timeout: 20000 }).catch(() => {});
    await p.waitForTimeout(1000);

    const visitFile = `${prefix}_visit_${theme.id}.png`;
    await captureProof(p, visitFile, `Экран визита (VisitView) — Тема ${theme.name} (1440x900)`);

    // 2. FinanceView in current theme
    console.log(`>>> Navigating to FinanceView for theme ${theme.id}...`);
    await p.goto(`${WEB_BASE}/#finance`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await p.waitForTimeout(500);
    await applyTheme(p, theme);
    await p.waitForSelector(".finance-view-header, .payment-capture-container, [data-testid=\"btn-finance-open-invoices\"]", { timeout: 20000 }).catch(() => {});
    await p.waitForTimeout(1000);

    const financeFile = `${prefixFin}_finance_${theme.id}.png`;
    await captureProof(p, financeFile, `Экран финансов и кассы (FinanceView) — Тема ${theme.name} (1440x900)`);

    // 3. PaymentModal in current theme
    console.log(`>>> Opening PaymentModal for theme ${theme.id}...`);
    const opened = await p.evaluate(() => {
      const moreBtn = document.querySelector('button[aria-label="Дополнительные способы оплаты"]');
      if (moreBtn) {
        moreBtn.click();
        return true;
      }
      return false;
    });

    if (opened) {
      await p.waitForTimeout(400);
      await p.evaluate(() => {
        const splitBtn = document.querySelector('[data-testid="payment-split-modal-button"]');
        if (splitBtn) splitBtn.click();
      });
      await p.waitForTimeout(800);
    } else {
      await p.evaluate(() => {
        const splitBtn = document.querySelector('[data-testid="payment-split-modal-button"]');
        if (splitBtn) splitBtn.click();
      });
      await p.waitForTimeout(800);
    }

    const modalVisible = await p.waitForSelector('[role="dialog"], #payment-modal-title, [data-testid="payer-type-section"]', { state: "visible", timeout: 8000 }).catch(() => null);

    if (modalVisible) {
      // Click 1-click split preset "50/50 Нал + Карта" to show active split state
      await p.evaluate(() => {
        const split50Btn = document.querySelector('[data-testid="preset-50-50-cash-card"]');
        if (split50Btn) split50Btn.click();
      }).catch(() => {});
      await p.waitForTimeout(600);

      const modalFile = `${prefixModal}_payment_modal_${theme.id}.png`;
      await captureProof(p, modalFile, `Окно кассы и сплита 54-ФЗ (PaymentModal) — Тема ${theme.name} (1440x900)`);

      // Close modal
      await p.evaluate(() => {
        const closeBtn = document.querySelector('button[aria-label="Закрыть"]') || document.querySelector('[role="dialog"] button:has-text("X")');
        if (closeBtn) closeBtn.click();
      }).catch(() => {});
      await p.waitForTimeout(500);
    } else {
      console.warn(`[PaymentModal] Fallback: opening invoices view`);
      await p.evaluate(() => {
        const invBtn = document.querySelector('[data-testid="btn-finance-open-invoices"]');
        if (invBtn) invBtn.click();
      });
      await p.waitForTimeout(1000);
      const modalFile = `${prefixModal}_payment_modal_${theme.id}.png`;
      await captureProof(p, modalFile, `Окно счетов/оплаты — Тема ${theme.name} (1440x900)`);
    }
  }

  await context.close();
  await browser.close();

  console.log("\n==================================================");
  console.log("THEMES VISITS & FINANCE PROOFS REPORT");
  console.log("==================================================");
  console.table(records);

  const hashes = new Set(records.map((r) => r.md5));
  const uniqueHashes = hashes.size === records.length;
  const allAbove40k = records.every((r) => r.sizeBytes >= 40960);

  console.log(`Total captured: ${records.length}`);
  console.log(`Unique MD5 hashes: ${uniqueHashes ? "YES (100% distinct screens)" : "FAIL"}`);
  console.log(`All files >= 40 KB: ${allAbove40k ? "PASS" : "FAIL"}`);
}

run().catch((err) => {
  console.error("Runner failed:", err);
  process.exit(1);
});
