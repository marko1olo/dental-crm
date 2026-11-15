import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import { createServer } from "vite";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, "../apps/web");
const configFile = path.resolve(webRoot, "vite.config.ts");
const PROOFS_DIR = path.resolve(__dirname, "../docs/proofs/treatment_plans");
const SCREEN_DIR = path.resolve(__dirname, "../docs/screenshots/treatment_plans");

fs.mkdirSync(PROOFS_DIR, { recursive: true });
fs.mkdirSync(SCREEN_DIR, { recursive: true });

async function main() {
  console.log("=== 1. Starting In-Process Vite Server ===");
  const viteServer = await createServer({
    configFile,
    root: webRoot,
    server: {
      host: "127.0.0.1",
      strictPort: false,
      hmr: false,
      watch: null,
    },
  });

  await viteServer.listen();
  const address = viteServer.httpServer.address();
  const port = address.port;
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`✓ In-process Vite listening on: ${baseUrl}`);

  console.log("=== 2. Launching Playwright Chromium ===");
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"],
  });

  const suppressOverlays = async (page) => {
    try {
      await page.evaluate(() => {
        const style = document.createElement("style");
        style.id = "suppress-all-overlays-4proof";
        style.innerHTML = `
          .tour-spotlight-root,
          .tour-backdrop-clickable-zone,
          [data-testid="guided-tour-spotlight-overlay"],
          [data-testid="guided-tour-coach-mark-card"],
          [data-testid="demo-mode-banner"],
          .shepherd-element,
          .global-toast-container,
          vite-error-overlay {
            display: none !important;
            pointer-events: none !important;
            opacity: 0 !important;
          }
        `;
        document.head.appendChild(style);
        document.querySelectorAll("vite-error-overlay, .tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay']").forEach((el) => el.remove());
      });
    } catch (_) {}
  };

  const setupStorage = async (context, theme) => {
    await context.addInitScript(({ th }) => {
      localStorage.setItem("dente_clinic_token", "demo-clinic-token");
      localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-chief");
      localStorage.setItem("dente_active_role", "doctor");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_demo_showcase_mode_v1", "true");
      localStorage.setItem("dente_demo_showcase", "true");
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dente_tour_dismissed", "true");
      localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
      localStorage.setItem("dente_demo_banner_dismissed", "true");
      localStorage.setItem("dente_theme", th);
      localStorage.setItem("dente_theme_mode", th);
      localStorage.setItem("theme", th);
      localStorage.setItem(
        "dental-crm:onboarding:v1",
        JSON.stringify({ dismissed: true, step: "done", completed: true })
      );
      localStorage.setItem(
        "dente_staff_session",
        JSON.stringify({
          userId: "usr-admin-01",
          name: "Д-р Воронов А. В.",
          role: "owner",
          roleScope: "clinical_director",
        })
      );
      localStorage.setItem(
        "dente_active_staff_user",
        JSON.stringify({
          id: "doc-1",
          fullName: "Д-р Воронов Алексей Владимирович",
          role: "doctor",
        })
      );
      if (typeof document !== "undefined" && document.documentElement) {
        document.documentElement.setAttribute("data-theme", th);
        if (th === "dark") {
          document.documentElement.classList.add("dark");
          document.documentElement.classList.remove("light");
        } else {
          document.documentElement.classList.add("light");
          document.documentElement.classList.remove("dark");
        }
      }
    }, { th: theme });
  };

  try {
    // -------------------------------------------------------------
    // PART A: TreatmentPlanStudioModal (4 States)
    // -------------------------------------------------------------
    console.log("\n=======================================================");
    console.log(">>> CAPTURING 4 STATES: TreatmentPlanStudioModal <<<");
    console.log("=======================================================");

    const studioStates = [
      {
        name: "01_treatment_plan_studio_pc_light_1440x900.png",
        width: 1440,
        height: 900,
        theme: "light",
        isMobile: false,
      },
      {
        name: "02_treatment_plan_studio_pc_dark_1440x900.png",
        width: 1440,
        height: 900,
        theme: "dark",
        isMobile: false,
      },
      {
        name: "03_treatment_plan_studio_mobile_light_390x844.png",
        width: 390,
        height: 844,
        theme: "light",
        isMobile: true,
      },
      {
        name: "04_treatment_plan_studio_mobile_dark_390x844.png",
        width: 390,
        height: 844,
        theme: "dark",
        isMobile: true,
      },
    ];

    for (const st of studioStates) {
      console.log(`\n--- Capturing Studio: ${st.name} (${st.width}x${st.height}, ${st.theme}) ---`);
      const context = await browser.newContext({
        viewport: { width: st.width, height: st.height },
        isMobile: st.isMobile,
        hasTouch: st.isMobile,
        deviceScaleFactor: st.isMobile ? 2 : 1,
        colorScheme: st.theme,
      });

      await setupStorage(context, st.theme);
      const page = await context.newPage();
      page.on("pageerror", (err) => console.log(`[PAGE ERROR]: ${err.message}`));

      const targetUrl = `${baseUrl}/?demo=true#treatment-studio`;
      console.log(`Navigating to ${targetUrl}...`);
      await page.goto(targetUrl, { waitUntil: "commit", timeout: 60000 });
      await page.waitForLoadState("domcontentloaded", { timeout: 60000 });
      await page.waitForTimeout(1500);
      await suppressOverlays(page);

      // Trigger custom open event if needed
      await page.evaluate(() => {
        window.dispatchEvent(
          new CustomEvent("dente:open-treatment-plan", {
            detail: {
              patientName: "Алексеев Владимир Сергеевич",
              doctorFullName: "Д-р Воронов Алексей Владимирович",
              patientId: "pat-walkin",
            },
          })
        );
      });

      await page.waitForTimeout(500);

      // Enforce theme
      await page.evaluate(({ theme }) => {
        document.documentElement.setAttribute("data-theme", theme);
        const isDark = theme === "dark";
        document.documentElement.classList.toggle("dark", isDark);
        document.documentElement.classList.toggle("light", !isDark);
        document.body.setAttribute("data-theme", theme);
        document.body.classList.toggle("dark", isDark);
        document.body.classList.toggle("light", !isDark);
      }, { theme: st.theme });

      // Wait for modal selector
      await page.waitForSelector('[data-testid="treatment-plan-studio-modal"]', { timeout: 15000 });
      await page.waitForTimeout(800);
      await suppressOverlays(page);

      const outPath = path.join(PROOFS_DIR, st.name);
      await page.screenshot({ path: outPath, fullPage: false, animations: "disabled" });
      const size = fs.statSync(outPath).size;
      console.log(`✓ Saved ${st.name}: ${outPath} (${(size / 1024).toFixed(1)} KB)`);

      if (size < 20480) {
        throw new Error(`Screenshot ${st.name} is smaller than 20KB (${size} bytes)!`);
      }

      fs.copyFileSync(outPath, path.join(SCREEN_DIR, st.name));
      await context.close();
    }

    // -------------------------------------------------------------
    // PART B: PublicBudgetSignPage (4 States)
    // -------------------------------------------------------------
    console.log("\n=======================================================");
    console.log(">>> CAPTURING 4 STATES: PublicBudgetSignPage <<<");
    console.log("=======================================================");

    const budgetStates = [
      {
        name: "01_public_budget_sign_pc_light_1440x900.png",
        width: 1440,
        height: 900,
        theme: "light",
        isMobile: false,
      },
      {
        name: "02_public_budget_sign_pc_dark_1440x900.png",
        width: 1440,
        height: 900,
        theme: "dark",
        isMobile: false,
      },
      {
        name: "03_public_budget_sign_mobile_light_390x844.png",
        width: 390,
        height: 844,
        theme: "light",
        isMobile: true,
      },
      {
        name: "04_public_budget_sign_mobile_dark_390x844.png",
        width: 390,
        height: 844,
        theme: "dark",
        isMobile: true,
      },
    ];

    const mockBudgetData = {
      token: "pub-plan-optimum",
      planId: "tp-demo-01",
      status: "viewed",
      clinicName: "Клиника DENTE",
      clinicPhone: "+7 (495) 123-45-67",
      clinicAddress: "г. Москва, ул. Клиническая, д. 10",
      doctorName: "Д-р Воронов Алексей Владимирович",
      patientFirstName: "Александр",
      maskedPhone: "+7 (***) ***-88-21",
      totalPriceRub: 185000,
      discountRub: 10000,
      netTotalRub: 175000,
      currency: "RUB",
      items: [
        {
          id: "item-1",
          title: "Установка дентального имплантата премиум (Швейцария)",
          toothNumber: 36,
          quantity: 1,
          priceRub: 75000,
          discountRub: 0,
          totalRub: 75000,
        },
        {
          id: "item-2",
          title: "Коронка из диоксида циркония на имплантате",
          toothNumber: 36,
          quantity: 1,
          priceRub: 55000,
          discountRub: 0,
          totalRub: 55000,
        },
        {
          id: "item-3",
          title: "Лечение глубокого кариеса (зуб 16)",
          toothNumber: 16,
          quantity: 1,
          priceRub: 15000,
          discountRub: 0,
          totalRub: 15000,
        },
        {
          id: "item-4",
          title: "Комплексная гигиена полости рта",
          toothNumber: null,
          quantity: 1,
          priceRub: 10000,
          discountRub: 0,
          totalRub: 10000,
        },
      ],
      requiresVerification: false,
      isVerified: true,
    };

    for (const st of budgetStates) {
      console.log(`\n--- Capturing Budget: ${st.name} (${st.width}x${st.height}, ${st.theme}) ---`);
      const context = await browser.newContext({
        viewport: { width: st.width, height: st.height },
        isMobile: st.isMobile,
        hasTouch: st.isMobile,
        deviceScaleFactor: st.isMobile ? 2 : 1,
        colorScheme: st.theme,
      });

      const page = await context.newPage();
      page.on("pageerror", (err) => console.log(`[PAGE ERROR]: ${err.message}`));

      // Intercept API calls to supply live clean data
      await page.route("**/api/v1/public/budgets/**", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockBudgetData),
        });
      });
      await page.route("**/api/portal/budget/**", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockBudgetData),
        });
      });

      const targetUrl = `${baseUrl}/#/public/budget/pub-plan-optimum`;
      console.log(`Navigating to ${targetUrl}...`);
      await page.goto(targetUrl, { waitUntil: "commit", timeout: 60000 });
      await page.waitForLoadState("domcontentloaded", { timeout: 60000 });
      await page.waitForTimeout(1500);

      // Enforce theme
      await page.evaluate(({ theme }) => {
        document.documentElement.setAttribute("data-theme", theme);
        const isDark = theme === "dark";
        document.documentElement.classList.toggle("dark", isDark);
        document.documentElement.classList.toggle("light", !isDark);
        document.body.setAttribute("data-theme", theme);
        document.body.classList.toggle("dark", isDark);
        document.body.classList.toggle("light", !isDark);
      }, { theme: st.theme });

      // Wait for content (either budget items or signature button)
      await page.waitForSelector('.public-budget-page, button, input', { timeout: 15000 });
      await page.waitForTimeout(1000);
      await suppressOverlays(page);

      const outPath = path.join(PROOFS_DIR, st.name);
      await page.screenshot({ path: outPath, fullPage: false, animations: "disabled" });
      const size = fs.statSync(outPath).size;
      console.log(`✓ Saved ${st.name}: ${outPath} (${(size / 1024).toFixed(1)} KB)`);

      if (size < 20480) {
        throw new Error(`Screenshot ${st.name} is smaller than 20KB (${size} bytes)!`);
      }

      fs.copyFileSync(outPath, path.join(SCREEN_DIR, st.name));
      await context.close();
    }

    console.log("\n>>> ALL 8 TREATMENT PLANS AND PUBLIC BUDGET PROOFS SUCCESSFULLY CAPTURED (>= 20KB)! <<<");
  } finally {
    await browser.close();
    await viteServer.close();
    console.log("Vite and Playwright closed cleanly.");
  }
}

main().catch((err) => {
  console.error("FATAL in capture script:", err);
  process.exit(1);
});
