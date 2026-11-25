import type { PatientAdministrativeProfile } from "@dental/shared";
import { and, eq, sql } from "drizzle-orm";
import { inMemoryBlacklist } from "../../../db/patientArchiveReasonsAndBlacklistsQuery.js";
import { patientDuplicateDecisions } from "../../../db/patientsSchema.js";
import { onTenantTxCommit, withSavepoint, withTenantCtx } from "../../../db/rls.js";
import {
	auditEvents,
	patientArchiveReasonsAndBlacklists,
	patients,
} from "../../../db/schema.js";
import {
	patientReferenceColumns,
	rowCount,
	UNIQUE_CONFLICT_TABLES,
} from "./patientReferenceInspector.js";
import {
	mergeBonusBalances,
	type PatientRecord,
	reconcileFamilyGroups,
	reconcilePatientProfiles,
	removeSelfReferralLoops,
	resolveUniqueConflicts,
} from "./patientMergeReconciliation.js";

export type MergeResult =
	| {
			readonly ok: true;
			readonly primaryPatientId: string;
			readonly mergedPatientId: string;
			/** Таблица → сколько строк перенесено. Только непустые. */
			readonly movedRows: Record<string, number>;
			readonly droppedConflicts: Record<string, number>;
			readonly filledFields: string[];
	  }
	| { readonly ok: false; readonly reason: string };

export type MergePatientsInput = {
	readonly organizationId: string;
	/** Карточка, которая останется. */
	readonly primaryPatientId: string;
	/** Карточка, которая станет архивной ссылкой на основную. */
	readonly duplicatePatientId: string;
	readonly performedByUserId?: string | null;
	readonly reason?: string | null;
};

/**
 * Атомарное выполнение слияния двух карточек пациентов в единой транзакции (ACID).
 */
