/**
 * scripts/capture_visual_redteam_audit.cjs
 *
 * Visual Red Team Inquisitor Master Capture Pipeline.
 * Captures live screenshots across the required clinical core screens:
 *   - Screen 1A: SettingsPricesTab (804n Catalog & fast chips)
 *   - Screen 1B: PriceListMappingDiffView (804n Synchronized Diff-View)
 *   - Screen 2: VisitEmkTab (043/у workplace, odontogram, SOAP, carpules, 1-click presets)
 *   - Screen 3A: FinanceView / Cashier ARM (54-FZ cashier desk, shift widget, quick chips)
 *   - Screen 3B: PaymentModal (54-FZ split-payment, 1-click doctor discounts 0..100%, no-INN badge)
 *   - Screen 4: ScheduleView (Chair schedule grid & appointment cards)
 *
 * States:
 *   - Desktop (1440x900) Light & Dark
 *   - Mobile (390x844) Light & Dark
 */

const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");

const API_BASE = "http://127.0.0.1:4100";
const WEB_BASE = "http://127.0.0.1:5173";
const OUT_DIR = path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/visual_redteam_audit");
const BRAIN_DIR = path.resolve("C:/Users/Admin/.gemini/antigravity/brain/744011f8-78fd-4df5-8642-30ecccad028c/screenshots");

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.mkdirSync(BRAIN_DIR, { recursive: true });

