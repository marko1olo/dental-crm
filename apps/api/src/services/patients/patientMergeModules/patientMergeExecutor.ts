import type { PatientAdministrativeProfile } from "@dental/shared";
import { and, eq, sql } from "drizzle-orm";
import { inMemoryBlacklist } from "../../../db/patientArchiveReasonsAndBlacklistsQuery.js";
import { patientDuplicateDecisions } from "../../../db/patientsSchema.js";
import { withTenantCtx } from "../../../db/rls.js";
import {
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
		const outcome = await withTenantCtx(input.organizationId, async (tx) =>
			tx.transaction(async (inner) => {
				// 1. Детерминированный порядок блокировки строк для предотвращения взаимных блокировок (deadlocks)
				const [firstId, secondId] = [
					input.primaryPatientId,
					input.duplicatePatientId,
				].sort();

				// 2. Пессимистическая блокировка строк пациентов в порядке возрастания ID (SELECT FOR UPDATE)
				const lockedRowsResult = await inner.execute(sql`
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
				const cycleCheck = await inner.execute(sql`
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
						inner,
						input.primaryPatientId,
						input.duplicatePatientId,
						input.organizationId,
					);
				}

				// 5. Снимаем конфликты уникальности последовательно в транзакции
				const resolvedConflicts = await resolveUniqueConflicts(
					inner,
					input.primaryPatientId,
					input.duplicatePatientId,
					existingConflictTables,
				);
				Object.assign(droppedConflicts, resolvedConflicts);

				// 6. Снимаем кольцевые / самореферальные связи между объединяемыми картами
				await removeSelfReferralLoops(
					inner,
					input.primaryPatientId,
					input.duplicatePatientId,
					input.organizationId,
				);

				// 7. Переносим ссылки во всех таблицах последовательно (гарантия ACID)
				for (const column of columns) {
					const updated = await inner.execute(sql`
						update ${sql.identifier(column.tableName)}
						set ${sql.identifier(column.columnName)} = ${input.primaryPatientId}
						where ${sql.identifier(column.columnName)} = ${input.duplicatePatientId}
						returning 1
					`);
					const count = rowCount(updated);
					if (count > 0) {
						movedRows[`${column.tableName}.${column.columnName}`] = count;
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
					inner,
					primary,
					duplicate,
					input.organizationId,
					filledFields,
				);
				if (familyGroupId) {
					fill.familyGroupId = familyGroupId;
				}

				// 10. Обновление основной карточки
				await inner
					.update(patients)
					.set({ ...fill, notes: nextNotes, updatedAt: new Date() })
					.where(
						and(
							eq(patients.id, input.primaryPatientId),
							eq(patients.organizationId, input.organizationId),
						),
					);

				// 11. Карточка не удаляется: она становится архивной ссылкой.
				await inner
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
				await inner
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

				inMemoryBlacklist.add(
					`${input.organizationId}:${input.duplicatePatientId}`,
				);

				// 13. Решение о слиянии фиксируется в реестре дубликатов
				const [left, right] =
					input.primaryPatientId < input.duplicatePatientId
						? [input.primaryPatientId, input.duplicatePatientId]
						: [input.duplicatePatientId, input.primaryPatientId];

				await inner
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

				return { ok: true as const };
			}),
		);
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
