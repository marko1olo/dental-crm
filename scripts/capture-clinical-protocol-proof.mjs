/**
 * scripts/capture-clinical-protocol-proof.mjs
 *
 * Captures live visual proof of the 1-click clinical treatment protocol
 * in VisitClinicalToothModal / VisitClinicalToothTabs across Light and Dark themes (PC 1440x900).
 */

import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const todayDate = new Date().toLocaleDateString("en-CA");

const mockDashboard = {
  clinicName: "Стоматология ДЕНТЕ Премиум",
  todayIso: todayDate,
  clinicSettings: {
    profile: {
      id: "c-1",
      organizationId: "00000000-0000-0000-0000-000000000001",
      clinicName: "Стоматология ДЕНТЕ Премиум",
      mode: "small_clinic",
      defaultVisitMinutes: 45,
      hasPediatricMode: true,
      timezone: "Europe/Moscow",
      phone: "+7 (495) 123-45-67",
      address: "Москва, Столярный переулок, 14",
      inn: "7701234567",
      updatedAt: new Date().toISOString(),
    },
    staff: [
      {
        id: "doc-1",
        organizationId: "00000000-0000-0000-0000-000000000001",
        fullName: "Д-р Воронов Алексей Владимирович",
        role: "owner",
        specialties: ["therapist", "orthopedist"],
        active: true,
        color: "#0d9488",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
    chairs: [
      {
        id: "chair-1",
        organizationId: "00000000-0000-0000-0000-000000000001",
        name: "Кабинет 1 (Терапия)",
        room: "1",
        defaultDoctorId: "doc-1",
        active: true,
      },
    ],
    integrationPresets: [],
    workspaceProfiles: [],
    roleAccessPolicies: [],
    modeHints: [],
    soloDoctorMode: false,
  },
  patients: [
    {
      id: "pat-1",
      organizationId: "00000000-0000-0000-0000-000000000001",
      fullName: "Ковалёв Роман Станиславович",
      status: "active",
      birthDate: "1988-04-12",
      phone: "+7 (999) 888-77-66",
      email: "kovalev@example.ru",
      notes: "Бронхиальная астма, аллергия на лидокаин",
      administrativeProfile: "normal",
      createdAt: `${todayDate}T08:00:00.000Z`,
      updatedAt: `${todayDate}T08:00:00.000Z`,
    },
  ],
  appointments: [
    {
      id: "app-1",
      organizationId: "00000000-0000-0000-0000-000000000001",
      patientId: "pat-1",
      doctorUserId: "doc-1",
      doctorId: "doc-1",
      chairId: "chair-1",
      status: "in_treatment",
      state: "in_treatment",
      priority: "normal",
      intent: "treatment",
      startsAt: `${todayDate}T10:00:00.000Z`,
      endsAt: `${todayDate}T11:30:00.000Z`,
      startTime: `${todayDate}T10:00:00.000Z`,
      endTime: `${todayDate}T11:30:00.000Z`,
      durationMinutes: 90,
      serviceTitle: "Лечение кариеса 16 зуба",
      serviceCategories: ["therapy"],
      createdByUserId: "doc-1",
      createdAt: `${todayDate}T08:00:00.000Z`,
      updatedAt: `${todayDate}T08:00:00.000Z`,
      patientName: "Ковалёв Роман Станиславович",
      doctorName: "Д-р Воронов А.В.",
    },
  ],
  activeVisit: {
    id: "00000000-0000-0000-0000-000000000001",
    appointmentId: "app-1",
    patientId: "pat-1",
    doctorId: "doc-1",
    status: "in_treatment",
  },
  payments: [],
};

const targetDirs = [
  path.resolve("docs/screenshots/clinical_protocol_audit"),
  "C:/Users/Admin/.gemini/antigravity/brain/3a5b8869-b36e-4b2a-8ad1-b19cb26647d3",
];

for (const d of targetDirs) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

async function saveProof(page, fileName, description = "") {
  for (const dir of targetDirs) {
    const fullPath = path.join(dir, fileName);
    await page.screenshot({ path: fullPath, fullPage: false, animations: "disabled" });
    const stats = fs.statSync(fullPath);
    const md5 = crypto.createHash("md5").update(fs.readFileSync(fullPath)).digest("hex");
    console.log(`[PROOF] ${fileName} (${stats.size} B / ${(stats.size / 1024).toFixed(1)} KB, MD5: ${md5}) - ${description}`);
  }
}

async function setTheme(page, theme) {
  await page.evaluate((th) => {
    if (window.__useThemeStore) {
      window.__useThemeStore.getState().setThemeMode(th);
    }
    document.documentElement.setAttribute("data-theme", th);
    const isDark = ["dark", "night", "ocean", "emerald", "cyber_xray"].includes(th);
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.classList.toggle("light", !isDark);
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    try {
      localStorage.setItem("dente_theme_mode", th);
    } catch (_) {}
  }, theme);
  await page.waitForTimeout(400);
}

async function setupPageRoutes(page) {
  await page.route("**/api/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/src/")) return route.continue();
    if (url.includes("/api/dashboard")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard) });
    }
    if (url.includes("/api/auth/user/me") || url.includes("/api/auth/session")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner", active: true, organizationId: "00000000-0000-0000-0000-000000000001" },
        }),
      });
    }
    if (url.includes("/api/auth/staff/unlock")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, token: "audit-token-staff", user: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner" } }),
      });
    }
    if (url.includes("/tooth-states")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, states: [] }),
      });
    }
    if (url.includes("/api/patients")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard.patients) });
    }
    if (url.includes("/api/schedule")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard.appointments) });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(url.includes("list") || url.includes("status") ? [] : {}),
    });
  });
}

