/**
 * DENTE Dental CRM — Endodontic 804n Billing & Warehouse Materials SSOT (Layer 2)
 * @dental/shared/clinical/endo/endoBillingAndMaterials.ts
 *
 * Инварианты домена эндодонтии (Мандаты 8b, 8e, 8k, 8n):
 * 1. Честная связность: Эндодонтия -> Смета 804н -> Списание материалов со склада клиники.
 * 2. Копеечная точность (54-ФЗ, Мандат 8b): расчет услуг и складской себестоимости в целых копейках.
 * 3. Точный анатомический множитель на каналы:
 *    - Услуги мехобработки (A16.07.030) и обтурации (A16.07.008) калибруются под число каналов (1..4).
 *    - Расходные материалы (гуттаперча, силер, файлы, гипохлорит, ЭДТА, Ca(OH)2) честно списываются с множителем на каналы.
 * 4. Защита от деления на 0 при вычислении рабочей длины (safeCanalWorkingLengthRatio).
 * 5. Врачебная автономия (Мандат 8e): отсутствие снимков RVG никогда не блокирует закрытие этапа или сохранение протокола.
 */

import {
	getEndodonticOrder804nPair,
	ORDER_804N_ANESTHESIA_CATALOG,
	ORDER_804N_COFFERDAM_ISOLATION,
	ORDER_804N_DIAGNOSTICS_CATALOG,
	ORDER_804N_INSTRUMENTATION,
	ORDER_804N_MEDICATION_CAOH2,
	ORDER_804N_OBTURATIONS,
	ORDER_804N_ORTHO_CATALOG,
	ORDER_804N_PERIO_CATALOG,
	ORDER_804N_SURGERY_CATALOG,
	ORDER_804N_THERAPY_CATALOG,
	ORDER_804N_UNSEALING,
} from "../toothCanalsBilling/billing804nMatcher.js";
import {
	formatKopecksRu,
	kopecksToRubles,
	multiplyKopecks,
	parseKopecks,
	rublesToKopecks,
	sumKopecks,
	type Kopecks,
} from "../../money.js";
import {
	getAnatomicalRootCanalCount,
	isMultiRootedTooth,
} from "../toothCanalsBilling/toothCanalAnatomyMap.js";
import type {
	AnatomicalCanalCount,
	ClinicalCase804nOptions,
	EndodonticFullTreatmentPlanItem,
	EndoTreatmentPriceCalculationResult,
	EndoTreatmentPriceOptions,
	Order804nBillingEstimateResult,
	Order804nBillingLineItem,
} from "../toothCanalsBilling/types.js";
import type {
	Endo804nServiceEstimate,
	EndoBillingCostBreakdown,
	EndoCanalData,
	EndoMaterialConsumableEstimate,
	EndoProtocolPresetId,
	EndoStageStamp,
	EndoTreatmentBillingEstimateResult,
} from "./types.js";

export interface EndoTreatmentBillingOptions {
	readonly toothNumber: number;
	readonly canals?: readonly EndoCanalData[] | undefined;
	readonly stageStamp?: EndoStageStamp | undefined;
	readonly obturationTechnique?: string | undefined;
	readonly sealer?: string | undefined;
	readonly isRetreatment?: boolean | undefined;
	readonly includeDiagnosisRvg?: boolean | undefined;
}

/**
 * Калькулятор сметных услуг по Номенклатуре 804н и автоматического списания
 * расходных материалов со склада клиники для эндодонтического протокола.
 */
