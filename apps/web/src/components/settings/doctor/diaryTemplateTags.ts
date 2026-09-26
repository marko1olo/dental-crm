/**
 * apps/web/src/components/settings/doctor/diaryTemplateTags.ts
 *
 * Шаблоны дневников Формы 043/у с автозаполнением клинических тегов:
 * {зуб}, {диагноз}, {материал}, {анестезия}, {изоляция}, {бонд}, {протравка}.
 *
 * Инварианты:
 * - Мандат 8b: строго <= 800 строк.
 * - Мандат 8d: ноль мультяшных эмодзи.
 * - Мандат 8e: врачебная автономия (1-клик вставка и генерация текста для ЕМК).
 */

import {
	resolveAdhesiveName,
	resolveAnestheticName,
	resolveCompositeName,
	resolveEtchantName,
	resolveIsolationName,
} from "../protocolSnippetHelpers";
import type { DoctorPreferences } from "../../../store/doctorPreferencesStore";

export interface DiaryTemplateTagsContext {
	readonly tooth?: string | number | undefined;
	readonly diagnosis?: string | undefined;
	readonly material?: string | undefined;
	readonly composite?: string | undefined;
	readonly anesthetic?: string | undefined;
	readonly adhesive?: string | undefined;
	readonly isolation?: string | undefined;
	readonly etchant?: string | undefined;
	readonly doctorName?: string | undefined;
}

export interface DiaryTemplateDefinition {
	readonly id: string;
	readonly title: string;
	readonly specialty:
		| "therapist"
		| "surgeon"
		| "orthopedist"
		| "orthodontist"
		| "periodontist"
		| "pediatric";
	readonly specialtyLabel: string;
	readonly defaultIcd10: string;
	readonly complaintTemplate: string;
	readonly objectiveTemplate: string;
	readonly treatmentTemplate: string;
}

/**
 * Подстановка тегов в текст шаблона с сохранением регистра и дефолтными фолбэками.
 */
export function interpolateDiaryTemplateTags(
	templateText: string,
	context: DiaryTemplateTagsContext,
): string {
	if (!templateText) return "";

	const toothVal = context.tooth ? String(context.tooth).trim() : "[зуб]";
	const diagnosisVal = context.diagnosis ? String(context.diagnosis).trim() : "[диагноз]";
	const materialVal = context.material || context.composite || "композит светового отверждения";
	const compositeVal = context.composite || context.material || "композит светового отверждения";
	const anestheticVal = context.anesthetic || "Sol. Articaini 4% cum Epinephrino 1:100 000 — 1.7 мл";
	const adhesiveVal = context.adhesive || "OptiBond FL";
	const isolationVal = context.isolation || "коффердам";
	const etchantVal = context.etchant || "Ultra-Etch 35%";
	const doctorVal = context.doctorName || "Врач-стоматолог";

	return templateText
		.replace(/\{зуб\}|\{tooth\}/gi, toothVal)
		.replace(/\{диагноз\}|\{diagnosis\}/gi, diagnosisVal)
		.replace(/\{материал\}|\{material\}/gi, materialVal)
		.replace(/\{композит\}/gi, compositeVal)
		.replace(/\{анестезия\}|\{анестетик\}|\{anesthetic\}/gi, anestheticVal)
		.replace(/\{изоляция\}|\{коффердам\}|\{isolation\}/gi, isolationVal)
		.replace(/\{бонд\}|\{адгезив\}|\{adhesive\}/gi, adhesiveVal)
		.replace(/\{протравка\}|\{etchant\}/gi, etchantVal)
		.replace(/\{доктор\}|\{врач\}|\{doctor\}/gi, doctorVal);
}

/**
 * Извлечение списка тегов, присутствующих в шаблоне.
 */
export function extractTemplateTags(text: string): string[] {
	if (!text) return [];
	const matches = text.match(/\{[^{}]+\}/g);
	if (!matches) return [];
	return Array.from(new Set(matches.map((m) => m.toLowerCase())));
}

/**
 * Формирование контекста тегов из текущих настроек врача и выбранного зуба/диагноза.
 */
