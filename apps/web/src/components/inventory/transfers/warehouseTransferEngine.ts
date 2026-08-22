/**
 * ============================================================================
 * WAREHOUSE TRANSFER, TORG-13 & DISCREPANCY ACT ENGINE
 * Математическое и учетное ядро межфилиальных перемещений ТМЦ, формирования
 * накладных ТОРГ-13 (ОКУД 0330213), актов расхождений ТОРГ-2 и копеечного баланса.
 * ============================================================================
 */

import {
	getWarehouseBranch,
	getWarehouseItemCatalogPreset,
	type WarehouseBranchDefinition,
	type WarehouseBranchId,
	type WarehouseTransferStatus,
} from "./warehouseTransferPresets.js";

export interface WarehouseTransferLineItem {
	readonly itemId: string;
	readonly sku: string;
	readonly nameRu: string;
	readonly unitRu: string;
	readonly okeiCode: string;
	readonly batchNumber: string;
	readonly expiryDate: string;
	readonly requestedQuantity: number;
	readonly dispatchedQuantity: number;
	readonly receivedQuantity: number;
	readonly unitCostKopecks: number;
	readonly discrepancyType?: "none" | "shortage" | "surplus" | "damaged" | "expired" | undefined;
	readonly discrepancyQuantity?: number | undefined;
	readonly discrepancyNotes?: string | undefined;
}

export interface WarehouseTransferDocument {
	readonly id: string;
	readonly documentNumber: string;
	readonly documentDate: string;
	readonly sourceBranchId: WarehouseBranchId;
	readonly targetBranchId: WarehouseBranchId;
	readonly status: WarehouseTransferStatus;
	readonly items: readonly WarehouseTransferLineItem[];
	readonly dispatchedByFullName: string;
	readonly dispatchedByPosition: string;
	readonly dispatchedDate?: string | undefined;
	readonly receivedByFullName: string;
	readonly receivedByPosition: string;
	readonly receivedDate?: string | undefined;
	readonly transportDriverFullName?: string | undefined;
	readonly transportVehiclePlate?: string | undefined;
	readonly notes?: string | undefined;
}

export interface DiscrepancyLineReport {
	readonly item: WarehouseTransferLineItem;
	readonly shortageQty: number;
	readonly damagedQty: number;
	readonly surplusQty: number;
	readonly financialDamageKopecks: number;
	readonly financialDamageRubles: number;
	readonly causeRu: string;
}

export interface WarehouseDiscrepancyAct {
	readonly actNumber: string;
	readonly actDate: string;
	readonly transferDocNumber: string;
	readonly sourceBranch: WarehouseBranchDefinition;
	readonly targetBranch: WarehouseBranchDefinition;
	readonly discrepancyItems: readonly DiscrepancyLineReport[];
	readonly totalFinancialDamageKopecks: number;
	readonly totalFinancialDamageRubles: number;
	readonly totalDiscrepantItemsCount: number;
	readonly commissionMembers: readonly { readonly name: string; readonly position: string }[];
}

export interface TransferTotalsSummary {
	readonly totalRequestedQuantity: number;
	readonly totalDispatchedQuantity: number;
	readonly totalReceivedQuantity: number;
	readonly totalDispatchedCostKopecks: number;
	readonly totalReceivedCostKopecks: number;
	readonly totalDispatchedCostRubles: number;
	readonly totalReceivedCostRubles: number;
	readonly totalDiscrepancyDamageKopecks: number;
	readonly totalDiscrepancyDamageRubles: number;
	readonly hasDiscrepancy: boolean;
}

/**
 * Преобразование копеек в рубли
 */
export function kopecksToRubles(kopecks: number): number {
	return Math.round(kopecks) / 100;
}

/**
 * Преобразование рублей в копейки
 */
export function rublesToKopecks(rubles: number): number {
	return Math.round(rubles * 100);
}

/**
 * Форматирование суммы в рублях
 */
export function formatRubCurrency(rublesOrKopecks: number, isKopecks = false): string {
	const rub = isKopecks ? kopecksToRubles(rublesOrKopecks) : rublesOrKopecks;
	return new Intl.NumberFormat("ru-RU", {
		style: "currency",
		currency: "RUB",
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	}).format(rub);
}

/**
 * 1. Расчет сводных итогов перемещения с копеечной точностью
 */
