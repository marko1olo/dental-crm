import type { QuickCanalState } from "./types";

/**
 * Определение анатомических каналов по First Principles для компактного бара у кресла:
 * В/Ч моляры (16, 17, 18, 26, 27, 28): MB, DB, P
 * Н/Ч моляры (36, 37, 38, 46, 47, 48): M, D (или MB, ML, D)
 * В/Ч премоляры (14, 24): B, P
 * Остальные (резцы, клыки, нижние премоляры): Основной (Main)
 */
export function getChairsideDefaultCanals(toothNumber: number): QuickCanalState[] {
	const isUpperMolar =
		(toothNumber >= 16 && toothNumber <= 18) || (toothNumber >= 26 && toothNumber <= 28);
	const isLowerMolar =
		(toothNumber >= 36 && toothNumber <= 38) || (toothNumber >= 46 && toothNumber <= 48);
	const isUpperPremolar = toothNumber === 14 || toothNumber === 24;

	if (isUpperMolar) {
		return [
			{ id: `c-mb-${Date.now()}-1`, name: "MB", workingLengthMm: 21.5, masterApicalFile: "#25", taper: ".04", obturationType: "gutta_sealer", sealer: "AH Plus" },
			{ id: `c-db-${Date.now()}-2`, name: "DB", workingLengthMm: 20.0, masterApicalFile: "#25", taper: ".04", obturationType: "gutta_sealer", sealer: "AH Plus" },
			{ id: `c-p-${Date.now()}-3`, name: "P", workingLengthMm: 22.0, masterApicalFile: "#30", taper: ".04", obturationType: "gutta_sealer", sealer: "AH Plus" },
		];
	}

	if (isLowerMolar) {
		return [
			{ id: `c-m-${Date.now()}-1`, name: "M", workingLengthMm: 21.0, masterApicalFile: "#25", taper: ".04", obturationType: "gutta_sealer", sealer: "AH Plus" },
			{ id: `c-d-${Date.now()}-2`, name: "D", workingLengthMm: 21.5, masterApicalFile: "#30", taper: ".04", obturationType: "gutta_sealer", sealer: "AH Plus" },
		];
	}

	if (isUpperPremolar) {
		return [
			{ id: `c-b-${Date.now()}-1`, name: "B", workingLengthMm: 21.5, masterApicalFile: "#25", taper: ".04", obturationType: "gutta_sealer", sealer: "AH Plus" },
			{ id: `c-p-${Date.now()}-2`, name: "P", workingLengthMm: 21.5, masterApicalFile: "#25", taper: ".04", obturationType: "gutta_sealer", sealer: "AH Plus" },
		];
	}

	// По умолчанию 1 канал (резцы, клыки, нижние премоляры)
	return [
		{ id: `c-main-${Date.now()}-1`, name: "Основной", workingLengthMm: 22.0, masterApicalFile: "#30", taper: ".04", obturationType: "gutta_sealer", sealer: "AH Plus" },
	];
}
