/**
 * VisiographPrintTemplate.ts
 * Generates an A4 portrait clinical HTML print template for radiovisiography protocols.
 */

export interface VisiographPrintHtmlOptions {
	patientFullName: string;
	patientId?: string | null | undefined;
	toothCode?: string | null | undefined;
	doctorName: string;
	scaleMmPerPixel: number;
	imageUri: string;
	measurementsRows: string;
	clinicName: string;
}

export function generateVisiographPrintHtml({
	patientFullName,
	patientId,
	toothCode,
	doctorName,
	scaleMmPerPixel,
	imageUri,
	measurementsRows,
	clinicName,
}: VisiographPrintHtmlOptions): string {
	return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Протокол рентгенограммы — ${patientFullName}</title>
<style>
  @page { size: A4 portrait; margin: 12mm; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #111; margin: 0; padding: 0; font-size: 10pt; line-height: 1.35; }
  .clinic-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #14b8a6; padding-bottom: 8px; margin-bottom: 10px; }
  .clinic-title { font-size: 13pt; font-weight: 800; text-transform: uppercase; color: #0f172a; }
  .clinic-sub { font-size: 8.5pt; color: #64748b; }
  .protocol-badge { text-align: right; font-weight: 800; font-size: 11pt; color: #0d9488; }
  .patient-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; margin-bottom: 12px; font-size: 9pt; }
  .image-wrapper { text-align: center; margin: 10px 0; }
  .image-wrapper img { max-width: 100%; max-height: 140mm; border: 1px solid #cbd5e1; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
  .table-title { font-weight: 700; font-size: 9.5pt; margin: 10px 0 4px 0; color: #0f172a; }
  table { width: 100%; border-collapse: collapse; font-size: 8.5pt; margin-bottom: 12px; }
  th, td { border: 1px solid #cbd5e1; padding: 4px 8px; text-align: left; }
  th { background: #f1f5f9; font-weight: 700; color: #334155; }
  .stamp-footer { margin-top: 16px; display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid #e2e8f0; padding-top: 10px; font-size: 8.5pt; color: #475569; }
  .stamp-box { width: 70px; height: 70px; border: 1px dashed #94a3b8; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 8pt; font-weight: 700; color: #64748b; }
</style>
</head>
<body>
  <div class="clinic-header">
    <div>
      <div class="clinic-title">${clinicName}</div>
      <div class="clinic-sub">Лицензия № ЛО-77-01-018942 · Рентген-кабинет радиовизиографии</div>
    </div>
    <div class="protocol-badge">
      ПРОТОКОЛ РВГ<br>
      <span style="font-size: 8.5pt; font-weight: normal; color: #64748b;">${new Date().toLocaleDateString("ru-RU")}</span>
    </div>
  </div>
  <div class="patient-grid">
    <div><strong>Пациент:</strong> ${patientFullName} (ID: ${patientId || "pat_001"})</div>
    <div><strong>Зуб (FDI):</strong> ${toothCode ? `Зуб ${toothCode}` : "Прицельный снимок"}</div>
    <div><strong>Врач:</strong> ${doctorName}</div>
    <div><strong>Калибровка:</strong> 1 px = ${scaleMmPerPixel.toFixed(4)} мм</div>
  </div>
  <div class="image-wrapper">
    <img src="${imageUri}" alt="Радиовизиограмма" />
  </div>
  ${measurementsRows.length > 0 ? `
  <div class="table-title">Клинические измерения и периапикальные очаги:</div>
  <table>
    <thead><tr><th>Параметр / Метка</th><th>Значение</th><th>Примечание</th></tr></thead>
    <tbody>${measurementsRows}</tbody>
  </table>` : ""}
  <div class="stamp-footer">
    <div>
      <div>Заключение: Рентгенологический контроль завершен. Данные внесены в медицинскую карту пациента.</div>
      <div style="margin-top: 6px;">Врач: ${doctorName} ___________________ / Подпись</div>
    </div>
    <div class="stamp-box">М.П.</div>
  </div>
</body>
</html>`;
}
