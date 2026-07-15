const { chromium } = require("playwright");
const path = require("path");

const OUTPUT_DIR = "C:/Users/Admin/.gemini/antigravity/brain/49ca46e2-a0f7-43e5-a510-f484e6e15d21/.tempmediaStorage";

const states = [
  { name: "PC_LIGHT",    width: 1366, height: 900,  theme: "light" },
  { name: "PC_DARK",     width: 1366, height: 900,  theme: "dark" },
  { name: "MOBILE_LIGHT",width: 390,  height: 844,  theme: "light" },
  { name: "MOBILE_DARK", width: 390,  height: 844,  theme: "dark" }
];

async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  const browser = await chromium.launch({ headless: true });

  for (const state of states) {
    console.log(`\n--- TESTING STATE: ${state.name} ---`);
    const context = await browser.newContext({
      viewport: { width: state.width, height: state.height },
      colorScheme: state.theme
    });
    const page = await context.newPage();

    await page.addInitScript((t) => {
      localStorage.setItem("dente_theme", t);
      localStorage.setItem("dente_theme_mode", t);
      localStorage.setItem("dente-workspace-profile", JSON.stringify({ state: { onboardingCompleted: true }, version: 0 }));
      localStorage.setItem("dente_onboarding", JSON.stringify({ dismissed: true, draftMode: false, version: 1, savedAt: "2099-01-01T00:00:00.000Z" }));
      localStorage.setItem("dente_dev_bypass_auth", "true");
      const jwt = "eyJvcmdhbml6YXRpb25JZCI6ImNsaW5pYy0xIiwicm9sZSI6ImFkbWluIiwiZXhwIjoxNzgzOTc2MzM4fQ.bdP5b2l9NXRJ2KCzPiePb3kQSD6Kam0eSGQQFAyDiBw";
      localStorage.setItem("dente_clinic_token", jwt);
      localStorage.setItem("dente_staff_token", jwt);
      const applyTheme = () => {
        if (!document.body) { requestAnimationFrame(applyTheme); return; }
        if (t === "dark") {
          document.documentElement.classList.add("dark");
          document.body.setAttribute("data-theme", "dark");
          document.body.classList.add("theme-dark");
        } else {
          document.documentElement.classList.remove("dark");
          document.body.setAttribute("data-theme", "light");
          document.body.classList.remove("theme-dark");
        }
      };
      applyTheme();
    }, state.theme);

    // Navigate and capture Sterilization
    await page.goto("http://127.0.0.1:5173/#sterilization");
    await wait(2000);
    await page.screenshot({ path: path.join(OUTPUT_DIR, `media_vlm_sterilization_${state.name}.png`), fullPage: true });

    // Navigate and capture Family Wallet (Financial Dashboard)
    await page.goto("http://127.0.0.1:5173/#financial");
    await wait(2000);
    await page.screenshot({ path: path.join(OUTPUT_DIR, `media_vlm_finance_${state.name}.png`), fullPage: true });

    // Navigate and capture Leads Kanban
    await page.goto("http://127.0.0.1:5173/#leads");
    await wait(2000);
    await page.screenshot({ path: path.join(OUTPUT_DIR, `media_vlm_leads_${state.name}.png`), fullPage: true });

    // Navigate and capture Race Condition Modal (Schedule)
    await page.goto("http://127.0.0.1:5173/#schedule");
    await wait(2000);
    // Click empty slot
    await page.evaluate(() => {
      const emptyCells = Array.from(document.querySelectorAll('.sg-cell--empty'));
      if (emptyCells.length > 0) emptyCells[0].click();
    });
    await wait(1000);
    await page.screenshot({ path: path.join(OUTPUT_DIR, `media_vlm_schedule_${state.name}.png`), fullPage: true });

    await context.close();
  }
  await browser.close();
})();
