/**
 * ============================================================================
 * ACCEPTANCE WAYBILLS ENGINE (FEFO BATCHES & ANTI-BLOAT)
 * Чистый расчетный модуль оприходования накладных от реальных стоматологических
 * поставщиков (Стомторг, Дентал Маркет, ВладМиВа, KaVo, Рокада Мед).
 *
 * КЛЮЧЕВЫЕ МАНДАТЫ:
 * 1. Анти-блоат (Мандаты 8i, 8s): Ликвидация бюрократических комиссий начмедов
 *    и стационарных наркотических журналов. Чистый амбулаторный учет.
 * 2. Копеечная точность (Мандат 8b): Расчет денежных сумм строго в целых копейках.
 * 3. FEFO контроль (Мандат 8e): First Expired, First Out по сериям и срокам годности.
 * 4. Мягкий овердрафт (Мандат 8n): Приход накладной автоматически гасит дефицит,
 *    накопленный при экстренном списании материалов у кресла врача.
 * 5. НДС по НК РФ: 0% на зарегистрированные медизделия и лекарства (ст. 149 п. 2),
 *    20% на хозяйственные расходники.
 * ============================================================================
 */

export * from "./acceptanceWaybillsTypes.js";
export * from "./acceptanceWaybillsTemplates.js";

import type {
	AcceptanceFefoStatus,
	AcceptanceSupplier,
	AcceptanceWaybillDocument,
	AcceptanceWaybillItem,
	AcceptanceWaybillTotals,
	FefoEvaluation,
	FefoStatus,
	OverdraftReconciliationResult,
	VatRate,
} from "./acceptanceWaybillsTypes.js";
import {
	CANONICAL_DENTAL_MATERIAL_TEMPLATES,
	CANONICAL_DENTAL_SUPPLIERS,
	type DentalMaterialTemplate,
} from "./acceptanceWaybillsTemplates.js";

// ---------------------------------------------------------------------------
// ЧИСТЫЕ ФУНКЦИИ ВЫЧИСЛЕНИЯ FEFO И КОПЕЕЧНЫХ СУММ
// ---------------------------------------------------------------------------

/**
 * Рассчитывает количество дней до истечения срока годности.
 */
export function calculateDaysUntilExpiration(
	expirationDateIso: string,
	referenceDateIso?: string,
): number {
	const refDateStr = referenceDateIso || new Date().toISOString().slice(0, 10);
	const target = new Date(`${expirationDateIso.slice(0, 10)}T00:00:00Z`).getTime();
	const ref = new Date(`${refDateStr.slice(0, 10)}T00:00:00Z`).getTime();
	if (Number.isNaN(target) || Number.isNaN(ref)) return 0;
	return Math.round((target - ref) / (1000 * 60 * 60 * 24));
}

/**
 * Оценивает статус партии по регламенту FEFO.
 */
export function calculateFefoStatus(
	expirationDateIso: string,
	referenceDateIso?: string,
): FefoEvaluation {
	const days = calculateDaysUntilExpiration(expirationDateIso, referenceDateIso);

	if (days <= 0) {
		return {
			fefoStatus: "expired",
			badgeLabelRu: "Просрочен",
			hexColor: "var(--red, #ef4444)",
			bgSoft: "rgba(239, 68, 68, 0.12)",
			daysRemaining: days,
		};
	}
	if (days <= 60) {
		return {
			fefoStatus: "critical",
			badgeLabelRu: `FEFO: ${days} дн. (срочно расходовать)`,
			hexColor: "var(--red, #ef4444)",
			bgSoft: "rgba(239, 68, 68, 0.12)",
			daysRemaining: days,
		};
	}
	if (days <= 180) {
		return {
			fefoStatus: "warning",
			badgeLabelRu: `FEFO: ${days} дн. (первая очередь)`,
			hexColor: "var(--amber, #f59e0b)",
			bgSoft: "rgba(245, 158, 11, 0.12)",
			daysRemaining: days,
		};
	}
	return {
		fefoStatus: "fresh",
		badgeLabelRu: `Годен: ${days} дн.`,
		hexColor: "var(--teal, #0d9488)",
		bgSoft: "rgba(13, 148, 136, 0.12)",
		daysRemaining: days,
	};
}

/**
 * Расчет стоимостных показателей строки накладной в целых копейках.
 */
