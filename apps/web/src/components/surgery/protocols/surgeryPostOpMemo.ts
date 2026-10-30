/**
 * surgeryPostOpMemo.ts — Канонические памятки пациенту после хирургических операций для мессенджеров (WhatsApp/Telegram).
 * Строгий полиграфический стиль БЕЗ мультяшных эмодзи (Мандаты 8k, 8d, 8e, 8x).
 * Сценарии: удаление зуба, дентальная имплантация, синус-лифтинг и НКР, периостотомия/резекция.
 */

import type { ExtractionComplexity } from "./surgeryExtractionTypes";
import type { SurgeryScenarioType } from "../surgeryCatalogData";

export interface SurgicalMemoParams {
	readonly patientName?: string | undefined;
	readonly toothFdi?: number | undefined;
	readonly doctorName?: string | undefined;
	readonly complexity?: ExtractionComplexity | undefined;
	readonly hasSutures?: boolean | undefined;
	readonly sutureRemovalDays?: number | undefined;
	readonly clinicPhone?: string | undefined;
	readonly implantBrand?: string | undefined;
	readonly capType?: "fdm" | "plug" | undefined;
}

export type PostExtractionMemoParams = SurgicalMemoParams;

/**
 * 1. Памятка пациенту после удаления зуба
 */
export function buildPostExtractionMemoText(params: SurgicalMemoParams = {}): string {
	const toothStr = params.toothFdi ? ` (зуб #${params.toothFdi})` : "";
	const greeting = params.patientName ? `Уважаемый(ая) ${params.patientName}!\n\n` : "";
	const docStr = params.doctorName ? `\nЛечащий врач: ${params.doctorName}` : "";
	const phoneStr = params.clinicPhone ? `\nТелефон клиники: ${params.clinicPhone}` : "";
	const suturesStr =
		params.hasSutures || params.complexity === "complex" || params.complexity === "impacted_dystopic"
			? `\n7. ШВЫ: Наложены швы. Снятие швов через ${params.sutureRemovalDays ?? "7-10"} дней. Не трогать швы языком и зубочистками.`
			: "";

	return (
		`${greeting}ПАМЯТКА ПАЦИЕНТУ ПОСЛЕ УДАЛЕНИЯ ЗУБА${toothStr}\n\n` +
		`Для благополучного заживления лунки строго соблюдайте следующие правила:\n\n` +
		`1. МАРЛЕВЫЙ ТАМПОН: Сплюнуть через 20 минут после окончания операции.\n` +
		`2. ХОЛОД: Прикладывать сухой холод к щеке на 15 минут с перерывами 30-40 минут в первые 2-3 часа.\n` +
		`3. НЕ ГРЕТЬ: Категорически запрещено греть щеку, прикладывать компрессы, посещать баню, сауну и принимать горячую ванну 3 дня.\n` +
		`4. НЕ ПОЛОСКАТЬ: Не полоскать полость рта в первые 24 часа, чтобы не вымыть кровяной сгусток из лунки. Не пить через трубочку, не сплевывать активно.\n` +
		`5. ПИТАНИЕ: Прием пищи через 2 часа после операции (когда полностью отойдет анестезия). Исключить твердое, горячее и острое на 3 дня. Жевать на противоположной стороне.\n` +
		`6. ОБЕЗБОЛИВАНИЕ: При болях принять назначенный препарат (Нимесил 1 пакетик или Ибупрофен 400 мг) после еды.` +
		suturesStr +
		`\n\nПри продолжающемся кровотечении, нарастающем отеке или температуре выше 38°C немедленно обратитесь в клинику.` +
		docStr +
		phoneStr
	).trim();
}

/**
 * 2. Памятка пациенту после установки дентального имплантата
 */
export function buildPostImplantMemoText(params: SurgicalMemoParams = {}): string {
	const toothStr = params.toothFdi ? ` (область зуба #${params.toothFdi})` : "";
	const brandStr = params.implantBrand ? ` [${params.implantBrand}]` : "";
	const greeting = params.patientName ? `Уважаемый(ая) ${params.patientName}!\n\n` : "";
	const docStr = params.doctorName ? `\nЛечащий хирург-имплантолог: ${params.doctorName}` : "";
	const phoneStr = params.clinicPhone ? `\nТелефон клиники: ${params.clinicPhone}` : "";
	const capStr = params.capType === "plug"
		? "Установлен винт-заглушка с ушиванием раны наглухо. Формирователь десны будет установлен на втором этапе через 3-4 месяца."
		: "Установлен формирователь десны (ФДМ). Не накусывать на него твердую пищу и не расшатывать языком.";

	return (
		`${greeting}ПАМЯТКА ПАЦИЕНТУ ПОСЛЕ УСТАНОВКИ ИМПЛАНТАТА${toothStr}${brandStr}\n\n` +
		`Для успешной остеоинтеграции имплантата строго соблюдайте рекомендации:\n\n` +
		`1. ХОЛОД: Прикладывать сухой холод к щеке в проекции операции на 15 минут с перерывами 30 минут в течение первых суток.\n` +
		`2. АНТИСЕПТИЧЕСКИЙ РЕЖИМ: С первых суток делать пассивные ротовые ванночки раствором хлоргексидина 0.05% по 1 минуте 3 раза в день после еды (не полоскать активно!).\n` +
		`3. ДИЕТА: Щадящая теплая мягкая пища на 7-10 дней. Категорически исключить жевание на оперированной стороне. Запрещены семечки, орехи, сухари.\n` +
		`4. ФИЗИЧЕСКИЙ ПОКОЙ: Исключить занятия спортом, подъем тяжестей, посещение бани, сауны, бассейна и авиаперелеты на 7 дней.\n` +
		`5. ГИГИЕНА: Зубы чистить мягкой щеткой со 2-го дня, аккуратно обходя оперированную зону.\n` +
		`6. ШВЫ И ФОРМИРОВАТЕЛЬ: ${capStr} Наложены швы. Снятие швов через 10-14 дней.\n` +
		`7. МЕДИКАМЕНТЫ: Принимать назначенные антибактериальные и противовоспалительные препараты строго по рецептурной схеме.` +
		`\n\nПри появлении пульсирующей боли, выраженного отека или повышении температуры немедленно свяжитесь с клиникой.` +
		docStr +
		phoneStr
	).trim();
}

