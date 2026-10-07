const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const ARTIFACTS_DIR = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\1bd0ea2d-2fd2-4004-bf11-866ca433689b";
const DOCS_DIR = path.resolve(__dirname, "../docs/screenshots/mobile_portal");

async function run() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const saveScreen = async (page, name) => {
    const docPath = path.join(DOCS_DIR, `${name}.png`);
    const artPath = path.join(ARTIFACTS_DIR, `${name}.png`);
    await page.screenshot({ path: docPath, fullPage: false });
    fs.copyFileSync(docPath, artPath);
    const size = fs.statSync(docPath).size;
    console.log(`[CAPTURED] ${name}.png (${size} bytes)`);
  };

  const createMobilePage = async (colorScheme = "light") => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      colorScheme,
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    });
    return context.newPage();
  };

  const applyTheme = async (page, theme) => {
    await page.evaluate((th) => {
      document.documentElement.setAttribute("data-theme", th);
      document.documentElement.dataset.theme = th;
      if (th === "dark") {
        document.documentElement.classList.add("dark");
        document.documentElement.classList.remove("light");
      } else {
        document.documentElement.classList.add("light");
        document.documentElement.classList.remove("dark");
      }
      localStorage.setItem("dente_theme", th);
    }, theme);
    await page.waitForTimeout(400);
  };

  const orgId = "00000000-0000-0000-0000-000000000001";

  try {
    console.log("Capturing 08_mobile_light_public_booking_widget...");
    {
      const page = await createMobilePage("light");
      await page.goto(`http://127.0.0.1:5173/#/portal/booking/${orgId}`, { waitUntil: "networkidle" });
      await applyTheme(page, "light");
      await page.waitForTimeout(1000);
      await saveScreen(page, "08_mobile_light_public_booking_widget");
      await page.context().close();
    }

    console.log("Capturing 09_mobile_dark_tax_certificate_sheet...");
    {
      const page = await createMobilePage("dark");
      await page.goto(`http://127.0.0.1:5173/tgapp?org=${orgId}&tab=tax&taxSheet=1`, { waitUntil: "networkidle" });
      await applyTheme(page, "dark");
      await page.waitForSelector(".tg-bottom-sheet, .tg-app-container", { timeout: 5000 });
      await page.waitForTimeout(1000);
      await saveScreen(page, "09_mobile_dark_tax_certificate_sheet");
      await page.context().close();
    }
  } catch (e) {
    console.error("Error:", e);
  } finally {
    await browser.close();
  }
}

run();
