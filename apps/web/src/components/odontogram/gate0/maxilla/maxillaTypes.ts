/**
 * DENTE Dental CRM — Maxilla (Upper Arch) Odontogram Types
 * Mandate 8b <= 120 lines. Wheeler Ch. 8-11 sagittal symmetry (18..11 | 21..28).
 */

import type { ToothData } from "../../chart/types/toothRendererTypes";
import type { Tooth46LayerFlags } from "../tooth46Types";

export const QUADRANT_1_TEETH = [18, 17, 16, 15, 14, 13, 12, 11] as const;
export const QUADRANT_2_TEETH = [21, 22, 23, 24, 25, 26, 27, 28] as const;
export const MAXILLA_TEETH = [...QUADRANT_1_TEETH, ...QUADRANT_2_TEETH] as const;

export type MaxillaToothNumber = (typeof MAXILLA_TEETH)[number];

export interface ToothMaxillaFullArchProps {
	readonly teethData?: readonly ToothData[] | undefined;
	readonly teethDataMap?: Map<number, ToothData> | Record<number, ToothData> | undefined;
	readonly layersMap?: Map<number, Tooth46LayerFlags> | Record<number, Tooth46LayerFlags> | undefined;
	readonly selectedTooth?: number | null | undefined;
	readonly onSelectTooth?: ((toothNumber: number) => void) | undefined;
	readonly onUpdateToothLayers?: ((toothNumber: number, layers: Tooth46LayerFlags) => void) | undefined;
	readonly onUpdateToothData?: ((toothNumber: number, partialData: Partial<ToothData>) => void) | undefined;
	readonly isDark?: boolean | undefined;
	readonly zoom?: number | undefined;
	readonly badgeRadius?: number | undefined;
	readonly badgePlacement?: "root_apex" | "occlusal" | undefined;
	readonly className?: string | undefined;
}

export interface MaxillaToothCellProps {
	readonly toothNumber: MaxillaToothNumber;
	readonly layers: Tooth46LayerFlags;
	readonly isSelected: boolean;
	readonly isDark: boolean;
	readonly zoom: number;
	readonly badgeRadius: number;
	readonly badgePlacement?: "root_apex" | "occlusal" | undefined;
	readonly onClick: (toothNumber: number) => void;
}
