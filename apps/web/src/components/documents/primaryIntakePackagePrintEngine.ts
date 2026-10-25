/**
 * primaryIntakePackagePrintEngine.ts
 *
 * Канонический масштабируемый движок пакетной печати первичного приёма DENTE CRM.
 */

import { PRIMARY_INTAKE_PACKAGE_CSS } from "./primaryIntakePackage/css";
import { buildIntakeRequisitesContext } from "./primaryIntakePackage/helpers";
import { renderContractSheet } from "./primaryIntakePackage/contractSheet";
import { renderConsentSheet } from "./primaryIntakePackage/consentSheet";
import { renderPersonalDataSheet } from "./primaryIntakePackage/personalDataSheet";
import { renderQuestionnaireSheet } from "./primaryIntakePackage/questionnaireSheet";
import type { PrimaryIntakePackagePrintOptions, IntakeRequisitesContext } from "./primaryIntakePackage/types";
import { printHtmlViaIframe } from "./printHtmlViaIframe";

export * from "./primaryIntakePackage/types";
export { PRIMARY_INTAKE_PACKAGE_CSS } from "./primaryIntakePackage/css";
export { buildIntakeRequisitesContext } from "./primaryIntakePackage/helpers";
export { renderContractSheet } from "./primaryIntakePackage/contractSheet";
export { renderConsentSheet } from "./primaryIntakePackage/consentSheet";
export { renderPersonalDataSheet } from "./primaryIntakePackage/personalDataSheet";
export { renderQuestionnaireSheet } from "./primaryIntakePackage/questionnaireSheet";

export function generatePrimaryIntakePackageHtml(
	options: PrimaryIntakePackagePrintOptions,
): string {
	const ctx: IntakeRequisitesContext = buildIntakeRequisitesContext(options);

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>Первичный пакет документов — ${ctx.ptName || "Пациент"}</title>
  <style>${PRIMARY_INTAKE_PACKAGE_CSS}</style>
</head>
<body>
${renderContractSheet(ctx)}
${renderConsentSheet(ctx)}
${renderPersonalDataSheet(ctx)}
${renderQuestionnaireSheet(ctx, options)}
</body>
</html>`;
}

export function printPrimaryIntakePackage(
	options: PrimaryIntakePackagePrintOptions,
): void {
	const html = generatePrimaryIntakePackageHtml(options);
	printHtmlViaIframe(html, "dente-primary-intake-print-iframe");
}
