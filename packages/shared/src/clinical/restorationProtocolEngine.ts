/**
 * DENTE Dental CRM — Clinical Restorative Dentistry Protocol Engine (Мандаты 8e, 8i, 8k, 8n)
 *
 * Чистая клиническая бизнес-логика терапевтической реставрации зубов:
 * - Классификация кариозных полостей по Блэку (Black Cavity Classes I–VI).
 * - Каталог сертифицированных реставрационных материалов (Filtek Ultimate, Estelite Asteria, Harmonize, SDR Plus Flow).
 * - Каталог адгезивных протоколов (OptiBond FL, Single Bond 2, Clearfil SE Bond, OptiBond Universal).
 * - Системы финишной обработки и полировки (Sof-Lex, Enhance, Prisma Gloss, Bausch 40 мкм).
 * - Расчет гарантийных сроков и срока службы по стандартам Стоматологической Ассоциации России (СтАР).
 * - Привязка к Номенклатуре медицинских услуг Минздрава РФ (Приказ № 804н).
 * - Полное соблюдение Мандата 8d: ноль мультяшных эмодзи в протоколах.
 */

import { isValidFdiToothNumber } from "../emr/emrProtocolEngine.js";
import { isPrimaryTooth } from "../pediatricDentition.js";
import type { Order804nServiceRef, BlackCavityClass } from "../emr/emrProtocolPresets.js";
export type { BlackCavityClass };

export const BLACK_CAVITY_CLASS_LABELS: Record<BlackCavityClass, string> = {
	class_I: "Класс I по Блэку (фиссуры и естественные ямки моляров/премоляров)",
	class_II: "Класс II по Блэку (апроксимальные поверхности моляров/премоляров — MO, OD, MOD)",
	class_III: "Класс III по Блэку (апроксимальные поверхности резцов/клыков без нарушения угла)",
	class_IV: "Класс IV по Блэку (апроксимальные поверхности резцов/клыков с повреждением угла/края)",
	class_V: "Класс V по Блэку (пришеечные области всех зубов — вестибулярные/оральные)",
	class_VI: "Класс VI по Блэку (режущие края передних и вершины бугров боковых зубов)",
};

/** Бренды композитных реставрационных материалов */
export type CompositeMaterialBrand =
	| "filtek_ultimate"
	| "estelite_asteria"
	| "harmonize"
	| "sdr_plus_flow"
	| "filtek_flow"
	| "beautifil_flow"
	| "gradia_direct";

export interface CompositeMaterialInfo {
	readonly id: CompositeMaterialBrand;
	readonly tradeNameRu: string;
	readonly manufacturer: string;
	readonly category: "nanohybrid" | "submicron" | "bulk_fill_flow" | "flowable" | "giomer";
	readonly fillerPercentageWeight: number;
	readonly indicationRu: string;
}

