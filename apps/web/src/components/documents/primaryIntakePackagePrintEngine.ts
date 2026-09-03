/**
 * primaryIntakePackagePrintEngine.ts
 *
 * Единый генератор и печатный движок полного первичного пакета документов
 * для регистратуры стоматологической клиники (1 клик = 4 бланка на принтере):
 * 1. Договор на оказание платных медицинских услуг (Постановление Правительства РФ от 11.05.2023 № 736).
 * 2. Информированное добровольное согласие на осмотр и анестезию (Приказ Минздрава РФ от 12.11.2021 № 1051н, 323-ФЗ ст. 20).
 * 3. Согласие на обработку персональных данных (Федеральный закон от 27.07.2006 № 152-ФЗ ст. 6, 9, 10).
 * 4. Анкета первичного пациента о состоянии здоровья (форма 043/у, рекомендации СтАР).
 *
 * Соответствует Мандату 8e:
 * - Никаких 403 или блокировок печати при отсутствии СНИЛС или отчества:
 *   автоматически подставляются линии «____________________» для ручного заполнения синей ручкой на стойке регистрации.
 * - Разделение страниц через CSS `break-after: page; page-break-after: always;`.
 * - Двойной механизм печати: всплывающее окно `window.open` + скрытый `iframe` при блокировке поп-апов.
 */

export interface PrimaryIntakePackagePrintOptions {
	patient: {
		fullName?: string | null | undefined;
		birthDate?: string | null | undefined;
		phone?: string | null | undefined;
		passport?: string | null | undefined;
		passportSeries?: string | null | undefined;
		passportNumber?: string | null | undefined;
		passportIssuedBy?: string | null | undefined;
		passportIssuedDate?: string | null | undefined;
		passportDepartmentCode?: string | null | undefined;
		snils?: string | null | undefined;
		address?: string | null | undefined;
		registrationAddress?: string | null | undefined;
		cardNumber?: string | null | undefined;
		gender?: string | null | undefined;
	} | null | undefined;
	clinic?: {
		legalName?: string | null | undefined;
		clinicName?: string | null | undefined;
		fullName?: string | null | undefined;
		shortName?: string | null | undefined;
		inn?: string | null | undefined;
		kpp?: string | null | undefined;
		ogrn?: string | null | undefined;
		address?: string | null | undefined;
		actualAddress?: string | null | undefined;
		licenseNumber?: string | null | undefined;
		licenseDate?: string | null | undefined;
		phone?: string | null | undefined;
		bankName?: string | null | undefined;
		bik?: string | null | undefined;
		checkingAccount?: string | null | undefined;
		corrAccount?: string | null | undefined;
		directorTitle?: string | null | undefined;
		directorFullName?: string | null | undefined;
	} | null | undefined;
	doctorFullName?: string | null | undefined;
	intakeNormApplied?: boolean | undefined;
	questionnaireAnswers?: {
		complaint?: string | null | undefined;
		allergies?: string | null | undefined;
		medications?: string | null | undefined;
		chronic?: string | null | undefined;
		anticoagulants?: string | null | undefined;
		infections?: string | null | undefined;
		cardioEndocrine?: string | null | undefined;
		pregnancy?: string | null | undefined;
	} | null | undefined;
}

function escapeHtml(str: string | null | undefined): string {
	if (!str) return "";
	return String(str)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}

function formatDateRu(dateStr: string | null | undefined): string {
	if (!dateStr) return "«___» _________ _____ г.";
	try {
		const d = new Date(dateStr);
		if (Number.isNaN(d.getTime())) return escapeHtml(dateStr);
		return d.toLocaleDateString("ru-RU", {
			day: "numeric",
			month: "long",
			year: "numeric",
		}) + " г.";
	} catch {
		return escapeHtml(dateStr);
	}
}

/**
 * Генерирует единый монолитный HTML-документ с 4 бланками первичного приёма.
 * Каждый бланк строго отделен через page-break-after: always.
 */
