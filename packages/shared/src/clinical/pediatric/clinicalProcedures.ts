import { z } from "zod";
import { getFranklDefinition, type FranklRating } from "./franklScale.js";

// ------------------------------------------------------------------------------------------------
// PEDIATRIC CLINICAL PROCEDURES & POST-OP PARENTAL RECOMMENDATIONS
// ------------------------------------------------------------------------------------------------

export const silveringDrugSchema = z.enum(["Saforide 38%", "Аргенат 30%", "Riva Star SDF"]);
export type SilveringDrug = z.infer<typeof silveringDrugSchema>;

export interface PediatricSilveringOptions {
	readonly teethNumbers: readonly number[];
	readonly drug?: SilveringDrug | undefined;
	readonly applicationsCount?: number | undefined;
	readonly clinicalNotes?: string | undefined;
}

export interface PediatricSilveringResult {
	readonly procedureNameRu: string;
	readonly teethNumbers: readonly number[];
	readonly drug: SilveringDrug;
	readonly applicationsCount: number;
	readonly indicationsRu: string;
	readonly protocolDescriptionRu: string;
	readonly parentWarningRu: string;
	readonly parentRecommendationsRu: readonly string[];
	readonly formattedDiaryEntryRu: string;
}

export function calculatePediatricSilveringProtocol(
	options: PediatricSilveringOptions,
): PediatricSilveringResult {
	const teeth = options.teethNumbers.length > 0 ? options.teethNumbers : [51, 52, 61, 62];
	const drug: SilveringDrug = options.drug ?? "Аргенат 30%";
	const applications = Math.max(1, Math.min(3, options.applicationsCount ?? 1));

	const indicationsRu =
		"Очаговая деминерализация эмали и начальный кариес временных зубов, циркулярный кариес фронтальной группы у детей раннего возраста при невозможности препарирования.";

	const protocolDescriptionRu =
		`Изоляция рабочего поля ватными валиками, очищение зубов (${teeth.join(", ")}), высушивание струей воздуха. Точечная аппликация препарата ${drug} с помощью микробраша в течение 1–2 минут. Удаление излишков препарата ватным тампоном. Создан защитный слой восстановленного серебра с выраженным антисептическим и реминерализующим эффектом.`;

	const parentWarningRu =
		"ВАЖНО ДЛЯ РОДИТЕЛЕЙ: Обработанные кариозные участки зубов приобретают стойкое темное (черное) окрашивание из-за фиксации ионов серебра. Это свидетельствует о стабилизации кариозного процесса и гибели патогенных бактерий.";

	const parentRecommendationsRu = [
		"Не кормить и не поить ребенка в течение 60 минут после процедуры.",
		"Исключить красящие напитки и продукты (соки, ягоды, чай) в первые 2–3 часа.",
		"Продолжать регулярную домашнюю гигиену: чистить зубы 2 раза в день мягкой щеткой с детской пастой, содержащей фтор 1000 ppm.",
		"Повторный профилактический осмотр и курс повторной аппликации серебра через 4–6 месяцев.",
	];

	const formattedDiaryEntryRu = [
		`Процедура: Серебрение временных зубов (${drug})`,
		`Зубы: ${teeth.join(", ")} (курс: ${applications}-я аппликация)`,
		`Протокол: ${protocolDescriptionRu}`,
		`Информирование: Родители предупреждены о стойком окрашивании кариозных полостей в темный цвет. Выдана памятка.`,
	].join("\n");

	return {
		procedureNameRu: `Серебрение временных зубов (${drug})`,
		teethNumbers: teeth,
		drug,
		applicationsCount: applications,
		indicationsRu,
		protocolDescriptionRu,
		parentWarningRu,
		parentRecommendationsRu,
		formattedDiaryEntryRu,
	};
}

export const fissureSealingMethodSchema = z.enum(["non_invasive", "invasive"]);
export type FissureSealingMethod = z.infer<typeof fissureSealingMethodSchema>;

export const fissureSealantMaterialSchema = z.enum([
	"Clinpro Sealant (3M)",
	"Fissurit FX (VOCO)",
	"Helioseal F (Ivoclar)",
	"Grandio Seal",
]);
export type FissureSealantMaterial = z.infer<typeof fissureSealantMaterialSchema>;

