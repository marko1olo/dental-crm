import type { UniversalSensorModel } from "../types";

const sensor = (
	id: string, name: string, brand: "sirona" | "dexis", brandName: string, resolution: string,
	spacing: number, optical: number, dims: string, bitDepth: UniversalSensorModel["bitDepth"],
	size: UniversalSensorModel["sensorSize"], area: string, tech: UniversalSensorModel["technology"], folder: string,
): UniversalSensorModel => ({
	id, name, brand, brandName, resolution, pixelSpacing: spacing, pixelSpacingMicrons: spacing * 1000,
	opticalResolutionLpMm: optical, dimensions: dims, bitDepth, sensorSize: size, activeAreaMm: area,
	technology: tech, isDirectUsbSupported: true, isTwainSupported: true, recommendedHotFolder: folder,
});

export const SIRONA_DEXIS_SENSORS: readonly UniversalSensorModel[] = [
	sensor("sirona_xios_xg", "Dentsply Sirona Xios XG", "sirona", "Dentsply Sirona", "16.7 lp/mm (30.0 мкм)", 0.03, 16.7, "1600x1200", 14, "Size 1", "20x30 mm", "CMOS", "C:\\Sidexis\\Export"),
	sensor("sirona_xios_plus", "Dentsply Sirona Xios Plus", "sirona", "Dentsply Sirona", "20.0 lp/mm (25.0 мкм)", 0.025, 20.0, "1600x1200", 14, "Size 1.5", "24x33 mm", "CMOS", "C:\\Sidexis\\Export"),
	sensor("sirona_xios_supreme", "Dentsply Sirona Xios Supreme", "sirona", "Dentsply Sirona", "33.3 lp/mm (15.0 мкм)", 0.015, 33.3, "2048x1536", 16, "Size 2", "26x36 mm", "Fiber-Optic CMOS", "C:\\Sidexis\\Export"),
	sensor("schick_33", "Schick 33", "sirona", "Schick", "33.3 lp/mm (15.0 мкм)", 0.015, 33.3, "2048x1536", 16, "Size 2", "26x36 mm", "CMOS", "C:\\Sidexis\\Export"),
	sensor("schick_elite", "Schick Elite", "sirona", "Schick", "25.0 lp/mm (20.0 мкм)", 0.02, 25.0, "1680x1260", 14, "Size 1.5", "24x33 mm", "CMOS", "C:\\Sidexis\\Export"),
	sensor("dexis_titanium", "Dexis Titanium", "dexis", "Dexis", "25.0 lp/mm (20.0 мкм)", 0.02, 25.0, "1800x1350", 16, "Size 2", "26x34 mm", "CMOS", "C:\\Dexis\\Data"),
	sensor("dexis_platinum", "Dexis Platinum", "dexis", "Dexis", "20.0 lp/mm (20.0 мкм)", 0.02, 20.0, "1800x1350", 14, "Size 1.5", "24x32 mm", "CMOS", "C:\\Dexis\\Data"),
];
