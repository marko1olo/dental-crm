/**
 * apps/web/src/components/consents/consentCatalogData.ts
 *
 * Канонический каталог юридических документов DENTE CRM (Мандаты 8e, 8n, 8x, 8ap).
 * 4 базовых документа РФ: терапия/гигиена, хирургия/имплантация, ортодонтия, договор платных услуг.
 * 3 статуса подписания: signed_digital, signed_paper, pending.
 * Генератор чистого HTML/PDF текста для печати бланка А4 в 1 клик.
 */

export type ConsentDocumentId =
	| "therapy_hygiene"
	| "surgery_implant"
	| "orthodontics"
	| "paid_contract";

export type ConsentSignStatus = "signed_digital" | "signed_paper" | "pending";

export interface ConsentSection {
	readonly id: string;
	readonly title: string;
	readonly content: string;
	readonly bullets?: readonly string[];
}

export interface ConsentDocumentItem {
	readonly id: ConsentDocumentId;
	readonly title: string;
	readonly subtitle: string;
	readonly category: "therapy" | "surgery" | "orthodontics" | "legal";
	readonly statutoryBasis: string;
	readonly sections: readonly ConsentSection[];
	readonly risks: readonly string[];
	readonly guarantees: readonly string[];
	readonly defaultStatus: ConsentSignStatus;
}

export interface ConsentPartyContext {
	readonly patientName: string;
	readonly birthDate?: string;
	readonly passport?: string;
	readonly phone?: string;
	readonly address?: string;
	readonly clinicName?: string;
	readonly clinicAddress?: string;
	readonly clinicOgrn?: string;
	readonly clinicInn?: string;
	readonly doctorName?: string;
	readonly date?: string;
}

