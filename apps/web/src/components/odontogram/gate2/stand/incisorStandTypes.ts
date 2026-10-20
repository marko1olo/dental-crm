import type React from "react";

export type IncisorToothNumber = 11 | 21 | 12 | 22 | 31 | 41 | 32 | 42;
export type IncisorPresetId =
	| "intact"
	| "veneer"
	| "trauma"
	| "attrition"
	| "endo"
	| "splinting";

export interface IncisorStandLayers {
	crown?: boolean | undefined;
	roots?: boolean | undefined;
	mamelons?: boolean | undefined;
	cingulum?: boolean | undefined;
	sulcusLongitudinalis?: boolean | undefined;
	marginalRidges?: boolean | undefined;
	lingualFossa?: boolean | undefined;
	developmentalLobes?: boolean | undefined;
	pulp?: boolean | undefined;
	canals?: boolean | undefined;
	guttaPercha?: boolean | undefined;
	periapicalHalo?: boolean | undefined;
	veneer?: boolean | undefined;
	trauma?: "none" | "ellis_class_2_mesial" | "ellis_class_2_distal" | "ellis_class_4" | undefined;
	wearDegree?: 0 | 1 | 2 | 3 | undefined;
	abfraction?: boolean | undefined;
	splinting?: boolean | undefined;
	fiberPost?: boolean | undefined;
	zirconiaCrown?: boolean | undefined;
	implant?: boolean | undefined;
	missing?: boolean | undefined;
	cej?: boolean | undefined;
	grooves?: boolean | undefined;
}

export interface IncisorPresetDefinition {
	id: IncisorPresetId;
	badge: string;
	title: string;
	layers: IncisorStandLayers;
}

export interface ToothIncisorStandHudProps {
	toothNumber: IncisorToothNumber;
	zoom: number;
	activePresetTitle: string;
	isDark: boolean;
}

export interface ToothIncisorStandTogglesProps {
	layers: IncisorStandLayers;
	toothNumber: IncisorToothNumber;
	onToggle: (k: keyof IncisorStandLayers) => void;
}

export interface ToothIncisorPresetBarProps {
	activePreset: IncisorPresetId;
	onApplyPreset: (id: IncisorPresetId) => void;
}

export interface ToothIncisorStandHeaderProps {
	toothNumber: IncisorToothNumber;
	onToothNumberChange: (n: IncisorToothNumber) => void;
	zoom: number;
	onZoomChange: (z: number) => void;
	isDark: boolean;
	onToggleTheme: () => void;
}
