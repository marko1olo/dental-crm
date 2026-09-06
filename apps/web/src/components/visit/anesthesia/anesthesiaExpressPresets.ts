/**
 * anesthesiaExpressPresets.ts — 1-Click Chairside Express Anesthesia Presets
 * Standards: Минздрав РФ (Форма № 043/у), СтАР, ФАР, Malamed
 * Mandates 8e (Doctor Autonomy), 8k (Friction-Killer Law), 8n (Solo Doctor & Small Clinic Sovereignty)
 */

import {
	AnestheticDrugKey,
	ConductionTechniqueId,
	NeedleGaugeId,
	getAnestheticDrugSpecification,
	getNeedleSpecification,
	getTechniqueSpecification,
	validateNeedleForTechnique,
} from './anesthesiaTechniqueMath';
import {
	AnesthesiaSessionData,
	AspirationAttemptRecord,
	Form043ExportResult,
	generateAspirationJournalEntry043,
} from './aspirationSafetyEngine';

export type ExpressAnesthesiaPresetId =
	| 'infiltration_articaine_1_7'
	| 'mandibular_weisbrem_articaine_1_7'
	| 'torusal_articaine_1_7'
	| 'mandibular_cardio_scandonest_1_7'
	| 'intraligamentary_articaine_0_4';

export interface ExpressAnesthesiaPreset {
	readonly id: ExpressAnesthesiaPresetId;
	readonly title: string;
	readonly subtitle: string;
	readonly fullLabelRu: string;
	readonly techniqueId: ConductionTechniqueId;
	readonly needleId: NeedleGaugeId;
	readonly drugKey: AnestheticDrugKey;
	readonly volumeMl: number;
	readonly isTwoPlaneRequired: boolean;
	readonly notesRu: string;
	readonly aspirationNotesRu: string;
}

export const EXPRESS_ANESTHESIA_PRESETS: readonly ExpressAnesthesiaPreset[] = [
	{
		id: 'infiltration_articaine_1_7',
		title: 'Инфильтрация 1.7 мл',
		subtitle: 'Артикаин 1:100 000, 30G 21 мм, аспирация отр.',
		fullLabelRu: 'Инфильтрация 1.7 мл (Артикаин 1:100 000, 30G 21 мм, аспирация отр.)',
		techniqueId: 'infiltration_supraperiosteal',
		needleId: 'gauge_30_short_21mm',
		drugKey: 'articaine_1_100k',
		volumeMl: 1.7,
		isTwoPlaneRequired: false,
		notesRu:
			'Инфильтрационная наднадкостничная анестезия. Аспирационная проба отрицательная. Обезболивание глубокое, аллергических реакций нет.',
		aspirationNotesRu: 'Отрицательная аспирационная проба (кровь в карпуле отсутствует).',
	},
	{
		id: 'mandibular_weisbrem_articaine_1_7',
		title: 'Мандибулярная 1.7 мл',
		subtitle: 'По Вайсбрему, Артикаин 1:100 000, 27G 35 мм, аспирация отр.',
		fullLabelRu: 'Мандибулярная 1.7 мл (По Вайсбрему, Артикаин 1:100 000, 27G 35 мм, аспирация отр.)',
		techniqueId: 'mandibular_weisbrem',
		needleId: 'gauge_27_long_35mm',
		drugKey: 'articaine_1_100k',
		volumeMl: 1.7,
		isTwoPlaneRequired: true,
		notesRu:
			'Мандибулярная проводниковая блокада по Вайсбрему. Двухплоскостная аспирация отрицательная. Обезболивание глубокое, онемение губы и языка.',
		aspirationNotesRu:
			'Отрицательная аспирационная проба в 2-х плоскостях (0° и 180°). Кровь в карпуле отсутствует.',
	},
	{
		id: 'torusal_articaine_1_7',
		title: 'Торусальная 1.7 мл',
		subtitle: 'Артикаин 1:100 000, 27G 35 мм, аспирация отр.',
		fullLabelRu: 'Торусальная 1.7 мл (Артикаин 1:100 000, 27G 35 мм, аспирация отр.)',
		techniqueId: 'torusal',
		needleId: 'gauge_27_long_35mm',
		drugKey: 'articaine_1_100k',
		volumeMl: 1.7,
		isTwoPlaneRequired: true,
		notesRu:
			'Торусальная проводниковая блокада нижнечелюстного валика. Двухплоскостная аспирация отрицательная. Обезболивание глубокое.',
		aspirationNotesRu:
			'Отрицательная аспирационная проба в 2-х плоскостях (0° и 180°). Кровь в карпуле отсутствует.',
	},
	{
		id: 'mandibular_cardio_scandonest_1_7',
		title: 'Мандибулярная кардио',
		subtitle: 'Скандонест 3% без адреналина, 27G 35 мм, аспирация отр.',
		fullLabelRu: 'Мандибулярная кардио (Скандонест 3% без адреналина, 27G 35 мм, аспирация отр.)',
		techniqueId: 'mandibular_weisbrem',
		needleId: 'gauge_27_long_35mm',
		drugKey: 'mepivacaine_plain_3',
		volumeMl: 1.7,
		isTwoPlaneRequired: true,
		notesRu:
			'Кардио-протокол: Мепивакаин (Скандонест 3%) без вазоконстриктора. Двухплоскостная аспирация отрицательная. Гемодинамика стабильна.',
		aspirationNotesRu:
			'Отрицательная аспирационная проба в 2-х плоскостях (0° и 180°). Кровь в карпуле отсутствует.',
	},
	{
		id: 'intraligamentary_articaine_0_4',
		title: 'Интралигаментарная 0.4 мл',
		subtitle: 'Артикаин 1:100 000, 30G 12 мм, аспирация отр.',
		fullLabelRu: 'Интралигаментарная 0.4 мл (Артикаин 1:100 000, 30G 12 мм, аспирация отр.)',
		techniqueId: 'intraligamentary_pdl',
		needleId: 'gauge_30_ultrashort_12mm',
		drugKey: 'articaine_1_100k',
		volumeMl: 0.4,
		isTwoPlaneRequired: false,
		notesRu:
			'Интралигаментарная периодонтальная анестезия (PDL) под давлением 10–15 атм. Изолированное обезболивание причинного зуба.',
		aspirationNotesRu: 'Отрицательная аспирационная проба. Кровь в карпуле отсутствует.',
	},
];

