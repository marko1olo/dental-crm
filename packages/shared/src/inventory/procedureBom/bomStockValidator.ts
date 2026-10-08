import {
	generatePurchaseOrderId,
	generatePurchaseOrderNumber,
} from "../../utils/idGenerators.js";
import type {
	CabinetStockItem,
	LowStockAlert,
	ResolvedMaterialRequirement,
	SupplierPurchaseOrder,
	SupplierPurchaseOrderItem,
} from "./types.js";

/**
 * Pure function: Generates a 1-click supplier purchase order draft from critical alerts or shortfalls.
 */
export function generateSupplierPurchaseOrder(params: {
	alerts?: readonly LowStockAlert[] | undefined;
	requirements?: readonly ResolvedMaterialRequirement[] | undefined;
	stock?: readonly CabinetStockItem[] | undefined;
	visitId?: string | undefined;
	clinicNameRu?: string | undefined;
	reorderBufferMultiplier?: number | undefined;
}): SupplierPurchaseOrder | null {
	const clinicName = params.clinicNameRu || "Стоматологическая клиника DENTE";
	const bufferMultiplier = params.reorderBufferMultiplier ?? 2;
	const dateStr = new Date().toISOString().slice(0, 10);
	const orderNumber = generatePurchaseOrderNumber(new Date().getFullYear(), {
		seedKey: params.visitId ?? dateStr,
	});

	const itemsMap = new Map<string, SupplierPurchaseOrderItem>();

	const stockMap = new Map<string, CabinetStockItem>();
	if (params.stock) {
		for (const s of params.stock) {
			stockMap.set(s.sku.trim().toUpperCase(), s);
		}
	}

	const reqMap = new Map<string, ResolvedMaterialRequirement>();
	if (params.requirements) {
		for (const r of params.requirements) {
			reqMap.set(r.sku.trim().toUpperCase(), r);
		}
	}

	// 1. Ingest low stock alerts (critical out-of-stock or warning)
	if (params.alerts) {
		for (const alert of params.alerts) {
			const skuKey = alert.sku.trim().toUpperCase();
			if (itemsMap.has(skuKey)) continue;

			const stock = stockMap.get(skuKey);
			const req = reqMap.get(skuKey);

			const currentStock = alert.remainingQuantity;
			const threshold = alert.minThresholdQuantity;
			const shortfall = req ? req.shortfallQuantity : 0;
			const unit = req?.unitOfMeasure ?? stock?.unitOfMeasure ?? "pcs";

			// Determine suggested order quantity (ensuring minimum batch and safety buffer)
			let suggested = 0;
			if (unit === "pcs" || unit === "carpule" || unit === "pack" || unit === "tube" || unit === "dose") {
				suggested = Math.max(Math.ceil(threshold * bufferMultiplier), Math.ceil(shortfall + threshold), 1);
			} else {
				suggested = Number(Math.max(threshold * bufferMultiplier, shortfall + threshold, 1).toFixed(2));
			}

			const unitCostKopecks =
				stock?.costKopecks ??
				(req && req.totalQuantityRequired > 0
					? Math.round(req.totalEstimatedCostKopecks / req.totalQuantityRequired)
					: 10000);
			const totalCostKopecks = Math.round(suggested * unitCostKopecks);

			itemsMap.set(skuKey, {
				sku: alert.sku,
				nameRu: alert.nameRu,
				category: req?.category ?? "Расходные материалы",
				unitOfMeasure: unit,
				currentStock,
				minThreshold: threshold,
				shortfallQuantity: shortfall,
				suggestedOrderQuantity: suggested,
				estimatedUnitCostKopecks: unitCostKopecks,
				totalCostKopecks,
				totalCostFormattedRu: `${(totalCostKopecks / 100).toLocaleString("ru-RU", {
					minimumFractionDigits: 2,
					maximumFractionDigits: 2,
				})} ₽`,
			});
		}
	}

	// 2. Ingest unmet requirements with shortfall
	if (params.requirements) {
		for (const req of params.requirements) {
			const skuKey = req.sku.trim().toUpperCase();
			if (itemsMap.has(skuKey) || req.shortfallQuantity <= 0) continue;

			const stock = stockMap.get(skuKey);
			const currentStock = req.currentStockQuantity;
			const threshold = stock ? stock.minThresholdQuantity : 1;
			const shortfall = req.shortfallQuantity;
			const unit = req.unitOfMeasure;

			let suggested = 0;
			if (unit === "pcs" || unit === "carpule" || unit === "pack" || unit === "tube" || unit === "dose") {
				suggested = Math.max(Math.ceil(threshold * bufferMultiplier), Math.ceil(shortfall + threshold), 1);
			} else {
				suggested = Number(Math.max(threshold * bufferMultiplier, shortfall + threshold, 1).toFixed(2));
			}

			const unitCostKopecks =
				stock?.costKopecks ??
				(req.totalQuantityRequired > 0
					? Math.round(req.totalEstimatedCostKopecks / req.totalQuantityRequired)
					: 10000);
			const totalCostKopecks = Math.round(suggested * unitCostKopecks);

			itemsMap.set(skuKey, {
				sku: req.sku,
				nameRu: req.nameRu,
				category: req.category,
				unitOfMeasure: unit,
				currentStock,
				minThreshold: threshold,
				shortfallQuantity: shortfall,
				suggestedOrderQuantity: suggested,
				estimatedUnitCostKopecks: unitCostKopecks,
				totalCostKopecks,
				totalCostFormattedRu: `${(totalCostKopecks / 100).toLocaleString("ru-RU", {
					minimumFractionDigits: 2,
					maximumFractionDigits: 2,
				})} ₽`,
			});
		}
	}

	const items = Array.from(itemsMap.values());
	if (items.length === 0) return null;

	let totalOrderCostKopecks = 0;
	for (const item of items) {
		totalOrderCostKopecks += item.totalCostKopecks;
	}

	const hasDeficit = items.some((i) => i.shortfallQuantity > 0 || i.currentStock === 0);

	return {
		id: generatePurchaseOrderId(),
		orderNumber,
		orderDate: dateStr,
		...(params.visitId ? { visitId: params.visitId } : {}),
		clinicNameRu: clinicName,
		reason: hasDeficit ? "stock_deficit" : "critical_threshold_breach",
		items,
		totalItemsCount: items.length,
		totalOrderCostKopecks,
		totalOrderCostFormattedRu: `${(totalOrderCostKopecks / 100).toLocaleString("ru-RU", {
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		})} ₽`,
		status: "draft",
	};
}

