import type { UniversalSensorModel } from "../types";

const vatech = (
	id: string, name: string, resolution: string, pixelSpacing: number, microns: number,
	optical: number, dims: string, size: UniversalSensorModel["sensorSize"], area: string, hotFolder: string,
): UniversalSensorModel => ({
	id, name, brand: "vatech", brandName: "Vatech", resolution, pixelSpacing, pixelSpacingMicrons: microns,
	opticalResolutionLpMm: optical, dimensions: dims, bitDepth: 14, sensorSize: size, activeAreaMm: area,
	technology: "CMOS", isDirectUsbSupported: true, isTwainSupported: true, recommendedHotFolder: hotFolder,
});

export const VATECH_SENSORS: readonly UniversalSensorModel[] = [
	vatech("vatech_ezsensor", "Vatech EzSensor", "25.0 lp/mm (35.0 мкм)", 0.035, 35.0, 25.0, "1920x1440", "Size 1.5", "24x33 mm", "C:\\EzSensor\\Capture"),
	vatech("vatech_ezsensor_classic", "Vatech EzSensor Classic", "25.0 lp/mm (35.0 мкм)", 0.035, 35.0, 25.0, "1920x1440", "Size 1.5", "24x33 mm", "C:\\EzSensor\\Capture"),
	vatech("vatech_ezsensor_soft", "Vatech EzSensor Soft", "29.2 lp/mm (29.0 мкм)", 0.029, 29.0, 29.2, "1920x1440", "Size 1.5", "24x33 mm", "C:\\EzDent-i\\Capture"),
	vatech("vatech_ezsensor_hd", "Vatech EzSensor HD", "29.2 lp/mm (35.0 мкм)", 0.035, 35.0, 29.2, "1920x1440", "Size 1.5", "24x33 mm", "C:\\EzDent-i\\Capture"),
	vatech("vatech_ezsensor_hd_hires", "Vatech EzSensor HD Hi-Res (14.8 мкм)", "33.7 lp/mm (14.8 мкм)", 0.0148, 14.8, 33.7, "1920x1440", "Size 1.5", "24x33 mm", "C:\\EzDent-i\\Capture"),
	vatech("vatech_ezsensor_1_5", "Vatech EzSensor 1.5", "29.2 lp/mm (35.0 мкм)", 0.035, 35.0, 29.2, "1920x1440", "Size 1.5", "24x33 mm", "C:\\EzSensor\\Capture"),
	vatech("vatech_ezsensor_2_0", "Vatech EzSensor 2.0", "29.2 lp/mm (35.0 мкм)", 0.035, 35.0, 29.2, "1920x1440", "Size 2", "26x36 mm", "C:\\EzSensor\\Capture"),
];
