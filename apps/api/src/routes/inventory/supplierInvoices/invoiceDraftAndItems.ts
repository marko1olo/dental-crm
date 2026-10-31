import { and, eq, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../../accessGuard.js";
import { db } from "../../../db/client.js";
import { inventoryItems, inventoryTransactions, stockBatches } from "../../../db/schema.js";

export const registerSupplierInvoiceQueries = (server: FastifyInstance): void => {
	// =========================================================================
	// РЕЕСТР ПРИХОДНЫХ НАКЛАДНЫХ И ТРАНЗАКЦИЙ ТМЦ (Мандаты 8n, 8x, 8wy)
	// =========================================================================

	const registerGetWaybills = (path: string) => {
		server.get<{
			Params?: { organizationId?: string };
			Querystring?: { limit?: string; offset?: string; search?: string };
		}>(path, async (request, reply) => {
			const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
				request,
				reply,
				"inventory get waybills",
			);
			if (!resolvedOrgId) return;

			const targetOrgId = request.params?.organizationId || resolvedOrgId;
			if (targetOrgId !== resolvedOrgId) {
				return reply.code(403).send({ error: "Forbidden" });
			}

			// Получаем приходные транзакции ТМЦ
			const receipts = await db
				.select({
					transactionId: inventoryTransactions.id,
					createdAt: inventoryTransactions.createdAt,
					notes: inventoryTransactions.notes,
					quantity: inventoryTransactions.quantityChanged,
					unitCostRub: inventoryTransactions.unitCostRub,
					itemId: inventoryTransactions.itemId,
					itemName: inventoryItems.name,
					itemUnit: inventoryItems.unit,
					itemCategory: inventoryItems.category,
					itemSku: inventoryItems.sku,
					batchId: inventoryTransactions.batchId,
					batchNumber: stockBatches.batchNumber,
					expirationDate: stockBatches.expirationDate,
				})
				.from(inventoryTransactions)
				.leftJoin(inventoryItems, eq(inventoryTransactions.itemId, inventoryItems.id))
				.leftJoin(stockBatches, eq(inventoryTransactions.batchId, stockBatches.id))
				.where(
					and(
						eq(inventoryTransactions.organizationId, targetOrgId),
						eq(inventoryTransactions.transactionType, "receipt"),
					),
				)
				.orderBy(sql`${inventoryTransactions.createdAt} DESC`)
				.limit(200);

			// Группируем транзакции по накладным на основе примечания (notes)
			const waybillsMap = new Map<
				string,
				{
					id: string;
					waybillNumber: string;
					supplierName: string;
					supplierInn: string | null;
					receiptDate: string;
					createdAt: string;
					items: Array<{
						id: string;
						inventoryItemId?: string | undefined;
						name: string;
						category: string;
						unit: string;
						batchNumber: string;
						expirationDate: string;
						quantity: number;
						unitPriceKopecks: number;
						vatRate: number;
						lineSubtotalKopecks: number;
						vatKopecks: number;
						lineTotalKopecks: number;
						sku?: string | undefined;
					}>;
				}
			>();

			for (const r of receipts) {
				const notesStr = r.notes || "";
				// Парсинг номера накладной и поставщика из формата:
				// "Накладная №{waybillNumber} от {supplierName} (ИНН {supplierInn}) • Партия {batchNumber} [FEFO]"
				let waybillNumber = "ПРХ-001";
				let supplierName = "Стоматологический поставщик";
				let supplierInn: string | null = null;

				const wbMatch = notesStr.match(
					/(?:Приход по накладной|Накладная) №(.+?) от (.+?)(?:\s*\(ИНН\s*([^)]+)\))?(?:\s*•|\s*$)/i,
				);
				if (wbMatch) {
					waybillNumber = wbMatch[1]?.trim() || waybillNumber;
					supplierName = wbMatch[2]?.trim() || supplierName;
					supplierInn = wbMatch[3]?.trim() || null;
				}

				const receiptDate = r.createdAt
					? new Date(r.createdAt).toISOString().slice(0, 10)
					: new Date().toISOString().slice(0, 10);
				const groupKey = `${waybillNumber}__${supplierName}__${receiptDate}`;

				if (!waybillsMap.has(groupKey)) {
					waybillsMap.set(groupKey, {
						id: `wb-${r.transactionId}`,
						waybillNumber,
						supplierName,
						supplierInn,
						receiptDate,
						createdAt: r.createdAt
							? new Date(r.createdAt).toISOString()
							: new Date().toISOString(),
						items: [],
					});
				}

				const group = waybillsMap.get(groupKey)!;
				const qty = Math.abs(Number(r.quantity) || 1);
				const costRub = Number(r.unitCostRub) || 0;
				const unitPriceKopecks = Math.round(costRub * 100);
				const subtotalKopecks = Math.round(qty * unitPriceKopecks);

				group.items.push({
					id: r.transactionId,
					...(r.itemId ? { inventoryItemId: r.itemId } : {}),
					name: r.itemName || "Материал стоматологический",
					category: r.itemCategory || "material",
					unit: r.itemUnit || "шт",
					batchNumber: r.batchNumber || "ПАРТИЯ-01",
					expirationDate: r.expirationDate || "2027-12-31",
					quantity: qty,
					unitPriceKopecks,
					vatRate: 0,
					lineSubtotalKopecks: subtotalKopecks,
					vatKopecks: 0,
					lineTotalKopecks: subtotalKopecks,
					...(r.itemSku ? { sku: r.itemSku } : {}),
				});
			}

			// Формируем итоговые документы
			const waybills = Array.from(waybillsMap.values()).map((wb) => {
				let totalQuantity = 0;
				let subtotalKopecks = 0;
				let totalCostKopecks = 0;

				for (const it of wb.items) {
					totalQuantity += it.quantity;
					subtotalKopecks += it.lineSubtotalKopecks;
					totalCostKopecks += it.lineTotalKopecks;
				}

				return {
					id: wb.id,
					waybillNumber: wb.waybillNumber,
					receiptDate: wb.receiptDate,
					supplier: {
						id: `sup-${wb.supplierName}`,
						name: wb.supplierName,
						inn: wb.supplierInn || "7701984512",
					},
					warehouseName: "Основной склад",
					status: "posted" as const,
					items: wb.items,
					totals: {
						totalPositions: wb.items.length,
						totalQuantity: Number(totalQuantity.toFixed(3)),
						subtotalKopecks,
						totalVatKopecks: 0,
						totalCostKopecks,
						subtotalRubles: Number((subtotalKopecks / 100).toFixed(2)),
						totalVatRubles: 0,
						totalCostRubles: Number((totalCostKopecks / 100).toFixed(2)),
					},
					receiverFullName: "Ответственный за снабжение",
					receiverPosition: "Зав. складом",
					postedAt: wb.createdAt,
				};
			});

			return reply.send({
				success: true,
				total: waybills.length,
				waybills,
			});
		});
	};

	registerGetWaybills("/:organizationId/waybills");
	registerGetWaybills("/waybills");
	registerGetWaybills("/:organizationId/invoices");
	registerGetWaybills("/invoices");
};
