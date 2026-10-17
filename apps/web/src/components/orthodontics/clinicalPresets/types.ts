import type { OrthoClinicalPresetId } from "../orthoProtocolTypes";

export interface OrthoClinicalPresetsSectionProps {
	readonly activePreset: OrthoClinicalPresetId | null;
	readonly onPresetActivation: () => void;
	readonly onPresetWireChange: () => void;
	readonly onPresetBonding: () => void;
	readonly onPresetDebonding: () => void;
	readonly onPresetLeveling?: (() => void) | undefined;
	readonly onPresetSprings?: (() => void) | undefined;
	readonly onPresetSeparationRings?: (() => void) | undefined;
	readonly onPresetAlignerLabOrder: () => void;
	readonly onPresetRetainerLabOrder: () => void;
	readonly onPresetPlateLabOrder: () => void;
	readonly onPresetSplintLabOrder: () => void;
	readonly onPresetNiti014Activation?: (() => void) | undefined;
	readonly onPresetPowerChainChange?: (() => void) | undefined;
	readonly onPresetBondingBothMbt?: (() => void) | undefined;
	readonly onPresetAlignerScan?: (() => void) | undefined;
	readonly onPresetAlignerTrays1To4?: (() => void) | undefined;
	readonly onPresetAlignerTrays5To8?: (() => void) | undefined;
	readonly onPresetRebracket?: (() => void) | undefined;
	readonly alignerStep: number;
	readonly alignerTotal: number;
}
