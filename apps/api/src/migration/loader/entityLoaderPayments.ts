/**
 * Загрузка платежей и фиксация кассовых операций переноса.
 * Layer 2: Payments Entity Loader.
 */

import { eq } from "drizzle-orm";
import { withTenantCtx } from "../../db/rls.js";
import {
	auditEvents,
	migrationEntityLinks,
	migrationStagingRecords,
	payments,
} from "../../db/schema.js";
import { storedDateTimeToUtc } from "../valueNormalize.js";
import { loadEntityLinks, loadRowInSavepoint } from "./batchPipeline.js";
import { LOAD_BATCH_SIZE, PAYMENT_DEFAULT_MINUTES } from "./constants.js";
import { migrationTimeZone, transferredMoment } from "./timezonePolicy.js";
import type { LoadOutcome, StagedRow } from "./types.js";

/**
 * Загружает платежи.
 *
 * Деньги требуют отдельной осторожности: платёж, привязанный не к тому пациенту,
 * искажает и его баланс, и отчётность клиники. Поэтому ссылка на пациента здесь
 * обязательна без исключений, а сумма проходит проверку на этапе разбора строки.
 */
export async function loadPayments(input: {
	runId: string;
	organizationId: string;
	sourceSystem: string;
	sourceName: string;
	rows: StagedRow[];
	dryRun: boolean;
}): Promise<LoadOutcome> {
	const outcome: LoadOutcome = {
		created: 0,
		updated: 0,
		duplicates: 0,
		failed: 0,
		issuesByStagingId: new Map(),
	};

	const patientLinks = await loadEntityLinks(
		input.organizationId,
		input.sourceSystem,
		"patient",
	);
	const paymentLinks = await loadEntityLinks(
		input.organizationId,
		input.sourceSystem,
		"payment",
	);
	const { readingZone: timeZone } = await migrationTimeZone(
		input.organizationId,
		"платёж",
	);
	const loadable = input.rows.filter(
		(row) => !row.issues.some((issue) => issue.blocking),
	);

	for (let offset = 0; offset < loadable.length; offset += LOAD_BATCH_SIZE) {
		const batch = loadable.slice(offset, offset + LOAD_BATCH_SIZE);
		try {
			/**
			 * БЫЛО `db.transaction(...)`. Транзакция открывалась БЕЗ тенант-контекста,
			 * поэтому из фонового воркера (вне обработчика маршрута) все запросы внутри
			 * неё попадали под RLS без `app.current_tenant`: чтения отдавали 0 строк
			 * молча, а INSERT падал с 42501. СТАЛО: withTenantCtx открывает ту же
			 * транзакцию, но с установленным арендатором. Границы транзакции не
			 * изменились — она по-прежнему на ОДНУ ПАРТИЮ, а не на весь прогон.
			 */
			await withTenantCtx(input.organizationId, async (tx) => {
				for (const row of batch) {
					// Каждая строка в своей точке сохранения: отказ по одной не уносит партию.
					await loadRowInSavepoint(tx, row, outcome, "платёж", async (sp) => {
						const values = row.transformed.values;
						const patientRef = values.patientRef as string | undefined;
						const patientId = patientRef
							? patientLinks.get(`id:${patientRef}`)
							: undefined;
						const amountRub = values.amountRub as number | undefined;

						if (!patientId) {
							outcome.issuesByStagingId.set(row.stagingId, {
								reason: "broken_reference",
								blocking: true,
								fieldPath: "patientRef",
								message: patientRef
									? `Платёж ссылается на пациента «${patientRef}», которого нет среди перенесённых. Деньги нельзя записать на неизвестного плательщика.`
									: "В строке платежа нет ссылки на пациента.",
								suggestedFix:
									"Перенесите таблицу пациентов, затем повторите загрузку платежей.",
							});
							if (!input.dryRun) {
								await tx
									.update(migrationStagingRecords)
									.set({ status: "quarantined", updatedAt: new Date() })
									.where(eq(migrationStagingRecords.id, row.stagingId));
							}
							return;
						}

						if (typeof amountRub !== "number") {
							outcome.failed += 1;
							return;
						}

						const externalId = values.externalId as string | undefined;
						const linkKey = externalId ? `id:${externalId}` : row.naturalKey;
						const existingId = linkKey ? paymentLinks.get(linkKey) : undefined;
						if (existingId) {
							outcome.duplicates += 1;
							if (!input.dryRun) {
								await tx
									.update(migrationStagingRecords)
									.set({
										status: "duplicate",
										targetEntityId: existingId,
										updatedAt: new Date(),
									})
									.where(eq(migrationStagingRecords.id, row.stagingId));
							}
							return;
						}

						if (input.dryRun) {
							outcome.created += 1;
							return;
						}

						const paidAtRaw = values.paidAt as string | undefined;
						// Время платежа из источника сохраняется; без времени — полдень
						// местного времени, чтобы платёж не уехал в предыдущие сутки.
						const paidAt = paidAtRaw
							? storedDateTimeToUtc(
									paidAtRaw,
									timeZone,
									PAYMENT_DEFAULT_MINUTES,
								)
							: null;

						/*
						 * ПЛАТЁЖ БЕЗ ДАТЫ УХОДИТ В КАРАНТИН, А НЕ В ДЕНЬ ИМПОРТА.
						 *
						 * Ниже стояло `paidAt: paidAt ?? new Date()`: платёж, у которого в
						 * источнике даты не было или она не разобралась, садился в ДЕНЬ
						 * ИМПОРТА. Касса того дня раздувалась на всю перенесённую историю,
						 * выручка в отчёте руководителю за день переноса становилась
						 * фантастической, а разделить перенесённое и настоящее было нельзя:
						 * в базе лежала обычная метка времени.
						 *
						 * Записать «неизвестно» тут нельзя: `payments.paid_at` в базе
						 * `NOT NULL DEFAULT now()` (проверено по `information_schema`), а
						 * умолчание — то же «сейчас». Значит выбор между выдумкой и отказом, и
						 * отказ верен: деньги без даты — это не деньги, а вопрос к оператору.
						 *
						 * Механизм отказа не изобретается: бросок внутри `loadRowInSavepoint`
						 * откатывает точку сохранения, ставит строке статус `quarantined` и
						 * вносит причину в сверку переноса. Оператор увидит число строк и
						 * причину, а не молча заведённые деньги. Остальные строки партии
						 * загружаются — это тоже поведение существующего механизма.
						 */
						const paidMoment = transferredMoment(paidAt);
						if (!paidMoment.known) {
							throw new Error(
								"у платежа нет даты оплаты, а без неё платёж попал бы в кассу ДНЯ ПЕРЕНОСА и раздул бы " +
									"выручку этого дня. Укажите дату платежа в источнике и повторите перенос этой строки.",
							);
						}

						const [created] = await tx
							.insert(payments)
							.values({
								organizationId: input.organizationId,
								patientId,
								amountRub,
								method:
									(values.method as typeof payments.$inferInsert.method) ??
									"card",
								status: "paid",
								paidAt: paidMoment.at,
								note: [
									(values.note as string | undefined) ?? "",
									`Перенос из «${input.sourceName}»`,
								]
									.filter(Boolean)
									.join("\n"),
							})
							.returning({ id: payments.id });

						if (!created) {
							outcome.failed += 1;
							return;
						}

						if (linkKey) {
							await tx
								.insert(migrationEntityLinks)
								.values({
									organizationId: input.organizationId,
									entityKind: "payment",
									sourceSystem: input.sourceSystem,
									sourceEntityId: linkKey,
									naturalKey: row.naturalKey,
									targetEntityId: created.id,
									createdByRunId: input.runId,
								})
								.onConflictDoNothing();
							paymentLinks.set(linkKey, created.id);
						}

						await tx
							.update(migrationStagingRecords)
							.set({
								status: "loaded",
								targetEntityId: created.id,
								updatedAt: new Date(),
							})
							.where(eq(migrationStagingRecords.id, row.stagingId));

						await sp.insert(auditEvents).values({
							organizationId: input.organizationId,
							entityType: "payment",
							entityId: created.id,
							action: "payment_migrated",
							reason: `Перенос из «${input.sourceName}», строка ${row.sourceRowNumber}, сумма ${amountRub} руб.`,
						});

						outcome.created += 1;
					});
				}
			});
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			// Сюда попадают только отказы уровня транзакции: обрыв соединения,
			// исчерпание пула. Отказ строки перехвачен её точкой сохранения.
			const unresolved = batch.filter(
				(row) => !outcome.issuesByStagingId.has(row.stagingId),
			);
			outcome.failed += unresolved.length;
			for (const row of unresolved) {
				outcome.issuesByStagingId.set(row.stagingId, {
					reason: "target_write_failed",
					blocking: true,
					fieldPath: null,
					message: `Транзакция партии прервана: ${message.slice(0, 300)}`,
					suggestedFix:
						"Проверьте доступность базы и повторите загрузку — уже перенесённые строки не продублируются.",
				});
			}
		}
	}

	return outcome;
}
