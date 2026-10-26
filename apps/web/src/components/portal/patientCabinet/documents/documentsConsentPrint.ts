import type { PatientPersonalCabinetData, PatientStatutoryConsent } from "../patientCabinetEngine.js";
import { formatRussianDateIso } from "../engine/patientCabinetFormatters.js";

export function generateConsentPrintHtml(
	consent: PatientStatutoryConsent,
	data: PatientPersonalCabinetData,
): string {
	const clinicName = "ООО «Стоматологическая клиника ДЕНТЕ»";
	const isSigned = consent.status === "signed";
	const signedDate = consent.signedAtIso
		? formatRussianDateIso(consent.signedAtIso.slice(0, 10))
		: formatRussianDateIso(new Date().toISOString().slice(0, 10));

	const paragraphs = (consent.fullTextContent || consent.summaryTextRu || "")
		.split("\n\n")
		.filter((p) => p.trim().length > 0)
		.map((p) => `<p style="margin-bottom: 8px; text-align: justify;">${p.replace(/\n/g, "<br/>")}</p>`)
		.join("");

	const pepStampHtml = isSigned && consent.signatureAudit
		? `<div style="margin-top: 20px; border: 2px solid #0d9488; border-radius: 8px; padding: 12px 16px; background: #f0fdfa; font-size: 11px;">
      <div style="font-weight: 800; color: #0f766e; font-size: 11.5px; margin-bottom: 4px; text-transform: uppercase;">
        ДОКУМЕНТ ПОДПИСАН ПРОСТОЙ ЭЛЕКТРОННОЙ ПОДПИСЬЮ (63-ФЗ)
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px; color: #134e4a;">
        <div><strong>Владелец подписи:</strong> ${data.fullName}</div>
        <div><strong>Телефон верификации:</strong> ${consent.signatureAudit.phone}</div>
        <div><strong>Способ подписания:</strong> SMS/OTP код подтверждения</div>
        <div><strong>Дата и время:</strong> ${new Date(consent.signatureAudit.timestamp).toLocaleString("ru-RU")}</div>
      </div>
      <div style="margin-top: 6px; padding-top: 4px; border-top: 1px dashed #5eead4; font-family: monospace; font-size: 9.5px; color: #0f766e; word-break: break-all;">
        <strong>Хеш целостности SHA-256:</strong> ${consent.signatureAudit.integrityHash}
      </div>
    </div>`
		: `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 28px; margin-top: 28px; padding-top: 14px; border-top: 1px dashed #cbd5e1; font-size: 11px;">
      <div><strong>Пациент:</strong><div>${data.fullName}</div><div style="margin-top: 28px; border-bottom: 1px solid #334155;"></div><div style="font-size: 10px; color: #64748b; margin-top: 4px;">(Подпись)</div></div>
      <div><strong>Врач:</strong><div>${data.curatingDoctor}</div><div style="margin-top: 28px; border-bottom: 1px solid #334155;"></div><div style="font-size: 10px; color: #64748b; margin-top: 4px;">(Подпись / М.П.)</div></div>
    </div>`;

	return `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><title>${consent.titleRu}</title>
<style>
@page { size: A4 portrait; margin: 15mm; }
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 11.5px; color: #0f172a; margin: 0; padding: 20px; line-height: 1.4; }
.consent-container { max-width: 750px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 8px; padding: 24px; background: #ffffff; }
.header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 14px; }
.meta-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 14px; margin-bottom: 14px; font-size: 11px; }
.meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px; }
@media print { body { padding: 0; } .consent-container { border: none; padding: 0; } }
</style></head>
<body>
<div class="consent-container">
  <div class="header">
    <h1 style="margin:0 0 4px 0; font-size:15px; font-weight:800; text-transform:uppercase;">${clinicName}</h1>
    <p style="margin:2px 0; font-size:11px; color:#475569;">ИНН 7841098765 • Лицензия ЛО-78-01-011842 • г. Санкт-Петербург, Невский пр-т, д. 140</p>
    <h2 style="font-size:13px; margin:8px 0 2px; color:#0d9488;">${consent.titleRu}</h2>
    <p style="font-weight:600; color:#475569; font-size:10.5px;">Правовая основа: ${consent.statutoryBasis} • Код: ${consent.code}</p>
  </div>
  <div class="meta-box">
    <div class="meta-grid">
      <div><strong>Пациент:</strong> ${data.fullName}</div>
      <div><strong>Медицинская карта:</strong> ${data.cardNumber}</div>
      <div><strong>Лечащий врач:</strong> ${data.curatingDoctor}</div>
      <div><strong>Дата:</strong> ${signedDate}</div>
    </div>
  </div>
  <div style="margin: 14px 0; font-size: 11px;">${paragraphs}</div>
  ${pepStampHtml}
</div>
</body></html>`;
}