export function calculateTransferTotals(
	items: readonly WarehouseTransferLineItem[],
): TransferTotalsSummary {
	let totalRequestedQuantity = 0;
	let totalDispatchedQuantity = 0;
	let totalReceivedQuantity = 0;
	let totalDispatchedCostKopecks = 0;
	let totalReceivedCostKopecks = 0;
	let totalDiscrepancyDamageKopecks = 0;
	let hasDiscrepancy = false;

	for (const item of items) {
		const reqQty = Math.max(0, item.requestedQuantity);
		const dispQty = Math.max(0, item.dispatchedQuantity);
		const recQty = Math.max(0, item.receivedQuantity);

		totalRequestedQuantity += reqQty;
		totalDispatchedQuantity += dispQty;
		totalReceivedQuantity += recQty;

		totalDispatchedCostKopecks += Math.round(dispQty * item.unitCostKopecks);
		totalReceivedCostKopecks += Math.round(recQty * item.unitCostKopecks);

		const diff = dispQty - recQty;
		const isDiscrepant =
			item.discrepancyType && item.discrepancyType !== "none" ||
			diff !== 0;

		if (isDiscrepant) {
			hasDiscrepancy = true;
			const discQty = Math.abs(diff);
			totalDiscrepancyDamageKopecks += Math.round(discQty * item.unitCostKopecks);
		}
	}

	return {
		totalRequestedQuantity,
		totalDispatchedQuantity,
		totalReceivedQuantity,
		totalDispatchedCostKopecks,
		totalReceivedCostKopecks,
		totalDispatchedCostRubles: kopecksToRubles(totalDispatchedCostKopecks),
		totalReceivedCostRubles: kopecksToRubles(totalReceivedCostKopecks),
		totalDiscrepancyDamageKopecks,
		totalDiscrepancyDamageRubles: kopecksToRubles(totalDiscrepancyDamageKopecks),
		hasDiscrepancy,
	};
}

/**
 * 2. Валидатор партии перемещения
 */
export function validateTransferDraft(
	sourceBranchId: WarehouseBranchId,
	targetBranchId: WarehouseBranchId,
	items: readonly WarehouseTransferLineItem[],
	stockByBranch?: Record<WarehouseBranchId, Record<string, number>> | undefined,
): {
	isValid: boolean;
	errors: string[];
	warnings: string[];
} {
	const errors: string[] = [];
	const warnings: string[] = [];

	if (sourceBranchId === targetBranchId) {
		errors.push("Склад-отправитель и склад-получатель не могут совпадать.");
	}

	if (!items || items.length === 0) {
		errors.push("Накладная перемещения должна содержать хотя бы одну товарную позицию.");
	}

	const now = new Date().toISOString().slice(0, 10);

	for (const item of items) {
		if (item.requestedQuantity <= 0 && item.dispatchedQuantity <= 0) {
			errors.push(`Товар «${item.nameRu}» имеет нулевое или отрицательное количество.`);
		}

		if (!item.batchNumber || item.batchNumber.trim().length === 0) {
			warnings.push(`Для товара «${item.nameRu}» не указан номер производственной серии (LOT).`);
		}

		if (item.expiryDate && item.expiryDate < now) {
			errors.push(`Срок годности товара «${item.nameRu}» истек (${item.expiryDate}). Перемещение просроченных ТМЦ запрещено!`);
		}

		// Проверка доступности остатка на складе-отправителе
		if (stockByBranch && stockByBranch[sourceBranchId]) {
			const currentStock = stockByBranch[sourceBranchId]?.[item.itemId] ?? 0;
			const requiredQty = item.dispatchedQuantity > 0 ? item.dispatchedQuantity : item.requestedQuantity;
			if (requiredQty > currentStock) {
				errors.push(`Недостаточно остатка товара «${item.nameRu}» на складе ${getWarehouseBranch(sourceBranchId).nameRu}: требуется ${requiredQty}, доступно ${currentStock}.`);
			}
		}
	}

	return {
		isValid: errors.length === 0,
		errors,
		warnings,
	};
}

/**
 * 3. Формирование Акта о расхождениях (ТОРГ-2 / ТОРГ-3)
 */