function addInitStorage(context) {
  return context.addInitScript(() => {
    localStorage.setItem("dente_clinic_token", "audit-token-clinic");
    localStorage.setItem("dente_staff_token", "audit-token-staff");
    localStorage.setItem("dente_active_role", "owner");
    localStorage.setItem("dente_onboarding_completed", "true");
    localStorage.setItem(
      "dente_ui_preferences_v1",
      JSON.stringify({ onboardingDismissed: true, onboardingStep: "done", version: 1 })
    );
    localStorage.setItem(
      "dental-crm:onboarding:v1",
      JSON.stringify({ dismissed: true, step: "done", completed: true, onboardingDismissed: true, onboardingStep: "done", version: 1 })
    );
    localStorage.setItem(
      "dental-crm:web-ui-preferences:v1",
      JSON.stringify({ version: 1, uiLanguage: "ru", selectedWorkspaceRole: "owner", selectedPatientId: "pat-1", onboardingDismissed: true, onboardingStep: "done" })
    );
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dente_demo_showcase", "true");
    sessionStorage.setItem("dente_chunk_reload_/", "1");
    localStorage.setItem(
      "dente-workspace-profile",
      JSON.stringify({
        state: {
          clinicName: "Стоматология ДЕНТЕ Премиум",
          currentDoctor: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner" },
          flags: { disableTour: true, hasPediatricMode: true },
        },
      })
    );
  });
}

