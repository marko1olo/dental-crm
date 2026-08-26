/**
 * anesthesiaTechniqueMath.ts — Anatomic & Mathematical Engine for Dental Anesthesia Techniques
 * Standards: Минздрав РФ, СтАР, ФАР, Malamed
 */

import {
	AnestheticDrugKey,
	AnestheticDrugSpec,
	ConductionTechniqueId,
	NeedleGaugeId,
	NeedleSpecification,
	TechniqueSpecification,
} from './anesthesiaTechniqueTypes';
import {
	ANESTHETIC_DRUGS_CATALOG,
	CONDUCTION_TECHNIQUES_CATALOG,
	DENTAL_NEEDLE_CATALOG,
} from './anesthesiaTechniqueCatalog';

export * from './anesthesiaTechniqueTypes';
export * from './anesthesiaTechniqueCatalog';

/**
 * Returns technique specification from catalog with fallback.
 */
export function getTechniqueSpecification(techniqueId: ConductionTechniqueId): TechniqueSpecification {
	const spec = CONDUCTION_TECHNIQUES_CATALOG[techniqueId];
	if (!spec) {
		return CONDUCTION_TECHNIQUES_CATALOG.infiltration_supraperiosteal;
	}
	return spec;
}

/**
 * Returns needle specification from catalog with fallback.
 */
export function getNeedleSpecification(needleId: NeedleGaugeId): NeedleSpecification {
	const spec = DENTAL_NEEDLE_CATALOG[needleId];
	if (!spec) {
		return DENTAL_NEEDLE_CATALOG.gauge_30_medium_25mm;
	}
	return spec;
}

/**
 * Returns anesthetic drug specification from catalog with fallback.
 */
export function getAnestheticDrugSpecification(drugKey: AnestheticDrugKey): AnestheticDrugSpec {
	const spec = ANESTHETIC_DRUGS_CATALOG[drugKey];
	if (!spec) {
		return ANESTHETIC_DRUGS_CATALOG.articaine_1_100k;
	}
	return spec;
}

/**
 * Validates whether the chosen needle is safe and anatomically appropriate for the technique.
 */
export function validateNeedleForTechnique(
	techniqueId: ConductionTechniqueId,
	needleId: NeedleGaugeId,
): {
	readonly isValid: boolean;
	readonly warningRu: string | null;
	readonly isSevereMismatch: boolean;
} {
	const needle = getNeedleSpecification(needleId);

	// Mandibular deep blocks with short or ultra-thin needles
	const isMandibularDeep =
		techniqueId === 'mandibular_weisbrem' ||
		techniqueId === 'mandibular_gow_gates' ||
		techniqueId === 'mandibular_akinosi' ||
		techniqueId === 'torusal';

	if (isMandibularDeep) {
		if (needle.lengthMm < 25) {
			return {
				isValid: false,
				warningRu: `Критическое несоответствие длины иглы (${needle.lengthMm} мм)! Для мандибулярной блокады глубина погружения до 20–25 мм. Использование короткой иглы грозит погружением до канюли и поломкой иглы в тканях!`,
				isSevereMismatch: true,
			};
		}
		if (needle.gauge === '30G') {
			return {
				isValid: true,
				warningRu: `Внимание: Игла 30G имеет узкий просвет. При проводниковой анестезии в зоне крупных сосудов повышается риск ложноотрицательной аспирации (до 10–15%). Рекомендуется игла 27G 35 мм.`,
				isSevereMismatch: false,
			};
		}
	}

	// Intraligamentary requires short/ultrashort needle
	if (techniqueId === 'intraligamentary_pdl') {
		if (needle.lengthMm > 15) {
			return {
				isValid: false,
				warningRu: `Для интралигаментарной анестезии под давлением 10–15 атм длинная игла (${needle.lengthMm} мм) сгибается и травмирует корень. Используйте ультракороткую 30G 8–12 мм.`,
				isSevereMismatch: true,
			};
		}
	}

	// Palatal / Incisive with long needle
	if ((techniqueId === 'greater_palatine' || techniqueId === 'incisive_canal') && needle.lengthMm > 21) {
		return {
			isValid: true,
			warningRu: `На небе тонкая надкостница (глубина 3–5 мм). Длинная игла (${needle.lengthMm} мм) избыточна и повышает риск травмы. Оптимальна 30G 12 мм.`,
			isSevereMismatch: false,
		};
	}

	// Tuberal with 12mm or 8mm needle
	if (techniqueId === 'tuberal' && needle.lengthMm < 20) {
		return {
			isValid: false,
			warningRu: `Для туберальной анестезии глубина составляет 15–20 мм. Игла ${needle.lengthMm} мм недостаточна для достижения задних луночковых отверстий бугра.`,
			isSevereMismatch: true,
		};
	}

	return {
		isValid: true,
		warningRu: null,
		isSevereMismatch: false,
	};
}

/**
 * Calculates active substance in mg and epinephrine in mg from volume in ml.
 */
export function calculateAnestheticVolumeMg(
	drugKey: AnestheticDrugKey,
	volumeMl: number,
): {
	readonly activeMg: number;
	readonly epinephrineMg: number;
	readonly carpulesEquivalent: number;
} {
	const drug = getAnestheticDrugSpecification(drugKey);
	const activeMg = Math.round(drug.mgPerMlActive * volumeMl * 10) / 10;
	const epinephrineMg = Math.round(drug.epinephrineMgPerMl * volumeMl * 1000) / 1000;
	const carpulesEquivalent = Math.round((volumeMl / drug.standardCarpuleVolumeMl) * 10) / 10;

	return {
		activeMg,
		epinephrineMg,
		carpulesEquivalent,
	};
}

/**
 * Returns the recommended countdown wait time in seconds for complete block onset.
 */
export function getRecommendedWaitTimeSeconds(techniqueId: ConductionTechniqueId): number {
	const spec = getTechniqueSpecification(techniqueId);
	return spec.onsetMinutes.defaultWaitTimeSec;
}

/**
 * Formats a comprehensive localized string of numbness zones for the patient & diary.
 */
export function getNumbnessZonesDescription(
	techniqueId: ConductionTechniqueId,
	side: 'right' | 'left' | 'bilateral' = 'right',
	toothNumber?: string | number,
): string {
	const spec = getTechniqueSpecification(techniqueId);
	const sideRu = side === 'right' ? 'справа' : side === 'left' ? 'слева' : 'с двух сторон';
	const toothStr = toothNumber ? ` (в области зуба ${toothNumber})` : '';

	return `${spec.shortNameRu} ${sideRu}${toothStr}: ${spec.anatomicZones.summaryRu}`;
}
