import type {
	ConsentPackageKey,
	ConsentPackagePrintOptions,
} from "./types";
import { getConsentPackage, getConsentTemplate } from "./registry";
import { getBlankConsentSubstitutionContext, renderConsentTemplate } from "./renderer";
import { isDemoShowcaseMode } from "../../../lib/demoMode.js";
import { getPackagePrintStyles } from "./printStyles";
import { buildPartiesPreambleHtml } from "./partiesPreamble";
import { renderSectionsAndRisksHtml, renderSignaturesRowHtml } from "./printSheetBlocks";

export function generateConsentPackagePrintHtml(
	packageKey: ConsentPackageKey,
	options: ConsentPackagePrintOptions = {},
): string {
	const pkg = getConsentPackage(packageKey);
	const isBlank = options.mode === "blank" || Boolean(options.isBlank);

	const baseContext = isBlank
		? getBlankConsentSubstitutionContext(options.clinicDefaults || options.context)
		: (options.context || getBlankConsentSubstitutionContext(options.clinicDefaults));

	const isDemo = isDemoShowcaseMode();
	const clinicName = baseContext.clinicName || baseContext.clinicLegalName || (isDemo ? "ООО «Стоматологическая клиника ДЕНТЕ»" : "«________________________________________»");
	const clinicLicense = baseContext.licenseNumber || (isDemo ? "ЛО41-01137-77/00368421" : "«________________________________________»");
	const clinicAddress = baseContext.clinicAddress || (isDemo ? "г. Москва, ул. Большая Стоматологическая, д. 12" : "«________________________________________»");
	const today = baseContext.date || new Date().toLocaleDateString("ru-RU");
	const effectiveWatermark = options.watermarkText || (options.isSigned ? "ПОДПИСАНО ВРАЧОМ" : "ЧЕРНОВИК — ДЛЯ ПРЕДВАРИТЕЛЬНОГО ОЗНАКОМЛЕНИЯ / БЕЗ ЭЦП");
	const stampColor = effectiveWatermark.includes("ПОДПИСАНО") ? "#059669" : "#64748b";

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
          <div><strong>${clinicName}</strong> · Лицензия: № ${clinicLicense}<br>Адрес: ${clinicAddress}</div>
          <div style="text-align: right;">
            <div style="margin-bottom: 2pt;"><span class="watermark-stamp" aria-hidden="true">${effectiveWatermark}</span></div>
            <span class="statutory-badge">${tpl.statutoryBasis.split(",")[0] || "323-ФЗ ст. 20"}</span><br>В медицинскую карту 043/у<br>Дата: ${today}
          </div>
        </div>
        <h1>${tpl.title}</h1>
        <div class="sheet-subtitle">${tpl.subtitle}</div>
      </div>
      ${buildPartiesPreambleHtml(tpl.key, baseContext, ptName, ptBirth, ptPassport, ptSnils, ptPhone, docName, clinicName)}
      ${renderSectionsAndRisksHtml(rendered)}
      ${renderSignaturesRowHtml(ptName, docName, today)}
    </div>`;
	}).join("\n");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>${pkg.title} — Бланк пакета ИДС</title>
  <style>${getPackagePrintStyles(stampColor)}</style>
</head>
<body>${renderedSheets}</body>
</html>`;
}
