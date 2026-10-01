import type { Point3D, ViewportTransform, CbctViewportType } from "../cbctMprMath";
import { DEFAULT_VIEWPORT_TRANSFORM } from "../cbctMprMath";
import type { RadiologyStudy } from "../types";

export type StudioMode = "diagnostic" | "panoramic" | "volume3d" | "implant" | "tmj" | "endo";
export type ViewLayoutMode = "mpr_3_view" | "quad_view" | "layout_1_plus_3";

export type CbctWorkspaceTabId = "diagnostic" | "panoramic" | "endo" | "implant" | "tmj";

export interface CbctWorkspaceTabDefinition {
	readonly id: CbctWorkspaceTabId;
	readonly studioMode: StudioMode;
	readonly label: string;
	readonly shortLabel: string;
	readonly description: string;
	readonly testId: string;
	readonly modeTestId: string;
	readonly activeColorClass: string;
	readonly activeBorderClass: string;
}

export const CBCT_WORKSPACE_TABS: readonly CbctWorkspaceTabDefinition[] = [
	{
		id: "diagnostic",
		studioMode: "diagnostic",
		label: "MPR 3D",
		shortLabel: "MPR 3D",
		description: "Классический мультипланар: Аксиал, Коронал, Сагиттал и 3D объем",
		testId: "cbct-nav-tab-mpr-3d",
		modeTestId: "cbct-mode-diagnostic-btn",
		activeColorClass: "text-cyan-300",
		activeBorderClass: "bg-zinc-850 text-cyan-300 border-cyan-500/70 shadow-[0_0_10px_rgba(6,182,212,0.3)]",
	},
	{
		id: "panoramic",
		studioMode: "panoramic",
		label: "Панорама",
		shortLabel: "Панорама",
		description: "Ортопантомограмма (ОПТГ): развернутая зубная дуга, челюсть и кросс-секции",
		testId: "cbct-nav-tab-panorama",
		modeTestId: "cbct-mode-panoramic-btn",
		activeColorClass: "text-purple-300",
		activeBorderClass: "bg-zinc-850 text-purple-300 border-purple-500/70 shadow-[0_0_10px_rgba(168,85,247,0.3)]",
	},
	{
		id: "endo",
		studioMode: "endo",
		label: "Эндодонтия",
		shortLabel: "Эндо",
		description: "Диагностика корневых каналов: продольный и поперечный срез, локальный 3D зум",
		testId: "cbct-nav-tab-endo",
		modeTestId: "cbct-mode-endo-btn",
		activeColorClass: "text-emerald-300",
		activeBorderClass: "bg-zinc-850 text-emerald-300 border-emerald-500/70 shadow-[0_0_10px_rgba(16,185,129,0.3)]",
	},
	{
		id: "implant",
		studioMode: "implant",
		label: "Имплантация",
		shortLabel: "Имплантация",
		description: "Планирование имплантации: разметка гребня, контроль IAN-нерва, шкала Миша D1-D5",
		testId: "cbct-nav-tab-implant",
		modeTestId: "cbct-mode-implant-btn",
		activeColorClass: "text-amber-300",
		activeBorderClass: "bg-zinc-850 text-amber-300 border-amber-500/70 shadow-[0_0_10px_rgba(245,158,11,0.3)]",
	},
] as const;

export const DEFAULT_IAN_NERVE_POINTS: readonly Point3D[] = [
	{ x: -32.0, y: -2.0, z: 2.0 },
	{ x: -28.0, y: -15.0, z: -4.0 },
	{ x: -25.0, y: -28.0, z: -10.0 },
	{ x: -22.0, y: -40.0, z: -14.0 },
	{ x: -18.0, y: -46.0, z: -16.0 },
	{ x: 18.0, y: -46.0, z: -16.0 },
	{ x: 22.0, y: -40.0, z: -14.0 },
	{ x: 25.0, y: -28.0, z: -10.0 },
	{ x: 28.0, y: -15.0, z: -4.0 },
	{ x: 32.0, y: -2.0, z: 2.0 },
];

export function formatNerveNodesPlural(count: number): string {
	const abs = Math.abs(count);
	const mod10 = abs % 10;
	const mod100 = abs % 100;
	if (mod100 >= 11 && mod100 <= 14) {
		return `${count} узлов`;
	}
	if (mod10 === 1) {
		return `${count} узел`;
	}
	if (mod10 >= 2 && mod10 <= 4) {
		return `${count} узла`;
	}
	return `${count} узлов`;
}

export const ROTATE_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2322d3ee' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8'/%3E%3Cpolyline points='21 3 21 8 16 8'/%3E%3C/svg%3E") 12 12, crosshair`;

import type { TreatmentPlanItem } from "../../treatment-plans/types";
import type { AlveolarRidgeCaliperMeasurement } from "../cbctCaliperNerveMath";

export interface CbctMprImplantStudioModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly study?: RadiologyStudy | null | undefined;
	readonly patientName?: string | undefined;
	readonly patientId?: string | undefined;
	readonly onApplyToDiary043?: ((diaryText: string) => void) | undefined;
	readonly onApplyToPlan?: ((item: TreatmentPlanItem) => void) | undefined;
	readonly initialStudioMode?: StudioMode | undefined;
	readonly initialSidebarOpen?: boolean | undefined;
	readonly initialCaliper?: AlveolarRidgeCaliperMeasurement | null | undefined;
	readonly initialImageIds?: readonly string[] | undefined;
	readonly autoLoadDemo?: boolean | undefined;
}

export function getDefaultViewportTransforms(): Record<CbctViewportType, ViewportTransform> {
	return {
		axial: { ...DEFAULT_VIEWPORT_TRANSFORM },
		coronal: { ...DEFAULT_VIEWPORT_TRANSFORM },
		sagittal: { ...DEFAULT_VIEWPORT_TRANSFORM },
		panoramic: { ...DEFAULT_VIEWPORT_TRANSFORM },
		cross_section: { ...DEFAULT_VIEWPORT_TRANSFORM },
	};
}
