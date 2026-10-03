const { chromium } = require("playwright");
const path = require("node:path");
const fs = require("node:fs");

async function main() {
  const outDir = path.resolve("C:/Clinic_MVP/dental-crm/docs/screenshots/inquisition_live");
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // Import shared templates and renderers from compiled dist
  const shared = require(path.resolve("packages/shared/dist/index.js"));
  const templates = shared.ALL_DEFAULT_TEMPLATES_BY_ALIAS || {};

  console.log(`Loaded ${Object.keys(templates).length} templates from @dental/shared.`);

  const clinicalContext = {
    patient: {
      fullName: "Ковалёв Роман Станиславович",
      cardNumber: "043-00892",
      birthDate: "1988-04-12",
      gender: "male",
      phone: "+7 (999) 888-77-66",
      address: "127006, г. Москва, Столярный пер., д. 14, кв. 8",
      passport: {
        series: "4514",
        number: "987654",
        issuedDate: "20.08.2015",
        issuedBy: "ГУ МВД России по г. Москве",
      },
    },
    clinic: {
      name: "Стоматология ДЕНТЕ Премиум",
      legalName: "ООО «Стоматологическая клиника ДЕНТЕ»",
      address: "127006, г. Москва, Столярный пер., д. 14",
      phone: "+7 (495) 123-45-67",
      inn: "7701234567",
      kpp: "770101001",
      ogrn: "1237700123456",
      licenseNumber: "ЛО41-01137-77/00584930",
      licenseDate: "12.04.2022",
      licenseIssuedBy: "Департамент здравоохранения города Москвы",
      website: "https://dente-clinic.ru",
    },
    doctor: {
      fullName: "Воронов Алексей Владимирович",
      specialty: "стоматолог-хирург-имплантолог",
    },
    currentDate: new Date(),
  };

  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });

  const docsToCapture = [
    {
      alias: "ids_implant",
      prefix: "proof_ids_implant_statutory",
      title: "Информированное добровольное согласие на операцию дентальной имплантации",
    },
    {
      alias: "protocol_khirurgicheskoy_operacii",
      prefix: "proof_surgical_protocol_statutory",
      title: "Протокол хирургической операции дентальной имплантации",
    },
    {
      alias: "pamyatka_otbelivanie",
      prefix: "proof_pamyatka_whitening_statutory",
      title: "Памятка: клиническое отбеливание и белая диета 72 часа",
    },
    {
      alias: "pamyatka_implantaciya",
      prefix: "proof_pamyatka_implant_statutory",
      title: "Памятка после дентальной имплантации (Форма № 12)",
    },
  ];

  for (const doc of docsToCapture) {
    const rawTemplate = templates[doc.alias];
    if (!rawTemplate) {
      console.warn(`Template ${doc.alias} not found!`);
      continue;
    }

    const populatedHtml = shared.renderDocumentTemplate(rawTemplate, clinicalContext, {
      preserveUnknownTokens: false,
      emptyPlaceholder: "________________",
    });

    for (const theme of ["light", "dark"]) {
      const isDark = theme === "dark";
      const outerBg = isDark ? "#090d16" : "#f1f5f9";
      const sheetBg = isDark ? "#141c2e" : "#ffffff";
      const sheetText = isDark ? "#f1f5f9" : "#111827";
      const sheetBorder = isDark ? "#1e293b" : "#cbd5e1";

      const wrappedHtml = `<!DOCTYPE html>
<html lang="ru" data-theme="${theme}">
<head>
  <meta charset="utf-8">
  <title>${doc.title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body {
      background: ${outerBg};
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 32px 16px;
    }
    .preview-header {
      width: 820px;
      margin-bottom: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
      color: ${isDark ? "#94a3b8" : "#64748b"};
    }
    .preview-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 9999px;
      background: ${isDark ? "#1e293b" : "#e2e8f0"};
      color: ${isDark ? "#38bdf8" : "#0284c7"};
      font-weight: 600;
      font-size: 11px;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .a4-viewport-container {
      width: 820px;
      background: ${sheetBg};
      color: ${sheetText};
      border: 1px solid ${sheetBorder};
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, ${isDark ? "0.6" : "0.1"}), 0 10px 10px -5px rgba(0, 0, 0, ${isDark ? "0.4" : "0.04"});
      border-radius: 6px;
      padding: 40px 48px;
      line-height: 1.45;
    }
    ${isDark ? `
      .a4-viewport-container div[style*="background"],
      .a4-viewport-container div[style*="background-color"] {
        background: #0f172a !important;
        background-color: #0f172a !important;
        border-color: #334155 !important;
        color: #f1f5f9 !important;
      }
      .a4-viewport-container table, .a4-viewport-container td, .a4-viewport-container th {
        border-color: #334155 !important;
        color: #f1f5f9 !important;
      }
      .a4-viewport-container th[style*="background"], .a4-viewport-container td[style*="background"] {
        background: #1e293b !important;
        background-color: #1e293b !important;
      }
      .a4-viewport-container div, .a4-viewport-container p, .a4-viewport-container li, .a4-viewport-container span {
        color: #f1f5f9 !important;
      }
      .a4-viewport-container strong, .a4-viewport-container b, .a4-viewport-container h1, .a4-viewport-container h2, .a4-viewport-container h3 {
        color: #ffffff !important;
      }
      .a4-viewport-container .doc-header {
        border-bottom-color: #475569 !important;
      }
    ` : ""}
  </style>
</head>
<body>
  <div class="preview-header">
    <span class="preview-badge">Официальный бланк РФ • 323-ФЗ • 1051н • DENTE CRM</span>
    <span>Пациент: Ковалёв Р. С. (№ 043-00892)</span>
  </div>
  <div class="a4-viewport-container">
    ${populatedHtml}
  </div>
</body>
</html>`;

      await page.setContent(wrappedHtml, { waitUntil: "load" });
      await page.waitForTimeout(400);

      const filename = `${doc.prefix}_desktop_${theme}.png`;
      const outPath = path.join(outDir, filename);
      await page.screenshot({ path: outPath, fullPage: false });
      console.log(`[Captured statutory proof] ${filename} -> ${outPath} (${fs.statSync(outPath).size} bytes)`);
    }
  }

  await browser.close();
  console.log("\nAll populated statutory proofs successfully captured!");
}

main().catch((err) => {
  console.error("Error in capture_full_consents_statutory_proofs:", err);
  process.exit(1);
});
