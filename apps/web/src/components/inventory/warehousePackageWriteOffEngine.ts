/**
 * ============================================================================
 * WAREHOUSE PACKAGE WRITE-OFF ENGINE (МАНДАТЫ 8e, 8k, 8n)
 * 1-клик пакетное списание анестетиков и расходников с мягким овердрафтом склада.
 *
 * ИНВАРИАНТЫ:
 * 1. Соло-врач и медсестра списывают стандартные клинические наборы в 1 клик
 *    («Стандартная анестезия», «Пломба световая», «Профгигиена», «Хирургия»)
 *    без заполнения 15 полей накладной и без созыва комиссии из 3 человек.
 * 2. Мягкий овердрафт склада (allowSoftOverdraft: true): задержка оприходования
 *    накладной поставщика НИКОГДА не блокирует операцию, спасение зуба или
 *    закрытие приёма. Дефицит фиксируется информационным предупреждением (warning toast),
 *    а не фатальной ошибкой 400/409.
 * 3. Тач-таргеты >= 44x44px, 0 мультяшных эмодзи (Lucide векторные иконки),
 *    0 заблокированных disabled кнопок без причины.
 * ============================================================================
 */

import { showToast } from "../GlobalToast";
import type { InventoryItem } from "./useInventoryLogic";

let packageWriteOffActSeq = 0;

export type ClinicalPackageId =
	| "anesthesia"
	| "filling"
	| "hygiene"
	| "surgery"
	| "carpule_quick"
	| "sterilization_kit";

export interface ClinicalWriteoffPackageItem {
	readonly id: string;
	readonly sku: string;
	readonly nameRu: string;
	readonly category: "anesthesia" | "ppe" | "composite" | "hygiene" | "surgery" | "auxiliary";
	readonly unit: string;
	readonly standardQuantity: number;
	readonly unitCostKopecks: number;
	readonly defaultLotNumber?: string;
	readonly defaultExpDate?: string;
}

export interface ClinicalWriteoffPackage {
	readonly id: ClinicalPackageId;
	readonly title: string;
	readonly description: string;
	readonly buttonClass: string;
	readonly testId: string;
	readonly items: readonly ClinicalWriteoffPackageItem[];
}

/**
 * Канонические клинические пакеты расходных материалов для стоматологического приёма
 * (Минздрав РФ 804н, СтАР, СанПиН 3.3686-21).
 */
