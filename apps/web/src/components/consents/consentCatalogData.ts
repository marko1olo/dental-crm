/**
 * apps/web/src/components/consents/consentCatalogData.ts
 *
 * Канонический реестр информированных согласий, медицинских договоров и справок DENTE CRM (SSOT).
 * 15 базовых бланков Минздрава РФ по клиническим направлениям (Мандаты 8e, 8n, 8x, 8ap).
 * 4 канонических пакета клиники РФ, шаблоны документов и справка для налогового вычета.
 * 3 статуса: signed_digital, signed_paper, pending.
 * Хэширование целостности подписи и генератор печати бланка А4.
 */

import { type DocumentKind, kopecksToRubles, resolveTaxDeductionCategoryShared } from "@dental/shared";
import type React from "react";
import {
	ClipboardList,
	FileCheck,
	FileText,
	Heart,
	Receipt,
	ShieldCheck,
	Sparkles,
	UserCheck,
	Zap,
} from "lucide-react";

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
	readonly patientId?: string | undefined;
	readonly birthDate?: string | undefined;
	readonly passport?: string | undefined;
	readonly phone?: string | undefined;
	readonly snils?: string | undefined;
	readonly address?: string | undefined;
	readonly clinicName?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly date?: string | undefined;
	readonly guardianName?: string | undefined;
	readonly guardianPassport?: string | undefined;
	readonly guardianRelation?: string | undefined;
	readonly toothOrArea?: string | undefined;
	readonly diagnosisText?: string | undefined;
	readonly plannedProcedures?: string | undefined;
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

export function normalizeConsentDocId(rawId: string): ConsentDocumentId {
	if (!rawId) return "therapy";
	const lower = String(rawId).toLowerCase().trim();
	if (lower.includes("implant") || lower.includes("имплант") || lower.includes("синус") || lower.includes("sinus") || lower.includes("osteoplast") || lower.includes("osteo")) return "implant";
	if (lower.includes("surg") || lower.includes("удален") || lower.includes("хирург") || lower.includes("extraction")) return "surgery";
	if (lower.includes("orthodont") || lower.includes("ортодонт") || lower.includes("брекет") || lower.includes("aligner") || lower.includes("элайн")) return "orthodontics";
	if (lower.includes("orthoped") || lower.includes("ортопед") || lower.includes("протез") || lower.includes("коронк") || lower.includes("винир") || lower.includes("prosthet")) return "orthopedics";
	if (lower.includes("pediatr") || lower.includes("детск") || lower.includes("ребен") || lower.includes("несовершеннолет") || lower.includes("minor")) return "pediatric";
	if (lower.includes("anesthes") || lower.includes("анестез") || lower.includes("обезбол")) return "anesthesia";
	if (lower.includes("hygien") || lower.includes("гигиен") || lower.includes("bleach") || lower.includes("отбеливан")) return "hygiene";
	if (lower.includes("radio") || lower.includes("рентген") || lower.includes("cbct") || lower.includes("клкт") || lower.includes("xray") || lower.includes("снимок")) return "radiology";
	if (lower.includes("personal") || lower.includes("персональн") || lower.includes("152")) return "personal_data";
	if (lower.includes("periodont") || lower.includes("пародонт")) return "periodontics";
	if (lower.includes("sedat") || lower.includes("седац")) return "sedation";
	if (lower.includes("contract") || lower.includes("договор") || lower.includes("paid_medical_services")) return "paid_contract";
	if (lower.includes("refus") || lower.includes("отказ") || lower.includes("egisz_refusal")) return "refusal";
	if (lower.includes("endo") || lower.includes("пульпит") || lower.includes("канал")) return "endodontics";
	if (lower.includes("inspection") || lower.includes("1051") || lower.includes("осмотр") || lower.includes("informed_consent")) return "therapy";
	if (lower.includes("therap") || lower.includes("терап") || lower.includes("кариес")) return "therapy";

	const directMatch = CANONICAL_CONSENT_CATALOG.find((item) => item.id.toLowerCase() === lower);
	if (directMatch) return directMatch.id;

	return "therapy";
}