/**
 * 3. Памятка пациенту после синус-лифтинга и костной пластики (НКР)
 */
export function buildPostSinusGbrMemoText(params: SurgicalMemoParams = {}): string {
	const toothStr = params.toothFdi ? ` (область зуба #${params.toothFdi})` : "";
	const greeting = params.patientName ? `Уважаемый(ая) ${params.patientName}!\n\n` : "";
	const docStr = params.doctorName ? `\nЛечащий хирург: ${params.doctorName}` : "";
	const phoneStr = params.clinicPhone ? `\nТелефон клиники: ${params.clinicPhone}` : "";

	return (
		`${greeting}ПАМЯТКА ПАЦИЕНТУ ПОСЛЕ СИНУС-ЛИФТИНГА И КОСТНОЙ ПЛАСТИКИ${toothStr}\n\n` +
		`Для сохранения целостности мембраны Шнайдера и костного графта соблюдайте строгий режим:\n\n` +
		`1. КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО СМОРКАТЬСЯ: Не сморкаться в течение 14 дней! При чихании открывать рот, не зажимая нос.\n` +
		`2. ЗАПРЕТ ПЕРЕПАДОВ ДАВЛЕНИЯ: Запрещены авиаперелеты, дайвинг, ныряние, надувание шаров и питье через соломинку 14 дней.\n` +
		`3. ХОЛОД: Сухой холод к щеке на 15 минут каждые 1-2 часа в первый день.\n` +
		`4. КАПЛИ В НОС: Применять сосудосуживающие назальные капли по схеме врача 5-7 дней для обеспечения дренажа соустья пазухи.\n` +
		`5. АНТИБАКТЕРИАЛЬНАЯ ТЕРАПИЯ: Полный курс антибиотикотерапии без перерывов.\n` +
		`6. ДИЕТА И ПОКОЙ: Исключить горячее, алкоголь, жесткую пищу, сауну и баню на 14 дней. Не надувать щеки.\n` +
		`7. ШВЫ: Снятие швов через 12-14 дней.` +
		`\n\nПри появлении заложенности пазухи, кровянистых выделений из носа или лихорадки срочно свяжитесь с хирургом.` +
		docStr +
		phoneStr
	).trim();
}

/**
 * 4. Памятка пациенту после периостотомии (вскрытия абсцесса)
 */
export function buildPostPeriostotomyMemoText(params: SurgicalMemoParams = {}): string {
	const toothStr = params.toothFdi ? ` (область зуба #${params.toothFdi})` : "";
	const greeting = params.patientName ? `Уважаемый(ая) ${params.patientName}!\n\n` : "";
	const docStr = params.doctorName ? `\nЛечащий врач: ${params.doctorName}` : "";
	const phoneStr = params.clinicPhone ? `\nТелефон клиники: ${params.clinicPhone}` : "";

	return (
		`${greeting}ПАМЯТКА ПАЦИЕНТУ ПОСЛЕ ПЕРИОСТОТОМИИ (ВСКРЫТИЯ ВОСПАЛЕНИЯ)${toothStr}\n\n` +
		`Правила реабилитации после дренирования воспалительного очага:\n\n` +
		`1. ДРЕНАЖ: В рану установлен резиновый ленточный дренаж для оттока экссудата. Категорически запрещено извлекать или трогать его языком!\n` +
		`2. НЕ ГРЕТЬ ЩЕКУ: Запрещены компрессы, грелки, теплые шарфы, баня и горячий душ! Тепло провоцирует распространение гноя.\n` +
		`3. РОТОВЫЕ ВАННОЧКИ: Теплый раствор антисептика (хлоргексидин 0.05% или мирамистин) держать во рту на стороне разреза по 1-2 мин 5 раз в день.\n` +
		`4. ХОЛОД: Сухой холод к щеке на 15 минут с перерывами 40 минут в первые сутки.\n` +
		`5. МЕДИКАМЕНТЫ: Прием антибиотиков и противовоспалительных строго по схеме.\n` +
		`6. ОБЯЗАТЕЛЬНАЯ ЯВКА: Завтра явка на осмотр, ревизию раны и смену/удаление дренажа.` +
		`\n\nПри нарастании отека, затруднении глотания или открывания рта — экстренный визит в клинику.` +
		docStr +
		phoneStr
	).trim();
}

/**
 * Единый канонический диспетчер формирования памятки по сценарию
 */
export function buildSurgicalPostOpMemoText(
	scenario: SurgeryScenarioType,
	params: SurgicalMemoParams = {},
): string {
	switch (scenario) {
		case "implant":
			return buildPostImplantMemoText(params);
		case "sinus_gbr":
			return buildPostSinusGbrMemoText(params);
		case "resection_periostotomy":
			return buildPostPeriostotomyMemoText(params);
		case "extraction":
		default:
			return buildPostExtractionMemoText(params);
	}
}