export const CLINICAL_WRITEOFF_PACKAGES: readonly ClinicalWriteoffPackage[] = [
	{
		id: "anesthesia",
		title: "Стандартная анестезия",
		description: "Артикаин 1:100 000 (1.7 мл) + карпульная игла 30G + ватные валики (4 шт.)",
		buttonClass: "btn-writeoff-anesthesia-packet",
		testId: "btn-writeoff-anesthesia-packet",
		items: [
			{
				id: "art_100k_carpule",
				sku: "MED-ANES-01",
				nameRu: "Артикаин 4% с эпинефрином 1:100 000 (1.7 мл)",
				category: "anesthesia",
				unit: "карп.",
				standardQuantity: 1,
				unitCostKopecks: 14500, // 145.00 ₽
				defaultLotNumber: "LOT-ART-2026",
				defaultExpDate: "2027-08",
			},
			{
				id: "dental_needle_30g",
				sku: "MED-NEEDLE-30G",
				nameRu: "Игла карпульная стоматологическая 30G евростандарт 25 мм",
				category: "anesthesia",
				unit: "шт.",
				standardQuantity: 1,
				unitCostKopecks: 2500, // 25.00 ₽
				defaultLotNumber: "LOT-NDL-2026",
				defaultExpDate: "2028-01",
			},
			{
				id: "cotton_rolls_sterile",
				sku: "MED-ROLL-02",
				nameRu: "Ватные валики стоматологические стерильные №2",
				category: "ppe",
				unit: "шт.",
				standardQuantity: 4,
				unitCostKopecks: 300, // 3.00 ₽
			},
			{
				id: "antiseptic_alcohol_wipe",
				sku: "MED-WIPE-01",
				nameRu: "Антисептическая спиртовая салфетка стерильная",
				category: "auxiliary",
				unit: "шт.",
				standardQuantity: 1,
				unitCostKopecks: 500, // 5.00 ₽
			},
		],
	},
	{
		id: "filling",
		title: "Пломба световая (Терапия)",
		description: "СИЗ + Крафт + анестетик + нанокомпозит + адгезив + матрица",
		buttonClass: "btn-writeoff-filling-packet",
		testId: "btn-writeoff-filling-packet",
		items: [
			{
				id: "art_100k_carpule",
				sku: "MED-ANES-01",
				nameRu: "Артикаин 4% с эпинефрином 1:100 000 (1.7 мл)",
				category: "anesthesia",
				unit: "карп.",
				standardQuantity: 1,
				unitCostKopecks: 14500,
				defaultLotNumber: "LOT-ART-2026",
				defaultExpDate: "2027-08",
			},
			{
				id: "dental_needle_30g",
				sku: "MED-NEEDLE-30G",
				nameRu: "Игла карпульная стоматологическая 30G евростандарт 25 мм",
				category: "anesthesia",
				unit: "шт.",
				standardQuantity: 1,
				unitCostKopecks: 2500,
			},
			{
				id: "nitrile_gloves_pair",
				sku: "MED-GLOVE-M",
				nameRu: "Перчатки смотровые нитриловые неопудренные (пара)",
				category: "ppe",
				unit: "пар",
				standardQuantity: 2,
				unitCostKopecks: 3500, // 35.00 ₽
			},
			{
				id: "medical_face_mask",
				sku: "MED-MASK-01",
				nameRu: "Маска защитная медицинская трехслойная",
				category: "ppe",
				unit: "шт.",
				standardQuantity: 2,
				unitCostKopecks: 1200, // 12.00 ₽
			},
			{
				id: "saliva_ejector",
				sku: "MED-EJECT-01",
				nameRu: "Слюноотсос одноразовый стоматологический",
				category: "ppe",
				unit: "шт.",
				standardQuantity: 1,
				unitCostKopecks: 1400, // 14.00 ₽
			},
			{
				id: "patient_bib",
				sku: "MED-BIB-01",
				nameRu: "Салфетка нагрудная стоматологическая двухслойная",
				category: "ppe",
				unit: "шт.",
				standardQuantity: 1,
				unitCostKopecks: 800, // 8.00 ₽
			},
			{
				id: "cotton_rolls_sterile",
				sku: "MED-ROLL-02",
				nameRu: "Ватные валики стоматологические стерильные №2",
				category: "ppe",
				unit: "шт.",
				standardQuantity: 6,
				unitCostKopecks: 300,
			},
			{
				id: "composite_nano_shade",
				sku: "MAT-COMP-01",
				nameRu: "Светоотверждаемый нанокомпозит (Filtek / Estelite)",
				category: "composite",
				unit: "г",
				standardQuantity: 0.2,
				unitCostKopecks: 38000, // 380.00 ₽ за 0.2 г
			},
			{
				id: "dental_adhesive_universal",
				sku: "MAT-ADH-01",
				nameRu: "Адгезив стоматологический универсальный светоотверждаемый",
				category: "composite",
				unit: "мл",
				standardQuantity: 0.1,
				unitCostKopecks: 15000, // 150.00 ₽
			},
			{
				id: "phosphoric_etching_gel",
				sku: "MAT-ETCH-01",
				nameRu: "Гель протравочный ортофосфорный 37%",
				category: "composite",
				unit: "мл",
				standardQuantity: 0.2,
				unitCostKopecks: 2500, // 25.00 ₽
			},
			{
				id: "sectional_matrix",
				sku: "MAT-MATR-01",
				nameRu: "Секционная матрица контурная металлизированная",
				category: "auxiliary",
				unit: "шт.",
				standardQuantity: 1,
				unitCostKopecks: 4500, // 45.00 ₽
			},
		],
	},
	{
		id: "hygiene",
		title: "Профгигиена",
		description: "СИЗ + Крафт + Оптрагейт + порошок Air-Flow + паста + щетка + валики",
		buttonClass: "btn-writeoff-hygiene-packet",
		testId: "btn-writeoff-hygiene-packet",
		items: [
			{
				id: "nitrile_gloves_pair",
				sku: "MED-GLOVE-M",
				nameRu: "Перчатки смотровые нитриловые неопудренные (пара)",
				category: "ppe",
				unit: "пар",
				standardQuantity: 2,
				unitCostKopecks: 3500,
			},
			{
				id: "medical_face_mask",
				sku: "MED-MASK-01",
				nameRu: "Маска защитная медицинская трехслойная",
				category: "ppe",
				unit: "шт.",
				standardQuantity: 2,
				unitCostKopecks: 1200,
			},
			{
				id: "saliva_ejector",
				sku: "MED-EJECT-01",
				nameRu: "Слюноотсос одноразовый стоматологический",
				category: "ppe",
				unit: "шт.",
				standardQuantity: 1,
				unitCostKopecks: 1400,
			},
			{
				id: "patient_bib",
				sku: "MED-BIB-01",
				nameRu: "Салфетка нагрудная стоматологическая двухслойная",
				category: "ppe",
				unit: "шт.",
				standardQuantity: 1,
				unitCostKopecks: 800,
			},
			{
				id: "optragate_retractor",
				sku: "MAT-OPTR-01",
				nameRu: "Роторасширитель эластичный OptraGate (Regular/Small)",
				category: "hygiene",
				unit: "шт.",
				standardQuantity: 1,
				unitCostKopecks: 12000, // 120.00 ₽
			},
			{
				id: "airflow_powder_glycine",
				sku: "MAT-POWDER-01",
				nameRu: "Порошок для воздушно-абразивной полировки Air-Flow (саше 25 г)",
				category: "hygiene",
				unit: "саше",
				standardQuantity: 1,
				unitCostKopecks: 18000, // 180.00 ₽
			},
			{
				id: "prophy_polishing_paste",
				sku: "MAT-PASTE-01",
				nameRu: "Паста полировочная абразивная стоматологическая",
				category: "hygiene",
				unit: "доза",
				standardQuantity: 1,
				unitCostKopecks: 3500, // 35.00 ₽
			},
			{
				id: "prophy_brush",
				sku: "MAT-BRUSH-01",
				nameRu: "Щетка полировочная циркулярная для углового наконечника",
				category: "hygiene",
				unit: "шт.",
				standardQuantity: 1,
				unitCostKopecks: 2500, // 25.00 ₽
			},
			{
				id: "cotton_rolls_sterile",
				sku: "MED-ROLL-02",
				nameRu: "Ватные валики стоматологические стерильные №2",
				category: "ppe",
				unit: "шт.",
				standardQuantity: 4,
				unitCostKopecks: 300,
			},
		],
	},
	{
		id: "surgery",
		title: "Хирургический пакет (Удаление)",
		description: "Анестетик + игла 27G + скальпель + шовник + губка гемостатическая",
		buttonClass: "btn-writeoff-surgery-packet",
		testId: "btn-writeoff-surgery-packet",
		items: [
			{
				id: "art_100k_carpule",
				sku: "MED-ANES-01",
				nameRu: "Артикаин 4% с эпинефрином 1:100 000 (1.7 мл)",
				category: "anesthesia",
				unit: "карп.",
				standardQuantity: 1,
				unitCostKopecks: 14500,
				defaultLotNumber: "LOT-ART-2026",
				defaultExpDate: "2027-08",
			},
			{
				id: "dental_needle_27g",
				sku: "MED-NEEDLE-27G",
				nameRu: "Игла карпульная стоматологическая 27G длинная 35 мм",
				category: "anesthesia",
				unit: "шт.",
				standardQuantity: 1,
				unitCostKopecks: 3000,
			},
			{
				id: "surgical_sterile_gloves",
				sku: "MED-GLOVE-SURG",
				nameRu: "Перчатки хирургические стерильные (пара)",
				category: "ppe",
				unit: "пар",
				standardQuantity: 2,
				unitCostKopecks: 6500,
			},
			{
				id: "surgical_scalpel_15",
				sku: "MED-SCALPEL-15",
				nameRu: "Скальпель хирургический одноразовый стерильный №15",
				category: "surgery",
				unit: "шт.",
				standardQuantity: 1,
				unitCostKopecks: 4200,
			},
			{
				id: "hemostatic_sponge",
				sku: "MED-HEMO-01",
				nameRu: "Губка гемостатическая коллагеновая стерильная",
				category: "surgery",
				unit: "шт.",
				standardQuantity: 1,
				unitCostKopecks: 9500,
			},
			{
				id: "suture_vicryl_40",
				sku: "MED-SUTURE-01",
				nameRu: "Шовный материал с атравматической иглой (ПГА/Викрил 4-0)",
				category: "surgery",
				unit: "шт.",
				standardQuantity: 1,
				unitCostKopecks: 16000,
			},
			{
				id: "sterile_gauze_swabs",
				sku: "MED-GAUZE-01",
				nameRu: "Салфетки марлевые стерильные 5х5 см",
				category: "surgery",
				unit: "шт.",
				standardQuantity: 5,
				unitCostKopecks: 600,
			},
		],
	},
	{
		id: "carpule_quick",
		title: "Списать карпулу анестетика (Септанест/Убистезин)",
		description: "1 пустая карпула анестетика (Септанест / Убистезин 4% 1.7 мл) + карпульная игла 30G евростандарт",
		buttonClass: "btn-writeoff-anesthetic-carpule",
		testId: "btn-writeoff-anesthetic-carpule",
		items: [
			{
				id: "art_septanest_ubistesin_carpule",
				sku: "MED-ANES-SEPT",
				nameRu: "Карпула анестетика (Септанест / Убистезин 4% 1.7 мл)",
				category: "anesthesia",
				unit: "карп.",
				standardQuantity: 1,
				unitCostKopecks: 14500,
				defaultLotNumber: "LOT-SEPT-2026",
				defaultExpDate: "2027-10",
			},
			{
				id: "dental_needle_30g",
				sku: "MED-NEEDLE-30G",
				nameRu: "Игла карпульная стоматологическая 30G евростандарт 25 мм",
				category: "anesthesia",
				unit: "шт.",
				standardQuantity: 1,
				unitCostKopecks: 2500,
				defaultLotNumber: "LOT-NDL-2026",
				defaultExpDate: "2028-01",
			},
		],
	},
	{
		id: "sterilization_kit",
		title: "Набор стерилизации: 1 лоток + перчатки",
		description: "1 лоток стерилизации со смотровым инструментом в крафт-пакете + 2 пары перчаток + салфетка",
		buttonClass: "btn-writeoff-sterilization-kit",
		testId: "btn-writeoff-sterilization-kit",
		items: [
			{
				id: "sterilization_tray_kraft",
				sku: "STER-TRAY-01",
				nameRu: "Стерилизационный лоток со смотровым набором (крафт-пакет V-класса)",
				category: "auxiliary",
				unit: "лоток",
				standardQuantity: 1,
				unitCostKopecks: 8500,
				defaultLotNumber: "LOT-KRAFT-2026",
				defaultExpDate: "2027-01",
			},
			{
				id: "nitrile_gloves_pair",
				sku: "MED-GLOVE-M",
				nameRu: "Перчатки смотровые нитриловые неопудренные (пара)",
				category: "ppe",
				unit: "пар",
				standardQuantity: 2,
				unitCostKopecks: 3500,
			},
			{
				id: "antiseptic_alcohol_wipe",
				sku: "MED-WIPE-01",
				nameRu: "Антисептическая дезинфицирующая салфетка стерильная",
				category: "auxiliary",
				unit: "шт.",
				standardQuantity: 1,
				unitCostKopecks: 500,
			},
		],
	},
];

