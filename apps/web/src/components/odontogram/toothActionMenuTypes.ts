import type React from "react";
import type { ToothData, ToothState } from "./ToothChart";

export interface ToothActionMenuConfig {
	toothNumber: number;
	x: number;
	y: number;
	position: "top" | "bottom";
	caretOffset: number;
	surfaces?: string[] | undefined;
}

export interface ToothActionMenuPortalProps {
	menuConfig: ToothActionMenuConfig | null;
	onClose: () => void;
	selectedTeeth: number[];
	activeSurfaces: string[];
	setActiveSurfaces: React.Dispatch<React.SetStateAction<string[]>>;
	onApplyToothState: (state: ToothState) => void;
	onOpenContextDrawer: (toothNumber: number) => void;
	onOpenHistory: (toothNumber: number) => void;
	onOpenEndo: (toothNumber: number) => void;
	onOneClickLabOrder: (targetTeeth: number[]) => void;
	teethData: ToothData[];
}
