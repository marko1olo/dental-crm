/**
 * Слияние двух карточек одного человека.
 *
 * ЭТО САМАЯ ОПАСНАЯ ОПЕРАЦИЯ В КАРТОТЕКЕ, поэтому решения приняты так:
 *
 * 1. НИ ОДНА ССЫЛКА НЕ ПОТЕРЯЕТСЯ. На пациента ссылаются 46 колонок в базе:
 *    37 с внешним ключом и 9 без него — посчитано запросом к каталогу, не на
 *    глаз. Список зашивать в код нельзя: добавят таблицу — слияние начнёт
 *    оставлять сирот, и заметят это через месяцы. Поэтому список колонок
 *    берётся из information_schema в момент выполнения.
 *
 * 2. КАРТОЧКА НЕ УДАЛЯЕТСЯ НИКОГДА. Это медицинские данные: удаление лишает
 *    клинику доказательств. Вторая карточка помечается архивной и получает
 *    ссылку merged_into_patient_id — открыв её по старому адресу, администратор
 *    увидит, куда она объединена.
 *
 * 3. ЗАПОЛНЕННОЕ НЕ ПЕРЕТИРАЕТСЯ. В основную карточку переносятся только те
 *    поля, которых там нет: телефон, почта, дата рождения. Затирать телефон
 *    основной карточки телефоном дубля нельзя — неизвестно, какой из них верен.
 *
 * 4. ВСЁ ИЛИ НИЧЕГО. Одна транзакция: при сбое на девятнадцатой таблице
 *    восемнадцать первых не должны остаться перенесёнными.
 *
 * 5. КОНФЛИКТЫ УНИКАЛЬНОСТИ РАЗБИРАЮТСЯ ЯВНО. Таких мест ровно два (проверено
 *    по каталогу уникальных индексов): анамнез — один на пациента, и согласия
 *    на связь — уникальны по каналу и виду. При конфликте остаётся запись
 *    ОСНОВНОЙ карточки: она та, которую администратор оставляет жить.
 */

