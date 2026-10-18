import type { UniversalSensorModel } from "../types";

const sensor = (
	id: string, name: string, brand: UniversalSensorModel["brand"], brandName: string, resolution: string,
	spacing: number, optical: number, dims: string, bitDepth: UniversalSensorModel["bitDepth"],
	size: UniversalSensorModel["sensorSize"], area: string, tech: UniversalSensorModel["technology"], folder: string,
): UniversalSensorModel => ({
	id, name, brand, brandName, resolution, pixelSpacing: spacing, pixelSpacingMicrons: spacing * 1000,
	opticalResolutionLpMm: optical, dimensions: dims, bitDepth, sensorSize: size, activeAreaMm: area,
	technology: tech, isDirectUsbSupported: true, isTwainSupported: true, recommendedHotFolder: folder,
});

export const MYRAY_OWANDY_EIGHTEETH_DUERR_SENSORS: readonly UniversalSensorModel[] = [
	sensor("myray_zen_x", "MyRay Zen-X", "myray", "MyRay", "25.0 lp/mm (20.0 мкм)", 0.02, 25.0, "1700x1250", 14, "Size 1.5", "24x32 mm", "CMOS", "C:\\iRYS\\Export"),
	sensor("owandy_opteo", "Owandy Opteo", "owandy", "Owandy Radiology", "25.0 lp/mm (20.0 мкм)", 0.02, 25.0, "1700x1300", 14, "Size 1.5", "24x32 mm", "CMOS", "C:\\Owandy\\QuickVision\\Images"),
	sensor("owandy_one", "Owandy One", "owandy", "Owandy Radiology", "22.0 lp/mm (22.7 мкм)", 0.0227, 22.0, "1600x1200", 14, "Size 1", "20x30 mm", "CMOS", "C:\\Owandy\\QuickVision\\Images"),
	sensor("eighteeth_nanopix_1", "Eighteeth NanoPix 1", "eighteeth", "Eighteeth", "25.0 lp/mm (20.0 мкм)", 0.02, 25.0, "1500x1000", 16, "Size 1", "20x30 mm", "CMOS", "C:\\NanoPix\\Incoming"),
	sensor("eighteeth_nanopix_2", "Eighteeth NanoPix 2", "eighteeth", "Eighteeth", "25.0 lp/mm (20.0 мкм)", 0.02, 25.0, "1900x1300", 16, "Size 2", "26x36 mm", "CMOS", "C:\\NanoPix\\Incoming"),
	sensor("xpect_vision_photon", "Xpect Vision Photon-Counting", "xpect_vision", "Xpect Vision", "33.0 lp/mm (15.0 мкм)", 0.015, 33.0, "2048x1536", 16, "Size 2", "26x36 mm", "Photon-Counting", "C:\\XpectVision\\Scans"),
	sensor("duerr_vistaray_7_size1", "Dürr Dental VistaRay 7 Size 1", "duerr", "Dürr Dental", "26.3 lp/mm (19.0 мкм)", 0.019, 26.3, "1580x1050", 14, "Size 1", "20x30 mm", "CMOS", "C:\\VistaSoft\\Capture"),
	sensor("duerr_vistaray_7_size2", "Dürr Dental VistaRay 7 Size 2", "duerr", "Dürr Dental", "26.3 lp/mm (19.0 мкм)", 0.019, 26.3, "1896x1368", 14, "Size 2", "26x36 mm", "CMOS", "C:\\VistaSoft\\Capture"),
];
