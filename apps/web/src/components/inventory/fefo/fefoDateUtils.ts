/** Русское склонение дней: 1 день, 2 дня, 5 дней. */
export function daysLabel(count: number): string {
	const absCount = Math.abs(count);
	const lastTwo = absCount % 100;
	const last = absCount % 10;
	if (lastTwo >= 11 && lastTwo <= 14) return `осталось ${absCount} дней`;
	if (last === 1) return `остался ${absCount} день`;
	if (last >= 2 && last <= 4) return `осталось ${absCount} дня`;
	return `осталось ${absCount} дней`;
}

/** Форматирование даты в канонический формат РФ: ДД.ММ.ГГГГ */
export function formatRuDate(dateInput: Date | string | null | undefined): string {
	if (!dateInput) return "";
	if (typeof dateInput === "string") {
		const trimmed = dateInput.trim();
		if (/^\d{2}\.\d{2}\.\d{4}$/.test(trimmed)) return trimmed;
		if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
			const [y, m, d] = trimmed.slice(0, 10).split("-");
			return `${d}.${m}.${y}`;
		}
		if (/^\d{4}-\d{2}$/.test(trimmed)) {
			const [y, m] = trimmed.split("-");
			const lastDay = new Date(Date.UTC(Number(y), Number(m), 0)).getUTCDate();
			return `${String(lastDay).padStart(2, "0")}.${m}.${y}`;
		}
	}
	const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
	if (Number.isNaN(d.getTime())) return String(dateInput);
	const day = String(d.getDate()).padStart(2, "0");
	const month = String(d.getMonth() + 1).padStart(2, "0");
	const year = d.getFullYear();
	return `${day}.${month}.${year}`;
}
