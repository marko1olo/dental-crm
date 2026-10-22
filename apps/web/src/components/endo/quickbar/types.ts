import type { EndoCanalData } from "@dental/shared";

export interface ChairsideEndoQuickBarProps {
	readonly activeTooth?: number | undefined;
	readonly toothState?: string | undefined;
	readonly patientId?: string | undefined;
	readonly isLocked?: boolean | undefined;
	readonly onInsertToDiary?: ((soapText: string, canals: EndoCanalData[]) => void) | undefined;
	readonly onOpenFullModal?: (() => void) | undefined;
	readonly className?: string | undefined;
}

export interface QuickCanalState {
	id: string;
	name: string;
	workingLengthMm: number;
	masterApicalFile: string;
	taper: string;
	obturationType: "gutta_sealer" | "temp_caoh2" | "bioceramic";
	sealer: string;
	isObliterated?: boolean;
}

export const QUICK_LENGTH_CHIPS = [19, 20, 21, 21.5, 22] as const;

export const QUICK_MAF_OPTIONS = [
	{ label: "25/.04", maf: "#25", taper: ".04", system: "ProTaper / NiTi" },
	{ label: "30/.04", maf: "#30", taper: ".04", system: "ProTaper / NiTi" },
	{ label: "25/.06", maf: "#25", taper: ".06", system: "ProTaper / NiTi" },
	{ label: "20/.04", maf: "#20", taper: ".04", system: "ProTaper / NiTi" },
] as const;
