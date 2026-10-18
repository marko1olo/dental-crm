import { CLINICAL_PACKAGE_CSS } from "./css";
import { buildClinicalRequisitesContext } from "./helpers";
import { renderClinicalConsentSheet } from "./consentSheet";
import { renderClinicalAnesthesiaSheet } from "./anesthesiaSheet";
import { renderClinicalMemoSheet } from "./memoSheet";
import type { ClinicalPackagePrintOptions } from "./types";

export function generateClinicalPackageHtml(
	options: ClinicalPackagePrintOptions,
): string {
	const ctx = buildClinicalRequisitesContext(options);

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>Терапевтический пакет документов — ${ctx.ptName}</title>
  <style>${CLINICAL_PACKAGE_CSS}</style>
</head>
<body>
${renderClinicalConsentSheet(ctx)}
${renderClinicalAnesthesiaSheet(ctx)}
${renderClinicalMemoSheet(ctx)}
</body>
</html>`;
}
