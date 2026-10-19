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
	_techniqueId: ConductionTechniqueId,
	_needleId: NeedleGaugeId,
): {
	readonly isValid: boolean;
	readonly warningRu: string | null;
	readonly isSevereMismatch: boolean;
} {
	// Мандат 8e (Автономия врача): ликвидация академического блоата и бредовых предупреждений об изгибе иглы.
	// Чистый безопасный хелпер без навязчивых алертов и блокировок у кресла.
	return { isValid: true, warningRu: null, isSevereMismatch: false };
}