export function calculateEndoBillingAndMaterialsEstimate(
	options: EndoTreatmentBillingOptions,
): EndoTreatmentBillingEstimateResult {
	const toothNumber = Number(options.toothNumber) || 11;
	const canals = options.canals && options.canals.length > 0 ? options.canals : [];

	// Число анатомических каналов (1..4)
	const rawCount = canals.length > 0 ? canals.length : getAnatomicalRootCanalCount(toothNumber);
	const canalCount = Math.max(1, Math.min(4, Math.round(rawCount))) as 1 | 2 | 3 | 4;

	// Этап лечения (Мандат 8e)
	const stage: EndoStageStamp = options.stageStamp || "COMPLETED";

	// Техника и силер
	const obturationTechnique = options.obturationTechnique || (canals[0]?.obturationTechnique ?? "Гуттаперча + Силер (AH Plus)");
	const sealer = options.sealer || (canals[0]?.sealer ?? "AH Plus");
	const isRetreatment = Boolean(
		options.isRetreatment ||
			obturationTechnique.toLowerCase().includes("распломбиров") ||
			canals.some((c) => c.notes?.toLowerCase().includes("перелечивание") || c.notes?.toLowerCase().includes("ретритмент")),
	);

	const services804n: Endo804nServiceEstimate[] = [];

	// 1. При перелечивании — распломбирование корневых каналов (A16.07.082)
	if (isRetreatment) {
		const unsealPriceRub = ORDER_804N_UNSEALING.price;
		const unsealPriceKopecks = BigInt(Math.round(rublesToKopecks(unsealPriceRub)));
		services804n.push({
			serviceCode: ORDER_804N_UNSEALING.code,
			code804n: ORDER_804N_UNSEALING.code,
			title: `${ORDER_804N_UNSEALING.title} (${canalCount} ${getCanalPluralRu(canalCount)})`,
			category: "Эндодонтия",
			priceRub: unsealPriceRub,
			priceKopecks: unsealPriceKopecks,
			quantity: canalCount,
			totalPriceRub: unsealPriceRub * canalCount,
			totalPriceKopecks: unsealPriceKopecks * BigInt(canalCount),
			toothNumber,
			canalCount,
			isMandatory: true,
		});
	}

	// 2. Механическая и медикаментозная обработка корневых каналов (A16.07.030)
	const instItem = ORDER_804N_INSTRUMENTATION[canalCount];
	const instPriceKopecks = BigInt(Math.round(rublesToKopecks(instItem.price)));
	services804n.push({
		serviceCode: instItem.code,
		code804n: instItem.code,
		title: instItem.title,
		category: "Эндодонтия",
		priceRub: instItem.price,
		priceKopecks: instPriceKopecks,
		quantity: 1, // Каталожная позиция уже рассчитана на canalCount
		totalPriceRub: instItem.price,
		totalPriceKopecks: instPriceKopecks,
		toothNumber,
		canalCount,
		isMandatory: true,
	});

	// 3. Обтурация (постоянная или временная Ca(OH)2)
	if (stage === "TEMP_CAOH2") {
		const medPriceRub = ORDER_804N_MEDICATION_CAOH2.price;
		const medPriceKopecks = BigInt(Math.round(rublesToKopecks(medPriceRub)));
		services804n.push({
			serviceCode: ORDER_804N_MEDICATION_CAOH2.code,
			code804n: ORDER_804N_MEDICATION_CAOH2.code,
			title: `${ORDER_804N_MEDICATION_CAOH2.title} (${canalCount} ${getCanalPluralRu(canalCount)})`,
			category: "Эндодонтия",
			priceRub: medPriceRub,
			priceKopecks: medPriceKopecks,
			quantity: canalCount,
			totalPriceRub: medPriceRub * canalCount,
			totalPriceKopecks: medPriceKopecks * BigInt(canalCount),
			toothNumber,
			canalCount,
			isMandatory: true,
		});
	} else if (stage === "COMPLETED") {
		const obtItem = ORDER_804N_OBTURATIONS[canalCount];
		const obtPriceKopecks = BigInt(Math.round(rublesToKopecks(obtItem.price)));
		services804n.push({
			serviceCode: obtItem.code,
			code804n: obtItem.code,
			title: obtItem.title,
			category: "Эндодонтия",
			priceRub: obtItem.price,
			priceKopecks: obtPriceKopecks,
			quantity: 1, // Каталожная позиция уже рассчитана на canalCount
			totalPriceRub: obtItem.price,
			totalPriceKopecks: obtPriceKopecks,
			toothNumber,
			canalCount,
			isMandatory: true,
		});
	}

	// ─── РАСХОДНЫЕ МАТЕРИАЛЫ СКЛАДА (ЧЕСТНОЕ СПИСАНИЕ) ─────────────────────────
	const materials: EndoMaterialConsumableEstimate[] = [];

	// 1. Машинный NiTi файл ProTaper / WaveOne (ресурс инструмента: 1 файл = 4 канала, мягкое списание Мандат 8aa)
	const nitiFraction = Math.round((canalCount / 4) * 100) / 100;
	const nitiCostKopecks = BigInt(Math.round(rublesToKopecks(650) * nitiFraction));
	const nitiRub = kopecksToRubles(nitiCostKopecks);
	materials.push({
		itemId: "mat-niti-rotary-file",
		itemName: "NiTi ротационный машинный файл (ProTaper / WaveOne)",
		category: "rotary_file",
		unit: "шт",
		quantity: nitiFraction,
		costPriceRub: nitiRub,
		costPriceKopecks: nitiCostKopecks,
		notes: `Инструментальная обработка ${canalCount} ${getCanalPluralRu(canalCount)} зуба #${toothNumber} (ресурс инструмента: ${canalCount}/4)`,
	});

	// 2. Гипохлорит натрия 3% (5 мл на канал)
	const hypoMl = 5 * canalCount;
	const hypoCostKopecks = BigInt(rublesToKopecks(24) * hypoMl);
	const hypoRub = kopecksToRubles(hypoCostKopecks);
	materials.push({
		itemId: "mat-hypochlorite-3",
		itemName: "Гипохлорит натрия 3% стабилизированный (шприц с эндо-иглой)",
		category: "disinfectant",
		unit: "ml",
		quantity: hypoMl,
		costPriceRub: hypoRub, // 24 ₽ за мл (120 ₽ за 5 мл)
		costPriceKopecks: hypoCostKopecks,
		notes: `Ирригация ${canalCount} ${getCanalPluralRu(canalCount)}`,
	});

	// 3. Раствор ЭДТА 17% (2 мл на канал)
	const edtaMl = 2 * canalCount;
	const edtaCostKopecks = BigInt(Math.round(rublesToKopecks(42.5) * edtaMl));
	const edtaRub = kopecksToRubles(edtaCostKopecks);
	materials.push({
		itemId: "mat-endo-edta-17",
		itemName: "Раствор ЭДТА 17% для удаления смазанного слоя (ЭндоЖи №2)",
		category: "disinfectant",
		unit: "ml",
		quantity: edtaMl,
		costPriceRub: edtaRub, // 85 ₽ за 2 мл
		costPriceKopecks: edtaCostKopecks,
		notes: `Хемомеханическая обработка ${canalCount} ${getCanalPluralRu(canalCount)}`,
	});

	// 4. Материалы обтурации в зависимости от этапа
	if (stage === "COMPLETED") {
		// Гуттаперчевые конусные штифты (3 шт на каждый канал)
		const guttaQty = 3 * canalCount;
		const guttaCostKopecks = BigInt(rublesToKopecks(15) * guttaQty);
		const guttaRub = kopecksToRubles(guttaCostKopecks);
		materials.push({
			itemId: "mat-gutta-percha",
			itemName: "Гуттаперчевые конусные штифты (0.04 / 0.06)",
			category: "gutta_percha",
			unit: "шт",
			quantity: guttaQty,
			costPriceRub: guttaRub, // 45 ₽ за 3 шт
			costPriceKopecks: guttaCostKopecks,
			notes: `Трехмерная обтурация ${canalCount} ${getCanalPluralRu(canalCount)}`,
		});

		// Бумажные штифты/пины абсорбирующие для высушивания (4 шт на каждый канал)
		const paperPointsQty = 4 * canalCount;
		const paperCostKopecks = BigInt(rublesToKopecks(8) * paperPointsQty);
		const paperRub = kopecksToRubles(paperCostKopecks);
		materials.push({
			itemId: "mat-paper-points",
			itemName: "Бумажные штифты/пины абсорбирующие (Paper Points)",
			category: "paper_points",
			unit: "шт",
			quantity: paperPointsQty,
			costPriceRub: paperRub,
			costPriceKopecks: paperCostKopecks,
			notes: `Высушивание ${canalCount} ${getCanalPluralRu(canalCount)} перед обтурацией`,
		});

		// Силер (AH Plus или BioRoot RCS)
		const isBioceramic =
			sealer.toLowerCase().includes("bioroot") ||
			sealer.toLowerCase().includes("биокерамик") ||
			obturationTechnique.toLowerCase().includes("биокерамик");

		if (isBioceramic) {
			materials.push({
				itemId: "mat-endo-sealer-bioroot",
				itemName: "Биокерамический силер BioRoot RCS (Septodont)",
				category: "sealer",
				unit: "доза",
				quantity: 1,
				costPriceRub: 850,
				costPriceKopecks: 85000n,
				notes: "Биокерамическая обтурация каналов",
			});
		} else {
			materials.push({
				itemId: "mat-endo-sealer-ahplus",
				itemName: "Эпоксидный силер для постоянной обтурации (AH Plus)",
				category: "sealer",
				unit: "доза",
				quantity: 1,
				costPriceRub: 420,
				costPriceKopecks: 42000n,
				notes: "Постоянная обтурация каналов",
			});
		}
	} else if (stage === "TEMP_CAOH2") {
		// Гидроксид кальция (Calasept / Metapex) — 1 доза на каждый канал
		const calciumCostKopecks = BigInt(rublesToKopecks(180) * canalCount);
		const calciumRub = kopecksToRubles(calciumCostKopecks);
		materials.push({
			itemId: "mat-calcium-calasept",
			itemName: "Гидроксид кальция паста рентгеноконтрастная Calasept / Metapex",
			category: "calcium",
			unit: "доза",
			quantity: canalCount,
			costPriceRub: calciumRub,
			costPriceKopecks: calciumCostKopecks,
			notes: `Временная дезинфекция ${canalCount} ${getCanalPluralRu(canalCount)}`,
		});

		// Герметичная временная повязка (Дентин-паста / Септопак)
		materials.push({
			itemId: "mat-dentin-paste",
			itemName: "Временная герметичная повязка (Дентин-паста / Септопак)",
			category: "bandage",
			unit: "доза",
			quantity: 1,
			costPriceRub: 50,
			costPriceKopecks: 5000n,
			notes: "Герметизация полости зуба на 7–14 дней",
		});
	}

	// Итоговые суммы
	const totalServicesPriceKopecks = services804n.reduce(
		(sum, s) => sum + BigInt(s.totalPriceKopecks),
		0n,
	);
	const totalServicesPriceRub = kopecksToRubles(totalServicesPriceKopecks);

	const totalMaterialsCostKopecks = materials.reduce(
		(sum, m) => sum + BigInt(m.costPriceKopecks),
		0n,
	);
	const totalMaterialsCostRub = kopecksToRubles(totalMaterialsCostKopecks);

	return {
		toothNumber,
		canalCount,
		stage,
		obturationTechnique,
		sealer,
		isRetreatment,
		services804n,
		services: services804n,
		materials,
		totalServicesPriceRub,
		totalServicesPriceKopecks,
		totalMaterialsCostRub,
		totalMaterialsCostKopecks,
	};
}

