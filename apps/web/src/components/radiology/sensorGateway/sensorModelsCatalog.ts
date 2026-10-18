/**
 * sensorModelsCatalog.ts — Layer 0: Канонический реестр моделей дентальных сенсоров (30+ моделей мировых брендов).
 * Implements Mandates 8e, 8s, 8p, 8b.
 */

import type { UniversalSensorModel } from "./types";
import {
	VATECH_SENSORS,
	CARESTREAM_PLANMECA_SENSORS,
	SIRONA_DEXIS_SENSORS,
	ACTEON_WOODPECKER_SENSORS,
	HANDY_FONA_KAVO_SENSORS,
	MYRAY_OWANDY_EIGHTEETH_DUERR_SENSORS,
} from "./catalogs/index";

export * from "./catalogs/index";

/**
 * Canonical Multi-Vendor RVG Sensor Catalog (30+ models covering all world brands).
 */
export const UNIVERSAL_SENSOR_CATALOG: readonly UniversalSensorModel[] = [
	...VATECH_SENSORS,
	...CARESTREAM_PLANMECA_SENSORS,
	...SIRONA_DEXIS_SENSORS,
	...ACTEON_WOODPECKER_SENSORS,
	...HANDY_FONA_KAVO_SENSORS,
	...MYRAY_OWANDY_EIGHTEETH_DUERR_SENSORS,
];
