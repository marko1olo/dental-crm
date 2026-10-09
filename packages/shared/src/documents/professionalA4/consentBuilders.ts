/**
 * consentBuilders.ts
 *
 * Layer 2: Канонические генераторы информированного добровольного согласия (ИДС)
 * и согласия на обработку персональных данных (152-ФЗ).
 * Приказ МЗ РФ № 1051н, ст. 20 323-ФЗ, 152-ФЗ, ПП РФ № 140 (ЕГИСЗ).
 */

import type {
	A4DocumentInformedConsentData,
	A4DocumentPersonalDataConsentData,
} from "./types.js";
import {
	escapeHtml,
	formatPassportString,
	formatAddressString,
	formatPhoneString,
	formatSnilsString,
	formatPolicyString,
	formatDateString,
	formatSignatoryString,
} from "./formatters.js";
import {
	A4_PRINT_BASE_STYLES,
	renderClinicHeaderHtml,
	renderRunningFooterHtml,
	renderRunningHeaderHtml,
} from "./styles.js";

/**
 * 2. ИНФОРМИРОВАННОЕ ДОБРОВОЛЬНОЕ СОГЛАСИЕ (ПРИКАЗ МЗ РФ № 1051н)
 * СТРОГО 2 ЛИСТА А4 по ГОСТ Р 7.0.97-2016.
 */
