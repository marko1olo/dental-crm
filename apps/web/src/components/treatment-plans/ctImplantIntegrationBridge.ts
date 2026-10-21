/**
 * ctImplantIntegrationBridge.ts — фасад моста 3D КЛКТ с генерацией планов лечения DENTE CRM.
 * Декомпозирован по Мандату 8b (все файлы <= 120 строк).
 */

export * from "../radiology/ctImplantIntegrationBridge";
export * from "./ctBridge/types";
export * from "./ctBridge/implantBrandDefaults";
export * from "./ctBridge/implantPackageBuilder";
export * from "./ctBridge/boneAugmentationBuilder";
export * from "./ctBridge/destructionProstheticsBuilder";
export * from "./ctBridge/tierMetas";
export * from "./ctBridge/tierStageAssembler";
export * from "./ctBridge/tierScenarioGenerator";
export * from "./ctBridge/toothStateClassifier";
export * from "./ctBridge/odontogramFindingsExtractor";
