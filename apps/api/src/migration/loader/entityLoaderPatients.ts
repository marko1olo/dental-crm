/**
 * Загрузка пациентов, сопоставление дублей и индекс идентичности.
 * Layer 2: Patients Entity Loader.
 */

import { and, eq } from "drizzle-orm";
import { withTenantCtx } from "../../db/rls.js";
import {
	auditEvents,
	migrationEntityLinks,
	migrationStagingRecords,
	patients,
} from "../../db/schema.js";
import {
	type IdentityCandidate,
	IdentityIndex,
} from "../recordResolution.js";
import { loadEntityLinks, loadRowInSavepoint } from "./batchPipeline.js";
import { LOAD_BATCH_SIZE } from "./constants.js";
import type { LoadOutcome, StagedRow } from "./types.js";

/** Индекс существующих пациентов организации для поиска дублей. */
export async function buildPatientIdentityIndex(
	organizationId: string,
): Promise<IdentityIndex<IdentityCandidate & { id: string }>> {
	const index = new IdentityIndex<IdentityCandidate & { id: string }>();
	const existing = await withTenantCtx(organizationId, async (tx) =>
		tx
			.select({
				id: patients.id,
				fullName: patients.fullName,
				phone: patients.phone,
				birthDate: patients.birthDate,
				email: patients.email,
			})
			.from(patients)
			.where(eq(patients.organizationId, organizationId)),
	);

	for (const patient of existing) {
		index.add({
			id: patient.id,
			fullName: patient.fullName,
			phone: patient.phone,
			birthDate: patient.birthDate,
			email: patient.email,
		});
	}
	return index;
}

/** Собирает примечание пациента, сохраняя происхождение неструктурированных данных. */
export function buildPatientNotes(values: Record<string, unknown>): string | null {
	const parts: string[] = [];
	if (typeof values.notes === "string" && values.notes.trim())
		parts.push(values.notes.trim());
	if (typeof values.address === "string" && values.address.trim())
		parts.push(`Адрес: ${values.address.trim()}`);
	if (typeof values.gender === "string")
		parts.push(`Пол: ${values.gender === "male" ? "мужской" : "женский"}`);
	if (typeof values.secondaryPhone === "string")
		parts.push(`Дополнительный телефон: ${values.secondaryPhone}`);
	return parts.length > 0 ? parts.join("\n") : null;
}

/**
 * Загружает пациентов.
 *
 * Идемпотентность на трёх уровнях, в порядке надёжности:
 *   1. Ссылка по идентификатору старой системы — точное соответствие.
 *   2. Бизнес-ключ (natural key) — для источников без идентификаторов.
 *   3. Сходство ФИО, телефона и даты рождения — ловит пациента, уже
 *      заведённого вручную администратором до переноса.
 *
 * Третий уровень принципиален: клиника обычно неделю работает в новой системе
 * параллельно со старой, и часть пациентов уже заведена руками. Без сравнения
 * по сходству перенос создал бы им вторые карточки.
 */
