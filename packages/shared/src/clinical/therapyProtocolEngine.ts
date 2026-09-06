/**
 * DENTE Dental CRM — Chairside Therapeutic Dentistry Protocol Engine (Мандаты 8e, 8i, 8k, 8n)
 *
 * Чистая клиническая бизнес-логика терапевтического приёма у кресла врача:
 * - CRM != процедурный тренажер: протокол оформляется за <= 30 секунд.
 * - 4 канонических 1-клик клинических пресета:
 *     1. Кариес эмали / дентина (K02.0, K02.1 / A16.07.002) — препарирование, коффердам, OptiBond FL / Single Bond 2, послойный Filtek Ultimate / Estelite Asteria, Enhance + Prisma Gloss, Bausch 40 мкм.
 *     2. Замена несостоятельной пломбы (K08.8 / A16.07.002 + A16.07.031) — снятие твердосплавным бором, некрэктомия вторичного кариеса, световой композит, окклюзионная выверка.
 *     3. Клиновидный дефект / эрозия (K03.1, K03.0) — щадящая подготовка, самопротравливающий адгезив (Clearfil SE / OptiBond Universal), текучий SDR Plus / Beautifil Flow, десенситайзинг.
 *     4. Фронтальная эстетическая реставрация (зубы 11–23, 31–43) — силиконовый ключ, нёбная стенка, моделирование мамелонов дентином, вестибулярная эмаль, макро/микрорельеф, финишный сухой блеск.
 * - 1-клик комбинации поверхностей: [MOD], [MO], [OD], [O], [V], [L/P], [B].
 * - Автоматическая генерация записей Формы 043/у (SOAP по Приказу МЗ РФ № 834н) и Номенклатуры услуг № 804н.
 * - Строгое соблюдение Мандата 8d: ноль мультяшных эмодзи в протоколах и документах.
 */

import { isValidFdiToothNumber } from "../emr/emrProtocolEngine.js";
import { isPrimaryTooth } from "../pediatricDentition.js";
import type { Order804nServiceRef } from "../emr/emrProtocolPresets.js";
import {
	type BlackCavityClass,
	type CompositeMaterialBrand,
	type AdhesiveSystemBrand,
	COMPOSITE_MATERIALS_CATALOG,
	ADHESIVE_SYSTEMS_CATALOG,
	detectBlackClass,
	calculateRestorationWarrantyMonths,
	resolve804nServicesForRestoration,
} from "./restorationProtocolEngine.js";

export type TherapyPresetId =
	| "caries_composite"
	| "failed_filling_replacement"
	| "wedge_defect_erosion"
	| "frontal_aesthetic_restoration";

export interface TherapyProtocolPreset {
	readonly id: TherapyPresetId;
	readonly titleRu: string;
	readonly shortLabelRu: string;
	readonly icd10Default: string;
	readonly descriptionRu: string;
	readonly anesthesiaDefaultRu: string;
	readonly isolationDefaultRu: string;
	readonly preparationDefaultRu: string;
	readonly adhesiveDefault: AdhesiveSystemBrand;
	readonly compositeDefault: CompositeMaterialBrand;
	readonly layeringTechniqueRu: string;
	readonly finishingDefaultRu: string;
	readonly recommendationsDefaultRu: string;
	readonly defaultSurfaces: readonly string[];
}

