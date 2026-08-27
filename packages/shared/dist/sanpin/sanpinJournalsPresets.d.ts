/**
 * ============================================================================
 * SANPIN 3.3686-21 & R 3.5.1904-04 STATUTORY REGISTERS & PRESETS
 * Нормативные классификаторы, методики химических проб ПСО, регламенты работы
 * бактерицидных установок, графики генеральных уборок и реестр дезсредств.
 * ============================================================================
 */
export type PsoChemicalTestId = "azopyram" | "phenolphthalein" | "sudan_iii" | "both_standard";
export interface PsoChemicalTestDefinition {
    readonly id: PsoChemicalTestId;
    readonly nameRu: string;
    readonly shortNameRu: string;
    readonly targetPollutantRu: string;
    readonly reagentCompositionRu: string;
    readonly positiveReactionRu: string;
    readonly negativeReactionRu: string;
    readonly observationTimeSeconds: number;
    readonly sanpinRequirementRu: string;
}
export declare const SANPIN_PSO_CHEMICAL_TESTS: readonly PsoChemicalTestDefinition[];
export interface DentalInstrumentCategoryDefinition {
    readonly id: string;
    readonly categoryNameRu: string;
    readonly defaultBatchSize: number;
    readonly typicalItemsRu: readonly string[];
    readonly criticalSurfacesRu: string;
}
export declare const DENTAL_INSTRUMENT_CATEGORIES: readonly DentalInstrumentCategoryDefinition[];
export interface DetergentCatalogItem {
    readonly id: string;
    readonly brandNameRu: string;
    readonly manufacturerRu: string;
    readonly activeIngredientsRu: string;
    readonly recommendedPsoConcentrationPercent: number;
    readonly recommendedPsoExposureMinutes: number;
    readonly recommendedTempCelsius: number;
    readonly requiresPhenolphthaleinCheck: boolean;
    readonly isEnzymatic: boolean;
}
export declare const SANPIN_DETERGENTS_CATALOG: readonly DetergentCatalogItem[];
export interface UvRecirculatorModelDefinition {
    readonly id: string;
    readonly brandNameRu: string;
    readonly fullModelNameRu: string;
    readonly manufacturerRu: string;
    readonly deviceType: "recirculator_closed" | "irradiator_open" | "combined";
    readonly lampCount: number;
    readonly lampTypeRu: string;
    readonly lampPowerWatts: number;
    readonly standardLampLifetimeHours: number;
    readonly productivityM3PerHour: number;
    readonly allowedInPresenceOfPeople: boolean;
    readonly recommendedRoomVolumeM3: number;
}
export declare const UV_RECIRCULATOR_MODELS: readonly UvRecirculatorModelDefinition[];
export interface RoomSanitaryCategoryDefinition {
    readonly categoryCode: "I" | "II" | "III" | "IV";
    readonly categoryNameRu: string;
    readonly targetBactericidalEfficiencyPercent: number;
    readonly roomExamplesRu: readonly string[];
    readonly maxAllowedMicrobialCountCfuPerM3: number;
}
export declare const ROOM_SANITARY_CATEGORIES: readonly RoomSanitaryCategoryDefinition[];
export interface GeneralCleaningPresetDefinition {
    readonly roomType: "surgical" | "therapeutic" | "cso_sterile" | "xray" | "utility";
    readonly roomTypeTitleRu: string;
    readonly statutoryFrequencyDays: number;
    readonly sanpinNormRefRu: string;
    readonly standardDisinfectantRu: string;
    readonly standardConcentrationPercent: number;
    readonly standardExposureMinutes: number;
    readonly standardUvIrradiationMinutes: number;
    readonly standardVentilationMinutes: number;
    readonly mandatoryStepsRu: readonly string[];
}
export declare const GENERAL_CLEANING_PRESETS: readonly GeneralCleaningPresetDefinition[];
export type DentalAppointmentType = "therapy" | "endodontics" | "surgery" | "implantology" | "pediatric" | "orthopedics" | "orthodontics";
export interface CabinetReadinessPreset {
    readonly type: DentalAppointmentType;
    readonly titleRu: string;
    readonly shortLabelRu: string;
    readonly requiredDisinfectantsRu: readonly string[];
    readonly defaultDisinfectantRu: string;
    readonly minExposureMinutes: number;
    readonly requiredHandpiecesRu: readonly string[];
    readonly requiresCofferdam: boolean;
    readonly requiredAspirationRu: readonly string[];
    readonly requiredSterileTrayRu: readonly string[];
    readonly specialtyEquipmentRu: readonly string[];
    readonly mandatorySurfacesRu: readonly string[];
}
export declare const CABINET_READINESS_PRESETS: readonly CabinetReadinessPreset[];
export declare function getCabinetReadinessPreset(type: DentalAppointmentType): CabinetReadinessPreset;
export interface SterilizerHardwareDefinition {
    readonly id: string;
    readonly code: string;
    readonly brandModelRu: string;
    readonly manufacturerRu: string;
    readonly deviceClass: "Class_B_autoclave" | "Class_S_autoclave" | "Dry_heat_sterilizer";
    readonly chamberVolumeLiters: number;
    readonly serialNumber: string;
    readonly supportedRegimeIds: readonly string[];
    readonly defaultIndicatorId: string;
    readonly maxCyclesPerDay: number;
    readonly descriptionRu: string;
}
export declare const CLINIC_AUTOCLAVE_MODELS: readonly SterilizerHardwareDefinition[];
export declare function getSterilizerHardware(idOrCode: string): SterilizerHardwareDefinition;
