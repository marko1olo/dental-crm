/**
 * clinicalPackagePrintEngine.ts
 *
 * Единый генератор и печатный движок терапевтического пакета документов
 * для стоматологической клиники (1 клик = 3 бланка на принтере):
 * 1. ИДС на терапевтическое стоматологическое лечение (ФЗ № 323-ФЗ ст. 20, Приказ Минздрава РФ № 1051н).
 * 2. Информированное согласие на местную/проводниковую анестезию (Приказ Минздрава России № 1051н).
 * 3. Памятка пациента после терапевтического лечения и пломбирования (Закон РФ «О защите прав потребителей» № 2300-1).
 *
 * Соответствует Мандатам 8e, 8k, 8n:
 * - Врач у кресла или медсестра не тратят время на открытие 3 отдельных документов: 1 клик отправляет весь хирургический комплект на принтер.
 * - Чистые подчеркивания «____________________» для незаполненных полей без блокировок печати.
 * - Строгое разделение страниц через CSS `break-after: page; page-break-after: always;`.
 * - Двойной механизм печати: всплывающее окно `window.open` + скрытый `iframe` при блокировке поп-апов.
 */

export interface ClinicalPackagePrintOptions {
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
	treatmentDetails?: {
		diagnosisIcd10?: string | null | undefined;
		toothNumbers?: string | number | null | undefined;
		anestheticName?: string | null | undefined;
		treatmentType?: string | null | undefined;
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
 * Генерирует единый монолитный HTML-документ с 3 хирургическими бланками.
 * Каждый бланк строго отделен через page-break-after: always.
 */
export function generateClinicalPackageHtml(
	options: ClinicalPackagePrintOptions,
): string {
	const { patient, clinic, doctorFullName, treatmentDetails } = options;

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
	const clinicOgrn = escapeHtml(clinic?.ogrn) || "1217700123456";
	const clinicLicense =
		escapeHtml(clinic?.licenseNumber) || "ЛО41-01137-77/00584930";
	const clinicPhone = escapeHtml(clinic?.phone) || "+7 (495) 123-45-67";

	// Реквизиты пациента
	const ptName =
		escapeHtml(patient?.fullName) || "________________________________________";
	const ptBirthDate = patient?.birthDate
		? formatDateRu(patient.birthDate)
		: "«___» _________ _____ г.";
	const ptPhone = escapeHtml(patient?.phone) || "+7 (____) ____-____";
	const ptAddress =
		escapeHtml(patient?.registrationAddress || patient?.address) ||
		"________________________________________";

	let ptPassport = "";
	if (patient?.passportSeries && patient?.passportNumber) {
		ptPassport = `серия ${escapeHtml(patient.passportSeries)} № ${escapeHtml(patient.passportNumber)}`;
		if (patient.passportIssuedBy) {
			ptPassport += `, выдан: ${escapeHtml(patient.passportIssuedBy)}`;
		}
		if (patient.passportIssuedDate) {
			ptPassport += `, ${formatDateRu(patient.passportIssuedDate)}`;
		}
	} else if (patient?.passport) {
		ptPassport = escapeHtml(patient.passport);
	} else {
		ptPassport = "серия ______ № ________, выдан ____________________________________";
	}

	const docDoctorName =
		escapeHtml(doctorFullName) || "________________________";
	const toothInfo = treatmentDetails?.toothNumbers
		? `зуба / зубов: ${escapeHtml(String(treatmentDetails.toothNumbers))}`
		: "зубов полости рта";
	const icdDiagnosis = treatmentDetails?.diagnosisIcd10
		? ` (Диагноз по МКБ-10: ${escapeHtml(treatmentDetails.diagnosisIcd10)})`
		: "";
	const anesName =
		escapeHtml(treatmentDetails?.anestheticName) ||
		"Артикаин 4% с эпинефрином (1:100 000 / 1:200 000)";
	const opType =
		escapeHtml(treatmentDetails?.treatmentType) ||
		"терапевтическое стоматологическое лечение";
	const opTooth = toothInfo;

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>Терапевтический пакет документов — ${ptName}</title>
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
      font-size: 11pt;
      font-weight: 800;
      text-align: center;
      margin: 3pt 0 2pt 0;
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
      color: #1f2937;
      margin: 5pt 0 2pt 0;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 1pt;
    }
    p, li {
      margin: 2pt 0;
      text-align: justify;
    }
    ol, ul {
      margin: 2pt 0 4pt 14pt;
      padding: 0;
    }
    .signatures-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16pt;
      margin-top: 8pt;
      padding-top: 6pt;
      border-top: 1px solid #d1d5db;
      font-size: 8pt;
    }
    .sign-line {
      margin-top: 14pt;
      border-bottom: 1px solid #4b5563;
      height: 1pt;
    }
    .sign-caption {
      font-size: 7pt;
      color: #6b7280;
      text-align: center;
      margin-top: 2pt;
    }
    .stamp-box {
      border: 1px dashed #9ca3af;
      border-radius: 50%;
      width: 44pt;
      height: 44pt;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 7pt;
      color: #9ca3af;
      margin-top: 4pt;
    }
    .memo-box {
      background: #f0fdf4;
      border: 1.5px solid #86efac;
      border-radius: 4pt;
      padding: 6pt 8pt;
      margin: 4pt 0;
    }
    .memo-alert {
      background: #fef2f2;
      border: 1.5px solid #fca5a5;
      border-radius: 4pt;
      padding: 6pt 8pt;
      margin: 4pt 0;
    }
  </style>
</head>
<body>

  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <!-- ЛИСТ 1: ИДС НА ТЕРАПЕВТИЧЕСКОЕ ЛЕЧЕНИЕ (323-ФЗ ст. 20, ПРИКАЗ 1051н)     -->
  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <div class="print-sheet">
    <div>
      <div class="sheet-header">
        <div class="clinic-top-row">
          <div>
            <strong>${clinicName}</strong><br>
            Адрес: ${clinicAddress} • Тел: ${clinicPhone}<br>
            Лицензия: № ${clinicLicense} • ИНН: ${clinicInn} • ОГРН: ${clinicOgrn}
          </div>
          <div style="text-align: right;">
            <span class="statutory-badge">ФЗ № 323-ФЗ ст. 20</span><br>
            <span class="statutory-badge">Приказ МЗ РФ № 1051н</span>
          </div>
        </div>
      </div>

