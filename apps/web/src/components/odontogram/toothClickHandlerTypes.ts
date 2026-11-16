import type React from "react";
import type { RadialMenuAnchorData } from "./OdontogramViewModals";
import type { ToothActionMenuConfig } from "./toothActionMenuTypes";
import type { ToothData, ToothState } from "./ToothChart";

export interface UseOdontogramToothClickHandlerParams {
	readonly selectedTeeth: number[];
	readonly setSelectedTeeth: React.Dispatch<React.SetStateAction<number[]>>;
	readonly activeSurfaces: string[];
	readonly setActiveSurfaces: React.Dispatch<React.SetStateAction<string[]>>;
	readonly isMultiSelectMode: boolean;
	readonly odontogramUseSurfaces?: boolean | undefined;
	readonly setMenuConfig?: React.Dispatch<
		React.SetStateAction<ToothActionMenuConfig | null>
	> | undefined;
	readonly setRadialMenuData: (data: RadialMenuAnchorData | null) => void;
	readonly teethDataRef: React.MutableRefObject<ToothData[]>;
	readonly updateToothState: (
		targets: number[],
		state: ToothState,
		surfaces: readonly string[],
	) => Promise<void>;
	readonly patientId: string;
}
