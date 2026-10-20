/**
 * apps/web/src/components/visit/view/fastPrintModules/fastPrintConsentAndMemoBuilder.ts
 *
 * Генератор печатных форм информированного добровольного согласия (ИДС),
 * памятки пациента после приёма / удаления, акта выполненных работ и сметы плана лечения.
 * Строго 0 мультяшных эмодзи (Мандат 8d, Грех №7) — только официальная медицинская типографика.
 */

import { formatRuDateShort } from "../../../../utils/dateUtils";
import { extractClinicRequisites, printHtmlViaIframe } from "./fastPrintDiaryBuilder";

export interface FastPrintConsentParams {
	readonly activePatient?: any;
	readonly activeDoctor?: any;
	readonly activeAppointment?: any;
	readonly visitNoteForm?: any;
	readonly dashboard?: any;
	readonly selectedToothForMenu?: any;
	readonly interventionType?: string;
}

export interface FastPrintCompletedActParams {
	readonly activePatient?: any;
	readonly activeDoctor?: any;
	readonly activeAppointment?: any;
	readonly visitNoteForm?: any;
	readonly dashboard?: any;
	readonly activePlan?: any;
	readonly isClosed?: boolean;
}

export interface FastPrintEstimateParams {
	readonly activePatient?: any;
	readonly activeDoctor?: any;
	readonly activeAppointment?: any;
	readonly dashboard?: any;
	readonly activePlan?: any;
}

export interface FastPrintPatientMemoParams {
	readonly activePatient?: any;
	readonly activeDoctor?: any;
	readonly interventionType: "therapy" | "surgery_extraction" | "implant" | "hygiene" | "orthopedics";
	readonly toothNumber?: number | string;
	readonly clinicName?: string;
	readonly emergencyPhone?: string;
}

/**
 * Собирает официальную памятку рекомендаций пациенту после проведенного лечения/удаления.
 */
