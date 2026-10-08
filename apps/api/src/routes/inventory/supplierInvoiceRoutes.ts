import { and, eq, inArray, sql } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";
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

	// POST /:organizationId/acceptance-waybill
	server.post<{
		Params: { organizationId: string };
		Body: z.infer<typeof acceptanceWaybillBodySchema>;
	}>("/:organizationId/acceptance-waybill", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory acceptance waybill",
		);
		if (!resolvedOrgId) return;

		const { organizationId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		return handleAcceptanceWaybillRequest(
			organizationId,
			request.body,
			request,
			reply,
		);
	});

	// POST /acceptance-waybill
	server.post<{
		Body: z.infer<typeof acceptanceWaybillBodySchema> & {
			organizationId?: string;
		};
	}>("/acceptance-waybill", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory acceptance waybill",
		);
		if (!resolvedOrgId) return;

		const body =
			(request.body as { organizationId?: string } | undefined) ?? {};
		const targetOrgId = body.organizationId || resolvedOrgId;
		if (targetOrgId !== resolvedOrgId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		return handleAcceptanceWaybillRequest(
			targetOrgId,
			request.body,
			request,
			reply,
		);
	});
};
