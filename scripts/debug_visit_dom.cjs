const { chromium } = require("playwright");

async function run() {
  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
  });
  const res = await fetch("http://127.0.0.1:4100/api/auth/register-clinic", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clinicName: "Клиника ДЕНТЕ RedTeam EMR",
      adminName: "Д-р Смирнов Е. А.",
      email: "doctor.audit.emr@dente.local",
      phone: "+79998887766",
      role: "owner",
    }),
  });
  const data = await res.json();
  const ct = data.clinicToken;
  const st = data.staffToken;
  const uid = data.user?.id;

  // Create patient
  const pRes = await fetch("http://127.0.0.1:4100/api/patients", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-clinic-token": ct,
      "x-staff-token": st,
    },
    body: JSON.stringify({
      fullName: "Иванова Марина Юрьевна",
      phone: "+79162345678",
      birthDate: "1990-05-14",
      gender: "female",
      allergies: "Лидокаин, Новокаин (отек Квинке)",
    }),
  });
  const pData = await pRes.json();
  const pid = pData.patient?.id || pData.id;

  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(
    ({ ct, st, uid, pid }) => {
      localStorage.setItem("dente_clinic_token", ct);
      localStorage.setItem("dente_staff_token", st);
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_theme_mode", "light");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem(
        "dente_quest_progress_v2",
        JSON.stringify({
          activeTrackId: "solo_doctor",
          currentStepIndex: 0,
          completedStepIds: [],
          isTourActive: false,
          isDismissedPermanently: true,
          tracksProgress: {
            solo_doctor: { completed: true, completedStepIds: [] },
            reception_admin: { completed: true, completedStepIds: [] },
            imaging_diagnostics: { completed: true, completedStepIds: [] },
          },
        })
      );
      localStorage.setItem(
        "dente_ui_preferences_v1",
        JSON.stringify({
          onboardingDismissed: true,
          onboardingStep: "done",
          version: 1,
        })
      );
      localStorage.setItem(
        "dental-crm:onboarding:v1",
        JSON.stringify({
          dismissed: true,
          step: "done",
          completed: true,
          onboardingDismissed: true,
          onboardingStep: "done",
          version: 1,
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
    },
    { ct, st, uid, pid }
  );

  const page = await ctx.newPage();
  await page.goto("http://127.0.0.1:5173/#visit", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  const info = await page.evaluate(() => {
    const mainEl = document.querySelector(".main-content") || document.querySelector("main");
    return {
      hash: window.location.hash,
      pathname: window.location.pathname,
      hasAppShell: Boolean(document.querySelector(".app-shell")),
      hasVisitView: Boolean(document.querySelector('[data-testid="visit-view"]')),
      hasEmptyState: Boolean(document.querySelector('.empty-state, [data-testid="empty-state"]')),
      hasBootState: Boolean(document.querySelector(".boot-state")),
      hasError: Boolean(document.querySelector(".error-boundary, .error-panel")),
      mainHtmlSnippet: mainEl ? mainEl.innerHTML.slice(0, 500) : "NO MAIN EL",
      bodyHtmlSnippet: document.body.innerHTML.slice(0, 500),
      localStorageKeys: Object.keys(localStorage),
    };
  });

  console.log("DOM INFO:\n", JSON.stringify(info, null, 2));
  await browser.close();
}

run().catch((e) => console.error(e));