export interface OneClickPackageWriteOffOptions {
	readonly packageId: ClinicalPackageId | string;
	readonly quantityMultiplier?: number | undefined;
	readonly cabinetId?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly nurseName?: string | undefined;
	readonly patientName?: string | undefined;
	readonly visitId?: string | undefined;
	readonly allowSoftOverdraft?: boolean | undefined; // default: true (Mandates 8e, 8k, 8n)
	readonly currentStockMap?: Record<string, number> | undefined;
	readonly warehouseItems?: readonly InventoryItem[] | undefined;
	readonly organizationId?: string | undefined;
	readonly onToast?: ((message: string, type: "success" | "warning" | "info" | "error") => void) | undefined;
	readonly fetchFn?: typeof fetch | undefined;
}

export interface OneClickPackageWriteOffDeductedItem {
	readonly id: string;
	readonly sku: string;
	readonly nameRu: string;
	readonly quantity: number;
	readonly unit: string;
	readonly unitCostKopecks: number;
	readonly costKopecks: number;
	readonly isOverdraft: boolean;
	readonly deficitQty: number;
}

export interface OneClickPackageWriteOffResult {
	readonly success: boolean;
	readonly packageId: string;
	readonly packageTitle: string;
	readonly actNumber: string;
	readonly actDate: string;
	readonly totalItemsCount: number;
	readonly totalQuantity: number;
	readonly totalCostKopecks: number;
	readonly isOverdraft: boolean;
	readonly overdraftCount: number;
	readonly overdraftItems: ReadonlyArray<{
		nameRu: string;
		requestedQty: number;
		availableQty: number;
		deficitQty: number;
	}>;
	readonly deductedItems: readonly OneClickPackageWriteOffDeductedItem[];
	readonly toastMessage: string;
	readonly toastType: "success" | "warning" | "error";
}