export const COMPOSITE_MATERIALS_CATALOG: Record<CompositeMaterialBrand, CompositeMaterialInfo> = {
	filtek_ultimate: {
		id: "filtek_ultimate",
		tradeNameRu: "Filtek Ultimate (3M ESPE)",
		manufacturer: "3M ESPE (США / Германия)",
		category: "nanohybrid",
		fillerPercentageWeight: 78.5,
		indicationRu: "Универсальный нанокластерный композит для высокоэстетичных реставраций жевательных и фронтальных зубов",
	},
	estelite_asteria: {
		id: "estelite_asteria",
		tradeNameRu: "Estelite Asteria (Tokuyama Dental)",
		manufacturer: "Tokuyama Dental (Япония)",
		category: "submicron",
		fillerPercentageWeight: 82.0,
		indicationRu: "Субмикронный сферический композит упрощенной схемы стратификации с эффектом хамелеона",
	},
	harmonize: {
		id: "harmonize",
		tradeNameRu: "Harmonize (Kerr)",
		manufacturer: "Kerr (США)",
		category: "nanohybrid",
		fillerPercentageWeight: 81.0,
		indicationRu: "Универсальный наногибридный композит с технологией адаптивного отклика (ART)",
	},
	sdr_plus_flow: {
		id: "sdr_plus_flow",
		tradeNameRu: "SDR Plus Flowable (Dentsply Sirona)",
		manufacturer: "Dentsply Sirona (Германия)",
		category: "bulk_fill_flow",
		fillerPercentageWeight: 68.0,
		indicationRu: "Текучий базовый композит с самовыравниванием и компенсацией полимеризационного стресса (слой до 4 мм)",
	},
	filtek_flow: {
		id: "filtek_flow",
		tradeNameRu: "Filtek Supreme Flowable (3M)",
		manufacturer: "3M ESPE (США)",
		category: "flowable",
		fillerPercentageWeight: 65.0,
		indicationRu: "Текучий нанокомпозит для адаптивного лайнерного слоя, реставрации клиновидных дефектов и мелких полостей",
	},
	beautifil_flow: {
		id: "beautifil_flow",
		tradeNameRu: "Beautifil Flow Plus F00/F03 (Shofu)",
		manufacturer: "Shofu Inc. (Япония)",
		category: "giomer",
		fillerPercentageWeight: 67.0,
		indicationRu: "Биоактивный инжектируемый гибрид Giomer с длительным выделением и накоплением ионов фтора",
	},
	gradia_direct: {
		id: "gradia_direct",
		tradeNameRu: "GC Gradia Direct (GC Corporation)",
		manufacturer: "GC (Япония)",
		category: "nanohybrid",
		fillerPercentageWeight: 77.0,
		indicationRu: "Светоотверждаемый микрогибридный композит с широким выбором опаковых и эмалевых оттенков",
	},
};

/** Бренды адгезивных систем */
export type AdhesiveSystemBrand =
	| "optibond_fl"
	| "single_bond_2"
	| "clearfil_se_bond"
	| "optibond_universal";

export interface AdhesiveSystemInfo {
	readonly id: AdhesiveSystemBrand;
	readonly tradeNameRu: string;
	readonly manufacturer: string;
	readonly generation: number;
	readonly technique: "total_etch" | "self_etch" | "universal_selective_etch";
	readonly etchingTimeDentinSeconds: number;
	readonly etchingTimeEnamelSeconds: number;
	readonly protocolSummaryRu: string;
}

export const ADHESIVE_SYSTEMS_CATALOG: Record<AdhesiveSystemBrand, AdhesiveSystemInfo> = {
	optibond_fl: {
		id: "optibond_fl",
		tradeNameRu: "OptiBond FL (Kerr)",
		manufacturer: "Kerr (США)",
		generation: 4,
		technique: "total_etch",
		etchingTimeEnamelSeconds: 15,
		etchingTimeDentinSeconds: 10,
		protocolSummaryRu: "4-е поколение (золотой стандарт адгезии): протравливание 37% H3PO4, праймер 20 сек, адгезив с 48% наполнителем, полимеризация 20 сек",
	},
	single_bond_2: {
		id: "single_bond_2",
		tradeNameRu: "Single Bond 2 / Scotchbond 1 XT (3M)",
		manufacturer: "3M ESPE (США)",
		generation: 5,
		technique: "total_etch",
		etchingTimeEnamelSeconds: 15,
		etchingTimeDentinSeconds: 10,
		protocolSummaryRu: "5-е поколение (1-бутылочный тотальный бондинг): протравливание 37% H3PO4 15 сек, 2 слоя адгезива, бережное раздувание, полимеризация 10 сек",
	},
	clearfil_se_bond: {
		id: "clearfil_se_bond",
		tradeNameRu: "Clearfil SE Bond (Kuraray)",
		manufacturer: "Kuraray Noritake (Япония)",
		generation: 6,
		technique: "self_etch",
		etchingTimeEnamelSeconds: 0,
		etchingTimeDentinSeconds: 0,
		protocolSummaryRu: "6-е поколение (2-шаговый самопротравливающий праймер + бонд на основе 10-MDP): праймер 20 сек без смывания, бонд, полимеризация 10 сек",
	},
	optibond_universal: {
		id: "optibond_universal",
		tradeNameRu: "OptiBond Universal (Kerr)",
		manufacturer: "Kerr (США)",
		generation: 8,
		technique: "universal_selective_etch",
		etchingTimeEnamelSeconds: 15,
		etchingTimeDentinSeconds: 0,
		protocolSummaryRu: "8-е поколение (универсальный однокомпонентный адгезив с мономером GPDM): селективное протравливание эмали, втирание 20 сек, полимеризация 10 сек",
	},
};