export async function loadPatients(input: {
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

	const links = await loadEntityLinks(
		input.organizationId,
		input.sourceSystem,
		"patient",
	);
	const identityIndex = await buildPatientIdentityIndex(input.organizationId);

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
					await loadRowInSavepoint(tx, row, outcome, "пациент", async (sp) => {
						const values = row.transformed.values;
						const fullName = values.fullName as string | undefined;
						if (!fullName) {
							outcome.failed += 1;
							return;
						}

						const externalId = values.externalId as string | undefined;
						const linkKey = externalId ? `id:${externalId}` : row.naturalKey;
						const candidate: IdentityCandidate = {
							fullName,
							phone: (values.phone as string | undefined) ?? null,
							birthDate: (values.birthDate as string | undefined) ?? null,
							email: (values.email as string | undefined) ?? null,
						};

						// ---- Уровень 1 и 2: сущность уже переносилась.
						const linkedId = linkKey ? links.get(linkKey) : undefined;
						if (linkedId) {
							if (input.dryRun) {
								outcome.duplicates += 1;
								return;
							}
							/**
							 * Обновление, а не пропуск: оператор мог исправить данные в старой
							 * системе и повторить выгрузку. Пустые значения не затирают
							 * заполненные — иначе повторный прогон с урезанной выгрузкой
							 * очистил бы поля, заполненные в первый раз.
							 */
							const patch: Record<string, unknown> = { updatedAt: new Date() };
							if (values.phone) patch.phone = values.phone;
							if (values.birthDate) patch.birthDate = values.birthDate;
							if (values.email) patch.email = values.email;
							if (values.notes) patch.notes = values.notes;
							patch.fullName = fullName;

							await sp
								.update(patients)
								.set(patch)
								.where(
									and(
										eq(patients.id, linkedId),
										eq(patients.organizationId, input.organizationId),
									),
								);
							await sp
								.update(migrationStagingRecords)
								.set({
									status: "updated",
									targetEntityId: linkedId,
									updatedAt: new Date(),
								})
								.where(eq(migrationStagingRecords.id, row.stagingId));
							outcome.updated += 1;
							return;
						}

						// ---- Уровень 3: похожий пациент уже есть в базе.
						const match = identityIndex.findBest(candidate);
						if (match && match.verdict.action === "same") {
							if (input.dryRun) {
								outcome.duplicates += 1;
								return;
							}
							await sp
								.insert(migrationEntityLinks)
								.values({
									organizationId: input.organizationId,
									entityKind: "patient",
									sourceSystem: input.sourceSystem,
									sourceEntityId:
										linkKey ?? `row:${row.sourceTable}:${row.sourceRowNumber}`,
									naturalKey: row.naturalKey,
									targetEntityId: match.record.id,
									createdByRunId: input.runId,
								})
								.onConflictDoNothing();
							await sp
								.update(migrationStagingRecords)
								.set({
									status: "duplicate",
									targetEntityId: match.record.id,
									updatedAt: new Date(),
								})
								.where(eq(migrationStagingRecords.id, row.stagingId));
							outcome.duplicates += 1;
							outcome.issuesByStagingId.set(row.stagingId, {
								reason: "duplicate_conflict",
								blocking: false,
								fieldPath: null,
								message: `Пациент уже есть в базе (совпадение ${Math.round(match.verdict.score * 100)}%: ${match.verdict.rationale}). Карточка не создана повторно, данные привязаны к существующей.`,
								suggestedFix: null,
							});
							return;
						}

						if (match && match.verdict.action === "needs_review") {
							/**
							 * Похоже, но недостаточно, чтобы сливать автоматически. Что делать
							 * дальше, зависит от того, есть ли у источника собственный ключ.
							 *
							 * ЕСТЬ КЛЮЧ (externalId). Старая система присвоила этим записям
							 * разные первичные ключи, то есть считает их разными людьми. Её
							 * решение — это данные, а не шум: уважаем структуру источника,
							 * карточку создаём, а сходство отмечаем НЕблокирующим
							 * предупреждением для последующего разбора.
							 *
							 * Раньше здесь стояла блокировка без этого различия, и на реальной
							 * выгрузке, где однофамильцы с одинаковой датой рождения — обычное
							 * дело, в карантин уезжало большинство базы. Перенос, отложивший
							 * 85% пациентов «на разбор», клиника не примет, и правильно
							 * сделает: мы не нашли ошибку, мы отказались от работы.
							 *
							 * НЕТ КЛЮЧА. Опереться не на что, кроме сходства, и создание
							 * второй карточки было бы догадкой. Строка уходит в карантин.
							 */
							const sourceKnowsThemApart = Boolean(externalId);

							if (sourceKnowsThemApart) {
								outcome.issuesByStagingId.set(row.stagingId, {
									reason: "duplicate_conflict",
									blocking: false,
									fieldPath: null,
									message: `Похоже на существующую карточку (совпадение ${Math.round(
										match.verdict.score * 100,
									)}%: ${match.verdict.rationale}), но в старой системе это отдельная запись с ключом «${externalId}». Карточка создана; проверьте, не дубль ли это.`,
									suggestedFix:
										"Сравните карточки и при необходимости слейте их штатным слиянием пациентов.",
								});
								// Дальше строка идёт обычным путём создания.
							} else {
								outcome.issuesByStagingId.set(row.stagingId, {
									reason: "duplicate_conflict",
									blocking: true,
									fieldPath: null,
									message: `Возможный дубль существующей карточки: совпадение ${Math.round(
										match.verdict.score * 100,
									)}% (${match.verdict.rationale}). В источнике нет собственного ключа записи, поэтому решение оставлено человеку.`,
									suggestedFix:
										"Сравните карточки и решите: слить с существующей либо создать новую. Оба действия доступны из карантина.",
								});
								if (!input.dryRun) {
									await sp
										.update(migrationStagingRecords)
										.set({ status: "quarantined", updatedAt: new Date() })
										.where(eq(migrationStagingRecords.id, row.stagingId));
								}
								return;
							}
						}

						// ---- Новый пациент.
						if (input.dryRun) {
							outcome.created += 1;
							// В сухом прогоне индекс всё равно пополняется: дубли внутри самой
							// выгрузки должны находиться и без записи в базу.
							identityIndex.add({ ...candidate, id: `dry:${row.stagingId}` });
							return;
						}

						const [created] = await sp
							.insert(patients)
							.values({
								organizationId: input.organizationId,
								fullName,
								birthDate: (values.birthDate as string | undefined) ?? null,
								phone: (values.phone as string | undefined) ?? null,
								email: (values.email as string | undefined) ?? null,
								notes: buildPatientNotes(values),
								status:
									(values.status as "active" | "archived" | undefined) ??
									"active",
							})
							.returning({ id: patients.id });

						if (!created) {
							outcome.failed += 1;
							return;
						}

						await sp
							.insert(migrationEntityLinks)
							.values({
								organizationId: input.organizationId,
								entityKind: "patient",
								sourceSystem: input.sourceSystem,
								sourceEntityId:
									linkKey ?? `row:${row.sourceTable}:${row.sourceRowNumber}`,
								naturalKey: row.naturalKey,
								targetEntityId: created.id,
								createdByRunId: input.runId,
							})
							.onConflictDoNothing();

						await sp
							.update(migrationStagingRecords)
							.set({
								status: "loaded",
								targetEntityId: created.id,
								updatedAt: new Date(),
							})
							.where(eq(migrationStagingRecords.id, row.stagingId));

						await sp.insert(auditEvents).values({
							organizationId: input.organizationId,
							entityType: "patient",
							entityId: created.id,
							action: "patient_migrated",
							reason: `Перенос из «${input.sourceName}», строка ${row.sourceRowNumber}. Прогон ${input.runId}.`,
						});

						identityIndex.add({ ...candidate, id: created.id });
						if (linkKey) links.set(linkKey, created.id);
						outcome.created += 1;
					});
				}
			});
		} catch (error) {
			/**
			 * Сюда попадают только отказы уровня всей транзакции: обрыв соединения,
			 * исчерпание пула, отключение базы. Отказ отдельной строки перехвачен её
			 * точкой сохранения и здесь не появляется.
			 */
			const message = error instanceof Error ? error.message : String(error);
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
