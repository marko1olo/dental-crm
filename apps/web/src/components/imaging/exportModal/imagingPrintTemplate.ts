/**
 * imagingPrintTemplate.ts — Шаблон и окно печати протокола рентгенодиагностики
 * Mandate 8b: строго <= 120 строк.
 */

import { showToast } from "../../GlobalToast.js";

export interface PrintStudyParams {
	imageUrl: string;
	studyTitle?: string | null | undefined;
	toothCode?: string | null | undefined;
	patientName?: string | null | undefined;
	doctorName?: string | null | undefined;
	measurementsCount?: number | undefined;
	filterStyle?: string | undefined;
	rotationDeg?: number | undefined;
}

export function printStudyForPatient(params: PrintStudyParams): void {
	if (typeof window === "undefined" || !params.imageUrl) return;

	const printWindow = window.open("", "_blank", "width=800,height=900");
	if (!printWindow) {
		showToast("Всплывающее окно заблокировано браузером", "error");
		return;
	}

	const dateStr = new Date().toLocaleDateString("ru-RU", {
		day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
	});
	const toothText = params.toothCode ? `Зуб #${params.toothCode}` : "Рентген-диагностика";
	const titleText = params.studyTitle || "Прицельный снимок RVG";
	const patientText = params.patientName || "Пациент";

	const html = `<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8">
<title>Рентген-снимок — ${patientText}</title>
<style>
  @page { size: A4 portrait; margin: 15mm; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; background: #ffffff; margin: 0; padding: 0; }
  .header { border-bottom: 2px solid #0d9488; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-end; }
  .clinic-title { font-size: 18px; font-weight: 800; color: #0f766e; }
  .clinic-sub { font-size: 11px; color: #64748b; margin-top: 2px; }
  .study-meta { font-size: 12px; text-align: right; color: #334155; }
  .patient-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 14px; margin-bottom: 20px; display: flex; justify-content: space-between; font-size: 13px; }
  .image-wrapper { text-align: center; background: #000000; border-radius: 8px; padding: 12px; margin-bottom: 24px; }
  .xray-img { max-width: 100%; max-height: 480px; object-fit: contain; border-radius: 4px; }
  .footer { border-top: 1px solid #e2e8f0; padding-top: 14px; display: flex; justify-content: space-between; font-size: 12px; color: #64748b; }
  .signature-line { border-bottom: 1px dashed #94a3b8; width: 180px; display: inline-block; margin-left: 8px; }
  @media print { .no-print { display: none; } }
</style></head><body>
  <div class="header">
    <div><div class="clinic-title">СТОМАТОЛОГИЧЕСКАЯ КЛИНИКА</div><div class="clinic-sub">Протокол лучевой и визиографической диагностики</div></div>
    <div class="study-meta"><div><strong>Дата:</strong> ${dateStr}</div><div><strong>Исследование:</strong> ${titleText}</div></div>
  </div>
  <div class="patient-card"><div><strong>Пациент:</strong> ${patientText}</div><div><strong>Область:</strong> <span style="color:#0f766e;font-weight:bold;">${toothText}</span></div></div>
  <div class="image-wrapper"><img src="${params.imageUrl}" class="xray-img" alt="Рентген-снимок"></div>
  <div class="footer"><div>Медицинская карта приёма амбулаторного стоматологического пациента</div><div>Врач: <span class="signature-line"></span></div></div>
  <script>window.onload = function() { setTimeout(function() { window.print(); }, 300); };</script>
</body></html>`;

	printWindow.document.open();
	printWindow.document.write(html);
	printWindow.document.close();
	showToast("Подготовка листа печати...", "info");
}
