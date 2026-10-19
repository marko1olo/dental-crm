/**
 * anesthesiaExpressTypes.ts — Express anesthesia preset type definitions
 * Standards: Минздрав РФ, СтАР. Mandate 8b (<= 120 lines).
 */
import type {
	AnestheticDrugKey,
	ConductionTechniqueId,
	NeedleGaugeId,
} from "./anesthesiaTechniqueTypes";

export type ExpressAnesthesiaPresetId =
	| "infiltration_articaine_1_7"
	| "mandibular_weisbrem_articaine_1_7"
	| "torusal_articaine_1_7"
	| "mandibular_cardio_scandonest_1_7"
	| "intraligamentary_articaine_0_4"
	| "mandibular_plus_infiltration_ultracaine_forte"
	| "infiltration_septanest_1_7";

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
