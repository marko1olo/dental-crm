/**
 * ============================================================================
 * SANPIN 3.3686-21 & R 3.5.1904-04 STATUTORY REGISTERS & PRESETS TYPES (LAYER 0)
 * Нормативные типы журналов СанПиН: ПСО, стерилизации, азопирама, бак-контроля,
 * генеральных уборок, готовности установок и утилизации медицинских отходов.
 * ============================================================================
 */

// ─────────────────────────────────────────────────────────────────────────────
// 1. КОНТРОЛЬ ПРЕДСТЕРИЛИЗАЦИОННОЙ ОЧИСТКИ (ПСО, ФОРМА № 366/у)
// ─────────────────────────────────────────────────────────────────────────────

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

export interface DentalInstrumentCategoryDefinition {
	readonly id: string;
	readonly categoryNameRu: string;
	readonly defaultBatchSize: number;
	readonly typicalItemsRu: readonly string[];
	readonly criticalSurfacesRu: string;
}

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

// ─────────────────────────────────────────────────────────────────────────────
// 2. РЕЦИРКУЛЯТОРЫ И БАКТЕРИЦИДНЫЕ УСТАНОВКИ (Р 3.5.1904-04 / САНПИН 3.3686-21)
// ─────────────────────────────────────────────────────────────────────────────

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

export interface RoomSanitaryCategoryDefinition {
	readonly categoryCode: "I" | "II" | "III" | "IV";
	readonly categoryNameRu: string;
	readonly targetBactericidalEfficiencyPercent: number;
	readonly roomExamplesRu: readonly string[];
	readonly maxAllowedMicrobialCountCfuPerM3: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. ГЕНЕРАЛЬНЫЕ УБОРКИ (САНПИН 3.3686-21 РАЗДЕЛ IV)
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// 4. ЭКСПРЕСС-ЧЕК-ЛИСТ «ПОДГОТОВКА КАБИНЕТА И СТОМАТОЛОГИЧЕСКОЙ УСТАНОВКИ»
// ─────────────────────────────────────────────────────────────────────────────

export type DentalAppointmentType =
	| "therapy"
	| "endodontics"
	| "surgery"
	| "implantology"
	| "pediatric"
	| "orthopedics"
	| "orthodontics";

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

// ─────────────────────────────────────────────────────────────────────────────
// 5. МУЛЬТИ-АВТОКЛАВЫ И ОБОРУДОВАНИЕ СТЕРИЛИЗАЦИОННОЙ
// ─────────────────────────────────────────────────────────────────────────────

export interface SterilizerHardwareDefinition {
	readonly id: string;
	readonly code: string; // "АК-01", "АК-02", "АК-03", "АК-04", "СХ-01"
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

// ─────────────────────────────────────────────────────────────────────────────
// 6. МЕДИЦИНСКИЕ ОТХОДЫ КЛАССОВ А, Б, В, Г (САНПИН 2.1.3684-21)
// ─────────────────────────────────────────────────────────────────────────────

export type MedicalWasteDisposalClassCode = "class_A" | "class_B" | "class_V" | "class_G";

export interface MedicalWasteDisposalPresetDefinition {
	readonly classCode: MedicalWasteDisposalClassCode;
	readonly titleRu: string;
	readonly colorCodeRu: string;
	readonly statutoryColorHex: string;
	readonly containerTypeRu: string;
	readonly defaultTareWeightKg: number;
	readonly statutoryDensityKgPerLiter: number;
	readonly maxStorageWithoutColdHours: number;
	readonly typicalDentalItemsRu: readonly string[];
	readonly mandatoryDisinfectionProtocolRu: string;
	readonly sanpinClauseRu: string;
}

export type MedicalWasteDisposalPreset = MedicalWasteDisposalPresetDefinition;