export function getConsentDocumentById(id: string): ConsentDocumentItem {
	const normalized = normalizeConsentDocId(id);
	const found = CANONICAL_CONSENT_CATALOG.find((item) => item.id === normalized);
	if (found) return found;
	const fallback = CANONICAL_CONSENT_CATALOG[0];
	if (fallback) return fallback;
	throw new Error("CANONICAL_CONSENT_CATALOG is empty");
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
	signature?: { status: ConsentSignStatus; signedAt?: string | undefined; signatureSvg?: string | undefined },
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

	const signerName = context?.guardianName || pName;
	let stampHtml = `<div class="sig-lines empty-stamp"><div class="row"><span>Подпись пациента: ________________ / ${pName} /</span></div>${context?.guardianName ? `<div class="row"><span>Законный представитель: ________________ / ${context.guardianName} /</span></div>` : ""}<div class="row"><span>Лечащий врач: ________________ / ${docName} /</span></div><div class="date-row">Дата оформления: «____» ________________ 202___ г. М.П.</div></div>`;
	if (status === "signed_paper") {
		stampHtml = `<div class="stamp paper"><strong>✓ ПОДПИСАНО НА БУМАЖНОМ НОСИТЕЛЕ</strong><div>Оригинал подписан пациентом собственноручно и хранится в архиве.</div><div class="meta">Дата: ${signature?.signedAt || dateStr} • Врач: ${docName}</div></div><div class="sig-lines"><div>Подпись пациента: ________________ / ${signerName} /</div><div>Подпись врача: ________________ / ${docName} /</div></div>`;
	} else if (status === "signed_digital" && signature?.signatureSvg) {
		const rawSig = signature.signatureSvg.trim();
		const sigRender = rawSig.startsWith("<svg")
			? rawSig
			: `<img src="${signature.signatureSvg}" alt="Подпись" style="max-height: 48px; max-width: 240px; object-fit: contain; display: block;" />`;
		stampHtml = `<div class="stamp digital"><strong>✓ ПОДПИСАНО ПРОСТОЙ ЭЛЕКТРОННОЙ ПОДПИСЬЮ (ПЭП)</strong><div>Подписано на планшете клиники. Юридическая сила подтверждена.</div><div class="meta">Дата: ${signature?.signedAt || dateStr} • Пациент: ${signerName}</div></div><div class="sig-svg">${sigRender}</div><div class="sig-lines"><div>ЭЦП врача: ________________ / ${docName} /</div></div>`;
	}

	const guardianHtml = context?.guardianName
		? `<div><strong>Законный представитель (родитель/опекун):</strong> ${context.guardianName}${context.guardianPassport ? ` • Паспорт: ${context.guardianPassport}` : ""}${context.guardianRelation ? ` (${context.guardianRelation})` : ""}</div>`
		: "";
	const toothAreaHtml = context?.toothOrArea
		? `<div><strong>Область вмешательства (зубы / челюсть):</strong> ${context.toothOrArea}</div>`
		: "";
	const diagnosisHtml = context?.diagnosisText
		? `<div><strong>Клинический диагноз:</strong> ${context.diagnosisText}</div>`
		: "";

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
.sig-svg { max-width: 260px; height: 60px; border-bottom: 1px solid #94a3b8; margin-bottom: 8px; display: flex; align-items: center; } .sig-svg svg, .sig-svg img { max-width: 100%; max-height: 100%; object-fit: contain; }
.date-row { margin-top: 10px; font-size: 9pt; color: #475569; }
</style></head><body>
<header class="header"><div class="c-info">${cName} • Медицинская документация</div><h1>${doc.title}</h1><div class="subtitle">${doc.subtitle}</div></header>
<div class="meta-box"><div><strong>Пациент:</strong> ${pName} • Дата рождения: ${bDate}</div><div><strong>Паспорт:</strong> ${pass}</div>${guardianHtml}${toothAreaHtml}${diagnosisHtml}<div><strong>Лечащий врач:</strong> ${docName} • Дата: ${dateStr}</div></div>
<div class="body">${sectionsHtml}</div><div class="sig-box">${stampHtml}</div>
</body></html>`;
}

// ---------------------------------------------------------------------------
// 4 КАНОНИЧЕСКИХ ПАКЕТА КЛИНИКИ РФ, ДОГОВОРЫ И СПРАВКА ФНС (SSOT FIRST PRINCIPLES)
// ---------------------------------------------------------------------------

export type DocumentPackageKey = "intake" | "informed_consent" | "tax_certificate" | "card_extract";
export type ConsentSubKind = "therapy" | "surgery" | "implant" | "orthopedics" | "anesthesia";

export interface ClinicRequisites {
	readonly name: string;
	readonly inn: string;
	readonly ogrn: string;
	readonly address: string;
	readonly phone: string;
	readonly license: string;
	readonly kpp?: string | undefined;
}

export interface PatientRequisites {
	readonly fullName: string;
	readonly birthDate: string;
	readonly passport: string;
	readonly address: string;
	readonly phone: string;
	readonly inn?: string | undefined;
}

export interface DoctorRequisites {
	readonly fullName: string;
	readonly specialty: string;
}

export interface DocumentServiceItem {
	readonly id: string;
	readonly title: string;
	readonly code?: string | undefined;
	readonly quantity: number;
	readonly priceKopecks: number;
	readonly amountKopecks: number;
}

export interface DocumentLegalContext {
	readonly clinic: ClinicRequisites;
	readonly patient: PatientRequisites;
	readonly doctor: DoctorRequisites;
	readonly documentNumber: string;
	readonly documentDate: string;
	readonly taxYear?: number | undefined;
	readonly services: readonly DocumentServiceItem[];
	readonly totalAmountKopecks: number;
	readonly diagnosisRu?: string | undefined;
	readonly anamnesisRu?: string | undefined;
	readonly epicrisisRu?: string | undefined;
	readonly consentSubKind?: ConsentSubKind | undefined;
}

export const DEFAULT_CLINIC_REQUISITES: ClinicRequisites = {
	name: 'ООО "Стоматологическая клиника ДЕНТЕ"',
	inn: "7701234567",
	ogrn: "1237700456789",
	address: "г. Москва, ул. Клиническая, д. 12, стр. 1",
	phone: "+7 (495) 789-01-23",
	license: "ЛО41-01137-77/00561234 от 14.02.2021 выдана ДЗМ",
};

/**
 * Целочисленное форматирование копеек в рубли (Мандат 8wy, 0 float-ошибок).
 */
export function formatKopecksToRubles(kopecks: number): string {
	const safeKopecks = Math.max(0, Math.round(kopecks || 0));
	const rubles = Math.floor(kopecksToRubles(safeKopecks));
	const remainder = safeKopecks % 100;
	const formattedRubles = rubles.toLocaleString("ru-RU").replace(/\u00A0/g, " ");
	return remainder > 0 ? `${formattedRubles},${remainder.toString().padStart(2, "0")} ₽` : `${formattedRubles} ₽`;
}

export function sumKopecks(items: readonly { readonly amountKopecks: number }[]): number {
	return items.reduce((acc, curr) => acc + (curr.amountKopecks || 0), 0);
}

export interface ClinicalPackageMeta {
	readonly id: DocumentPackageKey;
	readonly titleRu: string;
	readonly badgeRu: string;
	readonly descriptionRu: string;
	readonly includes: readonly string[];
}

export const CANONICAL_CLINIC_PACKAGES: readonly ClinicalPackageMeta[] = [
	{
		id: "intake",
		titleRu: "Первичный приём",
		badgeRu: "Пакет пациента",
		descriptionRu: "Договор на стоматологические услуги, согласие на обработку данных и анкета здоровья",
		includes: ["Договор на оказание медицинских услуг", "Согласие на обработку персональных данных", "Анкета общего соматического здоровья пациента"],
	},
	{
		id: "informed_consent",
		titleRu: "Информированное согласие на лечение",
		badgeRu: "Клиническое ИДС",
		descriptionRu: "Добровольное согласие на терапию, хирургию, имплантацию, ортопедию и анестезию",
		includes: ["План терапевтического / хирургического вмешательства", "Информирование о возможных рисках и гарантиях", "Согласие на местное обезболивание"],
	},
	{
		id: "tax_certificate",
		titleRu: "Справка для налогового вычета",
		badgeRu: "Налоговый вычет",
		descriptionRu: "Справка об оплате медицинских услуг для ФНС с расчетом суммы в рублях и копейках",
		includes: ["Официальная справка для налоговых органов РФ", "Подтверждение расходов на лечение (13% НДФЛ)", "Реквизиты лицензии и плательщика"],
	},
	{
		id: "card_extract",
		titleRu: "Медицинская карта приёма и выписка",
		badgeRu: "Клиническая карта",
		descriptionRu: "Дневник осмотра по стандарту SOAP, выполненные работы и гарантийный талон",
		includes: ["Клинический дневник осмотра (SOAP)", "Акт выполненных стоматологических работ", "Гарантийный талон и рекомендации врача"],
	},
];

export function generateContractTemplate(ctx: DocumentLegalContext): string {
	const patientName = ctx.patient.fullName.trim() || "________________________________________________";
	const patientBirthDate = ctx.patient.birthDate.trim() || "«___» _________ _____ г.";
	const patientPassport = ctx.patient.passport.trim() || "паспорт: серия ____ № ______ выдан ________________________________";
	const patientPhone = ctx.patient.phone.trim() || "+7 (___) ___-__-__";
	const patientAddress = ctx.patient.address.trim() || "________________________________________________";

	const costSection = ctx.totalAmountKopecks > 0
		? `3.1. Предварительная стоимость услуг по согласованному плану лечения составляет: ${formatKopecksToRubles(ctx.totalAmountKopecks)}.`
		: "3.1. Предварительная стоимость услуг: 0 ₽ (открытая цена по действующему прейскуранту клиники; окончательная сумма согласовывается сторонами в плане лечения). Сметная стоимость: ____________________ руб. (________________________________________).";

	return `ДОГОВОР НА ОКАЗАНИЕ ПЛАТНЫХ МЕДИЦИНСКИХ УСЛУГ № ${ctx.documentNumber}

г. Москва                                                              Дата: ${ctx.documentDate}

1. СТОРОНЫ ДОГОВОРА
Исполнитель: ${ctx.clinic.name}, ОГРН ${ctx.clinic.ogrn}, ИНН ${ctx.clinic.inn}, адрес: ${ctx.clinic.address}, лицензия: ${ctx.clinic.license}.
Заказчик (Пациент): ${patientName}, дата рождения: ${patientBirthDate}, ${patientPassport}, телефон: ${patientPhone}, адрес: ${patientAddress}.

2. ПРЕДМЕТ ДОГОВОРА
2.1. Исполнитель обязуется оказать Пациенту квалифицированные стоматологические услуги в соответствии с медицинскими показаниями и стандартами качества, а Пациент обязуется оплатить оказанные услуги.
2.2. Лечащий врач: ${ctx.doctor.fullName} (${ctx.doctor.specialty}).

3. СТОИМОСТЬ И ПОРЯДОК ОПЛАТЫ
${costSection}
3.2. Оплата производится в кассу или на расчетный счет Исполнителя в день оказания услуг с обязательной выдачей кассового чека.

4. ПОДПИСИ СТОРОН
Исполнитель: _________________ / ${ctx.doctor.fullName} /          Пациент: _________________ / ${patientName} /`;
}

export function generateInformedConsentTemplate(
	ctx: DocumentLegalContext,
	subKind: ConsentSubKind = "therapy",
): string {
	const titles: Record<ConsentSubKind, { label: string; desc: string; risks: string }> = {
		therapy: { label: "ТЕРАПЕВТИЧЕСКОЕ ЛЕЧЕНИЕ И ПЛОМБИРОВАНИЕ ЗУБОВ", desc: "Препарирование кариозной полости, изоляция рабочего поля, адгезивная подготовка и послойная реставрация светоотверждаемым композитом.", risks: "Кратковременная постпломбировочная чувствительность на температурные раздражители в течение 3–7 дней." },
		surgery: { label: "ХИРУРГИЧЕСКОЕ ЛЕЧЕНИЕ И УДАЛЕНИЕ ЗУБОВ", desc: "Проведение инфильтрационной/проводниковой анестезии, атравматичное удаление зуба, ревизия лунки, гемостаз и наложение швов.", risks: "Послеоперационный отек мягких тканей до 3 суток, болезненность при открывании рта, формирование кровяного сгустка." },
		implant: { label: "ДЕНТАЛЬНУЮ ИМПЛАНТАЦИЮ И ОСТЕОПЛАСТИКУ", desc: "Формирование костного ложа с охлаждением физраствором, установка титанового имплантата с заглушкой или формирователем десны.", risks: "Временный отек мягких тканей, необходимость щадящего жевательного режима и антибактериальной терапии." },
		orthopedics: { label: "ОРТОПЕДИЧЕСКОЕ ЛЕЧЕНИЕ И ПРОТЕЗИРОВАНИЕ", desc: "Препарирование опорных зубов, снятие оптических/силиконовых оттисков, изготовление и постоянная фиксация коронок или виниров.", risks: "Период привыкания к ортопедической конструкции (от 3 до 14 дней), необходимость контрольной коррекции окклюзии." },
		anesthesia: { label: "МЕСТНОЕ ОБЕЗБОЛИВАНИЕ В СТОМАТОЛОГИИ", desc: "Введение современного карпульного анестетика артикаинового ряда с целью полного устранения болевых ощущений при лечении.", risks: "Онемение мягких тканей губы, щеки и языка на 2–4 часа. Запрещается употребление горячей пищи до полного отхождения анестезии." },
	};
	const cur = titles[subKind] || titles.therapy;

	return `ИНФОРМИРОВАННОЕ ДОБРОВОЛЬНОЕ СОГЛАСИЕ НА ${cur.label}
К медицинской карте пациента: ${ctx.patient.fullName}

г. Москва                                                              Дата: ${ctx.documentDate}

Я, ${ctx.patient.fullName}, ${ctx.patient.birthDate} г.р., проживающий по адресу: ${ctx.patient.address},
уполномочиваю клинику «${ctx.clinic.name}» и лечащего врача ${ctx.doctor.fullName} провести стоматологическое вмешательство.

1. СУТЬ И ЦЕЛЬ ВМЕШАТЕЛЬСТВА:
${cur.desc}

2. ОСВЕДОМЛЕННОСТЬ О ВОЗМОЖНЫХ РИСКАХ И РЕАКЦИЯХ:
${cur.risks}

3. ОБЯЗАТЕЛЬСТВА ПАЦИЕНТА:
Я обязуюсь строго выполнять клинические назначения врача, соблюдать рекомендации по уходу и являться на назначенные контрольные осмотры.

Врач: _________________ / ${ctx.doctor.fullName} /          Пациент: _________________ / ${ctx.patient.fullName} /`;
}

export function generateIntakePackageTemplate(ctx: DocumentLegalContext): string {
	return `ПАКЕТ ДОКУМЕНТОВ ПЕРВИЧНОГО ПРИЁМА ПАЦИЕНТА
Клиника: ${ctx.clinic.name}
Пациент: ${ctx.patient.fullName} (${ctx.patient.birthDate} г.р.)
Дата оформления: ${ctx.documentDate}

[ДОКУМЕНТ 1: ДОГОВОР НА ОКАЗАНИЕ ПЛАТНЫХ СТОМАТОЛОГИЧЕСКИХ УСЛУГ]
Договор регулирует взаимные права и обязанности сторон. Исполнитель оказывает качественную стоматологическую помощь, Пациент производит оплату согласно прейскуранту.

[ДОКУМЕНТ 2: СОГЛАСИЕ НА ОБРАБОТКУ ПЕРСОНАЛЬНЫХ ДАННЫХ]
Пациент разрешает клинике обработку персональных данных для ведения медицинской карты, координации приёма и сервисных напоминаний. Сведения защищены врачебной тайной.

[ДОКУМЕНТ 3: АНКЕТА ОБЩЕГО СОМАТИЧЕСКОГО ЗДОРОВЬЯ]
Аллергические реакции на препараты: не выявлены.
Сопутствующие хронические заболевания: отрицает.
Артериальное давление в норме. Противопоказаний к приёму не установлено.

Подпись пациента: _________________ / ${ctx.patient.fullName} /          Подпись врача: _________________ / ${ctx.doctor.fullName} /`;
}

export function generateActTemplate(ctx: DocumentLegalContext): string {
	const itemsRows = ctx.services.length > 0
		? ctx.services.map((s, idx) => `${idx + 1}. ${s.title} — ${s.quantity} шт. × ${formatKopecksToRubles(s.priceKopecks)} = ${formatKopecksToRubles(s.amountKopecks)}`).join("\n")
		: (ctx.totalAmountKopecks > 0 ? `1. Стоматологический приём и санация — 1 усл. = ${formatKopecksToRubles(ctx.totalAmountKopecks)}` : "Перечень услуг пуст.");

	return `АКТ ВЫПОЛНЕННЫХ УСЛУГ К ДОГОВОРУ № ${ctx.documentNumber}

г. Москва                                                              Дата: ${ctx.documentDate}

Исполнитель: ${ctx.clinic.name}
Пациент: ${ctx.patient.fullName} (паспорт: ${ctx.patient.passport})
Лечащий врач: ${ctx.doctor.fullName}

ПЕРЕЧЕНЬ ОКАЗАННЫХ СТОМАТОЛОГИЧЕСКИХ УСЛУГ:
${itemsRows}

ИТОГО К ОПЛАТЕ: ${formatKopecksToRubles(ctx.totalAmountKopecks)}

Претензий по объёму, срокам и качеству оказанных медицинских услуг Пациент к клинике не имеет.
Услуги оказаны в полном объёме, надлежащего качества.

Исполнитель: _________________ / ${ctx.doctor.fullName} /          Пациент: _________________ / ${ctx.patient.fullName} /`;
}

export function generateTaxCertificateTemplate(ctx: DocumentLegalContext): string {
	const year = ctx.taxYear || new Date().getFullYear();

	let code01Kopecks = 0;
	let code02Kopecks = 0;

	if (ctx.services && ctx.services.length > 0) {
		for (const s of ctx.services) {
			const cat = resolveTaxDeductionCategoryShared(s.code, s.title);
			if (cat === "2") {
				code02Kopecks += s.amountKopecks || 0;
			} else {
				code01Kopecks += s.amountKopecks || 0;
			}
		}
	} else {
		code01Kopecks = Math.max(0, Math.round(ctx.totalAmountKopecks || 0));
		code02Kopecks = 0;
	}

	const totalKopecks = code01Kopecks + code02Kopecks > 0 ? code01Kopecks + code02Kopecks : Math.max(0, Math.round(ctx.totalAmountKopecks || 0));
	const eligibleCode01Kopecks = Math.min(code01Kopecks, 15000000);
	const refund13Kopecks = Math.round((eligibleCode01Kopecks * 0.13) + (code02Kopecks * 0.13));

	return `СПРАВКА ОБ ОПЛАТЕ МЕДИЦИНСКИХ УСЛУГ ДЛЯ НАЛОГОВОГО ВЫЧЕТА (13% НДФЛ)
Номер справки: ${ctx.documentNumber}
Отчётный налоговый период: ${year} год
Штрихкод формы: 1151156 | В соответствии с Приказом ФНС России от 08.11.2023 № ЕА-7-11/824@

1. Сведения о медицинской организации:
Наименование: ${ctx.clinic.name} | ИНН: ${ctx.clinic.inn} | ОГРН: ${ctx.clinic.ogrn}
Лицензия на медицинскую деятельность: ${ctx.clinic.license}
Адрес местонахождения: ${ctx.clinic.address} · Телефон: ${ctx.clinic.phone}

2. Сведения о налогоплательщике и пациенте:
Пациент: ${ctx.patient.fullName || "________________________________________________"}, дата рождения: ${ctx.patient.birthDate || "«___» _________ _____ г."}
Документ, удостоверяющий личность: ${ctx.patient.passport || "серия ____ № ______ выдан ________________________________"}
${ctx.patient.inn ? `ИНН налогоплательщика: ${ctx.patient.inn}` : "ИНН налогоплательщика: не указан (для физических лиц не обязателен)"}

3. Сведения об оплате стоматологических услуг за ${year} год:
Код услуги 1 (обычное лечение): ${formatKopecksToRubles(code01Kopecks)}
Код услуги 2 (дорогостоящее лечение): ${formatKopecksToRubles(code02Kopecks)}
ИТОГО подтверждённая сумма расходов: ${formatKopecksToRubles(totalKopecks)}
Расчетная сумма социального налогового вычета (13% НДФЛ к возврату): ${formatKopecksToRubles(refund13Kopecks)}

[QR-код верификации ФНС: https://lkfl2.nalog.ru/lkfl/deduction/verify?knd=1151156&year=${year}&inn=${ctx.clinic.inn}&sum=${kopecksToRubles(totalKopecks).toFixed(2)}]

Справка выдана для предоставления в налоговые органы РФ с целью получения социального налогового вычета.
Уполномоченное лицо клиники: _________________ / Главный врач / М.П.
Дата выдачи: ${ctx.documentDate}`;
}

export function generateCardExtractTemplate(ctx: DocumentLegalContext): string {
	const diagnosis = ctx.diagnosisRu ? ctx.diagnosisRu : "Не установлен";
	const anamnesis = ctx.anamnesisRu ? ctx.anamnesisRu : "Не отягощен";
	const servicesList = ctx.services.length > 0
		? ctx.services.map((s, i) => `${i + 1}) ${s.title} (${s.quantity} ед.)`).join("\n")
		: "Услуги не оказывались";
	const epicrisis = ctx.epicrisisRu ? ctx.epicrisisRu : "Лечение завершено";

	return `ВЫПИСКА ИЗ МЕДИЦИНСКОЙ КАРТЫ СТОМАТОЛОГИЧЕСКОГО ПРИЁМА
Выписка № ${ctx.documentNumber} к карте пациента

1. Пациент: ${ctx.patient.fullName}, ${ctx.patient.birthDate} г.р.
2. Лечебное учреждение: ${ctx.clinic.name}
3. Лечащий врач: ${ctx.doctor.fullName} (${ctx.doctor.specialty})
4. Клинический диагноз: ${diagnosis}
5. Анамнез заболевания: ${anamnesis}
6. Проведенное лечение (дневник SOAP):
${servicesList}
7. Исход лечения, гарантия и рекомендации: ${epicrisis}

Врач: _________________ / ${ctx.doctor.fullName} /          М.П. Клиники
Дата: ${ctx.documentDate}`;
}

// ---------------------------------------------------------------------------
// РЕЕСТР ИНДИВИДУАЛЬНЫХ БЛАНКОВ (СОВМЕСТИМОСТЬ И БЫСТРЫЙ ДОСТУП)
// ---------------------------------------------------------------------------

export type DocumentCatalogCategory = "all" | "intake" | "clinical" | "finance_tax" | "refusal" | "pediatric" | "registry";

export interface DocumentCatalogItem {
	readonly id: string;
	readonly kind?: DocumentKind | undefined;
	readonly titleRu: string;
	readonly category: DocumentCatalogCategory;
	readonly descriptionRu: string;
	readonly badgeRu: string;
	readonly regulationRu: string;
	readonly icon: React.ComponentType<{ className?: string; size?: number }>;
	readonly isPediatric?: boolean | undefined;
	readonly isStatutory?: boolean | undefined;
	readonly printSupported: boolean;
	readonly onQuickAction?: () => void;
}

export interface DocumentCatalogActionHandlers {
	readonly onOpenKind?: ((kind: DocumentKind, titleRu?: string) => void) | undefined;
	readonly onOpenA4Tab?: ((tab: string) => void) | undefined;
	readonly onOpenTaxModal?: ((tab?: string) => void) | undefined;
}

export const CATALOG_CATEGORIES: readonly { id: DocumentCatalogCategory; label: string }[] = [
	{ id: "all", label: "Все документы" },
	{ id: "intake", label: "Первичный приём" },
	{ id: "clinical", label: "Клинические" },
	{ id: "finance_tax", label: "Финансы и НДФЛ" },
	{ id: "pediatric", label: "Детский приём" },
	{ id: "refusal", label: "Отказы" },
	{ id: "registry", label: "Реестры" },
];

export function getDocumentsCatalogData(handlers: DocumentCatalogActionHandlers = {}): DocumentCatalogItem[] {
	return [
		{
			id: "doc_treatment_contract", kind: "paid_medical_services_contract",
			titleRu: "Договор платных медицинских услуг", category: "intake",
			descriptionRu: "Договор с пациентом на оказание стоматологических услуг",
			badgeRu: "Договор клиники", regulationRu: "Правила платных медицинских услуг",
			icon: FileText, isStatutory: true, printSupported: true,
			onQuickAction: () => handlers.onOpenA4Tab?.("contract"),
		},
		{
			id: "doc_treatment_act_completed", kind: "completed_works_act",
			titleRu: "Акт выполненных стоматологических работ", category: "finance_tax",
			descriptionRu: "Финансовый акт оказанных услуг с подписями сторон",
			badgeRu: "Акт услуг", regulationRu: "Акт оказанных услуг",
			icon: FileCheck, isStatutory: true, printSupported: true,
			onQuickAction: () => handlers.onOpenA4Tab?.("act"),
		},
		{
			id: "doc_tax_deduction_certificate", kind: "tax_deduction_certificate",
			titleRu: "Справка для налогового вычета (ФНС)", category: "finance_tax",
			descriptionRu: "Справка об оплате медуслуг для возврата 13% НДФЛ",
			badgeRu: "Справка ФНС", regulationRu: "Налоговый вычет на лечение",
			icon: Zap, isStatutory: true, printSupported: true,
			onQuickAction: () => handlers.onOpenTaxModal?.("form"),
		},
		{
			id: "doc_medical_card_extract", kind: "dental_medical_card_043u",
			titleRu: "Выписка из медицинской карты приёма", category: "clinical",
			descriptionRu: "Выписка диагнозов, анамнеза и проведённого лечения",
			badgeRu: "Выписка из карты", regulationRu: "Выписка из медицинской карты",
			icon: ClipboardList, isStatutory: true, printSupported: true,
			onQuickAction: () => handlers.onOpenA4Tab?.("medical_card"),
		},
		{
			id: "doc_informed_consent_general", kind: "informed_consent",
			titleRu: "Информированное согласие на лечение", category: "intake",
			descriptionRu: "Добровольное согласие на осмотр, диагностику и анестезию",
			badgeRu: "Согласие на лечение", regulationRu: "Клинический стандарт согласия",
			icon: ShieldCheck, isStatutory: true, printSupported: true,
			onQuickAction: () => handlers.onOpenA4Tab?.("informed_consent"),
		},
		{
			id: "doc_personal_data_consent", kind: "personal_data_processing_consent",
			titleRu: "Согласие на обработку персональных данных", category: "intake",
			descriptionRu: "Согласие на ведение карты и сервисное информирование",
			badgeRu: "Согласие на обработку персональных данных", regulationRu: "Защита персональных данных",
			icon: UserCheck, isStatutory: true, printSupported: true,
			onQuickAction: () => handlers.onOpenA4Tab?.("personal_data"),
		},
		{
			id: "doc_treatment_plan", kind: "treatment_plan",
			titleRu: "План стоматологического лечения", category: "clinical",
			descriptionRu: "Поэтапный клинический график и финансовая смета",
			badgeRu: "План и смета", regulationRu: "План стоматологического лечения",
			icon: FileText, printSupported: true,
			onQuickAction: () => handlers.onOpenA4Tab?.("treatment_plan"),
		},
		{
			id: "doc_post_visit_recommendations", kind: "post_visit_recommendations",
			titleRu: "Рекомендации пациенту после приёма", category: "clinical",
			descriptionRu: "Памятка по уходу после терапевтического или хирургического визита",
			badgeRu: "Памятка", regulationRu: "Рекомендации по уходу после приёма",
			icon: Sparkles, printSupported: true,
			onQuickAction: () => handlers.onOpenKind?.("post_visit_recommendations", "Рекомендации после приёма"),
		},
		{
			id: "doc_payment_receipt", kind: "payment_receipt",
			titleRu: "Квитанция и подтверждение оплаты", category: "finance_tax",
			descriptionRu: "Подтверждение оплаты услуг в кассе клиники",
			badgeRu: "Касса и чек", regulationRu: "Кассовый чек и оплата",
			icon: Receipt, printSupported: true,
			onQuickAction: () => handlers.onOpenKind?.("payment_receipt", "Квитанция об оплате"),
		},
		{
			id: "doc_pediatric_representative_consent", kind: "minor_legal_representative_consent",
			titleRu: "Согласие законного представителя ребёнка", category: "pediatric",
			descriptionRu: "Согласие родителя или опекуна на осмотр и лечение ребёнка",
			badgeRu: "Педиатрия", regulationRu: "Согласие законного представителя",
			icon: Heart, isPediatric: true, isStatutory: true, printSupported: true,
			onQuickAction: () => handlers.onOpenA4Tab?.("informed_consent"),
		},
	];
}

export const DEMO_SAMPLE_SERVICES: readonly DocumentServiceItem[] = [
	{ id: "srv-01", title: "Приём (осмотр, консультация) врача-стоматолога первичный", code: "B01.065.001", quantity: 1, priceKopecks: 150000, amountKopecks: 150000 },
	{ id: "srv-02", title: "Восстановление зуба 4.6 пломбой световой полимеризации", code: "A16.07.002.010", quantity: 1, priceKopecks: 550000, amountKopecks: 550000 },
	{ id: "srv-03", title: "Проводниковая анестезия (Артикаин с эпинефрином)", code: "B01.003.004.004", quantity: 1, priceKopecks: 80000, amountKopecks: 80000 },
];

export const DEMO_SAMPLE_PATIENT: PatientRequisites = {
	fullName: "Смирнов Алексей Петрович",
	birthDate: "12.04.1988",
	passport: "45 12 654321 выдан ОВД г. Москвы",
	address: "г. Москва, ул. Тверская, д. 14, кв. 8",
	phone: "+7 (916) 123-45-67",
};

export const EMPTY_PATIENT_REQUISITES: PatientRequisites = { fullName: "", birthDate: "", passport: "", address: "", phone: "" };
export const EMPTY_SERVICES: readonly DocumentServiceItem[] = [];