export function buildFastPrintPatientMemoHtml(params: FastPrintPatientMemoParams): string {
	const patientName = params.activePatient?.fullName || "Пациент";
	const doctorName = params.activeDoctor?.fullName || "Лечащий врач";
	const phone = params.emergencyPhone || "+7 (495) 000-00-00";

	let memoTitle = "Памятка пациенту после стоматологического лечения";
	let memoPoints: string[] = [];

	if (params.interventionType === "surgery_extraction" || params.interventionType === "implant") {
		memoTitle = `Памятка пациенту после хирургического вмешательства${params.toothNumber ? ` (зуб ${params.toothNumber})` : ""}`;
		memoPoints = [
			"Удерживать марлевый тампон прижатым 15–20 минут, затем аккуратно сплюнуть.",
			"Не принимать пищу в течение 2 часов. В течение 24 часов избегать горячей, острой и грубой пищи.",
			"Категорически запрещено полоскать полость рта в день операции, чтобы не вымыть кровяной сгусток.",
			"Не греть оперированную область, исключить бани, сауны, горячие ванны и физические нагрузки на 3 дня.",
			"При появлении умеренной боли принять назначенный анальгетик по инструкции врача.",
			"При нарастающем кровотечении или повышении температуры выше 38 °C немедленно связаться с клиникой.",
		];
	} else if (params.interventionType === "hygiene") {
		memoTitle = "Памятка пациенту после профессиональной гигиены полости рта";
		memoPoints = [
			"Воздержаться от приема пищи в течение 1–1.5 часов.",
			"В течение 24–48 часов исключить красящие продукты: кофе, крепкий чай, свёклу, красное вино («белая диета»).",
			"Заменить зубную щётку на новую (средней жесткости или мягкую по назначению врача).",
			"При повышенной чувствительности использовать пасту для чувствительных зубов и реминерализующий гель.",
			"Чистить зубы не менее 2 раз в день с использованием зубной нити и ирригатора.",
		];
	} else {
		memoTitle = `Памятка пациенту после терапевтического лечения${params.toothNumber ? ` (зуб ${params.toothNumber})` : ""}`;
		memoPoints = [
			"Не принимать пищу до полного окончания действия местной анестезии (риск прикусывания щеки/губы).",
			"В первые сутки избегать чрезмерных жевательных нагрузок на вылеченный зуб.",
			"Возможна незначительная чувствительность зуба при накусывании в течение 2–3 дней (адаптационный период).",
			"При ощущении завышения прикуса обратиться к лечащему врачу для полировки контактов.",
			"Проходить плановый профилактический осмотр не реже 1 раза в 6 месяцев.",
		];
	}

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8" />
	<title>${memoTitle} — ${patientName}</title>
	<style>
		@page { size: A5; margin: 12mm; }
		body { font-family: "Times New Roman", Times, serif; font-size: 10pt; line-height: 1.4; color: #000; margin: 0; padding: 0; }
		.header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 4px; margin-bottom: 8px; }
		.title { font-size: 11pt; font-weight: bold; text-transform: uppercase; margin-bottom: 2px; }
		.sub { font-size: 9pt; color: #444; }
		ol { margin: 8px 0; padding-left: 20px; }
		li { margin-bottom: 5px; text-align: justify; }
		.footer { margin-top: 18px; border-top: 1px solid #ccc; padding-top: 6px; font-size: 9pt; display: flex; justify-content: space-between; }
	</style>
</head>
<body>
	<div class="header">
		<div class="title">${params.clinicName || "Стоматологическая клиника DENTE"}</div>
		<div class="sub">${memoTitle}</div>
	</div>
	<div style="margin-bottom: 6px;"><strong>Уважаемый(ая) ${patientName}!</strong> Для успешного восстановления строго соблюдайте следующие предписания:</div>
	<ol>
		${memoPoints.map((p) => `<li>${p}</li>`).join("")}
	</ol>
	<div class="footer">
		<div>Лечащий врач: <strong>${doctorName}</strong></div>
		<div>Экстренная связь: <strong>${phone}</strong></div>
	</div>
</body>
</html>`;
}

export function executeFastPrintPatientMemo(params: FastPrintPatientMemoParams): void {
	const html = buildFastPrintPatientMemoHtml(params);
	printHtmlViaIframe(html, `Памятка_${params.activePatient?.fullName || "Пациент"}`);
}

export function executeFastPrintInformedConsent({
	activePatient,
	activeDoctor,
	activeAppointment,
	visitNoteForm,
	dashboard,
	selectedToothForMenu,
	interventionType = "терапевтическое лечение кариеса и его осложнений",
}: FastPrintConsentParams) {
	const req = extractClinicRequisites(dashboard);
	const patientName = activePatient?.fullName || "Пациент";
	const birthDate = activePatient?.birthDate ? formatRuDateShort(activePatient.birthDate) : "—";
	const passport = activePatient?.passportSeries && activePatient?.passportNumber
		? `${activePatient.passportSeries} № ${activePatient.passportNumber}`
		: "Паспортные данные в ЭМК";
	const doctorName = activeDoctor?.fullName || "Лечащий врач";
	const specialty = activeDoctor?.specialty || "Стоматолог-терапевт";
	const currentDate = activeAppointment?.startsAt ? formatRuDateShort(activeAppointment.startsAt) : new Date().toLocaleDateString("ru-RU");
	const toothInfo = selectedToothForMenu ? ` (в области зуба № ${selectedToothForMenu})` : "";
	const diagnosis = visitNoteForm?.diagnosis || "Клинический диагноз по МКБ-10 установлен";

	const html = `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>Информированное согласие — ${patientName}</title>
	<style>
		@page { size: A4; margin: 15mm 15mm 15mm 20mm; }
		body { font-family: "Times New Roman", Times, serif; font-size: 10.5pt; line-height: 1.35; color: #000; margin: 0; padding: 0; text-align: justify; }
		.header { text-align: center; border-bottom: 1px solid #000; padding-bottom: 4px; margin-bottom: 14px; }
		.clinic-title { font-weight: bold; font-size: 12pt; text-transform: uppercase; }
		.doc-title { font-weight: bold; font-size: 11pt; margin-top: 6px; text-transform: uppercase; }
		p { margin: 6px 0; text-indent: 20px; }
		.sign-box { margin-top: 30px; width: 100%; display: table; page-break-inside: avoid; }
		.sign-col { display: table-cell; width: 50%; vertical-align: bottom; }
		.line { border-bottom: 1px solid #000; display: inline-block; width: 85%; height: 16px; margin-top: 18px; }
	</style>
</head>
<body>
	<div class="header">
		<div class="clinic-title">${req.clinicName}</div>
		<div style="font-size: 8.5pt; color: #444;">${req.clinicAddress} | Лицензия: ${req.license}</div>
		<div class="doc-title">Информированное добровольное согласие на медицинское вмешательство</div>
		<div style="font-size: 8.5pt; color: #444;">В соответствии со ст. 20 Федерального закона от 21.11.2011 № 323-ФЗ</div>
	</div>

	<p>Я, <strong>${patientName}</strong>, дата рождения: ${birthDate}, документ: ${passport}, даю информированное добровольное согласие на медицинское вмешательство: <strong>${interventionType}${toothInfo}</strong>, проводимое лечащим врачом <strong>${doctorName}</strong> (${specialty}).</p>

	<p>1. Мне разъяснены цели, методы оказания медицинской помощи, связанный с ними риск, возможные варианты медицинских вмешательств, их последствия, в том числе вероятность развития осложнений, а также предполагаемые результаты оказания медицинской помощи.</p>

	<p>2. Я проинформирован(а) об установленном диагнозе: <strong>${diagnosis}</strong>. Мне разъяснена необходимость проведения лечебно-диагностических мероприятий, применения анестезии и материалов.</p>

	<p>3. Я предупрежден(а) о необходимости соблюдения рекомендаций врача и режима лечения. Я подтверждаю, что сообщил(а) полные и достоверные сведения о состоянии своего здоровья, наличии соматических заболеваний, аллергических реакций и принимаемых препаратах.</p>

	<p>4. Мне предоставлена возможность задать все интересующие вопросы, и я получил(а) на них исчерпывающие ответы на понятном мне языке.</p>

	<div class="sign-box">
		<div class="sign-col">
			<div>Пациент: <strong>${patientName}</strong></div>
			<div class="line"></div>
			<div style="font-size: 8pt; color: #555;">(подпись, расшифровка подписи)</div>
			<div style="margin-top: 8px; font-size: 9pt;">Дата: ${currentDate}</div>
		</div>
		<div class="sign-col" style="text-align: right;">
			<div>Врач: <strong>${doctorName}</strong></div>
			<div class="line"></div>
			<div style="font-size: 8pt; color: #555;">(подпись, личная печать)</div>
			<div style="margin-top: 8px; font-size: 9pt;">Дата: ${currentDate}</div>
		</div>
	</div>
</body>
</html>`;

	printHtmlViaIframe(html, `ИДС_${patientName}`);
}

export function executeFastPrintCompletedAct({
	activePatient,
	activeDoctor,
	activeAppointment,
	visitNoteForm,
	dashboard,
	activePlan,
	isClosed = false,
}: FastPrintCompletedActParams) {
	const req = extractClinicRequisites(dashboard);
	const patientName = activePatient?.fullName || "Пациент";
	const cardNumber = activePatient?.cardNumber || activePatient?.medicalCardNumber || activePatient?.id || "001";
	const doctorName = activeDoctor?.fullName || "Лечащий врач";
	const visitDate = activeAppointment?.startsAt ? formatRuDateShort(activeAppointment.startsAt) : new Date().toLocaleDateString("ru-RU");

	const items = Array.isArray(activePlan?.items) ? activePlan.items : [];

	const totalSum = items.reduce((acc: number, item: any) => acc + (Number(item.totalRub || item.priceRub || 0) * (Number(item.quantity) || 1)), 0);

	const html = `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>Акт оказанных услуг — ${patientName}</title>
	<style>
		@page { size: A4; margin: 15mm; }
		body { font-family: "Times New Roman", Times, serif; font-size: 10pt; line-height: 1.35; color: #000; margin: 0; padding: 0; }
		.header { text-align: center; border-bottom: 1px solid #000; padding-bottom: 4px; margin-bottom: 12px; }
		.title { font-size: 12pt; font-weight: bold; text-transform: uppercase; margin-top: 6px; }
		.meta { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 10pt; }
		.meta td { padding: 2px 4px; }
		.table { width: 100%; border-collapse: collapse; margin-top: 8px; margin-bottom: 12px; }
		.table th, .table td { border: 1px solid #000; padding: 4px 6px; font-size: 9.5pt; }
		.table th { background: #f2f2f2; text-align: center; }
		.total { text-align: right; font-weight: bold; font-size: 11pt; margin-top: 6px; }
		.signs { margin-top: 30px; display: table; width: 100%; page-break-inside: avoid; }
		.signs-col { display: table-cell; width: 50%; vertical-align: bottom; }
		.line { border-bottom: 1px solid #000; width: 80%; display: inline-block; margin-top: 16px; }
	</style>
</head>
<body>
	<div class="header">
		<div style="font-weight: bold; font-size: 11pt;">${req.clinicName}</div>
		<div style="font-size: 8.5pt; color: #444;">${req.clinicAddress} | ИНН: ${req.clinicInn} | ОГРН: ${req.clinicOgrn}</div>
		<div class="title">Акт оказанных медицинских услуг от ${visitDate}</div>
	</div>

	<table class="meta">
		<tr>
			<td style="width: 25%; font-weight: bold;">Пациент (Заказчик):</td>
			<td>${patientName} (Медкарта № ${cardNumber})</td>
		</tr>
		<tr>
			<td style="font-weight: bold;">Исполнитель:</td>
			<td>${req.clinicName} (Врач: ${doctorName})</td>
		</tr>
	</table>

	<table class="table">
		<thead>
			<tr>
				<th style="width: 5%;">№</th>
				<th style="width: 15%;">Код 804н</th>
				<th>Наименование медицинской услуги</th>
				<th style="width: 8%;">Кол-во</th>
				<th style="width: 15%;">Цена (руб.)</th>
				<th style="width: 15%;">Сумма (руб.)</th>
			</tr>
		</thead>
		<tbody>
			${items.length > 0 ? items.map((item: any, idx: number) => `
			<tr>
				<td style="text-align: center;">${idx + 1}</td>
				<td style="text-align: center; font-family: monospace;">${item.code || "A16.07.002"}</td>
				<td>${item.name || item.title || "Стоматологическая услуга"}</td>
				<td style="text-align: center;">${item.quantity || 1}</td>
				<td style="text-align: right;">${Number(item.priceRub || 0).toLocaleString("ru-RU")}</td>
				<td style="text-align: right; font-weight: bold;">${(Number(item.priceRub || 0) * (Number(item.quantity) || 1)).toLocaleString("ru-RU")}</td>
			</tr>
			`).join("") : `
			<tr>
				<td colspan="6" style="text-align: center; padding: 12px; color: #666; font-style: italic;">
					Услуги не выбраны
				</td>
			</tr>
			`}
		</tbody>
	</table>

	<div class="total">Итого оказано услуг на сумму: ${totalSum.toLocaleString("ru-RU")} руб. 00 коп.</div>
	<p style="font-size: 9pt; margin-top: 10px;">Вышеперечисленные услуги оказаны в полном объеме, своевременно и надлежащего качества. Стороны претензий по объему, качеству и срокам оказания услуг друг к другу не имеют.</p>

	<div class="signs">
		<div class="signs-col">
			<div>Исполнитель: ${doctorName}</div>
			<div class="line"></div>
			<div style="font-size: 8pt; color: #555;">(подпись врача, М.П.)</div>
		</div>
		<div class="signs-col" style="text-align: right;">
			<div>Пациент: ${patientName}</div>
			<div class="line"></div>
			<div style="font-size: 8pt; color: #555;">(подпись пациента)</div>
		</div>
	</div>
</body>
</html>`;

	printHtmlViaIframe(html, `Акт_услуг_${patientName}`);
}

export function executeFastPrintTreatmentPlanEstimate({
	activePatient,
	activeDoctor,
	activeAppointment,
	dashboard,
	activePlan,
}: FastPrintEstimateParams) {
	const req = extractClinicRequisites(dashboard);
	const patientName = activePatient?.fullName || "Пациент";
	const cardNumber = activePatient?.cardNumber || activePatient?.medicalCardNumber || activePatient?.id || "001";
	const doctorName = activeDoctor?.fullName || "Лечащий врач";
	const currentDate = activeAppointment?.startsAt ? formatRuDateShort(activeAppointment.startsAt) : new Date().toLocaleDateString("ru-RU");
	const planName = (activePlan as any)?.title || (activePlan as any)?.name || "Основной план лечения";

	const items = Array.isArray(activePlan?.items) ? activePlan.items : [];

	const totalSum = items.reduce((acc: number, item: any) => acc + (Number(item.priceRub || 0) * (Number(item.quantity) || 1)), 0);

	const html = `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>Смета плана лечения — ${patientName}</title>
	<style>
		@page { size: A4; margin: 15mm; }
		body { font-family: "Times New Roman", Times, serif; font-size: 10pt; line-height: 1.35; color: #000; margin: 0; padding: 0; }
		.header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 4px; margin-bottom: 12px; }
		.title { font-size: 12pt; font-weight: bold; text-transform: uppercase; margin-top: 6px; }
		.table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 12px; }
		.table th, .table td { border: 1px solid #000; padding: 5px 6px; font-size: 9.5pt; }
		.table th { background: #f2f2f2; }
		.total { text-align: right; font-weight: bold; font-size: 11pt; margin-top: 8px; }
		.signs { margin-top: 36px; display: table; width: 100%; page-break-inside: avoid; }
		.signs-col { display: table-cell; width: 50%; vertical-align: bottom; }
		.line { border-bottom: 1px solid #000; width: 85%; display: inline-block; margin-top: 16px; }
	</style>
</head>
<body>
	<div class="header">
		<div style="font-weight: bold; font-size: 11pt;">${req.clinicName}</div>
		<div style="font-size: 8.5pt; color: #444;">${req.clinicAddress} | Тел: ${req.clinicPhone}</div>
		<div class="title">Предварительная смета плана лечения от ${currentDate}</div>
		<div style="font-size: 10pt; margin-top: 3px;">«${planName}»</div>
	</div>

	<div style="margin-bottom: 10px;">
		<div>Пациент: <strong>${patientName}</strong> (Медкарта № ${cardNumber})</div>
		<div>Врач-куратор: <strong>${doctorName}</strong></div>
	</div>

	<table class="table">
		<thead>
			<tr>
				<th style="width: 5%;">№</th>
				<th style="width: 10%;">Зуб</th>
				<th>Наименование этапа / манипуляции</th>
				<th style="width: 8%;">Кол-во</th>
				<th style="width: 16%;">Стоимость (руб.)</th>
			</tr>
		</thead>
		<tbody>
			${items.length > 0 ? items.map((item: any, idx: number) => `
			<tr>
				<td style="text-align: center;">${idx + 1}</td>
				<td style="text-align: center; font-weight: bold;">${item.tooth || item.toothNumber || "—"}</td>
				<td>${item.name || item.title || "Этап лечения"}</td>
				<td style="text-align: center;">${item.quantity || 1}</td>
				<td style="text-align: right; font-weight: bold;">${Number(item.priceRub || 0).toLocaleString("ru-RU")}</td>
			</tr>
			`).join("") : `
			<tr>
				<td colspan="5" style="text-align: center; padding: 12px; color: #666; font-style: italic;">
					Позиции плана лечения не указаны
				</td>
			</tr>
			`}
		</tbody>
	</table>

	<div class="total">Предварительная стоимость плана лечения: ${totalSum.toLocaleString("ru-RU")} руб.</div>
	<p style="font-size: 8.5pt; color: #555; margin-top: 12px;">* Смета является предварительным финансовым расчетом. Окончательная стоимость определяется фактически оказанными медицинскими услугами в соответствии с действующим прейскурантом клиники на момент их оказания.</p>

	<div class="signs">
		<div class="signs-col">
			<div>Врач-куратор: ${doctorName}</div>
			<div class="line"></div>
		</div>
		<div class="signs-col" style="text-align: right;">
			<div>С планом и сметой ознакомлен: ${patientName}</div>
			<div class="line"></div>
		</div>
	</div>
</body>
</html>`;

	printHtmlViaIframe(html, `Смета_${patientName}`);
}
