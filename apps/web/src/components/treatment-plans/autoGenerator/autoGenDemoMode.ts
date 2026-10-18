import type { ToothData } from "../../odontogram/ToothChart";
import {
	isDemoShowcaseMode as isCentralDemoShowcaseMode,
	setRuntimeDemoMode as setCentralDemoShowcaseMode,
} from "../../../lib/demoMode";

export const DEMO_SHOWCASE_TEETH: readonly ToothData[] = [
	{ toothNumber: 16, state: "Caries", notes: "Глубокий кариес жевательной поверхности" },
	{ toothNumber: 36, state: "Missing", notes: "Отсутствует зуб, показана дентальная имплантация" },
	{ toothNumber: 46, state: "Pulpitis", notes: "Острый очаговый пульпит, эндодонтическое лечение" },
	{ toothNumber: 11, state: "Crown", notes: "Разрушение коронковой части, показана ортопедия" },
	{ toothNumber: 24, state: "Caries", notes: "Кариес контактной поверхности" },
];

export function setDemoShowcaseMode(enabled: boolean | null): void {
	setCentralDemoShowcaseMode(enabled);
}

export function isDemoShowcaseMode(explicitOverride?: boolean): boolean {
	return isCentralDemoShowcaseMode(explicitOverride);
}