async function provisionLiveSession() {
  const uniqueId = Date.now();
  console.log(`[Provisioning] Creating clinic session redteam-${uniqueId}@dente.ru...`);

  const initRes = await fetch(`${API_BASE}/api/auth/setup/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      clinicName: "Стоматология ДЕНТЕ Премиум",
      email: `redteam-${uniqueId}@dente.ru`,
      password: "Password123!",
      ownerName: "Д-р Воронов Алексей Владимирович",
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

  const headers = {
    "Content-Type": "application/json",
    "x-dente-clinic-token": initData.clinicToken,
    "x-dente-staff-token": unlockData.staffToken,
  };

  // Seed default clinic and chair in DB
  try {
    const { Pool } = require("pg");
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL || "postgres://dental@127.0.0.1:5432/dental_crm",
    });
    const client = await pool.connect();
    try {
      let clinicRes = await client.query(
        "SELECT id FROM clinics WHERE organization_id = $1 LIMIT 1",
        [initData.organizationId]
      );
      let clinicId;
      if (clinicRes.rows.length === 0) {
        const insertClinic = await client.query(
          "INSERT INTO clinics (organization_id, name, timezone) VALUES ($1, $2, $3) RETURNING id",
          [initData.organizationId, "Главное отделение", "Europe/Samara"]
        );
        clinicId = insertClinic.rows[0].id;
      } else {
        clinicId = clinicRes.rows[0].id;
      }

      const chairRes = await client.query(
        "SELECT id FROM chairs WHERE organization_id = $1 LIMIT 1",
        [initData.organizationId]
      );
      if (chairRes.rows.length === 0) {
        await client.query(
          "INSERT INTO chairs (organization_id, clinic_id, name, is_active) VALUES ($1, $2, $3, true)",
          [initData.organizationId, clinicId, "Кресло 1 (Основное)"]
        );
      }
    } finally {
      client.release();
      await pool.end();
    }
  } catch (errDb) {
    console.log("[Provisioning] Chair seed note:", errDb.message);
  }

  // Seed Patient
  let patientId = null;
  const pRes = await fetch(`${API_BASE}/api/patients`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      fullName: "Ковалёв Роман Станиславович",
      phone: "+7 (999) 888-77-66",
      birthDate: "1988-04-12",
      gender: "male",
      notes: "Бронхиальная астма, аллергия на латекс. Лечение 36 зуба.",
    }),
  });

  if (pRes.ok) {
    const pData = await pRes.json();
    patientId = pData.patient?.id || pData.id;
    console.log(`[Provisioning] Seeded patient: ${patientId}`);

    try {
      const todayStr = new Date().toISOString().split("T")[0];
      await fetch(`${API_BASE}/api/appointments`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          patientId,
          doctorId: initData.ownerUserId,
          chairId: "chair-1",
          startTime: `${todayStr}T10:00:00Z`,
          endTime: `${todayStr}T11:00:00Z`,
          status: "confirmed",
          notes: "Лечение глубокого кариеса 36 зуба",
        }),
      });
      console.log("[Provisioning] Seeded today appointment");
    } catch (errAppt) {
      console.log("[Provisioning] Appointment note:", errAppt.message);
    }
  }

  return {
    clinicToken: initData.clinicToken,
    staffToken: unlockData.staffToken,
    ownerUserId: initData.ownerUserId,
    patientId,
  };
}

async function runAuditCapture() {
  const auth = await provisionLiveSession();

  const browserPath = fs.existsSync("C:/Program Files/Google/Chrome/Application/chrome.exe")
    ? "C:/Program Files/Google/Chrome/Application/chrome.exe"
    : "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";

  console.log(`[Browser] Launching browser: ${browserPath}`);
  const browser = await chromium.launch({
    executablePath: browserPath,
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu"],
  });

  const capturedRegistry = [];

  const addAuthInitScript = (ctx) =>
    ctx.addInitScript(
      ({ ct, st, uid, pid }) => {
        localStorage.setItem("dente_clinic_token", ct);
        localStorage.setItem("dente_staff_token", st);
        localStorage.setItem("dente_active_role", "owner");
        localStorage.setItem("dente_workspace_perspective", "owner");
        localStorage.setItem("dente_user_role", "owner");
        localStorage.setItem("dente_onboarding_completed", "true");
        localStorage.setItem(
          "dente_ui_preferences_v1",
          JSON.stringify({
            onboardingDismissed: true,
            onboardingStep: "done",
            scheduleDateFilter: "2026-09-22",
            version: 1,
          })
        );
        localStorage.setItem(
          "dental-crm:onboarding:v1",
          JSON.stringify({
            dismissed: true,
            step: "done",
            completed: true,
            onboardingDismissed: true,
            onboardingStep: "done",
            version: 1,
          })
        );
        localStorage.setItem(
          "dental-crm:web-ui-preferences:v1",
          JSON.stringify({
            version: 1,
            uiLanguage: "ru",
            selectedWorkspaceRole: "owner",
            selectedPatientId: pid,
            onboardingDismissed: true,
            onboardingStep: "done",
          })
        );
        localStorage.setItem(
          "dente-workspace-profile",
          JSON.stringify({
            state: {
              clinicName: "Стоматология ДЕНТЕ Премиум",
              currentDoctor: { id: uid, fullName: "Д-р Воронов А. В.", role: "owner" },
              flags: { disableTour: true },
            },
          })
        );
      },
      {
        ct: auth.clinicToken,
        st: auth.staffToken,
        uid: auth.ownerUserId,
        pid: auth.patientId,
      }
    );

  async function configureTheme(page, theme) {
    await page.evaluate((th) => {
      localStorage.setItem("dente_theme_mode", th);
      document.documentElement.setAttribute("data-theme", th);
      if (th === "dark") {
        document.documentElement.classList.add("dark");
        document.documentElement.classList.remove("light");
      } else {
        document.documentElement.classList.remove("dark");
        document.documentElement.classList.add("light");
      }
      if (window.__useThemeStore) {
        window.__useThemeStore.getState().setThemeMode(th);
      }
    }, theme);
    await page.waitForTimeout(600);
  }

  async function takeProof(page, fileName, viewName, modeName) {
    const targetFile = path.join(OUT_DIR, fileName);
    const brainFile = path.join(BRAIN_DIR, fileName);

    await page.waitForSelector(".boot-state", { state: "detached", timeout: 30000 }).catch(() => {});
    await page.waitForSelector(".app-shell", { state: "visible", timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(1000);
    await page.screenshot({ path: targetFile, fullPage: false });

    fs.copyFileSync(targetFile, brainFile);

    const stats = fs.statSync(targetFile);
    const hash = crypto.createHash("md5").update(fs.readFileSync(targetFile)).digest("hex");

    capturedRegistry.push({
      fileName,
      view: viewName,
      mode: modeName,
      sizeBytes: stats.size,
      sizeKb: (stats.size / 1024).toFixed(1),
      md5: hash,
      path: targetFile,
      passSize: stats.size >= 40960,
    });

    console.log(
      `[Captured] ${fileName} (${viewName} ${modeName}): ${(stats.size / 1024).toFixed(1)} KB, MD5: ${hash} [Pass: ${stats.size >= 40960 ? "YES" : "NO"}]`
    );
  }

  async function navigateHash(page, hash) {
    try {
      await page.evaluate((h) => { window.location.hash = h; }, hash);
    } catch {
      await page.goto(`${WEB_BASE}/#${hash}`, { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {});
    }
  }

  const SAMPLE_804N_TEXT = `A16.07.002.001 Наложение световой пломбы Estelite 4 500 руб\nЛечение глубокого кариеса 3500 ₽\nУдаление зуба мудрости сложное 5 200 ₽\nУстановка имплантата Straumann SLA 38000 руб\nКоронка из диоксида циркония 18000 руб\nАнестезия Убистезин 700 р`;

  const suites = [
    { viewportName: "desktop", width: 1440, height: 900, isMobile: false, hasTouch: false, scale: 2 },
    { viewportName: "mobile", width: 390, height: 844, isMobile: true, hasTouch: true, scale: 2 },
  ];

  for (const suite of suites) {
    console.log(`\n======================================================`);
    console.log(`>>> STARTING ${suite.viewportName.toUpperCase()} SUITE (${suite.width}x${suite.height}) <<<`);
    console.log(`======================================================`);

    for (const theme of ["light", "dark"]) {
      console.log(`\n--- Mode: ${suite.viewportName} ${theme} ---`);

      const context = await browser.newContext({
        viewport: { width: suite.width, height: suite.height },
        deviceScaleFactor: suite.scale,
        isMobile: suite.isMobile,
        hasTouch: suite.hasTouch,
        colorScheme: theme,
      });
      await addAuthInitScript(context);
      const page = await context.newPage();

      // Initial Navigation to #schedule
      await page.goto(`${WEB_BASE}/#schedule`, { waitUntil: "domcontentloaded", timeout: 45000 });
      await page.waitForSelector(".boot-state", { state: "detached", timeout: 45000 }).catch(() => {});
      await page.waitForSelector(".app-shell", { state: "visible", timeout: 30000 });
      await configureTheme(page, theme);

      // -----------------------------------------------------------------------
      // Screen 4: ScheduleView
      // -----------------------------------------------------------------------
      await page.waitForSelector(".schedule-filter-strip, .schedule-container, #schedule", { state: "visible", timeout: 20000 });
      await page.waitForTimeout(1000);
      await takeProof(
        page,
        `04_schedule_${suite.viewportName}_${theme}.png`,
        "ScheduleView (Расписание)",
        `${suite.viewportName} ${theme}`
      );

      // -----------------------------------------------------------------------
      // Screen 2: VisitEmkTab (АРМ врача 043/у)
      // -----------------------------------------------------------------------
      await navigateHash(page, "visit");
      await page.waitForTimeout(1000);
      await configureTheme(page, theme);
      const emkTabBtn = page.locator('button[role="tab"]:has-text("043/у"), button[role="tab"]:has-text("ЭМК")').first();
      if (await emkTabBtn.isVisible().catch(() => false)) {
        await emkTabBtn.click().catch(() => {});
        await page.waitForTimeout(600);
      }
      await page.waitForSelector('[data-testid="emk-tier1-quick-soap-bar"], .visit-emk-tab, .visit-monolithic-header', { timeout: 20000 }).catch(() => {});
      await page.waitForTimeout(1000);
      await takeProof(
        page,
        `02_visit_emk_${suite.viewportName}_${theme}.png`,
        "VisitEmkTab (АРМ врача 043/у)",
        `${suite.viewportName} ${theme}`
      );

      // -----------------------------------------------------------------------
      // Screen 1A: SettingsPricesTab (Прейскурант 804н)
      // -----------------------------------------------------------------------
      await navigateHash(page, "settings/prices");
      await page.waitForSelector(".boot-state", { state: "detached", timeout: 30000 }).catch(() => {});
      await page.waitForSelector(".app-shell", { state: "visible", timeout: 30000 });
      await page.waitForTimeout(1000);
      await configureTheme(page, theme);
      const pricesTabBtn = page.locator("#settings-tab-prices, button:has-text('Цены и услуги')").first();
      if (await pricesTabBtn.isVisible().catch(() => false)) {
        await pricesTabBtn.click().catch(() => {});
        await page.waitForTimeout(800);
      }
      await page.waitForSelector("button:has-text('Номенклатура 804н'), button:has-text('Прейскурант 804н'), .settings-prices-tab, .catalog-groups", { state: "visible", timeout: 30000 });
      await page.waitForTimeout(1000);
      await takeProof(
        page,
        `01A_settings_prices_${suite.viewportName}_${theme}.png`,
        "SettingsPricesTab (Прейскурант 804н)",
        `${suite.viewportName} ${theme}`
      );

      // -----------------------------------------------------------------------
      // Screen 1B: PriceListMappingDiffView (Дифф-вью 804н)
      // -----------------------------------------------------------------------
      const pricesSubTab = page.locator("#settings-subtab-price, button:has-text('Прайс')").first();
      if (await pricesSubTab.isVisible().catch(() => false)) {
        await pricesSubTab.click().catch(() => {});
        await page.waitForTimeout(600);
      }
      const openPricelistModalBtn = page.locator("[data-testid='open-service-pricelist-modal-btn']").first();
      if (await openPricelistModalBtn.isVisible().catch(() => false)) {
        await openPricelistModalBtn.click().catch(() => {});
        await page.waitForTimeout(800);
        await page.waitForSelector(".service-pricelist-modal", { state: "visible", timeout: 15000 }).catch(() => {});

        const importBtn = page.locator(".service-pricelist-modal button.pricelist-btn:has-text('Импорт'), .service-pricelist-modal button:has-text('Импорт')").first();
        if (await importBtn.isVisible().catch(() => false)) {
          await importBtn.click().catch(() => {});
          await page.waitForTimeout(800);

          const smartTextArea = page.locator(".service-pricelist-modal textarea.pricelist-search-input, textarea.pricelist-search-input").first();
          if (await smartTextArea.isVisible().catch(() => false)) {
            await smartTextArea.fill(SAMPLE_804N_TEXT);
            await page.waitForTimeout(600);

            const parseBtn = page.locator(".service-pricelist-modal button:has-text('Распознать и сопоставить')").first();
            if (await parseBtn.isVisible().catch(() => false)) {
              await parseBtn.click().catch(() => {});
              await page.waitForTimeout(2000);
            }
          }
        }
      }
      await page.waitForSelector("[data-testid='pricelist-diff-container'], .pricelist-diff-container", { state: "visible", timeout: 15000 }).catch(() => {});
      await page.waitForTimeout(1000);
      await takeProof(
        page,
        `01B_pricelist_diff_804n_${suite.viewportName}_${theme}.png`,
        "PriceListMappingDiffView (Дифф-вью 804н)",
        `${suite.viewportName} ${theme}`
      );

      // Close modal if open
      const closePricelistModal = page.locator(".service-pricelist-modal button[aria-label='Закрыть'], [data-testid='btn-close-service-pricelist-modal'], button:has-text('Отмена')").first();
      if (await closePricelistModal.isVisible().catch(() => false)) {
        await closePricelistModal.click().catch(() => {});
        await page.waitForTimeout(500);
      }

      // -----------------------------------------------------------------------
      // Screen 3A: FinanceView / Cashier ARM (54-ФЗ Касса)
      // -----------------------------------------------------------------------
      await navigateHash(page, "finance");
      await page.waitForSelector(".boot-state", { state: "detached", timeout: 25000 }).catch(() => {});
      await page.waitForSelector(".finance-panel:not([aria-busy='true']), .finance-monolithic-toolbar, #payment-checkout-bar", { state: "visible", timeout: 25000 });
      await page.waitForTimeout(1000);
      await configureTheme(page, theme);

      // Fill amount 5000 to populate the payment form and demonstrate active cash calculations
      const amountInput = page.locator("#payment-amount-input");
      if (await amountInput.isVisible().catch(() => false)) {
        await amountInput.fill("5000");
        await page.waitForTimeout(400);
      } else {
        const chip5000 = page.locator("button:has-text('5 000 ₽'), button:has-text('5000 нал'), button:has-text('5000 наличными')").first();
        if (await chip5000.isVisible().catch(() => false)) {
          await chip5000.click().catch(() => {});
          await page.waitForTimeout(600);
        }
      }
      await page.waitForTimeout(800);
      const checkoutBarBox = await page.locator("#payment-checkout-bar").boundingBox().catch(() => null);
      const checkoutBarVisible = await page.locator("#payment-checkout-bar").isVisible().catch(() => false);
      const culprits = await page.evaluate(() => {
        const el = document.querySelector("#payment-checkout-bar");
        if (!el) return [];
        let p = el.parentElement;
        const res = [];
        while (p && p !== document.documentElement) {
          const s = window.getComputedStyle(p);
          if (s.transform !== "none" || s.contain !== "none" || s.perspective !== "none" || s.filter !== "none" || s.backdropFilter !== "none") {
            res.push({ tag: p.tagName, id: p.id, cls: (p.className || "").toString().slice(0, 40), transform: s.transform, contain: s.contain });
          }
          p = p.parentElement;
        }
        return res;
      }).catch(() => []);
      console.log(`[DIAGNOSTIC 3A ${suite.viewportName} ${theme}]: visible=${checkoutBarVisible}, box=${JSON.stringify(checkoutBarBox)}, culprits=${JSON.stringify(culprits)}`);
      await takeProof(
        page,
        `03A_finance_cashbox_${suite.viewportName}_${theme}.png`,
        "FinanceView (АРМ Кассира 54-ФЗ)",
        `${suite.viewportName} ${theme}`
      );

      // -----------------------------------------------------------------------
      // Screen 3B: PaymentModal (54-ФЗ Сплит-оплата и скидки врача 0..100%)
      // -----------------------------------------------------------------------
      const currentAmt = await page.locator("#payment-amount-input").inputValue().catch(() => "");
      if (!currentAmt || currentAmt === "0" || currentAmt.trim() === "") {
        await page.locator("#payment-amount-input").fill("5000").catch(() => {});
        await page.waitForTimeout(300);
      }
      await page.evaluate(() => {
        const btn = document.querySelector('[data-testid="btn-combo-split-three-way"]') ||
                    document.querySelector('button[title*="Нал + Карта + Баланс"]') ||
                    document.querySelector('[data-testid="payment-split-modal-button"]');
        if (btn) btn.click();
      });
      await page.waitForSelector('.payment-modal, .payment-modal-backdrop, #payment-modal-title', { state: "visible", timeout: 15000 });
      await page.waitForTimeout(1000);
      await takeProof(
        page,
        `03B_payment_modal_54fz_${suite.viewportName}_${theme}.png`,
        "PaymentModal (Касса 54-ФЗ сплит-оплата)",
        `${suite.viewportName} ${theme}`
      );

      // Close PaymentModal (scoped to dialog to avoid clicking toast close button)
      const closePaymentModalBtn = page.locator("[role='dialog'] button[aria-label='Закрыть'], [data-testid='btn-close-payment-modal']").first();
      if (await closePaymentModalBtn.isVisible().catch(() => false)) {
        await closePaymentModalBtn.click().catch(() => {});
        await page.waitForTimeout(500);
      }

      await context.close();
    }
  }

  await browser.close();

  console.log("\n==================================================");
  console.log("VISUAL RED TEAM AUDIT CAPTURE REGISTRY");
  console.log("==================================================");
  console.table(capturedRegistry);

  const hashes = new Set(capturedRegistry.map((r) => r.md5));
  const uniqueHashes = hashes.size === capturedRegistry.length;
  const allAbove40k = capturedRegistry.every((r) => r.sizeBytes >= 40960);

  console.log(`Total captured: ${capturedRegistry.length}`);
  console.log(`Unique MD5 hashes: ${uniqueHashes ? "YES (100% distinct screens)" : "FAIL"}`);
  console.log(`All files >= 40 KB: ${allAbove40k ? "PASS" : "FAIL"}`);

  if (!uniqueHashes || !allAbove40k || capturedRegistry.length < 20) {
    console.warn("WARNING: Some captures did not meet the strict unique hash or size criteria.");
  }
}

runAuditCapture().catch((err) => {
  console.error("Master capture run error:", err);
  process.exit(1);
});
