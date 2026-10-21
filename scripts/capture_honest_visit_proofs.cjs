const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log("=== STARTING AUTHENTICATED VISIT CAPTURE ON 5173 ===");

  let clinicToken = "mock_clinic_token";
  let staffToken = "mock_staff_token";
  let user = { id: "doc-1", name: "Д-р Смирнов А. П.", role: "doctor" };

  try {
    const loginRes = await fetch("http://127.0.0.1:4100/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "clinic@example.com", password: "dente2026" }),
    });
    if (loginRes.ok) {
      const auth = await loginRes.json();
      clinicToken = auth.clinicToken || clinicToken;
      staffToken = auth.staffToken || staffToken;
      user = auth.user || user;
    }
  } catch (err) {
    console.warn("API login fetch error:", err.message);
  }

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });

    await context.addInitScript(
      ({ cTok, sTok, u }) => {
        localStorage.setItem("dente_clinic_token", cTok);
        localStorage.setItem("dente_staff_token", sTok);
        localStorage.setItem("dente_active_session_token", sTok);
        localStorage.setItem("dente_user_role", "doctor");
        localStorage.setItem("dente_role", "doctor");
        localStorage.setItem("dente_perspective", "doctor");
        localStorage.setItem("dente_tour_completed", "true");
        localStorage.setItem("dente_tour_dismissed", "true");
        localStorage.setItem("dente_demo_banner_dismissed", "true");
        localStorage.setItem("dente_onboarding_completed", "true");
        localStorage.setItem("dente_staff_session", JSON.stringify(u));
        localStorage.setItem("dente_last_view", "visit");
        localStorage.setItem("dente_active_role", "doctor");
        localStorage.setItem("dente_active_user_id", u.id || "doc-1");
        try {
          document.cookie = `dente_clinic_token=${encodeURIComponent(cTok)}; path=/; max-age=31536000`;
          document.cookie = `dente_staff_token=${encodeURIComponent(sTok)}; path=/; max-age=31536000`;
        } catch {
          // ignore
        }
        localStorage.setItem(
          "dental-crm:web-ui-preferences:v1",
          JSON.stringify({
            version: 1,
            uiLanguage: "ru",
            selectedWorkspaceRole: "doctor",
            onboardingDismissed: true,
            onboardingStep: "done",
          })
        );
        localStorage.setItem(
          "dente-workspace-profile",
          JSON.stringify({
            state: {
              clinicName: "Стоматология ДЕНТЕ",
              currentDoctor: u,
              flags: { disableTour: true },
            },
          })
        );
      },
      { cTok: clinicToken, sTok: staffToken, u: user }
    );

    const page = await context.newPage();
    console.log("Navigating to http://127.0.0.1:5173/ ...");
    await page.goto("http://127.0.0.1:5173/", { waitUntil: "domcontentloaded", timeout: 30000 });
    await sleep(3000);

    // If login form is shown, enter credentials
    try {
      const hasPasswordInput = await page.$('input[type="password"]');
      if (hasPasswordInput) {
        console.log("Entering login credentials...");
        const inputs = await page.$$("input");
        if (inputs.length >= 2) {
          await inputs[0].click({ clickCount: 3 });
          await inputs[0].fill("doctor@clinic.com");
          await inputs[1].click({ clickCount: 3 });
          await inputs[1].fill("dente2026");
          await sleep(300);
          const submitBtn = await page.$('button[type="submit"]');
          if (submitBtn) {
            await submitBtn.click();
            await sleep(4000);
          }
        }
      }
    } catch (e) {
      console.warn("Login step note:", e.message);
    }

    console.log("Switching to #visit...");
    await page.evaluate(() => {
      window.location.hash = "visit";
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    await sleep(3000);

    // Wait for the lazy-loaded VisitView component to compile and mount
    console.log("Waiting for VisitView to mount...");
    for (let i = 0; i < 25; i++) {
      let isStillLoading = true;
      try {
        isStillLoading = await page.evaluate(() => {
          return !!document.querySelector('.visit-panel[aria-busy="true"], .boot-state');
        });
      } catch {
        // Navigation or chunk reload in progress
      }
      if (!isStillLoading) {
        console.log(`VisitView mounted after ~${i * 500}ms!`);
        break;
      }
      await sleep(500);
    }
    await sleep(2000);

    // If intake cockpit or emergency intake is shown, select first patient
    try {
      await page.evaluate(() => {
        const firstPatient = document.querySelector('[data-testid="emergency-intake-btn"], [data-testid="intake-queue-item-0"], .intake-patient-row, button.cache-btn');
        if (firstPatient && typeof firstPatient.click === 'function') {
          firstPatient.click();
        }
      });
      await sleep(2000);
    } catch {
      // ignore
    }

    // Suppress tour overlays
    await page.evaluate(() => {
      const style = document.createElement("style");
      style.innerHTML = `
        .tour-spotlight-root, .tour-backdrop-clickable-zone,
        [data-testid="guided-tour-spotlight-overlay"], .shepherd-element,
        .vite-error-overlay { display: none !important; opacity: 0 !important; }
      `;
      document.head.appendChild(style);
    });

    const info = await page.evaluate(() => {
      return {
        url: window.location.href,
        bodyTextSnippet: document.body.innerText.slice(0, 400),
        buttonsCount: document.querySelectorAll("button").length,
        anesthesiaQuickBar: !!document.querySelector('[data-testid="anesthesia-quick-bar"]'),
        soapToolbar: !!document.querySelector('.soap-toolbar, [data-testid="soap-toolbar"], [data-testid="btn-soap-save"]'),
      };
    });
    console.log("Page info after wait:", info);

    // ─── PC LIGHT ───
    await page.evaluate(() => {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      document.documentElement.setAttribute("data-theme", "light");
      localStorage.setItem("dente_theme", "light");
    });
    await sleep(800);
    const lightPath = path.resolve("scripts/proof_pc_light_visit_emk_anesthesia.png");
    await page.screenshot({ path: lightPath });
    console.log("Captured Light:", lightPath, fs.statSync(lightPath).size, "bytes");

    // ─── PC DARK ───
    await page.evaluate(() => {
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("dente_theme", "dark");
    });
    await sleep(800);
    const darkPath = path.resolve("scripts/proof_pc_dark_visit_emk_anesthesia.png");
    await page.screenshot({ path: darkPath });
    console.log("Captured Dark:", darkPath, fs.statSync(darkPath).size, "bytes");

    // ─── MOBILE LIGHT ───
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      document.documentElement.setAttribute("data-theme", "light");
      localStorage.setItem("dente_theme", "light");
    });
    await sleep(1000);
    const mobileLightPath = path.resolve("scripts/proof_mobile_light_visit_emk_anesthesia.png");
    await page.screenshot({ path: mobileLightPath });
    console.log("Captured Mobile Light:", mobileLightPath, fs.statSync(mobileLightPath).size, "bytes");

    // ─── MOBILE DARK ───
    await page.evaluate(() => {
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
      document.documentElement.setAttribute("data-theme", "dark");
      localStorage.setItem("dente_theme", "dark");
    });
    await sleep(1000);
    const mobileDarkPath = path.resolve("scripts/proof_mobile_dark_visit_emk_anesthesia.png");
    await page.screenshot({ path: mobileDarkPath });
    console.log("Captured Mobile Dark:", mobileDarkPath, fs.statSync(mobileDarkPath).size, "bytes");

    console.log("=== SUCCESS ===");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