/**
 * 1-клик списание клинического пакета анестезии или расходников с мягким овердрафтом склада.
 * (Мандат 8e п. 10, Мандат 8k, Мандат 8n).
 */
export async function handleOneClickPackageWriteOff(
	options: OneClickPackageWriteOffOptions,
): Promise<OneClickPackageWriteOffResult> {
	const pkg =
		CLINICAL_WRITEOFF_PACKAGES.find((p) => p.id === options.packageId) ??
		CLINICAL_WRITEOFF_PACKAGES[0]!;

	const multiplier = Math.max(1, options.quantityMultiplier ?? 1);
	const allowSoftOverdraft = options.allowSoftOverdraft ?? true;
	const now = new Date();
	const actDate = now.toISOString().slice(0, 10);
	const actNumber = `АКТ-СПИС-ПК-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(++packageWriteOffActSeq).padStart(3, "0")}`;

	// Составляем карту складских остатков
	const stockMap = new Map<string, number>();

	if (options.currentStockMap) {
		for (const [k, v] of Object.entries(options.currentStockMap)) {
			stockMap.set(k.toLowerCase().trim(), Number(v) || 0);
		}
	}

	if (options.warehouseItems) {
		for (const it of options.warehouseItems) {
			const qty = Number(it.stockQuantity) || 0;
			if (it.id) stockMap.set(it.id.toLowerCase().trim(), qty);
			if (it.sku) stockMap.set(it.sku.toLowerCase().trim(), qty);
			if (it.name) stockMap.set(it.name.toLowerCase().trim(), qty);
		}
	}

	const deductedItems: OneClickPackageWriteOffDeductedItem[] = [];
	const overdraftItems: Array<{
		nameRu: string;
		requestedQty: number;
		availableQty: number;
		deficitQty: number;
	}> = [];

	let totalCostKopecks = 0;
	let totalQuantity = 0;

	for (const item of pkg.items) {
		const neededQty = Number((item.standardQuantity * multiplier).toFixed(4));
		totalQuantity = Number((totalQuantity + neededQty).toFixed(4));

		// Определяем доступный остаток на складе
		let availableQty = 0;
		if (stockMap.has(item.id.toLowerCase().trim())) {
			availableQty = stockMap.get(item.id.toLowerCase().trim()) ?? 0;
		} else if (stockMap.has(item.sku.toLowerCase().trim())) {
			availableQty = stockMap.get(item.sku.toLowerCase().trim()) ?? 0;
		} else if (stockMap.has(item.nameRu.toLowerCase().trim())) {
			availableQty = stockMap.get(item.nameRu.toLowerCase().trim()) ?? 0;
		} else {
			// Не каталогизирован или склад пуст -> 0
			availableQty = 0;
		}

		const hasDeficit = availableQty < neededQty;
		const deficitQty = hasDeficit ? Number((neededQty - availableQty).toFixed(4)) : 0;
		const itemCostKopecks = Math.round(item.unitCostKopecks * neededQty);
		totalCostKopecks += itemCostKopecks;

		if (hasDeficit) {
			overdraftItems.push({
				nameRu: item.nameRu,
				requestedQty: neededQty,
				availableQty,
				deficitQty,
			});
		}

		deductedItems.push({
			id: item.id,
			sku: item.sku,
			nameRu: item.nameRu,
			quantity: neededQty,
			unit: item.unit,
			unitCostKopecks: item.unitCostKopecks,
			costKopecks: itemCostKopecks,
			isOverdraft: hasDeficit,
			deficitQty,
		});
	}

	const isOverdraft = overdraftItems.length > 0;
	const overdraftCount = overdraftItems.length;

	// Если мягкий овердрафт СТРОГО запрещен административно (allowSoftOverdraft === false)
	if (!allowSoftOverdraft && isOverdraft) {
		const errorMsg = `Списание заблокировано: дефицит ${overdraftCount} поз. на складе при выключенном овердрафте.`;
		if (options.onToast) {
			options.onToast(errorMsg, "error");
		} else {
			showToast(errorMsg, "error");
		}
		return {
			success: false,
			packageId: pkg.id,
			packageTitle: pkg.title,
			actNumber,
			actDate,
			totalItemsCount: pkg.items.length,
			totalQuantity,
			totalCostKopecks,
			isOverdraft: true,
			overdraftCount,
			overdraftItems,
			deductedItems,
			toastMessage: errorMsg,
			toastType: "error",
		};
	}

	// По закону Мандата 8e п. 10: мягкий овердрафт активен
	let toastMessage = "";
	let toastType: "success" | "warning" = "success";

	if (isOverdraft) {
		toastType = "warning";
		toastMessage = `Внимание: остаток отрицательный (овердрафт), требуется оприходование накладной. Списание пакета «${pkg.title}» выполнено в 1 клик. Зафиксирован Мягкий овердрафт: дефицит ${overdraftCount} поз. (накладная в пути). Операция не заблокирована!`;
	} else {
		toastType = "success";
		toastMessage = `Клинический пакет «${pkg.title}» успешно списан со склада в 1 клик (${pkg.items.length} поз., без комиссии из 3 человек).`;
	}

	// Отправка сетевого запроса, если переданы fetchFn и organizationId
	if (options.fetchFn && options.organizationId) {
		try {
			await options.fetchFn(
				`/api/inventory/${options.organizationId}/quick-writeoff-package`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						packageId: pkg.id,
						quantityMultiplier: multiplier,
						allowOverdraft: true,
						allowSoftOverdraft: true,
						actNumber,
						actDate,
						cabinetId: options.cabinetId,
						doctorName: options.doctorName,
						nurseName: options.nurseName,
						patientName: options.patientName,
						visitId: options.visitId,
					}),
				},
			);
		} catch (err) {
			// Автономная устойчивость к сетевым сбоям: операция локально фиксируется
			console.warn("Сетевой запрос быстрой утилизации отложен, локальное списание активно:", err);
		}
	}

	// Выдача тоста
	if (options.onToast) {
		options.onToast(toastMessage, toastType);
	} else {
		showToast(toastMessage, toastType);
	}

	return {
		success: true,
		packageId: pkg.id,
		packageTitle: pkg.title,
		actNumber,
		actDate,
		totalItemsCount: pkg.items.length,
		totalQuantity,
		totalCostKopecks,
		isOverdraft,
		overdraftCount,
		overdraftItems,
		deductedItems,
		toastMessage,
		toastType,
	};
}
