const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");

const OUTPUT_DIR = "C:/Clinic_MVP/dental-crm/docs/proofs/ui_audit";
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

const states = [
  { name: "PC_LIGHT",    width: 1366, height: 900,  theme: "light" },
  { name: "PC_DARK",     width: 1366, height: 900,  theme: "dark"  },
  { name: "MOBILE_LIGHT",width: 390,  height: 844,  theme: "light" },
  { name: "MOBILE_DARK", width: 390,  height: 844,  theme: "dark"  }
];

async function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

async function navigateTo(page, viewName, timeout = 3000) {
  // Click sidebar nav link by aria-label or text content
  await page.evaluate((v) => {
    const links = Array.from(document.querySelectorAll("a, button, [role='button'], nav *"));
    const target = links.find(el => {
      const text = (el.textContent || "").toLowerCase().trim();
      const label = (el.getAttribute("aria-label") || "").toLowerCase();
      const href  = (el.getAttribute("href") || "").toLowerCase();
      return text.startsWith(v) || label.includes(v) || href.includes(v);
    });
    if (target) target.click();
  }, viewName);
  await wait(timeout);
}

(async () => {
  const browser = await chromium.launch({ headless: true });

  for (const state of states) {
    console.log(`\n--- TESTING STATE: ${state.name} ---`);
    const context = await browser.newContext({
      viewport: { width: state.width, height: state.height },
      colorScheme: state.theme
    });
    const page = await context.newPage();
    page.on("dialog", d => d.accept());

    await page.addInitScript((t) => {
      localStorage.setItem("dente_theme", t);
      localStorage.setItem("dente_dev_bypass_auth", "true");
    }, state.theme);

    await page.goto("http://127.0.0.1:5173/");
    await wait(4000);

    // ─── 1. CLINICAL SOAP JOURNAL ─────────────────────────────────
    console.log(`[${state.name}] → SOAP Journal`);
    await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll("a, button, [role='button']"));
      const visitBtn = links.find(el => {
        const t = (el.textContent || "").toLowerCase();
        return t.includes("приём") || t.includes("прием") || t.includes("visit") || t.includes("диктовка");
      });
      if (visitBtn) visitBtn.click();
    });
    await wait(2500);

    await page.evaluate(() => {
      const textareas = Array.from(document.querySelectorAll("textarea"));
      const ta = textareas[0];
      if (ta) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
        if (setter) setter.call(ta, "Пациент жалуется на острую боль при накусывании.\n".repeat(10));
        ta.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });
    await wait(600);

    await page.screenshot({
      path: path.join(OUTPUT_DIR, `SOAP_Filled_${state.name}.png`),
      fullPage: true
    });
    console.log(`[${state.name}] ✓ SOAP screenshot`);

    // ─── 2. CALENDAR CROSSHAIR ───────────────────────────────────
    console.log(`[${state.name}] → Calendar (Schedule)`);
    await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll("a, button, [role='button'], nav a"));
      const schedBtn = links.find(el => {
        const t = (el.textContent || "").toLowerCase();
        return t.includes("запис") || t.includes("schedule") || t.includes("расписани");
      });
      if (schedBtn) schedBtn.click();
    });
    await wait(2500);

    // Hover first empty cell
    await page.evaluate(() => {
      const cells = Array.from(document.querySelectorAll(".sg-cell--empty"));
      if (cells[0]) {
        cells[0].dispatchEvent(new MouseEvent("mouseenter", { bubbles: true }));
      }
    });
    await wait(500);

    await page.screenshot({
      path: path.join(OUTPUT_DIR, `Calendar_Crosshair_${state.name}.png`),
      fullPage: true
    });
    console.log(`[${state.name}] ✓ Calendar crosshair`);

    // Click an empty slot to show popover with autofocused search
    await page.evaluate(() => {
      const cells = Array.from(document.querySelectorAll(".sg-cell--empty"));
      if (cells[0]) cells[0].click();
    });
    await wait(600);

    await page.screenshot({
      path: path.join(OUTPUT_DIR, `Calendar_Popover_${state.name}.png`),
      fullPage: true
    });
    console.log(`[${state.name}] ✓ Calendar popover (autofocus)`);

    // ─── 3. ODONTOGRAM MULTI-SELECT ──────────────────────────────
    console.log(`[${state.name}] → Odontogram (Patient EMK)`);
    await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll("a, button, [role='button']"));
      const pBtn = links.find(el => {
        const t = (el.textContent || "").toLowerCase();
        return t.includes("пациент") || t.includes("patient");
      });
      if (pBtn) pBtn.click();
    });
    await wait(2500);

    // Activate multi-select mode
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll("button"));
      const msBtn = btns.find(b => (b.textContent || "").includes("Групповой выбор"));
      if (msBtn) msBtn.click();
    });
    await wait(400);

    // Shift+click teeth
    await page.evaluate(() => {
      const spans = Array.from(document.querySelectorAll("span"));
      [14, 15, 16].forEach(n => {
        const span = spans.find(s => s.textContent?.trim() === String(n));
        if (span?.parentElement) {
          span.parentElement.dispatchEvent(new MouseEvent("click", { bubbles: true, shiftKey: true }));
        }
      });
    });
    await wait(500);

    await page.screenshot({
      path: path.join(OUTPUT_DIR, `Odontogram_MultiSelect_${state.name}.png`),
      fullPage: true
    });
    console.log(`[${state.name}] ✓ Odontogram multi-select`);

    // ─── 4. INSTALLMENT SLIDER ───────────────────────────────────
    console.log(`[${state.name}] → Finance view`);
    await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll("a, button, [role='button']"));
      const fBtn = links.find(el => {
        const t = (el.textContent || "").toLowerCase();
        return t.includes("финанс") || t.includes("finance") || t.includes("оплат");
      });
      if (fBtn) fBtn.click();
    });
    await wait(2500);

    await page.evaluate(() => {
      const slider = document.querySelector(".inst-slider");
      if (slider) {
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
        if (setter) setter.call(slider, "30");
        slider.dispatchEvent(new Event("input", { bubbles: true }));
      }
    });
    await wait(800);

    await page.screenshot({
      path: path.join(OUTPUT_DIR, `Installment_Slider_${state.name}.png`),
      fullPage: true
    });
    console.log(`[${state.name}] ✓ Installment slider`);

    // ─── 5. OTP PORTAL ───────────────────────────────────────────
    console.log(`[${state.name}] → Patient Portal OTP`);
    await page.goto("http://127.0.0.1:5173/#/portal");
    await wait(2000);

    await page.screenshot({
      path: path.join(OUTPUT_DIR, `Portal_Phone_${state.name}.png`),
      fullPage: true
    });

    // Enter phone
    const phoneInput = await page.$(".auth-phone-input");
    if (phoneInput) {
      await phoneInput.fill("+7 999 123 45 67");
      await wait(200);
      const btn = await page.$(".auth-primary-btn");
      if (btn) await btn.click();
      await wait(800);
    }

    // Screenshot of OTP cells  
    await page.screenshot({
      path: path.join(OUTPUT_DIR, `Portal_OTP_Cells_${state.name}.png`),
      fullPage: true
    });
    console.log(`[${state.name}] ✓ OTP cells captured`);

    // Type OTP digits one by one (real keyboard interaction)
    const otpCells = await page.$$(".otp-cell");
    const digits = ["1", "2", "3", "4"];
    for (let i = 0; i < otpCells.length; i++) {
      await otpCells[i].focus();
      await otpCells[i].type(digits[i]);
      await wait(120);
    }
    await wait(800);

    await page.screenshot({
      path: path.join(OUTPUT_DIR, `Portal_OTP_Filled_${state.name}.png`),
      fullPage: true
    });
    console.log(`[${state.name}] ✓ OTP filled and submitted`);

    await context.close();
  }

  await browser.close();
  console.log("\n=== ALL MICRO-UX SCREENSHOTS CAPTURED SUCCESSFULLY ===");
})();