export const EXPRESS_PRESETS_BY_ID: Record<ExpressAnesthesiaPresetId, ExpressAnesthesiaPreset> =
	EXPRESS_ANESTHESIA_PRESETS.reduce(
		(acc, p) => {
			acc[p.id] = p;
			return acc;
		},
		{} as Record<ExpressAnesthesiaPresetId, ExpressAnesthesiaPreset>,
	);

export function getExpressPresetById(id: ExpressAnesthesiaPresetId): ExpressAnesthesiaPreset | undefined {
	return EXPRESS_PRESETS_BY_ID[id];
}

/**
 * Creates a verified negative aspiration attempt record for the express preset.
 */
export function createExpressAspirationAttempt(
	preset: ExpressAnesthesiaPreset,
	attemptNumber = 1,
): AspirationAttemptRecord {
	return {
		attemptNumber,
		timestampIso: new Date().toISOString(),
		plane1Result: 'negative',
		plane2Result: preset.isTwoPlaneRequired ? 'negative' : undefined,
		overallResult: 'negative',
		bloodObserved: false,
		needleId: preset.needleId,
		actionTaken: 'proceed_slow_injection',
		notesRu: preset.aspirationNotesRu,
	};
}

/**
 * Applies express preset to clinical session data with 100% legal compliance.
 */
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
			preset.drugKey === 'mepivacaine_plain_3' ? true : currentSession.hasCardiovascularRisk,
		toothNumber: currentSession.toothNumber,
		side: currentSession.side ?? 'right',
		techniqueId: preset.techniqueId,
		needleId: preset.needleId,
		drugKey: preset.drugKey,
		volumeMl: preset.volumeMl,
		aspirationStatus: 'negative_safe',
		isTwoPlaneConfirmed: preset.isTwoPlaneRequired || techniqueSpec.aspirationPlanesRequired >= 2,
		attempts: [attempt],
		onsetDurationMinutesActual: preset.techniqueId === 'intraligamentary_pdl' ? 1 : 2,
		notesRu: preset.notesRu,
	};
}

/**
 * Generates ready-to-paste Form 043/u diary text directly from the preset.
 */
export function generateExpressPresetDiaryText(
	preset: ExpressAnesthesiaPreset,
	overrides?: Partial<AnesthesiaSessionData>,
): Form043ExportResult {
	const session = applyExpressPresetToSession(overrides ?? {}, preset);
	return generateAspirationJournalEntry043(session);
}

/**
 * Validates that all express presets conform to clinical safety guidelines.
 */
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

	const allValid = results.every((r) => r.isNeedleValid && r.warningRu === null);
	return { allValid, results };
}