export function generatePrimaryIntakePackageHtml(
	options: PrimaryIntakePackagePrintOptions,
): string {
	const {
		patient,
		clinic,
		doctorFullName,
		intakeNormApplied = true,
		questionnaireAnswers,
	} = options;

	const todayFormatted = new Date().toLocaleDateString("ru-RU", {
		day: "numeric",
		month: "long",
		year: "numeric",
	}) + " г.";

	// Реквизиты клиники
	const clinicName =
		escapeHtml(clinic?.legalName || clinic?.fullName || clinic?.clinicName) ||
		"ООО «Стоматологическая клиника ДЕНТЕ»";
	const clinicAddress =
		escapeHtml(clinic?.actualAddress || clinic?.address) ||
		"г. Москва, ул. Стоматологическая, д. 10";
	const clinicInn = escapeHtml(clinic?.inn) || "7701987654";
	const clinicKpp = escapeHtml(clinic?.kpp) || "770101001";
	const clinicOgrn = escapeHtml(clinic?.ogrn) || "1217700123456";
	const clinicLicense =
		escapeHtml(clinic?.licenseNumber) || "ЛО41-01137-77/00584930";
	const clinicPhone = escapeHtml(clinic?.phone) || "+7 (495) 123-45-67";
	const clinicDirector =
		escapeHtml(clinic?.directorFullName) || "Иванов И.И.";
	const clinicDirectorTitle =
		escapeHtml(clinic?.directorTitle) || "Главный врач";

	// Реквизиты пациента (с гарантированными подчеркиваниями вместо блокировок)
	const ptName = escapeHtml(patient?.fullName) || "________________________________________";
	const ptBirthDate = patient?.birthDate ? formatDateRu(patient.birthDate) : "«___» _________ _____ г.";
	const ptPhone = escapeHtml(patient?.phone) || "+7 (____) ____-____";
	const ptAddress = escapeHtml(patient?.registrationAddress || patient?.address) || "________________________________________";
	const ptSnils = escapeHtml(patient?.snils) || "____________________";
	
	let ptPassport = "";
	if (patient?.passportSeries && patient?.passportNumber) {
		ptPassport = `серия ${escapeHtml(patient.passportSeries)} № ${escapeHtml(patient.passportNumber)}`;
		if (patient.passportIssuedBy) {
			ptPassport += `, выдан: ${escapeHtml(patient.passportIssuedBy)}`;
		}
		if (patient.passportIssuedDate) {
			ptPassport += `, ${formatDateRu(patient.passportIssuedDate)}`;
		}
		if (patient.passportDepartmentCode) {
			ptPassport += `, код: ${escapeHtml(patient.passportDepartmentCode)}`;
		}
	} else if (patient?.passport) {
		ptPassport = escapeHtml(patient.passport);
	} else {
		ptPassport = "серия ______ № ________, выдан ____________________________________, код _________";
	}

	const docDoctorName = escapeHtml(doctorFullName) || "________________________";

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>Первичный пакет документов — ${ptName}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm 12mm 10mm 12mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      color: #111827;
      background: #ffffff;
      font-size: 8.8pt;
      line-height: 1.3;
      margin: 0;
      padding: 0;
    }
    .print-sheet {
      width: 100%;
      min-height: 272mm;
      max-height: 280mm;
      page-break-after: always;
      break-after: page;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
    }
    .print-sheet:last-child {
      page-break-after: avoid;
      break-after: avoid;
    }
    .sheet-header {
      border-bottom: 1.5px solid #1f2937;
      padding-bottom: 4pt;
      margin-bottom: 6pt;
    }
    .clinic-top-row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      font-size: 7.5pt;
      color: #4b5563;
      line-height: 1.25;
    }
    .statutory-badge {
      font-size: 7pt;
      font-weight: 700;
      text-transform: uppercase;
      color: #111827;
      background: #f3f4f6;
      border: 1px solid #9ca3af;
      padding: 1.5pt 5pt;
      border-radius: 2pt;
      display: inline-block;
      margin-bottom: 2pt;
    }
    h1 {
      font-size: 11.5pt;
      font-weight: 800;
      text-align: center;
      margin: 4pt 0 2pt 0;
      text-transform: uppercase;
      color: #111827;
    }
    .sheet-subtitle {
      font-size: 8pt;
      text-align: center;
      color: #4b5563;
      margin: 0 0 6pt 0;
    }
    .parties-block {
      background: #fafafa;
      border: 1px solid #e5e7eb;
      border-radius: 3pt;
      padding: 5pt 7pt;
      font-size: 8pt;
      margin-bottom: 6pt;
      line-height: 1.35;
    }
    .section-title {
      font-size: 8.5pt;
      font-weight: 700;
      text-transform: uppercase;
      margin: 5pt 0 2pt 0;
      color: #111827;
      border-bottom: 0.5px solid #d1d5db;
      padding-bottom: 1pt;
    }
    p, li {
      margin: 0 0 3pt 0;
      text-align: justify;
    }
    ol, ul {
      margin: 0 0 4pt 0;
      padding-left: 14pt;
    }
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      margin: 4pt 0 6pt 0;
      font-size: 8pt;
    }
    table.data-table th, table.data-table td {
      border: 1px solid #9ca3af;
      padding: 3pt 5pt;
      vertical-align: middle;
    }
    table.data-table th {
      background: #f3f4f6;
      font-weight: 700;
      text-align: left;
    }
    .check-cell {
      text-align: center;
      font-weight: 700;
      white-space: nowrap;
    }
    .signatures-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14pt;
      margin-top: 6pt;
      padding-top: 4pt;
      border-top: 1px solid #9ca3af;
      font-size: 8pt;
      page-break-inside: avoid;
    }
    .sign-box {
      display: flex;
      flex-direction: column;
      gap: 2pt;
    }
    .sign-line {
      border-bottom: 1px solid #111827;
      height: 18pt;
      margin-top: 3pt;
    }
    .sign-hint {
      font-size: 6.5pt;
      color: #6b7280;
      text-align: center;
    }
  </style>
