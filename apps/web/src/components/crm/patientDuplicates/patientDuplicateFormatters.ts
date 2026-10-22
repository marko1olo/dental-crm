/** Дата рождения в человеческом виде: «10.01.1970», а не «1970-01-10». */
export function formatBirthDate(value: string | null): string {
	if (!value) return "дата рождения не указана";
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return value;
	return parsed.toLocaleDateString("ru-RU");
}
