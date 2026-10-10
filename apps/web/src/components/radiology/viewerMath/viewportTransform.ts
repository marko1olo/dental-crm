/**
 * DENTE DENTAL CRM — 2D Radiology Viewport Transform & Spatial Calibration
 * Sensor physical scale calibration, cursor-centered zoom invariant, and pixel pitch transforms.
 */

import type {
	CursorCenteredZoomParams,
	CursorCenteredZoomResult,
	DentalModalityKey,
	ViewerPoint2D,
} from "./types.js";

/** Standard pixel spacing in millimeters for dental modalities */
export const DEFAULT_MODALITY_PIXEL_SPACING = {
	rvg: 0.04, // 25 lp/mm CCD/CMOS sensor (KaVo, Vatech, Carestream)
	intraoral_rvg: 0.04,
	periapical: 0.04,
	bitewing: 0.04,
	opg: 0.1, // Panoramic digital sensor
	optg_panoramic: 0.1,
	cbct: 0.125, // 125 micron typical dental CBCT voxel
	cbct_3d: 0.125,
	cbct_slice: 0.125,
	other: 0.08,
} as const;

/**
 * Exact Vatech hardware sensor calibration presets (Ground Truth from EzDent-i VTE2_CalibrationPreset.xml & EzSensor.ini).
 * Prevents clinical measurement errors up to 170% caused by naive 0.04 mm/px hardcodes.
 */
export const VATECH_DEVICE_CALIBRATION_PRESETS: Readonly<Record<string, {
	readonly deviceName: string;
	readonly calMmPerPx: number;
	readonly pixelPitchMicrons: number;
	readonly category: "intraoral_sensor" | "panoramic" | "cephalometric";
	readonly notesRu: string;
}>> = {
	ezsensor_standard: {
		deviceName: "Vatech EzSensor (1.0 / 1.5 / 2.0)",
		calMmPerPx: 0.0350,
		pixelPitchMicrons: 35.0,
		category: "intraoral_sensor",
		notesRu: "Стандартный визиограф EzSensor 1.5 (матрица 686x944, полезная 671x924)",
	},
	ezsensor_soft_hr: {
		deviceName: "Vatech EzSensor Soft (High Resolution)",
		calMmPerPx: 0.0148,
		pixelPitchMicrons: 14.8,
		category: "intraoral_sensor",
		notesRu: "Высокое разрешение EzSensor Soft (33.7 пар линий/мм)",
	},
	ezsensor_soft_normal: {
		deviceName: "Vatech EzSensor Soft / Classic / C / HDI-S (Normal Resolution)",
		calMmPerPx: 0.0296,
		pixelPitchMicrons: 29.6,
		category: "intraoral_sensor",
		notesRu: "Базовое разрешение (биннинг 2x2) EzSensor Soft / Classic / C",
	},
	ezsensor_p: {
		deviceName: "Vatech EzSensor P / HDI2000 (1.5 / 2.0)",
		calMmPerPx: 0.0200,
		pixelPitchMicrons: 20.0,
		category: "intraoral_sensor",
		notesRu: "EzSensor P / HDI2000 субпиксельная матрица",
	},
	anysensor_1_0: {
		deviceName: "Vatech AnySensor 1.0",
		calMmPerPx: 0.02381,
		pixelPitchMicrons: 23.8,
		category: "intraoral_sensor",
		notesRu: "AnySensor 1.0 (CalX/CalY = 0.023810 мм/пикс)",
	},
	anysensor_1_5: {
		deviceName: "Vatech AnySensor 1.5",
		calMmPerPx: 0.033333,
		pixelPitchMicrons: 33.3,
		category: "intraoral_sensor",
		notesRu: "AnySensor 1.5 (CalX/CalY = 0.033333 мм/пикс)",
	},
	vatech_dxi_600: {
		deviceName: "Vatech DXI-600",
		calMmPerPx: 0.020952,
		pixelPitchMicrons: 21.0,
		category: "intraoral_sensor",
		notesRu: "DXI-600 субпиксельный сенсор (0.020952 мм/пикс)",
	},
	vatech_vls_60: {
		deviceName: "Vatech VLS 60 / HDS-100L",
		calMmPerPx: 0.019048,
		pixelPitchMicrons: 19.0,
		category: "intraoral_sensor",
		notesRu: "VLS 60 / HDS-100L прецизионный сенсор (0.019048 мм/пикс)",
	},
	pax_i_pano: {
		deviceName: "Vatech PaX-i / PaX-i3D Smart Pano",
		calMmPerPx: 0.0761,
		pixelPitchMicrons: 76.1,
		category: "panoramic",
		notesRu: "Панорамный датчик PaX-i / PaX-i3D Smart (CalX/CalY = 0.07607583 мм/пикс)",
	},
	pax_i_pano_uhd: {
		deviceName: "Vatech PaX-i Pano (UHD)",
		calMmPerPx: 0.0380,
		pixelPitchMicrons: 38.0,
		category: "panoramic",
		notesRu: "Сверхвысокое разрешение панорамы UHD (CalX/CalY = 0.038037915 мм/пикс)",
	},
	pax_primo_pano: {
		deviceName: "Vatech PaX-Primo Pano",
		calMmPerPx: 0.075979,
		pixelPitchMicrons: 76.0,
		category: "panoramic",
		notesRu: "Панорамный датчик PaX-Primo Pano (0.075979 мм/пикс)",
	},
	pax_i3d_green_premium: {
		deviceName: "Vatech Pax-i3D Green Premium Auto Pano",
		calMmPerPx: 0.0656542,
		pixelPitchMicrons: 65.7,
		category: "panoramic",
		notesRu: "Pax-i3D Green Premium Auto Pano (0.0656542 мм/пикс)",
	},
	pax_reve3d_ceph: {
		deviceName: "Vatech PaX-Reve3D Ceph",
		calMmPerPx: 0.1108,
		pixelPitchMicrons: 110.8,
		category: "cephalometric",
		notesRu: "Телерентгенограмма ТРГ PaX-Reve3D (CalX/CalY = 0.110755645 мм/пикс)",
	},
	pax_i_ceph_scan: {
		deviceName: "Vatech PaX-i Ceph (Scan)",
		calMmPerPx: 0.0873,
		pixelPitchMicrons: 87.3,
		category: "cephalometric",
		notesRu: "Сканирующий ТРГ-цефалостат PaX-i Ceph (0.08733524 мм/пикс)",
	},
};