export const CANONICAL_CONSENT_CATALOG: readonly ConsentDocumentItem[] = [
	{
		id: "therapy_hygiene",
		title: "Информированное согласие на общее терапевтическое лечение и профгигиену",
		subtitle: "Лечение кариеса, пульпита, периодонтита, эстетическая реставрация и ультразвуковая гигиена",
		category: "therapy",
		statutoryBasis: "Ст. 20 Федерального закона № 323-ФЗ, Клинические рекомендации СтАР",
		defaultStatus: "pending",
		sections: [
			{
				id: "scope",
				title: "1. Суть и цели медицинского вмешательства",
				content:
					"Пациент информирован о диагнозе, плане лечения и методах терапии, включающих анестезию, препарирование кариозных полостей, механическую и медикаментозную обработку корневых каналов, пломбирование современными светоотверждаемыми композитами, а также ультразвуковое и воздушно-абразивное снятие зубных отложений.",
				bullets: [
					"Изоляция операционного поля коффердамом для защиты от слюны и антисептиков;",
					"Аппаратная обработка корневых каналов никель-титановыми инструментами;",
					"Эстетическое восстановление анатомической формы коронковой части зуба.",
				],
			},
			{
				id: "risks",
				title: "2. Возможные сопутствующие реакции и риски",
				content:
					"Пациент уведомлен, что в процессе лечения и после него возможны кратковременная чувствительность при накусывании (3–7 дней), онемение мягких тканей после анестезии, а также выявление скрытого пульпита при глубоком кариесе, требующее депульпирования.",
				bullets: [
					"Постпломбировочные боли при накусывании, купируемые противовоспалительными препаратами;",
					"Необходимость повторного визита при эндодонтическом лечении;",
					"Временная гиперестезия шеек зубов после ультразвуковой чистки.",
				],
			},
			{
				id: "obligations",
				title: "3. Рекомендации лечащего врача и гарантии",
				content:
					"Пациент обязуется не принимать пищу до окончания действия анестезии, соблюдать индивидуальную гигиену и являться на контрольные осмотры не реже одного раза в 6 месяцев. Гарантия действует при соблюдении назначений врача.",
			},
		],
		risks: [
			"Кратковременная постпломбировочная чувствительность",
			"Переход глубокого кариеса в пульпит при скрытом воспалении",
			"Аллергическая реакция на анестетик при неполном анамнезе",
		],
		guarantees: [
			"Качество реставрации согласно клиническим стандартам СтАР",
			"Бесплатная коррекция окклюзионных контактов по гарантии",
		],
	},
	{
		id: "surgery_implant",
		title: "Информированное согласие на хирургическое вмешательство и имплантацию",
		subtitle: "Атравматичное удаление зубов, установка дентальных имплантатов, костная пластика и синус-лифтинг",
		category: "surgery",
		statutoryBasis: "Ст. 20 Федерального закона № 323-ФЗ, Клинические протоколы СтАР по дентальной имплантации",
		defaultStatus: "pending",
		sections: [
			{
				id: "scope",
				title: "1. Хирургический план и методы операции",
				content:
					"Вмешательство направлено на устранение очага острой/хронической инфекции либо восстановление утраченных зубов методом дентальной имплантации. Процедура проводится под инфильтрационной или проводниковой анестезией с соблюдением правил асептики и антисептики.",
				bullets: [
					"Атравматичное извлечение корней с сохранением костных стенок альвеолы;",
					"Препарирование костного ложа с непрерывным физрастворным охлаждением;",
					"Установка титанового имплантата и фиксация барьерных мембран при остеопластике.",
				],
			},
			{
				id: "risks",
				title: "2. Специфические анатомические риски",
				content:
					"Пациент предупрежден о возможности реактивного послеоперационного отека (до 3–5 суток), появлении гематом, затруднении открывания рта (тризм), риске временного онемения (парестезии) губы или подбородка при близком прохождении нижнеальвеолярного нерва, а также о статистическом риске дезинтеграции имплантата (1–2%).",
				bullets: [
					"Реактивный отек мягких тканей лица и болевой синдром в первые 3 дня;",
					"Риск альвеолита при вымывании защитного кровяного сгустка;",
					"Необходимость приема антибактериальной и противоотечной терапии.",
				],
			},
			{
				id: "postop",
				title: "3. Послеоперационный режим и ответственность",
				content:
					"Пациент обязуется прикладывать холод в первые 3–4 часа, исключить горячие ванны, бани, физические нагрузки на 7 дней, не курить и соблюдать медикаментозные назначения.",
			},
		],
		risks: [
			"Послеоперационный реактивный отек и гематомы мягких тканей",
			"Временная парестезия ветвей тройничного нерва",
			"Риск неприживления имплантата при нарушении режима или курении",
		],
		guarantees: [
			"Хирургический протокол ведущих мировых систем имплантации",
			"Гарантийная переустановка имплантата при отсутствии остеоинтеграции",
		],
	},
	{
		id: "orthodontics",
		title: "Информированное согласие на ортодонтическое лечение",
		subtitle: "Исправление прикуса и положения зубов брекет-системами или прозрачными элайнерами",
		category: "orthodontics",
		statutoryBasis: "Ст. 20 Федерального закона № 323-ФЗ, Протоколы Профессионального общества ортодонтов России",
		defaultStatus: "pending",
		sections: [
			{
				id: "scope",
				title: "1. Биомеханика и длительность ортодонтического курса",
				content:
					"Ортодонтическое перемещение зубов — длительный биологический процесс (12–36 месяцев), требующий регулярных активаций аппаратуры (смены дуг, лигатур, эластиков или элайнеров каждые 4–8 недель) и строгого соблюдения графика визитов.",
			},
			{
				id: "risks",
				title: "2. Риски аппаратурного перемещения зубов",
				content:
					"Пациент проинформирован о болезненности в первые 3–7 дней после каждой активации, риске натирания слизистой оболочки рта, вероятности деминерализации эмали вокруг замочков при слабой гигиене, возможности верхушечной резорбции корней, а также о риске рецидива при отказе от ретенционных аппаратов.",
				bullets: [
					"Адаптационный дискомфорт и временное нарушение дикции;",
					"Повышенные требования к гигиене: монопучковые щетки, ершики, ирригатор;",
					"Обязательность ношения несъемных ретейнеров или ретенционных капп после снятия брекетов.",
				],
			},
			{
				id: "retention",
				title: "3. Значение ретенционного периода",
				content:
					"Стабильность достигнутого эстетического и функционального результата напрямую зависит от соблюдения ретенционного протокола. Самовольное снятие ретейнера ведет к неконтролируемому смещению зубов.",
			},
		],
		risks: [
			"Деминерализация эмали при недостаточно тщательной гигиене",
			"Незначительное укорочение верхушек корней перемещаемых зубов",
			"Рецидив зубочелюстной аномалии при отказе от ретейнеров",
		],
		guarantees: [
			"Контроль динамики перемещения зубов на каждом визите",
			"Фиксация анатомически стабильного функционального прикуса",
		],
	},
	{
		id: "paid_contract",
		title: "Договор на оказание платных медицинских услуг",
		subtitle: "Официальный договор с клиникой, гарантии, права сторон и фискальные расчеты (54-ФЗ)",
		category: "legal",
		statutoryBasis: "Постановление Правительства РФ № 736, Закон РФ «О защите прав потребителей», ст. 84 323-ФЗ",
		defaultStatus: "pending",
		sections: [
			{
				id: "subject",
				title: "1. Предмет договора и статус сторон",
				content:
					"Клиника (Исполнитель) обязуется оказать Пациенту (Заказчику) квалифицированные платные стоматологические услуги в соответствии с утвержденным планом лечения и прейскурантом, а Пациент обязуется своевременно принять и оплатить оказанные услуги.",
			},
			{
				id: "state_guarantees",
				title: "2. Уведомление о программе государственных гарантий (ОМС)",
				content:
					"До подписания договора Пациент письменно уведомлен о возможности получения бесплатной медицинской помощи в рамках программы государственных гарантий и территориальной программы ОМС в государственных учреждениях. Пациент добровольно выбирает лечение на возмездной основе за счет личных средств.",
			},
			{
				id: "payment",
				title: "3. Стоимость услуг и порядок фискальных расчетов (54-ФЗ)",
				content:
					"Стоимость услуг фиксируется в согласованной смете на основании действующего прейскуранта. Оплата производится наличными денежными средствами в кассу, банковской картой или через Систему быстрых платежей (СБП) с обязательной выдачей фискального кассового чека (54-ФЗ).",
			},
			{
				id: "obligations",
				title: "4. Права, обязанности и гарантии качества",
				content:
					"Исполнитель гарантирует соблюдение стандартов медицинской помощи и санитарных норм РФ. Пациент обязуется сообщать достоверные сведения о здоровье, соблюдать график приемов и рекомендации лечащего врача. Справка об оплате медицинских услуг для социального налогового вычета в ФНС (ст. 219 НК РФ) выдается по первому требованию.",
			},
		],
		risks: [],
		guarantees: [
			"Предоставление всех платежных документов и чеков 54-ФЗ для ФНС",
			"Гарантийное обслуживание в соответствии с Положением о гарантиях клиники",
		],
	},
];

