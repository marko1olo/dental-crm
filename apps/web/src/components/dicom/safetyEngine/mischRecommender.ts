/**
 * mischRecommender.ts — Подбор типа имплантата и протокола по шкале Миша (Мандат 8b <= 120 строк).
 */

import type { MischImplantRecommendation } from "./types";
import {
	MISCH_D1_DATA,
	MISCH_D2_DATA,
	MISCH_D3_DATA,
	MISCH_D4_DATA,
	MISCH_D5_DATA,
} from "./mischRecommendationsCatalog";

export function getImplantRecommendationForMisch(hu: number): MischImplantRecommendation {
	if (!Number.isFinite(hu) || hu < 150) {
		return { ...MISCH_D5_DATA, hu };
	}
	if (hu < 350) {
		return { ...MISCH_D4_DATA, hu };
	}
	if (hu < 850) {
		return { ...MISCH_D3_DATA, hu };
	}
	if (hu <= 1250) {
		return { ...MISCH_D2_DATA, hu };
	}
	return { ...MISCH_D1_DATA, hu };
}