export interface PediatricFissureSealingOptions {
	readonly teethNumbers: readonly number[];
	readonly method?: FissureSealingMethod | undefined;
	readonly material?: FissureSealantMaterial | undefined;
	readonly clinicalNotes?: string | undefined;
}

export interface PediatricFissureSealingResult {
	readonly procedureNameRu: string;
	readonly teethNumbers: readonly number[];
	readonly method: FissureSealingMethod;
	readonly methodNameRu: string;
	readonly material: FissureSealantMaterial;
	readonly protocolDescriptionRu: string;
	readonly parentRecommendationsRu: readonly string[];
	readonly formattedDiaryEntryRu: string;
}

export function calculatePediatricFissureSealingProtocol(
	options: PediatricFissureSealingOptions,
): PediatricFissureSealingResult {
	const teeth = options.teethNumbers.length > 0 ? options.teethNumbers : [16, 26, 36, 46];
	const method: FissureSealingMethod = options.method ?? "non_invasive";
	const material: FissureSealantMaterial = options.material ?? "Clinpro Sealant (3M)";

	const methodNameRu =
		method === "non_invasive"
			? "Неинвазивная герметизация фиссур"
			: "Инвазивная герметизация фиссур (с микропрепарированием)";

	const prepStep =
		method === "invasive"
			? "Микропрепарирование пигментированных фиссур ультратонким алмазным бором. "
			: "";

	const protocolDescriptionRu =
		`Профессиональная очистка жевательных поверхностей зубов (${teeth.join(", ")}) циркулярной щеточкой с бесфтористой пастой. Изоляция и высушивание. ${prepStep}Травление эмали 37% ортофосфорной кислотой 20–30 секунд, тщательное смывание водой, высушивание до матового оттенка. Внесение светоотверждаемого герметика ${material} в фиссуры и ямки зондом. Фотополимеризация 20 секунд. Проверка окклюзионных контактов артикуляционной бумагой, финишная полировка, локальное фторирование фторлаком.`;

	const parentRecommendationsRu = [
		"Не употреблять жесткую и вязкую пищу (орехи, сухари, ириски, жевательные конфеты) в течение 2 часов.",
		"Поддерживать тщательную гигиену межзубных промежутков и окклюзионных поверхностей.",
		"Плановый контрольный визит через 6 месяцев для проверки сохранности и краевого прилегания силанта.",
	];

	const formattedDiaryEntryRu = [
		`Процедура: ${methodNameRu}`,
		`Зубы: ${teeth.join(", ")}`,
		`Материал силанта: ${material}`,
		`Протокол: ${protocolDescriptionRu}`,
		`Окклюзия: Окклюзионные контакты выверены копиркой, завышения прикуса нет. Выдана памятка родителям.`,
	].join("\n");

	return {
		procedureNameRu: methodNameRu,
		teethNumbers: teeth,
		method,
		methodNameRu,
		material,
		protocolDescriptionRu,
		parentRecommendationsRu,
		formattedDiaryEntryRu,
	};
}

export const pulpotomySubBaseMaterialSchema = z.enum([
	"Pulpotec",
	"Biodentine",
	"MTA ProRoot",
	"Formocresol",
]);
export type PulpotomySubBaseMaterial = z.infer<typeof pulpotomySubBaseMaterialSchema>;

export const pulpotomyRestorationSchema = z.enum([
	"composite",
	"glass_ionomer",
	"stainless_steel_crown_ssc",
	"zirconia_crown",
]);
export type PulpotomyRestoration = z.infer<typeof pulpotomyRestorationSchema>;

export interface PediatricPulpotomyOptions {
	readonly toothNumber: number;
	readonly subBaseMaterial?: PulpotomySubBaseMaterial | undefined;
	readonly restoration?: PulpotomyRestoration | undefined;
	readonly patientWeightKg?: number | undefined;
	readonly patientAgeYears?: number | undefined;
	readonly clinicalNotes?: string | undefined;
}

export interface PediatricPulpotomyResult {
	readonly procedureNameRu: string;
	readonly toothNumber: number;
	readonly subBaseMaterial: PulpotomySubBaseMaterial;
	readonly restoration: PulpotomyRestoration;
	readonly restorationNameRu: string;
	readonly protocolDescriptionRu: string;
	readonly anesthesiaSafetyWarningRu: string;
	readonly painManagementRu: string;
	readonly parentRecommendationsRu: readonly string[];
	readonly formattedDiaryEntryRu: string;
}

