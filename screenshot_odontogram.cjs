const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const OUTPUT_DIR = "C:/Clinic_MVP/dental-crm/docs/proofs/ui_audit";

async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

const states = [
  { name: "PC_LIGHT",     width: 1366, height: 900, theme: "light" },
  { name: "PC_DARK",      width: 1366, height: 900, theme: "dark"  },
  { name: "MOBILE_LIGHT", width: 390,  height: 844, theme: "light" },
  { name: "MOBILE_DARK",  width: 390,  height: 844, theme: "dark"  },
];

(async () => {
  const browser = await chromium.launch({ headless: true });

  for (const state of states) {
    console.log(`\n=== ${state.name} ===`);
    const context = await browser.newContext({
      viewport: { width: state.width, height: state.height },
      colorScheme: state.theme,
    });
    const page = await context.newPage();

    // Mock all API routes
    await page.route(/\/api\//, async (route) => {
      const url = route.request().url();
      if (url.includes("/api/dashboard")) {
        await route.fulfill({ status: 200, contentType: "application/json",
          body: fs.readFileSync(path.join(__dirname, "mock-dashboard.json"), "utf8") });
      } else if (url.includes("/api/auth/user/me")) {
        await route.fulfill({ status: 200, contentType: "application/json",
          body: JSON.stringify({ id: "u-123", role: "admin", name: "Dr. House", organizationId: "clinic-1" }) });
      } else if (url.includes("/api/patients/") || url.includes("/api/patients?")) {
        await route.fulfill({ status: 200, contentType: "application/json",
          body: JSON.stringify({ data: [{ id: "00000000-0000-0000-0000-000000000001", fullName: "РЎРјРёСЂРЅРѕРІ РђР»РµРєСЃРµР№ Р’Р°СЃРёР»СЊРµРІРёС‡", phone: "+79991234567", birthDate: "1980-05-15" }], total: 1 }) });
      } else if (url.includes("/api/odontogram/tooth-history")) {
        await route.fulfill({ status: 200, contentType: "application/json",
          body: JSON.stringify({ data: [] }) });
      } else {
        await route.fulfill({ status: 200, contentType: "application/json",
          body: JSON.stringify({ success: true, data: [], items: [], total: 0 }) });
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
    }, state.theme);

    await page.goto("http://127.0.0.1:5173/");
    await wait(4000);

    // Force theme after hydration
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
    }, state.theme);
    await wait(400);

    // в”Ђв”Ђ DASHBOARD в”Ђв”Ђ
    await page.screenshot({ path: path.join(OUTPUT_DIR, `Dashboard_${state.name}.png`) });
    console.log(`[${state.name}] вњ” Dashboard вЂ” sidebar check:`,
      await page.locator("text=Р¤РёРЅР°РЅСЃС‹").count() > 0 ? "Р¤РёРЅР°РЅСЃС‹ OK" : "Р¤РёРЅР°РЅСЃС‹ MISSING",
      await page.locator("text=BI РђРЅР°Р»РёС‚РёРєР°").count() > 0 ? "BI РђРЅР°Р»РёС‚РёРєР° OK" : "BI РђРЅР°Р»РёС‚РёРєР° MISSING"
    );

    // в”Ђв”Ђ NAVIGATE в†’ РџРђР¦РР•РќРўР« в”Ђв”Ђ
    await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll("a, button, [role='button']"));
      const pBtn = links.find(el => {
        const t = (el.textContent || "").toLowerCase();
        return t.includes("РїР°С†РёРµРЅС‚") || t.includes("patient");
      });
      if (pBtn) pBtn.click();
    });
    await wait(2500);

    // в”Ђв”Ђ SCROLL DOWN TO ODONTOGRAM / Р—РЈР‘РќРђРЇ РљРђР РўРђ в”Ђв”Ђ
    // First scroll viewport down progressively
    await page.evaluate(() => { window.scrollTo(0, 500); });
    await wait(400);

    // Try to find and scroll to tooth-map
    const toothMapEl = page.locator(".tooth-map, [class*='tooth-map'], [aria-label='Р—СѓР±РЅР°СЏ РєР°СЂС‚Р°']").first();
    const toothMapCount = await toothMapEl.count();
    if (toothMapCount > 0) {
      await toothMapEl.scrollIntoViewIfNeeded();
      await wait(600);
      await page.screenshot({ path: path.join(OUTPUT_DIR, `Odontogram_${state.name}.png`) });
      console.log(`[${state.name}] вњ” Odontogram (tooth-map found via selector)`);
    } else {
      // Scroll further down вЂ” odontogram may be further below
      for (let scroll = 800; scroll <= 3200; scroll += 800) {
        await page.evaluate((s) => { window.scrollTo(0, s); }, scroll);
        await wait(300);
        // Check if tooth-map appeared
        const found = await page.locator(".tooth-map").count();
        if (found > 0) {
          await page.locator(".tooth-map").first().scrollIntoViewIfNeeded();
          await wait(500);
          break;
        }
      }
      await page.screenshot({ path: path.join(OUTPUT_DIR, `Odontogram_${state.name}.png`) });
      console.log(`[${state.name}] вњ” Odontogram (scrolled to bottom)`);
    }

    // в”Ђв”Ђ SOAP JOURNAL в”Ђв”Ђ
    // Nav back to visit/priem
    await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll("a, button, [role='button']"));
      const btn = links.find(el => {
        const t = (el.textContent || "").toLowerCase();
        return t.includes("РїСЂРёС‘Рј") || t.includes("РїСЂРёРµРј") || t.includes("visit") || t.includes("РґРёРєС‚РѕРІРє");
      });
      if (btn) btn.click();
    });
    await wait(2500);
    await page.evaluate((t) => {
      if (t === "dark") { document.documentElement.classList.add("dark"); document.body.setAttribute("data-theme","dark"); }
      else { document.documentElement.classList.remove("dark"); document.body.setAttribute("data-theme","light"); }
    }, state.theme);
    await wait(300);
    await page.screenshot({ path: path.join(OUTPUT_DIR, `SOAP_View_${state.name}.png`) });
    console.log(`[${state.name}] вњ” SOAP / Visit view`);

    await context.close();
  }

  await browser.close();
  console.log("\n=== DONE ===");
})();
