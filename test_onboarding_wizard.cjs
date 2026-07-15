const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const OUTPUT_DIR = "C:/Clinic_MVP/dental-crm/docs/proofs/ui_audit";
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const states = [
  { name: "PC_LIGHT",    width: 1366, height: 900,  theme: "light" },
  { name: "PC_DARK",     width: 1366, height: 900,  theme: "dark" },
  { name: "MOBILE_LIGHT",width: 375,  height: 812,  theme: "light" },
  { name: "MOBILE_DARK", width: 375,  height: 812,  theme: "dark" }
];

async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  const browser = await chromium.launch({ headless: true });

  for (const state of states) {
    console.log(`\n--- TESTING ONBOARDING: ${state.name} ---`);
    const context = await browser.newContext({
      viewport: { width: state.width, height: state.height },
      colorScheme: state.theme
    });
    const page = await context.newPage();

    // Mock APIs
    await page.route(/\/api\//, async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: [] }) });
    });

    await page.addInitScript((t) => {
      localStorage.setItem("dente_theme", t);
      localStorage.setItem("dente_theme_mode", t);
      // FORCE ONBOARDING TO SHOW!
      localStorage.setItem("dente-workspace-profile", JSON.stringify({ state: { onboardingCompleted: false }, version: 0 }));
      localStorage.setItem("dente_onboarding", JSON.stringify({ dismissed: false, draftMode: false, version: 1 }));
      localStorage.setItem("dente_dev_bypass_auth", "true");
      
      const applyTheme = () => {
        if (!document.body) {
          requestAnimationFrame(applyTheme);
          return;
        }
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

    await page.goto("http://127.0.0.1:5173/");
    await wait(3000); // let the wizard load
    
    // Select something on step 1 to proceed
    await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Выбрать всё"));
        if(btn) btn.click();
    });
    await wait(500);

    // Click "Далее" to navigate
    const nextStep = async () => {
        await page.evaluate(() => {
            const btn = Array.from(document.querySelectorAll("button")).find(b => b.textContent.includes("Далее"));
            if(btn) btn.click();
        });
        await wait(600);
    };

    // Step 1
    await page.screenshot({ path: path.join(OUTPUT_DIR, `Wizard_Step1_${state.name}.png`), fullPage: true });
    await nextStep(); // go to 2
    
    // Step 2
    await page.screenshot({ path: path.join(OUTPUT_DIR, `Wizard_Step2_${state.name}.png`), fullPage: true });
    await nextStep(); // go to 3
    
    // Step 3
    await page.screenshot({ path: path.join(OUTPUT_DIR, `Wizard_Step3_${state.name}.png`), fullPage: true });
    await nextStep(); // go to 4
    
    // Step 4
    await page.screenshot({ path: path.join(OUTPUT_DIR, `Wizard_Step4_${state.name}.png`), fullPage: true });
    await nextStep(); // go to 5
    
    // Step 5 (Staff)
    await page.screenshot({ path: path.join(OUTPUT_DIR, `Wizard_Step5_${state.name}.png`), fullPage: true });
    await nextStep(); // go to 6
    
    // Step 6 (Legal)
    await page.screenshot({ path: path.join(OUTPUT_DIR, `Wizard_Step6_${state.name}.png`), fullPage: true });
    await nextStep(); // go to 7
    
    // Step 7 (Migration)
    await page.screenshot({ path: path.join(OUTPUT_DIR, `Wizard_Step7_${state.name}.png`), fullPage: true });
    
    await context.close();
  }

  await browser.close();
  console.log("Onboarding visual audit completed.");
})();
