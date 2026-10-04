const { chromium } = require("playwright");

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  });
  const page = await browser.newPage();
  page.on("console", (msg) => console.log("BROWSER LOG:", msg.type(), msg.text()));
  page.on("pageerror", (err) => console.error("BROWSER PAGEERROR:", err.message, err.stack));

  await page.addInitScript(() => {
    localStorage.setItem("dente_clinic_token", "live-inquisition-clinic-token");
    localStorage.setItem("dente_staff_token", "live-inquisition-staff-token");
    localStorage.setItem("dente_active_role", "owner");
    localStorage.setItem("dente_theme_mode", "light");
    localStorage.setItem("dente_active_patient_id", "pat-1");
    localStorage.setItem("dente_tour_completed", "true");
  });

  await page.goto("http://127.0.0.1:5173/#imaging");
  await page.waitForTimeout(3000);
  const btn = await page.waitForSelector('[data-testid="imaging-open-radiology-module"]', { timeout: 15000 });
  await btn.click();
  await page.waitForTimeout(1000);

  const splitBtn = await page.waitForSelector('[data-testid="btn-open-consultation-split"]', { timeout: 15000 });
  console.log("Clicking splitBtn...");
  await splitBtn.click();
  await page.waitForTimeout(2000);

  const bootEl = await page.$(".boot-state");
  if (bootEl) {
    console.log("Found .boot-state element! Visible:", await bootEl.isVisible());
    console.log("Text:", await bootEl.innerText());
    console.log("HTML:", await bootEl.innerHTML());
  } else {
    console.log(".boot-state element not found!");
  }

  await browser.close();
}

main().catch(console.error);
