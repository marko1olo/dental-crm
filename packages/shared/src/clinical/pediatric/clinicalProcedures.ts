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

export const enamelConditionSchema = z.enum(["white_spot", "superficial"]);
export type EnamelCondition = z.infer<typeof enamelConditionSchema>;

export interface PediatricIconProtocolOptions {
	readonly toothNumber: number;
	readonly surface: string;
	readonly enamelCondition: EnamelCondition;
	readonly patientWeightKg?: number | undefined;
	readonly isPrimary: boolean;
	readonly clinicalNotes?: string | undefined;
}

export interface PediatricIconStep {
	readonly stepNumber: number;
	readonly nameRu: string;
	readonly durationSeconds: number;
	readonly descriptionRu: string;
	readonly material?: string | undefined;
}

export interface PediatricIconProtocolResult {
	readonly procedureNameRu: string;
	readonly toothNumber: number;
	readonly surface: string;
	readonly enamelCondition: EnamelCondition;
	readonly isPrimary: boolean;
	readonly steps: readonly PediatricIconStep[];
	readonly totalExposureSeconds: number;
	readonly indicationsRu: string;
	readonly protocolDescriptionRu: string;
	readonly safetyWarningsRu: readonly string[];
	readonly parentRecommendationsRu: readonly string[];
	readonly formattedDiaryEntryRu: string;
}

