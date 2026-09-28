import type {
  ConsentPrintParams,
  MinorConsentPrintParams,
} from './types';

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
    @page {
      size: A4;
      margin: 10mm 14mm 12mm 14mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      font-size: 8.5pt;
      line-height: 1.35;
      color: #111827;
      background: #ffffff;
      margin: 0;
      padding: 0;
    }
    .watermark-draft {
      position: fixed;
      top: 45%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-30deg);
      font-size: 52pt;
      font-weight: 900;
      color: rgba(0, 0, 0, 0.04);
      text-transform: uppercase;
      letter-spacing: 4pt;
      pointer-events: none;
      z-index: 0;
      user-select: none;
    }
    .watermark-stamp {
      display: inline-block;
      border: 1.5pt solid ${stampColor};
      color: ${stampColor};
      padding: 1.5pt 5pt;
      border-radius: 2.5pt;
      font-size: 7pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .print-sheet {
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 100%;
    }
    .sheet-header {
      border-bottom: 1.5px solid #111827;
      padding-bottom: 4pt;
      margin-bottom: 6pt;
    }
    .clinic-top-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      font-size: 7.5pt;
      color: #4b5563;
      margin-bottom: 4pt;
    }
    .statutory-badge {
      display: inline-block;
      background: #e0f2fe;
      color: #0369a1;
      font-size: 7pt;
      font-weight: 700;
      padding: 1.5pt 4pt;
      border-radius: 2pt;
      border: 0.5px solid #bae6fd;
    }
    h1 {
      font-size: 11pt;
      font-weight: 800;
      text-align: center;
      margin: 2pt 0 1pt 0;
      letter-spacing: 0.5pt;
      text-transform: uppercase;
      color: #0f172a;
    }
    .sheet-subtitle {
      font-size: 8pt;
      text-align: center;
      color: #475569;
      margin-bottom: 4pt;
    }
    .parties-block {
      background: #f8fafc;
      border: 1px solid #cbd5e1;
      padding: 4pt 6pt;
      border-radius: 3pt;
      margin-bottom: 6pt;
      font-size: 8pt;
      line-height: 1.35;
    }
    .section-title {
      font-weight: 700;
      font-size: 8.5pt;
      text-transform: uppercase;
      margin: 4pt 0 2pt 0;
      color: #1e293b;
      border-bottom: 0.5px solid #e2e8f0;
      padding-bottom: 1pt;
    }
    p {
      margin: 0 0 3pt 0;
      text-align: justify;
    }
    .field-row {
      margin: 1.5pt 0;
    }
    .field-label {
      font-weight: 600;
      color: #334155;
    }
    .signatures-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16pt;
      margin-top: 8pt;
      padding-top: 6pt;
      border-top: 1px solid #94a3b8;
      font-size: 8pt;
      page-break-inside: avoid;
    }
    .sign-box {
      display: flex;
      flex-direction: column;
      gap: 2pt;
    }
    .sign-line {
      border-bottom: 1px solid #0f172a;
      height: 20pt;
      margin-top: 4pt;
    }
    .sign-hint {
      font-size: 6.5pt;
      color: #64748b;
      text-align: center;
    }
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
    @page {
      size: A4;
      margin: 10mm 14mm 12mm 14mm;
    }
    *, *::before, *::after {
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      font-size: 8.5pt;
      line-height: 1.35;
      color: #111827;
      background: #ffffff;
      margin: 0;
      padding: 0;
    }
    .watermark-draft {
      position: fixed;
      top: 45%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-30deg);
      font-size: 52pt;
      font-weight: 900;
      color: rgba(0, 0, 0, 0.04);
      text-transform: uppercase;
      letter-spacing: 4pt;
      pointer-events: none;
      z-index: 0;
      user-select: none;
    }
    .watermark-stamp {
      display: inline-block;
      border: 1.5pt solid ${stampColor};
      color: ${stampColor};
      padding: 1.5pt 5pt;
      border-radius: 2.5pt;
      font-size: 7pt;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .print-sheet {
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 100%;
    }
    .sheet-header {
      border-bottom: 1.5px solid #111827;
      padding-bottom: 4pt;
      margin-bottom: 6pt;
    }
    .clinic-top-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      font-size: 7.5pt;
      color: #4b5563;
      margin-bottom: 4pt;
    }
    .statutory-badge {
      display: inline-block;
      background: #fdf4ff;
      color: #a21caf;
      font-size: 7pt;
      font-weight: 700;
      padding: 1.5pt 4pt;
      border-radius: 2pt;
      border: 0.5px solid #f0abfc;
    }
    h1 {
      font-size: 10.5pt;
      font-weight: 800;
      text-align: center;
      margin: 2pt 0 1pt 0;
      letter-spacing: 0.5pt;
      text-transform: uppercase;
      color: #0f172a;
    }
    .sheet-subtitle {
      font-size: 8pt;
      text-align: center;
      color: #475569;
      margin-bottom: 4pt;
    }
    .parties-block {
      background: #fdf2f8;
      border: 1px solid #fbcfe8;
      padding: 4pt 6pt;
      border-radius: 3pt;
      margin-bottom: 6pt;
      font-size: 8pt;
      line-height: 1.35;
    }
    .section-title {
      font-weight: 700;
      font-size: 8.5pt;
      text-transform: uppercase;
      margin: 4pt 0 2pt 0;
      color: #1e293b;
      border-bottom: 0.5px solid #e2e8f0;
      padding-bottom: 1pt;
    }
    p {
      margin: 0 0 3pt 0;
      text-align: justify;
    }
    .field-row {
      margin: 1.5pt 0;
    }
    .field-label {
      font-weight: 600;
      color: #334155;
    }
    .signatures-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16pt;
      margin-top: 8pt;
      padding-top: 6pt;
      border-top: 1px solid #94a3b8;
      font-size: 8pt;
      page-break-inside: avoid;
    }
    .sign-box {
      display: flex;
      flex-direction: column;
      gap: 2pt;
    }
    .sign-line {
      border-bottom: 1px solid #0f172a;
      height: 20pt;
      margin-top: 4pt;
    }
    .sign-hint {
      font-size: 6.5pt;
      color: #64748b;
      text-align: center;
    }
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
            <span class="statutory-badge">Педиатрия • Приказ МЗ РФ № 1051н • 323-ФЗ ст. 20</span><br>
            В медицинскую карту 043/у<br>
            Дата: ${today}
          </div>
        </div>
        <h1>ИНФОРМИРОВАННОЕ ДОБРОВОЛЬНОЕ СОГЛАСИЕ</h1>
        <div class="sheet-subtitle">на стоматологическое медицинское вмешательство несовершеннолетнему гражданину (до 15 лет)</div>
      </div>

      <div class="parties-block">
        Я, <strong>${repName}</strong>, статус / родство: <strong>${repRel}</strong>, документ, удостоверяющий личность: ${repDoc}, телефон: ${repPhone},<br>
        являясь законным представителем несовершеннолетнего: <strong>${childName}</strong>, дата рождения: ${childBirth},<br>
        настоящим даю информированное добровольное согласие лечащему врачу <strong>${docName}</strong> на проведение стоматологического лечения в соответствии со статьей 20 Федерального закона от 21.11.2011 № 323-ФЗ.
      </div>

      <div class="section-title">1. Объем вмешательства и показания</div>
      <div class="field-row"><span class="field-label">Объем стоматологического вмешательства:</span> ${scope}</div>
      <div class="field-row"><span class="field-label">Клинический диагноз / показания:</span> ${diagnosis}</div>

      <div class="section-title">2. Особенности детского возраста, риски и альтернативы</div>
      <p>2.1. Мне разъяснены психологические и физиологические особенности лечения детей, необходимость поэтапной адаптации, а также риски: ${risks}.</p>
      <p>2.2. Мне разъяснены альтернативные методы лечения: ${alternatives}, а также последствия отказа от лечения (быстрое распространение инфекции во временных зубах на зачатки постоянных зубов, риск периодонтита и остеомиелита челюсти).</p>

      <div class="section-title">3. Подтверждение добровольности и прав законного представителя</div>
      <p>Личность и полномочия законного представителя подтверждены предъявленными документами. Ребенку даны понятные адаптационные разъяснения по возрасту. Мне были даны исчерпывающие ответы на все вопросы простым и доступным языком. Мне разъяснено право отказаться от медицинского вмешательства или потребовать его прекращения в любой момент.</p>
    </div>

    <div class="signatures-row">
      <div class="sign-box">
        Законный представитель ребенка:<br>
        <strong>${repName}</strong>
        <div class="sign-line"></div>
        <div class="sign-hint">(подпись родителя/опекуна / дата: ${today})</div>
      </div>
      <div class="sign-box">
        Детский врач-стоматолог:<br>
        <strong>${docName}</strong>
        <div class="sign-line"></div>
        <div class="sign-hint">(подпись врача / дата: ${today})</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}