/** Системы финишной отделки и окклюзионной коррекции */
export const FINISHING_SYSTEMS_CATALOG = [
	{
		id: "soflex_discs",
		nameRu: "Диски шлифовальные 3M Sof-Lex (от грубых до супермягких)",
		purposeRu: "Контурирование проксимальных поверхностей и режущего края",
	},
	{
		id: "enhance_cups",
		nameRu: "Полировочные головки Dentsply Enhance (чашечки, конусы, диски)",
		purposeRu: "Финишная обработка анатомических скатов бугров и фиссур без абразивных повреждений",
	},
	{
		id: "prisma_gloss",
		nameRu: "Алмазная полировочная паста Prisma Gloss (Regular / Extra Fine)",
		purposeRu: "Создание сухого зеркального блеска реставрации со щеткой из натуральной щетины",
	},
	{
		id: "bausch_articulating_paper",
		nameRu: "Артикуляционная бумага Bausch 40 мкм с прогрессивным выделением цвета",
		purposeRu: "Выверка статических и динамических окклюзионных контактов (латеро- и протрузия)",
	},
] as const;

/** 1-Клик комбинации поверхностей */
export interface RestorationSurfacePreset {
	readonly id: string;
	readonly labelRu: string;
	readonly surfaces: readonly string[];
	readonly descriptionRu: string;
}

export const RESTORATION_SURFACE_PRESETS: readonly RestorationSurfacePreset[] = [
	{ id: "mod", labelRu: "MOD", surfaces: ["M", "O", "D"], descriptionRu: "Медиально-окклюзионно-дистальная (3 поверхности)" },
	{ id: "mo", labelRu: "MO", surfaces: ["M", "O"], descriptionRu: "Медиально-окклюзионная (2 поверхности)" },
	{ id: "od", labelRu: "OD", surfaces: ["O", "D"], descriptionRu: "Окклюзионно-дистальная (2 поверхности)" },
	{ id: "o", labelRu: "O", surfaces: ["O"], descriptionRu: "Окклюзионная / жевательная (1 поверхность)" },
	{ id: "v", labelRu: "V", surfaces: ["V"], descriptionRu: "Вестибулярная / щечная (1 поверхность)" },
	{ id: "lp", labelRu: "L/P", surfaces: ["L"], descriptionRu: "Язычная / небная (1 поверхность)" },
	{ id: "c", labelRu: "C", surfaces: ["C"], descriptionRu: "Пришеечная / цементная (1 поверхность)" },
];

/**
 * Автоматическое определение класса кариозной полости по Блэку
 * на основе анатомического номера зуба (FDI 11–48, 51–85) и выбранных поверхностей.
 */
export function detectBlackClass(
	toothNumber: number,
	surfaces: readonly string[],
): BlackCavityClass {
	const upperSurfaces = surfaces.map((s) => s.trim().toUpperCase());
	const pos = toothNumber % 10;
	const isAnterior = pos >= 1 && pos <= 3;

	// Пришеечные дефекты (V класс)
	if (
		upperSurfaces.length === 1 &&
		(upperSurfaces.includes("C") || upperSurfaces.includes("V"))
	) {
		return "class_V";
	}
	if (upperSurfaces.includes("C")) {
		return "class_V";
	}

	if (isAnterior) {
		// Фронтальная группа: резцы и клыки
		const hasProximal = upperSurfaces.includes("M") || upperSurfaces.includes("D");
		const hasIncisalEdge =
			upperSurfaces.includes("I") ||
			upperSurfaces.includes("O") ||
			upperSurfaces.length >= 3;

		if (hasProximal && hasIncisalEdge) {
			return "class_IV";
		}
		if (hasProximal) {
			return "class_III";
		}
		if (upperSurfaces.includes("I") || upperSurfaces.includes("O")) {
			return "class_VI";
		}
		return "class_I";
	}

	// Жевательная группа: премоляры и моляры
	const hasApproximal = upperSurfaces.includes("M") || upperSurfaces.includes("D");
	if (hasApproximal) {
		return "class_II";
	}
	if (upperSurfaces.includes("O")) {
		return "class_I";
	}
	if (upperSurfaces.includes("VI") || upperSurfaces.includes("CUSP")) {
		return "class_VI";
	}

	return "class_I";
}