export async function mergePatients(
	input: MergePatientsInput,
): Promise<MergeResult> {
	if (input.primaryPatientId === input.duplicatePatientId) {
		return { ok: false, reason: "Указана одна и та же карточка." };
	}

	const columns = await patientReferenceColumns();
	const availableReferenceColumns = new Set(
		columns.map((column) => `${column.tableName}.${column.columnName}`),
	);
	const existingConflictTables = UNIQUE_CONFLICT_TABLES.filter((conflict) =>
		availableReferenceColumns.has(`${conflict.table}.${conflict.column}`),
	);
	if (columns.length === 0) {
		return {
			ok: false,
			reason: "Не удалось определить связи карточки в базе. Слияние отменено.",
		};
	}

	const movedRows: Record<string, number> = {};
	const droppedConflicts: Record<string, number> = {};
	const filledFields: string[] = [];

	try {
		const outcome = await withTenantCtx(input.organizationId, async (tx) => {
			// 1. Детерминированный порядок блокировки строк для предотвращения взаимных блокировок (deadlocks)
			const [firstId, secondId] = [
				input.primaryPatientId,
				input.duplicatePatientId,
			].sort();

			// 2. Пессимистическая блокировка строк пациентов в порядке возрастания ID (SELECT FOR UPDATE)
			const lockedRowsResult = await tx.execute(sql`
				select 
					id,
					full_name as "fullName",
					phone,
					email,
					birth_date as "birthDate",
					notes,
					status,
					merged_into_patient_id as "mergedInto",
					weight_kg as "weightKg",
					family_group_id as "familyGroupId",
					administrative_profile as "administrativeProfile"
				from patients
				where organization_id = ${input.organizationId}
					and id in (${firstId}, ${secondId})
				order by id asc
				for update
			`);

			const lockedRows = (lockedRowsResult.rows ?? []) as Array<PatientRecord>;

			const primary = lockedRows.find((row) => row.id === input.primaryPatientId);
			const duplicate = lockedRows.find(
				(row) => row.id === input.duplicatePatientId,
			);

			if (!primary || !duplicate) {
				return {
					ok: false as const,
					reason: "Одна из карточек не найдена в этой клинике.",
				};
			}
			if (duplicate.mergedInto) {
				return {
					ok: false as const,
					reason: "Эта карточка уже объединена с другой.",
				};
			}
			if (primary.mergedInto) {
				return {
					ok: false as const,
					reason:
						"Основная карточка сама объединена с другой — выберите ту, что осталась.",
				};
			}

			// 3. Защита от циклических слияний: проверяем, что primary по цепочке не ссылается на duplicate
			const cycleCheck = await tx.execute(sql`
				with recursive merge_chain as (
					select id, merged_into_patient_id
					from patients
					where organization_id = ${input.organizationId}
						and id = ${input.primaryPatientId}
					union all
					select p.id, p.merged_into_patient_id
					from patients p
					inner join merge_chain mc on p.id = mc.merged_into_patient_id
					where mc.merged_into_patient_id is not null
						and p.organization_id = ${input.organizationId}
				)
				select 1 as cycle_detected from merge_chain where id = ${input.duplicatePatientId} limit 1
			`);
			if ((cycleCheck.rows ?? []).length > 0) {
				return {
					ok: false as const,
					reason: "Обнаружена циклическая зависимость слияния карточек.",
				};
			}

			// 4. Бонусные баллы: объединяем балансы перед удалением строки дубля
			if (
				existingConflictTables.some((t) => t.table === "patient_bonus_balances")
			) {
				await mergeBonusBalances(
					tx,
					input.primaryPatientId,
					input.duplicatePatientId,
					input.organizationId,
				);
			}

			// 5. Снимаем конфликты уникальности последовательно в транзакции
			const resolvedConflicts = await resolveUniqueConflicts(
				tx,
				input.primaryPatientId,
				input.duplicatePatientId,
				existingConflictTables,
			);
			Object.assign(droppedConflicts, resolvedConflicts);

			// 6. Снимаем кольцевые / самореферальные связи между объединяемыми картами
			await removeSelfReferralLoops(
				tx,
				input.primaryPatientId,
				input.duplicatePatientId,
				input.organizationId,
			);

			// 7. Переносим ссылки во всех таблицах последовательно через SAVEPOINT (динамическая защита от 23505)
			for (const column of columns) {
				const refKey = `${column.tableName}.${column.columnName}`;
				try {
					const count = await withSavepoint(tx, async (sp) => {
						const updated = await sp.execute(sql`
							update ${sql.identifier(column.tableName)}
							set ${sql.identifier(column.columnName)} = ${input.primaryPatientId}
							where ${sql.identifier(column.columnName)} = ${input.duplicatePatientId}
							returning 1
						`);
						return rowCount(updated);
					});
					if (count > 0) {
						movedRows[refKey] = count;
					}
				} catch (colErr) {
					const errObj =
						typeof colErr === "object" && colErr !== null
							? (colErr as Record<string, unknown>)
							: null;
					const errCause =
						errObj?.cause && typeof errObj.cause === "object"
							? (errObj.cause as Record<string, unknown>)
							: null;
					const pgCode = String(errObj?.code ?? errCause?.code ?? "");
					if (pgCode !== "23505") throw colErr;

					const dupRowsResult = await tx.execute<{ row_ctid: string }>(sql`
						select ctid::text as row_ctid
						from ${sql.identifier(column.tableName)}
						where ${sql.identifier(column.columnName)} = ${input.duplicatePatientId}
					`);
					const dupRows = Array.isArray(dupRowsResult)
						? dupRowsResult
						: ((dupRowsResult as { rows?: Array<{ row_ctid: string }> }).rows ?? []);
					let moved = 0;
					let dropped = 0;
					for (const dupRow of dupRows) {
						try {
							await withSavepoint(tx, async (sp) => {
								await sp.execute(sql`
									update ${sql.identifier(column.tableName)}
									set ${sql.identifier(column.columnName)} = ${input.primaryPatientId}
									where ctid = ${dupRow.row_ctid}::tid
								`);
							});
							moved += 1;
						} catch (rowErr) {
							const rObj =
								typeof rowErr === "object" && rowErr !== null
									? (rowErr as Record<string, unknown>)
									: null;
							const rCause =
								rObj?.cause && typeof rObj.cause === "object"
									? (rObj.cause as Record<string, unknown>)
									: null;
							if (String(rObj?.code ?? rCause?.code ?? "") !== "23505") {
								throw rowErr;
							}
							await withSavepoint(tx, async (sp) => {
								await sp.execute(sql`
									delete from ${sql.identifier(column.tableName)}
									where ctid = ${dupRow.row_ctid}::tid
								`);
							});
							dropped += 1;
						}
					}
					if (moved > 0) movedRows[refKey] = moved;
					if (dropped > 0) {
						droppedConflicts[refKey] = (droppedConflicts[refKey] ?? 0) + dropped;
					}
				}
			}

			// 8. Согласование профилей
			const { fill, nextNotes } = reconcilePatientProfiles(
				primary,
				duplicate,
				filledFields,
			);

			// 9. Согласование семейных групп и кошельков
			const familyGroupId = await reconcileFamilyGroups(
				tx,
				primary,
				duplicate,
				input.organizationId,
				filledFields,
			);
			if (familyGroupId) {
				fill.familyGroupId = familyGroupId;
			}

			// 10. Обновление основной карточки
			await tx
				.update(patients)
				.set({ ...fill, notes: nextNotes, updatedAt: new Date() })
				.where(
					and(
						eq(patients.id, input.primaryPatientId),
						eq(patients.organizationId, input.organizationId),
					),
				);

			// 11. Карточка не удаляется: она становится архивной ссылкой.
			await tx
				.update(patients)
				.set({
					status: "archived",
					mergedIntoPatientId: input.primaryPatientId,
					notes: `Карточка объединена с «${primary.fullName}». Все записи, оплаты и снимки перенесены туда.`,
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(patients.id, input.duplicatePatientId),
						eq(patients.organizationId, input.organizationId),
					),
				);

			// 12. Фиксация причины архивации дублирующей карты по 323-ФЗ и приказу 834н
			await tx
				.insert(patientArchiveReasonsAndBlacklists)
				.values({
					organizationId: input.organizationId,
					patientId: input.duplicatePatientId,
					patientName: duplicate.fullName,
					archiveReason: `Карточка объединена с «${primary.fullName}». Все записи перенесены.`,
					reasonCode: "DUPLICATE_CARD_MERGED",
					legalBasis:
						"Приказ Минздрава России от 15.12.2014 № 834н (архивный статус формы 043/у при объединении)",
					isBookingBlocked: true,
					isBlacklisted: false,
					warningBadge: "Объединена (архив)",
					archivedBy: input.performedByUserId ?? null,
				});

			onTenantTxCommit(() => {
				inMemoryBlacklist.add(
					`${input.organizationId}:${input.duplicatePatientId}`,
				);
			});

			// 13. Решение о слиянии фиксируется в реестре дубликатов
			const [left, right] =
				input.primaryPatientId < input.duplicatePatientId
					? [input.primaryPatientId, input.duplicatePatientId]
					: [input.duplicatePatientId, input.primaryPatientId];

			await tx
				.insert(patientDuplicateDecisions)
				.values({
					organizationId: input.organizationId,
					leftPatientId: left,
					rightPatientId: right,
					decision: "merged",
					decidedByUserId: input.performedByUserId ?? null,
					reason: input.reason ?? null,
					movedRowsJson: JSON.stringify({
						movedRows,
						droppedConflicts,
						filledFields,
					}),
				})
				.onConflictDoUpdate({
					target: [
						patientDuplicateDecisions.organizationId,
						patientDuplicateDecisions.leftPatientId,
						patientDuplicateDecisions.rightPatientId,
					],
					set: {
						decision: "merged",
						decidedByUserId: input.performedByUserId ?? null,
						reason: input.reason ?? null,
						movedRowsJson: JSON.stringify({
							movedRows,
							droppedConflicts,
							filledFields,
						}),
						decidedAt: new Date(),
					},
				});

			// 14. Фиксация в аудит-логе клиники (audit_events)
			await tx
				.insert(auditEvents)
				.values({
					organizationId: input.organizationId,
					actorUserId: input.performedByUserId ?? null,
					entityType: "patient",
					entityId: input.primaryPatientId,
					action: "patient_merged",
					reason: `Слияние дубликата ${duplicate.fullName} (${input.duplicatePatientId}) в основную карту ${primary.fullName}. Причина: ${input.reason ?? "Не указана"}`,
				});

			return { ok: true as const };
		});
		if (outcome && !outcome.ok) {
			return outcome;
		}
	} catch (error) {
		return {
			ok: false,
			reason: `Слияние отменено, карточки не изменены: ${error instanceof Error ? error.message.slice(0, 300) : String(error).slice(0, 300)}`,
		};
	}

	return {
		ok: true,
		primaryPatientId: input.primaryPatientId,
		mergedPatientId: input.duplicatePatientId,
		movedRows,
		droppedConflicts,
		filledFields,
	};
}

