/**
 * DENTE CRM — Alveolar Ridge Morphometry Compatibility Shim
 * Thin proxy facade re-exporting canonical domain logic from alveolarRidgeMorphometry.ts
 */

import {
	type AlveolarRidgeMeasurement,
	type EdentulousToothFdi,
	EDENTULOUS_REFERENCE_PROFILES,
	measureAlveolarRidgeFromVolume as measureAlveolarRidgeFromVolumeCanonical,
	getAlveolarRidgeMeasurement as getAlveolarRidgeMeasurementCanonical,
	buildAlveolarRidgeSoapProtocol,
	exportAlveolarRidgeToEmr,
} from "./alveolarRidgeMorphometry.js";

import type { CbctVoxelVolume } from "./cbctMprMath.js";
import type { DentalArchCurve } from "./cbctArchSplineMath.js";

export type ZakharovEdentulousToothFdi = EdentulousToothFdi;
export type ZakharovRidgeMeasurement = AlveolarRidgeMeasurement;

export const ZAKHAROV_EDENTULOUS_PROFILES = EDENTULOUS_REFERENCE_PROFILES as Record<
	number,
	ZakharovRidgeMeasurement
>;

export function measureZakharovRidgeFromVolume(
	volume: CbctVoxelVolume,
	toothFdi: ZakharovEdentulousToothFdi,
	archCurve?: DentalArchCurve,
): ZakharovRidgeMeasurement {
	return measureAlveolarRidgeFromVolumeCanonical(volume, toothFdi, archCurve);
}

export function getZakharovRidgeMeasurement(
	toothFdi: ZakharovEdentulousToothFdi,
	volume?: CbctVoxelVolume,
	archCurve?: DentalArchCurve,
): ZakharovRidgeMeasurement {
	return getAlveolarRidgeMeasurementCanonical(toothFdi, volume, archCurve);
}

export function buildZakharov043SoapProtocol(
	measurement: ZakharovRidgeMeasurement,
	patientName = "Пациент",
) {
	return buildAlveolarRidgeSoapProtocol(measurement, patientName);
}

export function exportZakharovRidgeTo043Emr(
	measurement: ZakharovRidgeMeasurement,
	patientName = "Пациент",
	onApplyCallback?: ((diaryText: string) => void) | undefined,
): void {
	return exportAlveolarRidgeToEmr(measurement, patientName, onApplyCallback);
}

// ─── CANONICAL ALVEOLAR RIDGE ALIASES (ZERO-HARDCODE ARCHITECTURE) ─────────
export type { AlveolarRidgeMeasurement, EdentulousToothFdi as AlveolarEdentulousToothFdi };
export const getAlveolarRidgeMeasurement = getZakharovRidgeMeasurement;
export const buildAlveolarRidge043SoapProtocol = buildZakharov043SoapProtocol;
export const exportAlveolarRidgeTo043Emr = exportZakharovRidgeTo043Emr;
export const measureAlveolarRidgeFromVolume = measureZakharovRidgeFromVolume;
