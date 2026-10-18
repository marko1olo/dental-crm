import { SURGICAL_PACKAGE_CSS } from "./css";
import { buildSurgicalRequisitesContext } from "./helpers";
import { renderSurgicalConsentSheet } from "./consentSheet";
import { renderSurgicalAnesthesiaSheet } from "./anesthesiaSheet";
import { renderSurgicalMemoSheet } from "./memoSheet";
import type { SurgicalPackagePrintOptions } from "./types";

export function generateSurgicalPackageHtml(
	options: SurgicalPackagePrintOptions,
): string {
	const ctx = buildSurgicalRequisitesContext(options);

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>Хирургический пакет документов — ${ctx.ptName}</title>
  <style>${SURGICAL_PACKAGE_CSS}</style>
</head>
<body>
${renderSurgicalConsentSheet(ctx)}
${renderSurgicalAnesthesiaSheet(ctx)}
${renderSurgicalMemoSheet(ctx)}
</body>
</html>`;
}
