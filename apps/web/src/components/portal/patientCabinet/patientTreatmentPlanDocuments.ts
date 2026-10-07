/**
 * patientTreatmentPlanDocuments.ts — Юридические и печатные документы плана лечения
 * (DOMAIN: PORTAL PATIENT CABINET - TREATMENT PLAN ESTIMATES & PEP 63-FZ)
 *
 * Соответствие:
 * - Мандат 7.5: Полиграфическое качество документов (А4, типографика, реквизиты, печать клиники).
 * - Мандат 8d / 8e: Ноль мультяшных эмодзи, автономия пациента, 0 disabled-блокировок.
 * - Мандат 8b: Строго <= 800 строк.
 * - 63-ФЗ ст. 5 / ст. 6: Простая электронная подпись (ПЭП) с SHA-256 аудитом и оттиском штампа.
 */

import { sha256Hex } from "@dental/shared";
import type {
	ConsentSignatureAudit,
	PatientPersonalCabinetData,
	PatientTreatmentPlan,
} from "./patientCabinetEngine.js";
import { downloadHtmlFile } from "./patientCabinetDocuments.js";
import {
	formatRubles,
	formatRussianDateIso,
} from "./patientCabinetEngine.js";

/**
 * Подписывает план лечения простой электронной подписью (63-ФЗ ПЭП)
 */
export function signTreatmentPlanWithPep(
	plan: PatientTreatmentPlan,
	phone: string,
	smsOtpCode: string,
	patientName: string,
): PatientTreatmentPlan {
	const now = Date.now();
	const signedAtIso = new Date(now).toISOString();
	const rawPayload = `TREATMENT_PLAN:${plan.id}:${plan.planNumber}:${phone}:${smsOtpCode}:${now}`;
	const integrityHash = sha256Hex(rawPayload);

	const signatureAudit: ConsentSignatureAudit = {
		verificationMethod: "sms_otp",
		phone,
		smsOtpCode,
		integrityHash,
		timestamp: now,
		signedAtIso,
		legalBasis: "63-ФЗ ПЭП",
	};

	return {
		...plan,
		approvedByPatient: true,
		approvedAtIso: signedAtIso,
		approvalAudit: signatureAudit,
	};
}

/**
 * Генерирует официальную печатную смету к плану комплексного стоматологического лечения
 * в стандартах полиграфической верстки (А4, реквизиты клиники, детализация 804н, блок ПЭП 63-ФЗ)
 */
