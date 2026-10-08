/**
 * scripts/capture_patient_anamnesis_inquisition_proofs.cjs
 *
 * Red Team Inquisitor Gamma:
 * Captures live desktop proofs (1440x900) for Patient Somatic Anamnesis,
 * Allergies, 1-Click Physiological Norm, and Chairside Visit Allergy Badges.
 *
 * Output targets:
 * 1. docs/screenshots/patients/patient_anamnesis_pc_light.png
 * 2. docs/screenshots/patients/patient_anamnesis_pc_dark.png
 * 3. docs/screenshots/patients/patient_visit_allergy_banner_light.png
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const OUT_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/patients");
const WEB_BASE = "http://127.0.0.1:5173";

const mockPatients = [
  {
    id: "01a00000-0000-0000-0000-000000000001",
    organizationId: "00000000-0000-0000-0000-000000000001",
    fullName: "Смирнова Анна Сергеевна",
    birthDate: "1988-04-12",
    gender: "female",
    phone: "+7 916 234-56-78",
    email: "smirnova.anna@example.com",
    notes: "ВНИМАНИЕ: Аллергия на пенициллиновый ряд (Амоксиклав)! Анамнез: артериальная гипертензия 1 ст. АД под контролем (125/80).",
    allergies: "Аллергия на пенициллины (Амоксиклав)",
    somaticNotes: "Артериальная гипертензия 1 ст.",
    concomitantDiseases: "Артериальная гипертензия 1 ст. АД 125/80",
    status: "active",
    balanceRub: 15000,
    depositRub: 0,
    clinicalSafetyProfile: {
      hasPenicillinAllergy: true,
      hasHypertension: true,
      hasCardiovascularDisease: true,
      pregnancyTrimester: "none",
      customAllergyNotes: "Аллергия на пенициллины (Амоксиклав)",
      customChronicNotes: "Артериальная гипертензия 1 ст.",
    },
  },
  {
    id: "01a00000-0000-0000-0000-000000000002",
    organizationId: "00000000-0000-0000-0000-000000000001",
    fullName: "Воронов Алексей Владимирович",
    birthDate: "1985-06-20",
    gender: "male",
    phone: "+7 925 876-54-32",
    email: "voronov.alex@example.com",
    notes: "Соматически здоров. Физиологическая норма. Аллергоанамнез не отягощен.",
    allergies: "Аллергии не выявлены",
    somaticNotes: "Соматически здоров. Норма.",
    status: "active",
    balanceRub: 0,
    depositRub: 0,
  },
];

const mockAppointments = [
  {
    id: "appt-1",
    organizationId: "00000000-0000-0000-0000-000000000001",
    patientId: "01a00000-0000-0000-0000-000000000001",
    patientName: "Смирнова Анна Сергеевна",
    doctorId: "doc-1",
    doctorName: "Д-р Воронов Алексей Владимирович",
    chairId: "chair-1",
    status: "in_progress",
    startTime: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    startAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    durationMinutes: 60,
    serviceTitle: "Лечение кариеса зуба 16",
    colorVita: "A2",
    patient: mockPatients[0],
  },
];

const mockDashboard = {
  clinicName: "Стоматология ДЕНТЕ Премиум",
  todayIso: new Date().toLocaleDateString("en-CA"),
  clinicSettings: {
    profile: {
      id: "c-1",
      organizationId: "00000000-0000-0000-0000-000000000001",
      clinicName: "Стоматология ДЕНТЕ Премиум",
      mode: "small_clinic",
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
    serviceCatalog: [
      { id: "s-1", name: "Консультация врача-стоматолога", priceRub: 1500, category: "consultation" },
      { id: "s-2", name: "Лечение кариеса эмали", priceRub: 4500, category: "therapy" },
    ],
  },
  patients: mockPatients,
  appointments: mockAppointments,
  serviceCatalog: [
    { id: "s-1", name: "Консультация врача-стоматолога", priceRub: 1500, category: "consultation" },
    { id: "s-2", name: "Лечение кариеса эмали", priceRub: 4500, category: "therapy" },
  ],
};

async function setTheme(page, theme) {
  await page.evaluate((t) => {
    try {
      localStorage.setItem("dente_theme_mode", t);
      localStorage.setItem("dente_theme", t);
      document.documentElement.setAttribute("data-theme", t);
      document.documentElement.classList.toggle("dark", t === "dark");
      if (window.__denteThemeStore) {
        window.__denteThemeStore.getState().setTheme(t);
      }
    } catch (e) {}
  }, theme);
  await page.waitForTimeout(600);
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log("[1/6] Launching Chromium (channel chrome) via Playwright...");
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--window-size=1440,900",
    ],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });

  await context.addInitScript(() => {
    localStorage.setItem("dente_clinic_token", "live-token");
    localStorage.setItem("dente_staff_token", "live-token");
    localStorage.setItem("dente_theme_mode", "light");
    localStorage.setItem("dente_theme", "light");
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dente_onboarding_dismissed", "true");
    localStorage.setItem("dente_active_role", "owner");
    localStorage.setItem(
      "dente_cached_active_staff_user",
      JSON.stringify({
        id: "doc-1",
        fullName: "Д-р Воронов Алексей Владимирович",
        role: "owner",
        email: "therapist@dente.local",
        organizationId: "00000000-0000-0000-0000-000000000001",
        specialization: "Терапевт",
      })
    );
  });

  const page = await context.newPage();

  // Intercept all API routes
  await page.route("**/api/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/src/")) return route.continue();
    if (url.includes("/api/dashboard")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockDashboard),
      });
    }
    if (url.includes("/api/auth/user/me") || url.includes("/api/auth/session")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            id: "doc-1",
            fullName: "Д-р Воронов Алексей Владимирович",
            role: "owner",
            active: true,
            organizationId: "00000000-0000-0000-0000-000000000001",
          },
        }),
      });
    }
    if (url.includes("/api/auth/staff/unlock")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          token: "live-staff-token",
          user: {
            id: "doc-1",
            fullName: "Д-р Воронов Алексей Владимирович",
            role: "owner",
          },
        }),
      });
    }
    if (url.includes("/api/patients")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockPatients),
      });
    }
    if (url.includes("/api/appointments")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockAppointments),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });

  // 1. LIGHT MODE: Navigate to #patients
  console.log("[2/6] Navigating to Patients Registry (Light mode)...");
  await page.goto(`${WEB_BASE}/#patients`, { waitUntil: "domcontentloaded", timeout: 30000 });

  // Wait for loading screen to disappear
  console.log("Waiting for patients registry to mount...");
  await page.locator('nav, .patient-list, .patient-row, [data-testid="patient-core-save-btn"]').first().waitFor({ timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2000);

  // Click on patient Smirnova Anna in the list
  console.log("[3/6] Selecting patient Smirnova Anna...");
  const patientRow = page.locator('.patient-row, [data-patient-id], h3:has-text("Смирнова Анна")').first();
  if (await patientRow.isVisible()) {
    await patientRow.click();
    await page.waitForTimeout(1000);
  }

  // Open PatientCardModal via More Actions menu
  const moreBtn = page.locator('[data-testid="patient-card-more-actions-btn"]');
  if (await moreBtn.isVisible()) {
    console.log("Clicking More Actions menu...");
    await moreBtn.click();
    await page.waitForTimeout(600);
    const openCardBtn = page.locator('[data-testid="open-patient-card-modal-btn"]');
    if (await openCardBtn.isVisible()) {
      console.log("Clicking Open Patient Card Modal...");
      await openCardBtn.click();
      await page.waitForTimeout(1200);
    }
  }

  // If modal not open yet, try row actions menu
  const cardModal = page.locator('[data-testid="patient-card-modal"]');
  if (!(await cardModal.isVisible())) {
    const rowMoreBtn = page.locator('[data-testid^="patient-row-more-btn-"]').first();
    if (await rowMoreBtn.isVisible()) {
      await rowMoreBtn.click();
      await page.waitForTimeout(600);
      const rowCardBtn = page.locator('[data-testid="open-patient-card-modal-btn"], button:has-text("Медицинская карта")').first();
      if (await rowCardBtn.isVisible()) {
        await rowCardBtn.click();
        await page.waitForTimeout(1200);
      }
    }
  }

  // Switch to Anamnesis / Somatic tab in modal
  const somaticTab = page.locator('[data-testid="tab-patient-anamnesis"]');
  if (await somaticTab.isVisible()) {
    console.log("Switching to Anamnesis (Соматика) tab...");
    await somaticTab.click();
    await page.waitForTimeout(1000);
  }

  // Set theme to light
  await setTheme(page, "light");

  // Capture Screenshot 1: patient_anamnesis_pc_light.png
  console.log("[4/6] Capturing patient_anamnesis_pc_light.png...");
  const shot1 = path.join(OUT_DIR, "patient_anamnesis_pc_light.png");
  await page.screenshot({ path: shot1, fullPage: false });
  console.log(`Saved: ${shot1} (${fs.statSync(shot1).size} bytes)`);

  // Switch to DARK MODE
  console.log("[5/6] Switching to Dark mode...");
  await setTheme(page, "dark");

  // Capture Screenshot 2: patient_anamnesis_pc_dark.png
  console.log("Capturing patient_anamnesis_pc_dark.png...");
  const shot2 = path.join(OUT_DIR, "patient_anamnesis_pc_dark.png");
  await page.screenshot({ path: shot2, fullPage: false });
  console.log(`Saved: ${shot2} (${fs.statSync(shot2).size} bytes)`);

  // Switch back to LIGHT MODE for Visit View
  await setTheme(page, "light");

  // Close PatientCardModal (press Escape or click close)
  await page.keyboard.press("Escape");
  await page.waitForTimeout(600);

  // Navigate to #visit (Chairside Visit Workspace)
  console.log("[6/6] Navigating to Chairside Visit (#visit)...");
  await page.goto(`${WEB_BASE}/#visit`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.locator('[data-testid="btn-somatic-norm-one-click"], [data-testid="visit-focus-allergy-alert"], [data-testid="visit-focus-allergy-clean"], .visit-view').first().waitFor({ timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(2000);

  // Capture Screenshot 3: patient_visit_allergy_banner_light.png
  console.log("Capturing patient_visit_allergy_banner_light.png...");
  const shot3 = path.join(OUT_DIR, "patient_visit_allergy_banner_light.png");
  await page.screenshot({ path: shot3, fullPage: false });
  console.log(`Saved: ${shot3} (${fs.statSync(shot3).size} bytes)`);

  await browser.close();
  console.log("All 3 screenshot proofs successfully captured and saved!");
}

main().catch((err) => {
  console.error("Capture script failed:", err);
  process.exit(1);
});
