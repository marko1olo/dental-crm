const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const ARTIFACTS_DIR = "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\1bd0ea2d-2fd2-4004-bf11-866ca433689b";
const DOCS_DIR = path.resolve(__dirname, "../docs/screenshots/mobile_portal");

if (!fs.existsSync(DOCS_DIR)) {
  fs.mkdirSync(DOCS_DIR, { recursive: true });
}
if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

async function captureScreenshots() {
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
    // -------------------------------------------------------------
    // 1. ☀️ MOBILE LIGHT: Главная страница кабинета пациента (Pocket Clinic Overview)
    // -------------------------------------------------------------
    console.log("\n1. Capturing 01_mobile_light_cabinet_overview...");
    {
      const page = await createMobilePage("light");
      await page.goto(`http://127.0.0.1:5173/tgapp?org=${orgId}&tab=appointments`, { waitUntil: "networkidle" });
      await applyTheme(page, "light");
      await page.waitForSelector(".tg-appointment-card, .tg-app-container", { timeout: 5000 });
      await page.waitForTimeout(600);
      await saveScreen(page, "01_mobile_light_cabinet_overview");
      await page.context().close();
    }

    // -------------------------------------------------------------
    // 2. ☀️ MOBILE LIGHT: Карточка плана лечения и ЭМК
    // -------------------------------------------------------------
    console.log("\n2. Capturing 02_mobile_light_treatment_plan...");
    {
      const page = await createMobilePage("light");
      await page.goto(`http://127.0.0.1:5173/tgapp?org=${orgId}&tab=emr`, { waitUntil: "networkidle" });
      await applyTheme(page, "light");
      await page.waitForTimeout(800);
      await saveScreen(page, "02_mobile_light_treatment_plan");
      await page.context().close();
    }

    // -------------------------------------------------------------
    // 3. ☀️ MOBILE LIGHT: Шторка онлайн-записи (Telegram Mini App Booking)
    // -------------------------------------------------------------
    console.log("\n3. Capturing 03_mobile_light_booking_sheet...");
    {
      const page = await createMobilePage("light");
      await page.goto(`http://127.0.0.1:5173/tgapp?org=${orgId}&tab=booking`, { waitUntil: "networkidle" });
      await applyTheme(page, "light");
      await page.waitForTimeout(800);
      await saveScreen(page, "03_mobile_light_booking_sheet");
      await page.context().close();
    }

    // -------------------------------------------------------------
    // 4. 🌙 MOBILE DARK: Главная страница кабинета пациента
    // -------------------------------------------------------------
    console.log("\n4. Capturing 04_mobile_dark_cabinet_overview...");
    {
      const page = await createMobilePage("dark");
      await page.goto(`http://127.0.0.1:5173/tgapp?org=${orgId}&tab=appointments`, { waitUntil: "networkidle" });
      await applyTheme(page, "dark");
      await page.waitForSelector(".tg-appointment-card, .tg-app-container", { timeout: 5000 });
      await page.waitForTimeout(600);
      await saveScreen(page, "04_mobile_dark_cabinet_overview");
      await page.context().close();
    }

    // -------------------------------------------------------------
    // 5. 🌙 MOBILE DARK: Баланс, счета и чеки (Финансы)
    // -------------------------------------------------------------
    console.log("\n5. Capturing 05_mobile_dark_invoices_balance...");
    {
      const page = await createMobilePage("dark");
      await page.goto(`http://127.0.0.1:5173/tgapp?org=${orgId}&tab=finance`, { waitUntil: "networkidle" });
      await applyTheme(page, "dark");
      await page.waitForTimeout(800);
      await saveScreen(page, "05_mobile_dark_invoices_balance");
      await page.context().close();
    }

    // -------------------------------------------------------------
    // 6. 🌙 MOBILE DARK: Шторка интерактивной зубной формулы / жалоб на зуб
    // -------------------------------------------------------------
    console.log("\n6. Capturing 06_mobile_dark_tooth_sheet...");
    {
      const page = await createMobilePage("dark");
      await page.goto(`http://127.0.0.1:5173/tgapp?org=${orgId}&tab=teeth`, { waitUntil: "networkidle" });
      await applyTheme(page, "dark");
      await page.waitForTimeout(800);
      // Кликаем по зубу 16 чтобы открыть шторку жалоб
      const clicked = await page.evaluate(() => {
        const cells = Array.from(document.querySelectorAll(".tg-tooth-cell"));
        const cell16 = cells.find(el => {
          const numSpan = el.querySelector(".tg-tooth-num");
          return (numSpan && numSpan.textContent.trim() === "16") || (el.textContent && el.textContent.includes("16"));
        });
        if (cell16) {
          cell16.click();
          return true;
        }
        return false;
      });
      console.log(`Clicked tooth 16: ${clicked}`);
      await page.waitForSelector(".tg-bottom-sheet", { timeout: 5000 }).catch(() => console.log("Timeout waiting for bottom sheet"));
      await page.waitForTimeout(600);
      await saveScreen(page, "06_mobile_dark_tooth_sheet");
      await page.context().close();
    }

    // -------------------------------------------------------------
    // 7. 🌙 MOBILE DARK: Шторка записи на прием (Telegram Mini App Booking)
    // -------------------------------------------------------------
    console.log("\n7. Capturing 07_mobile_dark_booking_sheet...");
    {
      const page = await createMobilePage("dark");
      await page.goto(`http://127.0.0.1:5173/tgapp?org=${orgId}&tab=booking`, { waitUntil: "networkidle" });
      await applyTheme(page, "dark");
      await page.waitForTimeout(800);
      await saveScreen(page, "07_mobile_dark_booking_sheet");
      await page.context().close();
    }

    // -------------------------------------------------------------
    // 8. ☀️ MOBILE LIGHT: Публичный веб-виджет онлайн-записи
    // -------------------------------------------------------------
    console.log("\n8. Capturing 08_mobile_light_public_booking_widget...");
    {
      const page = await createMobilePage("light");
      await page.goto(`http://127.0.0.1:5173/#/portal/booking/${orgId}`, { waitUntil: "networkidle" });
      await applyTheme(page, "light");
      await page.waitForTimeout(1000);
      await saveScreen(page, "08_mobile_light_public_booking_widget");
      await page.context().close();
    }

    // -------------------------------------------------------------
    // 9. 🌙 MOBILE DARK: Шторка справки для налоговой (13% НДФЛ)
    // -------------------------------------------------------------
    console.log("\n9. Capturing 09_mobile_dark_tax_certificate_sheet...");
    {
      const page = await createMobilePage("dark");
      await page.goto(`http://127.0.0.1:5173/tgapp?org=${orgId}&tab=tax&taxSheet=1`, { waitUntil: "networkidle" });
      await applyTheme(page, "dark");
      await page.waitForTimeout(1000);
      await saveScreen(page, "09_mobile_dark_tax_certificate_sheet");
      await page.context().close();
    }

    console.log("\nAll 9 mobile proof screenshots captured successfully!");
  } catch (err) {
    console.error("Screenshot capture error:", err);
  } finally {
    await browser.close();
  }
}

captureScreenshots();