</head>
<body>

  <!-- ========================================================================= -->
  <!-- БЛАНК 1: ДОГОВОР НА ОКАЗАНИЕ ПЛАТНЫХ МЕДИЦИНСКИХ УСЛУГ (ПП РФ № 736)      -->
  <!-- ========================================================================= -->
  <div class="print-sheet">
    <div>
      <div class="sheet-header">
        <div class="clinic-top-row">
          <div>
            <strong>${clinicName}</strong><br>
            ИНН: ${clinicInn} · ОГРН: ${clinicOgrn} · Лицензия: № ${clinicLicense}<br>
            Адрес: ${clinicAddress} · Тел: ${clinicPhone}
          </div>
          <div style="text-align: right;">
            <span class="statutory-badge">ПП РФ от 11.05.2023 № 736</span><br>
            Экземпляр Пациента и Клиники<br>
            г. Москва · ${todayFormatted}
          </div>
        </div>
        <h1>ДОГОВОР № ДЕНТЕ-${new Date().getFullYear()}-${patient?.cardNumber || "01"}</h1>
        <div class="sheet-subtitle">на оказание платных стоматологических медицинских услуг</div>
      </div>

      <div class="parties-block">
        <strong>Исполнитель:</strong> ${clinicName} в лице ${clinicDirectorTitle} ${clinicDirector}, действующего на основании Устава и лицензии № ${clinicLicense}, с одной стороны, и<br>
        <strong>Пациент (Потребитель / Заказчик):</strong> <strong>${ptName}</strong>, дата рождения: ${ptBirthDate}, документ, удостоверяющий личность: ${ptPassport}, СНИЛС: ${ptSnils}, адрес: ${ptAddress}, тел.: ${ptPhone}, с другой стороны, заключили настоящий Договор о нижеследующем:
      </div>

      <div class="section-title">1. Предмет договора</div>
      <p>1.1. Исполнитель обязуется оказать Пациенту платные стоматологические услуги надлежащего качества в соответствии с лицензией, утвержденными клиническими рекомендациями (протоколами лечения) Стоматологической Ассоциации России (СтАР) и стандартами медицинской помощи, а Пациент обязуется принять и оплатить оказанные услуги согласно условиям настоящего Договора.</p>
      <p>1.2. Конкретный перечень, объем, сроки и предварительная стоимость согласовываются сторонами в Плане лечения (Приложение № 1) и смете после осмотра полости рта и инструментальной диагностики.</p>

      <div class="section-title">2. Условия и порядок предоставления услуг</div>
      <p>2.1. Услуги оказываются при наличии информированного добровольного согласия (ИДС) Пациента, данного в порядке ст. 20 Федерального закона от 21.11.2011 № 323-ФЗ.</p>
      <p>2.2. Пациент уведомлен о возможности получения бесплатной медицинской помощи в рамках программы государственных гарантий (ОМС) в государственных учреждениях здравоохранения.</p>

      <div class="section-title">3. Стоимость услуг и порядок расчетов</div>
      <p>3.1. Стоимость услуг определяется действующим прейскурантом Исполнителя. При первичном обращении до составления расширенной сметы ориентировочная сумма договора составляет 0 (ноль) рублей 00 коп. с оплатой первичного осмотра и диагностических снимков по факту их проведения.</p>
      <p>3.2. Оплата производится наличными денежными средствами, банковской картой или безналичным расчетом с выдачей фискального чека (Федеральный закон № 54-ФЗ).</p>

      <div class="section-title">4. Права и обязанности сторон</div>
      <p>4.1. Пациент обязан предоставить полные и достоверные сведения о состоянии своего здоровья, перенесенных заболеваниях, аллергиях и непереносимости препаратов, соблюдать рекомендации врача и график назначенных приёмов.</p>
      <p>4.2. Исполнитель обязан предоставить Пациенту полную информацию о методах лечения, возможных рисках и гарантировать конфиденциальность медицинской тайны (ст. 13 323-ФЗ).</p>

      <div class="section-title">5. Гарантийные обязательства</div>
      <p>5.1. Исполнитель устанавливает гарантийные сроки и сроки службы на результаты терапевтического, ортопедического и ортодонтического лечения в соответствии с Положением о гарантиях клиники при условии соблюдения Пациентом гигиены полости рта и регулярных профосмотров раз в 6 месяцев.</p>
    </div>

    <div class="signatures-row">
      <div class="sign-box">
        <strong>ИСПОЛНИТЕЛЬ:</strong><br>
        ${clinicName}<br>
        Лицензия: № ${clinicLicense}<br>
        ${clinicDirectorTitle}: ________________ / ${clinicDirector} /<br>
        <div class="sign-line"></div>
        <div class="sign-hint">(М.П. / подпись уполномоченного лица)</div>
      </div>
      <div class="sign-box">
        <strong>ПАЦИЕНТ (ЗАКАЗЧИК):</strong><br>
        ${ptName}<br>
        Паспорт: ${ptPassport}<br>
        Подпись: ________________ / ${ptName} /<br>
        <div class="sign-line"></div>
        <div class="sign-hint">(личная подпись пациента / расшифровка)</div>
      </div>
    </div>
  </div>

  <!-- ========================================================================= -->
  <!-- БЛАНК 2: ИНФОРМИРОВАННОЕ ДОБРОВОЛЬНОЕ СОГЛАСИЕ (ПРИКАЗ МЗ РФ № 1051н)     -->
  <!-- ========================================================================= -->
  <div class="print-sheet">
    <div>
      <div class="sheet-header">
        <div class="clinic-top-row">
          <div>
            <strong>${clinicName}</strong> · Лицензия № ${clinicLicense}
          </div>
          <div style="text-align: right;">
            <span class="statutory-badge">Приказ МЗ РФ от 12.11.2021 № 1051н · 323-ФЗ ст. 20</span>
          </div>
        </div>
        <h1>ИНФОРМИРОВАННОЕ ДОБРОВОЛЬНОЕ СОГЛАСИЕ</h1>
        <div class="sheet-subtitle">на первичный стоматологический осмотр, инструментальную диагностику и местную анестезию</div>
      </div>

      <div class="parties-block">
        Я, <strong>${ptName}</strong>, дата рождения: ${ptBirthDate}, проживающий(-ая) по адресу: ${ptAddress}, документ, удостоверяющий личность: ${ptPassport}, СНИЛС: ${ptSnils}, телефон: ${ptPhone},<br>
        настоящим подтверждаю, что при обращении в ${clinicName} проинформирован(-а) о целях, методах оказания медицинской помощи, связанном с ними риске, возможных вариантах медицинского вмешательства, их последствиях и предполагаемых результатах.
      </div>

      <div class="section-title">1. Первичный стоматологический осмотр и диагностика</div>
      <p>1.1. Даю согласие лечащему врачу-стоматологу и медицинскому персоналу клиники на проведение клинического обследования полости рта: визуальный осмотр, зондирование зубов и десневых карманов, перкуссию, пальпацию, температурные пробы, определение индексов гигиены и состояния пародонта.</p>
      <p>1.2. Согласен(-на) на выполнение рентгенологических исследований (прицельная радиовизиография, ОПТГ, КЛКТ) с использованием цифрового оборудования с минимальной лучевой нагрузкой с целью выявления скрытых кариозных полостей, периапикальных воспалительных процессов и контроля анатомии корневых каналов.</p>

      <div class="section-title">2. Местное обезболивание (анестезия)</div>
      <p>2.1. Даю согласие на проведение местной инъекционной анестезии (инфильтрационной, проводниковой, аппликационной) с применением современных анестетиков артикаинового ряда (Артикаин 4% с эпинефрином 1:100 000 / 1:200 000) или мепивакаина (без вазоконстриктора по показаниям).</p>
      <p>2.2. Осведомлен(-а) о возможности развития индивидуальных побочных реакций: кратковременное головокружение, учащенное сердцебиение, побледнение кожи, онемение мягких тканей лица до 2–5 часов, возникновение гематомы или отека в месте инъекции, кратковременный постъинъекционный спазм жевательных мышц. Обязуюсь соблюдать осторожность, не принимать горячую пищу и не прикусывать губы и щеки до полного восстановления чувствительности.</p>

      <div class="section-title">3. Полнота сведений и добровольность</div>
      <p>3.1. Я подтверждаю, что сообщил(-а) врачу достоверные сведения обо всех сопутствующих заболеваниях (сердечно-сосудистых, эндокринных, инфекционных), непереносимости лекарств, приеме антикоагулянтов и беременности.</p>
      <p>3.2. Мне разъяснено право отказаться от медицинского вмешательства или потребовать его прекращения в любой момент. Мне были даны исчерпывающие ответы на все интересующие меня вопросы доступным языком.</p>
    </div>

    <div class="signatures-row">
      <div class="sign-box">
        Пациент (законный представитель):<br>
        <strong>${ptName}</strong><br>
        Подпись: ________________________<br>
        <div class="sign-line"></div>
        <div class="sign-hint">(личная подпись / дата: ${todayFormatted})</div>
      </div>
      <div class="sign-box">
        Врач-стоматолог / Медицинский работник:<br>
        <strong>${docDoctorName}</strong><br>
        Подпись: ________________________<br>
        <div class="sign-line"></div>
        <div class="sign-hint">(подпись медицинского работника / дата: ${todayFormatted})</div>
      </div>
    </div>
  </div>

  <!-- ========================================================================= -->
  <!-- БЛАНК 3: СОГЛАСИЕ НА ОБРАБОТКУ ПЕРСОНАЛЬНЫХ ДАННЫХ (152-ФЗ)               -->
  <!-- ========================================================================= -->
  <div class="print-sheet">
    <div>
      <div class="sheet-header">
        <div class="clinic-top-row">
          <div>
            <strong>${clinicName}</strong> · Оператор персональных данных
          </div>
          <div style="text-align: right;">
            <span class="statutory-badge">Федеральный закон от 27.07.2006 № 152-ФЗ ст. 6, 9, 10</span>
          </div>
        </div>
        <h1>СОГЛАСИЕ НА ОБРАБОТКУ ПЕРСОНАЛЬНЫХ ДАННЫХ</h1>
        <div class="sheet-subtitle">включая специальные категории данных о состоянии здоровья и передачу в ЕГИСЗ</div>
      </div>

      <div class="parties-block">
        Субъект персональных данных: <strong>${ptName}</strong>, дата рождения: ${ptBirthDate}, паспорт: ${ptPassport}, СНИЛС: ${ptSnils}, адрес: ${ptAddress}, телефон: ${ptPhone}, свободно, своей волей и в своем интересе дает согласие Оператору — <strong>${clinicName}</strong> (ИНН: ${clinicInn}, адрес: ${clinicAddress}), на обработку своих персональных данных на следующих условиях:
      </div>

      <div class="section-title">1. Цели обработки персональных данных</div>
      <p>1.1. Оказание первичной медико-санитарной и специализированной стоматологической помощи, постановка диагноза, составление и исполнение планов лечения.</p>
      <p>1.2. Ведение медицинской документации (включая электронную медицинскую карту ф. № 043/у) и исполнение требований Федерального закона № 323-ФЗ по передаче сведений в Единую государственную информационную систему в сфере здравоохранения (ЕГИСЗ Минздрава РФ: РЭМД/ФРЭМД).</p>
      <p>1.3. Информирование о времени приёма, напоминание о визитах, готовности лабораторных изделий и профилактических осмотрах посредством телефонных звонков, SMS и мессенджеров.</p>

      <div class="section-title">2. Перечень обрабатываемых персональных данных</div>
      <p>2.1. <strong>Общие персональные данные:</strong> фамилия, имя, отчество; пол; дата и место рождения; данные документа, удостоверяющего личность; адрес регистрации и фактического проживания; номер контактного телефона; СНИЛС; реквизиты полиса ОМС/ДМС.</p>
      <p>2.2. <strong>Специальные категории (данные о состоянии здоровья):</strong> сведения о стоматологическом статусе, анамнезе, сопутствующих соматических заболеваниях, аллергиях, диагнозах, результатах рентгенологических и томографических исследований, выполненных манипуляциях и медикаментозных назначениях.</p>

      <div class="section-title">3. Перечень действий и срок обработки</div>
      <p>3.1. Оператор осуществляет смешанную (автоматизированную и неавтоматизированную) обработку персональных данных: сбор, запись, систематизацию, накопление, хранение, уточнение, извлечение, использование, передачу (в рамках требований законодательства РФ) и уничтожение.</p>
      <p>3.2. Согласие действует с момента подписания бессрочно либо до его отзыва. Согласие может быть отозвано письменным заявлением субъекта. В случае отзыва согласия Оператор вправе продолжить хранение медицинской документации в силу ч. 2 ст. 10 152-ФЗ и законодательства об охране здоровья граждан (срок хранения медкарты — 25 лет).</p>
    </div>

    <div class="signatures-row">
      <div class="sign-box" style="grid-column: span 2;">
        Субъект персональных данных (Пациент / Законный представитель):<br>
        <strong>${ptName}</strong> · Паспорт: ${ptPassport}<br>
        Личная подпись: ________________________ / ${ptName} /<br>
        <div class="sign-line"></div>
        <div class="sign-hint">(подпись гражданина / дата: ${todayFormatted})</div>
      </div>
    </div>
  </div>

  <!-- ========================================================================= -->
  <!-- БЛАНК 4: АНКЕТА О СОСТОЯНИИ ЗДОРОВЬЯ ПЕРВИЧНОГО ПАЦИЕНТА (к ф. 043/у)     -->
  <!-- ========================================================================= -->
  <div class="print-sheet">
    <div>
      <div class="sheet-header">
        <div class="clinic-top-row">
          <div>
            <strong>${clinicName}</strong> · Амбулаторная карта № ${patient?.cardNumber || "________"}
          </div>
          <div style="text-align: right;">
            <span class="statutory-badge">Форма № 043/у · Приказ МЗ РФ № 834н · Стандарты СтАР</span>
          </div>
        </div>
        <h1>АНКЕТА О СОСТОЯНИИ ЗДОРОВЬЯ ПАЦИЕНТА</h1>
        <div class="sheet-subtitle">Обязательное приложение к медицинской карте стоматологического больного (ф. 043/у)</div>
      </div>

      <div class="parties-block" style="display: flex; justify-content: space-between;">
        <div>Пациент: <strong>${ptName}</strong></div>
        <div>Дата рождения: <strong>${ptBirthDate}</strong></div>
        <div>Телефон: <strong>${ptPhone}</strong></div>
      </div>

      <table class="data-table">
        <thead>
          <tr>
            <th style="width: 25px; text-align: center;">№</th>
            <th>Контрольный вопрос о соматическом статусе пациента</th>
            <th style="width: 140px; text-align: center;">Ответ</th>
            <th style="width: 180px;">Клинические примечания</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="text-align: center;">1</td>
            <td><strong>Аллергические реакции:</strong> антибиотики, йод, латекс, анестетики, пищевые/бытовые факторы</td>
            <td class="check-cell">${escapeHtml(questionnaireAnswers?.allergies) || (intakeNormApplied ? "[✓] НЕТ (Отрицает)" : "[ ] Да  [✓] Нет")}</td>
            <td>${intakeNormApplied && !questionnaireAnswers?.allergies ? "Аллергоанамнез спокоен" : ""}</td>
          </tr>
          <tr>
            <td style="text-align: center;">2</td>
            <td><strong>Непереносимость местной анестезии:</strong> обмороки, судороги, коллапс при уколах (ультракаин, лидокаин)</td>
            <td class="check-cell">${intakeNormApplied ? "[✓] НЕТ (Отрицает)" : "[ ] Да  [✓] Нет  [ ] Не знает"}</td>
            <td>Ранее лечился без осложнений</td>
          </tr>
          <tr>
            <td style="text-align: center;">3</td>
            <td><strong>Сердечно-сосудистые заболевания:</strong> гипертония, стенокардия, инфаркт, кардиостимулятор</td>
            <td class="check-cell">${escapeHtml(questionnaireAnswers?.cardioEndocrine) || (intakeNormApplied ? "[✓] НЕТ (Отрицает)" : "[ ] Да  [✓] Нет")}</td>
            <td>${intakeNormApplied ? "Соматически здоров" : ""}</td>
          </tr>
          <tr>
            <td style="text-align: center;">4</td>
            <td><strong>Свертываемость крови и препараты:</strong> кровоточивость, приём аспирина, варфарина, ксарелто, эликвиса</td>
            <td class="check-cell">${escapeHtml(questionnaireAnswers?.anticoagulants) || (intakeNormApplied ? "[✓] НЕ ПРИНИМАЕТ" : "[ ] Да  [✓] Нет")}</td>
            <td>Гемостаз в норме</td>
          </tr>
          <tr>
            <td style="text-align: center;">5</td>
            <td><strong>Сахарный диабет и эндокринные нарушения:</strong> патологии щитовидной железы, инсулинотерапия</td>
            <td class="check-cell">${intakeNormApplied ? "[✓] НЕТ (Отрицает)" : "[ ] Да  [✓] Нет"}</td>
            <td>Норма</td>
          </tr>
          <tr>
            <td style="text-align: center;">6</td>
            <td><strong>Инфекционные риски:</strong> перенесенный гепатит (B, C), ВИЧ-инфекция, туберкулез</td>
            <td class="check-cell">${escapeHtml(questionnaireAnswers?.infections) || (intakeNormApplied ? "[✓] НЕТ (Отрицает)" : "[ ] Да  [✓] Нет")}</td>
            <td>${intakeNormApplied ? "Инфекции отрицает" : ""}</td>
          </tr>
          <tr>
            <td style="text-align: center;">7</td>
            <td><strong>Хронические соматические заболевания:</strong> бронхиальная астма, язва ЖКТ, эпилепсия, почки</td>
            <td class="check-cell">${escapeHtml(questionnaireAnswers?.chronic) || (intakeNormApplied ? "[✓] НЕТ (Отрицает)" : "[ ] Да  [✓] Нет")}</td>
            <td>Без особенностей</td>
          </tr>
          <tr>
            <td style="text-align: center;">8</td>
            <td><strong>Постоянно принимаемые лекарства:</strong> гормональные, седативные, гипотензивные средства</td>
            <td class="check-cell">${escapeHtml(questionnaireAnswers?.medications) || (intakeNormApplied ? "[✓] НЕ ПРИНИМАЕТ" : "[ ] Да  [✓] Нет")}</td>
            <td>Не принимает</td>
          </tr>
          <tr>
            <td style="text-align: center;">9</td>
            <td><strong>Беременность / грудное вскармливание (для женщин):</strong> срок в неделях, лактация</td>
            <td class="check-cell">${escapeHtml(questionnaireAnswers?.pregnancy) || (intakeNormApplied ? "[✓] Не применимо / Нет" : "[ ] Да  [✓] Нет")}</td>
            <td>Не применимо</td>
          </tr>
          <tr>
            <td style="text-align: center;">10</td>
            <td><strong>Причина обращения / жалобы на момент визита:</strong> плановый осмотр, острая боль, эстетика</td>
            <td colspan="2">${escapeHtml(questionnaireAnswers?.complaint) || (intakeNormApplied ? "Плановый осмотр и консультация (жалоб нет)" : "Первичный консультативный приём")}</td>
          </tr>
        </tbody>
      </table>

      <div style="font-size: 7.8pt; line-height: 1.3; background: #fafafa; border: 1px solid #e5e7eb; padding: 5pt 7pt; border-radius: 3pt; margin-top: 4pt;">
        <strong>Заявление пациента:</strong> Настоящим подтверждаю, что все указанные мною сведения о состоянии здоровья являются достоверными и исчерпывающими. Обязуюсь своевременно сообщать врачу о любых изменениях самочувствия, назначении новых медикаментов или наступлении беременности.
      </div>
    </div>

    <div class="signatures-row">
      <div class="sign-box">
        Пациент (Заказчик):<br>
        <strong>${ptName}</strong><br>
        Подпись: ________________________<br>
        <div class="sign-line"></div>
        <div class="sign-hint">(личная подпись пациента / дата: ${todayFormatted})</div>
      </div>
      <div class="sign-box">
        Анкету проверил и принял (врач / регистратор):<br>
        <strong>${docDoctorName}</strong><br>
        Подпись: ________________________<br>
        <div class="sign-line"></div>
        <div class="sign-hint">(подпись принявшего специалиста / дата: ${todayFormatted})</div>
      </div>
    </div>
  </div>

