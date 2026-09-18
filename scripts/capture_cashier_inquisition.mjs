/**
 * scripts/capture_cashier_inquisition.mjs
 * Red Team Inquisitor: Cashier & Invoices & PaymentModal 4-State Visual Proofs
 * Viewports: 1440x900 and 390x844 (Light and Dark)
 */

import { chromium } from "playwright";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";

const API_BASE = "http://127.0.0.1:4100";
const WEB_BASE = "http://127.0.0.1:5173";
const OUT_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/inquisition_cashier_payment_modal");
const BRAIN_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/fda46caa-c7a3-4c8c-b9fe-59110808e3fa/screenshots");

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(BRAIN_DIR, { recursive: true });

async function provisionClinic() {
  const uniqueId = Date.now();
  console.log(`[Provisioning] Creating session cashier-audit-${uniqueId}@dente.ru...`);

  const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clinicName: "Стоматологический Центр ДЕНТЕ",
      email: `cashier-audit-${uniqueId}@dente.ru`,
      password: "Password123!",
      ownerName: "Д-р Барабаш Сергей Владимирович",
      ownerPin: "1234",
    }),
  });

  if (!initRes.ok) {
    throw new Error(`Clinic setup failed: ${await initRes.text()}`);
  }
  const initData = await initRes.json();

  const unlockRes = await fetch(`${API_BASE}/api/auth/staff/unlock`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-dente-clinic-token": initData.clinicToken,
    },
    body: JSON.stringify({ userId: initData.ownerUserId, pinCode: "1234" }),
  });

  if (!unlockRes.ok) {
    throw new Error(`Staff unlock failed: ${await unlockRes.text()}`);
  }
  const unlockData = await unlockRes.json();

  return {
    clinicToken: initData.clinicToken,
    staffToken: unlockData.staffToken,
    ownerUserId: initData.ownerUserId,
  };
}

