/**
 * @file packages/shared/src/ai/dentalStylesAndPhonetics.ts
 * @description Clinical doctor communication styles, phonetic brand resolvers,
 * withdrawn drugs blacklist, and reaction to critique directives.
 * Extracted and ported from StomChat & EndoChat EBM engines.
 */

// ==============================================================================
// 1. STYLES OF DOCTOR COMMUNICATION (STYLE_PROMPTS)
// ==============================================================================

export type DoctorCommunicationStyle = "colleague_friendly" | "clinical_dry" | "humor_cynic";

export const STYLE_PROMPTS: Record<DoctorCommunicationStyle, string> = {
	colleague_friendly:
		"Твой стиль общения — живой, практический chairside-стиль опытного коллеги у кресла. Говори на равных, емко, по делу и по-человечески. Без академической духоты, без менторского тона доцента и без лекторской зауми. Без лишней фамильярности и без эмодзи-кривляния.",
	clinical_dry:
		"Твой стиль общения — сухие клинические факты. Отвечай строго, лаконично и по делу. Категорически ЗАПРЕЩЕНЫ любые шутки, каламбуры, смайлы, метафоры или лирические отступления. Только практическая доказательная медицина (EBM), протоколы, дозировки и анатомические обоснования. Никаких смайлов вообще.",
	humor_cynic:
		"Твой стиль общения — ироничный стоматолог-циник с легким профессиональным юмором. Ты понимаешь реалии врачебных будней, профессиональный юмор про сложные каналы, перелечивания и пациентов, но сохраняешь такт и клиническую грамотность. Тон: живой, ироничный, профессиональный, без панибратства и без дурацких эмодзи."
};

// ==============================================================================
// 2. REACTION TO CRITIQUE AND DISPUTED FINDINGS DIRECTIVE
// ==============================================================================

export const REACTION_TO_CRITIQUE_DIRECTIVE = `=== РЕАКЦИЯ НА КРИТИКУ, ОСПАРИВАНИЕ НАХОДОК И УКАЗАНИЕ НА ОШИБКИ ===
Если врач оспаривает твоё замечание, диагноз или находку на снимке (например, спрашивает «Какой нависающий край?», «Где ты там кариес нашёл?», «Ты где это увидел?», пусть даже в резкой или саркастичной форме):
1. КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНО обижаться, оправдываться, повторять ложное замечание или упрямо стоять на своём без доказательств!
2. Перепроверь снимок и контекст критически. Если дефект был додуман машинным зрением или оптическим артефактом (блик полира, тень, угол съёмки), честно и спокойно признай это как опытный коллега: «Пересмотрел снимок внимательнее — согласен, в окклюзионной проекции переход чистый, ступеньки нет. Принял световой блик полира за избыток композита. Мой косяк, забираю слова назад.»
3. Либо спокойно укажи конкретную анатомическую зону, которую имел в виду («Смотрел на придесневой контакт 4.6–4.7 — если зондом там гладко, вопрос снят»).`;

// ==============================================================================
// 3. PHONETIC BRAND AND EQUIPMENT RESOLVER (КИРИЛЛИЧЕСКАЯ ТРАНСЛИТЕРАЦИЯ)
// ==============================================================================

export interface PhoneticBrandInfo {
	readonly originalBrand: string;
	readonly manufacturer?: string;
	readonly category: "composite" | "bonding" | "endo_file" | "sealer" | "cement" | "rotary_brush" | "ultrasonic" | "bioceramic" | "other";
	readonly clinicalDescriptionRu: string;
}

