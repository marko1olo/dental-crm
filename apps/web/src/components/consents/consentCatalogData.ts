/**
 * apps/web/src/components/consents/consentCatalogData.ts
 *
 * Канонический реестр информированных согласий и договоров DENTE CRM (SSOT).
 * 15 базовых бланков Минздрава РФ по клиническим направлениям (Мандаты 8e, 8n, 8x, 8ap).
 * 3 статуса: signed_digital, signed_paper, pending.
 * Хэширование целостности подписи и генератор печати бланка А4.
 */

export type ConsentDocumentId =
	| "therapy"
	| "endodontics"
	| "orthopedics"
	| "surgery"
	| "implant"
	| "orthodontics"
	| "anesthesia"
	| "pediatric"
	| "hygiene"
	| "radiology"
	| "personal_data"
	| "periodontics"
	| "sedation"
	| "paid_contract"
	| "refusal";

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
	readonly category: "therapy" | "surgery" | "ortho" | "diag" | "legal";
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
	readonly doctorName?: string;
	readonly date?: string;
}

export const CANONICAL_CONSENT_CATALOG: readonly ConsentDocumentItem[] = [
	{
		id: "therapy",
		title: "Согласие на терапевтическое лечение",
		subtitle: "Лечение кариеса, эстетическая реставрация зубов",
		category: "therapy",
		statutoryBasis: "Клинические протоколы СтАР по лечению кариеса",
		defaultStatus: "pending",
		sections: [
			{ id: "s1", title: "1. Цель и суть вмешательства", content: "Препарирование кариозных тканей, восстановление анатомической формы коронки светоотверждаемым композитом.", bullets: ["Изоляция коффердамом;", "Адгезивная фиксация реставрации."] },
			{ id: "s2", title: "2. Сопутствующие риски", content: "Возможна кратковременная чувствительность при накусывании 3–5 дней. При глубоком кариесе возможен скрытый пульпит." },
		],
		risks: ["Постпломбировочная чувствительность", "Риск воспаления пульпы при глубоком кариесе"],
		guarantees: ["Бесплатная коррекция окклюзии по гарантии клиники"],
	},
	{
		id: "endodontics",
		title: "Согласие на эндодонтическое лечение",
		subtitle: "Механическая обработка и пломбирование корневых каналов",
		category: "therapy",
		statutoryBasis: "Стандарты эндодонтического лечения СтАР и ESE",
		defaultStatus: "pending",
		sections: [
			{ id: "s1", title: "1. План лечения каналов", content: "Удаление инфицированной пульпы, дезинфекция каналов, 3D обтурация гуттаперчей под контролем апекслокатора." },
			{ id: "s2", title: "2. Риски эндодонтии", content: "Вероятность атипичной анатомии, микротрещин корня или необходимости повторной ревизии." },
		],
		risks: ["Временные боли при накусывании", "Возможность кальцификации каналов"],
		guarantees: ["Рентген-контроль плотности герметизации верхушки корня"],
	},
	{
		id: "orthopedics",
		title: "Согласие на ортопедическое лечение",
		subtitle: "Протезирование коронками, винирами и мостовидными протезами",
		category: "ortho",
		statutoryBasis: "Рекомендации ортопедической секции СтАР",
		defaultStatus: "pending",
		sections: [
			{ id: "s1", title: "1. Ортопедический протокол", content: "Препарирование тканей, снятие цифрового или силиконового оттиска, фиксация постоянных коронок." },
			{ id: "s2", title: "2. Адаптационный период", content: "Период адаптации к протезу занимает от 3 до 14 дней. Необходима регулярная коррекция контактов." },
		],
		risks: ["Временный дискомфорт дикции", "Скол керамики при парафункциях жевательных мышц"],
		guarantees: ["Гарантия на целостность ортопедической конструкции"],
	},
	{
		id: "surgery",
		title: "Согласие на хирургическое лечение и удаление",
		subtitle: "Атравматичное удаление зубов, зубосохраняющие операции",
		category: "surgery",
		statutoryBasis: "Протоколы хирургической стоматологии СтАР",
		defaultStatus: "pending",
		sections: [
			{ id: "s1", title: "1. Хирургическое вмешательство", content: "Проведение местной анестезии, щадящая люксация корней, ревизия лунки и наложение швов." },
			{ id: "s2", title: "2. Послеоперационные реакции", content: "Возможен отек мягких тканей лица до 3 суток, затруднение открывания рта, образование гематомы." },
		],
		risks: ["Послеоперационный отек и болезненность", "Риск альвеолита при раннем вымывании сгустка"],
		guarantees: ["Бесплатные контрольные осмотры и снятие швов"],
	},
	{
		id: "implant",
		title: "Согласие на дентальную имплантацию",
		subtitle: "Установка имплантатов, синус-лифтинг и остеопластика",
		category: "surgery",
		statutoryBasis: "Международные протоколы ITI и СтАР",
		defaultStatus: "pending",
		sections: [
			{ id: "s1", title: "1. Имплантологический план", content: "Формирование ложа в костной ткани с охлаждением, установка титанового имплантата." },
			{ id: "s2", title: "2. Специфические риски", content: "Статистический риск дезинтеграции (1-2%), временная парестезия веточек нерва при дефиците кости." },
		],
		risks: ["Реактивный отек лица до 5 дней", "Риск дезинтеграции при нарушении гигиены"],
		guarantees: ["Гарантийная повторная установка при отсутствии остеоинтеграции"],
	},
	{
		id: "orthodontics",
		title: "Согласие на ортодонтическое лечение",
		subtitle: "Исправление прикуса брекет-системами и элайнерами",
		category: "ortho",
		statutoryBasis: "Протоколы Профессионального общества ортодонтов России",
		defaultStatus: "pending",
		sections: [
			{ id: "s1", title: "1. Курс ортодонтии", content: "Аппаратурное перемещение зубов длительностью 12–36 месяцев с регулярными активациями каждые 4–6 недель." },
			{ id: "s2", title: "2. Ретенционный период", content: "Обязательное ношение ретейнеров после снятия аппаратуры для исключения рецидива смещения зубов." },
		],
		risks: ["Дискомфорт после активации 3-5 дней", "Риск рецидива при отказе от ретейнера"],
		guarantees: ["Стабильный функциональный прикус при соблюдении ретенции"],
	},
	{
		id: "anesthesia",
		title: "Согласие на местную анестезию",
		subtitle: "Инфильтрационное и проводниковое обезболивание",
		category: "therapy",
		statutoryBasis: "Рекомендации Федерации анестезиологов и СтАР",
		defaultStatus: "pending",
		sections: [
			{ id: "s1", title: "1. Метод обезболивания", content: "Введение современных амидных анестетиков (артикаиновый ряд) карпульным инъектором." },
			{ id: "s2", title: "2. Ощущения и предостережения", content: "Онемение губы, щеки и языка на 2-4 часа. Запрещено принимать горячую пищу до восстановления чувствительности." },
		],
		risks: ["Возникновение гематомы в месте укола", "Индивидуальная реакция на адреналин (тахикардия)"],
		guarantees: ["Безболезненность всех этапов лечения"],
	},
	{
		id: "pediatric",
		title: "Согласие на детское стоматологическое лечение",
		subtitle: "Лечение временных и постоянных зубов у детей",
		category: "therapy",
		statutoryBasis: "Стандарты детской стоматологии СтАР",
		defaultStatus: "pending",
		sections: [
			{ id: "s1", title: "1. Особенности приема ребенка", content: "Адаптационный прием, бережная изоляция, лечение в игровой форме с согласия родителей." },
			{ id: "s2", title: "2. Профилактика травмы губ", content: "Контроль ребенка родителями до отхождения анестезии во избежание закусывания онемевших губ." },
		],
		risks: ["Случайное прикусывание онемевшей губы", "Психологическое утомление при длительном визите"],
		guarantees: ["Бережный психологический подход и щадящие методики"],
	},
	{
		id: "hygiene",
		title: "Согласие на профессиональную гигиену полости рта",
		subtitle: "Ультразвуковое удаление камня, Air-Flow и ремтерапия",
		category: "therapy",
		statutoryBasis: "Профилактические протоколы Стоматологической ассоциации",
		defaultStatus: "pending",
		sections: [
			{ id: "s1", title: "1. Процедура чистки", content: "Снятие зубных отложений ультразвуком, воздушно-абразивная полировка и покрытие фторлаком." },
			{ id: "s2", title: "2. Реакция десны", content: "Временная кровоточивость воспаленной десны и чувствительность шеек зубов в течение 24–48 часов." },
		],
		risks: ["Кратковременная гиперестезия зубов", "Незначительная кровоточивость десны"],
		guarantees: ["Обучение гигиене и индивидуальный подбор средств ухода"],
	},
	{
		id: "radiology",
		title: "Согласие на рентген и компьютерную томографию",
		subtitle: "Прицельная визиография, ОПТГ и 3D КЛКТ челюстей",
		category: "diag",
		statutoryBasis: "Нормы радиационной безопасности СанПиН 2.6.1.1192-03",
		defaultStatus: "pending",
		sections: [
			{ id: "s1", title: "1. Радиационный контроль", content: "Исследование на цифровом аппарате с минимальной дозой облучения и защитным фартуком." },
			{ id: "s2", title: "2. Необходимость снимка", content: "Оценка скрытых полостей, периапикальных очагов и анатомии кости перед вмешательством." },
		],
		risks: ["Микродоза лучевой нагрузки в пределах установленных норм"],
		guarantees: ["Архивация снимков в цифровой карте пациента"],
	},
	{
		id: "personal_data",
		title: "Согласие на обработку персональных данных",
		subtitle: "Ведение медицинской карты, запись на прием и напоминания",
		category: "legal",
		statutoryBasis: "Законодательство РФ о защите персональных данных",
		defaultStatus: "pending",
		sections: [
			{ id: "s1", title: "1. Цели обработки", content: "Оформление медицинской документации, организация визитов, смс-напоминания и контроль гарантий." },
			{ id: "s2", title: "2. Конфиденциальность", content: "Сведения составляют врачебную тайну, хранятся в защищенном контуре и не передаются третьим лицам." },
		],
		risks: [],
		guarantees: ["Абсолютная конфиденциальность врачебной тайны"],
	},
	{
		id: "periodontics",
		title: "Согласие на пародонтологическое лечение",
		subtitle: "Закрытый кюретаж пародонтальных карманов, вектор-терапия",
		category: "therapy",
		statutoryBasis: "Клинические протоколы лечения пародонтита СтАР",
		defaultStatus: "pending",
		sections: [
			{ id: "s1", title: "1. Пародонтологический план", content: "Устранение поддесневой биопленки, антисептическая обработка и стимуляция регенерации." },
			{ id: "s2", title: "2. Поддерживающая терапия", content: "Необходимость регулярных поддерживающих визитов каждые 3–4 месяца для стабильности." },
		],
		risks: ["Временное оголение шеек зубов после снятия отека десны"],
		guarantees: ["Снижение подвижности зубов при соблюдении рекомендаций"],
	},
	{
		id: "sedation",
		title: "Согласие на лечение в условиях седации",
		subtitle: "Ингаляционная седация закисью азота (ЗАКС)",
		category: "therapy",
		statutoryBasis: "Протоколы седации в стоматологической практике",
		defaultStatus: "pending",
		sections: [
			{ id: "s1", title: "1. Суть седации", content: "Вдыхание смеси через назальную маску для снятия тревоги при полном сохранении сознания." },
			{ id: "s2", title: "2. Быстрое восстановление", content: "Действие смеси прекращается через 5 минут после дыхания кислородом в конце приема." },
		],
		risks: ["Легкое головокружение в первые минуты подачи смеси"],
		guarantees: ["Непрерывный мониторинг пульсоксиметрии во время процедуры"],
	},
	{
		id: "paid_contract",
		title: "Договор оказания платных медицинских услуг",
		subtitle: "Официальный договор с клиникой, гарантии и оплата",
		category: "legal",
		statutoryBasis: "Правила оказания платных медицинских услуг РФ",
		defaultStatus: "pending",
		sections: [
			{ id: "s1", title: "1. Предмет договора", content: "Клиника оказывает медицинские услуги, а Пациент принимает и оплачивает их по прейскуранту." },
			{ id: "s2", title: "2. Фискальные расчеты и гарантии", content: "Оплата наличными, картой или СБП с выдачей чека. Документы для налогового вычета выдаются клиникой." },
		],
		risks: [],
		guarantees: ["Выдача фискального чека и справки для налогового вычета в ФНС"],
	},
	{
		id: "refusal",
		title: "Отказ от медицинского вмешательства",
		subtitle: "Отказ от предложенного лечения или отдельных процедур",
		category: "legal",
		statutoryBasis: "Право пациента на отказ от медицинского вмешательства",
		defaultStatus: "pending",
		sections: [
			{ id: "s1", title: "1. Суть отказа", content: "Пациент подтверждает, что ознакомлен с диагнозом и отказывается от предложенного объема помощи." },
			{ id: "s2", title: "2. Последствия отказа", content: "Врач разъяснил риски прогрессирования заболевания, развития осложнений и отсутствия гарантий." },
		],
		risks: ["Возможность ухудшения стоматологического статуса и потери зуба"],
		guarantees: ["Право возобновить лечение при повторном обращении"],
	},
];

