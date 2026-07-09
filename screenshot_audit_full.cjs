const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const OUTPUT_DIR = "C:/Clinic_MVP/dental-crm/docs/proofs/ui_audit";

async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function setupPage(browser, width, height, theme) {
  const context = await browser.newContext({
    viewport: { width, height },
    colorScheme: theme,
  });
  const page = await context.newPage();

  await page.route(/\/api\//, async (route) => {
    const url = route.request().url();
    if (url.includes("/api/dashboard")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: fs.readFileSync(path.join(__dirname, "mock-dashboard.json"), "utf8") });
    } else if (url.includes("/api/auth/user/me")) {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ id: "u-123", role: "admin", name: "Dr. House", organizationId: "clinic-1" }) });
    } else if (url.includes("/api/visits/") && url.includes("/tooth-states")) {
      // Mock tooth states for odontogram
      const teeth = Array.from({length: 32}, (_, i) => ({
        toothNumber: i + 1,
        status: i % 5 === 0 ? "caries" : i % 7 === 0 ? "missing" : "healthy",
        notes: ""
      }));
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ data: teeth }) });
    } else {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: [], items: [], total: 0 }) });
    }
  });

  await page.addInitScript((t) => {
    localStorage.setItem("dente_theme", t);
    localStorage.setItem("dente_theme_mode", t);
    localStorage.setItem("dente_dev_bypass_auth", "true");
    const jwt = "eyJvcmdhbml6YXRpb25JZCI6ImNsaW5pYy0xIiwicm9sZSI6ImFkbWluIiwiZXhwIjoxNzgzOTc2MzM4fQ.bdP5b2l9NXRJ2KCzPiePb3kQSD6Kam0eSGQQFAyDiBw";
    localStorage.setItem("dente_clinic_token", jwt);
    localStorage.setItem("dente_staff_token", jwt);
    localStorage.setItem("dente_user", JSON.stringify({ id: "u-123", role: "admin", name: "Dr. House" }));
    if (t === "dark") {
      document.documentElement.classList.add("dark");
      document.body.setAttribute("data-theme", "dark");
      document.body.classList.add("theme-dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.body.setAttribute("data-theme", "light");
      document.body.classList.remove("theme-dark");
    }
  }, theme);

  return { context, page };
}

async function forceTheme(page, theme) {
  await page.evaluate((t) => {
    localStorage.setItem("dente_theme_mode", t);
    if (t === "dark") {
      document.documentElement.classList.add("dark");
      document.body.setAttribute("data-theme", "dark");
      document.body.classList.add("theme-dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.body.setAttribute("data-theme", "light");
      document.body.classList.remove("theme-dark");
    }
  }, theme);
}

(async () => {
  const browser = await chromium.launch({ headless: true });

  const states = [
    { name: "PC_LIGHT",     width: 1366, height: 900, theme: "light" },
    { name: "PC_DARK",      width: 1366, height: 900, theme: "dark"  },
    { name: "MOBILE_LIGHT", width: 390,  height: 844, theme: "light" },
    { name: "MOBILE_DARK",  width: 390,  height: 844, theme: "dark"  },
  ];

  for (const state of states) {
    console.log(`\n=== ${state.name} ===`);
    const { context, page } = await setupPage(browser, state.width, state.height, state.theme);

    // --- DASHBOARD ---
    await page.goto("http://127.0.0.1:5173/");
    await wait(4000);
    await forceTheme(page, state.theme);
    await wait(400);
    await page.screenshot({ path: path.join(OUTPUT_DIR, `Dashboard_${state.name}.png`) });
    console.log(`[${state.name}] ✔ Dashboard`);

    // --- SIDEBAR: check labels fixed ---
    const financeLabel = await page.locator("text=Финансы").count();
    const analyticsLabel = await page.locator("text=BI Аналитика").count();
    console.log(`[${state.name}] Финансы label found: ${financeLabel}, BI Аналитика: ${analyticsLabel}`);

    // --- VISIT VIEW: navigate to visit ---
    // Click "Открыть прием" to go to visit view
    const openVisitBtn = page.locator("button:has-text('Открыть прием'), a:has-text('Открыть прием')").first();
    const hasVisitBtn = await openVisitBtn.count();
    if (hasVisitBtn > 0) {
      await openVisitBtn.click();
      await wait(3000);
      await forceTheme(page, state.theme);
      await wait(300);

      // Screenshot: top of visit view (SOAP area)
      await page.screenshot({ path: path.join(OUTPUT_DIR, `VisitView_Top_${state.name}.png`) });
      console.log(`[${state.name}] ✔ Visit top`);

      // Scroll down to find odontogram
      const mainContent = page.locator("main, [data-testid='main-content'], .workspace-content, .visit-content").first();
      
      // Try to find odontogram directly
      const odontogramEl = page.locator("[class*='odontogram'], [data-testid='odontogram'], .odontogram-container, canvas").first();
      const odontogramExists = await odontogramEl.count();
      
      if (odontogramExists > 0) {
        await odontogramEl.scrollIntoViewIfNeeded();
        await wait(800);
        await page.screenshot({ path: path.join(OUTPUT_DIR, `Odontogram_${state.name}.png`) });
        console.log(`[${state.name}] ✔ Odontogram (element found)`);
      } else {
        // Scroll down progressively and screenshot
        for (let scroll = 600; scroll <= 2400; scroll += 600) {
          await page.evaluate((s) => window.scrollTo(0, s), scroll);
          await wait(500);
        }
        await page.screenshot({ path: path.join(OUTPUT_DIR, `Odontogram_${state.name}.png`) });
        console.log(`[${state.name}] ✔ Scrolled-to-bottom screenshot`);
      }
    } else {
      // Navigate via URL to visit page
      await page.goto("http://127.0.0.1:5173/#/visit/00000000-0000-0000-0000-000000000002");
      await wait(3000);
      await forceTheme(page, state.theme);
      await wait(300);
      
      // Scroll to bottom
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await wait(800);
      await page.screenshot({ path: path.join(OUTPUT_DIR, `Odontogram_${state.name}.png`) });
      console.log(`[${state.name}] ✔ Visit scrolled screenshot`);
    }

    // --- FINANCE VIEW ---
    const financeNav = page.locator("nav button:has-text('Финансы'), [data-view='finance']").first();
    const hasFinanceNav = await financeNav.count();
    if (hasFinanceNav > 0) {
      await financeNav.click();
      await wait(2000);
      await forceTheme(page, state.theme);
      await wait(300);
      await page.screenshot({ path: path.join(OUTPUT_DIR, `Finance_${state.name}.png`) });
      console.log(`[${state.name}] ✔ Finance view`);
    }

    await context.close();
  }

  await browser.close();
  console.log("\n=== ALL SCREENSHOTS DONE ===");
})();