/**
 * Resolves exact calibrated mm/pixel ratio based on device model string or modality key.
 * Defaults to 0.0350 mm/px for modern RVG sensors (Vatech EzSensor 1.5 standard).
 */
export function resolveCalibratedPixelSpacing(
	deviceOrModality?: string | null,
	fallbackMm = 0.0350,
): number {
	if (!deviceOrModality) return fallbackMm;
	const norm = deviceOrModality.toLowerCase().trim();

	if (norm.includes("soft") && (norm.includes("hr") || norm.includes("high") || norm.includes("14.8"))) {
		return VATECH_DEVICE_CALIBRATION_PRESETS.ezsensor_soft_hr?.calMmPerPx ?? fallbackMm;
	}
	if (norm.includes("soft") || norm.includes("classic") || norm.includes("hdi-s") || norm.includes("29.6")) {
		return VATECH_DEVICE_CALIBRATION_PRESETS.ezsensor_soft_normal?.calMmPerPx ?? fallbackMm;
	}
	if (norm.includes("anysensor 1.0") || (norm.includes("anysensor") && norm.includes("1.0"))) {
		return VATECH_DEVICE_CALIBRATION_PRESETS.anysensor_1_0?.calMmPerPx ?? fallbackMm;
	}
	if (norm.includes("anysensor 1.5") || (norm.includes("anysensor") && norm.includes("1.5"))) {
		return VATECH_DEVICE_CALIBRATION_PRESETS.anysensor_1_5?.calMmPerPx ?? fallbackMm;
	}
	if (norm.includes("dxi-600") || norm.includes("dxi600")) {
		return VATECH_DEVICE_CALIBRATION_PRESETS.vatech_dxi_600?.calMmPerPx ?? fallbackMm;
	}
	if (norm.includes("vls 60") || norm.includes("vls60") || norm.includes("hds-100l")) {
		return VATECH_DEVICE_CALIBRATION_PRESETS.vatech_vls_60?.calMmPerPx ?? fallbackMm;
	}
	if (norm.includes("sensor p") || norm.includes("hdi2000") || norm.includes("20.0") || norm.includes("0.02")) {
		return VATECH_DEVICE_CALIBRATION_PRESETS.ezsensor_p?.calMmPerPx ?? fallbackMm;
	}
	if (norm.includes("ezsensor") || norm.includes("hdi1000") || norm.includes("ez_sensor") || norm.includes("35.0") || norm.includes("0.035")) {
		return VATECH_DEVICE_CALIBRATION_PRESETS.ezsensor_standard?.calMmPerPx ?? fallbackMm;
	}
	if (norm.includes("primo")) {
		return VATECH_DEVICE_CALIBRATION_PRESETS.pax_primo_pano?.calMmPerPx ?? fallbackMm;
	}
	if (norm.includes("green premium") || norm.includes("auto pano")) {
		return VATECH_DEVICE_CALIBRATION_PRESETS.pax_i3d_green_premium?.calMmPerPx ?? fallbackMm;
	}
	if (norm.includes("pano") || norm.includes("opg") || norm.includes("optg")) {
		if (norm.includes("uhd")) {
			return VATECH_DEVICE_CALIBRATION_PRESETS.pax_i_pano_uhd?.calMmPerPx ?? fallbackMm;
		}
		return VATECH_DEVICE_CALIBRATION_PRESETS.pax_i_pano?.calMmPerPx ?? fallbackMm;
	}
	if (norm.includes("ceph") || norm.includes("trg") || norm.includes("tele")) {
		if (norm.includes("scan")) {
			return VATECH_DEVICE_CALIBRATION_PRESETS.pax_i_ceph_scan?.calMmPerPx ?? fallbackMm;
		}
		return VATECH_DEVICE_CALIBRATION_PRESETS.pax_reve3d_ceph?.calMmPerPx ?? fallbackMm;
	}
	if (norm.includes("duerr") || norm.includes("durr") || norm.includes("vistaray") || norm.includes("vistaintra")) {
		return 0.0190; // Dürr Dental VistaRay 7 (19.0 µm)
	}
	if (norm.includes("carestream") || norm.includes("cs 5100") || norm.includes("cs 5200") || norm.includes("cs 6100") || norm.includes("cs 6200") || norm.includes("rvg 5100") || norm.includes("rvg 5200") || norm.includes("rvg 6100") || norm.includes("rvg 6200")) {
		return 0.0185; // Carestream RVG 5100/5200/6100/6200 (18.5 µm)
	}
	if (norm.includes("fona") || norm.includes("stellaris") || norm.includes("cdrelite")) {
		return 0.0178; // FONA Stellaris / CDRelite (17.8 µm)
	}
	if (norm.includes("woodpecker") || norm.includes("isensor") || norm.includes("i-sensor")) {
		return 0.0200; // Woodpecker i-Sensor H1/H2 (20.0 µm)
	}
	if (norm.includes("planmeca") || norm.includes("prosensor")) {
		return norm.includes("hd") || norm.includes("15.0") || norm.includes("0.015") ? 0.0150 : 0.0300;
	}
	if (norm in DEFAULT_MODALITY_PIXEL_SPACING) {
		return DEFAULT_MODALITY_PIXEL_SPACING[norm as DentalModalityKey];
	}

	return fallbackMm;
}