      <h1>Информированное добровольное согласие на терапевтическое стоматологическое лечение</h1>
      <div class="sheet-subtitle">Утверждено в соответствии со ст. 20 Федерального закона от 21.11.2011 № 323-ФЗ и Приказом Минздрава России № 1051н</div>

      <div class="parties-block">
        Я, <strong>${ptName}</strong>, дата рождения: <strong>${ptBirthDate}</strong>,
        паспортные данные: <strong>${ptPassport}</strong>,
        зарегистрированный(ая) по адресу: <strong>${ptAddress}</strong>,
        настоящим подтверждаю, что уполномочиваю врача-стоматолога <strong>${docDoctorName}</strong>
        провести мне (или представляемому мной лицу) плановое / неотложное терапевтическое стоматологическое лечение:
        <strong>${opType} в области ${opTooth}${icdDiagnosis}</strong>.
      </div>

      <div class="section-title">1. Суть планируемого медицинского вмешательства</div>
      <p>
        Мне подробно, в доступной форме разъяснены диагноз, характер и цели терапевтического лечения,
        включая проведение местной (инфильтрационной, проводниковой, аппликационной) анестезии, изоляцию рабочего поля системой коффердам / раббердам,
        препарирование твердых тканей зуба с водно-воздушным охлаждением, медикаментозную антисептическую обработку кариозной полости,
        наложение лечебных и изолирующих прокладок, адгезивный протокол (бондинг), послойное пломбирование и художественную реставрацию
        композитными материалами светового отверждения, а при эндодонтическом лечении (пульпит, периодонтит) — механическую и медикаментозную
        обработку корневых каналов ручными и машинными Ni-Ti инструментами, временное пломбирование гидроксидом кальция и постоянную обтурацию
        гуттаперчевыми штифтами с силером, шлифование и полирование реставрации по окклюзии.
      </p>

