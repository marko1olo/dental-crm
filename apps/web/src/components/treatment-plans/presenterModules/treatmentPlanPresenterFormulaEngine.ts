/**
 * DENTE CRM — Treatment Plan Presenter Formula Engine
 * Compliant with Mandate 8b (<= 120 lines).
 */

import type { TreatmentPlanTier, TreatmentPlanItem } from "../types";
import type { ToothData, ToothState } from "../../odontogram/ToothChart";

export const UPPER_RIGHT_QUADRANT = [18, 17, 16, 15, 14, 13, 12, 11] as const;
export const UPPER_LEFT_QUADRANT = [21, 22, 23, 24, 25, 26, 27, 28] as const;
export const LOWER_RIGHT_QUADRANT = [48, 47, 46, 45, 44, 43, 42, 41] as const;
export const LOWER_LEFT_QUADRANT = [31, 32, 33, 34, 35, 36, 37, 38] as const;

export const ALL_ADULT_FDI_TEETH = [
	...UPPER_RIGHT_QUADRANT,
	...UPPER_LEFT_QUADRANT,
	...LOWER_RIGHT_QUADRANT,
	...LOWER_LEFT_QUADRANT,
] as const;

export interface PlanToothDetail {
	stages: number[];
	items: (TreatmentPlanItem & { stageNumber: number; stageTitle: string })[];
}

export function getToothRussianName(toothNumber: number): string {
	const q = Math.floor(toothNumber / 10);
	const pos = toothNumber % 10;
	const jaw = q === 1 || q === 2 ? "верхний" : "нижний";
	const side = q === 1 || q === 4 ? "правый" : "левый";
	const names: Record<number, string> = {
		1: "центральный резец", 2: "боковой резец", 3: "клык",
		4: "первый премоляр", 5: "второй премоляр", 6: "первый моляр",
		7: "второй моляр", 8: "третий моляр (зуб мудрости)",
	};
	return `${pos ? names[pos] : "зуб"} ${jaw} ${side}`;
}

export function buildPresenterTeethMap(teeth: readonly ToothData[] | undefined): Map<number, ToothData> {
	const map = new Map<number, ToothData>();
	for (const t of teeth ?? []) {
		const num = t.toothNumber ?? (t as any).id ?? (t as any).number;
		if (typeof num === "number") map.set(num, t);
	}
	return map;
}

export function buildPresenterPlanTeethMap(tier: TreatmentPlanTier): Map<number, PlanToothDetail> {
	const map = new Map<number, PlanToothDetail>();
	for (const stage of tier.stages) {
		for (const item of stage.items) {
			if (item.toothNumber && item.toothNumber > 0) {
				const existing = map.get(item.toothNumber) || { stages: [], items: [] };
				if (!existing.stages.includes(stage.stageNumber)) {
					existing.stages.push(stage.stageNumber);
				}
				existing.items.push({ ...item, stageNumber: stage.stageNumber, stageTitle: stage.title });
				map.set(item.toothNumber, existing);
			}
		}
	}
	return map;
}

export function buildPresenterToothChartData(
	teethMap: Map<number, ToothData>,
	planTeethMap: Map<number, PlanToothDetail>,
): ToothData[] {
	return ALL_ADULT_FDI_TEETH.map((num) => {
		const initial = teethMap.get(num);
		const planInfo = planTeethMap.get(num);
		const isInPlan = Boolean(planInfo && planInfo.items.length > 0);
		const stageBadge = planInfo && planInfo.stages.length > 0 ? `Э${planInfo.stages.join(",")}` : undefined;

		let state: ToothState = initial?.state ?? "Healthy";
		if (isInPlan && (!initial || initial.state === "Healthy")) {
			state = "Planned_Crown";
		}

		return {
			...(initial ?? { toothNumber: num, state: "Healthy" }),
			toothNumber: num,
			state,
			stageBadge,
		};
	});
}