export const PHONETIC_BRAND_MAP: Record<string, PhoneticBrandInfo> = {
	оклюбраш: {
		originalBrand: "Occlubrush",
		manufacturer: "Kerr",
		category: "rotary_brush",
		clinicalDescriptionRu: "Щёточки с карбидом кремния для финишной полировки окклюзионных фиссур композитов без пасты"
	},
	паракер: {
		originalBrand: "ParaCore",
		manufacturer: "Coltene",
		category: "cement",
		clinicalDescriptionRu: "Композитный цемент двойного отверждения для фиксации штифтов и формирования культи"
	},
	паракёр: {
		originalBrand: "ParaCore",
		manufacturer: "Coltene",
		category: "cement",
		clinicalDescriptionRu: "Композитный цемент двойного отверждения для фиксации штифтов и формирования культи"
	},
	паракор: {
		originalBrand: "ParaCore",
		manufacturer: "Coltene",
		category: "cement",
		clinicalDescriptionRu: "Композитный цемент двойного отверждения для фиксации штифтов и формирования культи"
	},
	протейпер: {
		originalBrand: "ProTaper (Gold / Next / Universal)",
		manufacturer: "Dentsply Sirona",
		category: "endo_file",
		clinicalDescriptionRu: "Никель-титановая эндодонтическая ротационная система с прогрессивной конусностью"
	},
	реципрок: {
		originalBrand: "Reciproc / Reciproc Blue",
		manufacturer: "VDW",
		category: "endo_file",
		clinicalDescriptionRu: "Реципрокная однофайловая эндодонтическая система с термообработкой сплава"
	},
	соко: {
		originalBrand: "SOCO SC / SC Pro",
		manufacturer: "SOCO",
		category: "endo_file",
		clinicalDescriptionRu: "Никель-титановые ротационные файлы с памятью формы и контролируемой гибкостью"
	},
	бисилер: {
		originalBrand: "Bio-C Sealer / BioRoot RCS",
		manufacturer: "Angelus / Septodont",
		category: "bioceramic",
		clinicalDescriptionRu: "Готовый к применению биокерамический гидравлический силикатный силер для корневых каналов"
	},
	биосилер: {
		originalBrand: "Bio-C Sealer",
		manufacturer: "Angelus",
		category: "bioceramic",
		clinicalDescriptionRu: "Биокерамический гидрофильный силер на основе силикатов кальция"
	},
	бидентин: {
		originalBrand: "Biodentine",
		manufacturer: "Septodont",
		category: "bioceramic",
		clinicalDescriptionRu: "Биоактивный заменитель дентина на основе трикальцийсиликата (прямое покрытие пульпы, перфорации)"
	},
	биодентин: {
		originalBrand: "Biodentine",
		manufacturer: "Septodont",
		category: "bioceramic",
		clinicalDescriptionRu: "Биоактивный заменитель дентина на основе трикальцийсиликата"
	},
	оптибонд: {
		originalBrand: "OptiBond FL / OptiBond Universal",
		manufacturer: "Kerr",
		category: "bonding",
		clinicalDescriptionRu: "Золотой стандарт адгезивов (OptiBond FL — 4-е поколение total-etch, 48% наполненность)"
	},
	иррисайф: {
		originalBrand: "IrriSafe",
		manufacturer: "Acteon",
		category: "ultrasonic",
		clinicalDescriptionRu: "Пассивная ультразвуковая ирригационная насадка (PUI) для неагрессивной активации NaOCl"
	},
	иррисаф: {
		originalBrand: "IrriSafe",
		manufacturer: "Acteon",
		category: "ultrasonic",
		clinicalDescriptionRu: "Ультразвуковая насадка для пассивной ультразвуковой активации ирригантов"
	},
	эйтис: {
		originalBrand: "Eighteeth (E-Pex, Ultra X, Fast Pack)",
		manufacturer: "Eighteeth",
		category: "other",
		clinicalDescriptionRu: "Линейка эндодонтического оборудования (ультразвуковой активатор Ultra X, апекслокатор, плаггеры)"
	},
	эстелайт: {
		originalBrand: "Estelite Asteria / Estelite Sigma Quick",
		manufacturer: "Tokuyama Dental",
		category: "composite",
		clinicalDescriptionRu: "Субмикронаполненный светоотверждаемый реставрационный композит с эффектом хамелеона"
	},
	фильтек: {
		originalBrand: "Filtek Ultimate / Filtek One Bulk Fill",
		manufacturer: "3M",
		category: "composite",
		clinicalDescriptionRu: "Нанокомпозитный пломбировочный материал для фронтальной и жевательной группы"
	}
};

/**
 * Разрешает кириллическую фонетику в оригинальный бренд и клиническое описание.
 */
export function resolvePhoneticBrand(query: string): PhoneticBrandInfo | null {
	if (!query) return null;
	const lower = query.toLowerCase().trim().replace(/ё/g, "е");
	for (const [key, info] of Object.entries(PHONETIC_BRAND_MAP)) {
		const normalizedKey = key.replace(/ё/g, "е");
		if (lower.includes(normalizedKey)) {
			return info;
		}
	}
	return null;
}

// ==============================================================================
// 4. BLACKLIST OF WITHDRAWN DRUGS AND TOXIC IATROGENIC PRACTICES
// ==============================================================================

export interface WithdrawnDrugWarning {
	readonly drugName: string;
	readonly status: "withdrawn_from_market" | "toxic_iatrogenic_forbidden" | "obsolete_non_ebm";
	readonly reasonRu: string;
	readonly modernAlternativesRu: string[];
}

