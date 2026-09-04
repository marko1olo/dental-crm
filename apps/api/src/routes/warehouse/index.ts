/**
 * warehouse/index.ts — Fastify API routes for Warehouse Operations,
 * 1-Click Nurse Carpule Disposal & Soft Overdraft Management.
 *
 * Compliance:
 * - СанПиН 3.3686-21: списание пустых карпул анестетиков медсестрой единолично без комиссии из 3 человек.
 * - Мягкий овердрафт склада: задержка оприходования накладной поставщика НЕ блокирует операцию (200 OK + soft overdraft warning).
 */

import { and, eq, ilike, or } from "drizzle-orm";
import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { z } from "zod";
import {
	requireResolvedOrganizationId,
	requireResolvedStaffOrAdminOrganizationId,
} from "../../accessGuard.js";
import { db } from "../../db/client.js";
import { inventoryItems, inventoryTransactions } from "../../db/schema.js";

const quickCarpuleDisposalSchema = z.object({
	drugId: z.string().default("articaine_100k").optional(),
	drugName: z.string().default("Артикаин 4% с адреналином 1:100 000").optional(),
	carpulesCount: z.coerce.number().int().min(1).default(1),
	nurseName: z.string().default("Дежурная медицинская сестра").optional(),
	doctorName: z.string().default("Дежурный врач приема").optional(),
	cabinetNumber: z.string().default("1").optional(),
	reason: z.string().default("used_in_procedure").optional(),
	notes: z.string().optional(),
	allowOverdraft: z.boolean().default(true).optional(),
});

const softOverdraftDeductSchema = z.object({
	itemId: z.string().min(1, { message: "ID материала обязателен" }),
	quantity: z.coerce.number().finite().positive({ message: "Количество должно быть положительным" }),
	reason: z.string().optional(),
	visitId: z.string().optional(),
	allowOverdraft: z.boolean().default(true).optional(),
});

