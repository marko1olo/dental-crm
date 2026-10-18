import type { DocumentCatalogItem } from "./types";
import { getIntakeAndClinicalItems, type ItemActionHandlers } from "./intakeAndClinicalItems";
import { getFinanceAndPediatricItems, type FinancePediatricActionHandlers } from "./financeAndPediatricItems";

export type CombinedActionHandlers = ItemActionHandlers & FinancePediatricActionHandlers;

export function getAllCatalogItems(h: CombinedActionHandlers): DocumentCatalogItem[] {
	return [
		...getIntakeAndClinicalItems(h),
		...getFinanceAndPediatricItems(h),
	];
}
