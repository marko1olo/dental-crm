const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  ctx.addInitScript(() => {
    localStorage.setItem("dente_clinic_token", "live-inquisition-clinic-token");
    localStorage.setItem("dente_staff_token", "live-inquisition-staff-token");
    localStorage.setItem("dente_active_role", "owner");
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dental-crm:web-ui-preferences:v1", JSON.stringify({
      version: 1, uiLanguage: "ru", selectedWorkspaceRole: "owner", selectedPatientId: "pat-1", onboardingDismissed: true, onboardingStep: "done"
    }));
  });
  const page = await ctx.newPage();
  
  const studiesArray = [
    {
      id: "02b00000-0000-0000-0000-000000000001",
      patientFullName: "Захаров Иван Дмитриевич",
      kind: "cbct",
      modality: "CT",
      title: "3D КЛКТ верхней и нижней челюсти 8x8",
      studyDate: "2026-10-03",
      capturedAt: "2026-10-03T10:30:00.000Z",
      sliceCount: 420,
      bindingStatus: "auto_bound",
      previewUrl: "/radiology/sample_rvg_tooth16.jpg"
    },
    {
      id: "02b00000-0000-0000-0000-000000000002",
      patientFullName: "Иванов Алексей Сергеевич",
      kind: "opg",
      modality: "PAN",
      title: "Ортопантомограмма цифровая (ОПТГ)",
      studyDate: "2026-10-03",
      capturedAt: "2026-10-03T14:15:00.000Z",
      sliceCount: 1,
      bindingStatus: "manual_bound",
      previewUrl: "/radiology/sample_rvg_tooth16.jpg"
    },
    {
      id: "02b00000-0000-0000-0000-000000000003",
      patientFullName: "Ковалёв Роман Станиславович",
      kind: "periapical",
      modality: "IO_SENSOR",
      title: "Прицельный снимок RVG 16 зуба",
      studyDate: "2026-10-03",
      capturedAt: "2026-10-03T10:45:00.000Z",
      sliceCount: 1,
      bindingStatus: "auto_bound",
      teethFdi: ["16"],
      previewUrl: "/radiology/sample_rvg_tooth16.jpg"
    }
  ];

  await page.route("**/api/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/api/auth/session") || url.includes("/api/auth/user/me")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ user: { id: "doc-1", fullName: "Д-р Воронов А.В.", role: "owner", active: true } })
      });
    }
    if (url.includes("/api/imaging/studies")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(studiesArray)
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        clinicSettings: { profile: { id: "c-1", clinicName: "Стоматология ДЕНТЕ Премиум" } },
        patients: [{ id: "pat-1", fullName: "Ковалёв Роман" }],
        appointments: [],
        imagingStudies: studiesArray
      })
    });
  });

  console.log("Navigating to #schedule...");
  await page.goto("http://127.0.0.1:5173/#schedule", { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForSelector(".boot-state", { state: "detached", timeout: 45000 }).catch(() => {});
  await page.waitForSelector(".app-shell", { state: "visible", timeout: 30000 });
  console.log("App shell visible!");

  console.log("Clicking a[href='#imaging']...");
  await page.click('a[href="#imaging"]');
  await page.waitForTimeout(1500);

  const radBtn = await page.waitForSelector('[data-testid="imaging-open-radiology-module"]', { timeout: 10000 }).catch(() => null);
  console.log("Found imaging-open-radiology-module:", Boolean(radBtn));

  if (radBtn) {
    await radBtn.click();
    console.log("Clicked imaging-open-radiology-module!");
    const radModal = await page.waitForSelector('[data-testid="radiology-module-container"]', { timeout: 10000 }).catch(() => null);
    if (radModal) {
      console.log("Looking for btn-open-sensor...");
      const sensorBtn = await page.waitForSelector('[data-testid^="btn-open-sensor-"]', { timeout: 10000 }).catch(() => null);
      console.log("Found sensorBtn:", Boolean(sensorBtn));
      if (sensorBtn) {
        await sensorBtn.click();
        console.log("Clicked sensorBtn!");
        const viewer = await page.waitForSelector('[data-testid="sensor-study-viewer"]', { timeout: 10000 }).catch(() => null);
        console.log("Found sensor-study-viewer:", Boolean(viewer));
        if (viewer) {
          await page.screenshot({ path: "C:/Clinic_MVP/dental-crm/docs/screenshots/radiology_windows/test_window1_viewer.png" });
          console.log("Screenshot test_window1_viewer.png captured!");
          const closeBtn = await page.waitForSelector('[data-testid="btn-sensor-close"]', { timeout: 10000 }).catch(() => null);
          console.log("Found closeBtn:", Boolean(closeBtn));
          if (closeBtn) {
            await closeBtn.click();
            console.log("Clicked closeBtn!");
          }
        }
      }
    }
  }

  await browser.close();
})().catch(err => {
  console.error("PROBE ERROR:", err);
  process.exit(1);
});
