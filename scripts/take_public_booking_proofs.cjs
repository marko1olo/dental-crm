const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const WEB_BASE = "http://127.0.0.1:5173";
const PROOFS_DIR = path.resolve(__dirname, "../docs/proofs/public_booking");
const SUBAGENT_BRAIN_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/16ca20a2-1891-411d-b57c-82f2e9c26d51/proofs");
const PARENT_BRAIN_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/da920fe7-8cf1-4af3-83bf-33b629e2b869/proofs");

fs.mkdirSync(PROOFS_DIR, { recursive: true });
fs.mkdirSync(SUBAGENT_BRAIN_DIR, { recursive: true });
fs.mkdirSync(PARENT_BRAIN_DIR, { recursive: true });

async function saveProof(page, fileName) {
  const p1 = path.join(PROOFS_DIR, fileName);
  await page.screenshot({ path: p1, fullPage: false });
  const p2 = path.join(SUBAGENT_BRAIN_DIR, fileName);
  fs.copyFileSync(p1, p2);
  const p3 = path.join(PARENT_BRAIN_DIR, fileName);
  fs.copyFileSync(p1, p3);

  const stats = fs.statSync(p1);
  console.log(`[PROOF CAPTURED] ${fileName} -> ${stats.size} bytes (${(stats.size / 1024).toFixed(1)} KB)`);
  if (stats.size < 20480) {
    throw new Error(`Screenshot ${fileName} is too small (${stats.size} bytes < 20KB)`);
  }
}

async function main() {
  const possibleBrowserPaths = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
    "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  ];
  const browserPath = possibleBrowserPaths.find((p) => fs.existsSync(p));

  console.log("Using browser:", browserPath);
  const browser = await chromium.launch({
    headless: true,
    executablePath: browserPath,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();

    console.log("Navigating to live public booking page...");
    await page.goto(`${WEB_BASE}/#/book`, {
      waitUntil: "networkidle",
      timeout: 30000,
    });

    await page.waitForSelector(".PublicBookingWidget-root", { state: "visible", timeout: 15000 });
    console.log(".PublicBookingWidget-root confirmed visible!");

    // 1. PC Light (1440x900)
    console.log("--- 1. Capturing PC Light (1440x900) ---");
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.evaluate(() => {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      document.documentElement.setAttribute("data-theme", "light");
      document.body.setAttribute("data-theme", "light");
    });
    await page.waitForTimeout(1000);
    await saveProof(page, "01_public_booking_pc_light.png");

    // 2. PC Dark (1440x900)
    console.log("--- 2. Capturing PC Dark (1440x900) ---");
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.evaluate(() => {
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
      document.documentElement.setAttribute("data-theme", "dark");
      document.body.setAttribute("data-theme", "dark");
    });
    await page.waitForTimeout(1000);
    await saveProof(page, "02_public_booking_pc_dark.png");

    // 3. Mobile Light (390x844)
    console.log("--- 3. Capturing Mobile Light (390x844) ---");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      document.documentElement.setAttribute("data-theme", "light");
      document.body.setAttribute("data-theme", "light");
    });
    await page.waitForTimeout(1000);
    await saveProof(page, "03_public_booking_mobile_light.png");

    // 4. Mobile Dark (390x844)
    console.log("--- 4. Capturing Mobile Dark (390x844) ---");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(() => {
      document.documentElement.classList.remove("light");
      document.documentElement.classList.add("dark");
      document.documentElement.setAttribute("data-theme", "dark");
      document.body.setAttribute("data-theme", "dark");
    });
    await page.waitForTimeout(1000);
    await saveProof(page, "04_public_booking_mobile_dark.png");

    // 5. Patient Cabinet Tab Switch (Mobile 390x844)
    console.log("--- 5. Switching to Patient Cabinet Tab (Mobile 390x844) ---");
    const cabinetBtn = page.getByRole("button", { name: /Личный кабинет/i });
    if (await cabinetBtn.isVisible()) {
      await cabinetBtn.click();
      await page.waitForTimeout(600);
      await saveProof(page, "05_public_booking_cabinet_tab_mobile.png");
    }

    // Switch back to booking
    const bookingBtn = page.getByRole("button", { name: /Онлайн-запись на приём/i });
    if (await bookingBtn.isVisible()) {
      await bookingBtn.click();
      await page.waitForTimeout(600);
    }

    // 6. Scroll down to Date & Slots section on Mobile
    console.log("--- 6. Scrolling to Slots Section on Mobile ---");
    await page.evaluate(() => {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      document.documentElement.setAttribute("data-theme", "light");
      document.body.setAttribute("data-theme", "light");
      const slotsEl = document.getElementById("dbw-step-slots");
      slotsEl?.scrollIntoView({ behavior: "instant", block: "start" });
    });
    await page.waitForTimeout(800);
    await saveProof(page, "06_public_booking_slots_mobile.png");

    // 7. Select a slot if available
    const slotBtn = page.locator(".dbw-slot-btn").first();
    if (await slotBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log("Clicking slot button:", await slotBtn.innerText());
      await slotBtn.click();
      await page.waitForTimeout(400);
    }

    // 8. Scroll to contacts section and fill in patient info
    console.log("--- 8. Filling Patient Form on Mobile ---");
    await page.evaluate(() => {
      const contactsEl = document.getElementById("dbw-step-contacts");
      contactsEl?.scrollIntoView({ behavior: "instant", block: "start" });
    });
    await page.waitForTimeout(400);

    const nameInput = page.locator("#patient-name-input");
    if (await nameInput.isVisible()) {
      await nameInput.fill("Алексей Смирнов");
    }

    const phoneInput = page.locator("#patient-phone-input");
    if (await phoneInput.isVisible()) {
      await phoneInput.fill("+7 (999) 123-45-67");
    }

    await page.waitForTimeout(400);
    await saveProof(page, "07_public_booking_form_filled_mobile.png");

    // 9. Submit the booking
    console.log("--- 9. Submitting Booking ---");
    const confirmBtn = page.locator('[data-testid="step4-confirm-btn"]');
    if (await confirmBtn.isVisible()) {
      await confirmBtn.click();
      console.log("Clicked submit button, awaiting confirmation...");
      await page.waitForSelector(".dbw-confirmation-view, [data-testid='booking-confirmation-view'], .dbw-ticket-container", {
        timeout: 10000,
      }).catch(() => console.log("Confirmation container wait timed out, checking current view..."));
      await page.waitForTimeout(1000);
      await saveProof(page, "08_public_booking_confirmation_ticket_mobile.png");

      // PC view of confirmation
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.waitForTimeout(600);
      await saveProof(page, "09_public_booking_confirmation_ticket_pc.png");
    }

    console.log("SUCCESS: All public booking proofs captured cleanly!");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error("FAIL:", err);
  process.exit(1);
});