export function calculatePediatricIconProtocol(
	options: PediatricIconProtocolOptions,
): PediatricIconProtocolResult {
	const tooth = options.toothNumber;
	const surface = options.surface || "вестибулярная";
	const isPrimary = options.isPrimary;
	const condition = options.enamelCondition;

	const conditionNameRu =
		condition === "white_spot"
			? "начальный кариес в стадии белого пятна (K02.0)"
			: "поверхностный кариес эмали без образования полости (K02.0)";

	const steps: readonly PediatricIconStep[] = [
		{
			stepNumber: 1,
			nameRu: "Абсолютная изоляция рабочего поля",
			durationSeconds: 60,
			descriptionRu:
				"Изоляция коффердамом/раббердамом или жидким коффердамом (жизненно необходимо для защиты слизистой от 15% соляной кислоты Icon-Etch).",
			material: "Коффердам / раббердам / Liquid Dam",
		},
		{
			stepNumber: 2,
			nameRu: "Травление эмали (Icon-Etch)",
			durationSeconds: 120,
			descriptionRu:
				"Нанесение 15% соляной кислоты (Icon-Etch) аппликатором на 120 секунд (2 минуты) для удаления гиперминерализованного поверхностного слоя эмали.",
			material: "Icon-Etch (15% HCl)",
		},
		{
			stepNumber: 3,
			nameRu: "Промывание и высушивание",
			durationSeconds: 30,
			descriptionRu:
				"Тщательное промывание обработанного участка зуба струей воды не менее 30 секунд с последующим полным высушиванием чистым сухим воздухом без примеси масел.",
		},
		{
			stepNumber: 4,
			nameRu: "Обезвоживание и оптический контроль (Icon-Dry)",
			durationSeconds: 30,
			descriptionRu:
				"Нанесение 99% этанола (Icon-Dry) на 30 секунд. Визуальный контроль: исчезновение белого пятна подтверждает достаточную глубину протравливания. При сохранении белого пятна допускается повторное травление.",
			material: "Icon-Dry (99% этанол)",
		},
		{
			stepNumber: 5,
			nameRu: "Первая инфильтрация (Icon-Infiltrant)",
			durationSeconds: 220,
			descriptionRu:
				"Нанесение инфильтранта высокой текучести на основе TEGDMA (Icon-Infiltrant) на 180 секунд (3 минуты). Капиллярное проникновение смолы в поры эмали. Удаление излишков матрикса флоссом/ватным валиком. Светополимеризация 40 секунд.",
			material: "Icon-Infiltrant (TEGDMA матрикс)",
		},
		{
			stepNumber: 6,
			nameRu: "Вторая инфильтрация (Icon-Infiltrant)",
			durationSeconds: 100,
			descriptionRu:
				"Повторное нанесение Icon-Infiltrant на 60 секунд (1 минута) для компенсации полимеризационной усадки. Удаление излишков, светополимеризация 40 секунд.",
			material: "Icon-Infiltrant (TEGDMA матрикс)",
		},
		{
			stepNumber: 7,
			nameRu: "Финишная полировка",
			durationSeconds: 60,
			descriptionRu:
				"Финишная обработка и полировка поверхности зуба мелкозернистыми полировочными полосками (штрипсами) и дисками до зеркального блеска эмали.",
			material: "Полировочные полоски / диски",
		},
	];

	const totalExposureSeconds = steps.reduce((sum, s) => sum + s.durationSeconds, 0);

	const indicationsRu =
		"Микроинвазивное лечение начального кариеса эмали в стадии белого пятна (K02.0) и поверхностного кариеса вестибулярных и апроксимальных поверхностей зубов без препарирования бормашиной у детей и подростков (включая пятна после ортодонтического лечения).";

	const protocolDescriptionRu =
		`Протокол инфильтрации кариеса ICON без бормашины зуба ${tooth} (${surface} поверхность, ${isPrimary ? "временный зуб" : "постоянный зуб"}): ` +
		`1. Абсолютная изоляция коффердамом. ` +
		`2. Протравливание 15% HCl Icon-Etch 120 сек (2 мин). ` +
		`3. Промывание водой 30 сек и высушивание воздухом. ` +
		`4. Обезвоживание Icon-Dry 30 сек и оптический контроль прозрачности. ` +
		`5. Первая инфильтрация Icon-Infiltrant 180 сек (3 мин), удаление излишков, светополимеризация 40 сек. ` +
		`6. Вторая инфильтрация Icon-Infiltrant 60 сек (1 мин), светополимеризация 40 сек. ` +
		`7. Финишная полировка штрипсами и дисками.`;

	const safetyWarningsRu: readonly string[] = [
		"ОБЯЗАТЕЛЬНАЯ ИЗОЛЯЦИЯ: 15% соляная кислота (Icon-Etch) вызывает химический ожог слизистой оболочки десны. Применение без коффердама/раббердама строго запрещено!",
		"Не применять при наличии сформированной кариозной полости с дефектом эмали глубже внешней трети дентина (D2–D3).",
		"Защита глаз ребенка и персонала специальными защитными очками от брызг соляной кислоты и фотополимеризационного света.",
	];

	const parentRecommendationsRu: readonly string[] = [
		"Процедура выполнена без сверления бормашиной и без анестезии: анатомия зуба сохранена на 100%.",
		"Не кормить ребенка красящими продуктами и напитками (ягоды, шоколад, соки, кола, морковь, свекла) в течение первых 24 часов после инфильтрации.",
		"Не употреблять жесткую пищу в течение 2 часов.",
		"Тщательная гигиена полости рта 2 раза в день фторсодержащей зубной пастой для стабилизации минерального баланса эмали.",
		"Контрольный осмотр и фотофиксация стабильности цвета эмали через 6 месяцев.",
	];

	const formattedDiaryEntryRu = [
		`Диагноз: ${conditionNameRu}, зуб ${tooth} (${surface} поверхность)`,
		`Процедура: Микроинвазивная инфильтрация кариеса эмали препаратом ICON (DMG)`,
		`Зуб: #${tooth} (${isPrimary ? "временный" : "постоянный"})`,
		`Протокол: ${protocolDescriptionRu}`,
		`Безопасность: Применена абсолютная изоляция коффердамом, ожога слизистой нет.`,
		`Результат: Кариозное пятно стабилизировано, оптический дефект устранен. Выдана памятка родителям.`,
	].join("\n");

	return {
		procedureNameRu: `Инфильтрация кариеса ICON зуба ${tooth}`,
		toothNumber: tooth,
		surface,
		enamelCondition: condition,
		isPrimary,
		steps,
		totalExposureSeconds,
		indicationsRu,
		protocolDescriptionRu,
		safetyWarningsRu,
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
	readonly iconInfiltration?: PediatricIconProtocolOptions | undefined;
	readonly traumaIadt?: { toothNumber?: number | undefined; notes?: string | undefined } | undefined;
	readonly spaceMaintainer?: { toothNumber?: number | undefined; notes?: string | undefined } | undefined;
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

	// 4. Icon infiltration section
	if (options?.iconInfiltration) {
		const icon = calculatePediatricIconProtocol(options.iconInfiltration);
		lines.push("");
		lines.push(`───────────────────────────────────────────────────────────────`);
		lines.push(`4. ИНФИЛЬТРАЦИЯ КАРИЕСА ICON (ЗУБ #${icon.toothNumber}, поверхность ${icon.surface}):`);
		lines.push(`   Лечение кариеса в стадии пятна проведено без бормашины и без боли.`);
		lines.push(`   Рекомендации:`);
		icon.parentRecommendationsRu.forEach((rec) => {
			lines.push(`   • ${rec}`);
		});
	}

	// 5. Dental Trauma IADT section
	if (options?.traumaIadt) {
		const toothStr = options.traumaIadt.toothNumber ? ` (ЗУБ #${options.traumaIadt.toothNumber})` : "";
		lines.push("");
		lines.push(`───────────────────────────────────────────────────────────────`);
		lines.push(`5. ПАМЯТКА ПОСЛЕ ОСТРОЙ ТРАВМЫ ЗУБОВ ПО ПРОТОКОЛУ IADT${toothStr}:`);
		lines.push(`   Проведено шинирование и стабилизация травмированного зуба.`);
		lines.push(`   Рекомендации для родителей:`);
		lines.push(`   • Строгая щадящая диета: только мягкая, негорячая пища в течение 10–14 дней.`);
		lines.push(`   • Категорически запрещено надкусывать твердую пищу травмированными передними зубами!`);
		lines.push(`   • Гигиена: бережная чистка зубов мягкой хирургической щеткой после каждого приема пищи.`);
		lines.push(`   • Антисептическая обработка десны в зоне травмы (хлоргексидин 0.12% или гель) 2 раза в день 7 дней.`);
		lines.push(`   • Диспансерный календарь IADT: явка на осмотр и контроль жизнеспособности пульпы через 1 неделю, 3 недели, 6–8 недель, 6 месяцев и 1 год.`);
		lines.push(`   • Срочно связаться с клиникой при: усилении боли, подвижности, припухлости десны или потемнении коронки зуба.`);
	}

	// 6. Space Maintainer section
	if (options?.spaceMaintainer) {
		const toothStr = options.spaceMaintainer.toothNumber ? ` (ЗОНА ЗУБА #${options.spaceMaintainer.toothNumber})` : "";
		lines.push("");
		lines.push(`───────────────────────────────────────────────────────────────`);
		lines.push(`6. ПАМЯТКА ПО НОШЕНИЮ УДЕРЖИВАТЕЛЯ МЕСТА / КОЛЬЦО-ПЕТЛЯ${toothStr}:`);
		lines.push(`   Установлен несъемный удерживатель места для предотвращения смещения соседних зубов.`);
		lines.push(`   Рекомендации для родителей:`);
		lines.push(`   • Исключить липкие и тягучие сладости: ириски, жевательную резинку, жевательный мармелад.`);
		lines.push(`   • Запрещено ковырять аппарат ногтями, зубочистками или ручками.`);
		lines.push(`   • Ежедневно проверять пальцем фиксацию кольца (оно не должно шататься).`);
		lines.push(`   • При расцементировке кольца: сохранить аппарат и немедленно обратиться в клинику для повторной фиксации!`);
		lines.push(`   • Контрольные осмотры каждые 3–4 месяца для отслеживания прорезывания постоянного зуба.`);
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
