import type { UniversalSensorModel } from "../types";

const sensor = (
	id: string, name: string, brand: "carestream" | "planmeca", brandName: string, resolution: string,
	spacing: number, optical: number, dims: string, bitDepth: UniversalSensorModel["bitDepth"],
	size: UniversalSensorModel["sensorSize"], area: string, tech: UniversalSensorModel["technology"], folder: string,
): UniversalSensorModel => ({
	id, name, brand, brandName, resolution, pixelSpacing: spacing, pixelSpacingMicrons: spacing * 1000,
	opticalResolutionLpMm: optical, dimensions: dims, bitDepth, sensorSize: size, activeAreaMm: area,
	technology: tech, isDirectUsbSupported: true, isTwainSupported: true, recommendedHotFolder: folder,
});

export const CARESTREAM_PLANMECA_SENSORS: readonly UniversalSensorModel[] = [
	sensor("carestream_rvg_5100", "Carestream RVG 5100", "carestream", "Carestream / Kodak", "14.0 lp/mm (19.0 мкм)", 0.019, 14.0, "1600x1200", 12, "Size 1", "22x30 mm", "CCD", "C:\\Carestream\\Capture"),
	sensor("carestream_rvg_5200", "Carestream RVG 5200", "carestream", "Carestream / Kodak", "16.0 lp/mm (19.0 мкм)", 0.019, 16.0, "1600x1200", 14, "Size 1", "22x30 mm", "CMOS", "C:\\Carestream\\Capture"),
	sensor("carestream_rvg_6100", "Carestream / Kodak RVG 6100", "carestream", "Carestream / Kodak", ">20.0 lp/mm (18.5 мкм)", 0.0185, 20.0, "1840x1380", 14, "Size 1.5", "24x34 mm", "Fiber-Optic CMOS", "C:\\KDIS\\Capture"),
	sensor("carestream_rvg_6200", "Carestream RVG 6200", "carestream", "Carestream / Kodak", "24.0 lp/mm (19.0 мкм)", 0.019, 24.0, "1920x1440", 14, "Size 2", "26x36 mm", "Fiber-Optic CMOS", "C:\\Carestream\\Capture"),
	sensor("carestream_rvg_6500", "Carestream RVG 6500 Wireless", "carestream", "Carestream / Kodak", ">20.0 lp/mm (18.5 мкм)", 0.0185, 20.0, "1920x1440", 14, "Size 1.5", "24x34 mm", "Fiber-Optic CMOS", "C:\\Carestream\\Capture"),
	sensor("planmeca_prosensor", "Planmeca ProSensor", "planmeca", "Planmeca", "17.0 lp/mm (30.0 мкм)", 0.03, 17.0, "1600x1200", 14, "Size 1", "24x30 mm", "CMOS", "C:\\Planmeca\\Temp"),
	sensor("planmeca_prosensor_hd", "Planmeca ProSensor HD", "planmeca", "Planmeca", "33.7 lp/mm (15.0 мкм)", 0.015, 33.7, "2000x1500", 16, "Size 2", "26x36 mm", "Fiber-Optic CMOS", "C:\\Planmeca\\Temp"),
];