/**
 * Formats a SupplierPurchaseOrder into plain text representation for email/clipboard.
 */
export function formatSupplierPurchaseOrderText(order: SupplierPurchaseOrder): string {
	const lines = [
		`================================================================================`,
		`ЗАКАЗ ПОСТАВЩИКУ МЕДИЦИНСКИХ РАСХОДНЫХ МАТЕРИАЛОВ`,
		`Номер документа: ${order.orderNumber}`,
		`Дата формирования: ${order.orderDate}`,
		`Заказчик: ${order.clinicNameRu}`,
		`Причина формирования: ${
			order.reason === "stock_deficit"
				? "Ликвидация дефицита материалов (неснижаемый остаток исчерпан)"
				: order.reason === "critical_threshold_breach"
					? "Срабатывание алерта критического неснижаемого остатка"
					: "Плановое пополнение запасов"
		}`,
		...(order.visitId ? [`Связанный прием/визит: ${order.visitId}`] : []),
		`================================================================================`,
		`СПЕЦИФИКАЦИЯ МАТЕРИАЛОВ К ЗАКАЗУ:`,
		`--------------------------------------------------------------------------------`,
	];

	order.items.forEach((item, idx) => {
		lines.push(
			`${idx + 1}. [${item.sku}] ${item.nameRu}`,
			`   Категория: ${item.category} | Ед. изм.: ${item.unitOfMeasure}`,
			`   Текущий остаток: ${item.currentStock} | Порог нормы: ${item.minThreshold} | Дефицит: ${item.shortfallQuantity}`,
			`   Рекомендуемый заказ: ${item.suggestedOrderQuantity} ${item.unitOfMeasure} × ${(item.estimatedUnitCostKopecks / 100).toFixed(2)} ₽ = ${item.totalCostFormattedRu}`,
			`--------------------------------------------------------------------------------`,
		);
	});

	lines.push(
		`ВСЕГО ПОЗИЦИЙ К ЗАКАЗУ: ${order.totalItemsCount}`,
		`ИТОГОВАЯ ОРИЕНТИРОВОЧНАЯ СТОИМОСТЬ: ${order.totalOrderCostFormattedRu} (${order.totalOrderCostKopecks} коп.)`,
		`================================================================================`,
		`Сформировано автоматически системой DENTE CRM (модуль Auto-BOM Inventory).`,
	);

	return lines.join("\n");
}

/**
 * Generates an official print-ready HTML document for the Supplier Purchase Order.
 */