export function calculateItemTotals(params: {
	readonly quantity: number;
	readonly unitPriceKopecks: number;
	readonly vatRate: VatRate;
}): {
	readonly lineSubtotalKopecks: number;
	readonly vatKopecks: number;
	readonly lineTotalKopecks: number;
} {
	const qty = Math.max(0, params.quantity);
	const unitPrice = Math.max(0, Math.round(params.unitPriceKopecks));
	const lineSubtotalKopecks = Math.round(qty * unitPrice);

	const rate = params.vatRate === 20 ? 20 : params.vatRate === 10 ? 10 : 0;
	const vatKopecks = Math.round((lineSubtotalKopecks * rate) / 100);
	const lineTotalKopecks = lineSubtotalKopecks + vatKopecks;

	return {
		lineSubtotalKopecks,
		vatKopecks,
		lineTotalKopecks,
	};
}

/**
 * Сводный расчет итогов по всей накладной.
 */
export function calculateWaybillTotals(
	items: readonly AcceptanceWaybillItem[],
): AcceptanceWaybillTotals {
	let totalQuantity = 0;
	let subtotalKopecks = 0;
	let totalVatKopecks = 0;
	let totalCostKopecks = 0;

	for (const item of items) {
		totalQuantity += item.quantity;
		subtotalKopecks += item.lineSubtotalKopecks;
		totalVatKopecks += item.vatKopecks;
		totalCostKopecks += item.lineTotalKopecks;
	}

	return {
		totalPositions: items.length,
		totalQuantity: Number(totalQuantity.toFixed(3)),
		subtotalKopecks,
		totalVatKopecks,
		totalCostKopecks,
		subtotalRubles: kopecksToRubles(subtotalKopecks),
		totalVatRubles: kopecksToRubles(totalVatKopecks),
		totalCostRubles: kopecksToRubles(totalCostKopecks),
	};
}

/**
 * Создание готовой строки накладной из параметров.
 */