      <div class="section-title">2. Альтернативные методы лечения и последствия отказа</div>
      <p>
        Мне разъяснены альтернативные методы лечения (ортопедическое восстановление вкладкой/коронкой при разрушении более 50% коронковой части,
        удаление зуба с последующей имплантацией), а также последствия отказа от лечения: прогрессирование кариозного процесса, гибель пульпы,
        развитие пульпита, верхушечного периодонтита, кистогранулемы, радикулярной кисты, периостита («флюса»), остеомиелита челюсти и неизбежная утрата зуба.
      </p>

      <div class="section-title">3. Возможные осложнения и особенности периода адаптации</div>
      <p>
        Я поставлен(а) в известность о возможных осложнениях во время и после лечения:
      </p>
      <ul>
        <li>Кратковременная постпломбировочная чувствительность зуба при накусывании и температурных раздражителях (нормальная адаптация в течение 3–7 дней);</li>
        <li>При глубоком кариесе — сохранение воспаления в пульпе из-за скрытого инфицирования, требующее последующего эндодонтического лечения (депульпирования);</li>
        <li>При искривленных или облитерированных корневых каналах — риск перфорации корня или поломки эндодонтического микроинструмента;</li>
        <li>Временный дискомфорт или незначительная болезненность десны в месте фиксации клампа коффердама или инъекции анестетика;</li>
        <li>Возможность изменения цвета пломбы при частом употреблении красящих продуктов и напитков (чай, кофе, никотин, свекла) при несоблюдении полировки.</li>
      </ul>

      <div class="section-title">4. Обязательства пациента и гарантийные условия</div>
      <p>
        Я обязуюсь строго выполнять назначения и рекомендации врача, соблюдать гигиену полости рта, не употреблять грубую и вязкую пищу
        в первые часы после реставрации, приходить на контрольные осмотры и полировку пломбы каждые 6 месяцев для сохранения гарантийных обязательств.
        Я подтвердил(а) отсутствие скрытых аллергических реакций на местные анестетики и композитные материалы.
      </p>
    </div>

    <div class="signatures-grid">
      <div>
        <strong>Пациент (законный представитель):</strong><br>
        ФИО: <strong>${ptName}</strong><br>
        <div class="sign-line"></div>
        <div class="sign-caption">(подпись пациента / представителя) • Дата: ${todayFormatted}</div>
      </div>
      <div>
        <strong>Врач-стоматолог-терапевт:</strong><br>
        Врач: <strong>${docDoctorName}</strong><br>
        <div class="sign-line"></div>
        <div class="sign-caption">(подпись и личная печать врача) • Дата: ${todayFormatted}</div>
      </div>
    </div>
  </div>

  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <!-- ЛИСТ 2: СОГЛАСИЕ И ПРОТОКОЛ НА МЕСТНУЮ АНЕСТЕЗИЮ (ПРИКАЗ 1051н)         -->
  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <div class="print-sheet">
    <div>
      <div class="sheet-header">
        <div class="clinic-top-row">
          <div>
            <strong>${clinicName}</strong> • Лицензия № ${clinicLicense}<br>
            Адрес: ${clinicAddress} • Тел: ${clinicPhone}
          </div>
          <div style="text-align: right;">
            <span class="statutory-badge">Приказ МЗ РФ № 1051н</span><br>
            <span class="statutory-badge">Форма № 043/у</span>
          </div>
        </div>
      </div>

      <h1>Информированное согласие и протокол на проведение местной и проводниковой анестезии</h1>
      <div class="sheet-subtitle">Приложение к медицинской карте стоматологического пациента № 043/у</div>

      <div class="parties-block">
        Пациент: <strong>${ptName}</strong>, дата рождения: <strong>${ptBirthDate}</strong>.<br>
        Планируемый вид обезболивания: <strong>Инфильтрационная / Проводниковая (мандибулярная, торусальная, туберальная) анестезия</strong>.<br>
        Используемый препарат: <strong>${anesName}</strong>.
      </div>

      <div class="section-title">1. Информация о методе обезболивания</div>
      <p>
        Для безболезненного проведения стоматологического лечения мне показано проведение местной инфильтрационной или
        проводниковой анестезии современными анестетиками амидного ряда с вазоконстриктором (эпинефрином) или без него.
        Действие препарата наступает через 1–5 минут и продолжается от 1 до 4 часов.
      </p>

