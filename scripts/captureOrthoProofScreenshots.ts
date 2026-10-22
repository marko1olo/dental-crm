import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  const docsDir = path.resolve(process.cwd(), "docs", "proofs", "orthodontics");
  if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });

  const saveScreenshot = (name: string, buffer: Buffer) => {
    const fullPath = path.join(docsDir, name);
    fs.writeFileSync(fullPath, buffer);
    console.log(`[PROOF CAPTURED] ${fullPath} (${buffer.length} bytes)`);
  };

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
    const hasPassword = await page.$('input[type="password"]');
    if (hasPassword) {
      console.log("Entering credentials doctor@clinic.com / dente2026 ...");
      const inputs = await page.$$("input");
      if (inputs.length >= 2) {
        await inputs[0].click({ clickCount: 3 });
        await inputs[0].fill("doctor@clinic.com");
        await inputs[1].click({ clickCount: 3 });
        await inputs[1].fill("dente2026");
        await sleep(500);
        const submitBtn = await page.$('button[type="submit"]');
        if (submitBtn) {
          await submitBtn.click();
          await sleep(4000);
        }
      }
    }
  };

  try {
    // 1. PC Session (1440x900)
    console.log("=== Launching PC Session (1440x900) ===");
    const pcContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      colorScheme: "light",
    });
    const pcPage = await pcContext.newPage();

    console.log("Navigating to http://127.0.0.1:5173/?demo=true#orthodontics ...");
    await pcPage.goto("http://127.0.0.1:5173/?demo=true#orthodontics", { waitUntil: "commit", timeout: 60000 });
    await pcPage.waitForSelector("#root", { timeout: 30000 });
    await sleep(4000);
    await loginIfRequired(pcPage);

    // Ensure we are on #orthodontics
    await pcPage.evaluate(() => {
      window.location.hash = "orthodontics";
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    await sleep(3000);
    await suppressTour(pcPage);

    // Wait for the ortho toolbar button
    try {
      await pcPage.waitForSelector('[data-testid="ortho-toolbar-norm-btn"]', { timeout: 5000 });
      console.log("Found [data-testid=\"ortho-toolbar-norm-btn\"] on PC page!");
    } catch {
      console.log("Button selector not found immediately, checking container...");
    }

    // 1.1 Light PC
    console.log("Capturing ortho_pc_light_1440x900.png ...");
    await pcPage.evaluate(() => {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      document.documentElement.setAttribute("data-theme", "light");
      document.body.setAttribute("data-theme", "light");
      localStorage.setItem("dente_theme", "light");
    });
    await sleep(1000);
    const pcLight = await pcPage.screenshot({ fullPage: false });
    saveScreenshot("ortho_pc_light_1440x900.png", pcLight);

    // 1.2 Dark PC
    console.log("Capturing ortho_pc_dark_1440x900.png ...");
    await pcPage.evaluate(() => {
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
      document.documentElement.setAttribute("data-theme", "dark");
      document.body.setAttribute("data-theme", "dark");
      localStorage.setItem("dente_theme", "dark");
    });
    await sleep(1000);
    const pcDark = await pcPage.screenshot({ fullPage: false });
    saveScreenshot("ortho_pc_dark_1440x900.png", pcDark);

    // 1.3 Trigger 1-click Norm button and capture Modal
    console.log("Clicking [data-testid=\"ortho-toolbar-norm-btn\"] to verify doctor autonomy modal...");
    const normBtn = await pcPage.$('[data-testid="ortho-toolbar-norm-btn"]');
    if (normBtn) {
      await normBtn.click();
      await sleep(1500);
      const modalDark = await pcPage.screenshot({ fullPage: false });
      saveScreenshot("ortho_protocol_norm_pc_dark.png", modalDark);

      // Switch to light for modal
      await pcPage.evaluate(() => {
        document.documentElement.classList.remove("dark");
        document.documentElement.classList.add("light");
        document.documentElement.setAttribute("data-theme", "light");
        document.body.setAttribute("data-theme", "light");
      });
      await sleep(1000);
      const modalLight = await pcPage.screenshot({ fullPage: false });
      saveScreenshot("ortho_protocol_norm_pc_light.png", modalLight);
    }

    await pcContext.close();

    // 2. Mobile Session (390x844) - iPhone 14
    console.log("=== Launching Mobile Session (390x844) ===");
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      colorScheme: "light",
    });
    const mobilePage = await mobileContext.newPage();

    console.log("Navigating mobile to http://127.0.0.1:5173/?demo=true#orthodontics ...");
    await mobilePage.goto("http://127.0.0.1:5173/?demo=true#orthodontics", { waitUntil: "commit", timeout: 60000 });
    await mobilePage.waitForSelector("#root", { timeout: 30000 });
    await sleep(4000);
    await loginIfRequired(mobilePage);

    await mobilePage.evaluate(() => {
      window.location.hash = "orthodontics";
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    await sleep(3000);
    await suppressTour(mobilePage);

    // 2.1 Mobile Light
    console.log("Capturing ortho_mobile_light_390x844.png ...");
    await mobilePage.evaluate(() => {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      document.documentElement.setAttribute("data-theme", "light");
      document.body.setAttribute("data-theme", "light");
      localStorage.setItem("dente_theme", "light");
    });
    await sleep(1000);
    const mobileLight = await mobilePage.screenshot({ fullPage: false });
    saveScreenshot("ortho_mobile_light_390x844.png", mobileLight);

    // 2.2 Mobile Dark
    console.log("Capturing ortho_mobile_dark_390x844.png ...");
    await mobilePage.evaluate(() => {
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
      document.documentElement.setAttribute("data-theme", "dark");
      document.body.setAttribute("data-theme", "dark");
      localStorage.setItem("dente_theme", "dark");
    });
    await sleep(1000);
    const mobileDark = await mobilePage.screenshot({ fullPage: false });
    saveScreenshot("ortho_mobile_dark_390x844.png", mobileDark);

    await mobileContext.close();
    console.log("=== All screenshots successfully captured ===");
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("Error capturing screenshots:", err);
  process.exit(1);
});
