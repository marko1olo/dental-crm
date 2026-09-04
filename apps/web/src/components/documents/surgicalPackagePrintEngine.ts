/**
 * surgicalPackagePrintEngine.ts
 *
 * Единый генератор и печатный движок хирургического пакета документов
 * для стоматологической клиники (1 клик = 3 бланка на принтере):
 * 1. ИДС на хирургическое вмешательство и дентальную имплантацию (ФЗ № 323-ФЗ ст. 20, Приказ Минздрава РФ № 1051н).
 * 2. Информированное согласие на местную/проводниковую анестезию (Приказ Минздрава России № 1051н).
 * 3. Памятка пациента после хирургического вмешательства и имплантации (Закон РФ «О защите прав потребителей» № 2300-1).
 *
 * Соответствует Мандатам 8e, 8k, 8n:
 * - Врач у кресла или медсестра не тратят время на открытие 3 отдельных документов: 1 клик отправляет весь хирургический комплект на принтер.
 * - Чистые подчеркивания «____________________» для незаполненных полей без блокировок печати.
 * - Строгое разделение страниц через CSS `break-after: page; page-break-after: always;`.
 * - Двойной механизм печати: всплывающее окно `window.open` + скрытый `iframe` при блокировке поп-апов.
 */

export interface SurgicalPackagePrintOptions {
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
	operationDetails?: {
		operationType?: string | null | undefined;
		toothNumber?: string | number | null | undefined;
		anestheticName?: string | null | undefined;
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
export function generateSurgicalPackageHtml(
	options: SurgicalPackagePrintOptions,
): string {
	const { patient, clinic, doctorFullName, operationDetails } = options;

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
	const opTooth = operationDetails?.toothNumber
		? `зуба/области ${escapeHtml(String(operationDetails.toothNumber))}`
		: "зуба / челюстной области";
	const opType =
		escapeHtml(operationDetails?.operationType) ||
		"удаление зуба / установка дентального имплантата / остеотомия";
	const anesName =
		escapeHtml(operationDetails?.anestheticName) ||
		"Артикаин 4% с эпинефрином (1:100 000 / 1:200 000)";

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <title>Хирургический пакет документов — ${ptName}</title>
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
  <!-- ЛИСТ 1: ИДС НА ХИРУРГИЧЕСКОЕ ВМЕШАТЕЛЬСТВО И ИМПЛАНТАЦИЮ (323-ФЗ, 1051н) -->
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

      <h1>Информированное добровольное согласие на хирургическое стоматологическое вмешательство и дентальную имплантацию</h1>
      <div class="sheet-subtitle">Утверждено в соответствии со ст. 20 Федерального закона от 21.11.2011 № 323-ФЗ</div>

      <div class="parties-block">
        Я, <strong>${ptName}</strong>, дата рождения: <strong>${ptBirthDate}</strong>,
        паспортные данные: <strong>${ptPassport}</strong>,
        зарегистрированный(ая) по адресу: <strong>${ptAddress}</strong>,
        настоящим подтверждаю, что уполномочиваю врача-стоматолога <strong>${docDoctorName}</strong>
        провести мне (или представляемому мной лицу) плановое / неотложное хирургическое вмешательство:
        <strong>${opType} в области ${opTooth}</strong>.
      </div>

      <div class="section-title">1. Суть планируемого медицинского вмешательства</div>
      <p>
        Мне подробно, в доступной форме разъяснены диагноз, характер и цели хирургического вмешательства,
        включая проведение местной анестезии, препарирование костного ложа, остеотомию, удаление зуба (корней),
        синус-лифтинг, направленную тканевую регенерацию с использованием костнопластических и барьерных мембран,
        установку дентальных имплантатов, наложение швов и последующий гемостаз.
      </p>

      <div class="section-title">2. Альтернативные методы лечения и последствия отказа</div>
      <p>
        Мне разъяснены альтернативные методы лечения (сохранение зуба при консервативном лечении, мостовидное или
        съемное протезирование), а также возможные риски отказа от операции: распространение одонтогенной инфекции,
        развитие периостита, остеомиелита, флегмоны, убыль костной ткани челюсти и деформация зубного ряда.
      </p>

      <div class="section-title">3. Возможные осложнения и риски операции</div>
      <p>
        Я поставлен(а) в известность о возможных осложнениях во время и после операции:
      </p>
      <ul>
        <li>Болевой синдром, отек мягких тканей лица и гематома в зоне операции (нормальная реакция в первые 3–5 дней);</li>
        <li>Кровоточивость из лунки, расхождение швов, развитие альвеолита («сухой лунки»);</li>
        <li>Временное или стойкое онемение губы, подбородка или языка при близком расположении нижнеальвеолярного нерва;</li>
        <li>Перфорация дна верхнечелюстной пазухи при операциях на верхней челюсти, развитие синусита;</li>
        <li>Риск периимплантита или отторжения дентального имплантата (дезинтеграция), требующий его удаления;</li>
        <li>Обострение хронических соматических заболеваний при стрессовой реакции организма.</li>
      </ul>

      <div class="section-title">4. Обязательства пациента</div>
      <p>
        Я обязуюсь строго выполнять назначения и рекомендации лечащего врача, своевременно принимать назначенные лекарственные препараты,
        соблюдать щадящий режим питания, гигиену полости рта и являться на назначенные контрольные осмотры и снятие швов.
        Я подтверждаю, что сообщил(а) врачу полные и достоверные сведения о состоянии своего здоровья, перенесенных заболеваниях,
        аллергических реакциях и постоянно принимаемых медикаментах (включая антикоагулянты и бисфосфонаты).
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
        <strong>Хирург-стоматолог:</strong><br>
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
  <!-- ЛИСТ 3: ПАМЯТКА ПАЦИЕНТА ПОСЛЕ ХИРУРГИЧЕСКОГО ВМЕШАТЕЛЬСТВА И ИМПЛАНТАЦИИ -->
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

      <h1>Памятка пациента после хирургического стоматологического вмешательства и дентальной имплантации</h1>
      <div class="sheet-subtitle">Правила режима и ухода для скорейшего заживления и предотвращения послеоперационных осложнений</div>

      <div class="parties-block">
        Уважаемый(ая) <strong>${ptName}</strong>!<br>
        Вам проведена хирургическая операция: <strong>${opType} в области ${opTooth}</strong>.<br>
        Лечащий хирург: <strong>${docDoctorName}</strong>. Дата операции: <strong>${todayFormatted}</strong>.
      </div>

      <div class="memo-box">
        <strong>ПЕРВЫЕ 24 ЧАСА ПОСЛЕ ОПЕРАЦИИ (КРИТИЧЕСКИ ВАЖНО):</strong>
        <ol style="margin: 3pt 0 2pt 12pt;">
          <li><strong>Марлевый тампон:</strong> сплюнуть через 15–20 минут после наложения в клинике. Не держать дольше!</li>
          <li><strong>Холод к щеке:</strong> прикладывать сухой холод (лед через полотенце) на область операции снаружи на 15 минут с перерывами на 15 минут в течение первых 3–4 часов. Это значительно уменьшит отек.</li>
          <li><strong>КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО полоскать рот!</strong> Интенсивное полоскание вымывает кровяной сгусток из лунки, что ведет к альвеолиту («сухой лунке») и нагноению. Разрешены только пассивные ванночки без бульканья.</li>
          <li><strong>Прием пищи:</strong> воздержитесь от еды до полного окончания действия анестезии (2–3 часа). Пища должна быть теплой, мягкой, не острой. Жевать на противоположной стороне.</li>
          <li><strong>Запрет на перегрев:</strong> исключить горячие ванны, бани, сауны, тяжелый физический труд и тренировки на 5–7 дней.</li>
          <li><strong>Курение и алкоголь:</strong> воздержаться от курения минимум 3–5 дней (никотин вызывает спазм сосудов и отторжение имплантатов/сгустка). Исключить алкоголь на весь период приема антибиотиков.</li>
        </ol>
      </div>

      <div class="section-title">2. Уход и медикаментозные назначения</div>
      <ul>
        <li><strong>Антисептические ванночки:</strong> со 2-го дня — раствор Хлоргексидина 0.05% или Мирамистина: набрать в рот, подержать на стороне операции 30–60 секунд и аккуратно сплюнуть (3–4 раза в день после еды).</li>
        <li><strong>Обезболивание:</strong> при появлении боли принимать назначенный НПВС (Нимесил 100 мг, Нурофен 400 мг или Кеторол) строго по инструкции.</li>
        <li><strong>Антибактериальная терапия:</strong> если назначен антибиотик (Амоксиклав, Цифран и др.) — принимать строго полный курс без самовольной отмены!</li>
        <li><strong>Гигиена:</strong> чистить зубы мягкой щеткой обязательно 2 раза в день, аккуратно обходя зону наложенных швов.</li>
      </ul>

      <div class="memo-alert">
        <strong>СРОЧНО СВЯЖИТЕСЬ С КЛИНИКОЙ ИЛИ ЛЕЧАЩИМ ВРАЧОМ, ЕСЛИ:</strong>
        <ul style="margin: 2pt 0 1pt 12pt;">
          <li>Непрекращающееся обильное алое кровотечение из раны более 3–4 часов;</li>
          <li>Температура тела поднялась выше 38.0 °C и держится на 2–3 сутки;</li>
          <li>Нарастающий отек и резкая пульсирующая боль спустя 3–4 дня после операции;</li>
          <li>Онемение губы, подбородка или языка сохраняется более 24 часов;</li>
          <li>Выпал или подвижен формирователь десны / защитный колпачок имплантата.</li>
        </ul>
      </div>

      <p style="font-size: 8pt; color: #4b5563;">
        Плановый осмотр и снятие швов назначены на: <strong>«___» _________ _____ г. в ____:____</strong>.<br>
        Телефон регистратуры и дежурного врача: <strong>${clinicPhone}</strong>.
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
 * Запускает 1-клик печать всего хирургического пакета.
 * Использует надежный window.open с fallback через невидимый iframe.
 */
export function printSurgicalPackage(
	options: SurgicalPackagePrintOptions,
): void {
	const html = generateSurgicalPackageHtml(options);

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
			"dente-surgical-package-print-iframe",
		);
		if (existingIframe) {
			existingIframe.remove();
		}

		const iframe = document.createElement("iframe");
		iframe.id = "dente-surgical-package-print-iframe";
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