export function generateA4InformedConsentHtml(data: A4DocumentInformedConsentData): string {
	const cl = data.clinic;
	const pt = data.patient;
	const cust = data.customer && data.customer.isDifferentFromPatient ? data.customer : pt;
	const isCustomerDifferent = Boolean(data.customer && data.customer.isDifferentFromPatient);
	const city = cl.city || "г. Москва";
	const docLabel = `ИДС (Приказ МЗ РФ № 1051н) · Пациент: ${pt.fullName}`;

	const plannedListHtml = (data.plannedInterventionsList && data.plannedInterventionsList.length > 0)
		? `<ul style="margin: 2px 0 4px 18px; padding: 0; font-size: 8.5pt;">${data.plannedInterventionsList.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
		: `<p class="a4-p">План вмешательства: ${escapeHtml(data.interventionName)} ${data.toothOrArea ? `(область/зуб: ${escapeHtml(data.toothOrArea)})` : ""}.</p>`;

	return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>Информированное добровольное согласие — ${escapeHtml(pt.fullName)}</title>
${A4_PRINT_BASE_STYLES}
</head>
<body>

<!-- ════════ ЛИСТ 1 ИЗ 2 ════════ -->
<div class="a4-page">
  ${renderClinicHeaderHtml(cl)}

  <div class="a4-doc-title">ИНФОРМИРОВАННОЕ ДОБРОВОЛЬНОЕ СОГЛАСИЕ<br>НА МЕДИЦИНСКОЕ ВМЕШАТЕЛЬСТВО</div>
  <div class="a4-doc-subtitle">в соответствии со ст. 20 Федерального закона от 21.11.2011 № 323-ФЗ<br>и Приказом Министерства здравоохранения Российской Федерации от 12.11.2021 № 1051н</div>

  <div class="a4-meta-row">
    <div>${escapeHtml(city)}</div>
    <div>«${escapeHtml(data.consentDate)}» г.</div>
  </div>

  <p class="a4-p">
    Я, гражданин(ка) <strong>${escapeHtml(cust.fullName)}</strong>, дата рождения: ${escapeHtml(cust.birthDate || formatDateString(null))}, документ, удостоверяющий личность: ${escapeHtml(formatPassportString(cust))}, зарегистрированный(ая) по адресу: ${escapeHtml(cust.registrationAddress || cust.address || formatAddressString(null))}, телефон: ${escapeHtml(cust.phone || formatPhoneString(null))}, ${
		isCustomerDifferent
			? `являясь законным представителем Пациента <strong>${escapeHtml(pt.fullName)}</strong> (дата рождения: ${escapeHtml(pt.birthDate || formatDateString(null))}),`
			: ""
	} при получении первичной медико-санитарной и специализированной стоматологической помощи в <strong>${escapeHtml(cl.legalName || cl.name)}</strong> у лечащего врача <strong>${escapeHtml(data.doctorFullName || formatSignatoryString(null))}</strong> (${escapeHtml(data.doctorSpecialty || "Врач-стоматолог")}) даю информированное добровольное согласие на медицинское вмешательство.
  </p>

  <div class="a4-section-heading">1. Характер и цели медицинского вмешательства</div>
  <p class="a4-p">
    1.1. Клинический диагноз: <strong>${escapeHtml(data.diagnosisSummary || "Санация полости рта, лечение стоматологического заболевания")}</strong>${data.toothOrArea ? ` (Область/Зуб: ${escapeHtml(data.toothOrArea)})` : ""}.
  </p>
  <p class="a4-p">
    1.2. Основное планируемое вмешательство: <strong>${escapeHtml(data.interventionName)}</strong>. Целями вмешательства являются: купирование болевого синдрома и воспаления, ликвидация инфекционного очага, восстановление анатомической формы, эстетики и жевательной эффективности зубочелюстной системы.
  </p>
  ${plannedListHtml}

  <div class="a4-section-heading">2. Методы оказания медицинской помощи и сопутствующие риски</div>
  <p class="a4-p">
    2.1. Мне разъяснены в доступной форме методы оказания медицинской помощи, включающие инструментальную и медикаментозную обработку, препарирование твердых тканей, применение современных пломбировочных и реставрационных материалов, проведение местной анестезии, а также контрольных рентгенологических исследований (радиовизиография, ортопантомография, КЛКТ).
  </p>
  <p class="a4-p">
    2.2. Я проинформирован(а), что медицинские вмешательства сопряжены с естественными биологическими рисками индивидуальной тканевой реакции, анатомической вариабельности корневых каналов и микрофлоры полости рта.
  </p>

  <div class="a4-section-heading">3. Альтернативные методы лечения и последствия отказа</div>
  <p class="a4-p">
    3.1. Мне разъяснены альтернативные методы лечения: ${escapeHtml(data.alternativesText || "консервативное динамическое наблюдение, альтернативные виды терапевтического пломбирования, ортопедическое протезирование коронками или вкладками, хирургическое удаление с последующей дентальной имплантацией")}.
  </p>
  <p class="a4-p">
    3.2. Мне разъяснены возможные последствия отказа от предлагаемого медицинского вмешательства: прогрессирование кариозного процесса, переход воспаления на пульпу зуба и периодонт, образование гранулем и кист, развитие одонтогенного периостита, флегмоны или остеомиелита челюсти, потеря зуба, атрофия костной ткани и нарушение функции височно-нижнечелюстного сустава.
  </p>

  ${renderRunningFooterHtml(docLabel, 1, 2)}
</div>

<!-- ════════ ЛИСТ 2 ИЗ 2 ════════ -->
<div class="a4-page">
  ${renderRunningHeaderHtml(docLabel, 2)}

  <div class="a4-section-heading">4. Возможные осложнения и сопутствующие реакции при стоматологическом лечении</div>
  <p class="a4-p">
    4.1. <strong>Местная анестезия:</strong> Я предупрежден(а) о возможности развития аллергических реакций, кратковременного учащения пульса, появления гематомы, отека или временной парестезии (онемения губы, щеки или языка) в зоне инъекции.
  </p>
  <p class="a4-p">
    4.2. <strong>Терапевтическое и эндодонтическое лечение:</strong> Возможны временные постпломбировочные боли и дискомфорт при накусывании в течение нескольких суток после лечения. Ввиду сложной анатомии, искривления или облитерации корневых каналов возможна невозможность их полной механической проходимости, поломка микроинструмента в канале или перфорация корня, что может потребовать хирургического вмешательства.
  </p>
  <p class="a4-p">
    4.3. <strong>Хирургия и имплантация:</strong> Возможны послеоперационный коллатеральный отек мягких тканей лица, луночковые боли, альвеолит, гематома, расхождение швов. При дентальной имплантации существует биологический риск дезинтеграции (отторжения) имплантата.
  </p>
  ${data.possibleComplicationsText ? `<p class="a4-p"><em>Индивидуальные клинические риски:</em> ${escapeHtml(data.possibleComplicationsText)}</p>` : ""}

  <div class="a4-section-heading">5. Право на отказ от медицинского вмешательства</div>
  <p class="a4-p">
    5.1. Мне разъяснено мое право отказаться от одного или нескольких видов медицинских вмешательств или потребовать их прекращения в соответствии со ст. 20 Федерального закона от 21.11.2011 № 323-ФЗ «Об основах охраны здоровья граждан в Российской Федерации». Мне разъяснены возможные клинические последствия такого отказа.
  </p>

  <div class="a4-section-heading">6. Подтверждение добровольности и полноты разъяснений врача</div>
  <p class="a4-p">
    6.1. Я подтверждаю, что текст настоящего Информированного добровольного согласия прочитан мною лично (или оглашен лечащим врачом вслух). Все термины и медицинские аспекты разъяснены на понятном мне русском языке.
  </p>
  <p class="a4-p">
    6.2. Все имевшиеся у меня вопросы о характере, рисках, стоимости и прогнозе вмешательства были заданы лечащему врачу, и на них были даны исчерпывающие и удовлетворяющие меня ответы.
  </p>
  <p class="a4-p">
    6.3. Я даю добровольное согласие на медицинское вмешательство и обязуюсь строго выполнять все назначения и рекомендации врача.
  </p>

  <div class="a4-sign-grid">
    <div class="a4-sign-col">
      <strong>ВРАЧ, ПРОВЕДШИЙ БЕСЕДУ:</strong><br><br>
      ${escapeHtml(data.doctorSpecialty || "Врач-стоматолог")}:<br>
      <div class="a4-sign-line"></div>
      <div class="a4-sign-hint">/ ${escapeHtml(data.doctorFullName || formatSignatoryString(null))} / <span class="stamp-box">М.П.</span></div>
    </div>
    <div class="a4-sign-col">
      <strong>ПАЦИЕНТ (ЗАКАЗЧИК):</strong><br><br>
      Согласие дано добровольно:<br>
      <div class="a4-sign-line"></div>
      <div class="a4-sign-hint">/ ${escapeHtml(cust.fullName)} /</div>
    </div>
  </div>

  ${renderRunningFooterHtml(docLabel, 2, 2)}
</div>

</body>
</html>`;
}

