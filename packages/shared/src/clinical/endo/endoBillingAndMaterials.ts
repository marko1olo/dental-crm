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
	ORDER_804N_INSTRUMENTATION,
	ORDER_804N_MEDICATION_CAOH2,
	ORDER_804N_OBTURATIONS,
	ORDER_804N_UNSEALING,
} from "../toothCanalsBilling/billing804nMatcher.js";
import { getAnatomicalRootCanalCount } from "../toothCanalsBilling/toothCanalAnatomyMap.js";
import type {
	Endo804nServiceEstimate,
	EndoCanalData,
	EndoMaterialConsumableEstimate,
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
		const unsealPriceKopecks = unsealPriceRub * 100;
		services804n.push({
			code804n: ORDER_804N_UNSEALING.code,
			title: `${ORDER_804N_UNSEALING.title} (${canalCount} ${getCanalPluralRu(canalCount)})`,
			category: "Эндодонтия",
			priceRub: unsealPriceRub,
			priceKopecks: unsealPriceKopecks,
			quantity: canalCount,
			totalPriceRub: unsealPriceRub * canalCount,
			totalPriceKopecks: unsealPriceKopecks * canalCount,
			toothNumber,
			canalCount,
			isMandatory: true,
		});
	}

	// 2. Механическая и медикаментозная обработка корневых каналов (A16.07.030)
	const instItem = ORDER_804N_INSTRUMENTATION[canalCount];
	const instPriceKopecks = instItem.price * 100;
	services804n.push({
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
		const medPriceKopecks = medPriceRub * 100;
		services804n.push({
			code804n: ORDER_804N_MEDICATION_CAOH2.code,
			title: `${ORDER_804N_MEDICATION_CAOH2.title} (${canalCount} ${getCanalPluralRu(canalCount)})`,
			category: "Эндодонтия",
			priceRub: medPriceRub,
			priceKopecks: medPriceKopecks,
			quantity: canalCount,
			totalPriceRub: medPriceRub * canalCount,
			totalPriceKopecks: medPriceKopecks * canalCount,
			toothNumber,
			canalCount,
			isMandatory: true,
		});
	} else if (stage === "COMPLETED") {
		const obtItem = ORDER_804N_OBTURATIONS[canalCount];
		const obtPriceKopecks = obtItem.price * 100;
		services804n.push({
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

	// 1. Машинный NiTi файл ProTaper / WaveOne (1 шт на зуб)
	materials.push({
		itemId: "mat-niti-rotary-file",
		itemName: "NiTi ротационный машинный файл (ProTaper / WaveOne)",
		category: "rotary_file",
		unit: "шт",
		quantity: 1,
		costPriceRub: 650,
		costPriceKopecks: 65000,
		notes: `Инструментальная обработка каналов зуба #${toothNumber}`,
	});

	// 2. Гипохлорит натрия 3% (5 мл на канал)
	const hypoMl = 5 * canalCount;
	materials.push({
		itemId: "mat-hypochlorite-3",
		itemName: "Гипохлорит натрия 3% стабилизированный (шприц с эндо-иглой)",
		category: "disinfectant",
		unit: "ml",
		quantity: hypoMl,
		costPriceRub: 24 * hypoMl, // 24 ₽ за мл (120 ₽ за 5 мл)
		costPriceKopecks: 2400 * hypoMl,
		notes: `Ирригация ${canalCount} ${getCanalPluralRu(canalCount)}`,
	});

	// 3. Раствор ЭДТА 17% (2 мл на канал)
	const edtaMl = 2 * canalCount;
	materials.push({
		itemId: "mat-endo-edta-17",
		itemName: "Раствор ЭДТА 17% для удаления смазанного слоя (ЭндоЖи №2)",
		category: "disinfectant",
		unit: "ml",
		quantity: edtaMl,
		costPriceRub: 42.5 * edtaMl, // 85 ₽ за 2 мл
		costPriceKopecks: 4250 * edtaMl,
		notes: `Хемомеханическая обработка ${canalCount} ${getCanalPluralRu(canalCount)}`,
	});

	// 4. Материалы обтурации в зависимости от этапа
	if (stage === "COMPLETED") {
		// Гуттаперчевые конусные штифты (3 шт на каждый канал)
		const guttaQty = 3 * canalCount;
		materials.push({
			itemId: "mat-gutta-percha",
			itemName: "Гуттаперчевые конусные штифты (0.04 / 0.06)",
			category: "gutta_percha",
			unit: "шт",
			quantity: guttaQty,
			costPriceRub: 15 * guttaQty, // 45 ₽ за 3 шт
			costPriceKopecks: 1500 * guttaQty,
			notes: `Трехмерная обтурация ${canalCount} ${getCanalPluralRu(canalCount)}`,
		});

		// Бумажные штифты/пины абсорбирующие для высушивания (4 шт на каждый канал)
		const paperPointsQty = 4 * canalCount;
		materials.push({
			itemId: "mat-paper-points",
			itemName: "Бумажные штифты/пины абсорбирующие (Paper Points)",
			category: "paper_points",
			unit: "шт",
			quantity: paperPointsQty,
			costPriceRub: 8 * paperPointsQty,
			costPriceKopecks: 800 * paperPointsQty,
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
				costPriceKopecks: 85000,
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
				costPriceKopecks: 42000,
				notes: "Постоянная обтурация каналов",
			});
		}
	} else if (stage === "TEMP_CAOH2") {
		// Гидроксид кальция (Calasept / Metapex) — 1 доза на каждый канал
		materials.push({
			itemId: "mat-calcium-calasept",
			itemName: "Гидроксид кальция паста рентгеноконтрастная Calasept / Metapex",
			category: "calcium",
			unit: "доза",
			quantity: canalCount,
			costPriceRub: 180 * canalCount,
			costPriceKopecks: 18000 * canalCount,
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
			costPriceKopecks: 5000,
			notes: "Герметизация полости зуба на 7–14 дней",
		});
	}

	// Итоговые суммы
	const totalServicesPriceKopecks = services804n.reduce(
		(sum, s) => sum + s.totalPriceKopecks,
		0,
	);
	const totalServicesPriceRub = totalServicesPriceKopecks / 100;

	const totalMaterialsCostKopecks = materials.reduce(
		(sum, m) => sum + m.costPriceKopecks,
		0,
	);
	const totalMaterialsCostRub = totalMaterialsCostKopecks / 100;

	return {
		toothNumber,
		canalCount,
		stage,
		obturationTechnique,
		sealer,
		isRetreatment,
		services804n,
		materials,
		totalServicesPriceRub,
		totalServicesPriceKopecks,
		totalMaterialsCostRub,
		totalMaterialsCostKopecks,
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