/** Базовый тариф радиовизиографического контроля в копейках (600 руб.) */
export const DEFAULT_ENDO_RVG_PRICE_KOPECKS = 60_000n;
/** Базовый тариф использования операционного микроскопа в копейках (3000 руб.) */
export const DEFAULT_ENDO_MICROSCOPE_PRICE_KOPECKS = 300_000n;

/**
 * Канонический калькулятор стоимости эндодонтического лечения (Layer 2 SSOT).
 * Рассчитывает общую сумму и детальную спецификацию услуг в копейках (bigint).
 */
export function calculateEndoTreatmentCostKopecks(params: {
	toothNumber: number;
	canalsCount: number;
	protocolId: EndoProtocolPresetId | string;
	withRvg?: boolean | undefined;
	withMicroscope?: boolean | undefined;
}): EndoBillingCostBreakdown {
	const count = Math.max(1, params.canalsCount);
	const isRetreatment =
		params.protocolId === "retreatment_unsealing" ||
		params.protocolId === "retreatment_endo";
	const isTemp =
		params.protocolId === "periodontitis_temp" ||
		params.protocolId === "caoh2" ||
		isRetreatment;

	const estimate = calculateEndoBillingAndMaterialsEstimate({
		toothNumber: params.toothNumber,
		stageStamp: isTemp ? "TEMP_CAOH2" : "COMPLETED",
		isRetreatment,
		canals: Array.from({ length: count }, (_, i) => ({
			id: `canal-${params.toothNumber}-c${i + 1}`,
			canalName: `К${i + 1}`,
			referencePoint: "Бугор",
			workingLengthMm: 21.0,
			masterApicalFile: "#25",
			taper: ".04",
			obturationTechnique: isTemp
				? "Временная обтурация Ca(OH)2"
				: "Гуттаперча + Силер (AH Plus)",
			sealer: isTemp ? "Каласепт (Ca(OH)2)" : "AH Plus",
		})),
	});

	const services: Array<{
		readonly code: string;
		readonly title: string;
		readonly priceKopecks: bigint;
		readonly quantity: number;
	}> = [];

	for (const s of estimate.services804n) {
		services.push({
			code: s.code804n || "A16.07.030",
			title: s.title,
			priceKopecks: BigInt(s.totalPriceKopecks),
			quantity: s.quantity,
		});
	}

	if (params.withRvg !== false) {
		services.push({
			code: "A06.07.003",
			title: "Прицельная радиовизиография контрольная (1 снимок)",
			priceKopecks: DEFAULT_ENDO_RVG_PRICE_KOPECKS,
			quantity: 1,
		});
	}

	if (params.withMicroscope) {
		services.push({
			code: "A16.07.030.005",
			title: "Использование операционного микроскопа в эндодонтии",
			priceKopecks: DEFAULT_ENDO_MICROSCOPE_PRICE_KOPECKS,
			quantity: 1,
		});
	}

	const totalKopecks = services.reduce((acc, s) => acc + s.priceKopecks, 0n);
	return {
		totalKopecks,
		totalRubles: kopecksToRubles(totalKopecks),
		services,
	};
}

