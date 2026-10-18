export const PAYMENT_METHOD_LABELS: Record<string, string> = {
	cash: "Наличные (касса)",
	card: "Банковская карта (эквайринг)",
	sbp: "СБП / QR-код",
	bank_transfer: "Безналичный расчет (юрлица/ДМС)",
	deposit: "Списание с депозита / аванса",
	installments: "Рассрочка клиники",
};

/**
 * Форматирует целочисленные копейки в аккуратную строку в рублях.
 * 1250000 -> "12 500,00 ₽" (или "12 500 ₽" при includeKopecks = false)
 */
export function formatMoneyKopecks(kopecks: number, includeKopecks = false): string {
	if (!Number.isFinite(kopecks) || kopecks === 0) {
		return includeKopecks ? "0,00 ₽" : "0 ₽";
	}
	const isNegative = kopecks < 0;
	const abs = Math.abs(Math.round(kopecks));
	const rubles = Math.floor(abs / 100);
	const kop = abs % 100;
	const formattedRub = rubles.toLocaleString("ru-RU").replace(/\u00A0/g, " ");

	if (includeKopecks && kop > 0) {
		return `${isNegative ? "-" : ""}${formattedRub},${kop.toString().padStart(2, "0")} ₽`;
	}
	return `${isNegative ? "-" : ""}${formattedRub} ₽`;
}
