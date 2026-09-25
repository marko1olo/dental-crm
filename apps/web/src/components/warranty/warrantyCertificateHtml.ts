/**
 * ============================================================================
 * WARRANTY CERTIFICATE & REMEDIATION ACT PRINTABLE HTML GENERATORS (A4 / A5)
 * Генерация официального бланка гарантийного паспорта и акта устранения дефекта
 * ============================================================================
 */

import {
	getWarrantyDefectTemplate,
	getWarrantyPreset,
	MANDATORY_WARRANTY_CONDITIONS,
} from "./warrantyPresets.js";
import {
	addMonthsToDate,
	formatRussianDate,
	formatShortDate,
	generateSha256,
	type WarrantyCertificateData,
	type WarrantyRemediationOrder,
} from "./warrantyEngine.js";

/**
 * ============================================================================
 * ГЕНЕРАТОР ОФИЦИАЛЬНОГО ГАРАНТИЙНОГО ПАСПОРТА И СЕРТИФИКАТА (A4 / A5)
 * ============================================================================
 */
export function generateWarrantyCertificateHtml(data: WarrantyCertificateData): string {
	const { patient, doctor, clinic, items, calculation, certificateId, issueDate, qrCodeSvg, integrityHash } = data;

	const itemsRows = items
		.map((item, idx) => {
			const preset = getWarrantyPreset(item.category);
			const warrantyMonths = item.customWarrantyMonths ?? calculation.adjustedWarrantyMonths;
			const serviceLifeMonths = item.customServiceLifeMonths ?? calculation.adjustedServiceLifeMonths;
			const expDate = addMonthsToDate(issueDate, warrantyMonths);
			const code804n = item.serviceCode804n || preset.serviceCode804n;

			return `
      <tr class="item-row">
        <td class="col-num">${idx + 1}</td>
        <td class="col-tooth"><strong>${item.toothNumber}</strong></td>
        <td class="col-work">
          <div class="work-title">${item.clinicalWorkTitle}</div>
          <div class="work-cat">${preset.shortTitle} • Код 804н: <code>${code804n}</code></div>
        </td>
        <td class="col-material">
          <div class="mat-name">${item.materialName}</div>
          <div class="mat-meta">${item.manufacturer} (${item.country})${item.vitaShade ? ` • Оттенок VITA: ${item.vitaShade}` : ""}${item.labOrderNumber ? ` • Наряд ЗТЛ: <code>${item.labOrderNumber}</code>` : ""}</div>
          ${item.lotNumber ? `<div class="mat-lot">LOT / UDI: <code>${item.lotNumber}</code></div>` : ""}
        </td>
        <td class="col-warranty">
          <div class="war-period">${warrantyMonths} мес.</div>
          <div class="war-date">до ${formatShortDate(expDate)}</div>
        </td>
        <td class="col-life">${serviceLifeMonths} мес.</td>
      </tr>
    `;
		})
		.join("\n");

	const conditionsList = MANDATORY_WARRANTY_CONDITIONS.map((cond) => {
		return `
      <li class="condition-item">
        <div class="cond-head">
          <span class="cond-num">${cond.number}.</span>
          <strong class="cond-title">${cond.title}</strong>
        </div>
        <div class="cond-desc">${cond.description}</div>
      </li>
    `;
	}).join("\n");

	const checkupRows = calculation.checkupSchedule
		.slice(0, 6)
		.map((chk) => {
			return `
      <div class="checkup-pill">
        <span class="chk-num">Визит #${chk.index}</span>
        <strong class="chk-date">${chk.formattedDate}</strong>
        <span class="chk-status">Обязательный</span>
      </div>
    `;
		})
		.join("\n");

	const riskMultiplierPercent = Math.round(calculation.totalRiskMultiplier * 100);

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>Гарантийный паспорт — ${certificateId} — ${patient.fullName}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 15mm 12mm 15mm;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 11pt;
      line-height: 1.45;
      color: #0f172a;
      background: #ffffff;
      padding: 10px;
    }
    .cert-container {
      max-width: 800px;
      margin: 0 auto;
      border: 2px solid #0f766e;
      border-radius: 8px;
      padding: 24px 28px;
      position: relative;
      background: #ffffff;
    }
    .cert-watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-30deg);
      font-size: 80pt;
      font-weight: 900;
      color: rgba(15, 118, 110, 0.03);
      text-transform: uppercase;
      letter-spacing: 12px;
      pointer-events: none;
      user-select: none;
      z-index: 0;
      white-space: nowrap;
    }
    .cert-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0f766e;
      padding-bottom: 16px;
      margin-bottom: 18px;
      position: relative;
      z-index: 1;
    }
    .clinic-logo-block {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .clinic-emblem {
      width: 48px;
      height: 48px;
      background: #0f766e;
      color: #ffffff;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22pt;
      font-weight: bold;
    }
    .clinic-info h1 {
      font-size: 15pt;
      font-weight: 800;
      color: #0f766e;
      letter-spacing: -0.5px;
    }
    .clinic-info .legal {
      font-size: 8.5pt;
      color: #475569;
    }
    .cert-title-badge {
      text-align: right;
    }
    .cert-number {
      font-size: 11pt;
      font-weight: 800;
      color: #0f766e;
      background: #f0fdfa;
      border: 1px solid #ccfbf1;
      padding: 4px 10px;
      border-radius: 6px;
      display: inline-block;
      margin-bottom: 4px;
    }
    .cert-issue-date {
      font-size: 8.5pt;
      color: #64748b;
    }
    .cert-main-title {
      text-align: center;
      margin: 14px 0 18px 0;
      position: relative;
      z-index: 1;
    }
    .cert-main-title h2 {
      font-size: 16pt;
      font-weight: 900;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }
    .cert-main-title p {
      font-size: 9pt;
      color: #64748b;
      margin-top: 2px;
    }
    .patient-card-strip {
      display: grid;
      grid-template-columns: 2fr 1fr 1fr;
      gap: 12px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px 14px;
      margin-bottom: 18px;
      font-size: 9.5pt;
      position: relative;
      z-index: 1;
    }
    .patient-card-strip .label {
      font-size: 8pt;
      text-transform: uppercase;
      color: #64748b;
      font-weight: 700;
      margin-bottom: 2px;
    }
    .patient-card-strip .val {
      font-weight: 700;
      color: #0f172a;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 18px;
      font-size: 9pt;
      position: relative;
      z-index: 1;
    }
    .items-table th {
      background: #0f766e;
      color: #ffffff;
      font-weight: 700;
      text-align: left;
      padding: 8px 10px;
      font-size: 8.5pt;
    }
    .items-table td {
      padding: 8px 10px;
      border-bottom: 1px solid #e2e8f0;
      vertical-align: top;
    }
    .items-table tr:nth-child(even) {
      background: #f8fafc;
    }
    .col-num { width: 4%; text-align: center; color: #64748b; }
    .col-tooth { width: 10%; font-size: 11pt; color: #0f766e; }
    .col-work { width: 28%; }
    .work-title { font-weight: 700; color: #0f172a; }
    .work-cat { font-size: 8pt; color: #64748b; }
    .col-material { width: 34%; }
    .mat-name { font-weight: 600; }
    .mat-meta { font-size: 8pt; color: #475569; }
    .mat-lot { font-size: 7.5pt; color: #0f766e; margin-top: 2px; }
    .col-warranty { width: 14%; text-align: right; }
    .war-period { font-weight: 800; color: #0f766e; font-size: 10pt; }
    .war-date { font-size: 7.5pt; color: #64748b; }
    .col-life { width: 10%; text-align: right; font-weight: 600; color: #475569; }

    .risk-summary-box {
      background: #f0fdfa;
      border-left: 4px solid #0f766e;
      padding: 10px 14px;
      border-radius: 0 6px 6px 0;
      margin-bottom: 16px;
      font-size: 8.5pt;
      position: relative;
      z-index: 1;
    }
    .risk-summary-box .title {
      font-weight: 800;
      color: #0f766e;
      margin-bottom: 4px;
      display: flex;
      justify-content: space-between;
    }

    .checkups-section {
      margin-bottom: 18px;
      position: relative;
      z-index: 1;
    }
    .checkups-section h4 {
      font-size: 9.5pt;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .checkup-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }
    .checkup-pill {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 6px 10px;
      font-size: 8pt;
      display: flex;
      flex-direction: column;
    }
    .chk-num { color: #64748b; font-size: 7.5pt; }
    .chk-date { color: #0f766e; font-size: 9.5pt; }
    .chk-status { color: #475569; font-size: 7pt; text-transform: uppercase; }

    .conditions-section {
      margin-bottom: 20px;
      position: relative;
      z-index: 1;
    }
    .conditions-section h4 {
      font-size: 9.5pt;
      font-weight: 800;
      color: #0f172a;
      margin-bottom: 6px;
      text-transform: uppercase;
    }
    .conditions-list {
      list-style: none;
      font-size: 8pt;
      color: #334155;
    }
    .condition-item {
      margin-bottom: 6px;
      padding-left: 4px;
    }
    .cond-head { font-weight: 700; color: #0f172a; }
    .cond-desc { color: #475569; margin-top: 1px; }

    .signatures-block {
      display: grid;
      grid-template-columns: 1fr 1fr 160px;
      gap: 16px;
      align-items: flex-end;
      border-top: 1px solid #cbd5e1;
      padding-top: 16px;
      margin-top: 20px;
      position: relative;
      z-index: 1;
    }
    .sign-col .sign-title {
      font-size: 8pt;
      font-weight: 700;
      color: #64748b;
      margin-bottom: 24px;
    }
    .sign-line {
      border-bottom: 1px dashed #475569;
      margin-bottom: 4px;
    }
    .sign-name {
      font-size: 8.5pt;
      color: #0f172a;
      font-weight: 600;
    }
    .qr-col {
      text-align: center;
    }
    .qr-col svg {
      width: 90px;
      height: 90px;
      margin: 0 auto;
    }
    .qr-note {
      font-size: 6.5pt;
      color: #64748b;
      margin-top: 4px;
    }
    .hash-footer {
      margin-top: 14px;
      text-align: center;
      font-family: monospace;
      font-size: 6.5pt;
      color: #94a3b8;
    }
  </style>
</head>
<body>
  <div class="cert-container">
    <div class="cert-watermark">ГАРАНТИЯ DENTE</div>

    <div class="cert-header">
      <div class="clinic-logo-block">
        <div class="clinic-emblem">D</div>
        <div class="clinic-info">
          <h1>${clinic.name}</h1>
          <div class="legal">${clinic.legalName} • Лицензия: ${clinic.licenseNumber}</div>
          <div class="legal">${clinic.address} • Тел: ${clinic.phone}</div>
        </div>
      </div>
      <div class="cert-title-badge">
        <div class="cert-number">${certificateId}</div>
        <div class="cert-issue-date">Дата выдачи: ${formatRussianDate(issueDate)}</div>
      </div>
    </div>

    <div class="cert-main-title">
      <h2>Гарантийный паспорт стоматологического лечения</h2>
      <p>Официальный сертификат качества и условий сохранения гарантийных обязательств (Закон РФ № 2300-1)</p>
    </div>

    <div class="patient-card-strip">
      <div>
        <div class="label">Пациент (Ф.И.О.)</div>
        <div class="val">${patient.fullName}</div>
      </div>
      <div>
        <div class="label">Медицинская карта</div>
        <div class="val">№ ${patient.cardNumber} (Форма 043/у)</div>
      </div>
      <div>
        <div class="label">Лечащий врач</div>
        <div class="val">${doctor.fullName}</div>
      </div>
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Зуб</th>
          <th>Вид работы</th>
          <th>Материал, производитель & LOT</th>
          <th>Гарантия</th>
          <th>Срок сл.</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows}
      </tbody>
    </table>

    <div class="risk-summary-box">
      <div class="title">
        <span>Индивидуальный клинический профиль надежности</span>
        <span>Статус: ${calculation.warrantyStatus === "full" ? "Полная гарантия" : calculation.warrantyStatus === "reduced" ? "Скорректированная гарантия" : "Условная гарантия"} (${riskMultiplierPercent}%)</span>
      </div>
      <div>
        Базовый гарантийный срок скорректирован с учетом индекса гигиены (OHI-S), анатомической окклюзии и соматических факторов. Следующий обязательный контрольный осмотр назначен на <strong>${formatRussianDate(calculation.nextCheckupDueDate)}</strong>.
      </div>
    </div>

    <div class="checkups-section">
      <h4>График обязательных диспансерных осмотров и профгигиены:</h4>
      <div class="checkup-grid">
        ${checkupRows}
      </div>
    </div>

    <div class="conditions-section">
      <h4>Ключевые условия сохранения гарантийных обязательств клиники:</h4>
      <ul class="conditions-list">
        ${conditionsList.slice(0, 5)}
      </ul>
    </div>

    ${
			data.remediations && data.remediations.length > 0
				? `
    <div class="remediations-section" style="margin-bottom: 18px; position: relative; z-index: 1;">
      <h4 style="font-size: 9.5pt; font-weight: 800; color: #0f172a; margin-bottom: 6px; text-transform: uppercase;">
        Гарантийные рекламации и устранение дефектов (0 ₽):
      </h4>
      <table class="items-table" style="margin-bottom: 8px;">
        <thead>
          <tr>
            <th style="width: 15%;">Акт №</th>
            <th style="width: 12%;">Дата</th>
            <th style="width: 8%;">Зуб</th>
            <th style="width: 35%;">Характер дефекта & манипуляция</th>
            <th style="width: 18%;">Списание со склада</th>
            <th style="width: 12%; text-align: right;">К оплате</th>
          </tr>
        </thead>
        <tbody>
          ${data.remediations
						.map(
							(r) => `
            <tr>
              <td><strong>${r.orderNumber}</strong></td>
              <td>${formatShortDate(r.performedAtIso.slice(0, 10))}</td>
              <td style="color: #0f766e; font-weight: 800;">${r.toothNumber}</td>
              <td>
                <div style="font-weight: 700; color: #0f172a;">${r.defectTitle}</div>
                <div style="font-size: 8pt; color: #475569;">${r.remediationAction}</div>
              </td>
              <td style="font-size: 8pt; color: #475569;">
                ${r.materialsDeducted.map((m) => `${m.name} (${m.quantity} ${m.unit})`).join(", ")}
              </td>
              <td style="text-align: right; font-weight: 800; color: #059669;">0 ₽ (100%)</td>
            </tr>
          `,
						)
						.join("")}
        </tbody>
      </table>
    </div>
    `
				: ""
		}

    <div class="signatures-block">
      <div class="sign-col">
        <div class="sign-title">Лечащий врач-стоматолог:</div>
        <div class="sign-line"></div>
        <div class="sign-name">${doctor.fullName}</div>
      </div>
      <div class="sign-col">
        <div class="sign-title">Пациент (с условиями ознакомлен):</div>
        <div class="sign-line"></div>
        <div class="sign-name">${patient.fullName}</div>
      </div>
      <div class="qr-col">
        ${qrCodeSvg}
        <div class="qr-note">Проверка статуса гарантии на портале пациента</div>
      </div>
    </div>

    <div class="hash-footer">
      ЭЦП / Контрольный криптографический хеш документа: ${integrityHash}
    </div>
  </div>
</body>
</html>`;
}

/**
 * Генерация печатного Акта гарантийного устранения дефекта (0 ₽ / А4)
 */
export function generateWarrantyRemediationActHtml(order: WarrantyRemediationOrder): string {
	const materialsList = order.materialsDeducted
		.map(
			(mat, i) => `
      <tr>
        <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: center;">${i + 1}</td>
        <td style="padding: 6px 8px; border: 1px solid #cbd5e1; font-weight: 600;">${mat.name}</td>
        <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: center;">${mat.quantity} ${mat.unit}</td>
        <td style="padding: 6px 8px; border: 1px solid #cbd5e1; text-align: center; color: #0f766e; font-weight: 700;">Списано со склада</td>
      </tr>
    `,
		)
		.join("\n");

	const template = getWarrantyDefectTemplate(order.defectType);

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>Акт гарантийного устранения дефекта — ${order.orderNumber}</title>
  <style>
    @page { size: A4 portrait; margin: 15mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      font-size: 10.5pt;
      color: #0f172a;
      background: #ffffff;
      padding: 15px;
    }
    .act-container {
      max-width: 760px;
      margin: 0 auto;
      border: 2px solid #0f766e;
      border-radius: 8px;
      padding: 24px;
    }
    .act-header {
      display: flex;
      justify-content: space-between;
      border-bottom: 2px solid #0f766e;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .act-title {
      font-size: 14pt;
      font-weight: 900;
      color: #0f766e;
      text-transform: uppercase;
    }
    .act-meta {
      font-size: 9pt;
      color: #475569;
      margin-top: 4px;
    }
    .act-badge {
      font-size: 11pt;
      font-weight: 800;
      color: #0f766e;
      background: #f0fdfa;
      border: 1px solid #ccfbf1;
      padding: 4px 10px;
      border-radius: 6px;
      text-align: right;
    }
    .act-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px 14px;
      margin-bottom: 16px;
      font-size: 9.5pt;
    }
    .act-grid .field { margin-bottom: 4px; }
    .act-grid .lbl { font-size: 8pt; text-transform: uppercase; color: #64748b; font-weight: 700; }
    .act-grid .val { font-weight: 700; color: #0f172a; }
    .section-title {
      font-size: 10pt;
      font-weight: 800;
      color: #0f172a;
      text-transform: uppercase;
      margin: 14px 0 6px 0;
    }
    .box {
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 10px 12px;
      font-size: 9.5pt;
      margin-bottom: 12px;
    }
    .table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9pt;
      margin-bottom: 16px;
    }
    .table th {
      background: #0f766e;
      color: #ffffff;
      padding: 6px 8px;
      text-align: left;
    }
    .zero-pay-box {
      background: #ecfdf5;
      border: 2px solid #059669;
      border-radius: 6px;
      padding: 12px 16px;
      margin: 16px 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .zero-pay-title { font-size: 11pt; font-weight: 800; color: #065f46; }
    .zero-pay-val { font-size: 18pt; font-weight: 900; color: #059669; }
    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-top: 24px;
      padding-top: 16px;
      border-top: 1px solid #cbd5e1;
    }
    .sign-line { border-bottom: 1px dashed #475569; margin: 24px 0 4px 0; }
  </style>
</head>
<body>
  <div class="act-container">
    <div class="act-header">
      <div>
        <div class="act-title">Акт гарантийного устранения дефекта</div>
        <div class="act-meta">${order.clinicName} • Закон РФ № 2300-1 «О защите прав потребителей» (ст. 29)</div>
      </div>
      <div>
        <div class="act-badge">${order.orderNumber}</div>
        <div class="act-meta" style="text-align: right;">${formatRussianDate(order.performedAtIso.slice(0, 10))}</div>
      </div>
    </div>

    <div class="act-grid">
      <div>
        <div class="field">
          <div class="lbl">Пациент:</div>
          <div class="val">${order.patientFullName} (карта № ${order.patientCardNumber})</div>
        </div>
        <div class="field">
          <div class="lbl">Лечащий врач:</div>
          <div class="val">${order.doctorName}</div>
        </div>
      </div>
      <div>
        <div class="field">
          <div class="lbl">Гарантийный сертификат:</div>
          <div class="val">№ ${order.certificateId}</div>
        </div>
        <div class="field">
          <div class="lbl">Зуб / Локализация:</div>
          <div class="val" style="color: #0f766e; font-size: 11pt;">Зуб № ${order.toothNumber}</div>
        </div>
      </div>
    </div>

    <div class="section-title">1. Клинический характер дефекта:</div>
    <div class="box">
      <strong>${order.defectTitle}</strong> (${template.statutoryBasis})<br/>
      <span style="color: #475569;">${order.clinicalFinding}</span>
    </div>

    <div class="section-title">2. Выполненные гарантийные манипуляции:</div>
    <div class="box">
      <strong>${order.remediationAction}</strong>
      ${order.doctorNotes ? `<div style="margin-top: 6px; font-size: 9pt; color: #64748b;">Примечание врача: ${order.doctorNotes}</div>` : ""}
    </div>

    <div class="section-title">3. Списание стоматологических материалов со склада:</div>
    <table class="table">
      <thead>
        <tr>
          <th style="width: 6%; text-align: center;">#</th>
          <th>Наименование материала / препарата</th>
          <th style="width: 20%; text-align: center;">Количество</th>
          <th style="width: 25%; text-align: center;">Статус списания</th>
        </tr>
      </thead>
      <tbody>
        ${materialsList}
      </tbody>
    </table>

    <div class="zero-pay-box">
      <div>
        <div class="zero-pay-title">Стоимость устранения дефекта для пациента:</div>
        <div style="font-size: 8.5pt; color: #047857;">Гарантия клиники 100% • Безвозмездное устранение дефекта (ст. 29 Закона РФ № 2300-1)</div>
      </div>
      <div class="zero-pay-val">0 ₽</div>
    </div>

    <div class="signatures">
      <div>
        <div style="font-size: 8.5pt; font-weight: 700; color: #64748b;">Лечащий врач-стоматолог:</div>
        <div class="sign-line"></div>
        <div style="font-size: 9pt; font-weight: 700;">${order.doctorName}</div>
      </div>
      <div>
        <div style="font-size: 8.5pt; font-weight: 700; color: #64748b;">Пациент (претензий к качеству не имею):</div>
        <div class="sign-line"></div>
        <div style="font-size: 9pt; font-weight: 700;">${order.patientFullName}</div>
      </div>
    </div>

    <div style="margin-top: 16px; text-align: center; font-family: monospace; font-size: 6.5pt; color: #94a3b8;">
      ЭЦП / Контрольный криптографический хеш акта: ${order.integrityHash || generateSha256(order.orderNumber)}
    </div>
  </div>
</body>
</html>`;
}