export function generateDiscrepancyAct(
	doc: WarehouseTransferDocument,
	commission?: readonly { name: string; position: string }[] | undefined,
): WarehouseDiscrepancyAct {
	const discrepancyItems: DiscrepancyLineReport[] = [];
	let totalFinancialDamageKopecks = 0;

	for (const item of doc.items) {
		const diff = item.dispatchedQuantity - item.receivedQuantity;
		const hasType = item.discrepancyType && item.discrepancyType !== "none";

		if (diff !== 0 || hasType) {
			const shortageQty = diff > 0 ? diff : 0;
			const surplusQty = diff < 0 ? Math.abs(diff) : 0;
			const damagedQty = item.discrepancyType === "damaged" ? (item.discrepancyQuantity || shortageQty) : 0;

			const damageKopecks = Math.round((shortageQty + damagedQty) * item.unitCostKopecks);
			totalFinancialDamageKopecks += damageKopecks;

			let cause = item.discrepancyNotes || "";
			if (!cause) {
				if (shortageQty > 0) cause = `Недостача при вскрытии опломбированной тары (${shortageQty} ${item.unitRu})`;
				else if (damagedQty > 0) cause = `Нарушение целостности вторичной упаковки / бой при транспортировке`;
				else if (surplusQty > 0) cause = `Излишек / пересортица при комплектации склада (+${surplusQty} ${item.unitRu})`;
			}

			discrepancyItems.push({
				item,
				shortageQty,
				damagedQty,
				surplusQty,
				financialDamageKopecks: damageKopecks,
				financialDamageRubles: kopecksToRubles(damageKopecks),
				causeRu: cause,
			});
		}
	}

	const sourceBranch = getWarehouseBranch(doc.sourceBranchId);
	const targetBranch = getWarehouseBranch(doc.targetBranchId);

	const defaultCommission = commission && commission.length > 0 ? commission : [
		{ name: targetBranch.responsiblePersonRu, position: targetBranch.responsiblePositionRu },
		{ name: doc.receivedByFullName, position: doc.receivedByPosition },
		{ name: doc.transportDriverFullName || "Курьер доставки", position: "Экспедитор" },
	];

	return {
		actNumber: `АКТ-РАСХ-${doc.documentNumber.replace(/[^0-9]/g, "").slice(-6) || "001"}`,
		actDate: doc.receivedDate || new Date().toISOString().slice(0, 10),
		transferDocNumber: doc.documentNumber,
		sourceBranch,
		targetBranch,
		discrepancyItems,
		totalFinancialDamageKopecks,
		totalFinancialDamageRubles: kopecksToRubles(totalFinancialDamageKopecks),
		totalDiscrepantItemsCount: discrepancyItems.length,
		commissionMembers: defaultCommission,
	};
}

/**
 * 4. Экспорт журнала перемещений в CSV (RFC 4180 с UTF-8 BOM)
 */