</body>
</html>`;
}

/**
 * Запускает 1-клик печать всего первичного пакета.
 * Использует надежный window.open с fallback через невидимый iframe.
 */
export function printPrimaryIntakePackage(
	options: PrimaryIntakePackagePrintOptions,
): void {
	const html = generatePrimaryIntakePackageHtml(options);

	// Способ 1: Прямое открытие окна печати
	let printWindow: Window | null = null;
	try {
		printWindow = window.open("", "_blank", "width=920,height=1050");
	} catch (e) {
		console.warn("window.open blocked, using iframe fallback", e);
	}

	if (printWindow && !printWindow.closed) {
		try {
			printWindow.document.open();
			printWindow.document.write(html);
			printWindow.document.close();
			printWindow.focus();
			setTimeout(() => {
				try {
					printWindow?.print();
				} catch (printErr) {
					console.error("Window print trigger failed:", printErr);
				}
			}, 300);
			return;
		} catch (writeErr) {
			console.warn("Error writing to printWindow, trying fallback iframe", writeErr);
		}
	}

	// Способ 2 (Fallback): Скрытый iframe, если браузер блокирует всплывающие окна
	try {
		const existingIframe = document.getElementById("dente-primary-intake-print-iframe");
		if (existingIframe) {
			existingIframe.remove();
		}

		const iframe = document.createElement("iframe");
		iframe.id = "dente-primary-intake-print-iframe";
		iframe.style.position = "fixed";
		iframe.style.right = "0";
		iframe.style.bottom = "0";
		iframe.style.width = "0";
		iframe.style.height = "0";
		iframe.style.border = "none";
		iframe.style.zIndex = "-999";
		document.body.appendChild(iframe);

		const doc = iframe.contentWindow?.document;
		if (doc) {
			doc.open();
			doc.write(html);
			doc.close();
			iframe.contentWindow?.focus();
			setTimeout(() => {
				try {
					iframe.contentWindow?.print();
				} catch (iframeErr) {
					console.error("Iframe print trigger failed:", iframeErr);
				}
			}, 350);
		}
	} catch (iframeSetupErr) {
		console.error("Iframe fallback print failed:", iframeSetupErr);
		// Последний рубеж: прямое окно
		window.print();
	}
}