/**
 * Безопасное вычисление соотношения и процента прохождения рабочей длины.
 * 100% защита от деления на 0, NaN и Infinity (Мандат 8b).
 */
export function safeCanalWorkingLengthRatio(
	measuredMm: number | string | undefined | null,
	referenceMm: number | string | undefined | null,
): { ratio: number; percent: number; isMeasured: boolean } {
	const measured =
		typeof measuredMm === "number"
			? measuredMm
			: Number.parseFloat(String(measuredMm || ""));
	const reference =
		typeof referenceMm === "number"
			? referenceMm
			: Number.parseFloat(String(referenceMm || ""));

	if (!Number.isFinite(measured) || measured <= 0) {
		return { ratio: 0, percent: 0, isMeasured: false };
	}

	// Защита от деления на 0: если реперная длина <= 0 или NaN, используем физиологическую норму 21.0 мм
	const safeRef = Number.isFinite(reference) && reference > 0 ? reference : 21.0;
	const ratio = measured / safeRef;
	const percent = Math.min(200, Math.max(0, Math.round(ratio * 100)));

	return {
		ratio: Math.round(ratio * 1000) / 1000,
		percent,
		isMeasured: true,
	};
}

/**
 * Мандат 8e (Врачебная автономия):
 * Отсутствие радиовизиографического снимка RVG НИКОГДА не должно блокировать
 * сохранение протокола или переход к следующему клиническому этапу.
 */
