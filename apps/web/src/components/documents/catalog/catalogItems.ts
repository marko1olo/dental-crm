import { getClinicalItems, type ClinicalActionHandlers } from "./clinicalItems";
import { getFinanceItems, type FinanceActionHandlers } from "./financeItems";
import { getIntakeItems, type IntakeActionHandlers } from "./intakeItems";
import {
	getPediatricItems,
	type PediatricActionHandlers,
} from "./pediatricItems";
import type { DocumentCatalogItem } from "./types";

export type CombinedActionHandlers = IntakeActionHandlers &
	ClinicalActionHandlers &
	FinanceActionHandlers &
	PediatricActionHandlers;

export function getAllCatalogItems(
	h: CombinedActionHandlers,
): DocumentCatalogItem[] {
	return [
		...getIntakeItems(h),
		...getClinicalItems(h),
		...getFinanceItems(h),
		...getPediatricItems(h),
	];
}
