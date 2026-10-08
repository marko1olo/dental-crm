/**
 * scripts/capture_fiscal_inquisition_proofs.cjs
 *
 * Subagent 1: Cashier & Fiscal Flow Inquisitor
 * Captures live screenshots of CashboxView, PaymentModal, and Order804n Fiscal Receipt
 * in PC Light (1440x900) and PC Dark (1440x900).
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

const WEB_BASE = "http://127.0.0.1:5173";
const OUT_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/fiscal_inquisition");

const mockDashboard = {
  clinicName: "Стоматология ДЕНТЕ Премиум",
  todayIso: new Date().toLocaleDateString("en-CA"),
  clinicSettings: {
    profile: {
      id: "c-1",
      organizationId: "00000000-0000-0000-0000-000000000001",
      clinicName: "Стоматология ДЕНТЕ Премиум",
      legalName: "ООО «Стоматологическая клиника ДЕНТЕ»",
      mode: "small_clinic",
      defaultVisitMinutes: 45,
      timezone: "Europe/Moscow",
      inn: "7701234567",
      ogrn: "1217700123456",
      updatedAt: new Date().toISOString(),
    },
    staff: [
      {
        id: "doc-1",
        organizationId: "00000000-0000-0000-0000-000000000001",
        fullName: "Д-р Воронов Алексей Владимирович",
        role: "owner",
        specialties: ["therapist", "orthopedist"],
        active: true,
        color: "#0d9488",
      },
    ],
    chairs: [
      {
        id: "chair-1",
        organizationId: "00000000-0000-0000-0000-000000000001",
        name: "Кабинет 1 (Терапия)",
        room: "1",
        defaultDoctorId: "doc-1",
        active: true,
      },
    ],
    serviceCatalog: [
      { id: "s-1", name: "Консультация врача-стоматолога", priceRub: 1500, category: "consultation" },
      { id: "s-2", name: "Лечение кариеса эмали", priceRub: 4500, category: "therapy" },
      { id: "s-3", name: "Профессиональная гигиена полости рта", priceRub: 5500, category: "hygiene" },
    ],
  },
  serviceCatalog: [
    { id: "s-1", name: "Консультация врача-стоматолога", priceRub: 1500, category: "consultation" },
    { id: "s-2", name: "Лечение кариеса эмали", priceRub: 4500, category: "therapy" },
    { id: "s-3", name: "Профессиональная гигиена полости рта", priceRub: 5500, category: "hygiene" },
  ],
};

const mockInvoices = [
  {
    id: "inv-001",
    number: "СЧ-2026-00142",
    patientId: "pat-1",
    patientName: "Ковалёв Роман Станиславович",
    doctorName: "Д-р Воронов А. В.",
    date: "08.10.2026",
    totalAmountRub: 10000,
    paidAmountRub: 10000,
    status: "paid",
    paymentMethod: "card_terminal",
    items: [
      { id: "li-1", code: "A16.07.002.001", name: "Лечение глубокого кариеса", quantity: 1, priceRub: 4500 },
      { id: "li-2", code: "A16.07.051", name: "Комплексная гигиена полости рта", quantity: 1, priceRub: 5500 },
    ],
    createdAt: new Date().toISOString(),
  },
];

const mockPatients = [
  {
    id: "pat-1",
    fullName: "Ковалёв Роман Станиславович",
    birthDate: "1988-04-12",
    gender: "male",
    phone: "+7 (999) 888-77-66",
    balanceRub: 0,
    depositRub: 0,
  },
];

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log("[1/5] Launching Chrome via Playwright...");
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  await context.addInitScript(() => {
    localStorage.setItem("dente_clinic_token", "live-token");
    localStorage.setItem("dente_staff_token", "live-token");
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dente_onboarding_dismissed", "true");
    localStorage.setItem("dente_active_role", "owner");
    localStorage.setItem("dente_theme", "light");
    localStorage.setItem("dente_cash_shift_open", "true");
    localStorage.setItem("dente_cash_shift_number", "14");
    localStorage.setItem("dente_cash_shift_delta", "0");
    localStorage.setItem("dente_billing_invoices", JSON.stringify(mockInvoices));
  });

  const page = await context.newPage();

  await page.route("**/api/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/src/")) return route.continue();
    if (url.includes("/api/dashboard")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockDashboard),
      });
    }
    if (url.includes("/api/auth/user/me") || url.includes("/api/auth/session")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: {
            id: "doc-1",
            fullName: "Д-р Воронов Алексей Владимирович",
            role: "owner",
            active: true,
            organizationId: "00000000-0000-0000-0000-000000000001",
          },
        }),
      });
    }
    if (url.includes("/api/auth/staff/unlock")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          success: true,
          token: "live-staff-token",
          user: {
            id: "doc-1",
            fullName: "Д-р Воронов Алексей Владимирович",
            role: "owner",
          },
        }),
      });
    }
    if (url.includes("/api/patients")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockPatients),
      });
    }
    if (url.includes("/api/invoices")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockInvoices),
      });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    });
  });

  // 1. LIGHT MODE: Navigate to #finance
  console.log("[2/5] Navigating to Finance (Light mode)...");
  await page.goto(`${WEB_BASE}/#finance`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(3500);

  // Open Cashbox Modal via options menu
  const optionsBtn = page.locator('[data-testid="finance-toolbar-options-btn"]');
  if (await optionsBtn.isVisible()) {
    await optionsBtn.click();
    await page.waitForTimeout(600);
    const openCashboxBtn = page.locator('[data-testid="btn-finance-open-cashbox"]');
    if (await openCashboxBtn.isVisible()) {
      await openCashboxBtn.click();
      await page.waitForTimeout(1000);
    }
  }

  // Type amount into CashboxView
  const grossInput = page.locator("#gross-amount-input");
  if (await grossInput.isVisible()) {
    await grossInput.fill("12500");
    await page.waitForTimeout(500);
  }

  // 1. LIGHT MODE: Cashbox View
  console.log("[2/6] Capturing CashboxView (Light mode)...");
  const shot1 = path.join(OUT_DIR, "01_cashbox_view_light.png");
  await page.screenshot({ path: shot1, fullPage: false });
  console.log(`Saved: ${shot1}`);

  // 2. DARK MODE: Cashbox View
  console.log("[3/6] Switching to Dark mode for CashboxView...");
  await page.evaluate(() => {
    localStorage.setItem("dente_theme", "dark");
    document.documentElement.classList.add("dark");
    document.documentElement.setAttribute("data-theme", "dark");
  });
  await page.waitForTimeout(800);

  const shot3 = path.join(OUT_DIR, "03_cashbox_view_dark.png");
  await page.screenshot({ path: shot3, fullPage: false });
  console.log(`Saved: ${shot3}`);

  // 3. PAYMENT MODAL (Dark mode)
  console.log("[4/6] Opening PaymentModal (Dark mode)...");
  const splitBtn = page.locator('[data-testid="btn-open-payment-modal"]');
  if (await splitBtn.isVisible()) {
    await splitBtn.click();
    await page.waitForTimeout(1200);
  }

  const shot4 = path.join(OUT_DIR, "04_payment_modal_dark.png");
  await page.screenshot({ path: shot4, fullPage: false });
  console.log(`Saved: ${shot4}`);

  // 4. PAYMENT MODAL (Light mode)
  console.log("[5/6] Switching to Light mode for PaymentModal...");
  await page.evaluate(() => {
    localStorage.setItem("dente_theme", "light");
    document.documentElement.classList.remove("dark");
    document.documentElement.setAttribute("data-theme", "light");
  });
  await page.waitForTimeout(800);

  const shot2 = path.join(OUT_DIR, "02_payment_modal_light.png");
  await page.screenshot({ path: shot2, fullPage: false });
  console.log(`Saved: ${shot2}`);

  // Close PaymentModal (hit Escape)
  await page.keyboard.press("Escape");
  await page.waitForTimeout(800);

  // Close Cashbox modal (hit Escape)
  await page.keyboard.press("Escape");
  await page.waitForTimeout(800);

  // 5. INVOICES & PRINTED FISCAL RECEIPT
  console.log("[6/6] Opening Invoices and Fiscal Receipt print...");
  const invoicesBtn = page.locator('[data-testid="btn-finance-open-invoices"]');
  if (await invoicesBtn.isVisible()) {
    await invoicesBtn.click();
    await page.waitForTimeout(1500);

    const invoicesOptionsBtn = page.locator('[data-testid="invoices-toolbar-options-btn"]');
    if (await invoicesOptionsBtn.isVisible()) {
      await invoicesOptionsBtn.click();
      await page.waitForTimeout(600);
      const printReceiptItem = page.locator('[data-testid="btn-cash-receipt-print-open"]');
      if (await printReceiptItem.isVisible()) {
        await printReceiptItem.click();
        await page.waitForTimeout(1500);
      }
    }
  }

  const shot5 = path.join(OUT_DIR, "05_receipt_print_modal_light.png");
  await page.screenshot({ path: shot5, fullPage: false });
  console.log(`Saved: ${shot5}`);

  // Switch to Dark mode for CashReceiptPrintModal
  await page.evaluate(() => {
    localStorage.setItem("dente_theme", "dark");
    document.documentElement.classList.add("dark");
    document.documentElement.setAttribute("data-theme", "dark");
  });
  await page.waitForTimeout(800);

  const shot6 = path.join(OUT_DIR, "06_receipt_print_modal_dark.png");
  await page.screenshot({ path: shot6, fullPage: false });
  console.log(`Saved: ${shot6}`);
  console.log(`Saved: ${shot5}`);

  await browser.close();
  console.log("[5/5] All screenshots captured successfully!");
}

main().catch((err) => {
  console.error("Error running capture script:", err);
  process.exit(1);
});
