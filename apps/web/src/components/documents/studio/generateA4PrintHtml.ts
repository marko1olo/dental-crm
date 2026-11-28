/**
 * apps/web/src/components/documents/studio/generateA4PrintHtml.ts
 *
 * Генератор профессионального HTML-документа формата А4 для прямой печати через iframe/диалог (Мандат 8e).
 * Чистая типографика, строгая сетка и нулевой визуальный шум.
 */
import { escapeHtml } from "@dental/shared";
import { formatKopecksToRubles, type PatientRequisites } from "../../consents/consentCatalogData";

export interface GenerateA4PrintHtmlOptions {
	readonly clinic: {
		readonly name: string;
		readonly inn: string;
		readonly license: string;
		readonly address: string;
		readonly phone: string;
	};
	readonly patient: PatientRequisites;
	readonly doctorFullName: string;
	readonly currentDate: string;
	readonly totalAmountKopecks: number;
	readonly documentText: string;
	readonly hasSigned?: boolean | undefined;
	readonly signedAtTimeStr?: string | null | undefined;
}

export function generateA4PrintHtml(options: GenerateA4PrintHtmlOptions): string {
	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(options.clinic.name)} — ${escapeHtml(options.patient.fullName || "Документ")}</title>
  <style>
    @page { size: A4 portrait; margin: 15mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 13px; line-height: 1.6; color: #0f172a; margin: 0; padding: 24px; }
    .sheet-header { display: flex; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 14px; margin-bottom: 20px; }
    .clinic-title { font-size: 16px; font-weight: 700; text-transform: uppercase; }
    .clinic-sub { font-size: 11px; color: #475569; margin-top: 3px; }
    .date-badge { text-align: right; font-size: 12px; }
    .total-cost { font-weight: 600; color: #0d9488; margin-top: 4px; }
    .doc-content { white-space: pre-wrap; word-break: break-word; font-size: 13px; line-height: 1.65; margin: 24px 0; min-height: 500px; }
    .sheet-footer { margin-top: 36px; padding-top: 16px; border-top: 1px solid #cbd5e1; display: flex; justify-content: space-between; font-size: 12px; }
    .sig-block { max-width: 45%; }
  </style>
</head>
<body>
  <div class="sheet-header">
    <div>
      <div class="clinic-title">${escapeHtml(options.clinic.name)}</div>
      <div class="clinic-sub">${escapeHtml(options.clinic.address)} · Тел: ${escapeHtml(options.clinic.phone)}</div>
      <div class="clinic-sub">Лицензия: ${escapeHtml(options.clinic.license)}</div>
    </div>
    <div class="date-badge">
      <div>Дата: ${escapeHtml(options.currentDate)}</div>
      <div class="total-cost">Сумма: ${escapeHtml(formatKopecksToRubles(options.totalAmountKopecks))}</div>
    </div>
  </div>
  <div class="doc-content">${escapeHtml(options.documentText)}</div>
  <div class="sheet-footer">
    <div class="sig-block">
      <div style="font-weight: 600;">Исполнитель:</div>
      <div>${escapeHtml(options.doctorFullName)}</div>
      <div style="margin-top: 18px; color: #64748b;">Подпись: ______________________ М.П.</div>
    </div>
    <div class="sig-block" style="text-align: right;">
      <div style="font-weight: 600;">Пациент:</div>
      <div>${escapeHtml(options.patient.fullName || "______________________")}</div>
      <div style="margin-top: 18px; color: #64748b;">
        ${options.hasSigned ? `Подписано пациентом ${options.signedAtTimeStr ? `в ${escapeHtml(options.signedAtTimeStr)} ` : ""}[OK]` : "Подпись: ______________________"}
      </div>
    </div>
  </div>
</body>
</html>`;
}
