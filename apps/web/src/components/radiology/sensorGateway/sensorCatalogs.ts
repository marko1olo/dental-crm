/**
 * sensorCatalogs.ts — Layer 0: Каталоги профилей и моделей визиографов и вспомогательные функции выборки.
 *
 * Implements Mandates 8e, 8s.
 */

import type { SensorBrandId, UniversalSensorModel } from "./types";
import { SENSOR_VENDOR_PROFILES } from "./vendorProfiles";
import { UNIVERSAL_SENSOR_CATALOG } from "./sensorModelsCatalog";

export { SENSOR_VENDOR_PROFILES } from "./vendorProfiles";
export { UNIVERSAL_SENSOR_CATALOG } from "./sensorModelsCatalog";

/**
 * Retrieves sensor specification by model ID.
 */
export function getUniversalSensorById(modelId: string): UniversalSensorModel | undefined {
	return UNIVERSAL_SENSOR_CATALOG.find((s) => s.id === modelId);
}

/**
 * Returns all sensors filtered by brand.
 */
export function getSensorsByBrand(brand: SensorBrandId): UniversalSensorModel[] {
	return UNIVERSAL_SENSOR_CATALOG.filter((s) => s.brand === brand);
}
