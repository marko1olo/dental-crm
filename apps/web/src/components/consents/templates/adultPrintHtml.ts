import type { ConsentPrintParams } from "./types";
import { getBasePrintStyles } from "./printStyles";

/**
 * Генерация HTML печатного бланка ИДС А4 (Приказ МЗ РФ № 1051н, 323-ФЗ ст. 20)
 */
export function generateConsentPrintHtml(params: ConsentPrintParams): string {
	const isBlank = Boolean(params.isBlank);
	const clinicName = params.clinicName || "ООО «Стоматологическая клиника ДЕНТЕ»";
	const clinicLicense = params.clinicLicense || "ЛО41-01137-77/00368421";
	const clinicAddress = params.clinicAddress || "г. Москва, ул. Большая Стоматологическая, д. 12";
	const clinicPhone = params.clinicPhone || "";

	const ptName = isBlank ? "__________________________________________________" : (params.patientName?.trim() || "__________________________________________________");
	const ptBirth = isBlank ? "«___» _________ _____ г." : (params.birthDate?.trim() || "«___» _________ _____ г.");
	const ptPassport = isBlank ? "серия _______ № _________ выдан ___________________________________" : (params.passport?.trim() || "серия _______ № _________ выдан ____________________");
	const ptSnils = isBlank ? "___-___-___ __" : (params.snils?.trim() || "___-___-___ __");
	const ptPhone = isBlank ? "+7 (___) ___-__-__" : (params.phone?.trim() || "+7 (___) ___-__-__");
	const docName = isBlank ? "__________________________________________________" : (params.doctorName?.trim() || "Врач-стоматолог клиники");

	const title = params.title || "ИНФОРМИРОВАННОЕ ДОБРОВОЛЬНОЕ СОГЛАСИЕ";
	const subtitle = params.subtitle || "на медицинское стоматологическое вмешательство (Приказ МЗ РФ от 12.11.2021 № 1051н, ст. 20 323-ФЗ)";

	const intervention = isBlank ? "____________________________________________________________________________________" : (params.intervention?.trim() || "Стоматологический осмотр, диагностика и согласованный комплекс лечения");
	const toothArea = isBlank ? "________________________________________" : (params.toothOrArea?.trim() || "Полость рта (все квадранты)");
	const diagnosis = isBlank ? "____________________________________________________________________________________" : (params.diagnosisOrIndication?.trim() || "Санация полости рта / обследование");
	const expectedBenefit = isBlank ? "____________________________________________________________________________________" : (params.expectedBenefit?.trim() || "Купирование болевого синдрома, устранение очагов инфекции, восстановление функции зубочелюстной системы");
	const anesthesia = isBlank ? "____________________________________________________________________________________" : (params.anesthesia?.trim() || "Местная инфильтрационная / проводниковая анестезия (по клиническим показаниям)");
	const materials = isBlank ? "____________________________________________________________________________________" : (params.materialNotes?.trim() || "Сертифицированные стоматологические композиты, адгезивы, эндодонтические препараты");
	const risks = isBlank ? "____________________________________________________________________________________" : (params.risks?.trim() || "Возможна индивидуальная реакция на анестетик, постоперационная чувствительность до 3–7 дней, необходимость повторного визита");
	const alternatives = isBlank ? "____________________________________________________________________________________" : (params.alternatives?.trim() || "Отказ от вмешательства с прогрессированием заболевания; удаление зуба; альтернативные ортопедические методики");
	const aftercare = isBlank ? "____________________________________________________________________________________" : (params.aftercare?.trim() || "Не принимать пищу до окончания действия анестезии (2-3 часа); соблюдать щадящий режим гигиены полости рта");

	const today = params.date || new Date().toLocaleDateString("ru-RU");
	const effectiveWatermark = params.watermarkText || (params.isSigned ? "ПОДПИСАНО ВРАЧОМ" : "ЧЕРНОВИК — ДЛЯ ПРЕДВАРИТЕЛЬНОГО ОЗНАКОМЛЕНИЯ / БЕЗ ЭЦП");
	const stampColor = effectiveWatermark.includes("ПОДПИСАНО") ? "#059669" : "#64748b";

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
${getBasePrintStyles(stampColor)}
    .field-row { margin: 1.5pt 0; }
    .field-label { font-weight: 600; color: #334155; }
  </style>
</head>
<body>
  <div class="print-sheet">
    <div class="watermark-draft" aria-hidden="true">${effectiveWatermark}</div>
    <div>
      <div class="sheet-header">
        <div class="clinic-top-row">
          <div>
            <strong>${clinicName}</strong> · Лицензия: № ${clinicLicense}<br>
            Адрес: ${clinicAddress}${clinicPhone ? ` · Тел.: ${clinicPhone}` : ""}
          </div>
          <div style="text-align: right;">
            <div style="margin-bottom: 2pt;">
              <span class="watermark-stamp" aria-hidden="true">${effectiveWatermark}</span>
            </div>
            <span class="statutory-badge">Приказ МЗ РФ № 1051н • 323-ФЗ ст. 20</span><br>
            В медицинскую карту 043/у<br>
            Дата: ${today}
          </div>
        </div>
        <h1>${title}</h1>
        <div class="sheet-subtitle">${subtitle}</div>
      </div>

      <div class="parties-block">
        Я, <strong>${ptName}</strong>, дата рождения: ${ptBirth}, проживающий(-ая) по адресу: ____________________, документ, удостоверяющий личность: ${ptPassport}, СНИЛС: ${ptSnils}, телефон: ${ptPhone},<br>
        настоящим даю информированное добровольное согласие на медицинское вмешательство лечащему врачу <strong>${docName}</strong> в соответствии со ст. 20 Федерального закона от 21.11.2011 № 323-ФЗ.
      </div>

      <div class="section-title">1. Клинический объем и диагноз</div>
      <div class="field-row"><span class="field-label">Планируемое медицинское вмешательство:</span> ${intervention}</div>
      <div class="field-row"><span class="field-label">Область вмешательства / зубы (FDI):</span> ${toothArea}</div>
      <div class="field-row"><span class="field-label">Клинический диагноз / показание:</span> ${diagnosis}</div>
      <div class="field-row"><span class="field-label">Ожидаемый терапевтический результат:</span> ${expectedBenefit}</div>

      <div class="section-title">2. Обезболивание, материалы и протокол</div>
      <div class="field-row"><span class="field-label">Местная анестезия:</span> ${anesthesia}</div>
      <div class="field-row"><span class="field-label">Применяемые материалы и препараты:</span> ${materials}</div>

      <div class="section-title">3. Риски, возможные осложнения и альтернативы</div>
      <p>3.1. Мне разъяснены риски: ${risks}.</p>
      <p>3.2. Альтернативные варианты лечения: ${alternatives}. Мне разъяснены последствия отказа от лечения: прогрессирование инфекционного процесса, потеря зуба, осложнения челюстно-лицевой области.</p>

      <div class="section-title">4. Рекомендации после вмешательства</div>
      <p>${aftercare}.</p>

      <div class="section-title">5. Добровольность и право на отказ</div>
      <p>Я подтверждаю, что сообщил(-а) врачу достоверные сведения о состоянии здоровья, сопутствующих патологиях, аллергиях и принимаемых лекарствах. Мне были даны исчерпывающие ответы на все вопросы. Мне разъяснено право отказаться от вмешательства в любой момент до его начала.</p>
    </div>

    <div class="signatures-row">
      <div class="sign-box">
        Пациент (законный представитель):<br>
        <strong>${ptName}</strong>
        <div class="sign-line"></div>
        <div class="sign-hint">(личная подпись / дата: ${today})</div>
      </div>
      <div class="sign-box">
        Лечащий врач-стоматолог:<br>
        <strong>${docName}</strong>
        <div class="sign-line"></div>
        <div class="sign-hint">(подпись медицинского работника / дата: ${today})</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}