/** Алиас для соответствия конвенции слияния карточек пациентов */
export const mergePatientCards = mergePatients;

/** «Это разные люди, больше не предлагать». */
export async function dismissDuplicatePair(input: {
	readonly organizationId: string;
	readonly leftPatientId: string;
	readonly rightPatientId: string;
	readonly performedByUserId?: string | null;
	readonly reason?: string | null;
}): Promise<{ ok: boolean; reason?: string }> {
	if (input.leftPatientId === input.rightPatientId) {
		return { ok: false, reason: "Указана одна и та же карточка." };
	}

	const [left, right] =
		input.leftPatientId < input.rightPatientId
			? [input.leftPatientId, input.rightPatientId]
			: [input.rightPatientId, input.leftPatientId];

	await withTenantCtx(input.organizationId, async (tx) =>
		tx
			.insert(patientDuplicateDecisions)
			.values({
				organizationId: input.organizationId,
				leftPatientId: left,
				rightPatientId: right,
				decision: "dismissed",
				decidedByUserId: input.performedByUserId ?? null,
				reason: input.reason ?? null,
			})
			.onConflictDoUpdate({
				target: [
					patientDuplicateDecisions.organizationId,
					patientDuplicateDecisions.leftPatientId,
					patientDuplicateDecisions.rightPatientId,
				],
				set: {
					decision: "dismissed",
					decidedByUserId: input.performedByUserId ?? null,
					reason: input.reason ?? null,
					decidedAt: new Date(),
				},
			}),
	);

	return { ok: true };
}

/**
 * Единый человекочитаемый текст сводки успешного слияния карточек пациентов.
 */
export function formatMergeSummary(result: {
	movedRows: Record<string, number>;
	filledFields: readonly string[];
}): string {
	const movedTotal = Object.values(result.movedRows).reduce(
		(total, count) => total + count,
		0,
	);
	return (
		`Карточки пациентов успешно объединены. Перенесено записей: ${movedTotal}` +
		(result.filledFields.length > 0
			? `. Дозаполнено в основной карточке: ${result.filledFields.join(", ")}`
			: "") +
		". Вторая карточка архивирована с перенаправлением (152-ФЗ аудит сохранен)."
	);
}
