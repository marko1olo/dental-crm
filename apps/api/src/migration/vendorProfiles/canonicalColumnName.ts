/** Приводит имя колонки к виду, в котором его можно сравнивать. */
export function canonicalColumnName(value: string): string {
	return value
		.toLowerCase()
		.replace(/^@/, "")
		.replace(/[\s_\-.]+/g, "")
		.replace(/ё/g, "е")
		.trim();
}
