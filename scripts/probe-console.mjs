import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.on("console", (msg) => console.log(`[BROWSER ${msg.type()}]:`, msg.text()));
  page.on("pageerror", (err) => console.log("[PAGE ERROR]:", err));
  
  await page.addInitScript(() => {
    localStorage.setItem("dente_clinic_token", "demo-clinic-token");
    localStorage.setItem("dente_staff_token", "demo-staff-token");
    localStorage.setItem("dente_workspace_perspective", "doctor");
    localStorage.setItem("dente_user_role", "doctor");
    localStorage.setItem("dental-crm:demo-mode:v1", "true");
  });

  await page.goto("http://127.0.0.1:5173/?demo=true&hygiene=1#hygiene", { waitUntil: "commit" });
  await page.waitForTimeout(5000);
  await browser.close();
}

main().catch(console.error);
