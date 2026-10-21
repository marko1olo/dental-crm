/**
 * anesthesiaExpressPresets.ts — 1-Click Chairside Express Anesthesia Presets
 * Standards: Минздрав РФ, СтАР. Mandates: 8e (Doctor Autonomy), 8b (<= 120 lines).
 */
import { EXPRESS_ANESTHESIA_PRESETS } from "./anesthesiaExpressPresetsData";
import type {
	ExpressAnesthesiaPreset,
	ExpressAnesthesiaPresetId,
} from "./anesthesiaExpressTypes";
import {
	getTechniqueSpecification,
	validateNeedleForTechnique,
} from "./anesthesiaTechniqueMath";
import {
	type AnesthesiaSessionData,
	type AspirationAttemptRecord,
	type AspirationProtocolResult,
	generateAspirationProtocolEntry,
} from "./aspirationSafetyEngine";

export * from "./anesthesiaExpressTypes";
export { EXPRESS_ANESTHESIA_PRESETS };

export const EXPRESS_PRESETS_BY_ID: Record<
	ExpressAnesthesiaPresetId,
	ExpressAnesthesiaPreset
> = EXPRESS_ANESTHESIA_PRESETS.reduce(
	(acc, p) => {
		acc[p.id] = p;
		return acc;
	},
	{} as Record<ExpressAnesthesiaPresetId, ExpressAnesthesiaPreset>,
);

export function getExpressPresetById(
	id: ExpressAnesthesiaPresetId,
): ExpressAnesthesiaPreset | undefined {
	return EXPRESS_PRESETS_BY_ID[id];
}

export function createExpressAspirationAttempt(
	preset: ExpressAnesthesiaPreset,
	attemptNumber = 1,
): AspirationAttemptRecord {
	return {
		attemptNumber,
		timestampIso: new Date().toISOString(),
		plane1Result: "negative",
		plane2Result: preset.isTwoPlaneRequired ? "negative" : undefined,
		overallResult: "negative",
		bloodObserved: false,
		needleId: preset.needleId,
		actionTaken: "proceed_slow_injection",
		notesRu: preset.aspirationNotesRu,
	};
}

export function applyExpressPresetToSession(
	currentSession: Partial<AnesthesiaSessionData>,
	preset: ExpressAnesthesiaPreset,
): AnesthesiaSessionData {
	const attempt = createExpressAspirationAttempt(preset, 1);
	const techniqueSpec = getTechniqueSpecification(preset.techniqueId);

	return {
		patientFullName: currentSession.patientFullName,
		medCardNumber: currentSession.medCardNumber,
		patientAgeYears: currentSession.patientAgeYears,
		patientWeightKg: currentSession.patientWeightKg,
		hasCardiovascularRisk:
			preset.drugKey === "mepivacaine_plain_3"
				? true
				: currentSession.hasCardiovascularRisk,
		toothNumber: currentSession.toothNumber,
		side: currentSession.side ?? "right",
		techniqueId: preset.techniqueId,
		needleId: preset.needleId,
		drugKey: preset.drugKey,
		volumeMl: preset.volumeMl,
		aspirationStatus: "negative_safe",
		isTwoPlaneConfirmed:
			preset.isTwoPlaneRequired || techniqueSpec.aspirationPlanesRequired >= 2,
		attempts: [attempt],
		onsetDurationMinutesActual:
			preset.techniqueId === "intraligamentary_pdl" ? 1 : 2,
		notesRu: preset.notesRu,
	};
}

export function generateExpressPresetDiaryText(
	preset: ExpressAnesthesiaPreset,
	overrides?: Partial<AnesthesiaSessionData>,
): AspirationProtocolResult {
	const session = applyExpressPresetToSession(overrides ?? {}, preset);
	return generateAspirationProtocolEntry(session);
}

export function validateAllExpressPresets(): {
	readonly allValid: boolean;
	readonly results: readonly {
		readonly presetId: ExpressAnesthesiaPresetId;
		readonly isNeedleValid: boolean;
		readonly warningRu: string | null;
	}[];
} {
	const results = EXPRESS_ANESTHESIA_PRESETS.map((p) => {
		const validation = validateNeedleForTechnique(p.techniqueId, p.needleId);
		return {
			presetId: p.id,
			isNeedleValid: validation.isValid,
			warningRu: validation.warningRu,
		};
	});

	const allValid = results.every(
		(r) => r.isNeedleValid && r.warningRu === null,
	);
	return { allValid, results };
}
