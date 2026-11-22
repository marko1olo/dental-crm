import { chromium } from "playwright";

async function main() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-gpu"],
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  page.on("console", (msg) => {
    console.log(`[BROWSER ${msg.type()}]:`, msg.text());
  });
  page.on("pageerror", (err) => {
    console.error("[PAGE ERROR]:", err);
  });
  page.on("response", (res) => {
    if (res.status() >= 400) {
      console.log(`[HTTP ${res.status()}]:`, res.url());
    }
  });

  await page.addInitScript(() => {
    localStorage.setItem("dente_clinic_token", "demo-showcase-token-owner");
    localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-owner");
    localStorage.setItem("dente_active_session_token", "demo-showcase-staff-token-owner");
    localStorage.setItem("dente_active_role", "owner");
    localStorage.setItem("dente_user_role", "owner");
    localStorage.setItem("dente_role", "owner");
    localStorage.setItem("dente_perspective", "management");
    sessionStorage.setItem("dente_unlocked", "true");
    localStorage.setItem("dente_demo_showcase", "true");
    localStorage.setItem("dente_demo_mode", "true");
    localStorage.setItem("dente_theme_mode", "light");
    localStorage.setItem("dente_onboarding_completed", "true");
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dente_tour_dismissed", "true");
    localStorage.setItem("dente_guide_tour_dismissed_v2", "true");
    localStorage.setItem("dente_demo_banner_dismissed", "true");
    localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ completed: true, dismissed: true }));
  });

  console.log("Navigating to http://127.0.0.1:5173/?demo=true#schedule ...");
  await page.goto("http://127.0.0.1:5173/?demo=true#schedule", { waitUntil: "commit", timeout: 45000 });
  
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(1000);
    const bodyText = await page.evaluate(() => document.body ? document.body.innerText : "");
    const scheduleEl = await page.$('[data-testid="schedule-view"], [data-testid="schedule-grid-view"], .schedule-panel');
    console.log(`[t=${i+1}s] scheduleEl=${!!scheduleEl}, textLen=${bodyText.length}, preview=${bodyText.slice(0, 100).replace(/\n/g, ' ')}`);
    if (scheduleEl) {
      console.log("SCHEDULE FOUND!");
      break;
    }
  }

  const url = page.url();
  console.log("Current URL:", url);

  const title = await page.title();
  console.log("Title:", title);

  const bodyHtml = await page.evaluate(() => document.body ? document.body.innerHTML.slice(0, 1000) : "no body");
  console.log("Body HTML snippet:", bodyHtml);

  const text = await page.evaluate(() => document.body ? document.body.innerText : "no body");
  console.log("Body innerText length:", text.length);
  console.log("Body innerText preview:", text.slice(0, 500));

  await page.screenshot({ path: "docs/proofs/schedule/debug_schedule.png" });
  console.log("Debug screenshot saved to docs/proofs/schedule/debug_schedule.png");

  await browser.close();
}

main().catch(console.error);
