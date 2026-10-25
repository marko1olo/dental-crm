/**
 * surgicalPackagePrintEngine.ts
 *
 * Канонический масштабируемый печатный движок хирургического пакета DENTE.
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
import { printHtmlViaIframe } from "./printHtmlViaIframe";

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

export function printSurgicalPackage(
	options: SurgicalPackagePrintOptions,
): void {
	const html = generateSurgicalPackageHtml(options);
	printHtmlViaIframe(html, "dente-surgical-package-print-iframe");
}