export function generateSupplierPurchaseOrderHtml(order: SupplierPurchaseOrder): string {
	const tableRows = order.items
		.map(
			(item, idx) => `
		<tr>
			<td style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: center;">${idx + 1}</td>
			<td style="border: 1px solid #cbd5e1; padding: 6px 8px; font-family: monospace; font-size: 11px;">${item.sku}</td>
			<td style="border: 1px solid #cbd5e1; padding: 6px 8px; font-weight: 600;">${item.nameRu}</td>
			<td style="border: 1px solid #cbd5e1; padding: 6px 8px;">${item.category}</td>
			<td style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: center;">${item.unitOfMeasure}</td>
			<td style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: right;">${item.currentStock}</td>
			<td style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: right; color: #b91c1c; font-weight: bold;">${item.shortfallQuantity > 0 ? item.shortfallQuantity : "—"}</td>
			<td style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: right; font-weight: bold; background-color: #f0fdf4;">${item.suggestedOrderQuantity}</td>
			<td style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: right;">${(item.estimatedUnitCostKopecks / 100).toFixed(2)} ₽</td>
			<td style="border: 1px solid #cbd5e1; padding: 6px 8px; text-align: right; font-weight: bold;">${item.totalCostFormattedRu}</td>
		</tr>`,
		)
		.join("");

	return `<!DOCTYPE html>
<html lang="ru">
<head>
	<meta charset="utf-8">
	<title>Заказ поставщику ${order.orderNumber}</title>
	<style>
		body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 24px; color: #0f172a; font-size: 13px; line-height: 1.4; }
		h1 { font-size: 18px; margin: 0 0 4px; text-transform: uppercase; letter-spacing: 0.5px; }
		.meta-box { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; }
		table { width: 100%; border-collapse: collapse; margin-top: 12px; }
		th { background-color: #f1f5f9; border: 1px solid #94a3b8; padding: 8px; font-size: 12px; font-weight: 600; text-align: left; }
		.total-box { margin-top: 16px; padding: 12px; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 4px; display: flex; justify-content: flex-end; gap: 32px; font-size: 15px; }
		.signatures { margin-top: 40px; display: flex; justify-content: space-between; padding: 0 20px; }
		.sig-line { width: 220px; border-top: 1px solid #000; text-align: center; font-size: 11px; padding-top: 4px; }
		@media print { body { margin: 0; } }
	</style>
</head>
<body>
	<div class="meta-box">
		<div>
			<h1>Заказ поставщику расходных материалов</h1>
			<div><strong>Документ №:</strong> ${order.orderNumber} от ${order.orderDate}</div>
			<div><strong>Организация (Заказчик):</strong> ${order.clinicNameRu}</div>
		</div>
		<div style="text-align: right;">
			<div><strong>Основание:</strong> ${order.reason === "stock_deficit" ? "Дефицит материалов" : "Пополнение неснижаемого запаса"}</div>
			${order.visitId ? `<div><strong>Прием:</strong> ${order.visitId}</div>` : ""}
			<div><strong>Статус:</strong> Проект (Сформирован в 1 клик)</div>
		</div>
	</div>

	<table>
		<thead>
			<tr>
				<th style="width: 30px; text-align: center;">№</th>
				<th style="width: 100px;">Артикул</th>
				<th>Наименование материала</th>
				<th style="width: 110px;">Категория</th>
				<th style="width: 50px; text-align: center;">Ед.</th>
				<th style="width: 60px; text-align: right;">Остаток</th>
				<th style="width: 60px; text-align: right;">Дефицит</th>
				<th style="width: 70px; text-align: right;">Заказ</th>
				<th style="width: 90px; text-align: right;">Цена за ед.</th>
				<th style="width: 100px; text-align: right;">Сумма</th>
			</tr>
		</thead>
		<tbody>
			${tableRows}
		</tbody>
	</table>

	<div class="total-box">
		<div>Всего позиций: <strong>${order.totalItemsCount}</strong></div>
		<div>Итого к оплате: <strong style="color: #047857; font-size: 16px;">${order.totalOrderCostFormattedRu}</strong></div>
	</div>

	<div class="signatures">
		<div>
			<div style="height: 30px;"></div>
			<div class="sig-line">Ответственный за закупку (ФИО / Подпись)</div>
		</div>
		<div>
			<div style="height: 30px;"></div>
			<div class="sig-line">Главная медицинская сестра / Зав. складом</div>
		</div>
		<div>
			<div style="height: 30px;"></div>
			<div class="sig-line">Руководитель клиники / Главврач</div>
		</div>
	</div>
</body>
</html>`;
}