export function buildContextFromDoctorPreferences(
	prefs: Partial<DoctorPreferences>,
	params: { tooth?: string; diagnosis?: string; doctorName?: string } = {},
): DiaryTemplateTagsContext {
	return {
		tooth: params.tooth || "16",
		diagnosis: params.diagnosis || "К02.1 Кариес дентина",
		doctorName: params.doctorName,
		material: resolveCompositeName(prefs.defaultComposite),
		composite: resolveCompositeName(prefs.defaultComposite),
		adhesive: resolveAdhesiveName(prefs.defaultAdhesive),
		anesthetic: resolveAnestheticName(prefs.favoriteAnesthetic),
		isolation: resolveIsolationName(prefs.defaultIsolation),
		etchant: resolveEtchantName(prefs.defaultEtchant),
	};
}

/**
 * Реестр стандартных клинических шаблонов Формы 043/у по всем направлениям стоматологии.
 */
export const STATUTORY_DIARY_TEMPLATES: readonly DiaryTemplateDefinition[] = [
	{
		id: "caries_restoration",
		title: "Лечение кариеса дентина (световая пломба)",
		specialty: "therapist",
		specialtyLabel: "Терапия",
		defaultIcd10: "К02.1",
		complaintTemplate: "Жалобы на наличие кариозной полости в области зуба {зуб}, кратковременную чувствительность от сладкого и холодного.",
		objectiveTemplate: "В зубе {зуб} глубокая кариозная полость в пределах околопульпарного дентина. Зондирование болезненно по эмалево-дентинной границе. Перкуссия безболезненна. ЭОД 6 мкА. Диагноз: {диагноз}.",
		treatmentTemplate: "Обезболивание: {анестезия}. Изоляция: {изоляция}. Препарирование полости зуба {зуб} алмазными борами с водяным охлаждением, некрэктомия. Протравливание эмали и дентина гелем {протравка}, промывание, подсушивание. Адгезивный протокол: {бонд}. Послойная реставрация материалом {материал}. Шлифовка, полировка, окклюзионный контроль.",
	},
	{
		id: "pulpitis_endodontics",
		title: "Лечение пульпита (экстирпация и обтурация каналов)",
		specialty: "therapist",
		specialtyLabel: "Терапия / Эндодонтия",
		defaultIcd10: "К04.0",
		complaintTemplate: "Жалобы на самопроизвольные приступообразные боли в зубе {зуб}, усиливающиеся в ночное время, иррадиирующие по ходу тройничного нерва.",
		objectiveTemplate: "На жевательной поверхности зуба {зуб} глубокая кариозная полость, сообщающаяся с полостью зуба. Зондирование в точке сообщения резко болезненно. Термометрия резко положительная с длительным последействием. Диагноз: {диагноз}.",
		treatmentTemplate: "Анестезия: {анестезия}. Изоляция: {изоляция}. Раскрытие полости зуба {зуб}, ампутация и экстирпация пульпы. Инструментальная обработка каналов NiTi файлами до рабочей длины (апекслокатор). Ирригация 3% NaOCl с УЗ-активацией, промывание ЭДТА. Высушивание пинами, обтурация гуттаперчей и силером. Герметичная временная пломба. Рентген-контроль.",
	},
	{
		id: "surgical_extraction",
		title: "Удаление зуба простое / типичное",
		specialty: "surgeon",
		specialtyLabel: "Хирургия",
		defaultIcd10: "К08.1",
		complaintTemplate: "Жалобы на подвижность и разрушение коронковой части зуба {зуб}, периодический дискомфорт при жевании.",
		objectiveTemplate: "Коронка зуба {зуб} разрушена ниже уровня десны на 2/3, ткани размягчены, корень подвижен. Слизистая оболочка в проекции верхушки корня без признаков острого воспаления. Диагноз: {диагноз}.",
		treatmentTemplate: "Обезболивание: {анестезия}. Синдесмотомия круговой связки зуба {зуб}. Наложение щипцов, продвижение, люксация, тракция зуба. Тщательный ревизионный кюретаж лунки, удаление грануляций. Сформирован стабильный кровяной сгусток. Давящий марлевый тампон на 20 минут. Назначения и рекомендации выданы.",
	},
	{
		id: "implant_placement",
		title: "Дентальная имплантация",
		specialty: "surgeon",
		specialtyLabel: "Хирургия-имплантология",
		defaultIcd10: "К08.1",
		complaintTemplate: "Жалобы на отсутствие зуба {зуб}, функциональные нарушения жевания, эстетический дефект.",
		objectiveTemplate: "В области отсутствующего зуба {зуб} альвеолярный отросток достаточной ширины и высоты по данным КЛКТ (костная ткань тип II/III). Слизистая оболочка бледно-розовая, прикрепленная десна >= 3 мм. Диагноз: {диагноз}.",
		treatmentTemplate: "Обезболивание: {анестезия}. Разрез по гребню в зоне зуба {зуб}, отслаивание мукопериостального лоскута. Формирование ложа сверлами с физиодиспенсером (охлаждение 4°C). Инсталляция имплантата с торком 35 Н·см. Установка заглушки/ФДМ. Ушивание раны наглухо без натяжения. Прицельный рентген-контроль.",
	},
	{
		id: "crown_prosthetics",
		title: "Ортопедическое препарирование под коронку",
		specialty: "orthopedist",
		specialtyLabel: "Ортопедия",
		defaultIcd10: "К08.1",
		complaintTemplate: "Жалобы на разрушение зуба {зуб} более чем на 50%, нарушение эстетики и жевания.",
		objectiveTemplate: "Индекс ИРОПЗ зуба {зуб} > 0.6. Корневые каналы обтурированы до верхушки, периапикальных изменений нет. Диагноз: {диагноз}.",
		treatmentTemplate: "Анестезия: {анестезия}. Изоляция: {изоляция}. Препарирование зуба {зуб} под металлокерамическую/диоксид-циркониевую коронку с созданием кругового уступа 0.8 мм. Ретракция десны нитью 00. Снятие прецизионного двухфазного оттиска А-силиконом. Изготовление и фиксация провизорной коронки.",
	},
	{
		id: "perio_hygiene_curettage",
		title: "Комплексная гигиена и закрытый кюретаж",
		specialty: "periodontist",
		specialtyLabel: "Пародонтология",
		defaultIcd10: "К05.3",
		complaintTemplate: "Жалобы на кровоточивость десен при чистке зубов, зуд, неприятный запах изо рта, наличие зубного камня.",
		objectiveTemplate: "Маргинальная десна отечна, цианотична, кровоточит при зондировании. Зубные отложения над- и поддесневые в области зуба {зуб}. Пародонтальный карман до 3.5 мм. Диагноз: {диагноз}.",
		treatmentTemplate: "Изоляция ретрактором: {изоляция}. Обезболивание при необходимости: {анестезия}. Ультразвуковой скейлинг, воздушно-абразивная полировка AirFlow. Закрытый кюретаж карманов кюретами Грейси. Антисептическая обработка 0.05% хлоргексидином, аппликация пародонтального геля. Инструктаж по индивидуальной гигиене.",
	},
	{
		id: "pediatric_caries",
		title: "Лечение кариеса молочного зуба",
		specialty: "pediatric",
		specialtyLabel: "Детство",
		defaultIcd10: "К02.1",
		complaintTemplate: "Жалобы родителей на наличие полости в молочном зубе {зуб}, застревание пищи.",
		objectiveTemplate: "Временный прикус. В зубе {зуб} кариозная полость в пределах дентина. Зондирование слабо болезненно. Перкуссия безболезненна. Диагноз: {диагноз}.",
		treatmentTemplate: "Психологическая адаптация ребенка. Аппликационная анестезия гелем, при необходимости {анестезия}. Изоляция: {изоляция}. Бережное препарирование с водяным охлаждением. Пломбирование материалом {материал}. Шлифовка, полировка, аппликация реминерализующего геля.",
	},
	{
		id: "ortho_bracket_activation",
		title: "Ортодонтическая активация дуги",
		specialty: "orthodontist",
		specialtyLabel: "Ортодонтия",
		defaultIcd10: "К07.2",
		complaintTemplate: "Плановый визит для активации брекет-системы и смены ортодонтических дуг.",
		objectiveTemplate: "Брекет-система зафиксирована на зубных рядах. Замки и брекеты сохранны. Наблюдается положительная динамика нивелирования зубного ряда. Диагноз: {диагноз}.",
		treatmentTemplate: "Изоляция: {изоляция}. Снятие лигатур, извлечение дуг. Очистка элементов аппаратуры. Установка рабочей никель-титановой/стальной дуги на челюсть. Фиксация новыми эластическими лигатурами/закрытие клипс. Проверка комфорта, окклюзионный контроль.",
	},
];
