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

const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2.5,
  isMobile: true,
  hasTouch: true,
});

const page = await context.newPage();
await page.addInitScript(() => {
  localStorage.setItem("dente_clinic_token", "dev_token_sample_clinic");
  localStorage.setItem("dente_staff_token", "dev_token_sample_staff");
  localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done" }));
  localStorage.setItem(
    "dental-crm:web-ui-preferences:v1",
    JSON.stringify({
      version: 1,
      uiLanguage: "ru",
      selectedWorkspaceRole: "owner",
      selectedSpecialty: "therapist",
      selectedPatientId: "PAT-001",
      onboardingDismissed: true,
    }),
  );
});

await page.goto("http://127.0.0.1:5173/#clinical-modals-studio", { waitUntil: "domcontentloaded", timeout: 15000 });
await page.evaluate(() => {
  document.documentElement.setAttribute("data-theme", "light");
  document.documentElement.classList.toggle("dark", false);
  document.documentElement.classList.toggle("light", true);
  document.body.className = "light";
  document.documentElement.style.colorScheme = "light";
});
await page.waitForTimeout(400);

const btn = page.locator('[data-testid="open-fiscal-modal-btn"]');
await btn.scrollIntoViewIfNeeded();
await btn.click();
await page.waitForTimeout(800);

const out1 = "C:/Clinic_MVP/dental-crm/docs/screenshots/03_billing_1c_export_modal_mobile_light.png";
const out2 = "C:/Users/Admin/.gemini/antigravity/brain/0284cf50-cf45-4b19-be4c-f6f53b03120f/03_billing_1c_export_modal_mobile_light.png";

await page.screenshot({ path: out1 });
copyFileSync(out1, out2);

console.log("Updated 03 mobile light size:", statSync(out1).size, "bytes");
await browser.close();
