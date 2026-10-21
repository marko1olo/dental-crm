import { getClinicalItems, type ClinicalActionHandlers } from "./clinicalItems";
import { getIntakeItems, type IntakeActionHandlers } from "./intakeItems";
import type { DocumentCatalogItem } from "./types";

export type ItemActionHandlers = IntakeActionHandlers & ClinicalActionHandlers;

export function getIntakeAndClinicalItems(
	h: ItemActionHandlers,
): DocumentCatalogItem[] {
	return [...getIntakeItems(h), ...getClinicalItems(h)];
}
