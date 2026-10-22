import { chromium, devices } from "playwright";
import fs from "node:fs";
import path from "node:path";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  const screenshotDir = path.resolve(process.cwd(), "screenshots");
  const docsDir = path.resolve(process.cwd(), "docs", "screenshots");
  const proofsDir = path.resolve(process.cwd(), "docs", "proofs", "schedule");
  if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });
  if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });
  if (!fs.existsSync(proofsDir)) fs.mkdirSync(proofsDir, { recursive: true });

  const saveScreenshots = (name: string, buffer: Buffer) => {
    fs.writeFileSync(path.join(screenshotDir, name), buffer);
    fs.writeFileSync(path.join(docsDir, name), buffer);
    fs.writeFileSync(path.join(proofsDir, name), buffer);
    console.log(`[PROOF CAPTURED] ${name} (${buffer.length} bytes)`);
  };

  // 1. Authenticate with real API
  console.log("Authenticating with API (doctor@clinic.com)...");
  let loginData: any = {};
  try {
    const loginRes = await fetch("http://127.0.0.1:4100/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "doctor@clinic.com", password: "dente2026" }),
    });
    if (loginRes.ok) {
      loginData = await loginRes.json();
      console.log("Logged in successfully. clinicToken:", loginData.clinicToken ? "OK" : "NO");
    }
  } catch (err: any) {
    console.warn("API login failed:", err?.message || err);
  }

  const browser = await chromium.launch({
    channel: "msedge",
    headless: true,
  });

  const suppressTour = async (page: any) => {
    await page.evaluate(() => {
      const style = document.createElement("style");
      style.innerHTML = `
        .tour-spotlight-root, .tour-backdrop-clickable-zone,
        [data-testid="guided-tour-spotlight-overlay"],
        [data-testid="guided-tour-coach-mark-card"],
        .shepherd-element { display: none !important; opacity: 0 !important; }
      `;
      document.head.appendChild(style);
    });
  };

  const loginIfRequired = async (page: any) => {
    const demoBtn = await page.$('button:has-text("Быстрый вход")');
    if (demoBtn) {
      console.log("Clicking quick demo entry button...");
      await demoBtn.click();
      await sleep(4000);
      return;
    }
    const hasPassword = await page.$('input[type="password"]');
    if (hasPassword) {
      console.log("Entering credentials doctor@clinic.com / dente2026 ...");
      const emailInput = (await page.$('input[type="email"]')) || (await page.$('input[type="text"]'));
      const passInput = await page.$('input[type="password"]');
      if (emailInput && passInput) {
        await emailInput.fill("doctor@clinic.com");
        await passInput.fill("dente2026");
        await sleep(500);
        const submitBtn = (await page.$('button[type="submit"]')) || (await page.$('button:has-text("Войти")'));
        if (submitBtn) {
          await submitBtn.click();
          await sleep(4000);
        }
      }
    }
  };

  const setupContext = async (context: any) => {
    await context.addInitScript((tokens: any) => {
      if (tokens.clinicToken) {
        localStorage.setItem("dente_clinic_token", tokens.clinicToken);
        localStorage.setItem("dente_staff_token", tokens.staffToken);
        localStorage.setItem("dente_active_session_token", tokens.staffToken);
        localStorage.setItem("dente_active_role", "owner");
        localStorage.setItem("dente_user_role", "owner");
      }
      sessionStorage.setItem("dente_unlocked", "true");
      if (tokens.user) {
        localStorage.setItem("dental-crm:active-user:v1", JSON.stringify(tokens.user));
      }
      localStorage.setItem("dental_workspace_onboarding_completed", "true");
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dente_demo_banner_dismissed", "true");
      localStorage.setItem("dente_offline_banner_dismissed", "true");
      localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done" }));
    }, loginData);
  };

  try {
    // 1. PC Session (1440x900)
    console.log("=== Launching PC Session (1440x900) ===");
    const pcContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      colorScheme: "light",
    });
    await setupContext(pcContext);
    const pcPage = await pcContext.newPage();

    console.log("Navigating to http://127.0.0.1:5173/ ...");
    await pcPage.goto("http://127.0.0.1:5173/", { waitUntil: "commit", timeout: 60000 });
    await pcPage.waitForSelector("#root", { timeout: 30000 });
    await sleep(4000);
    await loginIfRequired(pcPage);

    console.log("Navigating to #schedule ...");
    await pcPage.evaluate(() => {
      window.location.hash = "schedule";
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    console.log("Waiting for schedule toolbar to become visible...");
    try {
      await pcPage.waitForSelector('[data-testid="schedule-toolbar"], .schedule-filter-strip, .schedule-grid-container', { state: "visible", timeout: 45000 });
    } catch (e) {
      console.warn("Schedule selector wait timeout, waiting 5s fallback...");
    }
    await sleep(3500);
    await suppressTour(pcPage);

    // Light PC
    console.log("Capturing schedule_pc_light.png ...");
    await pcPage.evaluate(() => {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      document.documentElement.setAttribute("data-theme", "light");
      document.body.setAttribute("data-theme", "light");
      localStorage.setItem("dente_theme", "light");
    });
    await sleep(1000);
    const pcLight = await pcPage.screenshot({ fullPage: false, animations: "disabled", timeout: 15000 });
    saveScreenshots("schedule_pc_light.png", pcLight);

    // Dark PC
    console.log("Capturing schedule_pc_dark.png ...");
    await pcPage.evaluate(() => {
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
      document.documentElement.setAttribute("data-theme", "dark");
      document.body.setAttribute("data-theme", "dark");
      localStorage.setItem("dente_theme", "dark");
    });
    await sleep(1000);
    const pcDark = await pcPage.screenshot({ fullPage: false, animations: "disabled", timeout: 15000 });
    saveScreenshots("schedule_pc_dark.png", pcDark);

    // 2. Mobile Session (390x844) on live loaded session
    console.log("=== Switching to Mobile Viewport (390x844) ===");
    await pcPage.setViewportSize({ width: 390, height: 844 });
    await sleep(2500);

    // Light Mobile
    console.log("Capturing schedule_mobile_light.png ...");
    await pcPage.evaluate(() => {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      document.documentElement.setAttribute("data-theme", "light");
      document.body.setAttribute("data-theme", "light");
      localStorage.setItem("dente_theme", "light");
    });
    await sleep(1000);
    const mobileLight = await pcPage.screenshot({ fullPage: false, animations: "disabled", timeout: 15000 });
    saveScreenshots("schedule_mobile_light.png", mobileLight);

    // Dark Mobile
    console.log("Capturing schedule_mobile_dark.png ...");
    await pcPage.evaluate(() => {
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
      document.documentElement.setAttribute("data-theme", "dark");
      document.body.setAttribute("data-theme", "dark");
      localStorage.setItem("dente_theme", "dark");
    });
    await sleep(1000);
    const mobileDark = await pcPage.screenshot({ fullPage: false, animations: "disabled", timeout: 15000 });
    saveScreenshots("schedule_mobile_dark.png", mobileDark);

    await pcContext.close();
    console.log("=== All 4 proofs successfully captured! ===");
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
