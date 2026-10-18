import { PRIMARY_INTAKE_PACKAGE_CSS } from "./css";
import { buildIntakeRequisitesContext } from "./helpers";
import { renderContractSheet } from "./contractSheet";
import { renderConsentSheet } from "./consentSheet";
import { renderPersonalDataSheet } from "./personalDataSheet";
import { renderQuestionnaireSheet } from "./questionnaireSheet";
import type { PrimaryIntakePackagePrintOptions } from "./types";

export function generatePrimaryIntakePackageHtml(
	options: PrimaryIntakePackagePrintOptions,
): string {
	const ctx = buildIntakeRequisitesContext(options);

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>Первичный пакет документов — ${ctx.ptName}</title>
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
