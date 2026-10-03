const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const targetDirs = [
  path.resolve("docs/screenshots/inquisition_live"),
  "C:\\Users\\Admin\\.gemini\\antigravity\\brain\\ecdd7f97-686f-47c3-ad8a-34409e4034a3\\screenshots",
];

for (const dir of targetDirs) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

const todayDate = new Date().toLocaleDateString("en-CA");
const inqContent = fs.readFileSync(path.resolve("scripts/take_inquisition_live_screenshots.cjs"), "utf8");
const match = inqContent.match(/const mockDashboard = (\{[\s\S]*?\n\};)/);
let mockDashboard = {};
if (match) {
  mockDashboard = eval("(" + match[1].replace(/;$/, "") + ")");
}

async function capture() {
  const browser = await chromium.launch({
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  await context.addInitScript(() => {
    localStorage.setItem("dente_clinic_token", "mock-clinic-token-12345");
    localStorage.setItem("dente_staff_token", "mock-staff-token-67890");
    localStorage.setItem("dente_active_user_id", "doc-1");
    localStorage.setItem("dente_active_role", "owner");
    localStorage.setItem("dente_active_mode", "clinic");
    sessionStorage.setItem("dente_unlocked", "true");
    localStorage.setItem("dente_theme", "light");
    localStorage.setItem("theme", "light");
    localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({
      onboardingDismissed: true,
      onboardingStep: "done",
      onboardingDraftMode: false,
      version: 1,
    }));
    localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({
      dismissed: true,
      step: "done",
      completed: true,
      onboardingDismissed: true,
      onboardingStep: "done",
      onboardingDraftMode: false,
      version: 1,
    }));
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dente_tour_dismissed", "true");
    localStorage.setItem("dente:tour:v1", JSON.stringify({ completed: true, dismissed: true }));
  });

  const page = await context.newPage();

  await page.route("**/api/**", async (route) => {
    const url = route.request().url();
    if (url.includes("/src/")) return route.continue();
    if (url.includes("/api/dashboard")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard) });
    }
    if (url.includes("/api/auth/user/me") || url.includes("/api/auth/session")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner", active: true },
        }),
      });
    }
    if (url.includes("/api/auth/staff/unlock")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, token: "mock-staff-token", user: { id: "doc-1", fullName: "Д-р Воронов Алексей Владимирович", role: "owner" } }),
      });
    }
    if (url.includes("/api/schedule")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockDashboard.appointments) });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
  });

  console.log("Navigating to http://127.0.0.1:5173/#schedule...");
  await page.goto("http://127.0.0.1:5173/#schedule", { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForTimeout(1500);

  // Remove any modal or tour overlays
  await page.evaluate(() => {
    document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone').forEach((el) => el.remove());
  });

  console.log("Navigating to #visit...");
  await page.evaluate(() => { window.location.hash = "visit"; });
  await page.waitForTimeout(1000);

  // Remove overlays again
  await page.evaluate(() => {
    document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone').forEach((el) => el.remove());
  });

  // Switch to EMK tab if not active
  const emkTab = page.locator('[data-testid="visit-subtab-emk"]');
  if (await emkTab.isVisible()) {
    await emkTab.click({ force: true }).catch(() => {});
    await page.waitForTimeout(800);
  }

  const themes = ["light", "dark"];

  for (const theme of themes) {
    console.log(`Setting theme ${theme}...`);
    await page.evaluate((th) => {
      if (window.__useThemeStore) {
        window.__useThemeStore.getState().setThemeMode(th);
      }
      document.documentElement.setAttribute("data-theme", th);
      const isDark = ["dark", "night", "ocean", "emerald", "cyber_xray"].includes(th);
      document.documentElement.classList.toggle("dark", isDark);
      document.documentElement.classList.toggle("light", !isDark);
      document.documentElement.style.colorScheme = isDark ? "dark" : "light";
    }, theme);
    await page.waitForTimeout(600);

    const normShotPath = path.resolve(`docs/screenshots/inquisition_live/visit_emk_1click_norms_${theme}.png`);
    await page.screenshot({ path: normShotPath, fullPage: false });
    for (const d of targetDirs) {
      fs.copyFileSync(normShotPath, path.join(d, `visit_emk_1click_norms_${theme}.png`));
    }
    console.log(`Captured: visit_emk_1click_norms_${theme}.png`);
  }

  // ── РЕНДЕРИНГ КЛИНИЧЕСКОГО ДОКУМЕНТА С МАКРО-ТЕГАМИ IDENT ──
  console.log("Rendering clinical document template preview with IDENT macro-tags...");
  const tempHtmlPath = path.resolve("scripts/temp_document_preview.html");

  // Подключаем модули шаблонизатора напрямую
  const sharedModule = await import("../packages/shared/src/index.ts");
  const { renderDocumentTemplate } = sharedModule;

  const sampleTemplate = `
<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>Карта приёма / Дневник клинического осмотра</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; background: #f8fafc; color: #0f172a; margin: 0; padding: 24px; font-size: 10pt; line-height: 1.5; }
    .doc-page { max-width: 900px; margin: 0 auto; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; padding: 32px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
    .doc-header { border-bottom: 2px solid #0d9488; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; }
    .clinic-title { font-size: 14pt; font-weight: 800; color: #0f766e; }
    .doc-badge { background: #ccfbf1; color: #115e59; font-weight: 700; font-size: 9pt; padding: 4px 10px; border-radius: 6px; border: 1px solid #99f6e4; }
    .section-title { font-size: 11pt; font-weight: 700; color: #0f766e; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-top: 18px; margin-bottom: 10px; }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .field-label { font-size: 8.5pt; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 2px; }
    .field-value { font-weight: 600; color: #1e293b; background: #f1f5f9; padding: 6px 10px; border-radius: 4px; border: 1px solid #e2e8f0; }
    .formula-box { background: #f0fdfa; border: 1px solid #5eead4; border-radius: 6px; padding: 12px; margin-top: 8px; font-size: 9.5pt; color: #134e4a; }
    .teeth-grid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 4px; margin-top: 8px; }
    .tooth-pill { text-align: center; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 4px; padding: 4px 2px; }
    .tooth-num { font-weight: 800; font-size: 9pt; color: #0f172a; }
    .tooth-stat { font-size: 8pt; font-weight: 700; color: #0d9488; }
    .money-highlight { background: #ecfdf5; border: 1px solid #6ee7b7; color: #065f46; font-weight: 700; padding: 10px; border-radius: 6px; margin-top: 12px; font-size: 11pt; }
    .footer-stamp { margin-top: 24px; padding-top: 16px; border-top: 1px solid #cbd5e1; display: flex; justify-content: space-between; align-items: flex-end; }
  </style>
</head>
<body>
  <div class="doc-page">
    <div class="doc-header">
      <div>
        <div class="clinic-title">{Клиника.Название}</div>
        <div style="font-size: 8.5pt; color: #64748b;">Лицензия: {Клиника.Лицензия.Номер} · Тел: {Клиника.Телефон}</div>
      </div>
      <div class="doc-badge">Карта приёма № {НомерКарты}</div>
    </div>

    <div class="section-title">1. Паспортная часть и соматический статус (Паритет IDENT)</div>
    <div class="grid-2">
      <div>
        <div class="field-label">Пациент (ФИО)</div>
        <div class="field-value">{ФамилияИмяОтчество}</div>
      </div>
      <div>
        <div class="field-label">Фамилия и инициалы (IDENT)</div>
        <div class="field-value">{ФамилияИО} ({Пол}, {Возраст} лет)</div>
      </div>
    </div>
    <div class="grid-2" style="margin-top: 8px;">
      <div>
        <div class="field-label">Дата рождения</div>
        <div class="field-value">{ДатаРождения} (Год: {ГодРождения})</div>
      </div>
      <div>
        <div class="field-label">Контакты</div>
        <div class="field-value">{Телефоны} · {Email}</div>
      </div>
    </div>
    <div class="grid-2" style="margin-top: 8px;">
      <div>
        <div class="field-label">Адрес проживания</div>
        <div class="field-value">{Адрес}</div>
      </div>
      <div>
        <div class="field-label">Соматический статус & Аллергии</div>
        <div class="field-value">{СоматическийСтатус}; Аллергостатус: {Аллергии}</div>
      </div>
    </div>

    <div class="section-title">2. Протокол осмотра и дневник приёма (Без устаревшего 043/у)</div>
    <div class="grid-2">
      <div>
        <div class="field-label">Жалобы</div>
        <div class="field-value">{Жалобы}</div>
      </div>
      <div>
        <div class="field-label">Диагноз (МКБ-10)</div>
        <div class="field-value" style="color: #b91c1c;">{Диагноз}</div>
      </div>
    </div>
    <div style="margin-top: 8px;">
      <div class="field-label">Объективный статус (Status Localis)</div>
      <div class="field-value">{Объективно}</div>
    </div>
    <div style="margin-top: 8px;">
      <div class="field-label">Проведенное лечение</div>
      <div class="field-value">{Лечение}</div>
    </div>

    <div class="section-title">3. Зубная формула прописью и отдельные зубы (FDI)</div>
    <div class="formula-box">
      <strong>Текстовая расшифровка:</strong> {ЗубнаяФормула.Расшифровка}
    </div>
    <div class="teeth-grid">
      <div class="tooth-pill"><div class="tooth-num">16</div><div class="tooth-stat">{16}: {16т}</div></div>
      <div class="tooth-pill"><div class="tooth-num">21</div><div class="tooth-stat">{21}: {21т}</div></div>
      <div class="tooth-pill"><div class="tooth-num">24</div><div class="tooth-stat">{24}: {24т}</div></div>
      <div class="tooth-pill"><div class="tooth-num">36</div><div class="tooth-stat">{36}: {36т}</div></div>
      <div class="tooth-pill"><div class="tooth-num">46</div><div class="tooth-stat">{46}: {46т}</div></div>
      <div class="tooth-pill"><div class="tooth-num">48</div><div class="tooth-stat">{48}: {48т}</div></div>
      <div class="tooth-pill"><div class="tooth-num">11</div><div class="tooth-stat">{11}: {11т}</div></div>
      <div class="tooth-pill"><div class="tooth-num">31</div><div class="tooth-stat">{31}: {31т}</div></div>
    </div>

    <div class="section-title">4. Финансовые реквизиты (Сумма прописью ГОСТ)</div>
    <div class="money-highlight">
      Итого к оплате: {СуммаЧислом} руб.<br/>
      Сумма прописью: {СуммаПрописью}<br/>
      Только рубли прописью: {СуммаПрописьюРублей} рублей
    </div>

    <div class="footer-stamp">
      <div>
        <div style="font-size: 8.5pt; color: #64748b;">Лечащий врач:</div>
        <div style="font-weight: 700; color: #0f172a;">{ФамилияИОВрача} ({АктивныйВрач.Должность})</div>
      </div>
      <div>
        <div style="font-size: 8.5pt; color: #64748b;">Дата приёма:</div>
        <div style="font-weight: 700; color: #0f172a;">{ДатаОсмотра}</div>
      </div>
    </div>
  </div>
</body>
</html>
  `;

  const sampleContext = {
    clinic: {
      name: 'ООО "Стоматология ДЕНТЕ Премиум"',
      licenseNumber: "ЛО41-01137-77/00345678",
      phone: "+7 (495) 123-45-67",
    },
    patient: {
      fullName: "Ковалёв Роман Станиславович",
      birthDate: "1988-04-12",
      gender: "Мужской",
      phone: "+7 (999) 888-77-66",
      email: "kovalev@example.com",
      address: "г. Москва, ул. Тверская, д. 4",
      cardNumber: "МК-2026/884",
      somaticStatus: "Соматически здоров, сопутствующих патологий нет",
      allergyStatus: "Лидокаин (анамнестически)",
    },
    doctor: {
      fullName: "Воронов Алексей Владимирович",
      position: "Врач-стоматолог терапевт, ортопед",
    },
    clinicalExamination: {
      examinationDate: "2026-10-03",
      doctorFullName: "Воронов Алексей Владимирович",
      complaints: "Жалобы на кратковременные боли от сладкого и холодного в области 16 зуба",
      diagnosis: "K02.1 Кариес дентина зуба 16",
      objective: "На окклюзионно-медиальной поверхности зуба 16 глубокая кариозная полость, зондирование болезненно по эмалево-дентинной границе, перкуссия безболезненна.",
      treatment: "Анестезия инфильтрационная Артикаин 1:200000 1.7 мл. Препарирование кариозной полости, медикаментозная обработка 2% хлоргексидином. Адгезивный протокол OptiBond FL. Восстановление коронковой части зуба композитом светового отверждения Harmonize A3/A2. Шлифовка, полировка.",
      recommendations: "Контрольный осмотр через 6 месяцев. Гигиена полости рта.",
    },
    dentalFormula: {
      16: "C",
      21: "Pt",
      24: "C",
      36: "Pt",
      46: "Pt",
      48: "A",
    },
    financial: {
      amountRubles: 14850,
      invoiceNumber: "СЧ-2026/911",
    },
  };

  const renderedHtml = renderDocumentTemplate(sampleTemplate, sampleContext);
  fs.writeFileSync(tempHtmlPath, renderedHtml, "utf8");

  console.log("Loading generated clinical document in Playwright...");
  await page.goto("file:///" + tempHtmlPath.replace(/\\/g, "/"), { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(800);

  const docShotPath = path.resolve("docs/screenshots/inquisition_live/document_template_ident_parity_proof.png");
  await page.screenshot({ path: docShotPath, fullPage: true });
  for (const d of targetDirs) {
    fs.copyFileSync(docShotPath, path.join(d, "document_template_ident_parity_proof.png"));
  }
  console.log("Captured: document_template_ident_parity_proof.png");

  // Cleanup temp html
  if (fs.existsSync(tempHtmlPath)) {
    fs.unlinkSync(tempHtmlPath);
  }

  await browser.close();
  console.log("All screenshots successfully captured!");
}

capture().catch((err) => {
  console.error("Error in capture script:", err);
  process.exit(1);
});
