import type { MigrationEntityKind, MigrationTargetField } from "@dental/shared";

export interface VendorFieldRule {
	/**
	 * Имена колонок этой системы для одного нашего поля. Сравнение
	 * нечувствительно к регистру, пробелам, подчёркиваниям и дефисам.
	 */
	columns: string[];
	targetField: MigrationTargetField;
}

export interface VendorProfile {
	/** Машинный код: попадает в migration_runs.vendor_profile и в ссылки сущностей. */
	code: string;
	/** Название для оператора. */
	title: string;
	/** Пояснение, откуда такая выгрузка берётся. */
	note: string;
	/** Имена таблиц/файлов, характерные для системы, — уточняющий признак. */
	tableHints: Partial<Record<MigrationEntityKind, string[]>>;
	rules: Partial<Record<MigrationEntityKind, VendorFieldRule[]>>;
}

export interface VendorProfileMatch {
	profile: VendorProfile | null;
	/** Доля колонок источника, узнанных профилем: 0..1. */
	coverage: number;
	/** Сущность, к которой профиль отнёс таблицу. */
	entityKind: MigrationEntityKind;
	/** Пояснение решения для отчёта оператору. */
	rationale: string;
}
