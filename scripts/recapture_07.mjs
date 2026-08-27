import { existsSync, copyFileSync, statSync } from "node:fs";
import { chromium } from "playwright";

const edgePath = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
].find((p) => existsSync(p));

const browser = await chromium.launch({
  executablePath: edgePath,
  headless: true,
  args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
});

for (const cfg of [
  { key: "pc_dark", w: 1920, h: 1080, th: "dark", mobile: false },
  { key: "pc_light", w: 1920, h: 1080, th: "light", mobile: false },
  { key: "mobile_dark", w: 390, h: 844, th: "dark", mobile: true },
  { key: "mobile_light", w: 390, h: 844, th: "light", mobile: true },
]) {
  const ctx = await browser.newContext({
    viewport: { width: cfg.w, height: cfg.h },
    isMobile: cfg.mobile,
    hasTouch: cfg.mobile,
    deviceScaleFactor: cfg.mobile ? 2.5 : 1.5,
  });
  const page = await ctx.newPage();

  await page.addInitScript(() => {
    window.localStorage.setItem("dente_active_session_token", "mock-session-token");
    window.localStorage.setItem("dente_user_role", "doctor");
    window.localStorage.setItem("dente_offline_mode", "true");
    window.localStorage.setItem("dente_clinic_token", "dev_token_sample_clinic");
    window.localStorage.setItem("dente_staff_token", "dev_token_sample_staff");
    window.localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done" }));
    window.localStorage.setItem(
      "dental-crm:web-ui-preferences:v1",
      JSON.stringify({
        version: 1,
        uiLanguage: "ru",
        selectedWorkspaceRole: "doctor",
        selectedSpecialty: "therapist",
        selectedPatientId: "PAT-001",
        onboardingDismissed: true,
      }),
    );
  });

  await page.goto("http://127.0.0.1:5173/#clinical-modals-studio", { waitUntil: "domcontentloaded" });

  await page.evaluate((th) => {
    document.documentElement.setAttribute("data-theme", th);
    const isDark = th === "dark" || th === "night" || th === "ocean" || th === "cyber_xray";
    document.documentElement.classList.toggle("dark", isDark);
    document.documentElement.classList.toggle("light", !isDark);
    document.body.className = isDark ? "dark" : "light";
    document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    localStorage.setItem("dente_theme_mode", th);
  }, cfg.th);

  await page.waitForTimeout(400);

  const btn = page.locator('[data-testid="open-viewer-modal-btn"]');
  await btn.scrollIntoViewIfNeeded();
  await btn.click({ force: true });

  await page.waitForSelector('[data-testid="radiology-viewer-modal"]', { state: "visible", timeout: 8000 });
  await page.waitForTimeout(600);

  const f1 = `C:/Clinic_MVP/dental-crm/docs/screenshots/07_radiology_dicom_viewer_${cfg.key}.png`;
  const f2 = `C:/Users/Admin/.gemini/antigravity/brain/0284cf50-cf45-4b19-be4c-f6f53b03120f/07_radiology_dicom_viewer_${cfg.key}.png`;

  await page.screenshot({ path: f1 });
  copyFileSync(f1, f2);

  if (cfg.key === "pc_dark") {
    const c1 = `C:/Clinic_MVP/dental-crm/docs/screenshots/07_radiology_dicom_viewer.png`;
    const c2 = `C:/Users/Admin/.gemini/antigravity/brain/0284cf50-cf45-4b19-be4c-f6f53b03120f/07_radiology_dicom_viewer.png`;
    await page.screenshot({ path: c1 });
    copyFileSync(c1, c2);
  }

  console.log(`Saved 07 ${cfg.key} -> ${statSync(f1).size} bytes`);
  await ctx.close();
}

await browser.close();
console.log("Recaptured 07 radiology viewer in all 4 states!");
