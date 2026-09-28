import type {
  ConsentPackageKey,
  ConsentPackagePrintOptions,
  ConsentSubstitutionContext,
  ConsentTemplateKey,
} from './types';
import {
  getConsentPackage,
  getConsentTemplate,
  PACKAGE_SHORT_TITLES,
} from './registry';
import {
  getBlankConsentSubstitutionContext,
  substitutePlaceholders,
  renderConsentTemplate,
} from './renderer';
import { printHtmlViaWindowOrIframe } from './printCore';

/**
 * Генерация непрерывного печатного документа пакета ИДС со строками «________» (или заполненными данными)
 * Регистратура и врач печатают пакет бланков в 1 клик без блокировок.
 */
export function generateConsentPackagePrintHtml(
	packageKey: ConsentPackageKey,
	options: ConsentPackagePrintOptions = {},
): string {
	const pkg = getConsentPackage(packageKey);
	const isBlank = options.mode === "blank" || Boolean(options.isBlank);

	const baseContext = isBlank
		? getBlankConsentSubstitutionContext(options.clinicDefaults || options.context)
		: (options.context || getBlankConsentSubstitutionContext(options.clinicDefaults));

	const clinicName = baseContext.clinicName || baseContext.clinicLegalName || "ООО «Стоматологическая клиника ДЕНТЕ»";
	const clinicLicense = baseContext.licenseNumber || "ЛО41-01137-77/00368421";
	const clinicAddress = baseContext.clinicAddress || "г. Москва, ул. Большая Стоматологическая, д. 12";
	const today = baseContext.date || new Date().toLocaleDateString("ru-RU");
	const effectiveWatermark = options.watermarkText || (options.isSigned ? "ПОДПИСАНО ВРАЧОМ" : "ЧЕРНОВИК — ДЛЯ ПРЕДВАРИТЕЛЬНОГО ОЗНАКОМЛЕНИЯ / БЕЗ ЭЦП");
	const stampColor = effectiveWatermark.includes("ПОДПИСАНО") ? "#059669" : "#64748b";

	// Рендерим все документы пакета последовательно
	const renderedSheets = pkg.templateKeys.map((tplKey, index) => {
		const tpl = getConsentTemplate(tplKey);
		const rendered = renderConsentTemplate(tpl, baseContext);

		const ptName = isBlank ? "__________________________________________________" : (baseContext.patientName?.trim() || "__________________________________________________");
		const ptBirth = isBlank ? "«___» _________ _____ г." : (baseContext.birthDate?.trim() || "«___» _________ _____ г.");
		const ptPassport = isBlank ? "серия _______ № _________ выдан ___________________________________" : (baseContext.passport?.trim() || "серия _______ № _________ выдан ____________________");
		const ptSnils = isBlank ? "___-___-___ __" : (baseContext.snils?.trim() || "___-___-___ __");
		const ptPhone = isBlank ? "+7 (___) ___-__-__" : (baseContext.phone?.trim() || "+7 (___) ___-__-__");
		const docName = isBlank ? "__________________________________________________" : (baseContext.doctorName?.trim() || "Лечащий врач-стоматолог");

		return `
    <div class="package-doc-sheet">
      <div class="watermark-draft" aria-hidden="true">${effectiveWatermark}</div>
      <div class="package-header-banner">
        <div class="package-banner-title">
          <span>${pkg.title.toUpperCase()}</span>
          <span class="package-banner-badge">Документ ${index + 1} из ${pkg.templateKeys.length} • Код: ${tpl.code}</span>
        </div>
      </div>

      <div class="sheet-header">
        <div class="clinic-top-row">
          <div>
            <strong>${clinicName}</strong> · Лицензия: № ${clinicLicense}<br>
            Адрес: ${clinicAddress}
          </div>
          <div style="text-align: right;">
            <div style="margin-bottom: 2pt;">
              <span class="watermark-stamp" aria-hidden="true">${effectiveWatermark}</span>
            </div>
            <span class="statutory-badge">${tpl.statutoryBasis.split(",")[0] || "323-ФЗ ст. 20"}</span><br>
            В медицинскую карту 043/у<br>
            Дата: ${today}
          </div>
        </div>
        <h1>${tpl.title}</h1>
        <div class="sheet-subtitle">${tpl.subtitle}</div>
      </div>

      <div class="parties-block">
        Я, <strong>${ptName}</strong>, дата рождения: ${ptBirth}, документ, удостоверяющий личность: ${ptPassport}, СНИЛС: ${ptSnils}, тел.: ${ptPhone},<br>
        настоящим даю информированное добровольное согласие лечащему врачу <strong>${docName}</strong> в медицинской организации <strong>${clinicName}</strong>.
      </div>

      ${rendered.renderedSections.map((sec) => `
        <div class="section-title">${sec.title}</div>
        <p>${sec.content}</p>
        ${sec.bullets && sec.bullets.length > 0 ? `
          <ul class="bullets-list">
            ${sec.bullets.map((b) => `<li>${b}</li>`).join("")}
          </ul>
        ` : ""}
      `).join("")}

      ${rendered.riskFactors.length > 0 ? `
        <div class="risk-block">
          <strong>Факторы риска и анатомические особенности:</strong>
          <ul class="bullets-list">
            ${rendered.riskFactors.map((rf) => `<li>${rf}</li>`).join("")}
          </ul>
        </div>
      ` : ""}

      ${rendered.aftercareInstructions.length > 0 ? `
        <div class="aftercare-block">
          <strong>Рекомендации и ограничения:</strong>
          <ul class="bullets-list">
            ${rendered.aftercareInstructions.map((ac) => `<li>${ac}</li>`).join("")}
          </ul>
        </div>
      ` : ""}

      <div class="signatures-row">
        <div class="sign-box">
          Пациент (законный представитель):<br>
          <strong>${ptName}</strong>
          <div class="sign-line"></div>
          <div class="sign-hint">(личная подпись / дата: ${today})</div>
        </div>
        <div class="sign-box">
          Лечащий врач-стоматолог:<br>
          <strong>${docName}</strong>
          <div class="sign-line"></div>
          <div class="sign-hint">(подпись медицинского работника / дата: ${today})</div>
        </div>
      </div>
    </div>
    `;
	}).join("\n");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>${pkg.title} — Бланк пакета ИДС</title>
  <style>
    @page {
      size: A4;
      margin: 10mm 14mm 12mm 14mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      font-size: 8.5pt;
      line-height: 1.35;
      color: #111827;
      background: #ffffff;
      margin: 0;
      padding: 0;
    }
    .watermark-draft {
      position: absolute;
      top: 45%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-30deg);
      font-size: 48pt;
      font-weight: 900;
      color: rgba(0, 0, 0, 0.04);
      text-transform: uppercase;
      letter-spacing: 4pt;
      pointer-events: none;
      z-index: 0;
      user-select: none;
    }
    .watermark-stamp {
      display: inline-block;
      border: 1.5pt solid ${stampColor};
      color: ${stampColor};
      padding: 1.5pt 5pt;
      border-radius: 2.5pt;
      font-size: 7pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .package-doc-sheet {
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 100%;
      page-break-after: always;
      padding-bottom: 8pt;
    }
    .package-doc-sheet:last-child {
      page-break-after: avoid;
    }
    .package-header-banner {
      background: #f0fdfa;
      border: 1px solid #0d9488;
      border-radius: 3pt;
      padding: 3pt 6pt;
      margin-bottom: 4pt;
    }
    .package-banner-title {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 700;
      font-size: 8pt;
      color: #0f766e;
    }
    .package-banner-badge {
      font-size: 7.5pt;
      background: #ccfbf1;
      padding: 1pt 4pt;
      border-radius: 2pt;
      color: #115e59;
    }
    .sheet-header {
      border-bottom: 1.5px solid #111827;
      padding-bottom: 3pt;
      margin-bottom: 5pt;
    }
    .clinic-top-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      font-size: 7.5pt;
      color: #4b5563;
      margin-bottom: 3pt;
    }
    .statutory-badge {
      display: inline-block;
      background: #e0f2fe;
      color: #0369a1;
      font-size: 7pt;
      font-weight: 700;
      padding: 1.5pt 4pt;
      border-radius: 2pt;
      border: 0.5px solid #bae6fd;
    }
    h1 {
      font-size: 10.5pt;
      font-weight: 800;
      text-align: center;
      margin: 2pt 0 1pt 0;
      letter-spacing: 0.3pt;
      text-transform: uppercase;
      color: #0f172a;
    }
    .sheet-subtitle {
      font-size: 7.5pt;
      text-align: center;
      color: #475569;
      margin-bottom: 3pt;
    }
    .parties-block {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      padding: 4pt 6pt;
      border-radius: 3pt;
      margin-bottom: 5pt;
      font-size: 8pt;
      line-height: 1.35;
    }
    .section-title {
      font-weight: 700;
      font-size: 8.5pt;
      text-transform: uppercase;
      margin: 3pt 0 2pt 0;
      color: #1e293b;
      border-bottom: 0.5px solid #e2e8f0;
      padding-bottom: 1pt;
    }
    p {
      margin: 0 0 3pt 0;
      text-align: justify;
    }
    .bullets-list {
      margin: 2pt 0 4pt 0;
      padding-left: 14pt;
      font-size: 8pt;
    }
    .bullets-list li {
      margin-bottom: 1.5pt;
    }
    .risk-block, .aftercare-block {
      background: #fffbeb;
      border: 1px solid #fef3c7;
      padding: 3pt 6pt;
      border-radius: 3pt;
      margin: 3pt 0;
      font-size: 8pt;
    }
    .signatures-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16pt;
      margin-top: 6pt;
      padding-top: 5pt;
      border-top: 1px solid #94a3b8;
      font-size: 8pt;
      page-break-inside: avoid;
    }
    .sign-box {
      display: flex;
      flex-direction: column;
      gap: 2pt;
    }
    .sign-line {
      border-bottom: 1px solid #0f172a;
      height: 18pt;
      margin-top: 3pt;
    }
    .sign-hint {
      font-size: 6.5pt;
      color: #64748b;
      text-align: center;
    }
  </style>