export function isRvgBlockingEndoStage(
	_stage: EndoStageStamp,
	_hasRvgImage: boolean,
): boolean {
	return false;
}

function getCanalPluralRu(count: number): string {
	if (count === 1) return "канал";
	if (count >= 2 && count <= 4) return "канала";
	return "каналов";
}

/**
 * Calculates complete endodontic composite treatment pricing (instrumentation + obturation + optional Ca(OH)2 medication)
 * for a specific tooth, accurately handling multi-rooted molars (16, 17, 26, 27, 36, 37, 46, 47) and premolars.
 */
export function calculateEndodonticCompositeTreatment(
	fdiNumber: number,
	options?: {
		state?: "Pulpitis" | "Periodontitis" | string;
		clinicalCanalCount?: number;
		includeMedication?: boolean;
	},
): EndodonticFullTreatmentPlanItem {
	const count = (
		options?.clinicalCanalCount !== undefined &&
		options.clinicalCanalCount >= 1 &&
		options.clinicalCanalCount <= 4
			? Math.round(options.clinicalCanalCount)
			: getAnatomicalRootCanalCount(fdiNumber)
	) as AnatomicalCanalCount;

	const pair = getEndodonticOrder804nPair(count);
	const isPeriodontitis = options?.state === "Periodontitis";
	const includeMed = options?.includeMedication ?? isPeriodontitis;
	const medication = includeMed ? ORDER_804N_MEDICATION_CAOH2 : undefined;
	const totalCompositePrice = pair.combinedPrice + (medication ? medication.price : 0);
	const totalCompositePriceKopecks = (
		(pair.combinedPriceKopecks ?? parseKopecks(pair.combinedPrice)) +
		(medication ? medication.priceKopecks : 0)
	) as Kopecks;

	return {
		fdiNumber,
		isMultiRooted: isMultiRootedTooth(fdiNumber) || count >= 2,
		canalCount: count,
		instrumentation: pair.instrumentation,
		obturation: pair.obturation,
		medication,
		totalCompositePrice,
		totalCompositePriceKopecks,
	};
}

/**
 * Чистый калькулятор полного эндодонтического лечения в копейках с учетом анестезии,
 * изоляции коффердамом, механической обработки, медикаментозной обработки и пломбирования.
 */