export function calculatePediatricPulpotomyProtocol(
	options: PediatricPulpotomyOptions,
): PediatricPulpotomyResult {
	const tooth = options.toothNumber;
	const subBase: PulpotomySubBaseMaterial = options.subBaseMaterial ?? "Pulpotec";
	const restoration: PulpotomyRestoration = options.restoration ?? "glass_ionomer";

	const restorationMap: Record<PulpotomyRestoration, string> = {
		composite: "Реставрация светоотверждаемым композитом",
		glass_ionomer: "Пломбирование стеклоиономерным цементом (СИЦ Vitremer)",
		stainless_steel_crown_ssc: "Стандартная металлическая коронка (SSC 3M/NuSmile)",
		zirconia_crown: "Детская эстетическая циркониевая коронка",
	};
	const restorationNameRu = restorationMap[restoration];

	const protocolDescriptionRu =
		`Инфильтрационная/проводниковая анестезия. Изоляция рабочего поля. Препарирование кариозной полости зуба ${tooth}, полное раскрытие полости зуба с удалением нависающих краев свода. Ампутация коронковой пульпы острым стерильным экскаватором/шаровидным бором на низкой скорости до устьев корневых каналов. Гемостаз стерильным ватным тампоном с 15.5% сульфатом железа (ViscoStat) в течение 1–2 минут до полной остановки кровотечения. На устья корневых каналов нанесена лечебная паста ${subBase}. Наложена изолирующая прокладка из СИЦ. Выполнено герметичное восстановление зуба: ${restorationNameRu}.`;

	const anesthesiaSafetyWarningRu =
		"КРИТИЧЕСКИ ВАЖНО: В течение 2–3 часов (до полного окончания анестезии) не оставляйте ребенка без присмотра! Ребенок может сильно прикусить онемевшую губу, щеку или язык, что приведет к обширной травматической язве. Не давайте твердую пищу до восстановления чувствительности.";

	const painManagementRu =
		"Обезболивание при дискомфорте после окончания анестезии: детская суспензия Ибупрофен (Нурофен) 10 мг/кг или Парацетамол 15 мг/кг каждые 6–8 часов при необходимости.";

	const parentRecommendationsRu = [
		anesthesiaSafetyWarningRu,
		"Исключить прием твердой, горячей и волокнистой пищи в день лечения.",
		painManagementRu,
		"Бережная чистка зубов мягкой щеткой со следующего утра.",
		"При появлении отека, припухлости десны или повышении температуры немедленно связаться с клиникой.",
		"Плановый рентген-контроль зуба через 6–12 месяцев.",
	];

	const formattedDiaryEntryRu = [
		`Диагноз: Обратимый пульпит временного зуба ${tooth} (K04.0)`,
		`Процедура: Витальная пульпотомия (ампутационный метод)`,
		`Лечебная прокладка: ${subBase}`,
		`Реставрация: ${restorationNameRu}`,
		`Протокол: ${protocolDescriptionRu}`,
		`Рекомендации: Родителям разъяснены риски прикусывания онемевшей губы/щеки, выдана памятка по уходу и обезболиванию.`,
	].join("\n");

	return {
		procedureNameRu: `Витальная пульпотомия зуба ${tooth} (${subBase})`,
		toothNumber: tooth,
		subBaseMaterial: subBase,
		restoration,
		restorationNameRu,
		protocolDescriptionRu,
		anesthesiaSafetyWarningRu,
		painManagementRu,
		parentRecommendationsRu,
		formattedDiaryEntryRu,
	};
}

export interface PediatricParentMemoOptions {
	readonly patientName?: string | undefined;
	readonly patientAgeYears?: number | undefined;
	readonly clinicName?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly franklRating?: FranklRating | undefined;
	readonly silvering?: PediatricSilveringOptions | undefined;
	readonly fissureSealing?: PediatricFissureSealingOptions | undefined;
	readonly pulpotomy?: PediatricPulpotomyOptions | undefined;
	readonly generalHygieneAdvice?: boolean | undefined;
	readonly customNotes?: string | undefined;
}