/**
 * 3. СОГЛАСИЕ НА ОБРАБОТКУ ПЕРСОНАЛЬНЫХ ДАННЫХ (ФЕДЕРАЛЬНЫЙ ЗАКОН № 152-ФЗ)
 * Полноценный 1 лист А4 по ГОСТ Р 7.0.97-2016.
 */
export function generateA4PersonalDataConsentHtml(data: A4DocumentPersonalDataConsentData): string {
	const cl = data.clinic;
	const pt = data.patient;
	const cust = data.customer && data.customer.isDifferentFromPatient ? data.customer : pt;
	const city = cl.city || "г. Москва";
	const docLabel = `Согласие на обработку ПДн (152-ФЗ) · ${pt.fullName}`;

	return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<title>Согласие на обработку персональных данных — ${escapeHtml(pt.fullName)}</title>
${A4_PRINT_BASE_STYLES}
</head>
<body>

<div class="a4-page">
  ${renderClinicHeaderHtml(cl)}

  <div class="a4-doc-title">СОГЛАСИЕ НА ОБРАБОТКУ ПЕРСОНАЛЬНЫХ ДАННЫХ<br>И СПЕЦИАЛЬНЫХ КАТЕГОРИЙ ДАННЫХ О СОСТОЯНИИ ЗДОРОВЬЯ</div>
  <div class="a4-doc-subtitle">в соответствии с Федеральным законом от 27.07.2006 № 152-ФЗ «О персональных данных»<br>и Постановлением Правительства РФ от 09.02.2022 № 140 (ЕГИСЗ)</div>

  <div class="a4-meta-row">
    <div>${escapeHtml(city)}</div>
    <div>«${escapeHtml(data.consentDate)}» г.</div>
  </div>

  <p class="a4-p">
    Я, гражданин(ка) <strong>${escapeHtml(cust.fullName)}</strong>, дата рождения: ${escapeHtml(cust.birthDate || formatDateString(null))}, паспорт: ${escapeHtml(formatPassportString(cust))}, адрес регистрации: ${escapeHtml(cust.registrationAddress || cust.address || formatAddressString(null))}, телефон: ${escapeHtml(cust.phone || formatPhoneString(null))}, СНИЛС: ${escapeHtml(cust.snils || formatSnilsString(null))}, полис ОМС: ${escapeHtml(cust.omsPolis || formatPolicyString(null))}, свободно, своей волей и в своем интересе даю согласие Оператору — <strong>${escapeHtml(cl.legalName || cl.name)}</strong> (ОГРН: ${escapeHtml(cl.ogrn || "____________")}, ИНН: ${escapeHtml(cl.inn || "____________")}, адрес: ${escapeHtml(cl.address || formatAddressString(null))}) на обработку моих персональных данных.
  </p>

  <div class="a4-section-heading">1. Перечень обрабатываемых персональных данных</div>
  <p class="a4-p">
    1.1. <strong>Общие данные:</strong> Фамилия, имя, отчество, дата и место рождения, пол, данные документа, удостоверяющего личность, адрес регистрации и фактического проживания, контактный телефон, email, номер СНИЛС, номер полиса ОМС/ДМС.
  </p>
  <p class="a4-p">
    1.2. <strong>Специальные категории данных (ст. 10 152-ФЗ):</strong> Сведения о состоянии здоровья, анамнезе заболеваний, соматическом статусе, аллергологических реакциях, стоматологическом статусе (зубная формула), диагнозах МКБ-10, результатах осмотра и рентгенологических исследований (прицельные снимки, визиограммы, ОПТГ, КЛКТ, фотопротоколы), протоколах лечения и медицинских назначениях.
  </p>

  <div class="a4-section-heading">2. Цели обработки персональных данных</div>
  <p class="a4-p">
    2.1. Организация и оказание первичной медико-санитарной и специализированной стоматологической помощи; оформление и ведение амбулаторной медицинской карты стоматологического пациента (Приказ МЗ РФ № 834н).
  </p>
  <p class="a4-p">
    2.2. Исполнение обязанностей, возложенных законодательством РФ в сфере охраны здоровья граждан, включая передачу сведений в <strong>Единую государственную информационную систему в сфере здравоохранения (ЕГИСЗ / РЭМД)</strong> в соответствии со ст. 91.1 Федерального закона № 323-ФЗ и Постановлением Правительства РФ № 140.
  </p>
  <p class="a4-p">
    2.3. Проведение взаимных финансовых расчетов, выдача кассовых чеков по 54-ФЗ, справок об оплате медицинских услуг для ФНС (КНД 1151156), информирование о времени приемов и профилактических осмотрах.
  </p>

  <div class="a4-section-heading">3. Способы обработки и конфиденциальность</div>
  <p class="a4-p">
    3.1. Обработка включает: сбор, запись, систематизацию, накопление, хранение, уточнение (обновление, изменение), извлечение, использование, передачу (предоставление уполномоченным органам в случаях, установленных законом РФ), обезличивание, блокирование, удаление, уничтожение с использованием средств автоматизации (МИС/CRM) и без их использования.
  </p>
  <p class="a4-p">
    3.2. Оператор обеспечивает соблюдение врачебной тайны (ст. 13 323-ФЗ) и принимает необходимые организационные и технические меры для защиты персональных данных в соответствии с требованиями ст. 19 152-ФЗ.
  </p>

  <div class="a4-section-heading">4. Срок действия согласия и порядок его отзыва</div>
  <p class="a4-p">
    4.1. Настоящее согласие действует с момента подписания в течение всего срока оказания услуг и нормативного срока архивного хранения медицинской документации — <strong>25 лет</strong> в соответствии с правилами Минздрава России.
  </p>
  <p class="a4-p">
    4.2. Согласие может быть отозвано путем подачи письменного заявления Оператору. При отзыве согласия Оператор вправе продолжить обработку персональных данных на основаниях, предусмотренных п. 2-11 ч. 1 ст. 6 и ч. 2 ст. 10 152-ФЗ (в целях защиты жизни, здоровья, исполнения договора и установленных законом обязанностей).
  </p>

  <div class="a4-sign-grid">
    <div class="a4-sign-col">
      <strong>ОПЕРАТОР ПЕРСОНАЛЬНЫХ ДАННЫХ:</strong><br>
      ${escapeHtml(cl.legalName || cl.name)}<br>
      Адрес: ${escapeHtml(cl.actualAddress || cl.address || formatAddressString(null))}<br>
      ИНН: ${escapeHtml(cl.inn || "____________")}, ОГРН: ${escapeHtml(cl.ogrn || "____________")}<br>
      <div class="a4-sign-line"></div>
      <div class="a4-sign-hint">/ Уполномоченное лицо Оператора / <span class="stamp-box">М.П.</span></div>
    </div>
    <div class="a4-sign-col">
      <strong>СУБЪЕКТ ПЕРСОНАЛЬНЫХ ДАННЫХ:</strong><br>
      <strong>${escapeHtml(cust.fullName)}</strong><br>
      Паспорт: ${escapeHtml(formatPassportString(cust))}<br>
      Подпись субъекта (Пациента):<br>
      <div class="a4-sign-line"></div>
      <div class="a4-sign-hint">/ ${escapeHtml(cust.fullName)} /</div>
    </div>
  </div>

  ${renderRunningFooterHtml(docLabel, 1, 1)}
</div>

</body>
</html>`;
}
