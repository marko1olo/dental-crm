/**
 * apps/api/src/routes/sanpin/sterilizationModules/sterilizationSchemas.ts
 *
 * Канонический фасад схем стерилизации и автоклавирования (Мандат 8b: строго <= 120 строк).
 */

import {
	createSterilizationLogDtoSchema,
	createSterilizerEquipmentDtoSchema,
	updateSterilizerEquipmentDtoSchema,
	type SterilizationPackagingType,
	type SterilizationCycleMode,
	type SterilizationIndicatorType,
} from "@dental/shared";

export * from "./schemas/sterilizationEnums.js";
export * from "./schemas/sterilizationBodySchemas.js";
export * from "./schemas/sterilizationTypes.js";

export {
	createSterilizationLogDtoSchema,
	createSterilizerEquipmentDtoSchema,
	updateSterilizerEquipmentDtoSchema,
	type SterilizationPackagingType,
	type SterilizationCycleMode,
	type SterilizationIndicatorType,
};