export function createWaybillItem(params: {
	readonly id?: string | undefined;
	readonly inventoryItemId?: string | undefined;
	readonly name: string;
	readonly category?: string | undefined;
	readonly unit?: string | undefined;
	readonly batchNumber: string;
	readonly expirationDate: string;
	readonly manufactureDate?: string | undefined;
	readonly quantity: number;
	readonly unitPriceKopecks: number;
	readonly vatRate?: VatRate | undefined;
	readonly barcode?: string | undefined;
	readonly sku?: string | undefined;
	readonly notes?: string | undefined;
	readonly referenceDateIso?: string | undefined;
}): AcceptanceWaybillItem {
	const vatRate = params.vatRate ?? 0;
	const totals = calculateItemTotals({
		quantity: params.quantity,
		unitPriceKopecks: params.unitPriceKopecks,
		vatRate,
	});
	const fefo = calculateFefoStatus(params.expirationDate, params.referenceDateIso);

	return {
		id: params.id || `item_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
		inventoryItemId: params.inventoryItemId,
		name: params.name.trim(),
		category: params.category || "Материалы",
		unit: params.unit || "шт",
		batchNumber: params.batchNumber.trim(),
		expirationDate: params.expirationDate.trim(),
		manufactureDate: params.manufactureDate?.trim() || undefined,
		quantity: Math.max(0, params.quantity),
		unitPriceKopecks: Math.max(0, Math.round(params.unitPriceKopecks)),
		vatRate,
		lineSubtotalKopecks: totals.lineSubtotalKopecks,
		vatKopecks: totals.vatKopecks,
		lineTotalKopecks: totals.lineTotalKopecks,
		fefoStatus: fefo.fefoStatus,
		daysUntilExpiration: fefo.daysRemaining,
		barcode: params.barcode?.trim() || undefined,
		sku: params.sku?.trim() || undefined,
		notes: params.notes?.trim() || undefined,
	};
}

/**
 * Сортировка позиций по FEFO (первыми идут с ближайшим сроком окончания).
 */
export function sortWaybillItemsByFefo(
	items: readonly AcceptanceWaybillItem[],
	direction: "asc" | "desc" = "asc",
): AcceptanceWaybillItem[] {
	return [...items].sort((a, b) => {
		const diff = a.daysUntilExpiration - b.daysUntilExpiration;
		return direction === "asc" ? diff : -diff;
	});
}

/**
 * Ликвидация мягкого овердрафта (Мандат 8n).
 * При задержке накладной врач у кресла списывает материал в отрицательный остаток.
 * Поступившее количество сначала гасит дефицит, а положительный остаток переходит на склад.
 */
export function reconcileOverdraftOnReceipt(
	stockQuantity: number,
	receivedQuantity: number,
): OverdraftReconciliationResult {
	const previousStock = Number(stockQuantity.toFixed(3));
	const received = Math.max(0, Number(receivedQuantity.toFixed(3)));

	if (previousStock >= 0) {
		return {
			previousStock,
			clearedDeficit: 0,
			newStockQuantity: Number((previousStock + received).toFixed(3)),
			overdraftResolved: false,
		};
	}

	const deficit = Math.abs(previousStock);
	const clearedDeficit = Math.min(deficit, received);
	const newStockQuantity = Number((previousStock + received).toFixed(3));

	return {
		previousStock,
		clearedDeficit,
		newStockQuantity,
		overdraftResolved: true,
	};
}

/**
 * Валидация черновика приходной накладной перед проведением.
 */
export function validateWaybillDraft(waybill: {
	readonly waybillNumber: string;
	readonly receiptDate: string;
	readonly supplier: { readonly name: string; readonly inn?: string | undefined };
	readonly items: readonly AcceptanceWaybillItem[];
}): {
	readonly isValid: boolean;
	readonly errors: readonly string[];
	readonly warnings: readonly string[];
} {
	const errors: string[] = [];
	const warnings: string[] = [];

	if (!waybill.waybillNumber.trim()) {
		errors.push("Укажите номер накладной");
	}
	if (!waybill.receiptDate.trim()) {
		errors.push("Укажите дату прихода");
	}
	if (!waybill.supplier.name.trim()) {
		errors.push("Укажите наименование поставщика");
	}

	if (waybill.supplier.inn) {
		const innClean = waybill.supplier.inn.trim();
		if (innClean.length > 0 && !/^\d{10}(\d{2})?$/.test(innClean)) {
			warnings.push("ИНН поставщика должен состоять из 10 (юрлицо) или 12 (ИП) цифр");
		}
	}

	if (waybill.items.length === 0) {
		errors.push("Накладная не содержит позиций для оприходования");
	}

	for (let i = 0; i < waybill.items.length; i++) {
		const item = waybill.items[i]!;
		const rowNum = i + 1;

		if (!item.name.trim()) {
			errors.push(`Строка ${rowNum}: укажите наименование материала`);
		}
		if (!item.batchNumber.trim()) {
			errors.push(`Строка ${rowNum} (${item.name || "Без названия"}): укажите номер серии / партии`);
		}
		if (!item.expirationDate.trim()) {
			errors.push(`Строка ${rowNum} (${item.name || "Без названия"}): укажите срок годности`);
		} else if (item.fefoStatus === "expired") {
			errors.push(`Строка ${rowNum} (${item.name}): срок годности (${item.expirationDate}) истек. Оприходование просроченных медикаментов запрещено`);
		} else if (item.fefoStatus === "critical") {
			warnings.push(`Строка ${rowNum} (${item.name}): критический остаточный срок (${item.daysUntilExpiration} дн., требуется приоритетное списание FEFO)`);
		}

		if (item.quantity <= 0) {
			errors.push(`Строка ${rowNum} (${item.name}): количество должно быть больше нуля`);
		}
		if (item.unitPriceKopecks < 0) {
			errors.push(`Строка ${rowNum} (${item.name}): цена не может быть отрицательной`);
		}
	}

	return {
		isValid: errors.length === 0,
		errors,
		warnings,
	};
}

// ---------------------------------------------------------------------------
// УТИЛИТЫ ДЕНЕЖНОГО ФОРМАТИРОВАНИЯ
// ---------------------------------------------------------------------------

export { kopecksToRubles, rublesToKopecks } from "@dental/shared";

export function formatRubCurrency(kopecks: number): string {
	const rub = kopecksToRubles(kopecks);
	return new Intl.NumberFormat("ru-RU", {
		style: "currency",
		currency: "RUB",
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(rub);
}

export function formatKopecksToRublesPlain(kopecks: number): string {
	return (kopecks / 100).toFixed(2).replace(".", ",");
}

// ---------------------------------------------------------------------------
// ГЕНЕРАТОРЫ ЧЕРНОВИКОВ И ОБРАЗЦОВЫХ СТОМАТОЛОГИЧЕСКИХ НАКЛАДНЫХ
// ---------------------------------------------------------------------------

/**
 * Инициализирует пустой черновик накладной.
 */
export function createDraftAcceptanceWaybill(
	options?: Partial<AcceptanceWaybillDocument>,
): AcceptanceWaybillDocument {
	const defaultSupplier = CANONICAL_DENTAL_SUPPLIERS[0]!;
	const today = new Date().toISOString().slice(0, 10);
	const docNum = `ПН-${today.replace(/-/g, "").slice(2)}-${Math.floor(100 + Math.random() * 900)}`;

	const items = options?.items || [];
	const totals = calculateWaybillTotals(items);

	return {
		id: options?.id || `wb_${Date.now()}`,
		waybillNumber: options?.waybillNumber || docNum,
		receiptDate: options?.receiptDate || today,
		supplier: options?.supplier || defaultSupplier,
		warehouseId: options?.warehouseId || undefined,
		warehouseName: options?.warehouseName || "Центральный склад клиники",
		status: options?.status || "draft",
		items,
		totals,
		notes: options?.notes || "Оприходование материалов от стоматологического поставщика",
		receiverFullName: options?.receiverFullName || "Васильев О.П.",
		receiverPosition: options?.receiverPosition || "Ответственный за снабжение",
		postedAt: options?.postedAt || undefined,
		postedBy: options?.postedBy || undefined,
	};
}

/**
 * Генерирует эталонную образцовую накладную от «ООО Стомторг»
 * со всеми 6 обязательными стоматологическими позициями задачи.
 */
export function createSampleDentalWaybill(): AcceptanceWaybillDocument {
	const today = new Date().toISOString().slice(0, 10);
	const supplier = CANONICAL_DENTAL_SUPPLIERS[0]!; // ООО "Стомторг"

	// Дата в будущем (+2 года для анестетика, +3 года для композита и т.д.)
	const getFutureDate = (monthsAhead: number) => {
		const d = new Date();
		d.setMonth(d.getMonth() + monthsAhead);
		return d.toISOString().slice(0, 10);
	};

	const items: AcceptanceWaybillItem[] = [
		createWaybillItem({
			id: "item_septanest",
			name: "Септанест с адреналином 1:100 000 (50 карпул/уп)",
			category: "Анестетики",
			unit: "упак",
			batchNumber: "SEPT-2026A18",
			expirationDate: getFutureDate(22),
			quantity: 10,
			unitPriceKopecks: 540000, // 5 400.00 ₽
			vatRate: 0,
			sku: "AN-SEPT-100",
			barcode: "4607001234567",
			notes: "Анестетик артикаинового ряда (Рег. уд. ЛС-002134)",
		}),
		createWaybillItem({
			id: "item_filtek",
			name: "Композит Filtek Z250 шприц 4г (оттенок A2, 3M ESPE)",
			category: "Терапия / Композиты",
			unit: "шт",
			batchNumber: "FLTK-88941",
			expirationDate: getFutureDate(30),
			quantity: 8,
			unitPriceKopecks: 295000, // 2 950.00 ₽
			vatRate: 0,
			sku: "COMP-FLTK-Z250",
			barcode: "4046719001234",
			notes: "Светоотверждаемый пломбировочный материал",
		}),
		createWaybillItem({
			id: "item_optibond",
			name: "Адгезивная система OptiBond FL (набор: праймер 8мл + адгезив 8мл, Kerr)",
			category: "Адгезивы",
			unit: "набор",
			batchNumber: "OPTB-70231",
			expirationDate: getFutureDate(18),
			quantity: 3,
			unitPriceKopecks: 890000, // 8 900.00 ₽
			vatRate: 0,
			sku: "ADH-OPTB-FL",
			barcode: "7611234567890",
			notes: "Золотой стандарт адгезии 4-го поколения",
		}),
		createWaybillItem({
			id: "item_protaper",
			name: "Эндодонтические файлы ProTaper Universal Starter Kit F1-F3 (6 шт/уп)",
			category: "Эндодонтия",
			unit: "упак",
			batchNumber: "PROT-49120",
			expirationDate: getFutureDate(48),
			quantity: 5,
			unitPriceKopecks: 385000, // 3 850.00 ₽
			vatRate: 0,
			sku: "ENDO-PROT-UNI",
			barcode: "4011234567891",
			notes: "Никель-титановые ротационные файлы",
		}),
		createWaybillItem({
			id: "item_saliva",
			name: "Слюноотсосы одноразовые со съемным наконечником (100 шт/уп)",
			category: "Расходные материалы",
			unit: "упак",
			batchNumber: "SLVN-99412",
			expirationDate: getFutureDate(40),
			quantity: 20,
			unitPriceKopecks: 38000, // 380.00 ₽
			vatRate: 0,
			sku: "DISP-SALIV-100",
			barcode: "8001234567892",
			notes: "Медицинские изделия однократного применения",
		}),
		createWaybillItem({
			id: "item_gloves",
			name: "Перчатки смотровые нитриловые неопудренные размер M (100 шт/уп)",
			category: "СИЗ",
			unit: "упак",
			batchNumber: "GLV-2026M09",
			expirationDate: getFutureDate(32),
			quantity: 15,
			unitPriceKopecks: 45000, // 450.00 ₽
			vatRate: 20,
			sku: "PPE-GLV-NITR-M",
			barcode: "4601234567893",
			notes: "Средства индивидуальной защиты персонала",
		}),
	];

	const totals = calculateWaybillTotals(items);

	return {
		id: `wb_sample_${Date.now()}`,
		waybillNumber: "СТ-88412",
		receiptDate: today,
		supplier,
		warehouseId: "wh_main",
		warehouseName: "Главный склад расходных материалов",
		status: "draft",
		items,
		totals,
		notes: "Поставка материалов по договору снабжения №СТ/2026-08 от 12.01.2026",
		receiverFullName: "Васильев О.П.",
		receiverPosition: "Заведующий складом",
	};
}

// ---------------------------------------------------------------------------
// ПЕЧАТНАЯ ФОРМА ТОРГ-12 И ЭКСПОРТ В CSV
// ---------------------------------------------------------------------------

/**
 * Формирует чистую печатную товарную накладную ТОРГ-12 в HTML.
 */
export function generateTorg12Html(
	waybill: AcceptanceWaybillDocument,
	clinicInfo?: { readonly nameRu?: string | undefined; readonly inn?: string | undefined },
): string {
	const clinicName = clinicInfo?.nameRu || "Стоматологическая клиника DENTE";
	const clinicInn = clinicInfo?.inn || "7701987654";

	const rows = waybill.items
		.map((item, idx) => {
			const subtotalRub = (item.lineSubtotalKopecks / 100).toFixed(2);
			const vatRub = (item.vatKopecks / 100).toFixed(2);
			const totalRub = (item.lineTotalKopecks / 100).toFixed(2);
			const unitPriceRub = (item.unitPriceKopecks / 100).toFixed(2);

			return `
			<tr>
				<td style="text-align:center; padding:4px 6px; border:1px solid #000;">${idx + 1}</td>
				<td style="padding:4px 6px; border:1px solid #000;">
					<strong>${item.name}</strong><br>
					<span style="font-size:10px; color:#444;">Серия/партия: ${item.batchNumber} | Срок: ${item.expirationDate} | ${item.category}</span>
				</td>
				<td style="text-align:center; padding:4px 6px; border:1px solid #000;">${item.unit}</td>
				<td style="text-align:right; padding:4px 6px; border:1px solid #000;">${item.quantity}</td>
				<td style="text-align:right; padding:4px 6px; border:1px solid #000;">${unitPriceRub}</td>
				<td style="text-align:right; padding:4px 6px; border:1px solid #000;">${subtotalRub}</td>
				<td style="text-align:center; padding:4px 6px; border:1px solid #000;">${item.vatRate === 0 ? "Без НДС" : `${item.vatRate}%`}</td>
				<td style="text-align:right; padding:4px 6px; border:1px solid #000;">${vatRub}</td>
				<td style="text-align:right; padding:4px 6px; border:1px solid #000; font-weight:bold;">${totalRub}</td>
			</tr>`;
		})
		.join("");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>Товарная накладная № ${waybill.waybillNumber}</title>
	<style>
		body { font-family: 'Times New Roman', Times, serif; font-size: 11pt; color: #000; margin: 20px; line-height: 1.25; }
		table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 10pt; }
		th { background: #f0f0f0; border: 1px solid #000; padding: 4px; font-weight: bold; text-align: center; }
		.header-table td { padding: 3px 0; border: none; font-size: 10pt; }
		.signatures { margin-top: 30px; width: 100%; font-size: 10pt; }
		.signatures td { padding: 10px 0; border: none; }
		@media print { body { margin: 10mm; } }
	</style>
</head>
<body>
	<div style="text-align:right; font-size:9pt; margin-bottom:10px;">
		Унифицированная форма № ТОРГ-12<br>
		Утверждена постановлением Госкомстата России от 25.12.98 № 132
	</div>

	<table class="header-table">
		<tr>
			<td style="width:15%;"><strong>Грузоотправитель:</strong></td>
			<td>${waybill.supplier.name}, ИНН ${waybill.supplier.inn || "—"}</td>
		</tr>
		<tr>
			<td><strong>Поставщик:</strong></td>
			<td>${waybill.supplier.name}, ИНН ${waybill.supplier.inn || "—"}</td>
		</tr>
		<tr>
			<td><strong>Плательщик:</strong></td>
			<td>${clinicName}, ИНН ${clinicInn}</td>
		</tr>
		<tr>
			<td><strong>Грузополучатель:</strong></td>
			<td>${clinicName}, Склад: ${waybill.warehouseName}</td>
		</tr>
	</table>

	<div style="margin: 15px 0 10px 0; text-align: center;">
		<h2 style="margin: 0; font-size: 14pt;">ТОВАРНАЯ НАКЛАДНАЯ № ${waybill.waybillNumber}</h2>
		<div style="font-size: 11pt; font-weight: bold;">от ${waybill.receiptDate} г.</div>
	</div>

	<table>
		<thead>
			<tr>
				<th style="width:4%;">№</th>
				<th style="width:38%;">Товар (наименование, серия, срок годности)</th>
				<th style="width:6%;">Ед.</th>
				<th style="width:7%;">Кол-во</th>
				<th style="width:11%;">Цена, руб.</th>
				<th style="width:11%;">Сумма без НДС</th>
				<th style="width:7%;">НДС</th>
				<th style="width:8%;">Сумма НДС</th>
				<th style="width:12%;">Сумма с НДС, руб.</th>
			</tr>
		</thead>
		<tbody>
			${rows}
			<tr style="font-weight:bold; background:#fafafa;">
				<td colspan="3" style="text-align:right; padding:6px; border:1px solid #000;">ИТОГО:</td>
				<td style="text-align:right; padding:6px; border:1px solid #000;">${waybill.totals.totalQuantity}</td>
				<td style="border:1px solid #000;"></td>
				<td style="text-align:right; padding:6px; border:1px solid #000;">${(waybill.totals.subtotalKopecks / 100).toFixed(2)}</td>
				<td style="border:1px solid #000;"></td>
				<td style="text-align:right; padding:6px; border:1px solid #000;">${(waybill.totals.totalVatKopecks / 100).toFixed(2)}</td>
				<td style="text-align:right; padding:6px; border:1px solid #000;">${(waybill.totals.totalCostKopecks / 100).toFixed(2)}</td>
			</tr>
		</tbody>
	</table>

	<table class="signatures">
		<tr>
			<td style="width:50%;">
				<strong>Отпустил (Поставщик):</strong><br><br>
				_________________ / _________________ /<br>
				<span style="font-size:8pt; color:#666;">подпись, расшифровка</span>
			</td>
			<td style="width:50%;">
				<strong>Принял (Получатель):</strong><br><br>
				${waybill.receiverPosition} ______________ / ${waybill.receiverFullName} /<br>
				<span style="font-size:8pt; color:#666;">подпись, расшифровка (Материально ответственное лицо)</span>
			</td>
		</tr>
	</table>
</body>
</html>`;
}

/**
 * Экспорт накладной в CSV с разделителем точка с запятой и кодировкой UTF-8.
 */
export function exportWaybillToCsv(waybill: AcceptanceWaybillDocument): string {
	const headers = [
		"№",
		"Наименование",
		"Категория",
		"Ед.изм.",
		"Серия_Партия",
		"Срок_годности",
		"Количество",
		"Цена_руб",
		"Сумма_без_НДС_руб",
		"Ставка_НДС",
		"Сумма_НДС_руб",
		"Всего_с_НДС_руб",
		"FEFO_Статус",
		"Дней_до_срока",
		"Штрихкод",
	];

	const rows = waybill.items.map((item, idx) => [
		idx + 1,
		`"${item.name.replace(/"/g, '""')}"`,
		`"${item.category.replace(/"/g, '""')}"`,
		item.unit,
		`"${item.batchNumber.replace(/"/g, '""')}"`,
		item.expirationDate,
		item.quantity,
		(item.unitPriceKopecks / 100).toFixed(2),
		(item.lineSubtotalKopecks / 100).toFixed(2),
		`${item.vatRate}%`,
		(item.vatKopecks / 100).toFixed(2),
		(item.lineTotalKopecks / 100).toFixed(2),
		item.fefoStatus,
		item.daysUntilExpiration,
		item.barcode || "",
	]);

	const csvContent = [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\r\n");
	return `\uFEFF${csvContent}`;
}