</head>
<body>
  ${renderedSheets}
</body>
</html>`;
}

/**
 * 1-клик печать пакета чистых бланков со строками «________»
 */
export function printBlankConsentPackage(
	packageKey: ConsentPackageKey,
	clinicDefaults?: Partial<ConsentSubstitutionContext>,
): void {
	const html = generateConsentPackagePrintHtml(packageKey, {
		isBlank: true,
		...(clinicDefaults ? { clinicDefaults } : {}),
	});
	printHtmlViaWindowOrIframe(html, "dente-package-blank-print-iframe");
}

/**
 * 1-клик печать пакета заполненных бланков А4
 */
export function printFilledConsentPackage(
	packageKey: ConsentPackageKey,
	context: ConsentSubstitutionContext,
	options: { isSigned?: boolean; watermarkText?: string } = {},
): void {
	const html = generateConsentPackagePrintHtml(packageKey, {
		isBlank: false,
		context,
		isSigned: options.isSigned,
		watermarkText: options.watermarkText,
	});
	printHtmlViaWindowOrIframe(html, "dente-package-filled-print-iframe");
}

/**
 * Генерация HTML печатного бланка одиночного шаблона ИДС А4 со всеми клиническими разделами,
 * факторами риска, рекомендациями и строками подписи (или со строками «________»).
 */
export function generateSingleConsentTemplatePrintHtml(
	templateKey: ConsentTemplateKey,
	options: ConsentPackagePrintOptions = {},
): string {
	const tpl = getConsentTemplate(templateKey);
	const isBlank = options.mode === "blank" || Boolean(options.isBlank);

	const baseContext = isBlank
		? getBlankConsentSubstitutionContext(options.clinicDefaults || options.context)
		: (options.context || getBlankConsentSubstitutionContext(options.clinicDefaults));

	const clinicName = baseContext.clinicName || baseContext.clinicLegalName || "ООО «Стоматологическая клиника ДЕНТЕ»";
	const clinicLicense = baseContext.licenseNumber || "ЛО41-01137-77/00368421";
	const clinicAddress = baseContext.clinicAddress || "г. Москва, ул. Большая Стоматологическая, д. 12";
	const clinicPhone = baseContext.phone || "";
	const today = baseContext.date || new Date().toLocaleDateString("ru-RU");
	const effectiveWatermark = options.watermarkText || (options.isSigned ? "ПОДПИСАНО ВРАЧОМ" : "ЧЕРНОВИК — ДЛЯ ПРЕДВАРИТЕЛЬНОГО ОЗНАКОМЛЕНИЯ / БЕЗ ЭЦП");
	const stampColor = effectiveWatermark.includes("ПОДПИСАНО") ? "#059669" : "#64748b";

	const rendered = renderConsentTemplate(tpl, baseContext);

	const ptName = isBlank ? "__________________________________________________" : (baseContext.patientName?.trim() || "__________________________________________________");
	const ptBirth = isBlank ? "«___» _________ _____ г." : (baseContext.birthDate?.trim() || "«___» _________ _____ г.");
	const ptPassport = isBlank ? "серия _______ № _________ выдан ___________________________________" : (baseContext.passport?.trim() || "серия _______ № _________ выдан ____________________");
	const ptSnils = isBlank ? "___-___-___ __" : (baseContext.snils?.trim() || "___-___-___ __");
	const ptPhone = isBlank ? "+7 (___) ___-__-__" : (baseContext.phone?.trim() || "+7 (___) ___-__-__");
	const docName = isBlank ? "__________________________________________________" : (baseContext.doctorName?.trim() || "Лечащий врач-стоматолог");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>${tpl.title} — Бланк ИДС</title>
  <style>
    @page {
      size: A4;
      margin: 10mm 14mm 12mm 14mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      font-size: 8.5pt;
      line-height: 1.35;
      color: #111827;
      background: #ffffff;
      margin: 0;
      padding: 0;
    }
    .watermark-draft {
      position: absolute;
      top: 45%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-30deg);
      font-size: 48pt;
      font-weight: 900;
      color: rgba(0, 0, 0, 0.04);
      text-transform: uppercase;
      letter-spacing: 4pt;
      pointer-events: none;
      z-index: 0;
      user-select: none;
    }
    .watermark-stamp {
      display: inline-block;
      border: 1.5pt solid ${stampColor};
      color: ${stampColor};
      padding: 1.5pt 5pt;
      border-radius: 2.5pt;
      font-size: 7pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .single-doc-sheet {
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 100%;
      padding-bottom: 8pt;
    }
    .sheet-header {
      border-bottom: 1.5px solid #111827;
      padding-bottom: 3pt;
      margin-bottom: 5pt;
    }
    .clinic-top-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      font-size: 7.5pt;
      color: #4b5563;
      margin-bottom: 3pt;
    }
    .statutory-badge {
      display: inline-block;
      background: #e0f2fe;
      color: #0369a1;
      font-size: 7pt;
      font-weight: 700;
      padding: 1.5pt 4pt;
      border-radius: 2pt;
      border: 0.5px solid #bae6fd;
    }
    h1 {
      font-size: 10.5pt;
      font-weight: 800;
      text-align: center;
      margin: 2pt 0 1pt 0;
      letter-spacing: 0.3pt;
      text-transform: uppercase;
      color: #0f172a;
    }
    .sheet-subtitle {
      font-size: 7.5pt;
      text-align: center;
      color: #475569;
      margin-bottom: 3pt;
    }
    .parties-block {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      padding: 4pt 6pt;
      border-radius: 3pt;
      margin-bottom: 5pt;
      font-size: 8pt;
      line-height: 1.35;
    }
    .section-title {
      font-weight: 700;
      font-size: 8.5pt;
      text-transform: uppercase;
      margin: 3pt 0 2pt 0;
      color: #1e293b;
      border-bottom: 0.5px solid #e2e8f0;
      padding-bottom: 1pt;
    }
    p {
      margin: 0 0 3pt 0;
      text-align: justify;
    }
    .bullets-list {
      margin: 2pt 0 4pt 0;
      padding-left: 14pt;
      font-size: 8pt;
    }
    .bullets-list li {
      margin-bottom: 1.5pt;
    }
    .risk-block, .aftercare-block {
      background: #fffbeb;
      border: 1px solid #fef3c7;
      padding: 3pt 6pt;
      border-radius: 3pt;
      margin: 3pt 0;
      font-size: 8pt;
    }
    .signatures-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16pt;
      margin-top: 6pt;
      padding-top: 5pt;
      border-top: 1px solid #94a3b8;
      font-size: 8pt;
      page-break-inside: avoid;
    }
    .sign-box {
      display: flex;
      flex-direction: column;
      gap: 2pt;
    }
    .sign-line {
      border-bottom: 1px solid #0f172a;
      height: 18pt;
      margin-top: 3pt;
    }
    .sign-hint {
      font-size: 6.5pt;
      color: #64748b;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="single-doc-sheet">
    <div class="watermark-draft" aria-hidden="true">${effectiveWatermark}</div>

    <div class="sheet-header">
      <div class="clinic-top-row">
        <div>
          <strong>${clinicName}</strong> · Лицензия: № ${clinicLicense}<br>
          Адрес: ${clinicAddress}${clinicPhone ? ` · Тел.: ${clinicPhone}` : ""}
        </div>
        <div style="text-align: right;">
          <div style="margin-bottom: 2pt;">
            <span class="watermark-stamp" aria-hidden="true">${effectiveWatermark}</span>
          </div>
          <span class="statutory-badge">${tpl.statutoryBasis.split(",")[0] || "323-ФЗ ст. 20"}</span><br>
          В медицинскую карту 043/у • Код: ${tpl.code}<br>
          Дата: ${today}
        </div>
      </div>
      <h1>${tpl.title}</h1>
      <div class="sheet-subtitle">${tpl.subtitle}</div>
    </div>

    <div class="parties-block">
      Я, <strong>${ptName}</strong>, дата рождения: ${ptBirth}, документ, удостоверяющий личность: ${ptPassport}, СНИЛС: ${ptSnils}, тел.: ${ptPhone},<br>
      настоящим даю информированное добровольное согласие лечащему врачу <strong>${docName}</strong> в медицинской организации <strong>${clinicName}</strong>.
    </div>

    ${rendered.renderedSections.map((sec) => `
      <div class="section-title">${sec.title}</div>
      <p>${sec.content}</p>
      ${sec.bullets && sec.bullets.length > 0 ? `
        <ul class="bullets-list">
          ${sec.bullets.map((b) => `<li>${b}</li>`).join("")}
        </ul>
      ` : ""}
    `).join("")}

    ${rendered.riskFactors.length > 0 ? `
      <div class="risk-block">
        <strong>Факторы риска и анатомические особенности:</strong>
        <ul class="bullets-list">
          ${rendered.riskFactors.map((rf) => `<li>${rf}</li>`).join("")}
        </ul>
      </div>
    ` : ""}

    ${rendered.aftercareInstructions.length > 0 ? `
      <div class="aftercare-block">
        <strong>Рекомендации и ограничения:</strong>
        <ul class="bullets-list">
          ${rendered.aftercareInstructions.map((ac) => `<li>${ac}</li>`).join("")}
        </ul>
      </div>
    ` : ""}

    <div class="signatures-row">
      <div class="sign-box">
        Пациент (законный представитель):<br>
        <strong>${ptName}</strong>
        <div class="sign-line"></div>
        <div class="sign-hint">(личная подпись / дата: ${today})</div>
      </div>
      <div class="sign-box">
        Лечащий врач-стоматолог:<br>
        <strong>${docName}</strong>
        <div class="sign-line"></div>
        <div class="sign-hint">(подпись медицинского работника / дата: ${today})</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * 1-клик печать одиночного чистого бланка ИДС со строками «________»
 */
export function printBlankConsentTemplate(
	templateKey: ConsentTemplateKey,
	clinicDefaults?: Partial<ConsentSubstitutionContext>,
): void {
	const html = generateSingleConsentTemplatePrintHtml(templateKey, {
		isBlank: true,
		clinicDefaults,
	});
	printHtmlViaWindowOrIframe(html, "dente-single-blank-print-iframe");
}

/**
 * 1-клик печать одиночного заполненного бланка ИДС А4
 */
export function printFilledConsentTemplate(
	templateKey: ConsentTemplateKey,
	context: ConsentSubstitutionContext,
	options: { isSigned?: boolean; watermarkText?: string } = {},
): void {
	const html = generateSingleConsentTemplatePrintHtml(templateKey, {
		isBlank: false,
		context,
		isSigned: options.isSigned,
		watermarkText: options.watermarkText,
	});
	printHtmlViaWindowOrIframe(html, "dente-single-filled-print-iframe");
}
