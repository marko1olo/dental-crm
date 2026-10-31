/**
 * DENTE Dental CRM — Endodontic SSOT Canal Data & Clinical Standards (Facade)
 * apps/web/src/components/endo/endoCanalData.ts
 *
 * Тонкий фасад над каноническим каталогом endodonticsCatalogData.ts (Мандат 8b / 8s).
 */

import type { EndoCanalData } from "@dental/shared";

export * from "./endodonticsCatalogData";

export interface ChairsideEndoQuickBarProps {
	readonly activeTooth?: number | undefined;
	readonly toothState?: string | undefined;
	readonly patientId?: string | undefined;
	readonly isLocked?: boolean | undefined;
	readonly onInsertToDiary?: ((soapText: string, canals: EndoCanalData[]) => void) | undefined;
	readonly onOpenFullModal?: (() => void) | undefined;
	readonly className?: string | undefined;
}

export const QUICK_LENGTH_CHIPS = [19, 20, 21, 21.5, 22] as const;

export const QUICK_MAF_OPTIONS = [
	{ label: "25/.04", maf: "#25", taper: ".04", system: "ProTaper / NiTi" },
	{ label: "30/.04", maf: "#30", taper: ".04", system: "ProTaper / NiTi" },
	{ label: "25/.06", maf: "#25", taper: ".06", system: "ProTaper / NiTi" },
	{ label: "20/.04", maf: "#20", taper: ".04", system: "ProTaper / NiTi" },
] as const;
