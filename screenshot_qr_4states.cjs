const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const OUTPUT_DIR = "C:/Clinic_MVP/dental-crm/docs/proofs/ui_audit";
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const states = [
  { name: "PC_LIGHT",    width: 1366, height: 900,  theme: "light" },
  { name: "PC_DARK",     width: 1366, height: 900,  theme: "dark"  },
  { name: "MOBILE_LIGHT",width: 390,  height: 844,  theme: "light" },
  { name: "MOBILE_DARK", width: 390,  height: 844,  theme: "dark"  },
];

async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  const browser = await chromium.launch({ headless: true });

  for (const state of states) {
    console.log(`\n--- QR PANEL: ${state.name} ---`);
    const context = await browser.newContext({
      viewport: { width: state.width, height: state.height },
      colorScheme: state.theme,
    });
    const page = await context.newPage();
    const mockDashboardData = fs.readFileSync(path.join(__dirname, "mock-dashboard.json"), "utf8");

    await page.route(/\/api\//, async (route) => {
      const url = route.request().url();
      if (url.includes("/api/dashboard")) {
        await route.fulfill({ status: 200, contentType: "application/json", body: mockDashboardData });
      } else if (url.includes("/api/auth/user/me")) {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ id: "u-123", role: "admin", name: "Dr. House", organizationId: "clinic-1" }) });
      } else {
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: [] }) });
      }
    });

    await page.addInitScript((t) => {
      // Set BOTH keys
      localStorage.setItem("dente_theme", t);
      localStorage.setItem("dente_theme_mode", t);
      localStorage.setItem("dente_dev_bypass_auth", "true");
      const jwt = "eyJvcmdhbml6YXRpb25JZCI6ImNsaW5pYy0xIiwicm9sZSI6ImFkbWluIiwiZXhwIjoxNzgzOTc2MzM4fQ.bdP5b2l9NXRJ2KCzPiePb3kQSD6Kam0eSGQQFAyDiBw";
      localStorage.setItem("dente_clinic_token", jwt);
      localStorage.setItem("dente_staff_token", jwt);
      localStorage.setItem("dente_user", JSON.stringify({ id: "u-123", role: "admin", name: "Dr. House" }));
      // Apply theme before React hydration
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
    await wait(4500); // let React hydrate + theme store apply

    // Force theme on DOM AFTER hydration (belt+suspenders)
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
    await wait(500);

    // Baseline screenshot (full shell, no popup)
    await page.screenshot({
      path: path.join(OUTPUT_DIR, `Shell_${state.name}.png`),
      fullPage: false,
    });
    console.log(`[${state.name}] ✔ Shell screenshot done`);

    // Open QR panel
    const qrBtn = page.locator('button[title="QR-Доступ"]').first();
    const exists = await qrBtn.count();
    if (exists > 0) {
      await qrBtn.click();
      await wait(500);
      await page.screenshot({
        path: path.join(OUTPUT_DIR, `QR_Gateway_Panel_${state.name}.png`),
        fullPage: false,
      });
      console.log(`[${state.name}] ✔ QR Panel screenshot done`);
    } else {
      console.log(`[${state.name}] ✗ QR button not found — taking fallback screenshot`);
      await page.screenshot({
        path: path.join(OUTPUT_DIR, `QR_Gateway_Panel_${state.name}.png`),
        fullPage: false,
      });
    }

    await context.close();
  }

  await browser.close();
  console.log("\n=== QR GATEWAY 4-STATE SCREENSHOTS DONE ===");
})();