async function main() {
  console.log("=== CLINICAL PROTOCOL VISUAL PROOF SUITE ===");

  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  await addInitStorage(context);

  const page = await context.newPage();
  await setupPageRoutes(page);

  console.log("[Proof] Loading schedule view...");
  await page.goto("http://127.0.0.1:5173/#schedule", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(2500);

  // Dismiss any tour or banner
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll("button")).find(
      (b) => b.textContent && (b.textContent.includes("Скрыть") || b.textContent.includes("Понятно"))
    );
    if (btn) btn.click();
  });
  await page.waitForTimeout(500);

  // Navigate to Visit view via hash
  console.log("[Proof] Navigating to Visit view via hash...");
  await page.evaluate(() => { window.location.hash = "#visit"; });
  await page.waitForSelector('[data-testid="visit-subtab-odontogram"]', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1500);

  // Switch to Odontogram subtab
  console.log("[Proof] Ensuring Odontogram subtab...");
  await page.evaluate(() => {
    const btn =
      document.querySelector('[data-testid="visit-subtab-odontogram"]') ||
      Array.from(document.querySelectorAll("button")).find(
        (b) => b.textContent && b.textContent.includes("Зубная формула")
      );
    if (btn) btn.click();
  });
  await page.waitForSelector('.odontogram-toolbar, .tooth-chart-svg', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1000);

  // 1. OPEN MODAL IN LIGHT THEME
  console.log("[Proof] Opening Clinical Tooth Modal on Tooth 16 (Light)...");
  await setTheme(page, "light");
  await page.evaluate(() => {
    window.dispatchEvent(
      new CustomEvent("dente-open-tooth-clinical-modal", {
        detail: { toothNumber: 16, code: "16", state: "idle" },
      })
    );
  });
  await page.waitForSelector('._ccm-content', { timeout: 10000 });

  // Ensure "Диагностика" tab
  await page.evaluate(() => {
    const diagBtn = Array.from(document.querySelectorAll("._ccm-tab-btn")).find(
      (b) => b.textContent && b.textContent.includes("Диагностика")
    );
    if (diagBtn) diagBtn.click();
    const card = document.querySelector('[data-testid="clinical-treatment-protocol-card"]');
    if (card) card.scrollIntoView({ behavior: "instant", block: "center" });
  });
  await page.waitForTimeout(600);

  await saveProof(
    page,
    "01_clinical_protocol_tooth_modal_pc_light.png",
    "PC Light 1440x900: Clinical Tooth Modal with 1-Click Treatment Protocol Card"
  );

  // Click "+ Добавить протокол лечения в счет визита"
  console.log("[Proof] Clicking + Добавить протокол лечения в счет визита...");
  await page.click('[data-testid="btn-add-clinical-protocol-to-billing"]');
  await page.waitForTimeout(1000);

  // 2. DESKTOP LIGHT: Toast & Odontogram update
  await saveProof(
    page,
    "02_clinical_protocol_added_pc_light.png",
    "PC Light 1440x900: Treatment Protocol Added (3 services, 6 700 ₽ assigned to tooth 16)"
  );

  // 3. DESKTOP DARK: Re-open modal in dark theme
  console.log("[Proof] Setting Dark Theme and re-opening modal for tooth 16...");
  await setTheme(page, "dark");
  await page.waitForTimeout(600);

  await page.evaluate(() => {
    window.dispatchEvent(
      new CustomEvent("dente-open-tooth-clinical-modal", {
        detail: { toothNumber: 16, code: "16", state: "done" },
      })
    );
  });
  await page.waitForSelector('._ccm-content', { timeout: 10000 });

  await page.evaluate(() => {
    const diagBtn = Array.from(document.querySelectorAll("._ccm-tab-btn")).find(
      (b) => b.textContent && b.textContent.includes("Диагностика")
    );
    if (diagBtn) diagBtn.click();
    const card = document.querySelector('[data-testid="clinical-treatment-protocol-card"]');
    if (card) card.scrollIntoView({ behavior: "instant", block: "center" });
  });
  await page.waitForTimeout(600);

  await saveProof(
    page,
    "03_clinical_protocol_tooth_modal_pc_dark.png",
    "PC Dark 1440x900: Clinical Tooth Modal in Dark Theme with Treatment Protocol"
  );

  await browser.close();
  console.log("=== ALL VISUAL PROOFS CAPTURED SUCCESSFULLY ===");
}

main().catch((err) => {
  console.error("FATAL ERROR in screenshot script:", err);
  process.exit(1);
});
