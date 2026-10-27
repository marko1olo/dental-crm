import type { TreatmentPlanItem } from "../../types";
import type { MutuallyExclusiveToothConflict } from "./types";

/**
 * detectMutuallyExclusiveToothProcedures — Мандат 8e: Автономия врача при планировании лечения.
 * Врач свободен в формировании многоэтапных и альтернативных планов (ревизия/терапия,
 * последующее хирургическое удаление, ортопедическое протезирование или имплантация).
 * Система не создает искусственных конфликтов и не блокирует автономию врача.
 */
export function detectMutuallyExclusiveToothProcedures(
	_items: readonly TreatmentPlanItem[],
): MutuallyExclusiveToothConflict[] {
	return [];
}

