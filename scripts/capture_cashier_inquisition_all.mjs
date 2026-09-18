/**
 * scripts/capture_cashier_inquisition_all.mjs
 * Red Team Inquisitor: Comprehensive 4-State + Scroll Capture for PaymentModal and InvoicesView
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
  console.log(`[Provisioning] Creating session cashier-all-${uniqueId}@dente.ru...`);

  const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clinicName: "Стоматологический Центр ДЕНТЕ",
      email: `cashier-all-${uniqueId}@dente.ru`,
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
  };
}

async function run() {
  const { clinicToken, staffToken } = await provisionClinic();

  const browser = await chromium.launch({
    executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
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

  const runs = [
    { mode: "pc", theme: "light", width: 1440, height: 900 },
    { mode: "pc", theme: "dark", width: 1440, height: 900 },
    { mode: "mobile", theme: "light", width: 390, height: 844 },
    { mode: "mobile", theme: "dark", width: 390, height: 844 },
  ];

  const results = [];

  for (const cfg of runs) {
    console.log(`\n========================================`);
    console.log(`Processing ${cfg.mode.toUpperCase()} - ${cfg.theme.toUpperCase()} (${cfg.width}x${cfg.height})`);
    console.log(`========================================`);

    const context = await browser.newContext({
      viewport: { width: cfg.width, height: cfg.height },
      colorScheme: cfg.theme,
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
        localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done" }));
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
      { cToken: clinicToken, sToken: staffToken, theme: cfg.theme, inv: testInvoice }
    );

    await page.goto(`${WEB_BASE}/#finance`, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForTimeout(1500);

    // Apply explicit theme attribute to html
    await page.evaluate((th) => {
      document.documentElement.setAttribute("data-theme", th);
      if (th === "dark") {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }, cfg.theme);

    // Open Invoices Registry
    const openInvoicesBtn = page.locator('[data-testid="btn-finance-open-invoices"]');
    await openInvoicesBtn.waitFor({ state: "attached", timeout: 5000 });
    await openInvoicesBtn.click({ force: true });
    await page.waitForTimeout(1000);

    if (cfg.mode === "pc" && cfg.theme === "light") {
      const p = path.join(OUT_DIR, "00_invoices_view_registry_pc_light.png");
      const b = path.join(BRAIN_DIR, "00_invoices_view_registry_pc_light.png");
      await page.screenshot({ path: p });
      fs.copyFileSync(p, b);
      const st = fs.statSync(p);
      const md5 = crypto.createHash("md5").update(fs.readFileSync(p)).digest("hex");
      results.push({ name: "00_invoices_view_registry_pc_light.png", size: st.size, md5 });
      console.log(`Saved InvoicesView registry: ${p}`);
    }

    // Click "Оплатить"
    const payBtn = page.locator(`[data-testid="btn-pay-invoice-${testInvoice.id}"]`);
    await payBtn.waitFor({ state: "attached", timeout: 5000 });
    await payBtn.click({ force: true });
    await page.waitForTimeout(1000);

    // Wait for PaymentModal title
    const modalTitle = page.locator("#payment-modal-title");
    await modalTitle.waitFor({ state: "visible", timeout: 5000 });

    // 1. Initial view (top of modal)
    const initialName = `01_payment_modal_${cfg.mode}_${cfg.theme}_${cfg.width}x${cfg.height}.png`;
    const initialOut = path.join(OUT_DIR, initialName);
    const initialBrain = path.join(BRAIN_DIR, initialName);
    await page.screenshot({ path: initialOut });
    fs.copyFileSync(initialOut, initialBrain);
    const initSt = fs.statSync(initialOut);
    const initMd5 = crypto.createHash("md5").update(fs.readFileSync(initialOut)).digest("hex");
    results.push({ name: initialName, size: initSt.size, md5: initMd5 });
    console.log(`Saved Initial Modal View: ${initialOut} (${(initSt.size / 1024).toFixed(1)} KB)`);

    // 2. Click Cash Tab (Наличные) and scroll down to the submit button
    const cashTab = page.locator('[data-testid="tab-payment-cash"]');
    if (await cashTab.count() > 0) {
      await cashTab.click({ force: true });
      await page.waitForTimeout(500);
    }

    // Scroll the modal body to the bottom to reveal the submit button
    await page.evaluate(() => {
      // Find the scrollable container inside modal
      const scrollables = document.querySelectorAll(".overflow-y-auto");
      for (const el of scrollables) {
        el.scrollTop = el.scrollHeight;
      }
    });
    await page.waitForTimeout(600);

    const scrolledName = `02_payment_modal_${cfg.mode}_${cfg.theme}_scrolled_submit_${cfg.width}x${cfg.height}.png`;
    const scrolledOut = path.join(OUT_DIR, scrolledName);
    const scrolledBrain = path.join(BRAIN_DIR, scrolledName);
    await page.screenshot({ path: scrolledOut });
    fs.copyFileSync(scrolledOut, scrolledBrain);
    const scSt = fs.statSync(scrolledOut);
    const scMd5 = crypto.createHash("md5").update(fs.readFileSync(scrolledOut)).digest("hex");
    results.push({ name: scrolledName, size: scSt.size, md5: scMd5 });
    console.log(`Saved Scrolled Submit View: ${scrolledOut} (${(scSt.size / 1024).toFixed(1)} KB)`);

    await context.close();
  }

  await browser.close();

  console.log("\n========================================");
  console.log("FINAL CAPTURE SUMMARY TABLE");
  console.log("========================================");
  for (const r of results) {
    console.log(`${r.name.padEnd(55)} | ${(r.size / 1024).toFixed(1).padStart(6)} KB | MD5: ${r.md5}`);
  }
}

run().catch((err) => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});