export function generatePediatricParentRecommendations(
	options?: PediatricParentMemoOptions,
): string {
	const clinic = options?.clinicName ?? "Детское отделение DENTE";
	const doctor = options?.doctorName ?? "Врач-стоматолог детский";
	const patient = options?.patientName ?? "Юный пациент";
	const age = options?.patientAgeYears ?? 7;
	const frankl = options?.franklRating ? getFranklDefinition(options.franklRating) : null;

	const lines: string[] = [];
	lines.push(`═══════════════════════════════════════════════════════════════`);
	lines.push(`   ПАМЯТКА ДЛЯ РОДИТЕЛЕЙ ПОСЛЕ ДЕТСКОГО СТОМАТОЛОГИЧЕСКОГО ПРИЕМА`);
	lines.push(`   ${clinic}`);
	lines.push(`═══════════════════════════════════════════════════════════════`);
	lines.push(`Пациент: ${patient}, ${age} лет`);
	lines.push(`Лечащий врач: ${doctor}`);
	lines.push(`Дата приема: ${new Date().toLocaleDateString("ru-RU")}`);

	if (frankl) {
		lines.push("");
		lines.push(`Психологическое поведение на приеме (Шкала Франкла):`);
		lines.push(`• ${frankl.nameRu}`);
		lines.push(`• Оценка: ${frankl.descriptionRu}`);
	}

	// 1. Pulpotomy section
	if (options?.pulpotomy) {
		const pulp = calculatePediatricPulpotomyProtocol(options.pulpotomy);
		lines.push("");
		lines.push(`───────────────────────────────────────────────────────────────`);
		lines.push(`1. ЛЕЧЕНИЕ ПУЛЬПИТА МОЛОЧНОГО ЗУБА #${pulp.toothNumber} (ПУЛЬПОТОМИЯ):`);
		lines.push(`   ${pulp.anesthesiaSafetyWarningRu}`);
		lines.push("");
		lines.push(`   Рекомендации по уходу:`);
		pulp.parentRecommendationsRu.forEach((rec) => {
			lines.push(`   • ${rec}`);
		});
	}

	// 2. Fissure Sealing section
	if (options?.fissureSealing) {
		const fiss = calculatePediatricFissureSealingProtocol(options.fissureSealing);
		lines.push("");
		lines.push(`───────────────────────────────────────────────────────────────`);
		lines.push(`2. ГЕРМЕТИЗАЦИЯ ФИССУР (ЗУБЫ ${fiss.teethNumbers.join(", ")}):`);
		lines.push(`   Проведена защита фиссур материалом ${fiss.material}.`);
		lines.push(`   Рекомендации:`);
		fiss.parentRecommendationsRu.forEach((rec) => {
			lines.push(`   • ${rec}`);
		});
	}

	// 3. Silvering section
	if (options?.silvering) {
		const silv = calculatePediatricSilveringProtocol(options.silvering);
		lines.push("");
		lines.push(`───────────────────────────────────────────────────────────────`);
		lines.push(`3. СЕРЕБРЕНИЕ ВРЕМЕННЫХ ЗУБОВ (${silv.teethNumbers.join(", ")}):`);
		lines.push(`   ${silv.parentWarningRu}`);
		lines.push(`   Рекомендации:`);
		silv.parentRecommendationsRu.forEach((rec) => {
			lines.push(`   • ${rec}`);
		});
	}

	// General advice
	if (options?.generalHygieneAdvice !== false) {
		lines.push("");
		lines.push(`───────────────────────────────────────────────────────────────`);
		lines.push(`ОБЩИЕ ПРАВИЛА ДОМАШНЕЙ ГИГИЕНЫ ДЛЯ РОДИТЕЛЕЙ:`);
		lines.push(`• До 8–9 лет родители ОБЯЗАТЕЛЬНО дочищают зубы ребенку минимум 1 раз в день на ночь.`);
		lines.push(`• Зубная паста должна содержать фториды по возрасту (до 6 лет — 1000 ppm, от 6 лет — 1450 ppm).`);
		lines.push(`• Ограничьте сладкие перекусы, липкие сладости и соки между основными приемами пищи.`);
		lines.push(`• Контрольный осмотр: каждые 3–4 месяца.`);
	}

	if (options?.customNotes) {
		lines.push("");
		lines.push(`Индивидуальные указания врача: ${options.customNotes}`);
	}

	lines.push(`═══════════════════════════════════════════════════════════════`);
	return lines.join("\n");
}
