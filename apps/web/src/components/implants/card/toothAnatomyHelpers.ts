export const UPPER_JAW_TEETH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28] as const;
export const LOWER_JAW_TEETH = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38] as const;

export function getToothCoords(index: number, isUpper: boolean): { x: number; y: number } {
	const isRightQuadrant = index < 8;
	const x = isRightQuadrant ? 24 + index * 27 : 260 + (index - 8) * 27;
	const dist = Math.abs(x - 242) / 220;
	const curveOffset = Math.pow(dist, 1.8) * 16;
	const y = isUpper ? 38 - curveOffset : 72 + curveOffset;
	return { x, y };
}

export function getToothAnatomicalDescription(toothFdi: number): string {
	if (!toothFdi || toothFdi < 11 || toothFdi > 48) return "Область дентальной имплантации";
	const quadrant = Math.floor(toothFdi / 10);
	const num = toothFdi % 10;

	const names: Record<number, string> = {
		1: "Центральный резец",
		2: "Боковой резец",
		3: "Клык",
		4: "Первый премоляр",
		5: "Второй премоляр",
		6: "Первый моляр",
		7: "Второй моляр",
		8: "Третий моляр (зуб мудрости)",
	};

	const quadNames: Record<number, string> = {
		1: "верхней челюсти справа",
		2: "верхней челюсти слева",
		3: "нижней челюсти слева",
		4: "нижней челюсти справа",
	};

	return `${names[num] || "Зуб"} ${quadNames[quadrant] || ""}`.trim();
}
