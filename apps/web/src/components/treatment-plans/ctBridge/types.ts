import type { ImplantBrandKey, VirtualImplantSpec } from "../../radiology/implantSafetyEngine";
import type { TreatmentPlanItem, TreatmentPlanTierId } from "../types";

export type CbctDestructionLevel =
	| "caries"
	| "pulpitis"
	| "periodontitis_periapical"
	| "subgingival_fracture_hopeless"
	| "missing";

export type CbctAugmentationType =
	| "closed_sinus_lift"
	| "open_sinus_lift"
	| "gbr_membrane"
	| "socket_preservation";

export interface CbctImplantFinding {
	readonly toothFdi: number;
	readonly implantSpec?: VirtualImplantSpec | undefined;
	readonly brand?: ImplantBrandKey | undefined;
	readonly diameterMm?: number | undefined;
	readonly lengthMm?: number | undefined;
	readonly angulationDeg?: number | undefined;
	readonly ridgeHeightMm?: number | null | undefined;
	readonly ridgeWidthMm?: number | null | undefined;
	readonly meanHU?: number | null | undefined;
	readonly mischClass?: string | undefined;
	readonly nerveClearanceMm?: number | null | undefined;
	readonly recommendedTorqueNcm?: string | undefined;
	readonly drillingProtocol?: string | undefined;
	readonly isNerveWarning?: boolean | undefined;
	readonly isNerveDanger?: boolean | undefined;
	readonly needsSinusLift?: boolean | undefined;
	readonly sinusLiftType?: "closed" | "open" | undefined;
	readonly boneGraftRequired?: boolean | undefined;
	readonly boneDefectVolumeCc?: number | undefined;
	readonly customPriceRub?: number | undefined;
}

export interface CbctBoneDefectFinding {
	readonly toothFdi?: number | undefined;
	readonly region: "maxilla_sinus" | "mandible_canal" | "alveolar_crest" | "periapical";
	readonly defectType: "sinus_pneumatization" | "vertical_atrophy" | "horizontal_atrophy" | "periapical_cyst";
	readonly residualHeightMm?: number | undefined;
	readonly residualWidthMm?: number | undefined;
	readonly recommendedAugmentation: CbctAugmentationType;
	readonly boneGraftGrams?: number | undefined;
	readonly notes?: string | undefined;
}

export interface CbctToothDestructionFinding {
	readonly toothFdi: number;
	readonly destructionLevel: CbctDestructionLevel;
	readonly isHopelessForExtraction?: boolean | undefined;
	readonly periapicalDefectMm?: number | undefined;
	readonly rootCanalCount?: number | undefined;
	readonly crownRecommendation?: "metalloceramic" | "zirconia" | "emax" | "composite" | undefined;
	readonly notes?: string | undefined;
}

export interface CbctAutoPlanFindingsInput {
	readonly patientId?: string | undefined;
	readonly patientName?: string | undefined;
	readonly studyId?: string | undefined;
	readonly implants?: readonly CbctImplantFinding[] | undefined;
	readonly boneDefects?: readonly CbctBoneDefectFinding[] | undefined;
	readonly toothDestructions?: readonly CbctToothDestructionFinding[] | undefined;
	readonly generalFindings?: readonly string[] | undefined;
	readonly maxillaSinusPneumatization?: boolean | undefined;
	readonly mandibleAtrophy?: boolean | undefined;
	readonly notes?: string | undefined;
	readonly tierBrands?: Partial<Record<TreatmentPlanTierId, ImplantBrandKey>> | undefined;
}

export interface DestructionPlanBreakdown {
	readonly emergencyItems: TreatmentPlanItem[];
	readonly therapyItems: TreatmentPlanItem[];
	readonly surgeryItems: TreatmentPlanItem[];
	readonly orthoItems: TreatmentPlanItem[];
}
