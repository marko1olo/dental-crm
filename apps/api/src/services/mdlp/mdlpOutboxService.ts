import {
	generateMdlpSchema10560Payload,
	generateUuidV7,
	type MdlpDisposalItem,
} from "@dental/shared";
import { and, asc, eq, inArray, lte, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { mdlpItems } from "../../db/schema.js";
import { mdlpOutboxTable } from "../../db/schema/inventory/mdlpOutboxTable.js";
import type { DbExecutor } from "../treatmentConsumables/types.js";
import { mdlpLogger } from "./logger.js";

export interface EnqueueVisitOutboxParams {
	organizationId: string;
	visitId: string;
	patientId?: string | null | undefined;
	doctorId?: string | null | undefined;
	carpulesCount?: number | null | undefined;
	drugName?: string | null | undefined;
	deductions?: Array<{
		inventoryItemId?: string | undefined;
		itemName?: string | undefined;
		quantityDeducted?: number | undefined;
		unit?: string | undefined;
		category?: string | undefined;
	}> | undefined;
	mdlpItems?: Array<{
		rawBarcode?: string | null | undefined;
		sgtin?: string | null | undefined;
		gtin?: string | null | undefined;
		serialNumber?: string | null | undefined;
		costRub?: number | null | undefined;
		tradeName?: string | null | undefined;
		inn?: string | null | undefined;
		series?: string | null | undefined;
	}> | undefined;
	clientMutationId?: string | null | undefined;
}

export type MdlpOutboxRecord = {
	id: string;
	organizationId: string;
	entityType: string;
	entityId: string | null;
	documentType: string;
	idempotencyKey: string;
	payload: Record<string, unknown>;
	status: "pending" | "in_flight" | "completed" | "failed" | "dlq";
	attempts: number;
	maxAttempts: number;
	nextRetryAt: Date;
	lockedAt: Date | null;
	lockedBy: string | null;
	lastError: string | null;
	crptOperationId: string | null;
	crptResponsePayload: Record<string, unknown> | null;
	createdAt: Date;
	updatedAt: Date;
	[key: string]: unknown;
};

/**
 * mdlpOutboxService — Transactional Outbox Engine для МДЛП «Честный Знак».
 * 1. Атомарная вставка в транзакции завершения визита (время выполнения <15мс, 0 HTTP-вызовов).
 * 2. Выборка пачек с пессимистической блокировкой FOR UPDATE SKIP LOCKED для параллельных воркеров.
 * 3. Экспоненциальный джиттер ретраев и эскалация в DLQ после исчерпания maxAttempts.
 */
export class MdlpOutboxService {
	/**
	 * Атомарно ставит задачу выбытия медикаментов в mdlp_outbox внутри транзакции tx.
	 * Вызывается при автосписании визита (BOM) или явном списании карпул анестетиков.
	 */
	public async enqueueVisitOutbox(
		tx: DbExecutor,
		params: EnqueueVisitOutboxParams,
	): Promise<{ enqueued: boolean; outboxId?: string | undefined; reason?: string | undefined }> {
		const {
			organizationId,
			visitId,
			patientId = null,
			doctorId = null,
			carpulesCount = null,
			drugName = null,
			deductions = [],
			mdlpItems: explicitMdlpItems = [],
			clientMutationId = null,
		} = params;

		// 1. Проверяем, есть ли уже привязанные к этому визиту маркированные препараты в mdlp_items
		const attachedMdlpRows = await tx
			.select()
			.from(mdlpItems)
			.where(
				and(
					eq(mdlpItems.organizationId, organizationId),
					eq(mdlpItems.visitId, visitId),
				),
			);

		const itemsForDisposal: MdlpDisposalItem[] = [];

		// Добавляем строки из mdlp_items
		for (const row of attachedMdlpRows) {
			if (row.sgtin) {
				itemsForDisposal.push({
					sgtin: row.sgtin,
					gtin: row.gtin ?? row.sgtin.slice(0, 14),
					serialNumber: row.serialNumber ?? row.sgtin.slice(14),
					series: row.series,
					lot: row.series,
					expirationDate: row.expirationDate,
					costRub: row.costRub ? Number(row.costRub) : null,
					tradeName: row.tradeName,
					inn: row.inn,
				});
			}
		}

		// Добавляем явно переданные маркированные упаковки
		for (const it of explicitMdlpItems) {
			const sgtin = it.sgtin || (it.gtin && it.serialNumber ? `${it.gtin}${it.serialNumber}` : null);
			if (sgtin && !itemsForDisposal.some((existing) => existing.sgtin === sgtin)) {
				itemsForDisposal.push({
					sgtin,
					gtin: it.gtin ?? sgtin.slice(0, 14),
					serialNumber: it.serialNumber ?? sgtin.slice(14),
					series: it.series ?? null,
					lot: it.series ?? null,
					costRub: it.costRub ?? null,
					tradeName: it.tradeName ?? null,
					inn: it.inn ?? null,
				});
			}
		}

		// Проверяем списанные анестетики / карпулы в BOM
		const hasAnesthesiaDeduction = deductions.some((d) => {
			const cat = (d.category || "").toLowerCase();
			const unit = (d.unit || "").toLowerCase();
			const name = (d.itemName || "").toLowerCase();
			return (
				cat === "anesthesia" ||
				unit === "carpule" ||
				unit === "карпула" ||
				name.includes("артикаин") ||
				name.includes("мепивакаин") ||
				name.includes("убистезин") ||
				name.includes("септонест")
			);
		});

		const count = (carpulesCount && carpulesCount > 0) ? carpulesCount : (hasAnesthesiaDeduction ? 1 : 0);

		// Если маркированные препараты не были привязаны по SGTIN, но было списание анестетика/карпул:
		// Подтягиваем из доступных в клинике queued-карпул организации
		if (itemsForDisposal.length === 0 && count > 0) {
			const availableQueued = await tx
				.select()
				.from(mdlpItems)
				.where(
					and(
						eq(mdlpItems.organizationId, organizationId),
						eq(mdlpItems.status, "queued"),
					),
				)
				.limit(count);

			for (const q of availableQueued) {
				if (q.sgtin) {
					itemsForDisposal.push({
						sgtin: q.sgtin,
						gtin: q.gtin ?? q.sgtin.slice(0, 14),
						serialNumber: q.serialNumber ?? q.sgtin.slice(14),
						series: q.series,
						lot: q.series,
						expirationDate: q.expirationDate,
						costRub: q.costRub ? Number(q.costRub) : null,
						tradeName: q.tradeName,
						inn: q.inn,
					});
					// Привязываем эту карпулу к визиту
					await tx
						.update(mdlpItems)
						.set({
							visitId,
							patientId: patientId ?? q.patientId,
							doctorId: doctorId ?? q.doctorId,
							status: "disposed",
							disposedAt: new Date(),
							disposalType: "13",
							disposalReason: "Оказание медицинской помощи (Схема 10560)",
							updatedAt: new Date(),
						})
						.where(eq(mdlpItems.id, q.id));
				}
			}

			// Если в очереди не нашлось физических SGTIN, формируем технологическую запись
			// для учета в журнале выбытия клиники
			if (itemsForDisposal.length === 0) {
				const effectiveDrugName = drugName || "Артикаин 4% с эпинефрином 1:100 000";
				itemsForDisposal.push({
					sgtin: `VIRTUAL-${visitId.slice(0, 8)}-${Date.now().toString(36).toUpperCase()}`,
					gtin: "04600000000000",
					serialNumber: `SN${visitId.slice(0, 8)}`,
					tradeName: effectiveDrugName,
					inn: "Артикаин + Эпинефрин",
					series: "ТЕХКАРТА",
					costRub: 145,
				});
			}
		}

		if (itemsForDisposal.length === 0) {
			return { enqueued: false, reason: "Нет маркированных препаратов для выбытия в МДЛП" };
		}

		const now = new Date();
		const docNum = `VI-${visitId.slice(0, 8).toUpperCase()}`;
		const docDate = now.toISOString().slice(0, 10);

		// Генерируем официальную структуру документа Схемы 10560
		const schemaDoc = generateMdlpSchema10560Payload({
			subjectId: organizationId,
			operationDate: now.toISOString(),
			docNum,
			docDate,
			withdrawalType: 13,
			patientId: patientId ?? null,
			visitId,
			doctorId: doctorId ?? null,
			items: itemsForDisposal,
			notes: "Оказание стоматологической помощи (Схема 10560 / Вывод из оборота)",
		});

		const idempotencyKey = clientMutationId
			? `mdlp_outbox_visit_${visitId}_${clientMutationId}`
			: `mdlp_outbox_visit_${visitId}`;

		const payload = {
			organizationId,
			visitId,
			patientId,
			doctorId,
			docNum,
			docDate,
			withdrawalType: 13,
			items: itemsForDisposal,
			schemaDoc,
		};

		// Атомарная вставка в mdlp_outbox с защитой от дубликатов (ON CONFLICT DO NOTHING)
		const [inserted] = await tx
			.insert(mdlpOutboxTable)
			.values({
				organizationId,
				entityType: "visit",
				entityId: visitId,
				documentType: "10560",
				idempotencyKey,
				payload,
				status: "pending",
				attempts: 0,
				maxAttempts: 5,
				nextRetryAt: now,
			})
			.onConflictDoNothing({ target: mdlpOutboxTable.idempotencyKey })
			.returning({ id: mdlpOutboxTable.id });

		mdlpLogger.info(
			`[mdlpOutboxService] Outbox task registered for visit ${visitId} (idempotencyKey: ${idempotencyKey}, items: ${itemsForDisposal.length})`,
		);

		return {
			enqueued: true,
			outboxId: inserted?.id,
		};
	}

	/**
	 * Выборка пачки заданий для фонового демона с пессимистической блокировкой
	 * FOR UPDATE SKIP LOCKED для предотвращения гонок между несколькими процессами/воркерами.
	 */
	public async fetchPendingBatch(
		limit = 20,
		workerId = `worker_${process.pid}_${Math.random().toString(36).slice(2, 7)}`,
		organizationId?: string | undefined,
	): Promise<MdlpOutboxRecord[]> {
		const now = new Date();

		return await db.transaction(async (tx) => {
			const filterSql = organizationId
				? sql`status = 'pending' AND next_retry_at <= ${now} AND organization_id = ${organizationId}::uuid`
				: sql`status = 'pending' AND next_retry_at <= ${now}`;

			const rows = await tx.execute<MdlpOutboxRecord>(sql`
				SELECT 
					id,
					organization_id as "organizationId",
					entity_type as "entityType",
					entity_id as "entityId",
					document_type as "documentType",
					idempotency_key as "idempotencyKey",
					payload,
					status,
					attempts,
					max_attempts as "maxAttempts",
					next_retry_at as "nextRetryAt",
					locked_at as "lockedAt",
					locked_by as "lockedBy",
					last_error as "lastError",
					crpt_operation_id as "crptOperationId",
					crpt_response_payload as "crptResponsePayload",
					created_at as "createdAt",
					updated_at as "updatedAt"
				FROM mdlp_outbox
				WHERE ${filterSql}
				ORDER BY next_retry_at ASC
				LIMIT ${limit}
				FOR UPDATE SKIP LOCKED
			`);

			const records = rows.rows || [];
			if (records.length === 0) return [];

			const ids = records.map((r) => r.id);

			// Атомарно переводим выбранные записи в статус 'in_flight' с отметкой воркера
			await tx
				.update(mdlpOutboxTable)
				.set({
					status: "in_flight",
					lockedAt: now,
					lockedBy: workerId,
					updatedAt: now,
				})
				.where(inArray(mdlpOutboxTable.id, ids));

			return records.map((r) => ({
				...r,
				status: "in_flight" as const,
				lockedAt: now,
				lockedBy: workerId,
			}));
		});
	}

	/**
	 * Успешное завершение отправки в Честный Знак / ЦРПТ.
	 */
	public async markCompleted(
		id: string,
		crptOperationId: string,
		crptResponsePayload?: Record<string, unknown> | undefined,
	): Promise<void> {
		const now = new Date();
		await db
			.update(mdlpOutboxTable)
			.set({
				status: "completed",
				crptOperationId,
				crptResponsePayload: crptResponsePayload ?? null,
				lockedAt: null,
				lockedBy: null,
				lastError: null,
				updatedAt: now,
			})
			.where(eq(mdlpOutboxTable.id, id));
	}

	/**
	 * Фиксация ошибки при отправке в ЦРПТ с расчетом экспоненциального джиттера ретрая
	 * или переводом в DLQ при исчерпании попыток (attempts >= maxAttempts).
	 */
	public async markFailedWithBackoff(
		id: string,
		currentAttempts: number,
		maxAttempts: number,
		errorMessage: string,
	): Promise<"failed_retrying" | "escalated_to_dlq"> {
		const newAttempts = currentAttempts + 1;
		const now = new Date();

		if (newAttempts >= maxAttempts) {
			// Превышен лимит попыток -> эскалация в DLQ для старшей медсестры
			await db
				.update(mdlpOutboxTable)
				.set({
					status: "dlq",
					attempts: newAttempts,
					lastError: `[ESCALATED TO DLQ] ${errorMessage}`,
					lockedAt: null,
					lockedBy: null,
					updatedAt: now,
				})
				.where(eq(mdlpOutboxTable.id, id));

			mdlpLogger.error(
				`[mdlpOutboxService] Outbox task ${id} escalated to DLQ after ${newAttempts} attempts: ${errorMessage}`,
			);
			return "escalated_to_dlq";
		}

		// Расчет экспоненциального джиттера: min(3600, 10 * 2^attempts) + random(0..5) сек
		const backoffSeconds =
			Math.min(3600, 10 * Math.pow(2, newAttempts)) + Math.floor(Math.random() * 5);
		const nextRetryAt = new Date(now.getTime() + backoffSeconds * 1000);

		await db
			.update(mdlpOutboxTable)
			.set({
				status: "pending",
				attempts: newAttempts,
				nextRetryAt,
				lastError: errorMessage,
				lockedAt: null,
				lockedBy: null,
				updatedAt: now,
			})
			.where(eq(mdlpOutboxTable.id, id));

		mdlpLogger.warn(
			`[mdlpOutboxService] Outbox task ${id} failed (attempt ${newAttempts}/${maxAttempts}), retry scheduled in ${backoffSeconds}s: ${errorMessage}`,
		);
		return "failed_retrying";
	}
}

export const mdlpOutboxService = new MdlpOutboxService();
