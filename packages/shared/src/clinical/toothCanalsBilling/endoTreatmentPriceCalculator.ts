/**
 * DENTE Dental CRM — Endodontic Treatment Price Calculator & Minzdrav 804n Estimates
 * Layer 3: Pure Financial Calculator in Integer Kopecks with Anesthesia & Isolation
 */

import {
	type Kopecks,
	multiplyKopecks,
	parseKopecks,
	sumKopecks,
} from "../../utils/money.js";
import type {
	AnatomicalCanalCount,
	ClinicalCase804nOptions,
	EndodonticFullTreatmentPlanItem,
	EndoTreatmentPriceCalculationResult,
	EndoTreatmentPriceOptions,
	Order804nBillingEstimateResult,
	Order804nBillingLineItem,
} from "./types.js";
import {
	getAnatomicalRootCanalCount,
	isMultiRootedTooth,
} from "./toothCanalAnatomyMap.js";
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
} from "./billing804nMatcher.js";

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

	return {
		fdiNumber,
		isMultiRooted: isMultiRootedTooth(fdiNumber) || count >= 2,
		canalCount: count,
		instrumentation: pair.instrumentation,
		obturation: pair.obturation,
		medication,
		totalCompositePrice,
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
		totalRub: totalPriceKopecks / 100,
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
	const totalRub = totalKopecks / 100;
	const rubles = Math.floor(totalKopecks / 100);
	const kopecks = totalKopecks % 100;
	const formattedTotal = `${rubles.toLocaleString("ru-RU")},${kopecks.toString().padStart(2, "0")} ₽`;

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