/** 1. Кариес эмали / дентина (K02.0, K02.1) */
export const THERAPY_CARIES_PRESET: TherapyProtocolPreset = {
	id: "caries_composite",
	titleRu: "Кариес эмали / дентина (K02.0, K02.1)",
	shortLabelRu: "Кариес",
	icd10Default: "K02.1",
	descriptionRu: "Препарирование полости, коффердам, OptiBond FL / Single Bond 2, послойный нанокомпозит Filtek Ultimate / Estelite Asteria, полировка Enhance + Prisma Gloss, Bausch 40 мкм.",
	anesthesiaDefaultRu: "Инфильтрационная / мандибулярная анестезия: Артикаин 4% с эпинефрином 1:100000 (1.7 мл). Анестезия наступила через 3 минуты.",
	isolationDefaultRu: "Абсолютная изоляция операционного поля системой коффердам (платок Sanctuary, кламп Sanctuary / Brinker B4 / W8A).",
	preparationDefaultRu: "Препарирование кариозной полости твердосплавными и алмазными борами под постоянным водно-воздушным охлаждением. Тщательная некрэктомия до плотного дентина, создание эмалевого скоса 45°.",
	adhesiveDefault: "optibond_fl",
	compositeDefault: "filtek_ultimate",
	layeringTechniqueRu: "Тотальное травление эмали (15 сек) и дентина (10 сек) 37% H3PO4. Адгезив OptiBond FL / Single Bond 2, полимеризация 20 сек. Послойное внесение нанокомпозита Filtek Ultimate / Estelite Asteria с анатомическим моделированием бугров и фиссур.",
	finishingDefaultRu: "Шлифовка мелкозернистыми борами и дисками Sof-Lex, полировка головками Enhance с алмазной пастой Prisma Gloss. Окклюзионная выверка артикуляционной бумагой Bausch 40 мкм.",
	recommendationsDefaultRu: "Не принимать пищу 1.5-2 часа до отхождения анестезии. Избегать красящих продуктов 24 часа. Контрольный осмотр через 6 месяцев.",
	defaultSurfaces: ["O"],
};

/** 2. Замена несостоятельной пломбы (K08.8) */
export const THERAPY_FAILED_FILLING_PRESET: TherapyProtocolPreset = {
	id: "failed_filling_replacement",
	titleRu: "Замена несостоятельной пломбы / реставрации (K08.8)",
	shortLabelRu: "Замена пломбы",
	icd10Default: "K08.8",
	descriptionRu: "Снятие старой дефектной пломбы твердосплавным бором, некрэктомия вторичного кариеса, коффердам, адгезивный протокол, реставрация фотополимером, окклюзионная коррекция Bausch 40 мкм.",
	anesthesiaDefaultRu: "Инфильтрационная / проводниковая анестезия: Артикаин 4% с эпинефрином 1:100000 (1.7 мл). Полное обезболивание через 3-4 минуты.",
	isolationDefaultRu: "Изоляция операционного поля коффердамом (латексный платок Sanctuary + кламп Brinker B4).",
	preparationDefaultRu: "Аккуратное препарирование и снятие старой дефектной пломбы твердосплавным бором с обильным водяным охлаждением. Иссечение пигментированного деминерализованного дентина (вторичный кариес) шаровидным бором на малых оборотах.",
	adhesiveDefault: "optibond_fl",
	compositeDefault: "harmonize",
	layeringTechniqueRu: "Протравливание 37% фосфорной кислотой. Нанесение наполненного адгезива OptiBond FL. Лайнерный слой SDR Plus Flowable 1-1.5 мм для снятия напряжения + послойное анатомическое восстановление наногибридом Harmonize / Filtek Ultimate.",
	finishingDefaultRu: "Коррекция суперконтактов артикуляционной бумагой Bausch 40 мкм (статика и динамика). Полировка Enhance + Prisma Gloss до зеркального сухого блеска.",
	recommendationsDefaultRu: "Щадящий режим питания в течение суток, соблюдение индивидуальной гигиены. Профосмотр через 6 месяцев.",
	defaultSurfaces: ["M", "O"],
};

/** 3. Клиновидный дефект / эрозия (K03.1, K03.0) */
export const THERAPY_WEDGE_EROSION_PRESET: TherapyProtocolPreset = {
	id: "wedge_defect_erosion",
	titleRu: "Клиновидный дефект / эрозия эмали (K03.1, K03.0)",
	shortLabelRu: "Клин. дефект",
	icd10Default: "K03.1",
	descriptionRu: "Щадящая микроабразия дефекта, самопротравливающий адгезив (Clearfil SE / OptiBond Universal), адаптивный текучий SDR Plus / Beautifil Flow, нанокомпозит Estelite Asteria, десенситайзинг.",
	anesthesiaDefaultRu: "Инфильтрационная анестезия Артикаин 1:100000 (1.0 мл) / аппликационный десенситайзинг.",
	isolationDefaultRu: "Десневая ретракция нитью Ultrapack #000 с гемостатиком ViscoStat Clear / пришеечный кламп Sanctuary B4. Абсолютный гемостаз.",
	preparationDefaultRu: "Минимально инвазивная микроабразия стенок дефекта мелкозернистым алмазным бором для создания микрошероховатости без удаления интактного дентина.",
	adhesiveDefault: "clearfil_se_bond",
	compositeDefault: "sdr_plus_flow",
	layeringTechniqueRu: "Самопротравливающий 2-шаговый адгезив Clearfil SE Bond (праймер 20 сек без смывания + бонд). Внесение адаптивного эластичного композита SDR Plus Flowable / Beautifil Flow Plus (компенсация изгибающих окклюзионных нагрузок) + перекрытие микрогибридом Estelite Asteria.",
	finishingDefaultRu: "Тонкое финирование силиконовыми головками Enhance и полировка пастой Prisma Gloss. Глубокое фторирование эмали препаратом Clinpro White Varnish.",
	recommendationsDefaultRu: "Использование мягкой зубной щетки (Soft/Ultra Soft), паст без абразива (Sensodyne / Biorepair). Исключение жестких горизонтальных движений щеткой.",
	defaultSurfaces: ["V"],
};