/** Параметры расчета гарантийных обязательств СтАР */
export interface RestorationWarrantyParams {
	readonly toothNumber: number;
	readonly surfacesCount: number;
	readonly compositeBrand?: CompositeMaterialBrand | string | undefined;
	readonly isBruxismRisk?: boolean | undefined;
	readonly isPrimary?: boolean | undefined;
}

export interface RestorationWarrantyResult {
	readonly warrantyMonths: number;
	readonly serviceLifeYears: number;
	readonly starComplianceStatus: "standard" | "reduced_risk" | "pediatric_temporary";
	readonly rationaleRu: string;
}

/**
 * Расчет официального гарантийного срока и срока службы реставрации
 * по Положению о гарантийных обязательствах Стоматологической Ассоциации России (СтАР).
 */
export function calculateRestorationWarrantyMonths(
	params: RestorationWarrantyParams,
): RestorationWarrantyResult {
	const isPrimary = params.isPrimary ?? isPrimaryTooth(params.toothNumber);
	const surfaces = Math.max(1, params.surfacesCount);

	if (isPrimary) {
		return {
			warrantyMonths: 12,
			serviceLifeYears: 2,
			starComplianceStatus: "pediatric_temporary",
			rationaleRu: "Временный прикус: гарантия 12 месяцев или до момента физиологической смены зуба (СтАР)",
		};
	}

	if (params.isBruxismRisk) {
		return {
			warrantyMonths: 12,
			serviceLifeYears: 2,
			starComplianceStatus: "reduced_risk",
			rationaleRu: "Повышенная окклюзионная нагрузка / бруксизм: гарантия 12 месяцев при условии ношения защитной ночной каппы",
		};
	}

	if (surfaces >= 3) {
		// Обширная MOD реставрация (>50% коронки)
		return {
			warrantyMonths: 12,
			serviceLifeYears: 3,
			starComplianceStatus: "standard",
			rationaleRu: "Обширная реставрация (3+ поверхности, MOD): гарантия 12 месяцев, срок службы 3 года (рекомендовано покрытие коронкой)",
		};
	}

	if (surfaces === 2) {
		// Апроксимальная реставрация MO/OD (II класс)
		return {
			warrantyMonths: 18,
			serviceLifeYears: 4,
			starComplianceStatus: "standard",
			rationaleRu: "Апроксимальная реставрация (2 поверхности, MO/OD): гарантия 18 месяцев, срок службы 4 года",
		};
	}

	// 1 поверхность (I, V класс)
	return {
		warrantyMonths: 24,
		serviceLifeYears: 5,
		starComplianceStatus: "standard",
		rationaleRu: "Стандартная реставрация твердых тканей (1 поверхность, I/V класс): гарантия 24 месяца, срок службы 5 лет (СтАР)",
	};
}

/** Параметры подбора услуг Номенклатуры 804н */
export interface RestorationServicesParams {
	readonly toothNumber: number;
	readonly surfaces: readonly string[];
	readonly isAestheticFrontal?: boolean | undefined;
	readonly hasOldRestorationRemoval?: boolean | undefined;
	readonly includeFluoridation?: boolean | undefined;
}

/**
 * Подбор регламентных медицинских услуг по Номенклатуре Минздрава РФ (Приказ № 804н)
 * для проведения терапевтической реставрации.
 */
