/**
 * actAndPlanBuilders.ts
 *
 * Layer 2: Канонические генераторы акта сдачи-приёмки выполненных услуг (Приказ МЗ РФ № 804н, 54-ФЗ)
 * и комплексного плана стоматологического лечения со сметой по этапам (СТРОГО 2 листа А4).
 */

import type {
	A4DocumentActData,
	A4DocumentTreatmentPlanData,
	A4TreatmentPlanStageItem,
} from "./types.js";
import {
	escapeHtml,
	formatRubles,
	formatAmountInWordsRu,
	formatSignatoryString,
} from "./formatters.js";
import {
	A4_PRINT_BASE_STYLES,
	renderClinicHeaderHtml,
	renderRunningFooterHtml,
	renderRunningHeaderHtml,
} from "./styles.js";

/**
 * 4. АКТ СДАЧИ-ПРИЁМКИ ВЫПОЛНЕННЫХ УСЛУГ (ПРИКАЗ МЗ РФ № 804н)
 * Чистый бланк строгой отчётности по ГОСТ Р 7.0.97-2016.
 */
export function generateA4CompletedWorksActHtml(data: A4DocumentActData): string {
	const cl = data.clinic;
	const pt = data.patient;
	const cust = data.customer && data.customer.isDifferentFromPatient ? data.customer : pt;
	const formattedTotal = formatRubles(data.totalAmountRub);
	const inWordsTotal = formatAmountInWordsRu(data.totalAmountRub);
	const warranty = data.warrantyTermsText || "12 месяцев на пломбы и терапевтические реставрации, 24 месяца на ортопедические конструкции при соблюдении гигиены и контрольных осмотров 1 раз в 6 месяцев";
	const docLabel = `Акт сдачи-приемки № ${data.actNumber} от ${data.actDate} г.`;

	const serviceRows = (data.services || []).map((s, idx) => `
    <tr>
      <td style="text-align:center; width:25px;">${idx + 1}</td>
      <td style="width:75px; text-align:center; font-family:'PT Astra Sans', Arial, sans-serif; font-size:8pt; font-weight:bold;">${escapeHtml(s.code804n || "A16.07.002")}</td>
      <td>${escapeHtml(s.name)}</td>
      <td style="text-align:center; width:55px;">${escapeHtml(s.toothOrArea || "—")}</td>
      <td style="text-align:center; width:35px;">${s.quantity}</td>
      <td style="text-align:right; width:70px;">${formatRubles(s.unitPriceRub)}</td>
      <td style="text-align:right; width:60px;">${s.discountRub ? formatRubles(s.discountRub) : "—"}</td>
      <td style="text-align:right; width:75px; font-weight:bold;">${formatRubles(s.totalRub)}</td>
    </tr>
  `).join("");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>Акт сдачи-приемки выполненных работ № ${escapeHtml(data.actNumber)}</title>
${A4_PRINT_BASE_STYLES}
</head>
<body>
<div class="a4-page">
  ${renderClinicHeaderHtml(cl)}

  <div class="a4-doc-title">АКТ СДАЧИ-ПРИЕМКИ ОКАЗАННЫХ МЕДИЦИНСКИХ УСЛУГ № ${escapeHtml(data.actNumber)}</div>
  <div class="a4-doc-subtitle">
    к Договору на оказание платных медицинских услуг № <strong>${escapeHtml(data.contractNumber)}</strong> от ${escapeHtml(data.contractDate)} г.<br>
    Дата составления Акта: <strong>«${escapeHtml(data.actDate)}» г.</strong>
  </div>

  <table class="a4-table" style="margin-bottom:6px;">
    <tr>
      <td style="width:25%; font-weight:bold; background:#f5f5f5;">Исполнитель:</td>
      <td style="width:75%;">${escapeHtml(cl.legalName || cl.name)} (Лицензия № ${escapeHtml(cl.licenseNumber || "б/н")})</td>
    </tr>
    <tr>
      <td style="font-weight:bold; background:#f5f5f5;">Заказчик / Пациент:</td>
      <td><strong>${escapeHtml(cust.fullName)}</strong>${cust.fullName !== pt.fullName ? ` (в интересах Пациента: ${escapeHtml(pt.fullName)})` : ""}</td>
    </tr>
    <tr>
      <td style="font-weight:bold; background:#f5f5f5;">Лечащий врач:</td>
      <td><strong>${escapeHtml(data.doctorFullName || formatSignatoryString(null))}</strong> (${escapeHtml(data.doctorSpecialty || "Врач-стоматолог")})</td>
    </tr>
  </table>

  <div class="a4-section-heading">Перечень фактически оказанных медицинских услуг (Номенклатура МЗ РФ № 804н)</div>
  <table class="a4-table">
    <thead>
      <tr>
        <th>№</th>
        <th>Код услуги</th>
        <th>Наименование медицинской услуги</th>
        <th>Зуб</th>
        <th>Кол.</th>
        <th>Цена (руб.)</th>
        <th>Скидка</th>
        <th>Итого (руб.)</th>
      </tr>
    </thead>
    <tbody>
      ${serviceRows}
    </tbody>
    <tfoot>
      <tr class="total-row">
        <td colspan="7" style="text-align:right;">ИТОГО К ОПЛАТЕ:</td>
        <td style="text-align:right; font-size:9.5pt;">${formattedTotal}</td>
      </tr>
    </tfoot>
  </table>

  <div style="border: 0.75pt solid #000000; padding: 5px 8px; margin: 6px 0; font-size: 8.5pt; line-height: 1.35; background: #fafafa;">
    <div><strong>Всего оказано услуг на сумму:</strong> <strong>${formattedTotal} руб.</strong> (${escapeHtml(inWordsTotal)})</div>
    ${data.fiscalReceiptNumber ? `<div><strong>Фискальный чек ККТ (54-ФЗ):</strong> № ${escapeHtml(data.fiscalReceiptNumber)}</div>` : ""}
    <div style="margin-top: 2px;"><strong>Гарантийные обязательства:</strong> ${escapeHtml(warranty)}</div>
    <div style="margin-top: 3px; font-weight: bold;">
      Юридическая формула сдачи-приемки:
    </div>
    <div style="text-align: justify; margin-top: 2px;">
      «Услуги оказаны в полном объеме, в установленные сроки, с надлежащим качеством в соответствии со стандартами и клиническими рекомендациями Минздрава РФ. Претензий по объему, качеству и стоимости оказанных медицинских услуг не имею.»
    </div>
    ${data.patientClaimsText ? `<div style="margin-top:2px; color:#b91c1c;"><strong>Замечания:</strong> ${escapeHtml(data.patientClaimsText)}</div>` : ""}
  </div>

  <p class="a4-p-noindent" style="font-size: 8pt; margin-top: 3px;">
    Настоящий Акт составлен в 2-х подлинных экземплярах, имеющих одинаковую юридическую силу, по одному экземпляру для каждой из Сторон.
  </p>

  <div class="a4-sign-grid">
    <div class="a4-sign-col">
      <strong>УСЛУГИ СДАЛ (ИСПОЛНИТЕЛЬ):</strong><br><br>
      Врач-стоматолог:<br>
      <div class="a4-sign-line"></div>
      <div class="a4-sign-hint">/ ${escapeHtml(data.doctorFullName || formatSignatoryString(null))} / <span class="stamp-box">М.П.</span></div>
    </div>
    <div class="a4-sign-col">
      <strong>УСЛУГИ ПРИНЯЛ (ЗАКАЗЧИК):</strong><br><br>
      Пациент / Заказчик:<br>
      <div class="a4-sign-line"></div>
      <div class="a4-sign-hint">/ ${escapeHtml(cust.fullName)} /</div>
    </div>
  </div>

  ${renderRunningFooterHtml(docLabel, 1, 1)}
</div>
</body>
</html>`;
}

/**
 * 5. ПЕЧАТНЫЙ ПЛАН ЛЕЧЕНИЯ ДЛЯ ПАЦИЕНТА С ЭТАПАМИ И БЛОКОМ СОГЛАСОВАНИЯ
 * СТРОГО 2 ЛИСТА А4 по ГОСТ Р 7.0.97-2016.
 */
export function generateA4TreatmentPlanHtml(data: A4DocumentTreatmentPlanData): string {
	const cl = data.clinic;
	const pt = data.patient;
	const totalWithDiscFormatted = formatRubles(data.totalCostWithDiscountRub);
	const inWordsTotal = formatAmountInWordsRu(data.totalCostWithDiscountRub);
	const docLabel = `План лечения · Пациент: ${pt.fullName}`;

	// Разделение этапов между Листом 1 и Листом 2
	const totalStages = data.stages.length;
	const splitIndex = totalStages <= 1 ? 1 : Math.ceil(totalStages / 2);
	const firstHalfStages = data.stages.slice(0, splitIndex);
	const secondHalfStages = data.stages.slice(splitIndex);

	const renderStageHtml = (st: A4TreatmentPlanStageItem) => {
		const itemsRows = st.plannedServices.map((srv, sIdx) => `
      <tr>
        <td style="text-align:center; width:25px;">${st.stageNumber}.${sIdx + 1}</td>
        <td>${escapeHtml(srv.name)}</td>
        <td style="text-align:center; width:65px;">${escapeHtml(srv.toothOrArea || "—")}</td>
        <td style="text-align:center; width:85px;">${escapeHtml(srv.timing || st.stageTiming || "по плану")}</td>
        <td style="text-align:right; width:85px; font-weight:bold;">${formatRubles(srv.priceRub)}</td>
      </tr>
    `).join("");

		return `
      <div style="margin-top: 6px; page-break-inside: avoid; break-inside: avoid;">
        <div style="font-weight:bold; font-size:8.5pt; background:#eeeeee; border:0.75pt solid #000000; padding:2.5px 5px; border-bottom:none;">
          ${escapeHtml(st.stageName)} ${st.stageTiming ? `(Ориентировочный срок: ${escapeHtml(st.stageTiming)})` : ""}
        </div>
        <table class="a4-table" style="margin-top:0;">
          <thead>
            <tr>
              <th>№</th>
              <th>Наименование медицинской процедуры</th>
              <th>Зуб / область</th>
              <th>Сроки</th>
              <th>Стоимость (руб.)</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
          <tfoot>
            <tr class="total-row">
              <td colspan="4" style="text-align:right;">Итого по этапу:</td>
              <td style="text-align:right;">${formatRubles(st.stageTotalRub)}</td>
            </tr>
          </tfoot>
        </table>
        ${st.clinicalNotes ? `<div style="font-size:7.5pt; font-style:italic; margin-top:-2px; margin-bottom:4px;">Клинические примечания: ${escapeHtml(st.clinicalNotes)}</div>` : ""}
      </div>
    `;
	};

	const firstSheetStagesHtml = firstHalfStages.map(renderStageHtml).join("");
	const secondSheetStagesHtml = secondHalfStages.length > 0
		? secondHalfStages.map(renderStageHtml).join("")
		: `<div style="font-size:8.5pt; color:#444444; margin: 6px 0;">Все лечебные мероприятия и манипуляции детализированы на Листе 1 настоящего Плана.</div>`;

	return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>Комплексный план стоматологического лечения — ${escapeHtml(pt.fullName)}</title>
${A4_PRINT_BASE_STYLES}
</head>
<body>

<!-- ════════ ЛИСТ 1 ИЗ 2 ════════ -->
<div class="a4-page">
  ${renderClinicHeaderHtml(cl)}

  <div class="a4-doc-title">ПЛАН КОМПЛЕКСНОГО СТОМАТОЛОГИЧЕСКОГО ЛЕЧЕНИЯ И СМЕТА</div>
  <div class="a4-doc-subtitle">Приложение к Договору на оказание платных медицинских услуг · Дата составления: «${escapeHtml(data.planDate)}» г.</div>

  <table class="a4-table" style="margin-bottom:6px;">
    <tr>
      <td style="width:25%; font-weight:bold; background:#f5f5f5;">Пациент (ФИО):</td>
      <td style="width:45%;"><strong>${escapeHtml(pt.fullName)}</strong></td>
      <td style="width:15%; font-weight:bold; background:#f5f5f5;">№ карты:</td>
      <td style="width:15%;"><strong>${escapeHtml(pt.cardNumber || "б/н")}</strong></td>
    </tr>
    <tr>
      <td style="font-weight:bold; background:#f5f5f5;">Дата рождения / Тел:</td>
      <td>${escapeHtml(pt.birthDate || "—")} · Тел: ${escapeHtml(pt.phone || "—")}</td>
      <td style="font-weight:bold; background:#f5f5f5;">Лечащий врач:</td>
      <td><strong>${escapeHtml(data.doctorFullName || formatSignatoryString(null))}</strong></td>
    </tr>
    <tr>
      <td style="font-weight:bold; background:#f5f5f5;">Повод обращения / Диагноз:</td>
      <td colspan="3">${escapeHtml(data.diagnosisSummary || data.clinicalReason || "Первичная консультация и комплексная санация полости рта")}</td>
    </tr>
  </table>

  <div class="a4-section-heading">1. Задачи комплексной стоматологической реабилитации</div>
  <p class="a4-p">
    Целями комплексного лечения являются: купирование болевого синдрома и очагов одонтогенной инфекции, санация кариозных поражений, восстановление анатомической целостности зубов, восстановление жевательной и речевой функций, нормализация окклюзионных взаимоотношений и профилактика заболеваний пародонта.
  </p>

  <div class="a4-section-heading">2. Этапы лечения и финансовая спецификация (Часть 1)</div>
  ${firstSheetStagesHtml}

  ${renderRunningFooterHtml(docLabel, 1, 2)}
</div>

<!-- ════════ ЛИСТ 2 ИЗ 2 ════════ -->
<div class="a4-page">
  ${renderRunningHeaderHtml(docLabel, 2)}

  <div class="a4-section-heading">2. Этапы лечения и финансовая спецификация (Продолжение)</div>
  ${secondSheetStagesHtml}

  <div style="border:0.75pt solid #000000; padding:5px 8px; margin:6px 0; background:#fcfcfc; font-size:8.5pt;">
    <div style="display:flex; justify-content:space-between; font-weight:bold; font-size:9.5pt;">
      <div>ВСЕГО ПО ПЛАНУ ЛЕЧЕНИЯ:</div>
      <div>${totalWithDiscFormatted} руб.</div>
    </div>
    ${data.discountRub ? `<div style="font-size:8pt; color:#444444;">(Сумма без скидки: ${formatRubles(data.totalCostWithoutDiscountRub)} руб., скидка: ${formatRubles(data.discountRub)} руб.)</div>` : ""}
    <div style="margin-top:2px;">Сумма прописью: <strong>${escapeHtml(inWordsTotal)}</strong></div>
  </div>

  <div class="a4-section-heading">3. Альтернативные варианты лечения и клинические риски</div>
  <p class="a4-p">
    3.1. Мне разъяснены альтернативные варианты лечения: ${escapeHtml(data.alternativesText || "сохранение зубов терапевтическими методами vs удаление с последующей имплантацией или протезированием съемными/несъемными конструкциями")}.
  </p>
  <p class="a4-p">
    3.2. Риски при отказе от комплексного плана: ${escapeHtml(data.risksAndLimitsText || "прогрессирование патологии твердых тканей, перегрузка оставшихся зубов, развитие дисфункции ВНЧС, атрофия альвеолярного отростка")}.
  </p>

  <div class="a4-section-heading">4. Блок информированного согласования плана лечения пациентом</div>
  <p class="a4-p-noindent" style="font-size:8pt; line-height:1.25; text-align:justify;">
    План лечения может быть дополнен и скорректирован по предварительному согласованию со мной в соответствии с объективными клиническими показаниями. Мне понятен план, этапность, ориентировочные сроки и предполагаемый результат лечения, возможные риски и осложнения на каждом этапе, необходимость контрольных рентгеновских снимков (визиография / КЛКТ), а также порядок оплаты. Мне были представлены альтернативные варианты лечения. Я проинформирован(а) о необходимости явки на контрольные профилактические осмотры 1 раз в 6 месяцев после завершения лечения для сохранения гарантийных обязательств клиники. Врачом даны исчерпывающие ответы на все мои вопросы.
  </p>
  ${data.approvedVariantName ? `<div style="font-weight:bold; font-size:8.5pt; margin-top:3px;">Утвержденный вариант плана: ${escapeHtml(data.approvedVariantName)}</div>` : ""}

  <div class="a4-sign-grid">
    <div class="a4-sign-col">
      <strong>ПЛАН СОСТАВИЛ (ВРАЧ):</strong><br><br>
      Лечащий врач:<br>
      <div class="a4-sign-line"></div>
      <div class="a4-sign-hint">/ ${escapeHtml(data.doctorFullName || formatSignatoryString(null))} / <span class="stamp-box">М.П.</span></div>
    </div>
    <div class="a4-sign-col">
      <strong>ПЛАН СОГЛАСОВАЛ (ПАЦИЕНТ):</strong><br><br>
      Пациент (Заказчик):<br>
      <div class="a4-sign-line"></div>
      <div class="a4-sign-hint">/ ${escapeHtml(pt.fullName)} / (с планом, сроками и стоимостью согласен)</div>
    </div>
  </div>

  ${renderRunningFooterHtml(docLabel, 2, 2)}
</div>

</body>
</html>`;
}