export function calculateEndoTreatmentPriceKopecks(
	options: EndoTreatmentPriceOptions,
): EndoTreatmentPriceCalculationResult {
	const toothRaw = options.fdiNumber;
	const fdi = typeof toothRaw === "string"
		? parseInt(toothRaw.replace(/[^0-9]/g, ""), 10) || 11
		: toothRaw;

	const canalCount = (
		typeof options.canalCount === "number" && options.canalCount >= 1 && options.canalCount <= 4
			? Math.round(options.canalCount)
			: getAnatomicalRootCanalCount(fdi)
	) as AnatomicalCanalCount;

	const lineItems: Order804nBillingLineItem[] = [];

	const createLineItem = (
		catalogItem: { code: string; title: string; category: string; price: number },
		quantity: number = 1,
		canals?: AnatomicalCanalCount,
	): Order804nBillingLineItem => {
		const priceKopecks = parseKopecks(catalogItem.price);
		const totalKopecks = multiplyKopecks(priceKopecks, quantity);
		return {
			code: catalogItem.code,
			title: catalogItem.title,
			category: catalogItem.category,
			priceRub: catalogItem.price,
			priceKopecks,
			quantity,
			totalRub: catalogItem.price * quantity,
			totalKopecks,
			totalPriceKopecks: totalKopecks,
			isMandatory: true,
			toothNumber: fdi,
			canalCount: canals ?? canalCount,
		};
	};

	// 1. Анестезия
	let anesthesiaKopecks = 0 as Kopecks;
	if (options.includeAnesthesia !== false) {
		const isLowerMolar = Math.floor(fdi / 10) >= 3 && (fdi % 10) >= 6;
		const anesth = isLowerMolar || options.anesthesiaType === "mandibular" || options.anesthesiaType === "torus"
			? ORDER_804N_ANESTHESIA_CATALOG.conduction
			: options.anesthesiaType === "application"
				? ORDER_804N_ANESTHESIA_CATALOG.application
				: ORDER_804N_ANESTHESIA_CATALOG.infiltration;
		const anesthItem = createLineItem(anesth, 1);
		anesthesiaKopecks = anesthItem.totalKopecks;
		lineItems.push(anesthItem);
	}

	// 2. Изоляция коффердамом
	let cofferdamKopecks = 0 as Kopecks;
	if (options.includeCofferdam !== false) {
		const cofferdamItem = createLineItem(ORDER_804N_COFFERDAM_ISOLATION, 1);
		cofferdamKopecks = cofferdamItem.totalKopecks;
		lineItems.push(cofferdamItem);
	}

	// 3. Распломбирование при перелечивании
	let unsealingKopecks = 0 as Kopecks;
	if (options.isRetreatment) {
		const unsealingItem = createLineItem(ORDER_804N_UNSEALING, canalCount, canalCount);
		unsealingKopecks = unsealingItem.totalKopecks;
		lineItems.push(unsealingItem);
	}

	// 4. Инструментальная и медикаментозная обработка
	const instCatalog = ORDER_804N_INSTRUMENTATION[canalCount];
	const instItem = createLineItem(instCatalog, 1, canalCount);
	const instrumentationPriceKopecks = instItem.totalKopecks;
	lineItems.push(instItem);

	// 5. Временное лекарственное пломбирование Ca(OH)2
	let medicationKopecks = 0 as Kopecks;
	if (options.includeMedicationCaOH2) {
		const medItem = createLineItem(ORDER_804N_MEDICATION_CAOH2, 1, canalCount);
		medicationKopecks = medItem.totalKopecks;
		lineItems.push(medItem);
	}

	// 6. Обтурация каналов
	const obtCatalog = ORDER_804N_OBTURATIONS[canalCount];
	const obtItem = createLineItem(obtCatalog, 1, canalCount);
	const obturationPriceKopecks = obtItem.totalKopecks;
	lineItems.push(obtItem);

	// 7. Постоянная композитная реставрация
	let restorationKopecks = 0 as Kopecks;
	if (options.includeRestoration) {
		const restCatalog = options.isMultiSurfaceRestoration
			? ORDER_804N_THERAPY_CATALOG.compositeFillingMultiSurfaces
			: ORDER_804N_THERAPY_CATALOG.compositeFilling1Surface;
		const restItem = createLineItem(restCatalog, 1);
		restorationKopecks = restItem.totalKopecks;
		lineItems.push(restItem);
	}

	const totalPriceKopecks = sumKopecks(lineItems.map((item) => item.totalKopecks));

	return {
		fdiNumber: fdi,
		canalCount,
		instrumentationPriceKopecks,
		obturationPriceKopecks,
		anesthesiaPriceKopecks: anesthesiaKopecks,
		cofferdamPriceKopecks: cofferdamKopecks,
		medicationPriceKopecks: medicationKopecks,
		unsealingPriceKopecks: unsealingKopecks,
		restorationPriceKopecks: restorationKopecks,
		totalPriceKopecks,
		totalRub: kopecksToRubles(totalPriceKopecks),
		lineItems,
	};
}

/**
 * Автоматический маппинг клинического диагноза и анатомии зуба на точные коды номенклатуры 804н.
 */