export function resolve804nServicesForRestoration(
	params: RestorationServicesParams,
): readonly Order804nServiceRef[] {
	const services: Order804nServiceRef[] = [];
	const surfacesCount = Math.max(1, params.surfaces.length);
	const pos = params.toothNumber % 10;
	const isAnterior = pos >= 1 && pos <= 3;

	// Снятие старой пломбы при ее наличии (K08.8)
	if (params.hasOldRestorationRemoval) {
		services.push({
			code: "A16.07.031",
			nameRu: "Препарирование твердых тканей зуба / снятие дефектной пломбы",
			isMandatory: true,
		});
	}

	// Основное восстановление пломбой по количеству поверхностей или виниринг
	if (params.isAestheticFrontal && isAnterior) {
		services.push({
			code: "A16.07.002.004",
			nameRu: "Эстетическое восстановление зуба пломбировочными материалами из фотополимеров (прямой виниринг)",
			isMandatory: true,
		});
	} else if (surfacesCount >= 3) {
		services.push({
			code: "A16.07.002.003",
			nameRu: "Восстановление зуба пломбой при разрушении более 1/2 коронки (MOD / III–IV класс)",
			isMandatory: true,
		});
	} else if (surfacesCount === 2) {
		services.push({
			code: "A16.07.002.002",
			nameRu: "Восстановление зуба пломбой II, III класс по Блэку с использованием материалов из фотополимеров",
			isMandatory: true,
		});
	} else {
		services.push({
			code: "A16.07.002.001",
			nameRu: "Восстановление зуба пломбой I, V, VI класс по Блэку с использованием материалов из фотополимеров",
			isMandatory: true,
		});
	}

	// Финишная полировка и пришлифовывание окклюзии
	services.push({
		code: "A16.07.025",
		nameRu: "Избирательное пришлифовывание и полирование твердых тканей зуба",
		isMandatory: true,
	});

	// Глубокое фторирование эмали (опционально)
	if (params.includeFluoridation) {
		services.push({
			code: "A11.07.012",
			nameRu: "Глубокое фторирование эмали зуба",
			isMandatory: false,
		});
	}

	return services;
}

/** Данные клинической реставрации для амбулаторной карты */
export interface ToothRestorationData {
	readonly toothNumber: number;
	readonly surfaces: readonly string[];
	readonly blackClass: BlackCavityClass;
	readonly compositeBrand: CompositeMaterialBrand;
	readonly adhesiveBrand: AdhesiveSystemBrand;
	readonly shadeDentin?: string | undefined;
	readonly shadeEnamel?: string | undefined;
	readonly isAestheticFrontal?: boolean | undefined;
	readonly hasOldRestorationRemoval?: boolean | undefined;
	readonly isolationType: "rubber_dam" | "retraction_cord" | "optra_gate";
	readonly warrantyMonths: number;
	readonly notes?: string | undefined;
}

/**
 * Форматирование деталей реставрации в медицинский текст для Формы 043/у (без эмодзи).
 */
export function formatRestorationProtocolDetails(data: ToothRestorationData): string {
	const comp = COMPOSITE_MATERIALS_CATALOG[data.compositeBrand] || COMPOSITE_MATERIALS_CATALOG.filtek_ultimate;
	const adh = ADHESIVE_SYSTEMS_CATALOG[data.adhesiveBrand] || ADHESIVE_SYSTEMS_CATALOG.optibond_fl;
	const blackDesc = BLACK_CAVITY_CLASS_LABELS[data.blackClass];
	const surfacesStr = data.surfaces.length > 0 ? data.surfaces.join(", ") : "O";

	const shades: string[] = [];
	if (data.shadeDentin) shades.push(`дентин: ${data.shadeDentin}`);
	if (data.shadeEnamel) shades.push(`эмаль: ${data.shadeEnamel}`);
	const shadesStr = shades.length > 0 ? ` [Оттенки: ${shades.join(", ")}]` : "";

	const isolationText =
		data.isolationType === "rubber_dam"
			? "система коффердам (абсолютная изоляция)"
			: data.isolationType === "retraction_cord"
				? "ретракционная нить + коагуляция"
				: "OptraGate + слюноотсос";

	return [
		`• Локализация: Зуб ${data.toothNumber}, поверхности: ${surfacesStr} (${blackDesc}).`,
		`• Изоляция: ${isolationText}.`,
		`• Адгезивный протокол: ${adh.tradeNameRu} (${adh.protocolSummaryRu}).`,
		`• Реставрационный материал: ${comp.tradeNameRu}${shadesStr}.`,
		`• Окклюзионная интеграция: пришлифовка по артикуляционной бумаге Bausch 40 мкм, полировка Enhance + Prisma Gloss до зеркального блеска.`,
		`• Гарантийные обязательства: гарантия ${data.warrantyMonths} мес. в соответствии со стандартами СтАР.`,
	].join("\n");
}
