/**
 * SANPIN 2.1.3684-21 MEDICAL WASTE PRESETS (Фасад)
 * Мандат 8b: лимит строк <= 120 на файл.
 */

export * from "./medicalWasteTypes.js";

export {
	SANPIN_MEDICAL_WASTE_CLASSES,
	getMedicalWasteClass,
} from "./medicalWasteClassesData.js";

export {
	SANPIN_WASTE_PACKAGING_TYPES,
	getMedicalWastePackaging,
} from "./medicalWastePackagingData.js";

export {
	SANPIN_DECONTAMINATION_METHODS,
	getDecontaminationMethod,
} from "./medicalWasteDecontaminationData.js";

export {
	SANPIN_STORAGE_LOCATIONS,
	getWasteStorageLocation,
} from "./medicalWasteStorageData.js";
