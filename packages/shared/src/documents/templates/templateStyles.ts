/**
 * Shared print styles and layout builders for official medical and legal document templates.
 */

export const SHARED_DOCUMENT_CSS = `
<style>
  @page {
    size: A4 portrait;
    margin: 15mm 12mm 15mm 12mm;
  }
  body {
    font-family: 'Times New Roman', Times, serif;
    font-size: 11pt;
    line-height: 1.35;
    color: #111;
    margin: 0;
    padding: 0;
    background: #fff;
  }
  .doc-wrapper {
    max-width: 100%;
    margin: 0 auto;
    padding: 10px;
    box-sizing: border-box;
  }
  .doc-header {
    border-bottom: 2px solid #222;
    padding-bottom: 8px;
    margin-bottom: 14px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }
  .doc-header-clinic {
    font-size: 10pt;
    line-height: 1.25;
    color: #333;
  }
  .doc-header-clinic strong {
    font-size: 12pt;
    color: #000;
  }
  .doc-header-meta {
    text-align: right;
    font-size: 9pt;
    color: #555;
  }
  .doc-title {
    text-align: center;
    font-size: 13pt;
    font-weight: bold;
    text-transform: uppercase;
    margin: 14px 0 10px 0;
    letter-spacing: 0.5px;
  }
  .doc-subtitle {
    text-align: center;
    font-size: 10pt;
    font-style: italic;
    color: #444;
    margin-bottom: 14px;
  }
  .doc-section-title {
    font-size: 11pt;
    font-weight: bold;
    margin-top: 12px;
    margin-bottom: 6px;
    border-bottom: 1px solid #ddd;
    padding-bottom: 3px;
  }
  .doc-paragraph {
    margin: 6px 0;
    text-align: justify;
    text-indent: 1.25cm;
  }
  .doc-list {
    margin: 6px 0 6px 1.25cm;
    padding: 0;
  }
  .doc-list li {
    margin-bottom: 4px;
  }
  .doc-table {
    width: 100%;
    border-collapse: collapse;
    margin: 10px 0;
    font-size: 10pt;
  }
  .doc-table th, .doc-table td {
    border: 1px solid #444;
    padding: 5px 8px;
    text-align: left;
    vertical-align: top;
  }
  .doc-table th {
    background-color: #f2f2f2;
    font-weight: bold;
  }
  .doc-signatures {
    margin-top: 24px;
    display: flex;
    justify-content: space-between;
    page-break-inside: avoid;
  }
  .doc-sig-block {
    width: 46%;
    font-size: 10pt;
    line-height: 1.3;
  }
  .doc-sig-line {
    border-bottom: 1px solid #111;
    margin-top: 28px;
    margin-bottom: 4px;
  }
  .doc-sig-caption {
    font-size: 8pt;
    color: #666;
    text-align: center;
  }
  .doc-warning {
    border-left: 3px solid #b91c1c;
    background-color: #fef2f2;
    padding: 6px 10px;
    margin: 8px 0;
    font-size: 10pt;
  }
  @media print {
    body {
      font-size: 10.5pt;
    }
    .no-print {
      display: none !important;
    }
  }
</style>
`;

export function renderDocHeader(submeta?: string): string {
	return `
<div class="doc-header">
  <div class="doc-header-clinic">
    <strong>{{Клиника.Название}}</strong><br/>
    Адрес: {{Клиника.Адрес}}<br/>
    Тел.: {{Клиника.Телефон}} | ИНН: {{Клиника.ИНН}} / КПП: {{Клиника.КПП}}<br/>
    Лицензия № {{Клиника.Лицензия.Номер}} от {{Клиника.Лицензия.ДатаВыдачи}} ({{Клиника.Лицензия.КемВыдана}})
  </div>
  <div class="doc-header-meta">
    ${submeta ? `<span>${submeta}</span><br/>` : ""}
    Дата: {{ТекущаяДата}}<br/>
    Карта № {{Пациент.НомерКарты}}
  </div>
</div>
`;
}

export function renderPatientInfoBlock(): string {
	return `
<div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 8px 12px; margin-bottom: 12px; font-size: 10pt;">
  <div><strong>Пациент:</strong> {{Пациент.ФИО}}, дата рождения: {{Пациент.ДеньРождения}} (возраст: {{Пациент.Возраст}}).</div>
  <div><strong>Документ:</strong> Паспорт РФ серия {{Пациент.Паспорт.Серия}} № {{Пациент.Паспорт.Номер}}, выдан {{Пациент.Паспорт.ДатаВыдачи}} ({{Пациент.Паспорт.КемВыдан}}).</div>
  <div><strong>Адрес регистрации:</strong> {{Пациент.Адрес}} | <strong>Тел.:</strong> {{Пациент.Телефон}}</div>
  <div><strong>Законный представитель (при наличии):</strong> {{Представитель.ФИО}} ({{Представитель.Тип}}), паспорт: серия {{Представитель.Паспорт.Серия}} № {{Представитель.Паспорт.Номер}}. Основание: {{Представитель.НаОсновании}}.</div>
</div>
`;
}

export function renderSignaturesBlock(patientLabel = "Пациент (или законный представитель)", doctorLabel = "Врач"): string {
	return `
<div class="doc-signatures">
  <div class="doc-sig-block">
    <div><strong>${patientLabel}:</strong></div>
    <div>{{Пациент.ФИО}}</div>
    <div class="doc-sig-line"></div>
    <div class="doc-sig-caption">(подпись, расшифровка подписи)</div>
    <div style="margin-top: 6px;">Дата: {{ТекущаяПолнаяДата}}</div>
  </div>
  <div class="doc-sig-block">
    <div><strong>${doctorLabel}:</strong></div>
    <div>{{АктивныйВрач.Должность}} {{АктивныйВрач.ФИО}}</div>
    <div class="doc-sig-line"></div>
    <div class="doc-sig-caption">(подпись врача, личная печать)</div>
    <div style="margin-top: 6px;">Дата: {{ТекущаяПолнаяДата}}</div>
  </div>
</div>
`;
}