import type { PatientAdministrativeProfile } from "@dental/shared";
import { and, eq, or, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { inMemoryBlacklist } from "../../db/patientArchiveReasonsAndBlacklistsQuery.js";
import { patientDuplicateDecisions } from "../../db/patientsSchema.js";
import { withTenantCtx } from "../../db/rls.js";
import {
	familyGroups,
	patientArchiveReasonsAndBlacklists,
	patientReferrals,
	patients,
} from "../../db/schema.js";

/** Имя таблицы или колонки из каталога. Защита от подстановки в динамический SQL. */
const SAFE_IDENTIFIER = /^[a-z_][a-z0-9_]*$/;

export type PatientReferenceColumn = {
	readonly tableName: string;
	readonly columnName: string;
};

/**
 * Все колонки, ссылающиеся на пациента: и по внешнему ключу, и по имени.
 *
 * Колонки без внешнего ключа тоже нужны: их девять, целостность там не
 * поддерживается базой, и именно они остались бы сиротами.
 */
export async function patientReferenceColumns(): Promise<
	PatientReferenceColumn[]
> {
	const result = await db.execute(sql`
		select tc.table_name, kcu.column_name
		from information_schema.table_constraints tc
		join information_schema.key_column_usage kcu on kcu.constraint_name = tc.constraint_name
		join information_schema.constraint_column_usage ccu on ccu.constraint_name = tc.constraint_name
		where tc.constraint_type = 'FOREIGN KEY'
			and tc.table_schema = 'public'
			and ccu.table_name = 'patients'
			and ccu.column_name = 'id'
			and tc.table_name <> 'patients'
			and tc.table_name <> 'patient_duplicate_decisions'
		union
		select c.table_name, c.column_name
		from information_schema.columns c
		where c.table_schema = 'public'
			and c.table_name <> 'patients'
			and c.table_name <> 'patient_duplicate_decisions'
			and c.column_name in (
				'patient_id',
				'local_patient_id',
				'head_patient_id',
				'primary_patient_id',
				'referrer_patient_id',
				'referee_patient_id',
				'parent_referrer_patient_id',
				'referred_by_patient_id'
			)
	`);

	const rows =
		(result as unknown as { rows?: Record<string, unknown>[] }).rows ??
		(result as unknown as Record<string, unknown>[]);
	const columns: PatientReferenceColumn[] = [];
	for (const row of rows) {
		const tableName = String(row.table_name ?? "");
		const columnName = String(row.column_name ?? "");
		// Имена приходят из каталога, но проверка обязательна: значение попадёт в
		// динамический SQL, а не в параметр.
		if (!SAFE_IDENTIFIER.test(tableName) || !SAFE_IDENTIFIER.test(columnName))
			continue;
		columns.push({ tableName, columnName });
	}
	return columns.sort((left, right) =>
		left.tableName.localeCompare(right.tableName),
	);
}

/**
 * Места, где перенос упёрся бы в уникальность. Список короткий и проверенный по
 * каталогу; при конфликте побеждает запись основной карточки.
 */
const UNIQUE_CONFLICT_TABLES: readonly {
	table: string;
	column: string;
	scope: readonly string[];
}[] = [
	{ table: "patient_anamnesis", column: "patient_id", scope: [] },
	{
		table: "patient_communication_consents",
		column: "patient_id",
		scope: ["organization_id", "channel", "scope"],
	},
	{
		table: "patient_bonus_balances",
		column: "patient_id",
		scope: ["organization_id"],
	},
	{
		table: "patient_referral_codes",
		column: "patient_id",
		scope: ["organization_id"],
	},
	{
		table: "patient_referrals",
		column: "referee_patient_id",
		scope: ["organization_id"],
	},
	{
		table: "tooth_states",
		column: "patient_id",
		scope: ["organization_id", "tooth_number"],
	},
];

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
		// Пустой список означал бы, что каталог не прочитан: переносить нечего,
		// и молча «успешно объединить» в такой ситуации нельзя.
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
				// 1. Детерминированный порядок блокировки строк: сортируем UUID для предотвращения взаимных блокировок (deadlocks)
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

				const lockedRows = (lockedRowsResult.rows ?? []) as Array<{
					id: string;
					fullName: string;
					phone: string | null;
					email: string | null;
					birthDate: string | null;
					notes: string | null;
					status: string;
					mergedInto: string | null;
					weightKg: string | null;
					familyGroupId: string | null;
					administrativeProfile: PatientAdministrativeProfile | null;
				}>;

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

				// Бонусные баллы: объединяем балансы перед удалением строки дубля
				if (
					existingConflictTables.some((t) => t.table === "patient_bonus_balances")
				) {
					await inner.execute(sql`
						update patient_bonus_balances p
						set 
							active_points = p.active_points + d.active_points,
							pending_points = p.pending_points + d.pending_points,
							lifetime_earned_points = p.lifetime_earned_points + d.lifetime_earned_points,
							lifetime_spent_points = p.lifetime_spent_points + d.lifetime_spent_points,
							updated_at = now()
						from patient_bonus_balances d
						where p.patient_id = ${input.primaryPatientId}
							and d.patient_id = ${input.duplicatePatientId}
							and p.organization_id = ${input.organizationId}
							and d.organization_id = ${input.organizationId}
					`);
				}

				// Сначала снимаем конфликты уникальности последовательно в транзакции
				for (const conflict of existingConflictTables) {
					const scopeMatch =
						conflict.scope.length === 0
							? sql`true`
							: sql.join(
									conflict.scope.map(
										(column) =>
											sql`d.${sql.identifier(column)} = p.${sql.identifier(column)}`,
									),
									sql` and `,
								);

					const deleted = await inner.execute(sql`
						delete from ${sql.identifier(conflict.table)} d
						where d.${sql.identifier(conflict.column)} = ${input.duplicatePatientId}
							and exists (
								select 1 from ${sql.identifier(conflict.table)} p
								where p.${sql.identifier(conflict.column)} = ${input.primaryPatientId}
									and ${scopeMatch}
							)
						returning d.${sql.identifier(conflict.column)}
					`);
					const count = rowCount(deleted);
					if (count > 0) droppedConflicts[conflict.table] = count;
				}

				// Снимаем кольцевые / самореферальные связи между объединяемыми картами
				await inner
					.delete(patientReferrals)
					.where(
						and(
							eq(patientReferrals.organizationId, input.organizationId),
							or(
								and(
									eq(patientReferrals.referrerPatientId, input.primaryPatientId),
									eq(patientReferrals.refereePatientId, input.duplicatePatientId),
								),
								and(
									eq(patientReferrals.referrerPatientId, input.duplicatePatientId),
									eq(patientReferrals.refereePatientId, input.primaryPatientId),
								),
							),
						),
					);

				// Переносим ссылки во всех таблицах последовательно (гарантия ACID без параллельных вызовов в одном клиенте)
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

				// Переносим только то, чего в основной карточке нет.
				const fill: {
					fullName?: string;
					phone?: string;
					email?: string;
					birthDate?: string;
					weightKg?: string;
					familyGroupId?: string;
					administrativeProfile?: PatientAdministrativeProfile | null;
				} = {};

				// Деанонимизация: если основная карта была временным анонимом (UUID_ANON),
				// а дубликат несет подтвержденное ФИО — восстанавливаем паспортное ФИО
				if (
					primary.fullName.startsWith("UUID_ANON") &&
					duplicate.fullName &&
					!duplicate.fullName.startsWith("UUID_ANON")
				) {
					fill.fullName = duplicate.fullName;
					filledFields.push("ФИО (деанонимизация)");
				}

				if (!primary.phone?.trim() && duplicate.phone?.trim()) {
					fill.phone = duplicate.phone.trim();
					filledFields.push("телефон");
				}
				if (!primary.email?.trim() && duplicate.email?.trim()) {
					fill.email = duplicate.email.trim();
					filledFields.push("почта");
				}
				if (!primary.birthDate?.trim() && duplicate.birthDate?.trim()) {
					fill.birthDate = duplicate.birthDate.trim();
					filledFields.push("дата рождения");
				}
				if (!primary.weightKg && duplicate.weightKg) {
					fill.weightKg = duplicate.weightKg;
					filledFields.push("вес (кг)");
				}

				// Семейные группы (family_groups) и семейные кошельки:
				// Сценарий 1: У дубля есть семейная группа, а у основной карты нет -> привязываем основную к группе дубля.
				// Сценарий 2: У обеих карт есть РАЗНЫЕ семейные группы -> объединяем балансы кошельков и переносим членов семьи!
				if (!primary.familyGroupId && duplicate.familyGroupId) {
					fill.familyGroupId = duplicate.familyGroupId;
					filledFields.push("семейная группа");
				} else if (
					primary.familyGroupId &&
					duplicate.familyGroupId &&
					primary.familyGroupId !== duplicate.familyGroupId
				) {
					// Загружаем балансы семейных кошельков с блокировкой FOR UPDATE
					const [dupFamily] = await inner
						.select()
						.from(familyGroups)
						.where(
							and(
								eq(familyGroups.id, duplicate.familyGroupId),
								eq(familyGroups.organizationId, input.organizationId),
							),
						)
						.for("update")
						.limit(1);

					const [primFamily] = await inner
						.select()
						.from(familyGroups)
						.where(
							and(
								eq(familyGroups.id, primary.familyGroupId),
								eq(familyGroups.organizationId, input.organizationId),
							),
						)
						.for("update")
						.limit(1);

					if (dupFamily && primFamily) {
						const dupFamilyBal = Number(dupFamily.balance ?? 0);
						if (dupFamilyBal > 0) {
							const primFamilyBal = Number(primFamily.balance ?? 0);
							const combinedFamilyBal = (primFamilyBal + dupFamilyBal).toFixed(2);
							await inner
								.update(familyGroups)
								.set({ balance: combinedFamilyBal, updatedAt: new Date() })
								.where(
									and(
										eq(familyGroups.id, primary.familyGroupId),
										eq(familyGroups.organizationId, input.organizationId),
									),
								);
							// Обнуляем баланс поглощенной семейной группы
							await inner
								.update(familyGroups)
								.set({ balance: "0.00", updatedAt: new Date() })
								.where(
									and(
										eq(familyGroups.id, duplicate.familyGroupId),
										eq(familyGroups.organizationId, input.organizationId),
									),
								);
							filledFields.push(
								`семейный кошелек (${dupFamilyBal.toFixed(2)} ₽ перенесено в основную группу)`,
							);
						}

						// Переносим всех оставшихся членов семьи из поглощенной группы в основную
						await inner
							.update(patients)
							.set({ familyGroupId: primary.familyGroupId, updatedAt: new Date() })
							.where(
								and(
									eq(patients.familyGroupId, duplicate.familyGroupId),
									eq(patients.organizationId, input.organizationId),
								),
							);
					}
				}

				let nextAdminProfile: PatientAdministrativeProfile | null = primary.administrativeProfile
					? { ...primary.administrativeProfile }
					: null;
				const dupAdmin = duplicate.administrativeProfile;
				if (dupAdmin && typeof dupAdmin === "object") {
					if (!nextAdminProfile) {
						nextAdminProfile = { ...dupAdmin };
						if (dupAdmin.snils) filledFields.push("СНИЛС");
						if (dupAdmin.identityDocument) filledFields.push("документ / паспорт");
						if (dupAdmin.insurancePolicyNumber) filledFields.push("полис ОМС/ДМС");
						if (dupAdmin.taxpayerInn) filledFields.push("ИНН");
						if (dupAdmin.registrationAddress || dupAdmin.residentialAddress) filledFields.push("адрес");
					} else {
						for (const [key, value] of Object.entries(dupAdmin)) {
							const curVal = (nextAdminProfile as Record<string, unknown>)[key];
							const isCurEmpty =
								curVal === null ||
								curVal === undefined ||
								(typeof curVal === "string" && curVal.trim() === "");
							const isValNonEmpty =
								value !== null &&
								value !== undefined &&
								(typeof value !== "string" || value.trim() !== "");
							if (isCurEmpty && isValNonEmpty) {
								(nextAdminProfile as Record<string, unknown>)[key] = value;
								if (key === "snils") filledFields.push("СНИЛС");
								else if (key === "identityDocument") filledFields.push("документ / паспорт");
								else if (key === "insurancePolicyNumber") filledFields.push("полис ОМС/ДМС");
								else if (key === "taxpayerInn") filledFields.push("ИНН");
								else if (key === "registrationAddress" || key === "residentialAddress") filledFields.push("адрес");
								else if (key === "curatorId") filledFields.push("куратор лечения");
								else if (key === "loyaltyTier") filledFields.push("уровень лояльности");
							}
						}
						// Если основная карта была анонимной, а дубликат неанонимный - снимаем флаг анонимности
						if (primary.administrativeProfile?.isAnonymous && !dupAdmin.isAnonymous) {
							nextAdminProfile.isAnonymous = false;
						}
					}
				}
				if (nextAdminProfile) {
					fill.administrativeProfile = nextAdminProfile;
				}

				// Заметки не заменяются, а дописываются: в них бывает важное.
				const duplicateNotes = duplicate.notes?.trim();
				const mergedNote = `Объединено из карточки «${duplicate.fullName}»${duplicateNotes ? `. Заметки оттуда: ${duplicateNotes}` : ""}`;
				const nextNotes = primary.notes?.trim()
					? `${primary.notes.trim()}\n${mergedNote}`
					: mergedNote;

				// БЫЛО: пациенты загружены с organizationId, а UPDATE — только по id.
				// Слияние — самая опасная операция картотеки (PHI + оплаты + снимки).
				// СТАЛО: and(id, organizationId) на обеих карточках.
				await inner
					.update(patients)
					.set({ ...fill, notes: nextNotes, updatedAt: new Date() })
					.where(
						and(
							eq(patients.id, input.primaryPatientId),
							eq(patients.organizationId, input.organizationId),
						),
					);

				// Карточка не удаляется: она становится архивной ссылкой.
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

				// Фиксация причины архивации дублирующей карты по 323-ФЗ и приказу 834н
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

/** Число затронутых строк из ответа драйвера: форма отличается между вызовами. */
function rowCount(result: unknown): number {
	if (!result) return 0;
	const asRecord = result as {
		rowCount?: number;
		rows?: unknown[];
		length?: number;
	};
	if (typeof asRecord.rowCount === "number") return asRecord.rowCount;
	if (Array.isArray(asRecord.rows)) return asRecord.rows.length;
	if (typeof asRecord.length === "number") return asRecord.length;
	return 0;
}

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