export function getOrder804nServicesForClinicalCase(
	options: ClinicalCase804nOptions,
): Order804nBillingLineItem[] {
	const items: Order804nBillingLineItem[] = [];
	const toothRaw = options.toothNumber ?? options.fdiNumber;
	const fdi = typeof toothRaw === "string" ? parseInt(toothRaw, 10) : (toothRaw ?? null);
	const validFdi = fdi !== null && !Number.isNaN(fdi) ? fdi : null;
	const canalOverride = options.canalCount ?? options.clinicalCanalCount;
	const canalCount = validFdi
		? getAnatomicalRootCanalCount(validFdi, canalOverride ?? undefined)
		: (canalOverride ? (Math.min(4, Math.max(1, Math.round(canalOverride))) as AnatomicalCanalCount) : 1);

	const icd = (options.icd10Code || "").trim().toUpperCase();
	const isMultiSurface = Boolean(options.surfaces && options.surfaces.length >= 2);

	const createItem = (
		catalogItem: { code: string; title: string; category: string; price: number },
		isMandatory: boolean = true,
		quantity: number = 1,
		canalsOverride?: AnatomicalCanalCount,
	): Order804nBillingLineItem => {
		const priceKopecks = parseKopecks(catalogItem.price);
		const totalKopecks = multiplyKopecks(priceKopecks, quantity);
		return {
			code: catalogItem.code,
			title: catalogItem.title,
			category: catalogItem.category,
			priceRub: catalogItem.price,
			priceKopecks,
			quantity,
			totalRub: catalogItem.price * quantity,
			totalKopecks,
			totalPriceKopecks: totalKopecks,
			isMandatory,
			toothNumber: validFdi,
			canalCount: canalsOverride ?? (canalsOverride === undefined && (catalogItem.category === "Эндодонтия" || icd.startsWith("K04")) ? canalCount : null),
		};
	};

	// 1. Анестезия (по умолчанию включена для инвазивных процедур)
	if (options.includeAnesthesia !== false) {
		const isLowerMolar = validFdi !== null && Math.floor(validFdi / 10) >= 3 && (validFdi % 10) >= 6;
		const anesth = isLowerMolar || options.anesthesiaType === "mandibular" || options.anesthesiaType === "torus"
			? ORDER_804N_ANESTHESIA_CATALOG.conduction
			: options.anesthesiaType === "application"
				? ORDER_804N_ANESTHESIA_CATALOG.application
				: ORDER_804N_ANESTHESIA_CATALOG.infiltration;
		items.push(createItem(anesth, true));
	}

	// 2. Эндодонтия (K04.0, K04.4, K04.5, K04.8)
	if (icd.startsWith("K04")) {
		// RVG снимок
		if (options.includeRvg !== false) {
			items.push(createItem(ORDER_804N_DIAGNOSTICS_CATALOG.rvgIntraoral, true));
		}

		// Распломбирование корневого канала при перелечивании (K04.5)
		if (icd === "K04.5" || options.isRetreatment) {
			items.push(createItem(ORDER_804N_UNSEALING, true, canalCount, canalCount));
		}

		// Инструментальная обработка каналов по числу анатомических каналов (1..4)
		const instItem = ORDER_804N_INSTRUMENTATION[canalCount];
		items.push(createItem(instItem, true, 1, canalCount));

		if (options.endoVisitStage === "access_instrumentation_temporary_calcium") {
			// Временная лечебная обтурация Ca(OH)2
			items.push(createItem(ORDER_804N_MEDICATION_CAOH2, true, 1, canalCount));
			// Временная пломба
			items.push(createItem(ORDER_804N_THERAPY_CATALOG.compositeFilling1Surface, true));
		} else if (options.endoVisitStage === "final_obturation_restoration") {
			// Трехмерная обтурация каналов
			const obtItem = ORDER_804N_OBTURATIONS[canalCount];
			items.push(createItem(obtItem, true, 1, canalCount));
			// Постоянная композитная реставрация
			items.push(
				createItem(
					isMultiSurface
						? ORDER_804N_THERAPY_CATALOG.compositeFillingMultiSurfaces
						: ORDER_804N_THERAPY_CATALOG.compositeFilling1Surface,
					true,
				),
			);
		} else {
			// Одноэтапное полное эндодонтическое лечение
			const obtItem = ORDER_804N_OBTURATIONS[canalCount];
			items.push(createItem(obtItem, true, 1, canalCount));

			if (icd === "K04.4" || icd === "K04.5" || icd === "K04.8") {
				// Включение лечебной противовоспалительной пасты при периодонтите
				items.push(createItem(ORDER_804N_MEDICATION_CAOH2, false, 1, canalCount));
			}

			// Постоянная композитная реставрация
			items.push(
				createItem(
					isMultiSurface
						? ORDER_804N_THERAPY_CATALOG.compositeFillingMultiSurfaces
						: ORDER_804N_THERAPY_CATALOG.compositeFilling1Surface,
					true,
				),
			);
		}
	} else if (icd === "K02.0") {
		// Кариес эмали (стадия пятна / начальный)
		items.push(createItem(ORDER_804N_THERAPY_CATALOG.deepFluoridation, true));
		items.push(createItem(ORDER_804N_THERAPY_CATALOG.compositeFilling1Surface, true));
		items.push(createItem(ORDER_804N_THERAPY_CATALOG.selectivePolishing, true));
	} else if (icd === "K02.1") {
		// Кариес дентина (средний / глубокий)
		items.push(createItem(ORDER_804N_THERAPY_CATALOG.cariesPreparation, true));
		items.push(
			createItem(
				isMultiSurface
					? ORDER_804N_THERAPY_CATALOG.compositeFillingMultiSurfaces
					: ORDER_804N_THERAPY_CATALOG.compositeFilling1Surface,
				true,
			),
		);
		items.push(createItem(ORDER_804N_THERAPY_CATALOG.deepFluoridation, false));
	} else if (icd === "K02.2") {
		// Кариес цемента корня
		items.push(createItem(ORDER_804N_THERAPY_CATALOG.cariesPreparation, true));
		items.push(createItem(ORDER_804N_THERAPY_CATALOG.compositeFilling1Surface, true));
		items.push(createItem(ORDER_804N_THERAPY_CATALOG.deepFluoridation, true));
	} else if (icd.startsWith("K03")) {
		// Некариозные поражения (клиновидный дефект, стираемость, эрозия)
		items.push(createItem(ORDER_804N_THERAPY_CATALOG.cariesPreparation, true));
		items.push(createItem(ORDER_804N_THERAPY_CATALOG.compositeFilling1Surface, true));
		items.push(createItem(ORDER_804N_THERAPY_CATALOG.deepFluoridation, true));
	} else if (icd === "K05.0" || icd === "K05.1") {
		// Гингивит (острый / хронический)
		items.push(createItem(ORDER_804N_PERIO_CATALOG.prophyHygieneFull, true));
		items.push(createItem(ORDER_804N_PERIO_CATALOG.ultrasonicScaling, true));
		items.push(createItem(ORDER_804N_PERIO_CATALOG.perioPocketMedication, true));
	} else if (icd === "K05.3") {
		// Пародонтит хронический
		items.push(createItem(ORDER_804N_PERIO_CATALOG.prophyHygieneFull, true));
		items.push(createItem(ORDER_804N_PERIO_CATALOG.ultrasonicScaling, true));
		items.push(createItem(ORDER_804N_PERIO_CATALOG.closedCurettage, true));
		items.push(createItem(ORDER_804N_PERIO_CATALOG.perioPocketMedication, true));
	} else if (
		icd === "K08.1" ||
		icd === "K01.1" ||
		icd === "K00.6" ||
		options.specialty === "surgery" ||
		options.isRetracted
	) {
		// Хирургическое удаление зуба
		if (options.includeRvg !== false) {
			items.push(createItem(ORDER_804N_DIAGNOSTICS_CATALOG.rvgIntraoral, true));
		}
		const isDeciduous =
			options.isDeciduous ||
			icd === "K00.6" ||
			(validFdi !== null && validFdi >= 51 && validFdi <= 85);
		const isRetracted = options.isRetracted || icd === "K01.1";
		const isMulti = validFdi ? isMultiRootedTooth(validFdi) : (canalCount > 1);

		const extraction = isDeciduous
			? ORDER_804N_SURGERY_CATALOG.temporaryExtraction
			: isRetracted
				? ORDER_804N_SURGERY_CATALOG.retractedExtraction
				: isMulti || options.isDifficultExtraction
					? ORDER_804N_SURGERY_CATALOG.complexExtraction
					: ORDER_804N_SURGERY_CATALOG.simpleExtraction;

		items.push(createItem(extraction, true));
		if (options.includeSutures) {
			items.push(createItem(ORDER_804N_SURGERY_CATALOG.sutureApplication, true));
		}
	} else if (icd.includes("ORTHO") || options.specialty === "orthopedics" || icd === "Z51.8") {
		// Ортопедия — коронка
		items.push(createItem(ORDER_804N_ORTHO_CATALOG.crownRestoration, true));
		items.push(createItem(ORDER_804N_ORTHO_CATALOG.crownPreparation, true));
		items.push(createItem(ORDER_804N_ORTHO_CATALOG.jawImpression, true, 2));
		items.push(createItem(ORDER_804N_ORTHO_CATALOG.provisionalCrown, true));
	} else {
		// Универсальный fallback на кариес дентина
		items.push(createItem(ORDER_804N_THERAPY_CATALOG.cariesPreparation, true));
		items.push(createItem(ORDER_804N_THERAPY_CATALOG.compositeFilling1Surface, true));
	}

	return items;
}

