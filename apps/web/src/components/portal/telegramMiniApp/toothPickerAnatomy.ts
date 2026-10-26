/**
 * Tooth Anatomy and Quadrant Mapping Helpers
 * (DOMAIN: TELEGRAM MINI APP - LAYER 2 ENGINE)
 */

import {
	isDeciduousTooth,
	isMaxillaryTooth,
} from "@dental/shared";

export interface ToothAnatomicalTitle {
	name: string;
	group: "incisor" | "canine" | "premolar" | "molar";
	archName: string;
}

/**
 * Русские анатомические названия зубов по стандарту СтАР
 */
export function getToothAnatomicalTitle(toothNum: number): ToothAnatomicalTitle {
	const isPediatric = isDeciduousTooth(toothNum);
	const arch = isMaxillaryTooth(toothNum) ? "Верхняя челюсть" : "Нижняя челюсть";
	const lastDigit = toothNum % 10;

	if (lastDigit === 1) {
		return {
			name: `${isPediatric ? "Молочный ц" : "Ц"}ентральный резец`,
			group: "incisor",
			archName: arch,
		};
	}
	if (lastDigit === 2) {
		return {
			name: `${isPediatric ? "Молочный б" : "Б"}оковой резец`,
			group: "incisor",
			archName: arch,
		};
	}
	if (lastDigit === 3) {
		return {
			name: `${isPediatric ? "Молочный к" : "К"}лык`,
			group: "canine",
			archName: arch,
		};
	}
	if (lastDigit === 4) {
		return {
			name: isPediatric ? "Первый молочный моляр" : "Первый премоляр",
			group: isPediatric ? "molar" : "premolar",
			archName: arch,
		};
	}
	if (lastDigit === 5) {
		return {
			name: isPediatric ? "Второй молочный моляр" : "Второй премоляр",
			group: isPediatric ? "molar" : "premolar",
			archName: arch,
		};
	}
	if (lastDigit === 6) {
		return {
			name: "Первый моляр («шестёрка»)",
			group: "molar",
			archName: arch,
		};
	}
	if (lastDigit === 7) {
		return {
			name: "Второй моляр («семёрка»)",
			group: "molar",
			archName: arch,
		};
	}
	if (lastDigit === 8) {
		return {
			name: "Третий моляр («зуб мудрости»)",
			group: "molar",
			archName: arch,
		};
	}

	return {
		name: `Зуб #${toothNum}`,
		group: "incisor",
		archName: arch,
	};
}