/** 4. Фронтальная эстетическая реставрация (зубы 11–23, 31–43) */
export const THERAPY_FRONTAL_AESTHETIC_PRESET: TherapyProtocolPreset = {
	id: "frontal_aesthetic_restoration",
	titleRu: "Фронтальная эстетическая реставрация (11–23, 31–43)",
	shortLabelRu: "Эстетика / Виниринг",
	icd10Default: "K02.1",
	descriptionRu: "Силиконовый индекс (ключ), нёбная стенка (эмаль), стратификация дентина с моделированием мамелонов, прозрачный край (incisal), вестибулярная эмаль, воспроизведение макро/микротекстуры, сухой финишный блеск.",
	anesthesiaDefaultRu: "Инфильтрационная анестезия Артикаин 1:100000 1.0 мл по переходной складке.",
	isolationDefaultRu: "Коффердам с индивидуальной кламповой фиксацией и инверсией платка флоссом в зубодесневую борозду.",
	preparationDefaultRu: "Щадящее препарирование с формированием пологого волнистого эмалевого фальца (2 мм) на вестибулярной поверхности для создания оптически невидимой границы композит-зуб.",
	adhesiveDefault: "optibond_fl",
	compositeDefault: "estelite_asteria",
	layeringTechniqueRu: "Послойная анатомическая стратификация по силиконовому индексу: нёбная эмалевая стенка, моделирование зубцов мамелонов опаковым дентином, нанесение полупрозрачного режущего края, перекрытие вестибулярной микроматричной эмалью Estelite Asteria.",
	finishingDefaultRu: "Создание макро- и микрорельефа (вертикальные валики, горизонтальные перикиматы) мелкозернистым бором. Полировка дисками Sof-Lex, чашечками Enhance, щеткой с пастой Prisma Gloss до живого сухого блеска.",
	recommendationsDefaultRu: "«Белая диета» в течение 48 часов (исключить чай, кофе, ягоды, соевый соус). Контрольная полировка через 1-2 недели.",
	defaultSurfaces: ["M", "I", "D"],
};

export const THERAPY_PROTOCOL_PRESETS: readonly TherapyProtocolPreset[] = [
	THERAPY_CARIES_PRESET,
	THERAPY_FAILED_FILLING_PRESET,
	THERAPY_WEDGE_EROSION_PRESET,
	THERAPY_FRONTAL_AESTHETIC_PRESET,
];

/** Входные параметры для формирования 1-клик терапевтического протокола */
export interface TherapyProtocolApplyParams {
	readonly toothNumber: number;
	readonly surfaces: readonly string[];
	readonly presetId?: TherapyPresetId | undefined;
	readonly compositeBrand?: CompositeMaterialBrand | undefined;
	readonly adhesiveBrand?: AdhesiveSystemBrand | undefined;
	readonly shadeDentin?: string | undefined;
	readonly shadeEnamel?: string | undefined;
	readonly isBruxismRisk?: boolean | undefined;
	readonly includeFluoridation?: boolean | undefined;
}

