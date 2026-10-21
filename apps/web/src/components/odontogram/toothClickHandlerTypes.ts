import type React from "react";
import type { ToothActionMenuConfig } from "./ToothActionMenuPortal";
import type { ToothState } from "./ToothChart";

export interface UseOdontogramToothClickHandlerParams {
	readonly selectedTeeth: number[];
	readonly setSelectedTeeth: React.Dispatch<React.SetStateAction<number[]>>;
	readonly activeSurfaces: string[];
	readonly setActiveSurfaces: React.Dispatch<React.SetStateAction<string[]>>;
	readonly isMultiSelectMode: boolean;
	readonly odontogramUseSurfaces?: boolean | undefined;
	readonly setMenuConfig: React.Dispatch<
		React.SetStateAction<ToothActionMenuConfig | null>
	>;
	readonly setRadialMenuData: (data: any) => void;
	readonly teethDataRef: React.MutableRefObject<any>;
	readonly updateToothState: (
		targets: number[],
		state: ToothState,
		surfaces: readonly string[],
	) => Promise<void>;
	readonly patientId: string;
}
