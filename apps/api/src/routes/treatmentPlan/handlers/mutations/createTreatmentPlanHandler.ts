import { and, eq } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { kopecksToRubles, rublesToKopecks, percentageOfKopecks, toExactKopecks, computePayloadHash } from "@dental/shared";
import { db } from "../../../../db/client.js";
import {
	auditEvents,
	patients,
	treatmentPlanItemsNew,
	treatmentPlanStages,
	treatmentPlans,
} from "../../../../db/schema.js";
import { idempotencyKeys } from "../../../../db/schema/idempotency.js";
import { debtNumericText } from "../../../../money/patientDebt.js";
import { syncUpsertPlanLedgerItems, type SyncPlanLedgerItemInput } from "./planLedgerSync.js";
import { createTreatmentPlanSchema } from "./schemas.js";

/**
 * handleCreateTreatmentPlan — Создание клинического плана лечения и этапов (SSOT).
 * Мандаты 8b, 8e: план лечения — это клиническая смета, черновик не искажает отчёт дебиторки.
 */
export async function handleCreateTreatmentPlan(
	request: FastifyRequest,
	reply: FastifyReply,
	organizationId: string,
) {
	const rawIdempotencyKey =
		(request.headers?.["idempotency-key"] as string | undefined) ??
		(request.headers?.["x-idempotency-key"] as string | undefined) ??
		(request.body && typeof request.body === "object"
			? ((request.body as Record<string, unknown>).idempotencyKey as string | undefined) ??
			  ((request.body as Record<string, unknown>).clientMutationId as string | undefined)
			: undefined);

	const idempotencyKey = typeof rawIdempotencyKey === "string" ? rawIdempotencyKey.trim() : undefined;
	if (idempotencyKey) {
		reply.header("Idempotency-Key", idempotencyKey);

		// Дедупликация по таблице idempotency_keys (Мандаты 8d, 8bo, 8zp)
		const [existingRecord] = await db
			.select()
			.from(idempotencyKeys)
			.where(and(eq(idempotencyKeys.clinicId, organizationId), eq(idempotencyKeys.key, idempotencyKey)))
			.limit(1);

		if (existingRecord) {
			if (existingRecord.status === "completed" && existingRecord.responseBody) {
				reply.header("idempotency-replayed", "true");
				reply.header("x-idempotency-replayed", "true");
				return reply.code(existingRecord.responseCode || 201).send(existingRecord.responseBody);
			}
			if (existingRecord.status === "in_flight") {
				return reply.code(409).header("Retry-After", "1").send({
					error: "Conflict",
					message: "Операция создания плана лечения с данным Idempotency-Key уже выполняется.",
				});
			}
		}
	}

	const parsed = createTreatmentPlanSchema.safeParse(request.body);
	if (!parsed.success) {
		return reply.code(400).send({
			error: "ValidationError",
			message: "Некорректные данные для создания плана лечения.",
			issues: parsed.error.issues,
		});
	}

	const data = parsed.data;
	const [patient] = await db
		.select({ id: patients.id, fullName: patients.fullName })
		.from(patients)
		.where(and(eq(patients.id, data.patientId), eq(patients.organizationId, organizationId)))
		.limit(1);

	if (!patient) {
		return reply.code(404).send({
			error: "PatientNotFound",
			message: "Пациент не найден в базе вашей клиники.",
		});
	}

	// Нормализация этапов и элементов: поддержка как вложенных stages, так и плоских items
	let effectiveStages = data.stages;
	if (effectiveStages.length === 0 && data.items.length > 0) {
		const phaseMap = new Map<number, typeof data.items>();
		for (const it of data.items) {
			const ph = it.phase || 1;
			let bucket = phaseMap.get(ph);
			if (!bucket) {
				bucket = [];
				phaseMap.set(ph, bucket);
			}
			bucket.push(it);
		}
		effectiveStages = Array.from(phaseMap.entries())
			.sort(([a], [b]) => a - b)
			.map(([phase, items]) => ({
				stageOrder: phase,
				stageName: `Этап ${phase}`,
				completionPercentage: 0,
				items,
			}));
	}

	let itemsTotalKopecks = 0;
	if (effectiveStages.length > 0) {
		for (const st of effectiveStages) {
			for (const it of st.items) {
				const unitKopecks = typeof it.unitPriceKopecks === "number" && it.unitPriceKopecks > 0
					? Math.round(it.unitPriceKopecks)
					: rublesToKopecks(it.price);
				const discountKopecks = rublesToKopecks(it.discount);
				const lineTotal = Math.max(0, unitKopecks * it.quantity - discountKopecks);
				itemsTotalKopecks += lineTotal;
			}
		}
	}

	// Мандат 8bm: Итоговая стоимость рассчитывается детерминированно из позиций в копейках.
	// Запрещено перетирать итог клиентским float totalPriceRub, если в плане есть позиции!
	let totalKopecks: number;
	let computedPlanDiscountKopecks = 0;
	if (itemsTotalKopecks > 0) {
		let discountedKopecks = itemsTotalKopecks;
		if (typeof data.planDiscountRub === "number" && data.planDiscountRub > 0) {
			computedPlanDiscountKopecks = rublesToKopecks(data.planDiscountRub);
			discountedKopecks = Math.max(0, discountedKopecks - computedPlanDiscountKopecks);
		} else if (typeof data.planDiscountPercent === "number" && data.planDiscountPercent > 0) {
			const basisPoints = Math.round(data.planDiscountPercent * 100);
			computedPlanDiscountKopecks = percentageOfKopecks(toExactKopecks(discountedKopecks), basisPoints);
			discountedKopecks = Math.max(0, discountedKopecks - computedPlanDiscountKopecks);
		}
		totalKopecks = discountedKopecks;
	} else if (typeof data.totalPriceRub === "number" && data.totalPriceRub > 0) {
		totalKopecks = rublesToKopecks(data.totalPriceRub);
	} else {
		totalKopecks = 0;
	}
	const calculatedTotalRub = kopecksToRubles(totalKopecks);

	const result = await db.transaction(async (tx) => {
		const [newPlan] = await tx
			.insert(treatmentPlans)
			.values({
				...(data.id ? { id: data.id } : {}),
				organizationId,
				patientId: data.patientId,
				doctorId: data.doctorId || null,
				name: data.name,
				title: data.title || data.name,
				diagnosisIcd10: data.diagnosisIcd10 || null,
				diagnosisTitle: data.diagnosisTitle || null,
				status: "Draft",
				totalPriceRub: debtNumericText(totalKopecks),
				totalPrice: debtNumericText(totalKopecks),
				totalPriceKopecks: BigInt(totalKopecks),
				planDiscountKopecks: BigInt(computedPlanDiscountKopecks),
				discountMode: data.discountMode,
				planDiscountPercent: data.planDiscountPercent,
				planDiscountRub: data.planDiscountRub,
				isInstallment: data.isInstallment ?? false,
				installmentMonths: data.installmentMonths ?? null,
				downPaymentKopecks: data.downPaymentKopecks ?? null,
				monthlyPaymentKopecks: data.monthlyPaymentKopecks ?? null,
				planGroupId: data.planGroupId ?? null,
				groupName: data.groupName ?? null,
				isAlternative: data.isAlternative ?? false,
				alternativeTier: data.alternativeTier ?? null,
				alternativeStatus: data.alternativeStatus ?? "proposed",
				declinedReason: data.declinedReason ?? null,
				priceFreezePolicy: data.priceFreezePolicy ?? "standard_30_days",
				patientSignature: data.patientSignature ?? null,
				version: 1,
				isSynced: false,
			})
			.returning();

		if (!newPlan) {
			throw new Error("Не удалось создать план лечения в транзакции");
		}

		const createdStages: Array<typeof treatmentPlanStages.$inferSelect> = [];
		const createdItems: Array<typeof treatmentPlanItemsNew.$inferSelect> = [];
		const allItemsFlat: SyncPlanLedgerItemInput[] = [];

		if (effectiveStages.length > 0) {
			const stagesToInsert = effectiveStages.map((st) => ({
				organizationId,
				planId: newPlan.id,
				stageOrder: st.stageOrder,
				stageName: st.stageName,
				completionPercentage: st.completionPercentage,
			}));

			const createdStagesRows = await tx
				.insert(treatmentPlanStages)
				.values(stagesToInsert)
				.returning();

			createdStages.push(...createdStagesRows);

			const stageIdByOrder = new Map<number, string>();
			for (const cs of createdStagesRows) {
				stageIdByOrder.set(cs.stageOrder, cs.id);
			}

			const itemsToInsert: Array<typeof treatmentPlanItemsNew.$inferInsert> = [];
			const itemMetaList: Array<{ item: (typeof effectiveStages)[0]["items"][0]; stageOrder: number }> = [];

			for (const st of effectiveStages) {
				const resolvedStageId = stageIdByOrder.get(st.stageOrder) ?? null;

				for (const item of st.items) {
					const itemPriceKopecks = typeof item.unitPriceKopecks === "number" && item.unitPriceKopecks > 0
						? Math.round(item.unitPriceKopecks)
						: rublesToKopecks(item.price);
					const itemDiscountKopecks = rublesToKopecks(item.discount);

					itemsToInsert.push({
						organizationId,
						planId: newPlan.id,
						stageId: resolvedStageId,
						toothNumber: item.toothNumber ?? null,
						priceId: item.priceId || (item.isCustom ? "custom" : "service-item"),
						name: item.name ?? null,
						quantity: item.quantity,
						price: debtNumericText(itemPriceKopecks),
						discount: debtNumericText(itemDiscountKopecks),
						priceKopecks: BigInt(itemPriceKopecks),
						discountKopecks: BigInt(itemDiscountKopecks),
						commissionKopecks: 0n,
						phase: st.stageOrder,
						isBundle: item.isBundle,
						doctorId: item.doctorId || data.doctorId || null,
					});
					itemMetaList.push({ item, stageOrder: st.stageOrder });
				}
			}

			if (itemsToInsert.length > 0) {
				const createdItemsRows = await tx
					.insert(treatmentPlanItemsNew)
					.values(itemsToInsert)
					.returning();

				createdItems.push(...createdItemsRows);

				for (let i = 0; i < createdItemsRows.length; i++) {
					const createdItem = createdItemsRows[i];
					const meta = itemMetaList[i];
					if (meta) {
						const itemPriceKopecks = typeof meta.item.unitPriceKopecks === "number" && meta.item.unitPriceKopecks > 0
							? Math.round(meta.item.unitPriceKopecks)
							: rublesToKopecks(meta.item.price);
						const itemDiscountKopecks = rublesToKopecks(meta.item.discount);
						const lineTotalKopecks = Math.max(0, itemPriceKopecks * meta.item.quantity - itemDiscountKopecks);

						allItemsFlat.push({
							...meta.item,
							treatmentPlanItemId: createdItem?.id ?? null,
							phase: meta.stageOrder,
							isAuto: meta.item.isBundle,
							unitPriceKopecks: itemPriceKopecks,
							totalPriceKopecks: lineTotalKopecks,
							priceKopecks: lineTotalKopecks,
							discountKopecks: itemDiscountKopecks,
						});
					}
				}
			}
		}

		if (allItemsFlat.length > 0) {
			await syncUpsertPlanLedgerItems(tx, {
				organizationId,
				patientId: data.patientId,
				savedPlanId: newPlan.id,
				items: allItemsFlat,
				patientSignature: null,
				logger: request.log,
			});
		}

		try {
			await tx.insert(auditEvents).values({
				organizationId,
				actorUserId: null,
				entityType: "treatment_plan",
				entityId: newPlan.id,
				action: "TREATMENT_PLAN_CREATED",
				reason: `Создан план комплексного лечения «${newPlan.name}» на сумму ${calculatedTotalRub} ₽`,
			});
		} catch (auditErr) {
			request.log.warn({ err: auditErr }, "Не удалось записать аудит создания плана лечения");
		}

		const responsePayload: Record<string, unknown> = {
			success: true,
			treatmentPlan: newPlan,
			stages: createdStages,
			itemsCount: createdItems.length,
		};

		if (idempotencyKey) {
			await tx
				.insert(idempotencyKeys)
				.values({
					clinicId: organizationId,
					key: idempotencyKey,
					status: "completed",
					payloadHash: computePayloadHash(request.body ?? {}),
					responseBody: responsePayload,
					responseCode: 201,
				})
				.onConflictDoUpdate({
					target: [idempotencyKeys.clinicId, idempotencyKeys.key],
					set: {
						status: "completed",
						responseBody: responsePayload,
						responseCode: 201,
					},
				});
		}

		return responsePayload;
	});

	return reply.code(201).send(result);
}
