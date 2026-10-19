/**
 * surgicalPackagePrintEngine.ts
 *
 * Канонический масштабируемый печатный движок хирургического пакета DENTE:
 * 1. Информированное добровольное согласие на хирургическое вмешательство (удаление зуба, имплантация, синус-лифтинг)
 * 2. Лист согласия на инфильтрационную / проводниковую / мандибулярную анестезию
 * 3. Памятка пациенту после хирургической операции и удаления зуба
 * 4. Протокол хирургической операции (стационарный / амбулаторный)
 */

import { SURGICAL_PACKAGE_CSS } from "./surgicalPackage/css";
import { buildSurgicalRequisitesContext } from "./surgicalPackage/helpers";
import { renderSurgicalConsentSheet } from "./surgicalPackage/consentSheet";
import { renderSurgicalAnesthesiaSheet } from "./surgicalPackage/anesthesiaSheet";
import { renderSurgicalMemoSheet } from "./surgicalPackage/memoSheet";
import type { SurgicalPackagePrintOptions, SurgicalRequisitesContext } from "./surgicalPackage/types";
import {
	generateSurgicalOperationProtocolHtml,
	printSurgicalOperationProtocol,
	type SurgicalOperationProtocolPrintOptions,
} from "./surgicalOperationProtocolPrintEngine";

export * from "./surgicalPackage/types";
export { SURGICAL_PACKAGE_CSS } from "./surgicalPackage/css";
export { buildSurgicalRequisitesContext } from "./surgicalPackage/helpers";
export { renderSurgicalConsentSheet } from "./surgicalPackage/consentSheet";
export { renderSurgicalAnesthesiaSheet } from "./surgicalPackage/anesthesiaSheet";
export { renderSurgicalMemoSheet } from "./surgicalPackage/memoSheet";
export type { SurgicalOperationProtocolPrintOptions };
export {
	generateSurgicalOperationProtocolHtml,
	printSurgicalOperationProtocol,
};

/**
 * Генерирует полиграфический HTML хирургического пакета (А4)
 */
export function generateSurgicalPackageHtml(
	options: SurgicalPackagePrintOptions,
): string {
	const ctx: SurgicalRequisitesContext = buildSurgicalRequisitesContext(options);

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>Хирургический пакет документов — ${ctx.ptName || "Пациент"}</title>
  <style>${SURGICAL_PACKAGE_CSS}</style>
</head>
<body>
${renderSurgicalConsentSheet(ctx)}
${renderSurgicalAnesthesiaSheet(ctx)}
${renderSurgicalMemoSheet(ctx)}
</body>
</html>`;
}

/**
 * Отправляет хирургический пакет документов на печать
 */
export function printSurgicalPackage(
	options: SurgicalPackagePrintOptions,
): void {
	const html = generateSurgicalPackageHtml(options);

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
		const existingIframe = document.getElementById("dente-surgical-package-print-iframe");
		if (existingIframe) existingIframe.remove();

		const iframe = document.createElement("iframe");
		iframe.id = "dente-surgical-package-print-iframe";
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
