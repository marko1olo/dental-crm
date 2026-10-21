import { and, eq, inArray, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import type { z } from "zod";
import { requireResolvedStaffOrAdminOrganizationId } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import {
	inventoryItems,
	inventoryTransactions,
	stockBatches,
} from "../../db/schema.js";
import { getRequestIdentity } from "../../security/identity.js";
import {
	getDefaultExpirationDate,
	normalizeDateToIso,
} from "../../services/inventory/fefoStockService.js";
import { acceptanceWaybillBodySchema } from "./types.js";

export const supplierInvoiceRoutes: FastifyPluginAsync = async (
	server: FastifyInstance,
) => {
	// =========================================================================
	// ACCEPTANCE WAYBILLS & SUPPLIER BATCH RECEIPT (Мандаты 8e, 8k, 8n, 8s)
	// =========================================================================

	const handleAcceptanceWaybillRequest = async (
		targetOrgId: string,
		rawBody: unknown,
		request: any,
		reply: any,
	) => {
		const parsed = acceptanceWaybillBodySchema.safeParse(rawBody);
		if (!parsed.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message:
					parsed.error.errors[0]?.message ||
					"Неверные данные приходной накладной",
				details: parsed.error.errors,
			});
		}

		const data = parsed.data;
		const identity = getRequestIdentity(request);
		const userContext = request.user;
		const effectiveUserId = identity.userId ?? userContext?.id ?? null;

		try {
			const result = await db.transaction(async (tx) => {
				// Идемпотентность складских операций (Мандаты 8e, 8n, 8s):
				// Защита от дублирования при повторном клике по кнопке проведения
				if (data.waybillNumber && data.supplierName) {
					const existingTransactions = await tx
						.select({
							id: inventoryTransactions.id,
							notes: inventoryTransactions.notes,
						})
						.from(inventoryTransactions)
						.where(
							and(
								eq(inventoryTransactions.organizationId, targetOrgId),
								eq(inventoryTransactions.transactionType, "receipt"),
								sql`${inventoryTransactions.notes} LIKE ${`%накладной №${data.waybillNumber} от ${data.supplierName}%`}`,
							),
						)
						.limit(1);

					if (existingTransactions.length > 0) {
						return {
							success: true,
							alreadyProcessed: true,
							waybillNumber: data.waybillNumber,
							supplierName: data.supplierName,
							supplierInn: data.supplierInn ?? null,
							receiptDate: data.receiptDate,
							warehouseId: data.warehouseId ?? null,
							warehouseName: data.warehouseName ?? "Основной склад",
							totalPositions: data.items.length,
							totalQuantity: data.items.reduce((acc, it) => acc + it.quantity, 0),
							totalCostKopecks: 0,
							totalVatKopecks: 0,
							totalCostRubles: 0,
							overdraftResolvedCount: 0,
							items: [],
							message: `Накладная №${data.waybillNumber} от ${data.supplierName} уже была проведена ранее (идемпотентный ответ)`,
						};
					}
				}

				const processedItems: Array<{
					inventoryItemId: string;
					name: string;
					batchId?: string | undefined;
					batchNumber: string;
					expirationDate: string;
					quantity: number;
					remainingInBatch: number;
					previousStock: number;
					newStock: number;
					overdraftExtinguished: boolean;
					clearedDeficit: number;
				}> = [];
				let totalCostKopecks = 0;
				let totalVatKopecks = 0;
				let totalQuantity = 0;
				let overdraftResolvedCount = 0;

				// Пакетная предварительная загрузка номенклатуры (устранение N+1)
				const requestedItemIds = Array.from(
					new Set(
						data.items
							.map((i) => i.inventoryItemId)
							.filter((id): id is string => typeof id === "string" && id.trim().length > 0),
					),
				);
				const requestedNames = Array.from(
					new Set(
						data.items
							.map((i) => i.name?.trim().toLowerCase())
							.filter((n): n is string => typeof n === "string" && n.length > 0),
					),
				);

				const preloadedById = new Map<string, typeof inventoryItems.$inferSelect>();
				const preloadedByName = new Map<string, typeof inventoryItems.$inferSelect>();

				if (requestedItemIds.length > 0) {
					const foundById = await tx
						.select()
						.from(inventoryItems)
						.where(
							and(
								eq(inventoryItems.organizationId, targetOrgId),
								inArray(inventoryItems.id, requestedItemIds),
							),
						)
						.for("update");
					for (const it of foundById) {
						preloadedById.set(it.id, it);
						preloadedByName.set(it.name.toLowerCase().trim(), it);
					}
				}

				if (requestedNames.length > 0) {
					const foundByName = await tx
						.select()
						.from(inventoryItems)
						.where(
							and(
								eq(inventoryItems.organizationId, targetOrgId),
								sql`lower(${inventoryItems.name}) = ANY(${requestedNames})`,
							),
						)
						.for("update");
					for (const it of foundByName) {
						preloadedById.set(it.id, it);
						preloadedByName.set(it.name.toLowerCase().trim(), it);
					}
				}

				for (const item of data.items) {
					totalQuantity += item.quantity;
					const pricePerUnitRub =
						item.purchasePricePerUnit != null
							? item.purchasePricePerUnit
							: item.purchasePriceKopecks != null
								? item.purchasePriceKopecks / 100
								: 0;
					const priceKopecks =
						item.purchasePriceKopecks != null
							? item.purchasePriceKopecks
							: Math.round(pricePerUnitRub * 100);

					const itemSubtotalKopecks = Math.round(item.quantity * priceKopecks);
					const vatRate = item.vatRate ?? 0;
					const itemVatKopecks = Math.round((itemSubtotalKopecks * vatRate) / 100);
					const itemTotalKopecks = itemSubtotalKopecks + itemVatKopecks;

					totalCostKopecks += itemTotalKopecks;
					totalVatKopecks += itemVatKopecks;

					// 1. Поиск или создание карточки номенклатуры из кэша
					let targetItemId = item.inventoryItemId;
					let existingItem: typeof inventoryItems.$inferSelect | undefined;

					if (targetItemId) {
						existingItem = preloadedById.get(targetItemId);
					}

					if (!existingItem && item.name?.trim()) {
						existingItem = preloadedByName.get(item.name.trim().toLowerCase());
					}

					if (!existingItem) {
						const [createdItem] = await tx
							.insert(inventoryItems)
							.values({
								organizationId: targetOrgId,
								name: item.name.trim(),
								category: item.category || "material",
								unit: item.unit || "шт",
								stockQuantity: "0",
								currentQty: "0",
								criticalThreshold: "5",
								unitCostRub: String(pricePerUnitRub),
								pricePerUnit: String(pricePerUnitRub),
								lotNumber: item.batchNumber || item.lotNumber || null,
								expirationDate:
									normalizeDateToIso(item.expirationDate) ||
									getDefaultExpirationDate(),
								barcode: item.barcode?.trim() || null,
								sku: item.sku?.trim() || null,
							})
							.returning();
						existingItem = createdItem;
					}

					if (!existingItem) {
						throw new Error(`Не удалось создать материал "${item.name}"`);
					}
					targetItemId = existingItem.id;
					preloadedById.set(existingItem.id, existingItem);
					preloadedByName.set(existingItem.name.toLowerCase().trim(), existingItem);

					// 2. Ликвидация мягкого овердрафта (Мандат 8n):
					const currentStock = Number(
						existingItem.stockQuantity ?? existingItem.currentQty ?? 0,
					);
					const deficit = currentStock < 0 ? Math.abs(currentStock) : 0;
					if (deficit > 0) {
						overdraftResolvedCount++;
					}
					const remainingInBatch = Math.max(
						0,
						Number((item.quantity - deficit).toFixed(3)),
					);
					const isDepletedByDeficit = remainingInBatch <= 0;

					const batchNumber =
						(item.batchNumber || item.lotNumber || "").trim() ||
						`LOT-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
					const expirationDate =
						normalizeDateToIso(item.expirationDate) || getDefaultExpirationDate();
					const manufactureDate = normalizeDateToIso(item.manufactureDate);

					// 3. Создаем партию FEFO в stock_batches
					const [createdBatch] = await tx
						.insert(stockBatches)
						.values({
							organizationId: targetOrgId,
							warehouseId: data.warehouseId ?? null,
							inventoryItemId: targetItemId,
							batchNumber,
							expirationDate,
							manufactureDate: manufactureDate ?? null,
							initialQty: String(item.quantity),
							remainingQty: String(remainingInBatch),
							purchasePricePerUnit: String(pricePerUnitRub),
							status: isDepletedByDeficit ? "depleted" : "active",
							barcode: item.barcode?.trim() || null,
						})
						.returning();

					// 4. Обновляем остаток в карточке номенклатуры
					const newStock = Number((currentStock + item.quantity).toFixed(3));
					const shouldUpdateCardDate =
						!existingItem.expirationDate ||
						expirationDate < existingItem.expirationDate;

					await tx
						.update(inventoryItems)
						.set({
							stockQuantity: String(newStock),
							currentQty: String(newStock),
							unitCostRub: String(pricePerUnitRub),
							pricePerUnit: String(pricePerUnitRub),
							...(shouldUpdateCardDate ? { expirationDate } : {}),
							...(item.barcode ? { barcode: item.barcode.trim() } : {}),
							...(item.sku ? { sku: item.sku.trim() } : {}),
							lotNumber: batchNumber,
							updatedAt: new Date(),
						})
						.where(
							and(
								eq(inventoryItems.id, targetItemId),
								eq(inventoryItems.organizationId, targetOrgId),
							),
						);

					// 5. Фиксируем транзакцию прихода в inventory_transactions
					await tx.insert(inventoryTransactions).values({
						organizationId: targetOrgId,
						itemId: targetItemId,
						inventoryItemId: targetItemId,
						batchId: createdBatch?.id ?? null,
						warehouseId: data.warehouseId ?? null,
						quantityChanged: String(item.quantity),
						qty: String(item.quantity),
						unitCostRub: String(pricePerUnitRub),
						transactionType: "receipt",
						isOverdraft: false,
						notes: `Накладная №${data.waybillNumber} от ${data.supplierName}${data.supplierInn ? ` (ИНН ${data.supplierInn})` : ""} • Партия ${batchNumber} [FEFO]`,
						userId: effectiveUserId,
					});

					processedItems.push({
						inventoryItemId: targetItemId,
						name: existingItem.name,
						batchId: createdBatch?.id,
						batchNumber,
						expirationDate,
						quantity: item.quantity,
						remainingInBatch,
						previousStock: currentStock,
						newStock,
						overdraftExtinguished: deficit > 0,
						clearedDeficit: deficit,
					});
				}

				return {
					success: true,
					waybillNumber: data.waybillNumber,
					supplierName: data.supplierName,
					supplierInn: data.supplierInn ?? null,
					receiptDate: data.receiptDate,
					warehouseId: data.warehouseId ?? null,
					warehouseName: data.warehouseName ?? "Основной склад",
					totalPositions: processedItems.length,
					totalQuantity,
					totalCostKopecks,
					totalVatKopecks,
					totalCostRubles: Number((totalCostKopecks / 100).toFixed(2)),
					overdraftResolvedCount,
					items: processedItems,
				};
			});

			return reply.status(201).send(result);
		} catch (error) {
			request.log.error(error, "Failed to accept waybill");
			const msg =
				error instanceof Error
					? error.message
					: "Не удалось оприходовать накладную";
			return reply.status(400).send({
				error: "AcceptanceWaybillFailed",
				message: msg,
			});
		}
	};

	// POST /:organizationId/acceptance-waybill & POST /:organizationId/waybills (Dual-Route Parity)
	const handlePostWaybill = async (
		request: FastifyRequest<{
			Params?: { organizationId?: string };
			Body: z.infer<typeof acceptanceWaybillBodySchema> & { organizationId?: string };
		}>,
		reply: FastifyReply,
	) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory acceptance waybill",
		);
		if (!resolvedOrgId) return;

		const body = (request.body as { organizationId?: string } | undefined) ?? {};
		const targetOrgId = request.params?.organizationId || body.organizationId || resolvedOrgId;
		if (targetOrgId !== resolvedOrgId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		return handleAcceptanceWaybillRequest(
			targetOrgId,
			request.body,
			request,
			reply,
		);
	};

	server.post("/:organizationId/acceptance-waybill", handlePostWaybill);
	server.post("/acceptance-waybill", handlePostWaybill);
	server.post("/:organizationId/waybills", handlePostWaybill);
	server.post("/waybills", handlePostWaybill);
	server.post("/:organizationId/invoices", handlePostWaybill);
	server.post("/invoices", handlePostWaybill);

	// GET /:organizationId/waybills & GET /waybills
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
			const waybillsMap = new Map<string, {
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
			}>();

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

				const receiptDate = r.createdAt ? new Date(r.createdAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
				const groupKey = `${waybillNumber}__${supplierName}__${receiptDate}`;

				if (!waybillsMap.has(groupKey)) {
					waybillsMap.set(groupKey, {
						id: `wb-${r.transactionId}`,
						waybillNumber,
						supplierName,
						supplierInn,
						receiptDate,
						createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
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
