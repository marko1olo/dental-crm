/**
 * DENTE Dental CRM — Mandible (Lower Arch) Odontogram Types
 * Mandate 8b <= 120 lines. Wheeler Ch. 11 sagittal symmetry (48..41 | 31..38).
 */

import type { ToothData } from "../../chart/types/toothRendererTypes";
import type { Tooth46LayerFlags } from "../tooth46Types";

export const QUADRANT_4_TEETH = [48, 47, 46, 45, 44, 43, 42, 41] as const;
export const QUADRANT_3_TEETH = [31, 32, 33, 34, 35, 36, 37, 38] as const;
export const MANDIBLE_TEETH = [...QUADRANT_4_TEETH, ...QUADRANT_3_TEETH] as const;

export type MandibleToothNumber = (typeof MANDIBLE_TEETH)[number];

export interface ToothMandibleFullArchProps {
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

export interface MandibleToothCellProps {
	readonly toothNumber: MandibleToothNumber;
	readonly layers: Tooth46LayerFlags;
	readonly isSelected: boolean;
	readonly isDark: boolean;
	readonly zoom: number;
	readonly badgeRadius: number;
	readonly badgePlacement?: "root_apex" | "occlusal" | undefined;
	readonly onClick: (toothNumber: number) => void;
}
