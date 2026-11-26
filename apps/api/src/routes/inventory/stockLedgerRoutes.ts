import { isValidUuid, kopecksToRubles } from "@dental/shared";
import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../accessGuard.js";
import { withTenantCtx } from "../../db/rls.js";
import { inventoryItems, inventoryTransactions } from "../../db/schema.js";
import { getRequestIdentity } from "../../security/identity.js";
import {
	fefoStockService,
	getDefaultExpirationDate,
} from "../../services/inventory/fefoStockService.js";
import { InsufficientStockError } from "../../services/treatmentConsumablesService.js";
import { inventoryStockBodySchema } from "./types.js";

async function handleStockAdjustment(
	request: FastifyRequest<{
		Params: { organizationId?: string; itemId: string };
		Body: { adjustment: number };
	}>,
	reply: FastifyReply,
	explicitOrgId?: string,
) {
	const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
		request,
		reply,
		"inventory adjust stock",
	);
	if (!resolvedOrgId) return;

	const organizationId = explicitOrgId ?? request.params.organizationId ?? resolvedOrgId;
	if (!isValidUuid(organizationId) || !isValidUuid(request.params.itemId)) {
		return reply.status(400).send({
			error: "ValidationError",
			message: "Некорректный UUID организации или материала",
		});
	}
	if (resolvedOrgId !== organizationId) {
		return reply.code(403).send({ error: "Forbidden" });
	}

	const { itemId } = request.params;

	const parsedStock = inventoryStockBodySchema.safeParse(request.body);
	if (!parsedStock.success) {
		return reply.status(400).send({
			error: "AdjustmentInvalid",
			message:
				"Количество для склада не разобрано: его нужно указать числом, например 10 для прихода или 10 для списания. Исправьте количество и повторите.",
		});
	}
	const { adjustment } = parsedStock.data;
	if (adjustment === 0) {
		return reply.status(400).send({
			error: "AdjustmentZero",
			message:
				"Количество не указано: ни приход, ни списание не может быть нулевым. Укажите, сколько штук пришло или списано, и повторите.",
		});
	}

	// Read-modify-write on stock must be atomic: lock row FOR UPDATE
	const result = await withTenantCtx(organizationId, async (tx) => {
		const [item] = await tx
			.select()
			.from(inventoryItems)
			.where(
				and(
					eq(inventoryItems.id, itemId),
					eq(inventoryItems.organizationId, organizationId),
				),
			)
			.limit(1)
			.for("update");

		if (!item) return { notFound: true as const };

		const currentStock = Number(item.stockQuantity ?? 0);
		const actualAdjustment = adjustment;

		// Мандат 8s & 8e: если это приход товара (actualAdjustment > 0),
		// проводим его через партионный учет FEFO (receiveBatch),
		// чтобы физически создать запись в stock_batches и ликвидировать
		// накопленный технический дефицит/овердрафт, если остаток был отрицательным.
		if (actualAdjustment > 0) {
			const userContext = request.user;
			const identity = getRequestIdentity(request);
			const effectiveUserId = identity.userId ?? userContext?.id ?? null;
			const batchNumber =
				parsedStock.data.batchNumber ||
				parsedStock.data.lotNumber ||
				item.lotNumber ||
				`BATCH-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
			const expirationDate =
				parsedStock.data.expirationDate ||
				item.expirationDate ||
				getDefaultExpirationDate();
			const itemCostKop = item.unitCostKopecks ?? item.pricePerUnitKopecks;
			const purchasePrice =
				parsedStock.data.purchasePricePerUnit != null
					? parsedStock.data.purchasePricePerUnit
					: itemCostKop != null
						? kopecksToRubles(itemCostKop)
						: item.unitCostRub != null
							? Number(item.unitCostRub)
							: undefined;

			const createdBatch = await fefoStockService.receiveBatch(tx, {
				organizationId,
				inventoryItemId: itemId,
				batchNumber,
				expirationDate,
				manufactureDate: parsedStock.data.manufactureDate || undefined,
				quantity: actualAdjustment,
				purchasePricePerUnit: purchasePrice,
				barcode: parsedStock.data.barcode || item.barcode || undefined,
				userId: effectiveUserId,
				notes:
					parsedStock.data.reason ||
					`Поступление товара по складу (+${actualAdjustment} ед.)`,
			});

			const [updated] = await tx
				.select()
				.from(inventoryItems)
				.where(
					and(
						eq(inventoryItems.id, itemId),
						eq(inventoryItems.organizationId, organizationId),
					),
				)
				.limit(1);

			return { updated: updated ?? item, isOverdraft: false, batch: createdBatch };
		}

		const newStock = currentStock + actualAdjustment;
		const isOverdraft = newStock < 0;
		const identity = getRequestIdentity(request);
		const hasClinicalReason = Boolean(
			parsedStock.data.isClinicalOperation === true ||
				parsedStock.data.visitId,
		);
		// Мандат 8n & Soft Negative Stock: овердрафт разрешен всегда
		// во всех списаниях склада, чтобы никогда не блокировать работу врача у кресла (Мандат 8e).
		const isAllowedOverdraft = true;

		// Списание со склада (actualAdjustment < 0) — автоматический FEFO партионный учет
		if (actualAdjustment < 0) {
			const requiredQty = Math.abs(actualAdjustment);
			const userContext = request.user;
			const effectiveUserId = identity.userId ?? userContext?.id ?? null;

			let fefoResult: Awaited<ReturnType<typeof fefoStockService.deductFefo>>;
			try {
				fefoResult = await fefoStockService.deductFefo(tx, {
					organizationId,
					inventoryItemId: itemId,
					requiredQty,
					allowOverdraft: isAllowedOverdraft,
					notes:
						parsedStock.data.reason ||
						(hasClinicalReason
							? `Списание под операцию/приём (мягкий минусовой овердрафт партии, накладная ещё не внесена: дефицит ${Math.abs(newStock)} ед.)`
							: "Списание со склада (FEFO)"),
					userId: effectiveUserId,
					transactionType: hasClinicalReason
						? "treatment_consumable"
						: (isOverdraft ? "emergency_overdraft" : "manual_adjust"),
				});
			} catch (err) {
				if (err instanceof InsufficientStockError) {
					// Fallback: при ошибке жесткого остатка проводим мягкий овердрафт
					const fallbackStock = Number((currentStock - requiredQty).toFixed(4));
					await tx
						.update(inventoryItems)
						.set({ stockQuantity: String(fallbackStock), currentQty: String(fallbackStock), updatedAt: new Date() })
						.where(and(eq(inventoryItems.id, itemId), eq(inventoryItems.organizationId, organizationId)));
					const [fallbackUpdated] = await tx
						.select()
						.from(inventoryItems)
						.where(and(eq(inventoryItems.id, itemId), eq(inventoryItems.organizationId, organizationId)))
						.limit(1);
					return { updated: fallbackUpdated ?? item, isOverdraft: true, isNegativeStock: fallbackStock < 0 };
				}
				throw err;
			}

			const [updated] = await tx
				.select()
				.from(inventoryItems)
				.where(
					and(
						eq(inventoryItems.id, itemId),
						eq(inventoryItems.organizationId, organizationId),
					),
				)
				.limit(1);

			const finalUpdated = updated ?? item;
			const isNegative = Number(finalUpdated.stockQuantity ?? 0) < 0;
			return { updated: finalUpdated, isOverdraft: fefoResult.isOverdraft || isNegative, isNegativeStock: isNegative };
		}

		const [updated] = await tx
			.update(inventoryItems)
			.set({
				stockQuantity: String(newStock),
				currentQty: String(newStock),
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(inventoryItems.id, itemId),
					eq(inventoryItems.organizationId, organizationId),
				),
			)
			.returning();

		const finalUpdated = updated ?? item;
		const isNegative = Number(finalUpdated.stockQuantity ?? 0) < 0;
		return { updated: finalUpdated, isOverdraft: isNegative, isNegativeStock: isNegative };
	});

	if ("notFound" in result)
		return reply.status(404).send({
			error: "ItemNotFound",
			message:
				"Этот материал на складе клиники не найден: возможно, его уже удалили из списка. Обновите список склада и повторите — если материал нужен, добавьте его заново.",
		});
	const stockQtyNum = Number(result.updated.stockQuantity ?? 0);
	if (result.isOverdraft || stockQtyNum < 0) {
		const deficit = stockQtyNum < 0 ? Math.abs(stockQtyNum) : 0;
		return {
			...result.updated,
			isOverdraft: true,
			isNegativeStock: stockQtyNum < 0,
			deficit,
			requiresReplenishment: stockQtyNum <= 0,
			warning: `Зафиксирован мягкий овердрафт (остаток: ${stockQtyNum} ед., списание проведено без блокировки врача/персонала). Требуется довнести приходную накладную.`,
			warningMessage: `Мягкий овердрафт: остаток ${stockQtyNum} ед. (дефицит: ${deficit}). Процедура не заблокирована, закупщику сформировано уведомление.`,
		};
	}
	return result.updated;
}

export const stockLedgerRoutes: FastifyPluginAsync = async (
	server: FastifyInstance,
) => {
	// PATCH adjust stock quantity (staff/admin only)
	server.patch<{
		Params: { organizationId: string; itemId: string };
		Body: { adjustment: number };
	}>("/:organizationId/:itemId/stock", async (request, reply) => {
		return handleStockAdjustment(request, reply, request.params.organizationId);
	});

	// Dual-Route Parity: unparameterized route using session / token organizationId (Mandate 8n)
	server.patch<{
		Params: { itemId: string };
		Body: { adjustment: number };
	}>("/:itemId/stock", async (request, reply) => {
		return handleStockAdjustment(request, reply);
	});
};
