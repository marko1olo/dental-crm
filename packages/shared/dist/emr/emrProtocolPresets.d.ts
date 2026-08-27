/**
 * ═══════════════════════════════════════════════════════════════════════════
 * EMR FORM 043/U STATUTORY PROTOCOL PRESETS & CLINICAL CATALOG
 * Order of the Ministry of Health of the Russian Federation № 834n / № 804n / Star
 * ═══════════════════════════════════════════════════════════════════════════
 */
import { z } from "zod";
/** Клинические направления в стоматологии */
export declare const clinicalSpecialtyKindSchema: z.ZodEnum<["therapy", "endodontics", "surgery", "orthopedics", "periodontics", "orthodontics", "pediatric"]>;
export type ClinicalSpecialtyKind = z.infer<typeof clinicalSpecialtyKindSchema>;
export declare const clinicalSpecialtyLabels: Record<ClinicalSpecialtyKind, string>;
/** Классы кариозных полостей по Блэку (Black Classification I-VI) */
export declare const blackCavityClassSchema: z.ZodEnum<["class_I", "class_II", "class_III", "class_IV", "class_V", "class_VI"]>;
export type BlackCavityClass = z.infer<typeof blackCavityClassSchema>;
export declare const blackCavityClassLabels: Record<BlackCavityClass, string>;
/** Типы местной анестезии */
export declare const localAnesthesiaTypeSchema: z.ZodEnum<["infiltration", "mandibular", "torus", "tuberal", "palatal", "incisive", "intraligamentary", "intraosseous", "application"]>;
export type LocalAnesthesiaType = z.infer<typeof localAnesthesiaTypeSchema>;
/** Препараты для местной анестезии */
export declare const statutoryAnestheticDrugSchema: z.ZodEnum<["septanest_1_100000", "septanest_1_200000", "ultracain_ds_forte", "ultracain_ds", "ubistesin_forte", "ubistesin", "scandonest_3_plain", "lidocaine_2", "articaine_inibsa"]>;
export type StatutoryAnestheticDrug = z.infer<typeof statutoryAnestheticDrugSchema>;
export declare const anestheticDrugSchema: z.ZodEnum<["septanest_1_100000", "septanest_1_200000", "ultracain_ds_forte", "ultracain_ds", "ubistesin_forte", "ubistesin", "scandonest_3_plain", "lidocaine_2", "articaine_inibsa"]>;
export type AnestheticDrug = StatutoryAnestheticDrug;
export declare const statutoryAnestheticDrugLabels: Record<StatutoryAnestheticDrug, {
    name: string;
    activeSubstance: string;
    carpuleVolumeMl: number;
    vasoconstrictor: string;
}>;
export declare const anestheticDrugLabels: Record<"septanest_1_100000" | "septanest_1_200000" | "ultracain_ds_forte" | "ultracain_ds" | "ubistesin_forte" | "ubistesin" | "scandonest_3_plain" | "lidocaine_2" | "articaine_inibsa", {
    name: string;
    activeSubstance: string;
    carpuleVolumeMl: number;
    vasoconstrictor: string;
}>;
export interface Order804nServiceRef {
    readonly code: string;
    readonly nameRu: string;
    readonly isMandatory: boolean;
}
/** Структурированный клинический шаблон протокола */
export interface ClinicalProtocolTemplate {
    readonly icd10Code: string;
    readonly icd10Title: string;
    readonly clinicalDiagnosis: string;
    readonly specialty: ClinicalSpecialtyKind;
    readonly defaultSubjectiveComplaints: string;
    readonly defaultAnamnesisMorbi: string;
    readonly defaultObjectiveStatus: string;
    readonly defaultPercussion: "negative" | "positive_mild" | "positive_sharp";
    readonly defaultThermalTest: "indifferent" | "transient_pain" | "lingering_sharp_pain" | "pain_relieved_by_cold";
    readonly defaultProbing: "none" | "along_enamel_dentin_border" | "at_cavity_bottom" | "bleeding_orifice";
    readonly defaultEodMicroamperes?: number | null;
    readonly defaultProcedureProtocol: string;
    readonly anesthesiaDefault: {
        drug: AnestheticDrug;
        doseCarpules: number;
        doseMl: number;
        technique: LocalAnesthesiaType;
    };
    readonly defaultMaterials: string[];
    readonly defaultRecommendations: string;
    readonly defaultPrescriptions?: string[];
    readonly requiresRubberDam: boolean;
    readonly requiresApexLocatorRvg: boolean;
    readonly statutoryOrderRef: string;
    readonly order804nServices: readonly Order804nServiceRef[];
}
/**
 * Базовый каталог клинических протоколов по МКБ-10 (Приказ Минздрава № 834н / СтАР)
 */
export declare const STATUTORY_EMR_PROTOCOL_CATALOG: Record<string, ClinicalProtocolTemplate>;
/** Дополнительные МКБ-10 коды для полного стоматологического классификатора */
export declare const COMPANION_ICD10_CODES: Record<string, {
    title: string;
    category: ClinicalSpecialtyKind;
    fallbackPresetKey: string;
}>;