export function exportTransferJournalToCsv(docs: readonly WarehouseTransferDocument[]): string {
	const headers = [
		"№ документа",
		"Дата",
		"Склад-отправитель",
		"Склад-получатель",
		"Статус",
		"Кол-во наименований",
		"Отпущено (кол-во)",
		"Принято (кол-во)",
		"Сумма отпущенная, руб.",
		"Сумма принятая, руб.",
		"Сумма расхождений, руб.",
		"Отпустил",
		"Принял",
	];

	const rows = docs.map((doc) => {
		const totals = calculateTransferTotals(doc.items);
		const source = getWarehouseBranch(doc.sourceBranchId);
		const target = getWarehouseBranch(doc.targetBranchId);

		return [
			`"${doc.documentNumber}"`,
			doc.documentDate,
			`"${source.nameRu}"`,
			`"${target.nameRu}"`,
			`"${doc.status}"`,
			doc.items.length.toString(),
			totals.totalDispatchedQuantity.toString(),
			totals.totalReceivedQuantity.toString(),
			totals.totalDispatchedCostRubles.toFixed(2),
			totals.totalReceivedCostRubles.toFixed(2),
			totals.totalDiscrepancyDamageRubles.toFixed(2),
			`"${doc.dispatchedByFullName}"`,
			`"${doc.receivedByFullName}"`,
		];
	});

	const csvContent = [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\r\n");
	return `\uFEFF${csvContent}`;
}

/**
 * 5. Генератор официальной печатной формы ТОРГ-13 (ОКУД 0330213)
 */
export function generateTorg13Html(doc: WarehouseTransferDocument): string {
	const source = getWarehouseBranch(doc.sourceBranchId);
	const target = getWarehouseBranch(doc.targetBranchId);
	const totals = calculateTransferTotals(doc.items);

	const rowsHtml = doc.items
		.map((item, index) => {
			const unitCostRub = kopecksToRubles(item.unitCostKopecks);
			const totalCostRub = (item.dispatchedQuantity * item.unitCostKopecks) / 100;

			return `<tr>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${index + 1}</td>
				<td style="border: 1px solid #000; padding: 4px;">${item.nameRu}</td>
				<td style="border: 1px solid #000; padding: 4px; font-family: monospace; text-align: center;">${item.sku}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${item.batchNumber}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${item.expiryDate || "—"}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${item.unitRu} (${item.okeiCode})</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: right; font-weight: bold;">${item.dispatchedQuantity}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: right;">${unitCostRub.toFixed(2)}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: right; font-weight: bold;">${totalCostRub.toFixed(2)}</td>
			</tr>`;
		})
		.join("\n");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>Накладная на внутреннее перемещение ТОРГ-13 № ${doc.documentNumber}</title>
	<style>
		@page { size: A4 landscape; margin: 10mm; }
		body { font-family: 'Times New Roman', serif; font-size: 9pt; line-height: 1.2; color: #000; }
		.header-box { display: flex; justify-content: space-between; margin-bottom: 8px; }
		.okud { text-align: right; font-size: 8pt; }
		.title { text-align: center; font-weight: bold; font-size: 12pt; margin: 6px 0; text-transform: uppercase; }
		table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
		th { border: 1px solid #000; padding: 4px; background: #f0f0f0; font-size: 8pt; text-align: center; }
		.signatures { display: flex; justify-content: space-between; margin-top: 20px; }
		.sign-box { width: 45%; }
	</style>
</head>
<body>
	<div class="header-box">
		<div>
			<strong>Организация:</strong> ООО «Стоматологическая клиника ДЕНТЕ»<br>
			<strong>Структурное подразделение (Отправитель):</strong> ${source.nameRu} (Код: ${source.code})<br>
			<strong>Структурное подразделение (Получатель):</strong> ${target.nameRu} (Код: ${target.code})
		</div>
		<div class="okud">
			Унифицированная форма № ТОРГ-13<br>
			Форма по ОКУД <strong>0330213</strong><br>
			по ОКПО <strong>${source.okpoCode}</strong>
		</div>
	</div>

	<div class="title">НАКЛАДНАЯ НА ВНУТРЕННЕЕ ПЕРЕМЕЩЕНИЕ, ПЕРЕДАЧУ ТОВАРОВ, ТАРЫ № ${doc.documentNumber}</div>
	<div style="text-align: center; margin-bottom: 10px;">Дата составления: <strong>${doc.documentDate} г.</strong></div>

	<table>
		<thead>
			<tr>
				<th rowspan="2">№</th>
				<th rowspan="2">Наименование товара, материала</th>
				<th rowspan="2">Артикул (SKU)</th>
				<th rowspan="2">Серия (LOT)</th>
				<th rowspan="2">Срок годности</th>
				<th rowspan="2">Ед. изм.</th>
				<th colspan="3">Отпущено</th>
			</tr>
			<tr>
				<th>Количество</th>
				<th>Цена, руб.</th>
				<th>Сумма, руб.</th>
			</tr>
		</thead>
		<tbody>
			${rowsHtml}
			<tr style="font-weight: bold; background: #f8f8f8;">
				<td colspan="6" style="border: 1px solid #000; padding: 4px; text-align: right;">ИТОГО ПО НАКЛАДНОЙ:</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: right;">${totals.totalDispatchedQuantity}</td>
				<td style="border: 1px solid #000; padding: 4px;"></td>
				<td style="border: 1px solid #000; padding: 4px; text-align: right;">${totals.totalDispatchedCostRubles.toFixed(2)}</td>
			</tr>
		</tbody>
	</table>

	<p>Всего отпущено <strong>${doc.items.length}</strong> наименований на общую сумму <strong>${totals.totalDispatchedCostRubles.toFixed(2)} руб.</strong></p>

	<div class="signatures">
		<div class="sign-box">
			<strong>ОТПУСТИЛ (Склад-отправитель):</strong><br>
			${doc.dispatchedByPosition}<br>
			________________ / ${doc.dispatchedByFullName} /<br>
			Дата: ${doc.dispatchedDate || doc.documentDate} г.
		</div>
		<div class="sign-box">
			<strong>ПРИНЯЛ (Склад-получатель):</strong><br>
			${doc.receivedByPosition}<br>
			________________ / ${doc.receivedByFullName} /<br>
			Дата: ${doc.receivedDate || doc.documentDate} г.
		</div>
	</div>
</body>
</html>`;
}

/**
 * 6. Генератор официального печатного Акта о расхождениях ТОРГ-2
 */
export function generateTorg2Html(act: WarehouseDiscrepancyAct): string {
	const rowsHtml = act.discrepancyItems
		.map((item, index) => {
			return `<tr>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${index + 1}</td>
				<td style="border: 1px solid #000; padding: 4px;">${item.item.nameRu}</td>
				<td style="border: 1px solid #000; padding: 4px; font-family: monospace; text-align: center;">${item.item.sku}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: center;">${item.item.batchNumber}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: right;">${item.item.dispatchedQuantity}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: right;">${item.item.receivedQuantity}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: right; color: #b91c1c; font-weight: bold;">${item.shortageQty || "—"}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: right; color: #b91c1c; font-weight: bold;">${item.damagedQty || "—"}</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: right; font-weight: bold;">${item.financialDamageRubles.toFixed(2)}</td>
				<td style="border: 1px solid #000; padding: 4px; font-size: 8pt;">${item.causeRu}</td>
			</tr>`;
		})
		.join("\n");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>Акт об установленном расхождении № ${act.actNumber}</title>
	<style>
		@page { size: A4 landscape; margin: 10mm; }
		body { font-family: 'Times New Roman', serif; font-size: 9pt; line-height: 1.2; color: #000; }
		.title { text-align: center; font-weight: bold; font-size: 12pt; margin-bottom: 6px; text-transform: uppercase; }
		table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
		th { border: 1px solid #000; padding: 4px; background: #f0f0f0; font-size: 8pt; text-align: center; }
		.signatures { display: flex; justify-content: space-between; margin-top: 20px; }
	</style>
</head>
<body>
	<div class="title">АКТ ОБ УСТАНОВЛЕННОМ РАСХОЖДЕНИИ ПО КОЛИЧЕСТВУ И КАЧЕСТВУ ТМЦ № ${act.actNumber}</div>
	<div style="text-align: center; margin-bottom: 10px;">
		к Накладной на внутреннее перемещение № <strong>${act.transferDocNumber}</strong> от <strong>${act.actDate} г.</strong>
	</div>

	<p>
		<strong>Отправитель:</strong> ${act.sourceBranch.nameRu}<br>
		<strong>Получатель:</strong> ${act.targetBranch.nameRu}<br>
		Комиссия в составе представителей Получателя и Экспедитора составила настоящий акт о том, что при приемке ТМЦ выявлены следующие расхождения:
	</p>

	<table>
		<thead>
			<tr>
				<th>№</th>
				<th>Наименование товара</th>
				<th>Артикул</th>
				<th>Серия (LOT)</th>
				<th>По накладной</th>
				<th>Фактически принято</th>
				<th>Недостача</th>
				<th>Бой / Брак</th>
				<th>Сумма ущерба, руб.</th>
				<th>Причина / Характер расхождения</th>
			</tr>
		</thead>
		<tbody>
			${rowsHtml}
			<tr style="font-weight: bold; background: #f8f8f8;">
				<td colspan="8" style="border: 1px solid #000; padding: 4px; text-align: right;">ИТОГО СУММА УЩЕРБА:</td>
				<td style="border: 1px solid #000; padding: 4px; text-align: right; color: #b91c1c;">${act.totalFinancialDamageRubles.toFixed(2)}</td>
				<td style="border: 1px solid #000; padding: 4px;"></td>
			</tr>
		</tbody>
	</table>

	<p><strong>Заключение комиссии:</strong> Сумма выявленного ущерба составляет <strong>${act.totalFinancialDamageRubles.toFixed(2)} руб.</strong> Подлежит урегулированию между складом-отправителем и службой логистики.</p>

	<div class="signatures">
		${act.commissionMembers
			.map(
				(m) => `<div>
			<strong>${m.position}:</strong><br>
			________________ / ${m.name} /
		</div>`,
			)
			.join("\n")}
	</div>
</body>
</html>`;
}