export function getConsentDocumentById(id: ConsentDocumentId): ConsentDocumentItem {
	return CANONICAL_CONSENT_CATALOG.find((item) => item.id === id) || CANONICAL_CONSENT_CATALOG[0];
}

/** Хэширование целостности подписанного документа (Мандат 8e, 8zk) */
export function computeConsentIntegrityHash(
	docId: string,
	patientName: string,
	signedAt: string,
	signaturePayload: string,
): string {
	const raw = `${docId}|${patientName}|${signedAt}|${signaturePayload}`;
	let hash = 0x811c9dc5;
	for (let i = 0; i < raw.length; i++) {
		hash ^= raw.charCodeAt(i);
		hash = Math.imul(hash, 0x01000193);
	}
	const hex = (hash >>> 0).toString(16).padStart(8, "0");
	return `DENTE-SSOT-${hex.toUpperCase()}-${signedAt.replace(/\D/g, "").slice(0, 8)}`;
}

export function generateConsentPrintHtml(
	doc: ConsentDocumentItem,
	context?: Partial<ConsentPartyContext>,
	signature?: { status: ConsentSignStatus; signedAt?: string; signatureSvg?: string },
): string {
	const pName = context?.patientName || "________________________________________________";
	const bDate = context?.birthDate || "____.____.________";
	const pass = context?.passport || "серия ______ № ________ выдан ________________________";
	const cName = context?.clinicName || "Стоматологическая клиника «DENTE»";
	const docName = context?.doctorName || "Лечащий врач-стоматолог";
	const dateStr = context?.date || new Date().toLocaleDateString("ru-RU");
	const status = signature?.status || doc.defaultStatus;

	const sectionsHtml = doc.sections
		.map((s) => `<section class="sec"><h3>${s.title}</h3><p>${s.content}</p>${s.bullets?.length ? `<ul>${s.bullets.map((b) => `<li>${b}</li>`).join("")}</ul>` : ""}</section>`)
		.join("");

	let stampHtml = `<div class="sig-lines empty-stamp"><div class="row"><span>Подпись пациента: ________________ / ${pName} /</span></div><div class="row"><span>Лечащий врач: ________________ / ${docName} /</span></div><div class="date-row">Дата оформления: «____» ________________ 202___ г. М.П.</div></div>`;
	if (status === "signed_paper") {
		stampHtml = `<div class="stamp paper"><strong>✓ ПОДПИСАНО НА БУМАЖНОМ НОСИТЕЛЕ</strong><div>Оригинал подписан пациентом собственноручно и хранится в архиве.</div><div class="meta">Дата: ${signature?.signedAt || dateStr} • Врач: ${docName}</div></div><div class="sig-lines"><div>Подпись пациента: ________________ / ${pName} /</div><div>Подпись врача: ________________ / ${docName} /</div></div>`;
	} else if (status === "signed_digital" && signature?.signatureSvg) {
		stampHtml = `<div class="stamp digital"><strong>✓ ПОДПИСАНО ПРОСТОЙ ЭЛЕКТРОННОЙ ПОДПИСЬЮ (ПЭП)</strong><div>Подписано на планшете клиники. Юридическая сила подтверждена.</div><div class="meta">Дата: ${signature?.signedAt || dateStr} • Пациент: ${pName}</div></div><div class="sig-svg">${signature.signatureSvg}</div><div class="sig-lines"><div>ЭЦП врача: ________________ / ${docName} /</div></div>`;
	}

	return `<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><title>${doc.title} — ${pName}</title>
<style>
@page { size: A4 portrait; margin: 15mm; } * { box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 10pt; line-height: 1.45; color: #0f172a; background: #fff; margin: 0; }
.header { border-bottom: 2px solid #0d9488; padding-bottom: 8px; margin-bottom: 12px; }
.c-info { font-size: 9pt; color: #475569; text-transform: uppercase; }
h1 { font-size: 13pt; font-weight: 700; margin: 6px 0 2px; color: #0f172a; }
.subtitle { font-size: 9.5pt; color: #334155; font-style: italic; }
.meta-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px 12px; margin: 10px 0; font-size: 9pt; }
.sec { margin-bottom: 10px; } .sec h3 { font-size: 10pt; font-weight: 700; margin: 8px 0 3px; color: #0f172a; }
.sec p { margin: 0 0 4px; text-align: justify; } .sec ul { margin: 3px 0 6px 20px; padding: 0; }
.sig-box { margin-top: 18px; page-break-inside: avoid; }
.stamp { padding: 8px 12px; border-radius: 6px; margin-bottom: 12px; font-size: 8.5pt; }
.stamp.paper { background: #f0fdf4; border: 1px solid #86efac; color: #166534; }
.stamp.digital { background: #f0fdfa; border: 1px solid #5eead4; color: #115e59; }
.stamp .meta { margin-top: 2px; font-size: 8pt; opacity: 0.85; }
.sig-lines { margin-top: 14px; font-size: 9.5pt; display: flex; flex-direction: column; gap: 8px; }
.sig-svg { max-width: 260px; height: 60px; border-bottom: 1px solid #94a3b8; margin-bottom: 8px; } .sig-svg svg { width: 100%; height: 100%; }
.date-row { margin-top: 10px; font-size: 9pt; color: #475569; }
</style></head><body>
<header class="header"><div class="c-info">${cName} • Медицинская документация</div><h1>${doc.title}</h1><div class="subtitle">${doc.subtitle}</div></header>
<div class="meta-box"><div><strong>Пациент:</strong> ${pName} • Дата рождения: ${bDate}</div><div><strong>Паспорт:</strong> ${pass}</div><div><strong>Лечащий врач:</strong> ${docName} • Дата: ${dateStr}</div></div>
<div class="body">${sectionsHtml}</div><div class="sig-box">${stampHtml}</div>
</body></html>`;
}
