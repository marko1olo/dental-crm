import { getFinanceItems, type FinanceActionHandlers } from "./financeItems";
import {
	getPediatricItems,
	type PediatricActionHandlers,
} from "./pediatricItems";
import type { DocumentCatalogItem } from "./types";

export type FinancePediatricActionHandlers = FinanceActionHandlers &
	PediatricActionHandlers;

export function getFinanceAndPediatricItems(
	h: FinancePediatricActionHandlers,
): DocumentCatalogItem[] {
	return [...getFinanceItems(h), ...getPediatricItems(h)];
}