async function run() {
  const { clinicToken, staffToken } = await provisionClinic();

  const browserPath = fs.existsSync("C:/Program Files/Google/Chrome/Application/chrome.exe")
    ? "C:/Program Files/Google/Chrome/Application/chrome.exe"
    : "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";

  console.log(`[Browser] Using browser: ${browserPath}`);
  const browser = await chromium.launch({
    executablePath: browserPath,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });

  const testInvoice = {
    id: "inv-inquisitor-001",
    number: "СЧ-004821",
    patientId: "pat-inquisitor-001",
    patientName: "Иванов Иван Иванович",
    patientPhone: "+7 (999) 888-77-66",
    doctorName: "Д-р Барабаш С.В.",
    date: "18.09.2026",
    totalAmountRub: 15000,
    paidAmountRub: 0,
    status: "issued",
    items: [
      {
        id: "li-1",
        code: "A16.07.002",
        name: "Восстановление зуба пломбой (глубокий кариес)",
        quantity: 1,
        priceRub: 15000,
      },
    ],
    createdAt: new Date().toISOString(),
  };

  const states = [
    { name: "pc_light", width: 1440, height: 900, theme: "light" },
    { name: "pc_dark", width: 1440, height: 900, theme: "dark" },
    { name: "mobile_light", width: 390, height: 844, theme: "light" },
    { name: "mobile_dark", width: 390, height: 844, theme: "dark" },
  ];

  const results = [];

  for (const st of states) {
    console.log(`\n=== Capturing ${st.name} (${st.width}x${st.height}, theme=${st.theme}) ===`);
    const context = await browser.newContext({
      viewport: { width: st.width, height: st.height },
      colorScheme: st.theme,
    });
    const page = await context.newPage();

    await page.addInitScript(
      ({ cToken, sToken, theme, inv }) => {
        localStorage.setItem("dente_clinic_token", cToken);
        localStorage.setItem("dente_staff_token", sToken);
        localStorage.setItem("dente_theme_mode", theme);
        localStorage.setItem("dente_workspace_perspective", "owner");
        localStorage.setItem("dente_user_role", "owner");
        localStorage.setItem("dente_billing_invoices", JSON.stringify([inv]));
        localStorage.setItem(
          "dental-crm:onboarding:v1",
          JSON.stringify({ dismissed: true, step: "done" })
        );
        localStorage.setItem(
          "dental-crm:web-ui-preferences:v1",
          JSON.stringify({
            version: 1,
            uiLanguage: "ru",
            selectedWorkspaceRole: "owner",
            onboardingDismissed: true,
          })
        );
      },
      {
        cToken: clinicToken,
        sToken: staffToken,
        theme: st.theme,
        inv: testInvoice,
      }
    );

    // Navigate to Finance page
    await page.goto(`${WEB_BASE}/#finance`, { waitUntil: "domcontentloaded", timeout: 25000 });
    await page.waitForTimeout(1500);

    // Apply theme attribute to html/body
    await page.evaluate((theme) => {
      document.documentElement.setAttribute("data-theme", theme);
      if (theme === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }, st.theme);

    // Open Invoices Modal
    const openInvoicesBtn = page.locator('[data-testid="btn-finance-open-invoices"]');
    await openInvoicesBtn.waitFor({ state: "visible", timeout: 10000 });
    await openInvoicesBtn.click();
    await page.waitForTimeout(1000);

    // If PC Light, take an extra screenshot of InvoicesView registry
    if (st.name === "pc_light") {
      const invViewPath = path.join(OUT_DIR, "00_invoices_view_registry_pc_light.png");
      const invViewBrain = path.join(BRAIN_DIR, "00_invoices_view_registry_pc_light.png");
      await page.screenshot({ path: invViewPath, fullPage: false });
      fs.copyFileSync(invViewPath, invViewBrain);
      console.log(`Saved InvoicesView registry screenshot: ${invViewPath}`);
    }

    // Click "Оплатить" on the invoice
    const payBtn = page.locator(`[data-testid="btn-pay-invoice-${testInvoice.id}"]`);
    await payBtn.waitFor({ state: "visible", timeout: 5000 });
    await payBtn.click();
    await page.waitForTimeout(1000);

    // Wait for PaymentModal to be visible
    const paymentModalTitle = page.locator("#payment-modal-title");
    await paymentModalTitle.waitFor({ state: "visible", timeout: 5000 });

    // Verify Print Invoice button is present
    const printInvBtn = page.locator('[data-testid="btn-payment-modal-print-invoice"]');
    await printInvBtn.waitFor({ state: "visible", timeout: 5000 });

    const filename = `01_payment_modal_${st.name}_${st.width}x${st.height}.png`;
    const outPath = path.join(OUT_DIR, filename);
    const brainPath = path.join(BRAIN_DIR, filename);

    await page.screenshot({ path: outPath, fullPage: false });
    fs.copyFileSync(outPath, brainPath);

    const stats = fs.statSync(outPath);
    const buf = fs.readFileSync(outPath);
    const md5 = crypto.createHash("md5").update(buf).digest("hex");

    console.log(`Saved: ${outPath} | Size: ${(stats.size / 1024).toFixed(1)} KB | MD5: ${md5}`);
    results.push({ name: filename, path: outPath, size: stats.size, md5 });

    // Also switch to Cash tab to verify cash method & submit button visibility
    const cashTab = page.locator('[data-testid="tab-payment-cash"]');
    if (await cashTab.isVisible()) {
      await cashTab.click();
      await page.waitForTimeout(500);

      const cashFilename = `02_payment_modal_cash_tab_${st.name}_${st.width}x${st.height}.png`;
      const cashOutPath = path.join(OUT_DIR, cashFilename);
      const cashBrainPath = path.join(BRAIN_DIR, cashFilename);

      await page.screenshot({ path: cashOutPath, fullPage: false });
      fs.copyFileSync(cashOutPath, cashBrainPath);

      const cashStats = fs.statSync(cashOutPath);
      const cashBuf = fs.readFileSync(cashOutPath);
      const cashMd5 = crypto.createHash("md5").update(cashBuf).digest("hex");

      console.log(`Saved: ${cashOutPath} | Size: ${(cashStats.size / 1024).toFixed(1)} KB | MD5: ${cashMd5}`);
      results.push({ name: cashFilename, path: cashOutPath, size: cashStats.size, md5: cashMd5 });
    }

    await context.close();
  }

  await browser.close();

  console.log("\n=== SUMMARY OF CAPTURED SCREENSHOTS ===");
  for (const r of results) {
    console.log(`${r.name}: ${(r.size / 1024).toFixed(1)} KB, MD5: ${r.md5}`);
  }
}

run().catch((err) => {
  console.error("FATAL ERROR in capture script:", err);
  process.exit(1);
});
