/**
 * clinicalPackagePrintEngine.ts
 *
 * Канонический масштабируемый печатный движок терапевтического / клинического пакета DENTE.
 * Включает в себя 3 обязательных листа:
 * 1. Информированное добровольное согласие на терапевтическое лечение (кариес, пульпит, эндодонтия)
 * 2. Лист информированного согласия на местную инфильтрационную / проводниковую анестезию
 * 3. Памятка пациенту после эндодонтического и терапевтического вмешательства
 */

import { CLINICAL_PACKAGE_CSS } from "./clinicalPackage/css";
import { buildClinicalRequisitesContext } from "./clinicalPackage/helpers";
import { renderClinicalConsentSheet } from "./clinicalPackage/consentSheet";
import { renderClinicalAnesthesiaSheet } from "./clinicalPackage/anesthesiaSheet";
import { renderClinicalMemoSheet } from "./clinicalPackage/memoSheet";
import { printHtmlViaIframe } from "./printHtmlViaIframe";
import type { ClinicalPackagePrintOptions, ClinicalRequisitesContext } from "./clinicalPackage/types";

export * from "./clinicalPackage/types";
export { CLINICAL_PACKAGE_CSS } from "./clinicalPackage/css";
export { buildClinicalRequisitesContext } from "./clinicalPackage/helpers";
export { renderClinicalConsentSheet } from "./clinicalPackage/consentSheet";
export { renderClinicalAnesthesiaSheet } from "./clinicalPackage/anesthesiaSheet";
export { renderClinicalMemoSheet } from "./clinicalPackage/memoSheet";

/**
 * Генерирует полиграфический HTML клинического терапевтического пакета
 */
export function generateClinicalPackageHtml(
	options: ClinicalPackagePrintOptions,
): string {
	const ctx: ClinicalRequisitesContext = buildClinicalRequisitesContext(options);

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>Терапевтический пакет документов — ${ctx.ptName || "Пациент"}</title>
  <style>${CLINICAL_PACKAGE_CSS}</style>
</head>
<body>
${renderClinicalConsentSheet(ctx)}
${renderClinicalAnesthesiaSheet(ctx)}
${renderClinicalMemoSheet(ctx)}
</body>
</html>`;
}

/**
 * Отправляет клинический терапевтический пакет на печать
 */
export function printClinicalPackage(
	options: ClinicalPackagePrintOptions,
): void {
	const html = generateClinicalPackageHtml(options);
	printHtmlViaIframe(html, "dente-clinical-package-print-iframe");
}
