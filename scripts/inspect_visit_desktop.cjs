const { chromium } = require("playwright");

async function main() {
  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
  });

  const res = await fetch("http://127.0.0.1:4100/api/auth/register-clinic", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clinicName: "Клиника ДЕНТЕ Десктоп EMR",
      adminName: "Д-р Смирнов Е. А.",
      email: `doc.desktop.${Date.now()}@dente.local`,
      phone: "+79991112233",
      role: "owner",
    }),
  });
  const data = await res.json();
  const ct = data.clinicToken;
  const st = data.staffToken;
  const uid = data.user?.id;

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
      allergies: "Пенициллины, лидокаин",
    }),
  });
  const pData = await pRes.json();
  const pid = pData.patient?.id || pData.id;

  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  await ctx.addInitScript(
    ({ ct, st, uid, pid }) => {
      localStorage.setItem("dente_clinic_token", ct);
      localStorage.setItem("dente_staff_token", st);
      localStorage.setItem("dente_active_role", "owner");
      localStorage.setItem("dente_theme_mode", "light");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
      localStorage.setItem("dente_guide_tour_seen_roles_v2", JSON.stringify(["admin", "doctor", "director"]));
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

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      console.log(`[Browser Console Error]`, msg.text());
    }
  });
  page.on("pageerror", (err) => {
    console.log(`[Browser PageError]`, err.message);
  });

  await page.goto("http://127.0.0.1:5173/#visit", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3000);

  const analysis = await page.evaluate(() => {
    const ws = document.querySelector(".workspace");
    const visitEl = document.querySelector("#visit");
    const visitView = document.querySelector('[data-testid="visit-view"]');
    const header = document.querySelector(".visit-monolithic-header");
    const empty = document.querySelector(".empty-state");
    return {
      workspaceClass: ws ? ws.className : null,
      workspaceChildren: ws ? Array.from(ws.children).map((c) => ({ tag: c.tagName, id: c.id, cls: c.className })) : [],
      hasVisitEl: Boolean(visitEl),
      visitElDisplay: visitEl ? window.getComputedStyle(visitEl).display : null,
      visitElVisibility: visitEl ? window.getComputedStyle(visitEl).visibility : null,
      visitElOpacity: visitEl ? window.getComputedStyle(visitEl).opacity : null,
      visitElHeight: visitEl ? visitEl.offsetHeight : null,
      hasVisitView: Boolean(visitView),
      hasMonolithicHeader: Boolean(header),
      hasEmptyState: Boolean(empty),
      emptyText: empty ? empty.textContent : null,
      errorBoundaryText: document.querySelector('[data-testid="error-boundary"]')?.textContent || null,
    };
  });

  console.log("Analysis:\n", JSON.stringify(analysis, null, 2));
  await page.screenshot({ path: "docs/screenshots/audit_emr/debug_desktop.png" });
  await browser.close();
}

main().catch(console.error);