export const WITHDRAWN_DRUGS_AND_PRACTICES: Record<string, WithdrawnDrugWarning> = {
	солкосерил: {
		drugName: "Солкосерил (Solcoseryl)",
		status: "withdrawn_from_market",
		reasonRu:
			"Препарат окончательно отозван производителем (Meda Pharma/Viatris) с мирового рынка и из РФ в 2020-2021 гг., регистрационные удостоверения аннулированы. Депротеинизированный гемодериват крови телят без доказанной клинической эффективности с риском передачи прионных инфекций.",
		modernAlternativesRu: [
			"Асепта (адгезивный бальзам с прополисом или метронидазолом/хлоргексидином)",
			"Холисал (стоматологический гель: холина салицилат + цеталкония хлорид)",
			"Винилин (бальзам Шостаковского) / Афтофикс",
			"Облепиховое масло (на стадии чистой эпителизации)"
		]
	},
	актовегин: {
		drugName: "Актовегин (Actovegin)",
		status: "obsolete_non_ebm",
		reasonRu: "Препарат без доказанной эффективности в доказательной стоматологии (EBM). Не рекомендуется для местной терапии слизистой.",
		modernAlternativesRu: ["Холисал гель", "Асепта бальзам", "Винилин"]
	},
	мышьяк: {
		drugName: "Мышьяковистый ангидрид (мышьяк, As2O3, Депулпин)",
		status: "toxic_iatrogenic_forbidden",
		reasonRu: "Крайне токсичный тканевой яд. Вызывает токсический мышьяковистый периодонтит, некроз межзубного сосочка и остеонекроз альвеолярной кости. Запрещен во всем мире.",
		modernAlternativesRu: [
			"Витальная экстирпация пульпы под адекватной проводниковой/инфильтрационной анестезией артикаином 4%",
			"При дефиците времени: витальная пульпотомия под коффердамом с гемостазом и временной повязкой с гидроксидом кальция (Calasept/UltraCal)"
		]
	},
	резорцин: {
		drugName: "Резорцин-формалиновый метод (Форедент, Крезодент)",
		status: "toxic_iatrogenic_forbidden",
		reasonRu: "Цитотоксичен, канцерогенен, мутагенен. Окрашивает зуб в грязно-розовый цвет, превращает дентин в стекловидную хрупкую массу, делает каналы непроходимыми и вызывает хронические периапикальные очаги деструкции.",
		modernAlternativesRu: [
			"Инструментальная обработка ротационными NiTi-файлами с постоянной ирригацией 3% NaOCl",
			"Ультразвуковая активация (PUI) и удаление смазанного слоя 17% EDTA",
			"Трехмерная герметичная обтурация гуттаперчей с эпоксидным силером (AH Plus) или биокерамикой"
		]
	},
	депофорез: {
		drugName: "Депофорез гидроокиси меди-кальция",
		status: "toxic_iatrogenic_forbidden",
		reasonRu: "Псевдонаучный метод без доказательной базы Cochrane/ESE. Не обеспечивает дезинфекцию и герметизм корневых каналов.",
		modernAlternativesRu: ["Стандартный эндодонтический протокол ESE (коффердам, NaOCl, EDTA, гуттаперча)"]
	},
	"открытый зуб": {
		drugName: "Оставление зуба открытым при периодонтите",
		status: "toxic_iatrogenic_forbidden",
		reasonRu: "Грубая ятрогенная ошибка. Оставление зуба открытым «для оттока» приводит к массивному вторичному инфицированию каналов микрофлорой полости рта, образованию устойчивых биопленок и резкому падению прогноза сохранения зуба.",
		modernAlternativesRu: [
			"Полноценная инструментальная обработка и ирригация NaOCl у кресла",
			"Временное пломбирование гидроксидом кальция (Ca(OH)2) на 7-14 дней",
			"Обязательная герметичная временная повязка (Cavit / стеклоиономерный цемент)"
		]
	}
};

/**
 * Проверяет наличие запрещенных, токсичных или отозванных препаратов в тексте.
 */
export function checkWithdrawnOrToxicPractice(text: string): WithdrawnDrugWarning | null {
	if (!text) return null;
	const lower = text.toLowerCase().replace(/ё/g, "е");
	for (const [key, warning] of Object.entries(WITHDRAWN_DRUGS_AND_PRACTICES)) {
		if (lower.includes(key)) {
			return warning;
		}
	}
	return null;
}
