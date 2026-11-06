const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const targetDir = path.resolve("docs/proofs/auth_pin");
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const mockClinicStaff = [
  {
    id: "doc-1",
    fullName: "Д-р Воронов Алексей Владимирович",
    role: "owner",
    specialties: ["therapist", "orthopedist"],
    active: true,
  },
  {
    id: "doc-2",
    fullName: "Д-р Соколова Мария Игоревна",
    role: "doctor",
    specialties: ["surgeon"],
    active: true,
  },
  {
    id: "admin-1",
    fullName: "Кузнецова Анна Павловна",
    role: "administrator",
    active: true,
  },
];

async function setupPageRoutes(page) {
  await page.route("**/api/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/src/")) return route.continue();

    if (url.includes("/api/auth/staff") || url.includes("/api/staff")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockClinicStaff),
      });
    }

    if (url.includes("/api/auth/clinic/staff")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ staff: mockClinicStaff }),
      });
    }

    if (url.includes("/api/auth/user/me") || url.includes("/api/auth/session")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: mockClinicStaff[0],
        }),
      });
    }

    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
  });
}

async function setTheme(page, theme) {
  await page.evaluate((t) => {
    document.documentElement.setAttribute("data-theme", t);
    if (t === "light") {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
    } else {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    }
    localStorage.setItem("dente_theme_mode", t);
  }, theme);
  await page.waitForTimeout(500);
}

async function main() {
  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    // 1. Desktop 1440x900
    const desktopContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    const desktopPage = await desktopContext.newPage();
    await setupPageRoutes(desktopPage);

    console.log("Navigating to PIN pad on desktop...");
    await desktopPage.goto("http://127.0.0.1:5173/", { waitUntil: "domcontentloaded", timeout: 30000 });
    await desktopPage.evaluate(() => {
      localStorage.setItem("dente_clinic_token", "demo-showcase-clinic-token-12345");
      localStorage.removeItem("dente_staff_token");
      localStorage.removeItem("dente_privacy_shield_locked");
      sessionStorage.removeItem("dente_unlocked");
    });
    await desktopPage.reload({ waitUntil: "domcontentloaded" });
    await desktopPage.waitForSelector(".auth-staff-grid, .auth-modal--wide, .auth-pin-grid", { timeout: 15000 }).catch(() => {});
    await desktopPage.waitForTimeout(2000);

    // PC Light
    await setTheme(desktopPage, "light");
    const pcLightPath = path.join(targetDir, "pinpad_pc_light_1440x900.png");
    await desktopPage.screenshot({ path: pcLightPath });
    console.log(`Saved: ${pcLightPath} (${fs.statSync(pcLightPath).size} bytes)`);

    // PC Dark
    await setTheme(desktopPage, "dark");
    const pcDarkPath = path.join(targetDir, "pinpad_pc_dark_1440x900.png");
    await desktopPage.screenshot({ path: pcDarkPath });
    console.log(`Saved: ${pcDarkPath} (${fs.statSync(pcDarkPath).size} bytes)`);

    await desktopContext.close();

    // 2. Mobile 390x844
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const mobilePage = await mobileContext.newPage();
    await setupPageRoutes(mobilePage);

    console.log("Navigating to PIN pad on mobile...");
    await mobilePage.goto("http://127.0.0.1:5173/", { waitUntil: "domcontentloaded", timeout: 30000 });
    await mobilePage.evaluate(() => {
      localStorage.setItem("dente_clinic_token", "demo-showcase-clinic-token-12345");
      localStorage.removeItem("dente_staff_token");
      localStorage.removeItem("dente_privacy_shield_locked");
      sessionStorage.removeItem("dente_unlocked");
    });
    await mobilePage.reload({ waitUntil: "domcontentloaded" });
    await mobilePage.waitForSelector(".auth-staff-grid, .auth-modal--wide, .auth-pin-grid", { timeout: 15000 }).catch(() => {});
    await mobilePage.waitForTimeout(2000);

    // Mobile Light
    await setTheme(mobilePage, "light");
    const mobLightPath = path.join(targetDir, "pinpad_mobile_light_390x844.png");
    await mobilePage.screenshot({ path: mobLightPath });
    console.log(`Saved: ${mobLightPath} (${fs.statSync(mobLightPath).size} bytes)`);

    // Mobile Dark
    await setTheme(mobilePage, "dark");
    const mobDarkPath = path.join(targetDir, "pinpad_mobile_dark_390x844.png");
    await mobilePage.screenshot({ path: mobDarkPath });
    console.log(`Saved: ${mobDarkPath} (${fs.statSync(mobDarkPath).size} bytes)`);

    await mobileContext.close();

    console.log("ALL 4-STATE VISUAL PROOFS CAPTURED SUCCESSFULLY!");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("Capture failed:", err);
  process.exit(1);
});
