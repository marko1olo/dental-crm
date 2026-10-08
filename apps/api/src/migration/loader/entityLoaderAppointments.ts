/**
 * Загрузка записей расписания и клинических приёмов (визитов).
 * Layer 2: Appointments & Visits Entity Loader.
 */

import { eq } from "drizzle-orm";
import { withTenantCtx } from "../../db/rls.js";
import {
	appointments,
	migrationEntityLinks,
	migrationStagingRecords,
	visits,
} from "../../db/schema.js";
import { dateOnlyPart, storedDateTimeToUtc } from "../valueNormalize.js";
import { loadEntityLinks, loadRowInSavepoint } from "./batchPipeline.js";
import {
	APPOINTMENT_DEFAULT_MINUTES,
	DEFAULT_APPOINTMENT_MINUTES,
	LOAD_BATCH_SIZE,
	PAYMENT_DEFAULT_MINUTES,
} from "./constants.js";
import { migrationTimeZone, transferredMoment } from "./timezonePolicy.js";
import type { LoadOutcome, StagedRow } from "./types.js";

/**
 * Загружает записи расписания.
 *
 * Ссылка на пациента разрешается через таблицу соответствий: в выгрузке стоит
 * идентификатор старой системы, и его нужно превратить в наш uuid. Если пациента
 * с таким идентификатором не переносили, строка уходит в карантин с причиной
 * broken_reference — создавать приём без пациента бессмысленно, а придумывать
 * пациента недопустимо.
 */