export function generateTreatmentPlanEstimateHtml(
	plan: PatientTreatmentPlan,
	data: PatientPersonalCabinetData,
): string {
	const clinicName = "ООО «Стоматологическая клиника ДЕНТЕ»";
	const clinicInn = "7841098765";
	const clinicKpp = "784101001";
	const clinicLicense = "ЛО-78-01-011842 от 15.06.2021";
	const clinicAddress = "г. Санкт-Петербург, Невский пр-т, д. 140, лит. А";
	const clinicPhone = "+7 (812) 345-67-89";

	const createdDateRu = plan.createdAtIso
		? formatRussianDateIso(plan.createdAtIso.slice(0, 10))
		: formatRussianDateIso(new Date().toISOString().slice(0, 10));

	const isApproved = !!plan.approvedByPatient;
	const approvedDateRu = plan.approvedAtIso
		? formatRussianDateIso(plan.approvedAtIso.slice(0, 10))
		: createdDateRu;

	// Таблица этапов плана лечения
	const stagesRowsHtml = plan.stages
		.map((stage, idx) => {
			const proceduresList = stage.procedures.map((p) => `<li>${p}</li>`).join("");
			const teethStr =
				stage.teethFdi && stage.teethFdi.length > 0
					? stage.teethFdi.join(", ")
					: "Все зубы / Полость рта";

			return `
      <tr>
        <td style="text-align: center; vertical-align: top; font-weight: 700;">${stage.orderIndex || idx + 1}</td>
        <td style="vertical-align: top;">
          <strong>${stage.titleRu}</strong>
          <div style="font-size: 11px; color: #475569; margin-top: 2px;">
            Категория: ${stage.categoryRu || "Стоматология"} &bull; Срок: ${stage.targetDateRu || "По плану"}
          </div>
          <ul style="margin: 4px 0 0 16px; padding: 0; font-size: 11px; color: #334155;">
            ${proceduresList}
          </ul>
        </td>
        <td style="text-align: center; vertical-align: top; font-weight: 600; font-family: monospace;">
          ${teethStr}
        </td>
        <td style="text-align: right; vertical-align: top; font-weight: 700; white-space: nowrap;">
          ${formatRubles(stage.costRub)}
        </td>
      </tr>`;
		})
		.join("");

	// Блок оттиска подписи или ПЭП
	const pepStampHtml = isApproved && plan.approvalAudit
		? `
    <div style="margin-top: 24px; border: 2px solid #0d9488; border-radius: 8px; padding: 14px 18px; background: #f0fdfa; font-size: 11px;">
      <div style="font-weight: 800; color: #0f766e; font-size: 12px; margin-bottom: 6px; text-transform: uppercase;">
        СМЕТА И ПЛАН ЛЕЧЕНИЯ СОГЛАСОВАНЫ ПРОСТОЙ ЭЛЕКТРОННОЙ ПОДПИСЬЮ (63-ФЗ)
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; color: #134e4a;">
        <div><strong>Пациент:</strong> ${data.fullName}</div>
        <div><strong>Телефон верификации:</strong> ${plan.approvalAudit.phone}</div>
        <div><strong>Способ согласования:</strong> SMS/OTP код подтверждения (63-ФЗ)</div>
        <div><strong>Дата и время согласования:</strong> ${new Date(plan.approvalAudit.timestamp).toLocaleString("ru-RU")}</div>
      </div>
      <div style="margin-top: 8px; padding-top: 6px; border-top: 1px dashed #5eead4; font-family: monospace; font-size: 10px; color: #0f766e; word-break: break-all;">
        <strong>Хеш целостности SHA-256:</strong> ${plan.approvalAudit.integrityHash}
      </div>
    </div>`
		: `
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-top: 32px; padding-top: 16px; border-top: 1px dashed #cbd5e1; font-size: 11px;">
      <div>
        <strong>Пациент (Заказчик):</strong>
        <div style="margin-top: 4px;">${data.fullName}</div>
        <div style="margin-top: 32px; border-bottom: 1px solid #334155;"></div>
        <div style="font-size: 10px; color: #64748b; margin-top: 4px;">(Подпись пациента / расшифровка)</div>
      </div>
      <div>
        <strong>Куратор плана лечения:</strong>
        <div style="margin-top: 4px;">${plan.curatingDoctor}</div>
        <div style="margin-top: 32px; border-bottom: 1px solid #334155;"></div>
        <div style="font-size: 10px; color: #64748b; margin-top: 4px;">(Подпись врача / М.П. Клиники)</div>
      </div>
    </div>`;

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>Смета к плану лечения № ${plan.planNumber} — ${data.fullName}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm 15mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 12px; color: #0f172a; margin: 0; padding: 20px; line-height: 1.45; }
    .estimate-container { max-width: 780px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 8px; padding: 28px; background: #ffffff; }
    .header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; }
    .header-top { display: flex; justify-content: space-between; align-items: flex-start; }
    .header-clinic h1 { margin: 0 0 4px 0; font-size: 15px; font-weight: 800; text-transform: uppercase; color: #0f172a; }
    .header-clinic p { margin: 2px 0; font-size: 10.5px; color: #475569; }
    .header-doc-title { text-align: right; }
    .header-doc-title h2 { margin: 0 0 4px 0; font-size: 14px; font-weight: 800; color: #0d9488; text-transform: uppercase; }
    .header-doc-title p { margin: 2px 0; font-size: 11px; font-weight: 600; color: #334155; }
    
    .meta-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 14px; margin-bottom: 16px; font-size: 11.5px; }
    .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
    
    table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 11.5px; }
    th { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 8px; text-align: left; font-size: 11px; text-transform: uppercase; }
    td { border: 1px solid #cbd5e1; padding: 8px; }
    
    .all-inclusive-box { background: #f0fdf4; border: 1px solid #86efac; border-radius: 6px; padding: 10px 14px; margin-bottom: 16px; font-size: 11px; color: #166534; }
    .all-inclusive-title { font-weight: 800; margin-bottom: 4px; display: flex; align-items: center; gap: 6px; }
    
    .totals-box { display: flex; justify-content: flex-end; margin-bottom: 16px; }
    .totals-table { width: 340px; border-collapse: collapse; }
    .totals-table td { border: none; padding: 4px 8px; }
    .totals-table .total-row td { border-top: 2px solid #0f172a; font-weight: 800; font-size: 13px; color: #0d9488; }
    
    .legal-notice { font-size: 10.5px; color: #475569; text-align: justify; margin-top: 12px; line-height: 1.4; }
    
    @media print {
      body { padding: 0; }
      .estimate-container { border: none; padding: 0; }
    }
  </style>
</head>
<body>
  <div class="estimate-container">
    <div class="header">
      <div class="header-top">
        <div class="header-clinic">
          <h1>${clinicName}</h1>
          <p>ИНН: ${clinicInn} &bull; КПП: ${clinicKpp} &bull; Лицензия: ${clinicLicense}</p>
          <p>${clinicAddress} &bull; Тел: ${clinicPhone}</p>
        </div>
        <div class="header-doc-title">
          <h2>СМЕТА УСЛУГ</h2>
          <p>к Плану лечения № ${plan.planNumber}</p>
          <p>Дата составления: ${createdDateRu}</p>
        </div>
      </div>
    </div>

    <div class="meta-box">
      <div class="meta-grid">
        <div><strong>Пациент:</strong> ${data.fullName}</div>
        <div><strong>Медицинская карта 043/у:</strong> № ${data.cardNumber}</div>
        <div><strong>Телефон:</strong> ${data.phone}</div>
        <div><strong>Куратор плана лечения:</strong> ${plan.curatingDoctor}</div>
        <div><strong>Наименование плана:</strong> ${plan.titleRu}</div>
        <div><strong>Статус согласования:</strong> ${isApproved ? "Согласован (ПЭП 63-ФЗ)" : "Ожидает согласования"}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width: 32px; text-align: center;">№</th>
          <th>Клинический этап и перечень процедур</th>
          <th style="width: 110px; text-align: center;">Область / Зубы</th>
          <th style="width: 100px; text-align: right;">Стоимость</th>
        </tr>
      </thead>
      <tbody>
        ${stagesRowsHtml}
      </tbody>
    </table>

    <div class="all-inclusive-box">
      <div class="all-inclusive-title">
        СТАНДАРТ ЧЕСТНОЙ ЦЕНЫ DENTE — ВСЁ ВКЛЮЧЕНО
      </div>
      <div>
        Анестезия современным карпульным анестетиком (Septanest/Убистезин), прицельная радиовизиография зубов и изоляция операционного поля системой коффердам (OptiDam) включены в стоимость каждого этапа без дополнительных доплат (0 ₽).
      </div>
    </div>

    <div class="totals-box">
      <table class="totals-table">
        <tr>
          <td>Общая стоимость по плану:</td>
          <td style="text-align: right; font-weight: 600;">${formatRubles(plan.totalCostRub)}</td>
        </tr>
        <tr>
          <td>Оплачено пациентом:</td>
          <td style="text-align: right; font-weight: 600; color: #166534;">${formatRubles(plan.paidCostRub)}</td>
        </tr>
        <tr class="total-row">
          <td>Остаток к оплате:</td>
          <td style="text-align: right;">${plan.remainingDueRub > 0 ? formatRubles(plan.remainingDueRub) : "0 ₽ (Оплачено 100%)"}</td>
        </tr>
      </table>
    </div>

    <div class="legal-notice">
      Смета составлена в соответствии с Федеральным законом № 323-ФЗ «Об основах охраны здоровья граждан в РФ» и Правилами предоставления медицинскими организациями платных медицинских услуг (Постановление Правительства РФ № 736). Оплата производится поэтапно по факту выполнения клинических этапов. Гарантийные обязательства клиники действуют в соответствии с Положением о гарантиях ООО «Стоматологическая клиника ДЕНТЕ».
    </div>

    ${pepStampHtml}
  </div>
</body>
</html>`;
}

/**
 * Скачивает смету в виде автономного печатного HTML-файла
 */
export function downloadTreatmentPlanEstimate(
	plan: PatientTreatmentPlan,
	data: PatientPersonalCabinetData,
): void {
	const html = generateTreatmentPlanEstimateHtml(plan, data);
	downloadHtmlFile(html, `Smeta_Plan_${plan.planNumber}.html`);
}
