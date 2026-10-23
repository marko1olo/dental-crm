import type { MinorConsentPrintParams } from "./types";
import { getBasePrintStyles } from "./printStyles";

/**
 * Генерация HTML печатного бланка ИДС на несовершеннолетнего А4 (педиатрия с законным представителем)
 */
export function generateMinorConsentPrintHtml(params: MinorConsentPrintParams): string {
	const isBlank = Boolean(params.isBlank);
	const clinicName = params.clinicName || "ООО «Стоматологическая клиника ДЕНТЕ»";
	const clinicLicense = params.clinicLicense || "ЛО41-01137-77/00368421";
	const clinicAddress = params.clinicAddress || "г. Москва, ул. Большая Стоматологическая, д. 12";
	const clinicPhone = params.clinicPhone || "";

	const repName = isBlank ? "__________________________________________________" : (params.representativeName?.trim() || "__________________________________________________");
	const repRel = isBlank ? "мать / отец / опекун / законный представитель" : (params.representativeRelation?.trim() || "мать / отец / опекун");
	const repDoc = isBlank ? "паспорт серия _______ № _________ выдан ___________________________________" : (params.representativeDocument?.trim() || "паспорт серия _______ № _________ выдан ____________________");
	const repPhone = isBlank ? "+7 (___) ___-__-__" : (params.representativePhone?.trim() || "+7 (___) ___-__-__");

	const childName = isBlank ? "__________________________________________________" : (params.childName?.trim() || "__________________________________________________");
	const childBirth = isBlank ? "«___» _________ _____ г." : (params.childBirthDate?.trim() || "«___» _________ _____ г.");
	const childDoc = isBlank ? "свидетельство о рождении / паспорт: серия _______ № _________" : (params.childDocument?.trim() || "свидетельство о рождении / паспорт гражданина РФ");
	const repBasis = isBlank ? "свидетельство о рождении / акт органа опеки / доверенность: ____________________" : (params.representativeBasis?.trim() || "свидетельство о рождении ребенка");
	const accompanying = params.accompanyingPerson?.trim();
	const docName = isBlank ? "__________________________________________________" : (params.doctorName?.trim() || "Детский врач-стоматолог клиники");

	const scope = isBlank ? "____________________________________________________________________________________" : (params.interventionScope?.trim() || "Первичный детский осмотр, диагностика, адаптация, лечение временных/постоянных зубов");
	const diagnosis = isBlank ? "____________________________________________________________________________________" : (params.diagnosisOrIndication?.trim() || "Санация полости рта ребенка, профилактика и лечение кариеса");
	const risks = isBlank ? "____________________________________________________________________________________" : (params.risks?.trim() || "Эмоциональная лабильность, кратковременный страх, отек/гиперемия после анестезии");
	const alternatives = isBlank ? "____________________________________________________________________________________" : (params.alternatives?.trim() || "Лечение под седацией/наркозом; отказ от лечения с риском одонтогенного воспаления");

	const today = params.date || new Date().toLocaleDateString("ru-RU");
	const effectiveWatermark = params.watermarkText || (params.isSigned ? "ПОДПИСАНО ВРАЧОМ" : "ЧЕРНОВИК — ДЛЯ ПРЕДВАРИТЕЛЬНОГО ОЗНАКОМЛЕНИЯ / БЕЗ ЭЦП");
	const stampColor = effectiveWatermark.includes("ПОДПИСАНО") ? "#059669" : "#64748b";

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>ИДС на стоматологическое лечение несовершеннолетнего</title>
  <style>
${getBasePrintStyles(stampColor)}
    .statutory-badge { display: inline-block; background: #fdf4ff; color: #a21caf; font-size: 7pt; font-weight: 700; padding: 1.5pt 4pt; border-radius: 2pt; border: 0.5px solid #f0abfc; }
    .parties-block { background: #fdf2f8; border: 1px solid #fbcfe8; padding: 4pt 6pt; border-radius: 3pt; margin-bottom: 6pt; font-size: 8pt; line-height: 1.35; }
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
          <div><strong>${clinicName}</strong> · Лицензия: № ${clinicLicense}<br>Адрес: ${clinicAddress}${clinicPhone ? ` · Тел.: ${clinicPhone}` : ""}</div>
          <div style="text-align: right;">
            <div style="margin-bottom: 2pt;"><span class="watermark-stamp" aria-hidden="true">${effectiveWatermark}</span></div>
            <span class="statutory-badge">Педиатрия • Приказ МЗ РФ № 1051н • 323-ФЗ ст. 20</span><br>В медицинскую карту 043/у<br>Дата: ${today}
          </div>
        </div>
        <h1>ИНФОРМИРОВАННОЕ ДОБРОВОЛЬНОЕ СОГЛАСИЕ</h1>
        <div class="sheet-subtitle">на стоматологическое медицинское вмешательство несовершеннолетнему гражданину (до 15 лет)</div>
      </div>
      <div class="parties-block">
        Я, <strong>${repName}</strong>, статус / родство: <strong>${repRel}</strong>, документ, удостоверяющий личность: ${repDoc}, телефон: ${repPhone},<br>
        являясь законным представителем несовершеннолетнего: <strong>${childName}</strong>, дата рождения: ${childBirth}, документ ребенка: ${childDoc}, основание полномочий: ${repBasis},<br>
        ${accompanying ? `сопровождающее лицо (по доверенности ст. 185 ГК РФ): <strong>${accompanying}</strong>,<br>` : ""}
        настоящим даю информированное добровольное согласие лечащему врачу <strong>${docName}</strong> на проведение стоматологического лечения в соответствии со статьей 20 Федерального закона от 21.11.2011 № 323-ФЗ.
      </div>
      <div class="section-title">1. Объем вмешательства и показания</div>
      <div class="field-row"><span class="field-label">Объем стоматологического вмешательства:</span> ${scope}</div>
      <div class="field-row"><span class="field-label">Клинический диагноз / показания:</span> ${diagnosis}</div>
      <div class="section-title">2. Особенности детского возраста, риски и альтернативы</div>
      <p>2.1. Мне разъяснены особенности лечения детей, адаптация, а также риски: ${risks}.</p>
      <p>2.2. Альтернативы: ${alternatives}; последствия отказа: распространение инфекции, риск периодонтита.</p>
      <div class="section-title">3. Подтверждение добровольности и прав законного представителя</div>
      <p>Полномочия законного представителя подтверждены. Разъяснено право отказаться от вмешательства в любой момент.</p>
    </div>
    <div class="signatures-row">
      <div class="sign-box">Законный представитель ребенка:<br><strong>${repName}</strong><div class="sign-line"></div><div class="sign-hint">(подпись родителя/опекуна / дата: ${today})</div></div>
      <div class="sign-box">Детский врач-стоматолог:<br><strong>${docName}</strong><div class="sign-line"></div><div class="sign-hint">(подпись врача / дата: ${today})</div></div>
    </div>
  </div>
</body>
</html>`;
}
