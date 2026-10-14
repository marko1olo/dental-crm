/**
 * writeOffVisitBundleExecution.ts — Layer 2 / Layer 3: Списание пакетов приёма и визитов.
 * Реализует Мандаты 8e, 8k, 8n (1-клик списание у кресла, СанПиН 3.3686-21, мягкий овердрафт).
 * Первый параметр функций БД — tx: DatabaseTransaction согласно §2.25 стандарта /decomposer.
 */

import type { FastifyReply, FastifyRequest } from "fastify";
import { visitStockDeductionRequestSchema } from "@dental/shared";
import { withTenantCtx } from "../../../db/rls.js";
import { InsufficientStockError } from "../../../services/inventory/materialDeduction.js";
import { TreatmentConsumablesService } from "../../../services/treatmentConsumablesService.js";
import {
	type DatabaseTransaction,
	normalizeVisitDeductionBody,
} from "./writeOffTypes.js";

export interface QuickPackageWriteOffParams {
	organizationId: string;
	packageId?: string | undefined;
	quantityMultiplier?: number | undefined;
	effectiveUserId: string | null;
	visitId?: string | null | undefined;
	notes?: string | null | undefined;
}

/**
 * Выполнение 1-кликового списания пакета материалов у кресла в рамках открытой транзакции БД.
 * Первый параметр — tx: DatabaseTransaction согласно §2.25 стандарта /decomposer.
 */
export async function executeQuickPackageWriteOff(
	tx: DatabaseTransaction,
	params: QuickPackageWriteOffParams,
): Promise<any> {
	const {
		organizationId,
		packageId = "anesthesia",
		quantityMultiplier = 1,
		effectiveUserId,
		visitId = null,
		notes = null,
	} = params;

	const multiplier = Math.max(1, quantityMultiplier);

	if (packageId === "anesthesia") {
		return TreatmentConsumablesService.quickWriteoffCarpules(tx, {
			organizationId,
			carpulesCount: multiplier,
			userId: effectiveUserId,
			visitId,
			notes: notes ?? `Списание анестезии у кресла (пакет «Стандартная анестезия» x${multiplier})`,
		});
	}

	if (packageId === "surgery") {
		return TreatmentConsumablesService.quickWriteoffVisitBundle(tx, {
			organizationId,
			visitType: "surgery",
			userId: effectiveUserId,
			visitId,
			notes: notes ?? `Списание хирургического пакета у кресла x${multiplier}`,
		});
	}

	if (packageId === "implant") {
		return TreatmentConsumablesService.quickWriteoffVisitBundle(tx, {
			organizationId,
			visitType: "implant",
			userId: effectiveUserId,
			visitId,
			notes: notes ?? `Списание имплантологического пакета у кресла x${multiplier}`,
		});
	}

	if (packageId === "sinus_gbr" || packageId === "implant_gbr") {
		return TreatmentConsumablesService.quickWriteoffVisitBundle(tx, {
			organizationId,
			visitType: "sinus_gbr",
			userId: effectiveUserId,
			visitId,
			notes: notes ?? `Списание пакета костной пластики / синус-лифтинга у кресла x${multiplier}`,
		});
	}

	if (
		packageId === "orthopedics_prep" ||
		packageId === "orthopedics_impression" ||
		packageId === "orthopedics_temporary" ||
		packageId === "orthopedics_cementation"
	) {
		return TreatmentConsumablesService.quickWriteoffVisitBundle(tx, {
			organizationId,
			visitType: packageId,
			userId: effectiveUserId,
			visitId,
			notes: notes ?? `Списание ортопедического пакета у кресла (${packageId}) x${multiplier}`,
		});
	}

	return TreatmentConsumablesService.quickWriteoffVisitBundle(tx, {
		organizationId,
		visitType: "therapy",
		userId: effectiveUserId,
		visitId,
		notes: notes ?? `Списание пакета приёма у кресла (${packageId}) x${multiplier}`,
	});
}

/**
 * Обработчик эндпоинта автосписания расходников по завершенному визиту.
 */
export async function handleDeductVisitRequest(
	organizationId: string,
	rawBody: unknown,
	request: FastifyRequest,
	reply: FastifyReply,
) {
	const normalizedBody = normalizeVisitDeductionBody(rawBody);
	const parsedBody = visitStockDeductionRequestSchema.safeParse(normalizedBody);

	if (!parsedBody.success) {
		return reply.status(400).send({
			error: "ValidationError",
			message: parsedBody.error.errors[0]?.message ?? "Неверные параметры запроса списания",
		});
	}

	try {
		const result = await withTenantCtx(organizationId, async (tx) => {
			return TreatmentConsumablesService.deductForVisit(tx, {
				organizationId,
				visitId: parsedBody.data.visitId,
				clientMutationId:
					parsedBody.data.clientMutationId ??
					(request.headers["idempotency-key"] as string | undefined) ??
					null,
				...(parsedBody.data.userId !== undefined
					? { userId: parsedBody.data.userId }
					: { userId: (request.user as any)?.id ?? null }),
				...(parsedBody.data.transactionType !== undefined
					? { transactionType: parsedBody.data.transactionType }
					: {}),
				...(parsedBody.data.services !== undefined
					? { services: parsedBody.data.services }
					: {}),
				...(parsedBody.data.items !== undefined ? { items: parsedBody.data.items } : {}),
				...(parsedBody.data.carpulesCount !== undefined
					? { carpulesCount: parsedBody.data.carpulesCount }
					: {}),
				...(parsedBody.data.drugName !== undefined
					? { drugName: parsedBody.data.drugName }
					: {}),
				...(parsedBody.data.paperJournalAcknowledged !== undefined
					? { paperJournalAcknowledged: parsedBody.data.paperJournalAcknowledged }
					: {}),
				...(parsedBody.data.allowOverdraft !== undefined
					? { allowOverdraft: parsedBody.data.allowOverdraft }
					: {}),
			});
		});

		return reply.send({
			success: true,
			...result,
			is_overdraft: Boolean(result.isOverdraft),
		});
	} catch (err: unknown) {
		const isInsufficientStock =
			err instanceof InsufficientStockError ||
			(err as any)?.error === "InsufficientStock" ||
			(err as any)?.name === "InsufficientStockError" ||
			(err as any)?.code === "InsufficientStock";

		if (isInsufficientStock) {
			const itemErr = err as any;
			const invItemId = itemErr.inventoryItemId ?? "unknown";
			const invItemName = itemErr.inventoryItemName ?? "Материал";
			const avail = Number(itemErr.availableStock ?? 0);
			const req = Number(itemErr.requiredStock ?? 1);
			return reply.status(200).send({
				success: true,
				isOverdraft: true,
				is_overdraft: true,
				warning: `Мягкий овердрафт склада: зафиксирован дефицит по материалу «${invItemName}» (в наличии ${avail}, требовалось ${req}). Приём проведён без блокировки.`,
				inventoryItemId: invItemId,
				inventoryItemName: invItemName,
				availableStock: avail,
				requiredStock: req,
				deductions: [],
				warnings: [
					{
						type: "out_of_stock",
						itemId: invItemId,
						itemName: invItemName,
						message: `Мягкий овердрафт склада: зафиксирован дефицит по материалу «${invItemName}» (в наличии ${avail}, требовалось ${req}).`,
						currentStock: avail - req,
						criticalThreshold: 0,
					},
				],
			});
		}

		request.log.error(err, "Failed to deduct visit inventory");
		return reply.code(500).send({
			error: "InternalServerError",
			message: err instanceof Error ? err.message : "Не удалось выполнить списание расходников по визиту",
		});
	}
}