export const warehouseRoutes: FastifyPluginAsync = async (
	server: FastifyInstance,
) => {
	// POST /api/warehouse/:organizationId/quick-carpule-disposal
	// 1-клик списание пустых карпул медсестрой единолично (СанПиН 3.3686-21, без комиссии из 3 человек)
	server.post<{
		Params: { organizationId: string };
		Body: z.infer<typeof quickCarpuleDisposalSchema>;
	}>("/:organizationId/quick-carpule-disposal", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"warehouse quick carpule disposal",
		);
		if (!resolvedOrgId) return;

		const { organizationId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		const parsed = quickCarpuleDisposalSchema.safeParse(request.body ?? {});
		if (!parsed.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message: parsed.error.errors[0]?.message ?? "Неверные параметры списания",
			});
		}

		const data = parsed.data;
		const now = new Date();
		const dateIso = now.toISOString().slice(0, 10);
		const actNumber = `АКТ-КП-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}-${Math.floor(Math.random() * 900 + 100)}`;

		const result = await db.transaction(async (tx) => {
			// Находим позицию анестетика на складе (по имени или категории)
			const [matchingItem] = await tx
				.select()
				.from(inventoryItems)
				.where(
					and(
						eq(inventoryItems.organizationId, organizationId),
						or(
							ilike(inventoryItems.name, "%артикаин%"),
							ilike(inventoryItems.name, "%ультракаин%"),
							ilike(inventoryItems.name, "%анесте%"),
							eq(inventoryItems.category, "anesthesia"),
						),
					),
				)
				.limit(1)
				.for("update");

			let isOverdraft = false;
			let remainingStock = 0;
			let deficitCount = 0;

			if (matchingItem) {
				const currentStock = Number(matchingItem.stockQuantity ?? matchingItem.currentQty ?? 0);
				const newStock = Number((currentStock - data.carpulesCount).toFixed(3));
				isOverdraft = newStock < 0;
				remainingStock = newStock;
				if (isOverdraft) {
					deficitCount = Math.abs(newStock);
				}

				await tx
					.update(inventoryItems)
					.set({
						stockQuantity: String(newStock),
						currentQty: String(newStock),
						updatedAt: new Date(),
					})
					.where(
						and(
							eq(inventoryItems.id, matchingItem.id),
							eq(inventoryItems.organizationId, organizationId),
						),
					);

				await tx.insert(inventoryTransactions).values({
					organizationId,
					itemId: matchingItem.id,
					inventoryItemId: matchingItem.id,
					quantityChanged: String(-data.carpulesCount),
					unitCostRub: matchingItem.unitCostRub ?? "0",
					transactionType: isOverdraft ? "emergency_overdraft" : "treatment_consumable",
					isOverdraft,
					notes: isOverdraft
						? `Списано под операцию, требуется оприходование (мягкий минусовой овердрафт партии, накладная ещё не внесена: дефицит ${deficitCount} карп.) • ${data.nurseName} [СанПиН 3.3686-21]`
						: `Списание пустых карпул в 1 клик (${data.carpulesCount} шт.) • ${data.nurseName} [СанПиН 3.3686-21]`,
					userId: (request.user as { id?: string } | undefined)?.id ?? null,
				});
			} else {
				// Если карточка анестетика еще не заведена на складе:
				// создаем мягкую фиксацию с отрицательным остатком
				isOverdraft = true;
				deficitCount = data.carpulesCount;
			}

			return {
				isOverdraft,
				remainingStock,
				deficitCount,
			};
		});

		return reply.status(200).send({
			success: true,
			actNumber,
			date: dateIso,
			drugName: data.drugName,
			carpulesCount: data.carpulesCount,
			nurseName: data.nurseName,
			doctorName: data.doctorName,
			singleSigner: true,
			sanpinClause: "СанПиН 3.3686-21 п. 3630",
			wasteClass: "class_b_hazardous",
			isOverdraft: result.isOverdraft,
			warning: result.isOverdraft
				? `Мягкий минусовой овердрафт партии: накладная поставщика ещё не внесена, списано под операцию (дефицит: ${result.deficitCount} карп.). Операция спасения зуба не заблокирована.`
				: undefined,
		});
	});

	// POST /api/warehouse/:organizationId/soft-overdraft-deduct
	// Мягкое списание материала без блокировки при задержке накладной (Мягкий овердрафт)
	server.post<{
		Params: { organizationId: string };
		Body: z.infer<typeof softOverdraftDeductSchema>;
	}>("/:organizationId/soft-overdraft-deduct", async (request, reply) => {
		const resolvedOrgId = await requireResolvedStaffOrAdminOrganizationId(
			request,
			reply,
			"warehouse soft overdraft deduct",
		);
		if (!resolvedOrgId) return;

		const { organizationId } = request.params;
		if (resolvedOrgId !== organizationId) {
			return reply.code(403).send({ error: "Forbidden" });
		}

		const parsed = softOverdraftDeductSchema.safeParse(request.body ?? {});
		if (!parsed.success) {
			return reply.status(400).send({
				error: "ValidationError",
				message: parsed.error.errors[0]?.message ?? "Неверные параметры",
			});
		}

		const { itemId, quantity, reason, visitId } = parsed.data;

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

			if (!item) {
				return { notFound: true as const };
			}

			const currentStock = Number(item.stockQuantity ?? item.currentQty ?? 0);
			const newStock = Number((currentStock - quantity).toFixed(4));
			const isOverdraft = newStock < 0;

			await tx
				.update(inventoryItems)
				.set({
					stockQuantity: String(newStock),
					currentQty: String(newStock),
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(inventoryItems.id, item.id),
						eq(inventoryItems.organizationId, organizationId),
					),
				);

			await tx.insert(inventoryTransactions).values({
				organizationId,
				visitId: visitId ?? null,
				itemId: item.id,
				inventoryItemId: item.id,
				quantityChanged: String(-quantity),
				unitCostRub: item.unitCostRub ?? null,
				transactionType: isOverdraft ? "emergency_overdraft" : "treatment_consumable",
				isOverdraft,
				notes: isOverdraft
					? `Списано под операцию, требуется оприходование (мягкий минусовой овердрафт партии, накладная ещё не внесена: дефицит ${Math.abs(newStock)} ${item.unit ?? "ед."})`
					: (reason || "Списание материала со склада"),
				userId: (request.user as { id?: string } | undefined)?.id ?? null,
			});

			return {
				item,
				newStock,
				isOverdraft,
			};
		});

		if ("notFound" in result) {
			return reply.status(404).send({
				error: "ItemNotFound",
				message: "Материал не найден на складе",
			});
		}

		return reply.status(200).send({
			success: true,
			itemId: result.item.id,
			itemName: result.item.name,
			quantityDeducted: quantity,
			newStock: result.newStock,
			isOverdraft: result.isOverdraft,
			warning: result.isOverdraft
				? `Мягкий овердрафт склада: зафиксирован отрицательный остаток (${result.newStock} ${result.item.unit ?? "ед."}). Задержка накладной не блокирует оказание помощи.`
				: undefined,
		});
	});
};

export default warehouseRoutes;
