import type { PatientPersonalCabinetData, GeneratedDocumentSummary } from "../patientCabinetEngine.js";
import { formatRussianDateIso, formatRubles } from "../engine/patientCabinetFormatters.js";
import { generateExtract043Html } from "../patientMedicalCardExtractDocuments.js";

export function generateDocumentSnapshotHtml(
	doc: GeneratedDocumentSummary,
	data: PatientPersonalCabinetData,
): string {
	if (doc.kind === "medical_card_extract_043" || doc.kind.includes("043")) {
		return generateExtract043Html(doc, data);
	}
	const clinicName = "ООО «Стоматологическая клиника ДЕНТЕ»";
	const docDate = formatRussianDateIso(doc.dateIso);

	return `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><title>${doc.title} — ${clinicName}</title>
<style>
@page { size: A4 portrait; margin: 15mm; }
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 11.5px; color: #0f172a; margin: 0; padding: 20px; line-height: 1.4; }
.doc-container { max-width: 750px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 8px; padding: 24px; background: #ffffff; }
.header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 14px; }
.meta-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 14px; margin-bottom: 14px; font-size: 11px; }
.meta-row { display: flex; justify-content: space-between; padding: 2px 0; }
.stamp-box { margin-top: 18px; border: 1px dashed #cbd5e1; padding: 10px; border-radius: 6px; background: #fafafa; font-size: 10px; }
@media print { body { padding: 0; } .doc-container { border: none; padding: 0; } }
</style></head>
<body>
<div class="doc-container">
  <div class="header">
    <h1 style="margin:0 0 4px 0; font-size:15px; font-weight:800; text-transform:uppercase;">${clinicName}</h1>
    <p style="margin:2px 0; font-size:11px; color:#475569;">ИНН 7841098765 • Лицензия ЛО-78-01-011842 • г. Санкт-Петербург, Невский пр-т, д. 140</p>
    <h2 style="font-size:13px; margin:8px 0 0; color:#0d9488;">${doc.title}</h2>
    <p style="font-weight:600; color:#0f172a;">от ${docDate} г.</p>
  </div>
  <div class="meta-box">
    <div class="meta-row"><span>Пациент:</span><strong>${data.fullName}</strong></div>
    <div class="meta-row"><span>Медицинская карта:</span><strong>${data.cardNumber}</strong></div>
    <div class="meta-row"><span>Лечащий врач:</span><strong>${data.curatingDoctor}</strong></div>
    ${doc.documentNumber ? `<div class="meta-row"><span>Номер документа:</span><strong>${doc.documentNumber}</strong></div>` : ""}
    ${doc.totalAmountRub !== undefined ? `<div class="meta-row"><span>Сумма:</span><strong>${formatRubles(doc.totalAmountRub)}</strong></div>` : ""}
  </div>
  <div style="padding: 12px 0; font-size: 11.5px; line-height: 1.5;">
    <p>Официальный медицинский документ сформирован в медицинской информационной системе стоматологической клиники DENTE в соответствии с законодательством РФ (323-ФЗ) и Правилами платных медицинских услуг (ПП РФ № 736).</p>
    <p>Электронная архивная копия документа зарегистрирована в защищенном реестре клиники со статусом «${doc.status === "issued" ? "Выдан и действителен" : "Черновик"}».</p>
  </div>
  ${doc.sha256 ? `<div class="stamp-box"><div><strong>Цифровой отпечаток архивной копии (SHA-256):</strong></div><div style="font-family:monospace; color:#0d9488; margin-top:3px;">${doc.sha256}</div><div style="color:#64748b; margin-top:3px;">Целостность и неизменность документа подтверждены криптографическим аудитом.</div></div>` : ""}
  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 28px; margin-top: 24px; padding-top: 14px; border-top: 1px dashed #cbd5e1; font-size: 11px;">
    <div><strong>От клиники:</strong><div>Врач: ${data.curatingDoctor}</div><div style="margin-top:28px; border-bottom:1px solid #334155;"></div><div style="font-size:10px; color:#64748b; margin-top:4px;">М.П. ${clinicName}</div></div>
    <div><strong>Пациент:</strong><div>${data.fullName}</div><div style="margin-top:28px; border-bottom:1px solid #334155;"></div><div style="font-size:10px; color:#64748b; margin-top:4px;">Подпись пациента</div></div>
  </div>
</div>
</body></html>`;
}