/** Сформированный структурированный результат SOAP для Формы 043/у */
export interface TherapySoapResult {
	readonly toothNumber: number;
	readonly toothTitleRu: string;
	readonly diagnosisIcd10: string;
	readonly diagnosisTitleRu: string;
	readonly subjectiveComplaints: string;
	readonly anamnesisMorbi: string;
	readonly statusLocalis: string;
	readonly treatmentDescription: string;
	readonly recommendations: string;
	readonly warrantyMonths: number;
	readonly warrantyRationaleRu: string;
	readonly blackClass: BlackCavityClass;
	readonly services804n: readonly Order804nServiceRef[];
	readonly fullProtocolText043: string;
}

/**
 * Получение пресета по идентификатору с отказоустойчивым дефолтом
 */
export function getTherapyPresetById(id?: string): TherapyProtocolPreset {
	const found = THERAPY_PROTOCOL_PRESETS.find((p) => p.id === id);
	return found || THERAPY_CARIES_PRESET;
}

/**
 * 1-Клик генератор полного клинического протокола терапии (SOAP 043/у + Номенклатура 804н).
 * Гарантирует абсолютную чистоту текста (ноль эмодзи) и соответствие стандартам СтАР.
 */
export function generateTherapySoap043(params: TherapyProtocolApplyParams): TherapySoapResult {
	const { toothNumber } = params;
	const preset = getTherapyPresetById(params.presetId);
	const surfaces = params.surfaces.length > 0 ? params.surfaces : preset.defaultSurfaces;
	const composite = params.compositeBrand || preset.compositeDefault;
	const adhesive = params.adhesiveBrand || preset.adhesiveDefault;
	const blackClass = detectBlackClass(toothNumber, surfaces);
	const pos = toothNumber % 10;
	const isAnterior = pos >= 1 && pos <= 3;
	const isAesthetic = preset.id === "frontal_aesthetic_restoration" || (isAnterior && surfaces.length >= 2);
	const hasOldRemoval = preset.id === "failed_filling_replacement";

	const toothTitleRu = `Зуб ${toothNumber}`;
	const surfacesStr = surfaces.join(", ");

	// Определение гарантии СтАР
	const warranty = calculateRestorationWarrantyMonths({
		toothNumber,
		surfacesCount: surfaces.length,
		compositeBrand: composite,
		isBruxismRisk: params.isBruxismRisk,
		isPrimary: isPrimaryTooth(toothNumber),
	});

	// Подбор услуг по Номенклатуре 804н
	const services804n = resolve804nServicesForRestoration({
		toothNumber,
		surfaces,
		isAestheticFrontal: isAesthetic,
		hasOldRestorationRemoval: hasOldRemoval,
		includeFluoridation: params.includeFluoridation ?? (preset.id === "wedge_defect_erosion"),
	});

	// Формирование разделов медицинской карты Формы 043/у (SOAP)
	let subjectiveComplaints = "";
	let anamnesisMorbi = "";
	let statusLocalis = "";

	switch (preset.id) {
		case "failed_filling_replacement":
			subjectiveComplaints = `Жалобы на нарушение краевого прилегания и скол старой пломбы в ${toothTitleRu}, застревание волокнистой пищи, кратковременный дискомфорт при приеме сладкой пищи.`;
			anamnesisMorbi = `Пломба была установлена более 4 лет назад. Скол пломбы и выпадение части материала заметил около 2 месяцев назад.`;
			statusLocalis = `При осмотре: в ${toothTitleRu} на поверхностях ${surfacesStr} определяется композитная реставрация с нарушением краевого прилегания, пигментацией границ и признаками вторичного кариеса. Зонд застревает по краю пломбы. Перкуссия безболезненная, термопроба кратковременная, ЭОД = 4-6 мкА.`;
			break;
		case "wedge_defect_erosion":
			subjectiveComplaints = `Жалобы на наличие дефекта твердых тканей у десны в ${toothTitleRu}, чувствительность от холодного, кислого и при чистке зубов.`;
			anamnesisMorbi = `Дефект существует более 1 года, чувствительность усилилась в последние 2 месяца. В анамнезе использование жесткой зубной щетки.`;
			statusLocalis = `При осмотре: в пришеечной области ${toothTitleRu} (поверхность ${surfacesStr}) определяется V-образный клиновидный дефект эмали и дентина с гладкими плотными стенками. Зондирование слабо чувствительно. Перкуссия отрицательная.`;
			break;
		case "frontal_aesthetic_restoration":
			subjectiveComplaints = `Жалобы на эстетический дефект фронтального зуба ${toothNumber} (дефект режущего края, изменение цвета, кариозная полость), неудовлетворительную форму зуба при улыбке.`;
			anamnesisMorbi = `Пациент отмечает прогрессирование эстетического дефекта в течение полугода. Ранее проводилось локальное пломбирование.`;
			statusLocalis = `При осмотре: в ${toothTitleRu} определяется дефект коронковой части на поверхностях ${surfacesStr} с вовлечением режущего края. Зондирование слабо чувствительно по эмалево-дентинной границе. Перкуссия безболезненная.`;
			break;
		case "caries_composite":
		default:
			subjectiveComplaints = `Жалобы на наличие кариозной полости в ${toothTitleRu}, застревание пищи, кратковременные боли от холодного и сладкого, быстро проходящие после устранения раздражителя.`;
			anamnesisMorbi = `Полость обнаружена пациентом около 2 месяцев назад. Ранее зуб не лечился.`;
			statusLocalis = `При осмотре: в ${toothTitleRu} на поверхностях ${surfacesStr} определяется кариозная полость в пределах дентина (${blackClass}), выполненная размягченным пигментированным дентином. Зондирование слабо болезненно по эмалево-дентинной границе. Перкуссия безболезненная. Термопроба кратковременная. ЭОД = 4-5 мкА.`;
			break;
	}

	const compInfo = COMPOSITE_MATERIALS_CATALOG[composite] || COMPOSITE_MATERIALS_CATALOG.filtek_ultimate;
	const adhInfo = ADHESIVE_SYSTEMS_CATALOG[adhesive] || ADHESIVE_SYSTEMS_CATALOG.optibond_fl;

	const shadesArr: string[] = [];
	if (params.shadeDentin) shadesArr.push(`дентин: ${params.shadeDentin}`);
	if (params.shadeEnamel) shadesArr.push(`эмаль: ${params.shadeEnamel}`);
	const shadesStr = shadesArr.length > 0 ? ` [Оттенки: ${shadesArr.join(", ")}]` : "";

	const treatmentDescription = [
		`ПРОТОКОЛ ТЕРАПЕВТИЧЕСКОГО ЛЕЧЕНИЯ (${toothTitleRu}, поверхности: ${surfacesStr}):`,
		`1. Анестезия: ${preset.anesthesiaDefaultRu}`,
		`2. Изоляция: ${preset.isolationDefaultRu}`,
		`3. Препарирование: ${preset.preparationDefaultRu}`,
		`4. Адгезивный протокол: ${adhInfo.tradeNameRu} (${adhInfo.protocolSummaryRu}).`,
		`5. Пломбирование и реставрация: ${compInfo.tradeNameRu}${shadesStr}. ${preset.layeringTechniqueRu}`,
		`6. Окклюзионная интеграция и полировка: ${preset.finishingDefaultRu}`,
		`7. Гарантийные обязательства: ${warranty.rationaleRu} (гарантия ${warranty.warrantyMonths} мес., срок службы ${warranty.serviceLifeYears} лет).`,
	].join("\n");

	const fullProtocolText043 = [
		`ДНЕВНИК ПРИЕМА (ФОРМА 043/у) — ${toothTitleRu}:`,
		`Диагноз (МКБ-10): ${preset.icd10Default} — ${preset.titleRu}`,
		`Жалобы: ${subjectiveComplaints}`,
		`Анамнез: ${anamnesisMorbi}`,
		`Status localis: ${statusLocalis}`,
		"",
		treatmentDescription,
		"",
		`Рекомендации: ${preset.recommendationsDefaultRu}`,
	].join("\n");

	return {
		toothNumber,
		toothTitleRu,
		diagnosisIcd10: preset.icd10Default,
		diagnosisTitleRu: preset.titleRu,
		subjectiveComplaints,
		anamnesisMorbi,
		statusLocalis,
		treatmentDescription,
		recommendations: preset.recommendationsDefaultRu,
		warrantyMonths: warranty.warrantyMonths,
		warrantyRationaleRu: warranty.rationaleRu,
		blackClass,
		services804n,
		fullProtocolText043,
	};
}

/**
 * 1-Клик генерация консолидированного текста для Формы 043/у
 */
export function generateTherapyProtocolText043(params: TherapyProtocolApplyParams): string {
	return generateTherapySoap043(params).fullProtocolText043;
}
