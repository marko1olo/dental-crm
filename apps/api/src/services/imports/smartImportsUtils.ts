/**
 * Shared utilities and dictionary labels for Smart Imports.
 */
export function uniqueStrings(items: string[]): string[] {
	return Array.from(new Set(items.map((i) => i.trim()).filter(Boolean)));
}

export const legacySourceTitles: Record<string, string> = {
	mis_database: "База данных МИС",
	mis_backup: "Резервная копия МИС",
	mis_export: "Табличная выгрузка",
	mis_archive: "Архив данных",
	imaging_study: "КТ / Снимки",
	imaging_archive: "Архив снимков",
	unknown_legacy_source: "Неизвестный источник",
};
