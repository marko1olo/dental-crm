import { ALL_VALID_FDI_TEETH } from "./icd10Types";

/**
 * Нормализация кода МКБ-10 (преобразование русской 'К'/'к' в латинскую 'K', удаление пробелов, форматирование точек).
 */
export function normalizeCode(raw: unknown): string {
	if (typeof raw !== "string" && typeof raw !== "number") {
		return "";
	}
	let str = String(raw).trim();
	if (!str) return "";

	// Замена русских К/к на латинскую K
	str = str.replace(/^[Кк]/u, "K").toUpperCase();

	// Удаляем лишние спецсимволы по краям
	str = str.replace(/^[^\w]+|[^\w]+$/g, "");

	// Если код вида K021 или K0402 -> вставляем точку после первых 3 символов
	if (/^K\d{3,4}$/i.test(str)) {
		str = `${str.slice(0, 3)}.${str.slice(3)}`;
	}

	return str;
}

/**
 * Проверка валидности номера зуба по стандарту FDI (ISO 3950).
 */
export function isValidFdiTooth(toothNumber: number): boolean {
	return Number.isInteger(toothNumber) && ALL_VALID_FDI_TEETH.has(toothNumber);
}