export function getConsentDocumentById(id: ConsentDocumentId): ConsentDocumentItem {
	return CANONICAL_CONSENT_CATALOG.find((item) => item.id === id) || CANONICAL_CONSENT_CATALOG[0];
}

export function generateConsentPrintHtml(
	doc: ConsentDocumentItem,
	context?: Partial<ConsentPartyContext>,
	signature?: { status: ConsentSignStatus; signedAt?: string; signatureSvg?: string },
): string {
	const patientName = context?.patientName || "________________________________________________";
	const birthDate = context?.birthDate || "____.____.________";
	const passport = context?.passport || "серия ______ № ________ выдан ________________________";
	const clinicName = context?.clinicName || "Стоматологическая клиника «DENTE»";
	const doctorName = context?.doctorName || "Лечащий врач-стоматолог";
	const dateStr = context?.date || new Date().toLocaleDateString("ru-RU");
	const status = signature?.status || doc.defaultStatus;

	const sectionsHtml = doc.sections
		.map(
			(sec) => `
		<section class="doc-section">
			<h3 class="section-title">${sec.title}</h3>
			<p class="section-text">${sec.content}</p>
			${sec.bullets?.length ? `<ul class="section-bullets">${sec.bullets.map((b) => `<li>${b}</li>`).join("")}</ul>` : ""}
		</section>`,
		)
		.join("");

	let signatureBlockHtml = "";
	if (status === "signed_paper") {
		signatureBlockHtml = `
		<div class="signature-stamp paper-stamp">
			<div class="stamp-icon">✓</div>
			<div class="stamp-text">
				<strong>ДОКУМЕНТ ПОДПИСАН НА БУМАЖНОМ НОСИТЕЛЕ</strong>
				<div>Оригинал подписан пациентом собственноручно и хранится в бумажном архиве клиники.</div>
				<div class="stamp-meta">Дата регистрации: ${signature?.signedAt || dateStr} • Врач: ${doctorName}</div>
			</div>
		</div>
		<div class="signature-lines">
			<div>Подпись пациента: _______________________ / ${patientName} /</div>
			<div>Подпись врача: ___________________________ / ${doctorName} /</div>
		</div>`;
	} else if (status === "signed_digital" && signature?.signatureSvg) {
		signatureBlockHtml = `
		<div class="signature-stamp digital-stamp">
			<div class="stamp-icon">✓</div>
			<div class="stamp-text">
				<strong>ПОДПИСАНО ПРОСТОЙ ЭЛЕКТРОННОЙ ПОДПИСЬЮ (ПЭП)</strong>
				<div>Подписано на сенсорном терминале/планшете клиники. Юридическая сила по ст. 5 63-ФЗ.</div>
				<div class="stamp-meta">Дата и время: ${signature?.signedAt || dateStr} • Пациент: ${patientName}</div>
			</div>
		</div>
		<div class="signature-visual">
			<div class="svg-container">${signature.signatureSvg}</div>
			<div class="visual-caption">Графический след электронной подписи: ${patientName}</div>
		</div>
		<div class="signature-lines">
			<div>ЭЦП врача: ___________________________ / ${doctorName} /</div>
		</div>`;
	} else {
		signatureBlockHtml = `
		<div class="signature-lines empty-stamp">
			<div class="line-row"><span>Подпись пациента:</span><span class="underline">___________________________ / ${patientName} /</span></div>
			<div class="line-row"><span>Лечащий врач:</span><span class="underline">___________________________ / ${doctorName} /</span></div>
			<div class="date-row">Дата оформления: «____» ________________ 202___ г. М.П.</div>
		</div>`;
	}

	return `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><title>${doc.title} — ${patientName}</title>
<style>
@page { size: A4 portrait; margin: 15mm; } * { box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 10pt; line-height: 1.45; color: #0f172a; background: #fff; margin: 0; }
.header { border-bottom: 2px solid #0d9488; padding-bottom: 8px; margin-bottom: 12px; }
.clinic-info { font-size: 9pt; color: #475569; text-transform: uppercase; }
.doc-title { font-size: 13pt; font-weight: 700; margin: 6px 0 2px; color: #0f172a; }
.doc-subtitle { font-size: 9.5pt; color: #334155; font-style: italic; }
.party-meta { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; margin: 10px 0; font-size: 9pt; }
.meta-row { margin: 3px 0; } .doc-section { margin-bottom: 10px; }
.section-title { font-size: 10pt; font-weight: 700; margin: 8px 0 3px; color: #0f172a; }
.section-text { margin: 0 0 4px; text-align: justify; } .section-bullets { margin: 3px 0 6px 20px; padding: 0; }
.signature-area { margin-top: 18px; page-break-inside: avoid; }
.signature-stamp { display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-radius: 6px; margin-bottom: 12px; }
.paper-stamp { background: #f0fdf4; border: 1px solid #86efac; color: #166534; }
.digital-stamp { background: #f0fdfa; border: 1px solid #5eead4; color: #115e59; }
.stamp-icon { font-size: 16pt; font-weight: bold; } .stamp-text { font-size: 8.5pt; } .stamp-meta { margin-top: 2px; font-size: 8pt; opacity: 0.85; }
.signature-lines { margin-top: 14px; font-size: 9.5pt; } .line-row { display: flex; justify-content: space-between; margin-bottom: 12px; }
.svg-container { max-width: 260px; height: 60px; border-bottom: 1px solid #94a3b8; } .svg-container svg { width: 100%; height: 100%; }
.visual-caption { font-size: 8pt; color: #64748b; margin-top: 2px; } .date-row { margin-top: 10px; font-size: 9pt; color: #475569; }
</style></head><body><div class="print-container">
<header class="header"><div class="clinic-info">${clinicName} • Лицензия на медицинскую деятельность</div><h1 class="doc-title">${doc.title}</h1><div class="doc-subtitle">${doc.subtitle}</div></header>
<div class="party-meta"><div class="meta-row"><strong>Пациент:</strong> ${patientName} • Дата рождения: ${birthDate}</div><div class="meta-row"><strong>Паспорт:</strong> ${passport}</div><div class="meta-row"><strong>Лечащий врач:</strong> ${doctorName} • Дата: ${dateStr}</div></div>
<div class="sections-body">${sectionsHtml}</div><div class="signature-area">${signatureBlockHtml}</div>
</div></body></html>`;
}
