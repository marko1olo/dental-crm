const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");
const crypto = require("node:crypto");

const ARTIFACTS_DIR = "C:/Users/Admin/.gemini/antigravity/brain/2ebe4b85-1e15-4eee-99d1-be7424e35e0b";
const LOCAL_DIR = "C:/Clinic_MVP/dental-crm/docs/screenshots/inquisition_live";

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function run() {
  console.log("=== RED TEAM VISUAL PROOF: VISIT CONTINUITY & CLINICAL TEMPLATES (RE-CAPTURE) ===");
  fs.mkdirSync(LOCAL_DIR, { recursive: true });
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });

  const capturedRegistry = [];

  function saveProof(srcFile, fileName, viewName, modeName) {
    const targetFile = path.join(LOCAL_DIR, fileName);
    const artifactFile = path.join(ARTIFACTS_DIR, fileName);

    if (srcFile !== targetFile) {
      fs.copyFileSync(srcFile, targetFile);
    }
    if (srcFile !== artifactFile) {
      fs.copyFileSync(srcFile, artifactFile);
    }

    const stats = fs.statSync(targetFile);
    const hash = crypto.createHash("md5").update(fs.readFileSync(targetFile)).digest("hex");

    capturedRegistry.push({
      fileName,
      view: viewName,
      mode: modeName,
      sizeBytes: stats.size,
      sizeKb: (stats.size / 1024).toFixed(1),
      md5: hash,
      passSize: stats.size >= 40960,
    });

    console.log(
      `[Captured] ${fileName} (${viewName} ${modeName}): ${stats.size} bytes (${(stats.size / 1024).toFixed(1)} KB), MD5: ${hash}`
    );
  }

  // Dynamically import @dental/shared from dist
  console.log("Loading @dental/shared renderers...");
  const shared = await import("../packages/shared/dist/index.js");
  const { renderForm043uHtml, renderActOfCompletedWorksHtml, calculateDmftFromOdontogram } = shared;

  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 }
    });

    await context.addInitScript(() => {
      localStorage.setItem("dente_demo_showcase", "true");
      localStorage.setItem("dente_clinic_token", "dental");
      localStorage.setItem("dente_staff_token", "demo-showcase-staff-token-chief");
      localStorage.setItem("dente_active_role", "doctor");
      localStorage.setItem("dente_user_id", "demo-chief");
      localStorage.setItem("dente_user_role", "doctor");
      localStorage.setItem("dente_clinic_tenant_id", "00000000-0000-0000-0000-000000000001");
      localStorage.setItem("dente_onboarding_completed", "true");
      localStorage.setItem("dente_tour_completed", "true");
      localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done", completed: true }));
      localStorage.setItem("dente_theme_mode", "light");
    });

    const page = await context.newPage();

    console.log("Navigating to http://127.0.0.1:5173/?demo=true#visit ...");
    await page.goto("http://127.0.0.1:5173/?demo=true#visit", {
      waitUntil: "domcontentloaded",
      timeout: 30000
    });
    await wait(3000);

    // Click demo unlock if present
    const demoBtn = await page.$(".auth-demo-btn, [data-testid='auth-demo-chief-btn']");
    if (demoBtn) {
      console.log("Clicking demo unlock button...");
      await demoBtn.click();
      await wait(2000);
    }

    // Dismiss tour overlays & popups
    await page.evaluate(() => {
      const startBtn = Array.from(document.querySelectorAll("button")).find(b => b.textContent?.includes("0-клик старт"));
      if (startBtn) startBtn.click();
      document.querySelectorAll('.fixed.inset-0, .onboarding-modal, [role="dialog"], .tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .tour-backdrop-clickable-zone, [data-testid="demo-mode-banner"], .interactive-guide-tour-card, .toast-container, [data-testid="toast-container"]').forEach((el) => {
        el.remove();
      });
    });
    await wait(1500);

    // Switch to Visit View if needed
    const visitNavItem = await page.$('button[data-view="visit"], a[href*="visit"], nav button:has-text("Прием")');
    if (visitNavItem) {
      console.log("Ensuring Visit view is active...");
      await visitNavItem.click({ force: true });
      await wait(2000);
    }

    // Wait for the visit patient card or "Заполнить нормой" button to be visible
    console.log("Waiting for Visit patient to mount...");
    try {
      await page.waitForSelector('button:has-text("Заполнить нормой"), [data-testid="visit-header-title"], .visit-header', { timeout: 10000 });
    } catch (e) {
      console.log("Visit patient not auto-mounted, triggering appointment selection...");
      await page.evaluate(() => {
        if (window.__useAppStore) {
          window.__useAppStore.getState().setCurrentView("visit");
        }
      });
      await wait(2000);
    }

    // Dismiss any newly rendered toasts or tour cards
    await page.evaluate(() => {
      document.querySelectorAll('.tour-spotlight-root, [data-testid="guided-tour-spotlight-overlay"], .interactive-guide-tour-card, [data-testid="demo-mode-banner"], .toast-container').forEach(el => el.remove());
    });

    // Switch to EMK Tab (043/у)
    console.log("Switching to EMK (043/у) Tab...");
    const emkTab = await page.$('button[role="tab"]:has-text("043/у"), button[role="tab"]:has-text("ЭМК"), [data-testid="visit-subtab-emk"]');
    if (emkTab) {
      await emkTab.click({ force: true });
      await wait(1000);
    }

    // Dispatch service A16.07.002.010 to tooth 16
    console.log("Dispatching service A16.07.002.010 to tooth 16...");
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent("dente-add-services-to-invoice", {
          detail: {
            toothNumber: 16,
            toothCode: "16",
            code: "A16.07.002.010",
            code804n: "A16.07.002.010",
            name: "Восстановление зуба пломбой (нанокомпозит)",
            serviceName: "Восстановление зуба пломбой (нанокомпозит)",
            price: 4500,
            quantity: 1
          }
        })
      );
      // Clean up toasts
      document.querySelectorAll('.toast-container, [data-testid="toast-item"]').forEach(el => el.remove());
    });
    await wait(1000);

    // ── PROOF 1: Visit EMK with embedded odontogram (PC Light) ──
    console.log("Capturing Proof 1: Visit EMK Odontogram (Light)...");
    const fileP1 = path.join(LOCAL_DIR, "proof_01_visit_emk_odontogram_light.png");
    await page.screenshot({ path: fileP1, fullPage: false });
    saveProof(fileP1, "proof_01_visit_emk_odontogram_light.png", "Visit EMK & Odontogram", "PC Light");

    // ── PROOF 2: Visit EMK with embedded odontogram (PC Dark) ──
    console.log("Switching to Dark mode for Odontogram...");
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
      document.documentElement.style.colorScheme = "dark";
      localStorage.setItem("dente_theme_mode", "dark");
      if (window.__useThemeStore) {
        window.__useThemeStore.getState().setThemeMode("dark");
      }
      document.querySelectorAll('.toast-container, [data-testid="toast-item"]').forEach(el => el.remove());
    });
    await wait(1000);

    console.log("Capturing Proof 2: Visit EMK Odontogram (Dark)...");
    const fileP2 = path.join(LOCAL_DIR, "proof_02_visit_emk_odontogram_dark.png");
    await page.screenshot({ path: fileP2, fullPage: false });
    saveProof(fileP2, "proof_02_visit_emk_odontogram_dark.png", "Visit EMK & Odontogram", "PC Dark");

    // ── PROOF 3: Tooth 16 Clinical Modal (PC Light - Therapy & 804n Tab) ──
    console.log("Switching back to Light mode and opening Clinical Tooth Modal for tooth 16...");
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "light");
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      document.documentElement.style.colorScheme = "light";
      localStorage.setItem("dente_theme_mode", "light");
      if (window.__useThemeStore) {
        window.__useThemeStore.getState().setThemeMode("light");
      }
      window.dispatchEvent(
        new CustomEvent("dente-open-tooth-clinical-modal", {
          detail: { code: "16", toothNumber: 16, state: "Healthy" }
        })
      );
    });
    await wait(1500);

    // Click on tab "Терапия & Пломба" inside the modal to reveal the 804n packages
    console.log("Selecting 'Терапия & Пломба' tab in tooth modal...");
    const therapyTabBtn = await page.$('button:has-text("Терапия & Пломба"), ._ccm-tab-btn:has-text("Терапия")');
    if (therapyTabBtn) {
      await therapyTabBtn.click();
      await wait(800);
    }

    // Clean toasts
    await page.evaluate(() => {
      document.querySelectorAll('.toast-container, [data-testid="toast-item"]').forEach(el => el.remove());
    });

    console.log("Capturing Proof 3: Tooth 16 Clinical Modal (Light)...");
    const fileP3 = path.join(LOCAL_DIR, "proof_03_tooth_16_clinical_modal_light.png");
    await page.screenshot({ path: fileP3, fullPage: false });
    saveProof(fileP3, "proof_03_tooth_16_clinical_modal_light.png", "Tooth 16 Clinical Modal 804n", "PC Light");

    // ── PROOF 4: Tooth 16 Clinical Modal (PC Dark - Therapy & 804n Tab) ──
    console.log("Switching to Dark mode for Clinical Tooth Modal...");
    await page.evaluate(() => {
      document.documentElement.setAttribute("data-theme", "dark");
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
      document.documentElement.style.colorScheme = "dark";
      localStorage.setItem("dente_theme_mode", "dark");
      if (window.__useThemeStore) {
        window.__useThemeStore.getState().setThemeMode("dark");
      }
      document.querySelectorAll('.toast-container, [data-testid="toast-item"]').forEach(el => el.remove());
    });
    await wait(1000);

    console.log("Capturing Proof 4: Tooth 16 Clinical Modal (Dark)...");
    const fileP4 = path.join(LOCAL_DIR, "proof_04_tooth_16_clinical_modal_dark.png");
    await page.screenshot({ path: fileP4, fullPage: false });
    saveProof(fileP4, "proof_04_tooth_16_clinical_modal_dark.png", "Tooth 16 Clinical Modal 804n", "PC Dark");

    // Close modal
    await page.evaluate(() => {
      const closeBtn = document.querySelector('button[aria-label="Закрыть"]') || document.querySelector('._ccm-close-btn');
      if (closeBtn) closeBtn.click();
    });
    await wait(500);

    // ── PROOF 5: Production Form 043/u Print Preview with Real Odontogram & Calculated DMFT ──
    console.log("Generating Form 043/u HTML with calculated DMFT...");
    const sampleTeeth = {
      18: "H", 17: "H", 16: "C", 15: "H", 14: "P", 13: "H", 12: "H", 11: "H",
      21: "H", 22: "H", 23: "H", 24: "H", 25: "H", 26: "P", 27: "H", 28: "H",
      48: "H", 47: "H", 46: "R", 45: "H", 44: "H", 43: "H", 42: "H", 41: "H",
      31: "H", 32: "H", 33: "H", 34: "H", 35: "H", 36: "C", 37: "H", 38: "H",
    };
    const normalizedFormula = {};
    for (const [k, v] of Object.entries(sampleTeeth)) {
      normalizedFormula[Number(k)] = { toothNumber: Number(k), condition: v, status: v };
    }
    const dmft = calculateDmftFromOdontogram(normalizedFormula);

    const form043Html = renderForm043uHtml({
      organization: {
        fullName: "Стоматологическая клиника «DENTE» (ООО «ДЕНТЕ МЕДИКАЛ ГРУПП»)",
        legalName: "ООО «ДЕНТЕ МЕДИКАЛ ГРУПП»",
        inn: "7704123456",
        ogrn: "1237700123456",
        kpp: "770401001",
        address: "г. Москва, ул. Стоматологическая, д. 24, корп. 1",
        medicalLicenseNumber: "ЛО41-01137-77/00368421 от 14.02.2023 г.",
      },
      patient: {
        medicalCardNumber: "043-2026/8812",
        cardOpenedAt: "2026-10-06",
        fullName: "Захаров Алексей Николаевич",
        birthDate: "1985-04-12",
        gender: "male",
        phone: "+7 (999) 812-34-56",
        address: "г. Москва, пр-т Ленинский, д. 45, кв. 112",
        snils: "142-889-123 04",
      },
      attendingDoctorFullName: "Захарова Елена Викторовна",
      attendingDoctorSpecialty: "Врач стоматолог-терапевт",
      chiefComplaint: "Кратковременные ноющие боли в области зуба 1.6 от холодного и сладкого.",
      historyOfPresentIllness: "Зуб 1.6 ранее лечен по поводу глубокого кариеса 3 года назад. Неделю назад возникла чувствительность.",
      dentalFormula: {
        teeth: normalizedFormula,
        calculatedDmft: dmft,
      },
      dmftIndex: dmft,
      soapDiaries: [
        {
          entryDate: "2026-10-06",
          doctorFullName: "Захарова Елена Викторовна",
          doctorSpecialty: "Врач стоматолог-терапевт",
          clinicalDiagnosisIcd10: "K02.1 Кариес дентина (зуб 16)",
          subjectiveComplaints: "Кратковременная боль в зубе 16 при приеме холодной воды.",
          objectiveStatusLocalis: "Зуб 16: на окклюзионно-дистальной поверхности глубокая кариозная полость, дентин пигментирован, плотный. Зондирование болезненно по эмалево-дентинной границе. Перкуссия безболезненна. ЭОД 4 мкА.",
          treatmentProtocol804n: "Анестезия инфильтрационная Sol. Ubistesini 4% 1:200000 1.7 мл. Препарирование кариозной полости зуба 16, медикаментозная обработка 2% р-ром хлоргексидина. Изоляция коффердамом. Адгезивная система OptiBond FL. Восстановление коронковой части зуба пломбой светоотверждаемым наногибридным композитом Filtek Ultimate (A3B, A2E). Шлифовка, полировка дисками Sof-Lex, пастой Prisma Gloss. Окклюзионная пришлифовка по артикуляционной бумаге Bausch 40 мкм.",
          usedMaterials: "Ubistesin 4% 1.7ml, OptiBond FL, Filtek Ultimate A3B/A2E, Sof-Lex, Prisma Gloss",
          homeCareRecommendations: "Воздержаться от приема красящей пищи 24 часа. Контрольный осмотр через 6 месяцев."
        }
      ]
    });

    const docPage = await context.newPage();
    await docPage.setViewportSize({ width: 1200, height: 1400 });
    await docPage.setContent(form043Html, { waitUntil: "domcontentloaded" });
    await wait(1000);

    const fileP5 = path.join(LOCAL_DIR, "proof_05_form_043u_print_preview.png");
    await docPage.screenshot({ path: fileP5, fullPage: false });
    saveProof(fileP5, "proof_05_form_043u_print_preview.png", "Form 043/u Official Document", "Print A4 Preview");

    // ── PROOF 6: Production Act of Completed Works (804n) with Russian Sum in Words & Warranty ──
    console.log("Generating Act of Completed Works (804n) HTML with Russian sum in words...");
    const actHtml = renderActOfCompletedWorksHtml({
      actNumber: "АКТ-2026/1006-01",
      actDate: "2026-10-06",
      contractNumber: "ДОГ-2026/043-8812",
      contractDate: "2026-10-06",
      clinicLegalName: "ООО «ДЕНТЕ МЕДИКАЛ ГРУПП»",
      clinicAddress: "г. Москва, ул. Стоматологическая, д. 24, корп. 1",
      clinicOgrn: "1237700123456",
      clinicInn: "7704123456",
      medicalLicenseNumber: "ЛО41-01137-77/00368421 от 14.02.2023 г.",
      customerFullName: "Захаров Алексей Николаевич",
      patientFullName: "Захаров Алексей Николаевич",
      attendingDoctorFullName: "Захарова Елена Викторовна",
      attendingDoctorSpecialty: "Врач стоматолог-терапевт",
      items: [
        {
          code804n: "B01.065.001",
          serviceName: "Прием (осмотр, консультация) врача-стоматолога-терапевта первичный",
          quantity: 1,
          unitPriceRub: 1500,
          totalRub: 1500,
        },
        {
          code804n: "B01.003.004.004",
          serviceName: "Инфильтрационная анестезия (Sol. Ubistesini 4% 1.7 мл)",
          toothNumber: "16",
          quantity: 1,
          unitPriceRub: 900,
          totalRub: 900,
        },
        {
          code804n: "A16.07.002.010",
          serviceName: "Восстановление зуба пломбой I, V, VI класс по Блэку с использованием светоотверждаемых нанокомпозитов",
          toothNumber: "16",
          quantity: 1,
          unitPriceRub: 4500,
          totalRub: 4500,
        },
        {
          code804n: "A16.07.051",
          serviceName: "Профессиональная гигиена полости рта и зубов (ультразвуковое удаление наддесневых отложений)",
          quantity: 1,
          unitPriceRub: 3500,
          totalRub: 3500,
        }
      ],
      totalAmountRub: 10400,
      warrantyTermsText: "Гарантийный срок на терапевтическое лечение составляет 12 (двенадцать) месяцев при условии соблюдения рекомендаций врача и прохождения профилактического осмотра каждые 6 месяцев.",
    });

    await docPage.setContent(actHtml, { waitUntil: "domcontentloaded" });
    await wait(1000);

    const fileP6 = path.join(LOCAL_DIR, "proof_06_act_804n_completed_works_preview.png");
    await docPage.screenshot({ path: fileP6, fullPage: false });
    saveProof(fileP6, "proof_06_act_804n_completed_works_preview.png", "Act 804n Completed Works", "Print A4 Preview");

    await docPage.close();
    await context.close();

    console.log("\n==================================================");
    console.log("VISIT CONTINUITY RED TEAM PROOF SUMMARY");
    console.log("==================================================");
    console.table(capturedRegistry);
    console.log(`\nTotal proofs captured: ${capturedRegistry.length}/6`);

  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error("Run error:", err);
  process.exit(1);
});
