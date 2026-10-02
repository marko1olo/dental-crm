/**
 * DENTE CRM — Clinical DICOM & CBCT MPR Types & Clinical Constants
 * Native Multi-Planar Reconstruction and Sectioning data models
 * Authority: .agents/THE_HAMMER_MASTER_PROMPT.md & Mandates 8b, 8c, 8d, 8e
 */

export type DicomMprTabType = "2D" | "MPR" | "SECTION" | "3D_PANO" | "TMJ";

export type DicomActiveTool =
	| "pan"
	| "zoom"
	| "angle"
	| "ruler"
	| "polyline"
	| "implant"
	| "rotate"
	| "none";

export type DicomVrPreset =
	| "bone"
	| "dense_bone"
	| "soft_tissue"
	| "mip"
	| "roots"
	| "contrast";

export interface DicomSliceState {
	coronal: number;
	coronalMax: number;
	sagittal: number;
	sagittalMax: number;
	axial: number;
	axialMax: number;
	thicknessMm: number;
	intervalMm: number;
}

export interface SkullOrientationPreset {
	id: number;
	nameRu: string;
	shortCode: string;
	pitch: number;
	yaw: number;
	roll: number;
	iconSvgPath?: string;
}

export interface DicomCrosshairPosition {
	x: number; // 0..1 relative to viewport width
	y: number; // 0..1 relative to viewport height
}

export interface DicomPoint2D {
	x: number;
	y: number;
}

export interface DicomImplantModel {
	id: string;
	toothFdi: string;
	lengthMm: number;
	diameterMm: number;
	position: { x: number; y: number; z: number };
	angleDeg: number;
	typeLabel: string;
}

export interface DicomMeasurement {
	id: string;
	plane: "coronal" | "sagittal" | "axial" | "3d";
	start: DicomPoint2D;
	end: DicomPoint2D;
	distanceMm: number;
	label?: string;
}

export const SKULL_PRESETS: readonly SkullOrientationPreset[] = [
	{ id: 1, nameRu: "Спереди (Anterior)", shortCode: "A", pitch: 0, yaw: 0, roll: 0 },
	{ id: 2, nameRu: "3/4 Справа (Anterior-Right)", shortCode: "AR", pitch: 10, yaw: 45, roll: 0 },
	{ id: 3, nameRu: "Справа (Right Lateral)", shortCode: "R", pitch: 0, yaw: 90, roll: 0 },
	{ id: 4, nameRu: "Сзади (Posterior)", shortCode: "P", pitch: 0, yaw: 180, roll: 0 },
	{ id: 5, nameRu: "Слева (Left Lateral)", shortCode: "L", pitch: 0, yaw: -90, roll: 0 },
	{ id: 6, nameRu: "Сверху (Superior / Cranial)", shortCode: "S", pitch: 90, yaw: 0, roll: 0 },
	{ id: 7, nameRu: "Снизу (Inferior / Caudal)", shortCode: "I", pitch: -90, yaw: 0, roll: 0 },
	{ id: 8, nameRu: "Панорама челюсти", shortCode: "PANO", pitch: 5, yaw: 0, roll: 0 },
	{ id: 9, nameRu: "Сброс ориентации", shortCode: "RST", pitch: 15, yaw: -25, roll: 0 },
];

export const VR_PRESET_CONFIGS: Record<
	DicomVrPreset,
	{ labelRu: string; colorHex: string; bgStyle: string; descRu: string }
> = {
	bone: {
		labelRu: "Костная ткань",
		colorHex: "#eab308",
		bgStyle: "radial-gradient(circle, #ca8a04 0%, #713f12 70%, #1c1917 100%)",
		descRu: "Золотисто-янтарный объем кости и альвеолярного гребня",
	},
	dense_bone: {
		labelRu: "Высокая плотность",
		colorHex: "#f8fafc",
		bgStyle: "radial-gradient(circle, #f1f5f9 0%, #64748b 70%, #0f172a 100%)",
		descRu: "Кортикальная пластинка и плотные костные балки",
	},
	soft_tissue: {
		labelRu: "Мягкие ткани / Кожа",
		colorHex: "#f43f5e",
		bgStyle: "radial-gradient(circle, #fb7185 0%, #9f1239 70%, #2e0814 100%)",
		descRu: "Профиль мягких тканей лица и десны",
	},
	mip: {
		labelRu: "MIP (Макс. интенсивность)",
		colorHex: "#38bdf8",
		bgStyle: "radial-gradient(circle, #38bdf8 0%, #0369a1 70%, #082f49 100%)",
		descRu: "Проекция максимальной плотности для визуализации каналов",
	},
	roots: {
		labelRu: "Корни и эндодонтия",
		colorHex: "#a855f7",
		bgStyle: "radial-gradient(circle, #c084fc 0%, #6b21a8 70%, #2e1065 100%)",
		descRu: "Высококонтрастная подсветка пломбированных каналов и штифтов",
	},
	contrast: {
		labelRu: "Инверсия / Контраст",
		colorHex: "#10b981",
		bgStyle: "radial-gradient(circle, #34d399 0%, #065f46 70%, #022c22 100%)",
		descRu: "Специальный рентгенологический инверсионный контраст",
	},
};

// ============================================================================
// Zero-downtime backwards compatibility aliases
// ============================================================================
export type Ez3dTabType = DicomMprTabType;
export type Ez3dActiveTool = DicomActiveTool;
export type Ez3dVrPreset = DicomVrPreset;
export type Ez3dSliceState = DicomSliceState;
export type Ez3dCrosshairPosition = DicomCrosshairPosition;
export type Ez3dPoint2D = DicomPoint2D;
export type Ez3dImplantModel = DicomImplantModel;
export type Ez3dMeasurement = DicomMeasurement;