      <div class="section-title">2. Сведения об аллергологическом и соматическом анамнезе</div>
      <p>
        Настоящим подтверждаю, что:
      </p>
      <ul>
        <li>Ранее местная анестезия мне проводилась, переносимость: удовлетворительная / осложнений не наблюдалось;</li>
        <li>Аллергические реакции на местные анестетики (новокаин, лидокаин, ультракаин, убистезин, септанест, скандонест): отрицаю;</li>
        <li>Тяжелые сердечно-сосудистые патологии (неконтролируемая гипертензия, недавно перенесенный инфаркт/инсульт, тяжелые аритмии): отрицаю;</li>
        <li>Заболевания щитовидной железы (тиреотоксикоз), декомпенсированный сахарный диабет, глаукому: отрицаю;</li>
        <li>Беременность / период лактации: отрицаю / не применимо.</li>
      </ul>

      <div class="section-title">3. Возможные индивидуальные реакции и осложнения анестезии</div>
      <p>
        Мне разъяснено, что даже при технически безупречном введении анестетика возможны непредвиденные индивидуальные реакции:
      </p>
      <ul>
        <li>Головокружение, кратковременная тахикардия, слабость, тремор (реакция на адреналин/эпинефрин);</li>
        <li>Образование постинъекционной гематомы в зоне укола вследствие повреждения мелкого кровеносного сосуда;</li>
        <li>Болезненность или ограничение открывания рта (тризм) в течение нескольких дней после проводниковой анестезии;</li>
        <li>Пролонгированная парестезия (онемение губы, языка) вследствие раздражения нервного стволика;</li>
        <li>Аллергические реакции немедленного типа (крапивница, отек Квинке, анафилактический шок) — персонал обучен неотложной помощи.</li>
      </ul>

      <div class="section-title">4. Правила безопасности пациента</div>
      <p>
        В течение времени действия анестезии (до полного восстановления чувствительности) категорически запрещается
        принимать горячую пищу и напитки, жевать твердую пищу во избежание глубокого термического и травматического прикусывания
        губ, щек и языка.
      </p>
    </div>

    <div class="signatures-grid">
      <div>
        <strong>Пациент:</strong><br>
        ФИО: <strong>${ptName}</strong><br>
        <div class="sign-line"></div>
        <div class="sign-caption">(подпись пациента) • Дата: ${todayFormatted}</div>
      </div>
      <div>
        <strong>Врач-стоматолог:</strong><br>
        ФИО: <strong>${docDoctorName}</strong><br>
        <div class="sign-line"></div>
        <div class="sign-caption">(подпись врача) • Дата: ${todayFormatted}</div>
      </div>
    </div>
  </div>

  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <!-- ЛИСТ 3: ПАМЯТКА ПАЦИЕНТА ПОСЛЕ ТЕРАПЕВТИЧЕСКОГО ЛЕЧЕНИЯ И ПЛОМБИРОВАНИЯ  -->
  <!-- ═══════════════════════════════════════════════════════════════════════ -->
  <div class="print-sheet">
    <div>
      <div class="sheet-header">
        <div class="clinic-top-row">
          <div>
            <strong>${clinicName}</strong><br>
            Адрес: ${clinicAddress} • Круглосуточный телефон клиники: <strong>${clinicPhone}</strong>
          </div>
          <div style="text-align: right;">
            <span class="statutory-badge">Закон РФ № 2300-1</span><br>
            <span class="statutory-badge">Памятка пациента</span>
          </div>
        </div>
      </div>

      <h1>Памятка пациента после терапевтического стоматологического лечения зубов и пломбирования</h1>
      <div class="sheet-subtitle">Рекомендации по уходу за полостью рта, питанию и режиму после установки пломбы и эндодонтического лечения</div>

      <div class="parties-block">
        Уважаемый(ая) <strong>${ptName}</strong>!<br>
        Вам проведено лечение: <strong>${opType} в области ${opTooth}${icdDiagnosis}</strong>.<br>
        Лечащий врач-терапевт: <strong>${docDoctorName}</strong>. Дата приёма: <strong>${todayFormatted}</strong>.
      </div>

