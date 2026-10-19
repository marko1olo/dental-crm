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

	let printWindow: Window | null = null;
	try {
		printWindow = window.open("", "_blank", "width=920,height=1050");
	} catch (e) {
		console.warn("window.open blocked, using iframe fallback", e);
	}

	if (printWindow && !printWindow.closed) {
		try {
			printWindow.document.open();
			printWindow.document.write(html);
			printWindow.document.close();
			printWindow.focus();
			setTimeout(() => {
				try {
					printWindow?.print();
				} catch (printErr) {
					console.error("Window print trigger failed:", printErr);
				}
			}, 300);
			return;
		} catch (writeErr) {
			console.warn("Error writing to printWindow, trying fallback iframe", writeErr);
		}
	}

	try {
		const existingIframe = document.getElementById("dente-clinical-package-print-iframe");
		if (existingIframe) existingIframe.remove();

		const iframe = document.createElement("iframe");
		iframe.id = "dente-clinical-package-print-iframe";
		iframe.style.position = "fixed";
		iframe.style.right = "0";
		iframe.style.bottom = "0";
		iframe.style.width = "0";
		iframe.style.height = "0";
		iframe.style.border = "none";
		iframe.style.zIndex = "-999";
		document.body.appendChild(iframe);

		const doc = iframe.contentWindow?.document;
		if (doc) {
			doc.open();
			doc.write(html);
			doc.close();
			iframe.contentWindow?.focus();
			setTimeout(() => {
				try {
					iframe.contentWindow?.print();
				} catch (iframeErr) {
					console.error("Iframe print trigger failed:", iframeErr);
				}
			}, 350);
		}
	} catch (iframeSetupErr) {
		console.error("Iframe fallback print failed:", iframeSetupErr);
		window.print();
	}
}
