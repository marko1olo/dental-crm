/**
 * visiographFindings.ts — что из разбора снимка попадает в зубную формулу.
 * Находки маппятся строго в валидные состояния FDI одонтограммы.
 */

import { isValidFdiToothNumber } from "@dental/shared";
import type { ToothState } from "../odontogram/ToothChart";
import {
	AI_TO_TOOTH_STATE,
	AI_STATES_WITHOUT_FORMULA_STATE,
	type VisiographFinding,
	type VisiographFindingPlan,
} from "./visiographFindingTypes";

export * from "./visiographFindingTypes";

export function planVisiographFindings(
	toothStates: Record<string, string> | null | undefined,
): VisiographFindingPlan {
	const unreadableCodes: string[] = [];
	const noFormulaStateCodes: string[] = [];
	const byState = new Map<ToothState, VisiographFinding[]>();

	for (const [code, state] of Object.entries(toothStates ?? {})) {
		const toothNumber = Number(code.trim());
		const validTooth = isValidFdiToothNumber(toothNumber);
		const mapped = validTooth ? AI_TO_TOOTH_STATE[state] : undefined;
		if (!mapped) {
			if (validTooth && AI_STATES_WITHOUT_FORMULA_STATE[state])
				noFormulaStateCodes.push(code);
			else unreadableCodes.push(code);
			continue;
		}
		const group = byState.get(mapped) ?? [];
		group.push({ code, toothNumber });
		byState.set(mapped, group);
	}

	return {
		groups: [...byState].map(([state, teeth]) => ({ state, teeth })),
		unreadableCodes,
		noFormulaStateCodes,
	};
}