/**
 * Calculates real physical distance in millimeters between two points on the radiograph.
 * @param p1 Point 1 in image pixel coordinates
 * @param p2 Point 2 in image pixel coordinates
 * @param mmPerPixel Spatial calibration factor (mm per image pixel)
 */
export function calculatePhysicalDistanceMm(
	p1: ViewerPoint2D,
	p2: ViewerPoint2D,
	mmPerPixel: number,
): number {
	const dx = p2.x - p1.x;
	const dy = p2.y - p1.y;
	const pixelDistance = Math.hypot(dx, dy);
	const distanceMm = pixelDistance * mmPerPixel;
	return Math.round(distanceMm * 10) / 10;
}

/** Formats millimeters with Russian unit suffix */
export function formatDistanceMm(distanceMm: number): string {
	return `${distanceMm.toFixed(1)} мм`;
}

/**
 * Calibrates mm/pixel ratio based on a known reference distance (e.g. known implant width or 10mm ball).
 */
export function calibrateSpatialScale(
	p1: ViewerPoint2D,
	p2: ViewerPoint2D,
	knownPhysicalMm: number,
): number {
	const dx = p2.x - p1.x;
	const dy = p2.y - p1.y;
	const pixelDistance = Math.hypot(dx, dy);
	if (pixelDistance <= 0 || knownPhysicalMm <= 0) return 0.04;
	return knownPhysicalMm / pixelDistance;
}

/**
 * Calculates rendered pixel height for a physical millimeter scale bar (e.g. 5 mm ladder scale)
 * grounded in the physical sensor matrix pixel pitch (microns) and active zoom level.
 */
export function calculateScaleRulerHeightPx(
	physicalLengthMm: number,
	pixelPitchMicrons: number,
	zoom: number,
): number {
	if (pixelPitchMicrons <= 0 || zoom <= 0 || physicalLengthMm <= 0) return 0;
	const pixelPitchMm = pixelPitchMicrons / 1000.0;
	const pixelCount = physicalLengthMm / pixelPitchMm;
	return Number((pixelCount * zoom).toFixed(2));
}

/**
 * Calculates cursor-centered zoom transformation to guarantee that the anatomical feature
 * (e.g. root apex, periodontal ligament, or caries fissure) remains stationary under the mouse cursor.
 * Mathematical formula:
 * panNew = panOld + (cursor - center - panOld) * (1 - zoomNew / zoomOld)
 */
export function calculateCursorCenteredZoom(
	params: CursorCenteredZoomParams,
): CursorCenteredZoomResult {
	const minZoom = params.minZoom ?? 0.2;
	const maxZoom = params.maxZoom ?? 16.0;
	const nextZoom = Number(Math.max(minZoom, Math.min(maxZoom, params.currentZoom * params.zoomFactor)).toFixed(3));

	if (params.currentZoom <= 0 || nextZoom === params.currentZoom) {
		return { nextZoom, nextPanX: params.currentPanX, nextPanY: params.currentPanY };
	}

	const centerX = params.canvasWidth / 2;
	const centerY = params.canvasHeight / 2;
	const ratio = nextZoom / params.currentZoom;

	const nextPanX = Number((params.currentPanX + (params.cursorX - centerX - params.currentPanX) * (1 - ratio)).toFixed(2));
	const nextPanY = Number((params.currentPanY + (params.cursorY - centerY - params.currentPanY) * (1 - ratio)).toFixed(2));

	return {
		nextZoom,
		nextPanX,
		nextPanY,
	};
}