/**
 * Расчет полной сметы и позиций счёта по номенклатуре Минздрава 804н с копеечной точностью.
 */
export function calculateOrder804nBillingEstimate(
	options: ClinicalCase804nOptions,
): Order804nBillingEstimateResult {
	const items = getOrder804nServicesForClinicalCase(options);
	const toothRaw = options.toothNumber ?? options.fdiNumber;
	const fdi = typeof toothRaw === "string" ? parseInt(toothRaw, 10) : (toothRaw ?? null);
	const validFdi = fdi !== null && !Number.isNaN(fdi) ? fdi : null;
	const canalOverride = options.canalCount ?? options.clinicalCanalCount;
	const canalCount = validFdi
		? getAnatomicalRootCanalCount(validFdi, canalOverride ?? undefined)
		: (canalOverride ? (Math.min(4, Math.max(1, Math.round(canalOverride))) as AnatomicalCanalCount) : 1);

	const totalKopecks = sumKopecks(items.map((i) => i.totalKopecks));
	const totalRub = kopecksToRubles(totalKopecks);
	const formattedTotal = formatKopecksRu(totalKopecks);

	const invoiceLines = items.map((item) => ({
		code: item.code,
		title: item.title,
		unitPriceRub: item.priceRub,
		quantity: item.quantity,
		totalRub: item.totalRub,
		toothNumber: validFdi ? String(validFdi) : null,
	}));

	return {
		fdiNumber: validFdi,
		icd10Code: options.icd10Code,
		canalCount,
		items,
		lineItems: items,
		totalKopecks,
		totalRub,
		formattedTotal,
		invoiceLines,
	};
}

/**
 * Clean clinical aliases (Mandate 8x)
 */
export const calculateEndoBillingEstimate = calculateOrder804nBillingEstimate;
