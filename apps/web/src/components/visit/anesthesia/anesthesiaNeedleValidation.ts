/**
 * anesthesiaNeedleValidation.ts — Needle safety and technique compatibility validation
 * Standards: Минздрав РФ, СтАР. Mandate 8b (<= 120 lines).
 */

import { DENTAL_NEEDLE_CATALOG } from "./anesthesiaNeedleCatalog";
import type {
	ConductionTechniqueId,
	NeedleGaugeId,
} from "./anesthesiaTechniqueTypes";

export function validateNeedleForTechnique(
	techniqueId: ConductionTechniqueId,
	needleId: NeedleGaugeId,
): {
	readonly isValid: boolean;
	readonly warningRu: string | null;
	readonly isSevereMismatch: boolean;
} {
	const needle =
		DENTAL_NEEDLE_CATALOG[needleId] ??
		DENTAL_NEEDLE_CATALOG.gauge_30_medium_25mm;

	const isMandibularDeep =
		techniqueId === "mandibular_weisbrem" ||
		techniqueId === "mandibular_gow_gates" ||
		techniqueId === "mandibular_akinosi" ||
		techniqueId === "torusal";

	if (isMandibularDeep) {
		if (needle.lengthMm < 25) {
			return {
				isValid: false,
				warningRu: `Несоответствие длины иглы (${needle.lengthMm} мм)! Для мандибулярной блокады глубина 20–25 мм. Рекомендуется длинная игла.`,
				isSevereMismatch: true,
			};
		}
		if (needle.gauge === "30G") {
			return {
				isValid: true,
				warningRu: `Внимание: Игла 30G имеет узкий просвет. Повышается риск ложноотрицательной аспирации. Рекомендуется игла 27G 35 мм.`,
				isSevereMismatch: false,
			};
		}
	}

	if (techniqueId === "intraligamentary_pdl" && needle.lengthMm > 15) {
		return {
			isValid: false,
			warningRu: `Для интралигаментарной анестезии длинная игла (${needle.lengthMm} мм) сгибается. Используйте ультракороткую 30G 8–12 мм.`,
			isSevereMismatch: true,
		};
	}

	if (
		(techniqueId === "greater_palatine" || techniqueId === "incisive_canal") &&
		needle.lengthMm > 21
	) {
		return {
			isValid: true,
			warningRu: `На небе тонкая надкостница. Длинная игла (${needle.lengthMm} мм) избыточна. Оптимальна 30G 12 мм.`,
			isSevereMismatch: false,
		};
	}

	if (techniqueId === "tuberal" && needle.lengthMm < 20) {
		return {
			isValid: false,
			warningRu: `Для туберальной анестезии игла ${needle.lengthMm} мм недостаточна.`,
			isSevereMismatch: true,
		};
	}

	return { isValid: true, warningRu: null, isSevereMismatch: false };
}
