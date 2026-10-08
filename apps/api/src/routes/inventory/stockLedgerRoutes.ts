import { and, eq } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { requireResolvedStaffOrAdminOrganizationId } from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { inventoryItems, inventoryTransactions } from "../../db/schema.js";
import { getRequestIdentity } from "../../security/identity.js";
import {
	fefoStockService,
	getDefaultExpirationDate,
} from "../../services/inventory/fefoStockService.js";
import { InsufficientStockError } from "../../services/inventory/materialDeduction.js";
import { inventoryStockBodySchema } from "./types.js";

export const stockLedgerRoutes: FastifyPluginAsync = async (
	server: FastifyInstance,
) => {
	// PATCH adjust stock quantity (staff/admin only, never below 0)
	server.patch<{
		Params: { organizationId: string; itemId: string };
		Body: { adjustment: number };
	}>("/:organizationId/:itemId/stock", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"inventory adjust stock",
		);
		if (!resolvedOrgId) return;

		const { organizationId, itemId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

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
			// БЫЛО: ноль проходил как 200 с обновлённой строкой, при этом строка в
			// журнал движений не писалась вовсе (условие actualAdjustment !== 0
			// ниже). То есть сервер отвечал успехом на запрос, который не сделал
			// ничего, и кладовщик читал «Остаток изменён» на неизменённом остатке.
			return reply.status(400).send({
				error: "AdjustmentZero",
				message:
					"Количество не указано: ни приход, ни списание не может быть нулевым. Укажите, сколько штук пришло или списано, и повторите.",
			});
		}

		// Read-modify-write on stock must be atomic: two concurrent PATCHes would
		// otherwise both read the same currentStock, compute newStock from the stale
		// value, and write absolute quantities — losing one adjustment (lost update)
		// and potentially driving stock negative despite the clamp. Lock the row
		// FOR UPDATE inside a transaction so the second writer blocks until the first
		// commits and then re-reads the fresh value.
		const result = await db.transaction(async (tx) => {
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
				const purchasePrice =
					parsedStock.data.purchasePricePerUnit != null
						? parsedStock.data.purchasePricePerUnit
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
			const isClinicalRole =
				identity.role === "doctor" ||
				identity.role === "assistant" ||
				identity.role === "nurse" ||
				identity.role === "senior_nurse" ||
				identity.role === "owner" ||
				identity.role === "admin" ||
				identity.role === "chief_doctor" ||
				request.user?.role === "doctor" ||
				request.user?.role === "assistant" ||
				request.user?.role === "nurse" ||
				request.user?.role === "senior_nurse" ||
				request.user?.role === "owner" ||
				request.user?.role === "admin" ||
				request.user?.role === "chief_doctor";
			const isClinicalCategory =
				item.category === "anesthesia" ||
				item.category === "anesthetic" ||
				item.category === "consumable" ||
				item.category === "consumables" ||
				item.category === "ppe" ||
				item.category === "composite" ||
				item.category === "surgery" ||
				item.category === "hygiene" ||
				item.category === "auxiliary" ||
				item.category === "material" ||
				item.category === "medication" ||
				item.category === "dental" ||
				item.category === "general" ||
				item.category === "orthodontic" ||
				item.category === "orthopedic" ||
				item.category === "endodontic" ||
				item.category === "disinfection" ||
				item.category === "Расходные материалы" ||
				item.category === "Анестетики" ||
				item.category === "Медикаменты" ||
				item.category === "Шовный материал" ||
				item.category === "Перевязочные средства" ||
				item.category === "СИЗ" ||
				item.category === "Дезинфекция" ||
				item.category === "Пломбировочные материалы" ||
				item.category === "Эндодонтия" ||
				item.category === "Ортопедия" ||
				item.category === "Хирургия";
			const isClinicalOperation =
				isClinicalRole ||
				isClinicalCategory ||
				parsedStock.data.isClinicalOperation === true ||
				Boolean(
					parsedStock.data.reason &&
						/(операци|лечени|при[её]м|визит|дефицит|экстрен|карпул|анесте|расход|списан)/i.test(
							parsedStock.data.reason,
						),
				) ||
				Boolean(
					item.name &&
						/(карпул|анесте|ультракаин|септодонт|септанест|септонест|скандонест|убистезин|артикаин|мепивакаин|лидокаин|бупивакаин|перчатк|маск|игла|валик|слюноотсос|коффердам|пломб|композит|шовн|скальпель|губк|паст|клин|матриц|дезинфек|шприц|крафт|салфет|порошок|гель|цемент)/i.test(
							item.name,
						),
				);

			// Списание со склада (actualAdjustment < 0) — автоматический FEFO партионный учет
			if (actualAdjustment < 0) {
				const requiredQty = Math.abs(actualAdjustment);
				const userContext = request.user;
				const effectiveUserId = identity.userId ?? userContext?.id ?? null;
				const isAllowedOverdraft =
					parsedStock.data.allowOverdraft !== false || isClinicalOperation;

				let fefoResult: Awaited<ReturnType<typeof fefoStockService.deductFefo>>;
				try {
					fefoResult = await fefoStockService.deductFefo(tx, {
						organizationId,
						inventoryItemId: itemId,
						requiredQty,
						allowOverdraft: isAllowedOverdraft,
						notes:
							parsedStock.data.reason ||
							(isClinicalOperation
								? `Списание под операцию/приём (мягкий минусовой овердрафт партии, накладная ещё не внесена: дефицит ${Math.abs(newStock)} ед.)`
								: "Списание со склада (FEFO)"),
						userId: effectiveUserId,
						transactionType: isClinicalOperation
							? "treatment_consumable"
							: (isOverdraft ? "emergency_overdraft" : "manual_adjust"),
					});
				} catch (err) {
					if (err instanceof InsufficientStockError) {
						return { insufficientStock: true as const, currentStock };
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

				return { updated: updated ?? item, isOverdraft: fefoResult.isOverdraft };
			}

			if (isOverdraft && parsedStock.data.allowOverdraft === false && !isClinicalOperation) {
				return { insufficientStock: true as const, currentStock };
			}

			const [updated] = await tx
				.update(inventoryItems)
				.set({ stockQuantity: String(newStock), updatedAt: new Date() })
				.where(
					and(
						eq(inventoryItems.id, itemId),
						eq(inventoryItems.organizationId, organizationId),
					),
				)
				.returning();

			if (!updated) return { failed: true as const };

			// Log the transaction (same tx: the ledger entry commits atomically with the balance change)
			if (actualAdjustment !== 0) {
				const userContext = request.user;
				const effectiveUserId = identity.userId ?? userContext?.id ?? null;
				await tx.insert(inventoryTransactions).values({
					organizationId,
					inventoryItemId: itemId,
					quantityChanged: String(actualAdjustment),
					unitCostRub: updated.unitCostRub,
					transactionType: isOverdraft ? "emergency_overdraft" : "manual_adjust",
					isOverdraft,
					notes: isOverdraft
						? (parsedStock.data.reason || `Списано под операцию/приём (мягкий минусовой овердрафт партии, накладная ещё не внесена: дефицит ${Math.abs(newStock)} ед.)`)
						: (parsedStock.data.reason || null),
					userId: effectiveUserId,
				});
			}

			return { updated, isOverdraft };
		});

		if ("notFound" in result)
			return reply.status(404).send({
				error: "ItemNotFound",
				message:
					"Этот материал на складе клиники не найден: возможно, его уже удалили из списка. Обновите список склада и повторите — если материал нужен, добавьте его заново.",
			});
		if ("insufficientStock" in result)
			return reply.status(400).send({
				error: "insufficientStock",
				message: `Недостаточно остатка на складе (текущий остаток: ${result.currentStock}). Списание не может уводить остаток в минус.`,
			});
		if ("failed" in result)
			return reply.status(500).send({
				error: "StockNotSaved",
				message:
					"Остаток не сохранён: сервер не смог записать движение по складу. Проверьте остаток в списке склада и повторите операцию; если повторится, сообщите администратору клиники.",
			});
		if (result.isOverdraft) {
			return {
				...result.updated,
				isOverdraft: true,
				warning: `Остаток 0: зафиксирован мягкий овердрафт (дефицит: ${Math.abs(Number(result.updated.stockQuantity))} ед., накладная поставщика ещё в пути, списание под операцию проведено без блокировки).`,
			};
		}
		return result.updated;
	});
};