export async function loadAppointments(input: {
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
	const appointmentLinks = await loadEntityLinks(
		input.organizationId,
		input.sourceSystem,
		"appointment",
	);
	const { readingZone: timeZone } = await migrationTimeZone(
		input.organizationId,
		"запись расписания",
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
					await loadRowInSavepoint(
						tx,
						row,
						outcome,
						"запись расписания",
						async (_sp) => {
							const values = row.transformed.values;
							const patientRef = values.patientRef as string | undefined;
							const patientId = patientRef
								? patientLinks.get(`id:${patientRef}`)
								: undefined;

							if (!patientId) {
								outcome.issuesByStagingId.set(row.stagingId, {
									reason: "broken_reference",
									blocking: true,
									fieldPath: "patientRef",
									message: patientRef
										? `Пациент с идентификатором «${patientRef}» не найден среди перенесённых. Запись расписания без пациента не создаётся.`
										: "В строке нет ссылки на пациента.",
									suggestedFix:
										"Перенесите сначала таблицу пациентов, затем повторите загрузку расписания.",
								});
								if (!input.dryRun) {
									await tx
										.update(migrationStagingRecords)
										.set({ status: "quarantined", updatedAt: new Date() })
										.where(eq(migrationStagingRecords.id, row.stagingId));
								}
								return;
							}

							const startsAtRaw = values.startsAt as string | undefined;
							if (!startsAtRaw) {
								outcome.failed += 1;
								return;
							}
							/**
							 * Время приёма из источника — местное время клиники, и оно
							 * сохраняется. Раньше здесь стояло `T09:00:00.000Z`, из-за чего все
							 * перенесённые приёмы вставали на девять утра по UTC независимо от
							 * того, во сколько они были: перенос расписания терял ровно то, ради
							 * чего расписание переносят.
							 */
							const startsAt = storedDateTimeToUtc(
								startsAtRaw,
								timeZone,
								APPOINTMENT_DEFAULT_MINUTES,
							);
							if (!startsAt) {
								outcome.failed += 1;
								return;
							}

							const duration =
								typeof values.durationMinutes === "number"
									? values.durationMinutes
									: DEFAULT_APPOINTMENT_MINUTES;
							const endsAtRaw = values.endsAt as string | undefined;
							let endsAt = endsAtRaw
								? storedDateTimeToUtc(
										endsAtRaw,
										timeZone,
										APPOINTMENT_DEFAULT_MINUTES,
									)
								: null;
							// Окончание раньше начала либо отсутствует — считаем по длительности.
							if (!endsAt || endsAt <= startsAt) {
								endsAt = new Date(startsAt.getTime() + duration * 60_000);
							}

							const externalId = values.externalId as string | undefined;
							const linkKey = externalId ? `id:${externalId}` : row.naturalKey;
							const existingId = linkKey
								? appointmentLinks.get(linkKey)
								: undefined;

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

							const [created] = await tx
								.insert(appointments)
								.values({
									organizationId: input.organizationId,
									patientId,
									status:
										(values.status as typeof appointments.$inferInsert.status) ??
										"planned",
									startsAt,
									endsAt,
									reason: (values.reason as string | undefined) ?? null,
									comment: (values.comment as string | undefined) ?? null,
								})
								.returning({ id: appointments.id });

							if (!created) {
								outcome.failed += 1;
								return;
							}

							if (linkKey) {
								await tx
									.insert(migrationEntityLinks)
									.values({
										organizationId: input.organizationId,
										entityKind: "appointment",
										sourceSystem: input.sourceSystem,
										sourceEntityId: linkKey,
										naturalKey: row.naturalKey,
										targetEntityId: created.id,
										createdByRunId: input.runId,
									})
									.onConflictDoNothing();
								appointmentLinks.set(linkKey, created.id);
							}

							await tx
								.update(migrationStagingRecords)
								.set({
									status: "loaded",
									targetEntityId: created.id,
									updatedAt: new Date(),
								})
								.where(eq(migrationStagingRecords.id, row.stagingId));
							outcome.created += 1;
						},
					);
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

/**
 * Загружает приёмы. Требует уже перенесённых пациентов, как и расписание.
 */
export async function loadVisits(input: {
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
	const visitLinks = await loadEntityLinks(
		input.organizationId,
		input.sourceSystem,
		"visit",
	);
	const { readingZone: timeZone } = await migrationTimeZone(
		input.organizationId,
		"приём",
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
					await loadRowInSavepoint(tx, row, outcome, "приём", async (_sp) => {
						const values = row.transformed.values;
						const patientRef = values.patientRef as string | undefined;
						const patientId = patientRef
							? patientLinks.get(`id:${patientRef}`)
							: undefined;

						if (!patientId) {
							outcome.issuesByStagingId.set(row.stagingId, {
								reason: "broken_reference",
								blocking: true,
								fieldPath: "patientRef",
								message: patientRef
									? `Приём ссылается на пациента «${patientRef}», которого нет среди перенесённых.`
									: "В строке приёма нет ссылки на пациента.",
								suggestedFix:
									"Перенесите таблицу пациентов, затем повторите загрузку приёмов.",
							});
							if (!input.dryRun) {
								await tx
									.update(migrationStagingRecords)
									.set({ status: "quarantined", updatedAt: new Date() })
									.where(eq(migrationStagingRecords.id, row.stagingId));
							}
							return;
						}

						const externalId = values.externalId as string | undefined;
						const linkKey = externalId ? `id:${externalId}` : row.naturalKey;
						const existingId = linkKey ? visitLinks.get(linkKey) : undefined;
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

						/**
						 * Перенесённый приём получает статус signed: это состоявшийся,
						 * закрытый приём из старой системы, а не черновик, который врач
						 * дописывает. Черновик в списке «незакрытые приёмы» через год после
						 * переноса — ложная задача для врача.
						 */
						const [created] = await tx
							.insert(visits)
							.values({
								organizationId: input.organizationId,
								patientId,
								status: "signed",
								complaint: (values.complaint as string | undefined) ?? null,
								anamnesis: (values.anamnesis as string | undefined) ?? null,
								objectiveStatus:
									(values.objectiveStatus as string | undefined) ?? null,
								diagnosis: (values.diagnosis as string | undefined) ?? null,
								treatmentPlan:
									(values.treatmentPlan as string | undefined) ?? null,
								doctorSummary: [
									(values.doctorSummary as string | undefined) ?? "",
									`Перенесено из «${input.sourceName}»${
										values.date
											? `, дата приёма ${dateOnlyPart(values.date as string)}`
											: ""
									}.`,
								]
									.filter(Boolean)
									.join("\n"),
								/*
								 * Время приёма из источника сохраняется, а не заменяется полднем.
								 * А НЕИЗВЕСТНОЕ время остаётся неизвестным: `null`.
								 *
								 * Здесь стояло `?? new Date()` в обеих ветках — и когда даты в
								 * источнике нет, и когда она есть, но не разобралась. Перенесённый
								 * приём получал ВРЕМЯ ИМПОРТА, и в истории пациента появлялось
								 * событие «приём состоялся сегодня», которого сегодня не было.
								 * Отличить его от настоящего было нельзя: в базе лежала обычная
								 * метка времени.
								 *
								 * Хуже, чем при чтении: выдумка на записи остаётся в базе навсегда.
								 * Прочитанная выдумка исчезает со следующим чтением, записанная —
								 * становится историей лечения.
								 *
								 * `visits.signed_at` в базе ОБНУЛЯЕМ (проверено по
								 * `information_schema`), поэтому «неизвестно» выразимо честно.
								 * Статус приёма остаётся `signed`: приём действительно состоялся в
								 * старой системе, неизвестна только его дата, и превращать его в
								 * черновик значило бы завести врачу ложную задачу через год после
								 * переноса — это объяснено в комментарии выше и остаётся в силе.
								 * Сама дата, если она в источнике была, названа в примечании врача
								 * строкой выше — оператор увидит её глазами.
								 */
								signedAt: (() => {
									const moment = transferredMoment(
										values.date
											? storedDateTimeToUtc(
													values.date as string,
													timeZone,
													PAYMENT_DEFAULT_MINUTES,
												)
											: null,
									);
									return moment.known ? moment.at : null;
								})(),
							})
							.returning({ id: visits.id });

						if (!created) {
							outcome.failed += 1;
							return;
						}

						if (linkKey) {
							await tx
								.insert(migrationEntityLinks)
								.values({
									organizationId: input.organizationId,
									entityKind: "visit",
									sourceSystem: input.sourceSystem,
									sourceEntityId: linkKey,
									naturalKey: row.naturalKey,
									targetEntityId: created.id,
									createdByRunId: input.runId,
								})
								.onConflictDoNothing();
							visitLinks.set(linkKey, created.id);
						}

						await tx
							.update(migrationStagingRecords)
							.set({
								status: "loaded",
								targetEntityId: created.id,
								updatedAt: new Date(),
							})
							.where(eq(migrationStagingRecords.id, row.stagingId));
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
