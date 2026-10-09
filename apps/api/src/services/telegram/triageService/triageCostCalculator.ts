/**
 * triageCostCalculator.ts
 *
 * Layer 2: Domain price calculation engine for dental triage.
 * Pure functions calculating turnkey budgets and warranty tiers.
 */

import {
	findCariesPreset,
	findCrownPreset,
	findImplantPreset,
	findWhiteningPreset,
} from "./presets.js";
import type {
	CariesPreset,
	CrownTypePreset,
	ImplantSystemPreset,
	WhiteningPreset,
} from "./types.js";

export function formatRubles(amount: number): string {
	return `${amount.toLocaleString("ru-RU")} ₽`;
}

export type ImplantBudgetResult = {
	implant: ImplantSystemPreset;
	crown: CrownTypePreset;
	surgicalRub: number;
	orthopedicRub: number;
	totalRub: number;
	warrantyYears: number | string;
};

export function calculateImplantBudget(
	implantCode: string,
	crownCode: string,
): ImplantBudgetResult {
	const implant = findImplantPreset(implantCode);
	const crown = findCrownPreset(crownCode);
	const surgicalRub = implant.priceRub;
	const orthopedicRub = crown.priceRub;
	const totalRub = surgicalRub + orthopedicRub;

	return {
		implant,
		crown,
		surgicalRub,
		orthopedicRub,
		totalRub,
		warrantyYears: implant.warrantyYears,
	};
}

export function getCrownOption(code: string): CrownTypePreset {
	return findCrownPreset(code);
}

export function getCariesOption(code: string): CariesPreset | undefined {
	return findCariesPreset(code);
}

export function getWhiteningOption(code: string): WhiteningPreset | undefined {
	return findWhiteningPreset(code);
}
