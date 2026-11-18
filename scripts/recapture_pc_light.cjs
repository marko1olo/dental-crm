const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-gpu"],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });

  await context.addInitScript(() => {
    localStorage.setItem("dente_demo_showcase", "true");
    localStorage.setItem("dente_clinic_token", "demo-showcase-token-therapist");
    localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-therapist");
    localStorage.setItem("dente_active_role", "doctor");
    localStorage.setItem("dente_user_role", "doctor");
    localStorage.setItem("dente_workspace_perspective", "doctor");
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dente_tour_dismissed", "true");
    localStorage.setItem("dente_demo_banner_dismissed", "true");
    localStorage.setItem("dente_onboarding_completed", "true");
    localStorage.setItem("dente_theme", "light");
    localStorage.setItem("dente_theme_mode", "light");
    localStorage.setItem("dente-theme", "light");
    localStorage.setItem("theme", "light");
  });

  const page = await context.newPage();
  await page.goto("http://127.0.0.1:5173/?demo=true#visit", { waitUntil: "networkidle", timeout: 35000 });
  await page.waitForTimeout(3000);

  const startNextBtn = page.locator("#btn-intake-start-next, [data-testid='btn-intake-start-next']");
  if (await startNextBtn.isVisible()) {
    await startNextBtn.click();
    await page.waitForTimeout(2000);
  }

  await page.evaluate(() => {
    document.documentElement.setAttribute("data-theme", "light");
    document.body.setAttribute("data-theme", "light");
    document.documentElement.classList.remove("dark");
    document.documentElement.classList.add("light");
    document.body.classList.remove("dark");
    document.body.classList.add("light");
    document.documentElement.style.colorScheme = "light";
    document.querySelectorAll('.global-toast, .toast, .sa-toast, [data-testid="global-toast"], [role="alert"]').forEach(el => el.remove());
    const style = document.createElement("style");
    style.innerHTML = ".tour-spotlight-root, [data-testid='guided-tour-spotlight-overlay'], [data-testid='demo-mode-banner'], .global-toast-container, vite-error-overlay { display: none !important; }";
    document.head.appendChild(style);
  });

  await page.waitForTimeout(1000);
  const proofPath = path.resolve("docs/proofs/visit/01_visit_view_pc_light_1440x900.png");
  await page.screenshot({ path: proofPath, fullPage: false, animations: "disabled" });
  const brainPath = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/ff1921e6-2535-4d8f-bbcd-3b7df4937ba7/01_visit_view_pc_light_1440x900.png");
  fs.copyFileSync(proofPath, brainPath);

  const s = fs.statSync(proofPath).size;
  console.log("RE-CAPTURED 01_visit_view_pc_light_1440x900.png size:", s, "bytes");
  await browser.close();
})();
