/**
 * @file toothCommandUtils.ts
 * @description Вспомогательные утилиты парсинга и валидации зубов (FDI) для командного HUD врача.
 */

/**
 * Валидация номера зуба по международной двухцифровой нотации FDI
 * - Постоянные зубы: 11..18, 21..28, 31..38, 41..48
 * - Временные (молочные) зубы: 51..55, 61..65, 71..75, 81..85
 */
export function isValidFdiTooth(num: number): boolean {
	const q = Math.floor(num / 10);
	const pos = num % 10;
	if (q >= 1 && q <= 4 && pos >= 1 && pos <= 8) return true;
	if (q >= 5 && q <= 8 && pos >= 1 && pos <= 5) return true;
	return false;
}

/**
 * Извлечение номера зуба из поисковой строки
 * Поддерживает форматы: "46", "зуб 46", "зуб46", "t 46", "tooth 46"
 */
export function parseToothNumber(input: string): number | null {
	const trimmed = input.trim();
	const match = trimmed.match(/^(?:зуб\s*|t\s*|tooth\s*)?([1-8][1-8])$/i);
	if (!match || !match[1]) return null;
	const num = Number.parseInt(match[1], 10);
	return isValidFdiTooth(num) ? num : null;
}

/**
 * Анатомическое клиническое описание зуба на чистом русском языке (СтАР)
 */
export function getFdiToothDescription(num: number): string {
	const q = Math.floor(num / 10);
	const pos = num % 10;
	const permNames = [
		"центральный резец",
		"боковой резец",
		"клык",
		"первый премоляр",
		"второй премоляр",
		"первый моляр",
		"второй моляр",
		"третий моляр",
	];
	const milkNames = [
		"центральный резец",
		"боковой резец",
		"клык",
		"первый моляр",
		"второй моляр",
	];

	let quad = "";
	let name = "";
	switch (q) {
		case 1:
			quad = "Верхний правый";
			name = permNames[pos - 1] || "зуб";
			break;
		case 2:
			quad = "Верхний левый";
			name = permNames[pos - 1] || "зуб";
			break;
		case 3:
			quad = "Нижний левый";
			name = permNames[pos - 1] || "зуб";
			break;
		case 4:
			quad = "Нижний правый";
			name = permNames[pos - 1] || "зуб";
			break;
		case 5:
			quad = "Верхний правый временный";
			name = milkNames[pos - 1] || "зуб";
			break;
		case 6:
			quad = "Верхний левый временный";
			name = milkNames[pos - 1] || "зуб";
			break;
		case 7:
			quad = "Нижний левый временный";
			name = milkNames[pos - 1] || "зуб";
			break;
		case 8:
			quad = "Нижний правый временный";
			name = milkNames[pos - 1] || "зуб";
			break;
		default:
			return `Зуб ${num}`;
	}
	return `${quad} ${name}`;
}
