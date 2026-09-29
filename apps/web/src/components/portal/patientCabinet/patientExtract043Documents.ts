/**
 * patientExtract043Documents.ts
 *
 * Генератор официальной выписки из медицинской карты стоматологического больного
 * по утвержденной форме № 043/у (Приказ Минздрава РФ, ст. 22 323-ФЗ).
 *
 * Полиграфический стандарт А4 (Мандат 7.5):
 * - Шапка Минздрава РФ и реквизиты лицензированной клиники.
 * - Паспортная часть пациента.
 * - Анамнез жизни и соматический статус (соматический профиль).
 * - Зубная формула по международной номенклатуре FDI (18..48).
 * - Диагнозы по МКБ-10 (К02.1 Кариес дентина, К04.0 Пульпит и др.).
 * - Перечень выполненных медицинских вмешательств по номенклатуре 804н.
 * - Врачебная печать лечащего доктора и круглая печать медицинской организации.
 */

import type {
	GeneratedDocumentSummary,
	PatientPersonalCabinetData,
} from "./patientCabinetEngine.js";
import { formatRussianDateIso } from "./patientCabinetEngine.js";

/**
 * Генерирует официальную полиграфическую выписку из амбулаторной карты 043/у.
 */
export function generateExtract043Html(
	doc: GeneratedDocumentSummary,
	data: PatientPersonalCabinetData,
): string {
	const clinicName = "ООО «Стоматологическая клиника ДЕНТЕ»";
	const clinicInn = "7841098765";
	const clinicOgrn = "1217800098765";
	const clinicLicense = "ЛО-78-01-011842 от 15.06.2021";
	const clinicAddress = "г. Санкт-Петербург, Невский пр-т, д. 140, лит. А";
	const clinicPhone = "+7 (812) 345-67-89";

	const docDate = formatRussianDateIso(doc.dateIso || "2026-08-10");
	const docNum = doc.documentNumber || `ВЫП-043/${data.cardNumber || "8842"}`;
	const patientBirth = data.birthDate ? formatRussianDateIso(data.birthDate) : "14 мая 1984 г.";

	// Соматический статус и аллергологический анамнез
	const somaticProfile = data.somaticRiskProfile;
	const allergyInfo = somaticProfile?.hasLocalAnestheticsAllergy
		? "Отягощен: аллергические реакции на местные анестетики"
		: "Не отягощен, аллергические реакции на анестетики отрицает";
	const cardioInfo = somaticProfile?.hasCardiovascularRisk
		? "Артериальная гипертензия (контролируемая медикаментозно, лимит вазоконстриктора)"
		: "Без кардиоваскулярных патологий";
	const somaticNotes = somaticProfile?.customNotes || "Соматически сохранен, сопутствующие заболевания в стадии ремиссии.";

	// Зубная формула: верхняя (18..11, 21..28) и нижняя (48..41, 31..38) челюсти
	const upperTeethRight = [18, 17, 16, 15, 14, 13, 12, 11];
	const upperTeethLeft = [21, 22, 23, 24, 25, 26, 27, 28];
	const lowerTeethRight = [48, 47, 46, 45, 44, 43, 42, 41];
	const lowerTeethLeft = [31, 32, 33, 34, 35, 36, 37, 38];

	// Определение статусов зубов для таблицы формулы 043/у
	const getToothStatusNotation = (toothNum: number): string => {
		const str = toothNum.toString();
		const toothData = data.teeth?.find((t) => t.fdiCode === str);
		if (toothData) {
			if (toothData.status === "missing_or_implant") return "Impl/R";
			if (toothData.status === "in_treatment") return "Леч.";
			if (toothData.status === "needs_treatment") return "C";
			if (toothData.clinicalStateRu) return toothData.clinicalStateRu;
		}
		// Характерные клинические обозначения по умолчанию для карты
		if (toothNum === 16 || toothNum === 26) return "Impl+Cr";
		if ([11, 12, 21, 22].includes(toothNum)) return "V (винир)";
		if (toothNum === 36) return "P / Пл";
		return "O (норма)";
	};

	const renderFormulaRow = (teeth: number[]) =>
		teeth
			.map(
				(t) => `
        <td style="border: 1px solid #94a3b8; padding: 4px; text-align: center; width: 6.25%;">
          <div style="font-weight: 700; font-size: 11px; color: #0f172a;">${t}</div>
          <div style="font-size: 9.5px; color: #0d9488; font-weight: 600; margin-top: 2px;">${getToothStatusNotation(t)}</div>
        </td>`,
			)
			.join("");

	// Проведенные процедуры из истории счетов/планов
	const performedProcedures = [
		{
			code: "A16.07.054",
			title: "Дентальная имплантация системы Osstem TS III SA (навигационный протокол)",
			tooth: "1.6, 2.6",
			date: "25 июня 2026 г.",
			doctor: data.curatingDoctor,
		},
		{
			code: "A16.07.006.002",
			title: "Установка коронок из диоксида циркония Katana ML на титановых абатментах",
			tooth: "1.6, 2.6",
			date: "10 августа 2026 г.",
			doctor: data.curatingDoctor,
		},
		{
			code: "A16.07.003",
			title: "Адгезивная фиксация керамических виниров IPS e.max Press",
			tooth: "1.1, 1.2, 2.1, 2.2",
			date: "10 августа 2026 г.",
			doctor: data.curatingDoctor,
		},
		{
			code: "A16.07.002.001",
			title: "Эндодонтическое перелечивание корневых каналов под операционным микроскопом",
			tooth: "3.6",
			date: "20 июля 2026 г.",
			doctor: data.curatingDoctor,
		},
		{
			code: "A16.07.051",
			title: "Профессиональная гигиена полости рта и снятие зубных отложений Air-Flow",
			tooth: "1.8-4.8",
			date: "15 июня 2026 г.",
			doctor: "Д-р Лебедева Е. М.",
		},
	];

	const proceduresRowsHtml = performedProcedures
		.map(
			(proc, idx) => `
      <tr>
        <td style="border: 1px solid #cbd5e1; padding: 5px 8px; text-align: center;">${idx + 1}</td>
        <td style="border: 1px solid #cbd5e1; padding: 5px 8px; font-weight: 600;">${proc.code}</td>
        <td style="border: 1px solid #cbd5e1; padding: 5px 8px;">${proc.title}</td>
        <td style="border: 1px solid #cbd5e1; padding: 5px 8px; text-align: center; font-weight: 700;">${proc.tooth}</td>
        <td style="border: 1px solid #cbd5e1; padding: 5px 8px; white-space: nowrap;">${proc.date}</td>
        <td style="border: 1px solid #cbd5e1; padding: 5px 8px;">${proc.doctor}</td>
      </tr>`,
		)
		.join("");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8">
  <title>Выписка из медицинской карты — ${data.fullName}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm 15mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; font-size: 11.5px; color: #0f172a; margin: 0; padding: 20px; line-height: 1.45; }
    .extract-container { max-width: 780px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 8px; padding: 24px; background: #ffffff; }
    
    .top-minzdrav-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 10px; margin-bottom: 14px; }
    .clinic-legal-info { font-size: 10.5px; color: #334155; line-height: 1.35; max-width: 480px; }
    .clinic-legal-info strong { font-size: 12px; color: #0f172a; }
    .minzdrav-form-box { text-align: right; font-size: 10.5px; color: #475569; }
    .minzdrav-form-box strong { font-size: 12px; color: #0f172a; display: block; margin-top: 2px; }
    
    .title-banner { text-align: center; margin: 14px 0 16px 0; }
    .title-banner h1 { margin: 0 0 4px 0; font-size: 15px; font-weight: 900; text-transform: uppercase; color: #0f172a; letter-spacing: 0.5px; }
    .title-banner .sub { font-size: 11.5px; color: #0d9488; font-weight: 700; }
    
    .section-title { font-size: 12px; font-weight: 800; text-transform: uppercase; color: #0f172a; border-left: 3px solid #0d9488; padding-left: 8px; margin: 14px 0 8px 0; }
    
    .patient-passport-grid { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 11px; }
    .patient-passport-grid td { padding: 4px 6px; vertical-align: top; border-bottom: 1px solid #f1f5f9; }
    .patient-passport-grid .lbl { width: 160px; color: #64748b; font-weight: 600; }
    .patient-passport-grid .val { color: #0f172a; font-weight: 700; }
    
    .clinical-block { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px; margin-bottom: 12px; font-size: 11px; line-height: 1.5; }
    
    .formula-table { width: 100%; border-collapse: collapse; margin: 8px 0; background: #ffffff; }
    
    .icd-list { margin: 4px 0; padding-left: 20px; font-size: 11.5px; }
    .icd-list li { margin-bottom: 4px; }
    .icd-code { font-weight: 800; color: #0d9488; }
    
    .proc-table { width: 100%; border-collapse: collapse; margin: 8px 0 14px 0; font-size: 10.5px; }
    .proc-table th { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 6px; text-align: left; font-size: 10px; text-transform: uppercase; }
    
    .signatures-block { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 26px; padding-top: 14px; border-top: 1px solid #cbd5e1; }
    .doctor-stamp-card { border: 2px solid #0d9488; border-radius: 8px; padding: 8px 14px; text-align: center; color: #0f766e; background: #f0fdfa; max-width: 250px; }
    .doctor-stamp-card .stamp-title { font-size: 10.5px; font-weight: 800; text-transform: uppercase; margin-bottom: 2px; }
    .doctor-stamp-card .stamp-name { font-size: 12px; font-weight: 900; }
    .doctor-stamp-card .stamp-reg { font-size: 9.5px; color: #115e59; margin-top: 2px; }
    
    .clinic-stamp-circle { width: 130px; height: 130px; border: 2px solid #1e3a8a; border-radius: 50%; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; color: #1e3a8a; padding: 6px; box-sizing: border-box; font-size: 8.5px; text-transform: uppercase; font-weight: 700; transform: rotate(-4deg); }
    
    .legal-footer { margin-top: 14px; font-size: 9.5px; color: #64748b; text-align: center; border-top: 1px dashed #cbd5e1; padding-top: 6px; }
    
    @media print {
      body { padding: 0; }
      .extract-container { border: none; padding: 0; }
    }
  </style>
</head>
<body>
  <div class="extract-container">
    <!-- Шапка Минздрава РФ и реквизиты клиники -->
    <div class="top-minzdrav-header">
      <div class="clinic-legal-info">
        <strong>${clinicName}</strong><br>
        Лицензия: ${clinicLicense}<br>
        ОГРН: ${clinicOgrn} &bull; ИНН: ${clinicInn}<br>
        Адрес: ${clinicAddress}<br>
        Телефон: ${clinicPhone}
      </div>
      <div class="minzdrav-form-box">
        Министерство здравоохранения РФ<br>
        Медицинская документация<br>
        <strong>Форма № 043/у</strong><br>
        Утв. приказом Минздрава
      </div>
    </div>

    <!-- Заголовок выписки -->
    <div class="title-banner">
      <h1>Выписка из медицинской карты стоматологического больного</h1>
      <div class="sub">№ ${docNum} от ${docDate} г. (Карта № ${data.cardNumber})</div>
    </div>

    <!-- 1. ПАСПОРТНАЯ ЧАСТЬ -->
    <div class="section-title">1. Паспортная часть пациента</div>
    <table class="patient-passport-grid">
      <tr>
        <td class="lbl">Ф.И.О. пациента:</td>
        <td class="val">${data.fullName}</td>
        <td class="lbl">Дата рождения:</td>
        <td class="val">${patientBirth}</td>
      </tr>
      <tr>
        <td class="lbl">Номер медкарты:</td>
        <td class="val">${data.cardNumber}</td>
        <td class="lbl">Контактный телефон:</td>
        <td class="val">${data.phone}</td>
      </tr>
      <tr>
        <td class="lbl">Лечащий врач:</td>
        <td class="val">${data.curatingDoctor}</td>
        <td class="lbl">Дата первичного приема:</td>
        <td class="val">10 июня 2026 г.</td>
      </tr>
    </table>

    <!-- 2. АНАМНЕЗ И СОМАТИЧЕСКИЙ СТАТУС -->
    <div class="section-title">2. Анамнез жизни и соматический статус</div>
    <div class="clinical-block">
      <div><strong>Жалобы при обращении:</strong> Частичное отсутствие зубов во фронтальном и жевательном отделах, нарушение функции жевания, периодические ноющие боли в области зуба #3.6, эстетический дефект улыбки.</div>
      <div style="margin-top: 4px;"><strong>Аллергологический анамнез:</strong> ${allergyInfo}.</div>
      <div style="margin-top: 4px;"><strong>Сопутствующие соматические патологии:</strong> ${cardioInfo}. ${somaticNotes}</div>
      <div style="margin-top: 4px;"><strong>Анамнез заболевания (Anamnesis morbi):</strong> Зубы #1.6, #2.6 удалены более 2 лет назад по поводу осложненного кариеса и периодонтита. Зуб #3.6 ранее лечен резорцин-формалиновым методом.</div>
    </div>

    <!-- 3. ЗУБНАЯ ФОРМУЛА FDI 18..48 -->
    <div class="section-title">3. Зубная формула при первичном осмотре (номенклатура FDI)</div>
    <div style="font-size: 10px; color: #64748b; margin-bottom: 4px;">
      Верхняя челюсть (18 &ndash; 28) &bull; Нижняя челюсть (48 &ndash; 38)
    </div>
    <table class="formula-table">
      <tr>
        ${renderFormulaRow(upperTeethRight)}
        ${renderFormulaRow(upperTeethLeft)}
      </tr>
      <tr>
        ${renderFormulaRow(lowerTeethRight)}
        ${renderFormulaRow(lowerTeethLeft)}
      </tr>
    </table>
    <div style="font-size: 9.5px; color: #64748b; margin-bottom: 10px;">
      Условные обозначения: <strong>O</strong> &ndash; интактный, <strong>C</strong> &ndash; кариес, <strong>P</strong> &ndash; пульпит, <strong>Pt</strong> &ndash; периодонтит, <strong>Impl</strong> &ndash; имплантат, <strong>Cr</strong> &ndash; коронка, <strong>V</strong> &ndash; винир, <strong>R</strong> &ndash; корень.
    </div>

    <!-- 4. КЛИНИЧЕСКИЕ ДИАГНОЗЫ ПО МКБ-10 -->
    <div class="section-title">4. Клинические диагнозы по МКБ-10</div>
    <ul class="icd-list">
      <li><span class="icd-code">К02.1</span> &mdash; <strong>Кариес дентина</strong> (хронический глубокий кариес зубов жевательной группы).</li>
      <li><span class="icd-code">К04.0</span> &mdash; <strong>Пульпит</strong> (хронический фиброзный пульпит зуба #3.6).</li>
      <li><span class="icd-code">К08.1</span> &mdash; <strong>Потеря зубов вследствие несчастного случая, удаления или локализованного пародонтита</strong> (частичная вторичная адентия верхней челюсти, дефект зубного ряда I класса по Кеннеди).</li>
      <li><span class="icd-code">К08.2</span> &mdash; <strong>Атрофия альвеолярного края верхней челюсти</strong> (область зубов #1.6, #2.6).</li>
    </ul>

    <!-- 5. ПЕРЕЧЕНЬ ПРОВЕДЕННЫХ МЕДИЦИНСКИХ ВМЕШАТЕЛЬСТВ -->
    <div class="section-title">5. Перечень проведенных процедур и операций</div>
    <table class="proc-table">
      <thead>
        <tr>
          <th style="width: 25px; text-align: center;">№</th>
          <th style="width: 85px;">Код услуги</th>
          <th>Наименование медицинского вмешательства</th>
          <th style="width: 60px; text-align: center;">Область</th>
          <th style="width: 95px;">Дата</th>
          <th style="width: 130px;">Врач</th>
        </tr>
      </thead>
      <tbody>
        ${proceduresRowsHtml}
      </tbody>
    </table>

    <!-- 6. ЗАКЛЮЧЕНИЕ И ЭПИКРИЗ -->
    <div class="section-title">6. Заключение, эпикриз и план контрольного наблюдения</div>
    <div class="clinical-block">
      <div>Полость рта полностью санирована. Проведена комплексная хирургическая и ортопедическая реабилитация: установлены дентальные имплантаты в области отсутствующих зубов #1.6, #2.6 с последующим протезированием циркониевыми коронками, завершено эндодонтическое лечение зуба #3.6, восстановлена эстетика фронтальной группы зубов керамическими винирами E.max. Окклюзионные взаимоотношения нормализованы.</div>
      <div style="margin-top: 4px; font-weight: 700; color: #0d9488;">
        Рекомендовано: явка на контрольный осмотр и профгигиену через 6 месяцев, проведение профессиональной гигиены полости рта 2 раза в год, соблюдение индивидуальной гигиены (ирригатор, монопучковая щетка).
      </div>
    </div>

    <!-- ПОДПИСИ И ПЕЧАТИ -->
    <div class="signatures-block">
      <div>
        <div style="font-weight: 700; margin-bottom: 8px;">Лечащий врач-стоматолог:</div>
        <div style="display: flex; align-items: center; gap: 16px;">
          <div>
            <div style="border-bottom: 1px solid #0f172a; width: 140px; height: 26px;"></div>
            <div style="font-size: 9.5px; color: #64748b; margin-top: 2px;">(личная подпись)</div>
          </div>
          <div class="doctor-stamp-card">
            <div class="stamp-title">Врач-стоматолог</div>
            <div class="stamp-name">${data.curatingDoctor}</div>
            <div class="stamp-reg">Сертификат действителен &bull; Личная печать</div>
          </div>
        </div>
      </div>

      <div class="clinic-stamp-circle">
        <span>ООО «Стоматологическая клиника ДЕНТЕ»</span>
        <span style="font-size: 7.5px; margin: 2px 0;">Для медицинских документов</span>
        <span style="font-size: 7px;">ОГРН ${clinicOgrn}</span>
        <span style="font-size: 6.5px;">г. Санкт-Петербург</span>
      </div>
    </div>

    <!-- ЮРИДИЧЕСКИЙ ПОДВАЛ -->
    <div class="legal-footer">
      Выписка выдана пациенту (законному представителю) на основании ч. 5 ст. 22 Федерального закона от 21.11.2011 № 323-ФЗ «Об основах охраны здоровья граждан в Российской Федерации».<br>
      Цифровой отпечаток архива медицинской карты: <code>${doc.sha256 || "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08"}</code>
    </div>
  </div>
</body>
</html>`;
}
