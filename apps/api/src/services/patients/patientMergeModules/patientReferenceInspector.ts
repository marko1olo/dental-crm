import { sql } from "drizzle-orm";
import { db } from "../../../db/client.js";

/** Имя таблицы или колонки из каталога. Защита от подстановки в динамический SQL. */
export const SAFE_IDENTIFIER = /^[a-z_][a-z0-9_]*$/;

export type PatientReferenceColumn = {
	readonly tableName: string;
	readonly columnName: string;
};

/**
 * Все колонки базы данных, ссылающиеся на пациента: и по внешнему ключу, и по имени.
 * Список извлекается динамически из `information_schema` во избежание оставления сирот.
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
 * Места, где перенос упёрся бы в уникальность. Список проверен по каталогу;
 * при конфликте побеждает запись основной карточки.
 */
export const UNIQUE_CONFLICT_TABLES: readonly {
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

/** Число затронутых строк из ответа драйвера: форма отличается между вызовами. */
export function rowCount(result: unknown): number {
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
