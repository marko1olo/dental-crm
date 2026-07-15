const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const OUTPUT_DIR = "C:/Clinic_MVP/dental-crm/docs/proofs/ui_audit";
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
const BRAIN_DIR = "C:/Users/Admin/.gemini/antigravity/brain/49ca46e2-a0f7-43e5-a510-f484e6e15d21";

const states = [
  { name: "PC_DARK",     width: 1366, height: 900,  theme: "dark" },
  { name: "MOBILE_DARK", width: 390,  height: 844,  theme: "dark" }
];

const VIEWS = [
    { url: "http://127.0.0.1:5173/#", name: "Dashboard_Audit" },
    { url: "http://127.0.0.1:5173/#schedule", name: "Schedule_Audit" },
    { url: "http://127.0.0.1:5173/#patients", name: "Patients_Audit" },
    { url: "http://127.0.0.1:5173/#finance", name: "Finance_Audit" },
    { url: "http://127.0.0.1:5173/#settings", name: "Settings_Audit" }
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
    
    // MOCK API
    await page.route(/\/api\//, async (route) => {
        const url = route.request().url();
        if (url.includes("/api/workspace/profile")) {
            await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ hasAssistants: true, hasMultipleChairs: true, hasDentalLab: true, hasInsuranceCoPay: true, hasInstallments: true, workspacePreset: "enterprise", onboardingCompleted: true }) });
        } else {
            await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ success: true, data: [] }) });
        }
    });

    await page.addInitScript((t) => {
      localStorage.setItem("dente_theme", t);
      localStorage.setItem("dente_theme_mode", t);
      localStorage.setItem("dente_onboarding", JSON.stringify({ dismissed: true }));
    }, state.theme);

    // Capture main sections
    for (const view of VIEWS) {
        await page.goto(view.url);
        await wait(2000);
        let p = path.join(OUTPUT_DIR, `${view.name}_${state.name}.png`);
        await page.screenshot({ path: p, fullPage: true });
        fs.copyFileSync(p, path.join(BRAIN_DIR, path.basename(p)));
    }

    // Capture Step 1 and 5 again
    await page.goto("http://127.0.0.1:5173/#onboarding-preview");
    await wait(1500);
    let p = path.join(OUTPUT_DIR, `Onboarding_Step1_Fixed_${state.name}.png`);
    await page.screenshot({ path: p, fullPage: true });
    fs.copyFileSync(p, path.join(BRAIN_DIR, path.basename(p)));

    for(let i=1; i<5; i++) {
        await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll("button"));
            const nextBtn = btns.find(b => b.textContent && b.textContent.includes("Далее"));
            if(nextBtn) nextBtn.click();
        });
        await wait(200);
    }
    p = path.join(OUTPUT_DIR, `Onboarding_Step5_Fixed_${state.name}.png`);
    await page.screenshot({ path: p, fullPage: true });
    fs.copyFileSync(p, path.join(BRAIN_DIR, path.basename(p)));

    await context.close();
  }

  await browser.close();
})();