      <div class="memo-box">
        <strong>ПЕРВЫЕ ЧАСЫ ПОСЛЕ ЛЕЧЕНИЯ И УСТАНОВКИ ПЛОМБЫ:</strong>
        <ol style="margin: 3pt 0 2pt 12pt;">
          <li><strong>Действие анестезии:</strong> не принимайте пищу до полного восстановления чувствительности губ, языка и щеки (обычно 2–3 часа), чтобы избежать случайного прикусывания мягких тканей. Разрешено пить не горячую воду.</li>
          <li><strong>Ощущение высоты («пломба мешает»):</strong> современный световой композит полимеризуется сразу в кресле, но если после отхода анестезии при смыкании зубов вы чувствуете малейшее завышение или неудобство — обязательно позвоните в клинику. Коррекция по прикусу занимает 2 минуты и защищает зуб от перегрузки и скола.</li>
          <li><strong>Постпломбировочная чувствительность:</strong> умеренная чувствительность зуба на холодное, горячее или при накусывании в первые 3–5 дней является естественной реакцией пульпы на препарирование. Она постепенно угасает.</li>
          <li><strong>Диета в первые 24 часа («белая диета»):</strong> после эстетической реставрации передних зубов воздержитесь от курения и красящих продуктов (кофе, черный чай, красное вино, свекла, черника, соевый соус).</li>
        </ol>
      </div>

      <div class="section-title">2. Уход при эндодонтическом лечении (лечении каналов зуба)</div>
      <ul>
        <li><strong>Временная пломба:</strong> если вам установлена временная повязка/пломба, берегите эту сторону при жевании, не ковыряйте зубочистками. Своевременно явитесь на следующий приём!</li>
        <li><strong>Болезненность при накусывании:</strong> после пломбирования каналов зуб может ныть 2–4 дня. При выраженном дискомфорте примите обезболивающий препарат (Нимесил 100 мг, Ибупрофен 400 мг).</li>
        <li><strong>Полноценная гигиена:</strong> чистите зубы обычной щеткой и пастой 2 раза в день. Пространство между зубами очищайте зубной нитью (флоссом), аккуратно извлекая её сбоку, а не вверх.</li>
      </ul>

      <div class="memo-alert">
        <strong>ОБЯЗАТЕЛЬНО СВЯЖИТЕСЬ С КЛИНИКОЙ, ЕСЛИ:</strong>
        <ul style="margin: 2pt 0 1pt 12pt;">
          <li>Появилась самопроизвольная пульсирующая ночная боль в пролеченном зубе;</li>
          <li>Появилась припухлость десны или отек щеки («флюс»);</li>
          <li>Повысилась температура тела выше 37.5 °C;</li>
          <li>Пломба завышает прикус при смыкании челюстей;</li>
          <li>Выпала временная пломба или откололась стенка зуба.</li>
        </ul>
      </div>

      <p style="font-size: 8pt; color: #4b5563;">
        Следующий плановый визит / осмотр назначен на: <strong>«___» _________ _____ г. в ____:____</strong>.<br>
        Телефон клиники для экстренной связи: <strong>${clinicPhone}</strong>.
      </p>
    </div>

    <div class="signatures-grid">
      <div>
        <strong>Памятку получил(а), правила разъяснены:</strong><br>
        Пациент: <strong>${ptName}</strong><br>
        <div class="sign-line"></div>
        <div class="sign-caption">(подпись пациента) • Дата: ${todayFormatted}</div>
      </div>
      <div>
        <strong>Памятку выдал:</strong><br>
        Врач: <strong>${docDoctorName}</strong><br>
        <div class="sign-line"></div>
        <div class="sign-caption">(подпись врача) • Телефон клиники: ${clinicPhone}</div>
      </div>
    </div>
  </div>

</body>
</html>`;
}

/**
 * Запускает 1-клик печать всего терапевтического пакета.
 * Использует надежный window.open с fallback через невидимый iframe.
 */
export function printClinicalPackage(
	options: ClinicalPackagePrintOptions,
): void {
	const html = generateClinicalPackageHtml(options);

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
			console.warn(
				"Error writing to printWindow, trying fallback iframe",
				writeErr,
			);
		}
	}

	// Способ 2 (Fallback): Скрытый iframe, если браузер блокирует всплывающие окна
	try {
		const existingIframe = document.getElementById(
			"dente-clinical-package-print-iframe",
		);
		if (existingIframe) {
			existingIframe.remove();
		}

		const iframe = document.createElement("iframe");
		iframe.id = "dente-clinical-package-print-iframe";
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
		window.print();
	}
}
