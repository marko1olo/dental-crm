/**
 * Mandibular Nerve & Cortical Plate Safety Audit Engine (Facade)
 * Mandate 8b: Декомпозиция монолитов (строго <= 120 строк).
 * Mandate 8e: Doctor Autonomy (Zero audio alarms).
 */

export * from "./nerveSafety/index.js";
import { auditMandibularNerveSafety } from "./nerveSafety/index.js";

export const auditImplantNerveSafety = auditMandibularNerveSafety;
export const auditNerveSafetyMargin = auditMandibularNerveSafety;

/**
 * Purged per Mandate 8e: Doctor Autonomy.
 * Clean no-op: software must never screech or trigger audio alarms during surgical planning.
 */
export function playNerveSafetyAudioAlarm(
	_safetyStatus?: "safe" | "warning" | "danger" | "unmeasured",
	_isAudioEnabled = false,
): void {
	// Purged: zero audio panic sirens or whistling
}

export function disposeNerveSafetyAudioAlarm(): void {
	// Clean no-op
}
